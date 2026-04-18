import { App, TFile } from "obsidian";
import { execSync } from "child_process";
import { ActaTaskData, ActaFeedbackData, ActaNegativeFeedbackData, ActaTaskSettings } from "./types";
import {
	DaySignals,
	TaskSignal,
	ShipSignal,
	FeedbackSignal,
	ReflectionSignal,
	VaultActivity,
	ModifiedFileSignal,
	TIME_ANNOTATION_REGEX,
} from "./promiseLandTypes";

export type ObserveStepCallback = (step: string, detail: string) => void;

export class PromiseLandObserver {
	constructor(
		private app: App,
		private settings: ActaTaskSettings,
		private taskData: ActaTaskData,
		private feedbackData: ActaFeedbackData,
		private negativeFeedbackData: ActaNegativeFeedbackData
	) {}

	updateSettings(settings: ActaTaskSettings): void {
		this.settings = settings;
	}

	updateData(
		taskData: ActaTaskData,
		feedbackData: ActaFeedbackData,
		negativeFeedbackData: ActaNegativeFeedbackData
	): void {
		this.taskData = taskData;
		this.feedbackData = feedbackData;
		this.negativeFeedbackData = negativeFeedbackData;
	}

	async observe(dateStr: string, onStep?: ObserveStepCallback): Promise<DaySignals> {
		// Ensure daily checkpoint so git diff HEAD shows today's changes
		onStep?.("checkpoint", "Ensuring daily git checkpoint...");
		this.ensureDailyCheckpoint(dateStr);
		onStep?.("checkpoint", `Daily checkpoint ready`);

		// Read the full daily note content — this is the primary signal source
		onStep?.("daily-note", "Reading daily note content...");
		const rawNoteContent = await this.readDailyNoteContent(dateStr);
		const noteLength = rawNoteContent ? rawNoteContent.length : 0;
		onStep?.("daily-note", noteLength > 0
			? `Read daily note (${Math.round(noteLength / 1000)}k chars)`
			: `No daily note found for ${dateStr}`);

		onStep?.("positive-feedback", "Scanning positive feedback...");
		const positiveFeedback = this.extractPositiveFeedbackSignals(dateStr);
		onStep?.("positive-feedback", `Found ${positiveFeedback.length} positive feedback entries`);

		onStep?.("negative-feedback", "Scanning negative feedback...");
		const negativeFeedback = this.extractNegativeFeedbackSignals(dateStr);
		onStep?.("negative-feedback", `Found ${negativeFeedback.length} negative feedback entries`);

		const feedback = [...positiveFeedback, ...negativeFeedback];

		onStep?.("vault", "Checking vault activity...");
		const vaultActivity = this.getVaultActivity(dateStr);
		onStep?.("vault", `${vaultActivity.filesModified} files modified today across ${vaultActivity.foldersActive.length} folders`);

		onStep?.("git-diff", `Scanning git diff for ${dateStr} changes...`);
		let modifiedFiles = this.getModifiedFilesFromGit(dateStr);

		// Fallback: if git diff found nothing but mtime shows files changed, use mtime
		if (modifiedFiles.length === 0 && vaultActivity.filesModified > 0) {
			modifiedFiles = this.getModifiedFilesByMtime(dateStr);
			const fileList = modifiedFiles.map(f => `  • ${f.fileName}${f.createdToday ? " [NEW]" : ""}`).join("\n");
			onStep?.("git-diff", `${modifiedFiles.length} files detected (mtime fallback):\n${fileList}`);
		} else {
			const fileList = modifiedFiles.map(f => `  • ${f.fileName}${f.createdToday ? " [NEW]" : ""}`).join("\n");
			onStep?.("git-diff", `${modifiedFiles.length} files changed (git diff):\n${fileList}`);
		}
		vaultActivity.modifiedFiles = modifiedFiles;

		return {
			date: dateStr,
			tasks: [],
			ships: [],
			feedback,
			reflections: [],
			vaultActivity,
			rawNoteContent: rawNoteContent || undefined,
		};
	}

	/**
	 * Read the full daily note content. The LLM will extract signals from it.
	 */
	private async readDailyNoteContent(dateStr: string): Promise<string | null> {
		const compactDate = dateStr.replace(/-/g, "");
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			if (!file.path.includes(compactDate)) continue;
			const content = await this.app.vault.cachedRead(file);
			// Cap at 15k chars to stay within LLM context budget
			if (content.length > 15000) {
				return content.substring(0, 15000) + "\n\n... (note truncated at 15k chars)";
			}
			return content;
		}

		return null;
	}

	/**
	 * Read priority tasks directly from the daily note's "Today's Priority Actions" section.
	 * This is the single source of truth — no task board indirection.
	 */
	private async extractPriorityTasksFromNote(dateStr: string): Promise<TaskSignal[]> {
		const signals: TaskSignal[] = [];
		const compactDate = dateStr.replace(/-/g, "");
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			if (!file.path.includes(compactDate)) continue;

			const content = await this.app.vault.cachedRead(file);
			const lines = content.split("\n");

			let inPrioritySection = false;
			for (const line of lines) {
				// Detect "Today's Priority Actions" heading (any heading level)
				if (/^#{1,6}\s+Today'?s?\s+Priority\s+Actions/i.test(line)) {
					inPrioritySection = true;
					continue;
				}

				// Exit section on next heading
				if (inPrioritySection && /^#{1,6}\s+/.test(line)) {
					break;
				}

				// Parse each checkbox line in the priority section
				if (inPrioritySection) {
					const checkboxMatch = line.match(/^\s*-\s+\[([ xX])\]\s+(.*)/i);
					if (checkboxMatch) {
						const completed = checkboxMatch[1].toLowerCase() === "x";
						const fullText = checkboxMatch[2];

						// Extract time annotation
						const timeMatch = fullText.match(TIME_ANNOTATION_REGEX);
						let timeAnnotation: string | undefined;
						let durationMin: number | undefined;
						if (timeMatch) {
							timeAnnotation = timeMatch[0];
							durationMin = this.parseDuration(timeMatch[1], timeMatch[2]);
						}

						// Extract tags
						const tags: string[] = [];
						const tagMatches = fullText.matchAll(/#(\w+)/g);
						for (const m of tagMatches) {
							tags.push(`#${m[1]}`);
						}

						// Clean title: remove tags, time annotations, links
						const title = fullText
							.replace(TIME_ANNOTATION_REGEX, "")
							.replace(/\[\[.*?\]\]/g, "")
							.replace(/\[.*?\]\(.*?\)/g, "")
							.replace(/\s+/g, " ")
							.trim();

						if (title.length > 0) {
							signals.push({
								title,
								tags,
								completed,
								timeAnnotation,
								durationMin,
								effort: timeMatch ? "deep_work" : "quick_action",
								priority: true,
							});
						}
					}
				}
			}
		}

		return signals;
	}

	/**
	 * Read ships from the daily note's "Ships" section.
	 * Tracks what the user built/shipped/published today.
	 */
	private async extractShipsFromNote(dateStr: string): Promise<ShipSignal[]> {
		const ships: ShipSignal[] = [];
		const compactDate = dateStr.replace(/-/g, "");
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			if (!file.path.includes(compactDate)) continue;

			const content = await this.app.vault.cachedRead(file);
			const lines = content.split("\n");

			let inShipsSection = false;
			for (const line of lines) {
				if (/^#{1,6}\s+Ships?/i.test(line)) {
					inShipsSection = true;
					continue;
				}

				if (inShipsSection && /^#{1,6}\s+/.test(line)) {
					break;
				}

				if (inShipsSection) {
					// Format 1: Checkbox items (- [x] task)
					const checkboxMatch = line.match(/^\s*-\s+\[([ xX])\]\s+(.*)/i);
					if (checkboxMatch) {
						const completed = checkboxMatch[1].toLowerCase() === "x";
						const title = checkboxMatch[2]
							.replace(/#\w+/g, "")
							.replace(/\[\[.*?\]\]/g, "")
							.replace(/\[.*?\]\(.*?\)/g, "")
							.replace(/\s+/g, " ")
							.trim();
						if (title.length > 0) {
							ships.push({ title, completed });
						}
					}

					// Format 2: Markdown table rows with Status column
					// Matches: | # | Task | Category | Status | Notes |
					if (!checkboxMatch && line.startsWith("|") && !line.match(/^\|\s*[-:]+/) && !line.match(/^\|\s*#\s*\|/)) {
						const cells = line.split("|").slice(1, -1).map(c => c.trim());
						if (cells.length >= 4) {
							const taskCell = cells[1];
							const statusCell = cells[3];
							const isCompleted = /✅|shipped|done|complete/i.test(statusCell);
							const isFailed = /❌|failed|crashed/i.test(statusCell);
							const isDropped = /🚫|dropped|skipped/i.test(statusCell);
							if (isCompleted || isFailed || isDropped) {
								const title = taskCell
									.replace(/`/g, "")
									.replace(/#\w+/g, "")
									.replace(/\[\[.*?\]\]/g, "")
									.replace(/\[.*?\]\(.*?\)/g, "")
									.replace(/\s+/g, " ")
									.trim();
								if (title.length > 0) {
									ships.push({ title, completed: isCompleted });
								}
							}
						}
					}
				}
			}
		}

		return ships;
	}

	private parseDuration(startStr: string, endStr: string): number {
		const startHour = this.parseHour(startStr);
		const endHour = this.parseHour(endStr);
		let diff = endHour - startHour;
		if (diff <= 0) diff += 12;
		return Math.round(diff * 60);
	}

	private parseHour(timeStr: string): number {
		const cleaned = timeStr.replace(":", "");
		if (cleaned.length <= 2) {
			return parseInt(cleaned, 10);
		}
		const hours = parseInt(cleaned.slice(0, -2), 10);
		const minutes = parseInt(cleaned.slice(-2), 10);
		return hours + minutes / 60;
	}

	private extractPositiveFeedbackSignals(dateStr: string): FeedbackSignal[] {
		const signals: FeedbackSignal[] = [];
		const compactDate = dateStr.replace(/-/g, "");

		for (const item of Object.values(this.feedbackData.addedFeedback)) {
			if (!item.filePath.includes(compactDate)) continue;
			signals.push({
				text: item.text,
				tags: item.tags,
				type: "positive",
			});
		}

		return signals;
	}

	private extractNegativeFeedbackSignals(dateStr: string): FeedbackSignal[] {
		const signals: FeedbackSignal[] = [];
		const compactDate = dateStr.replace(/-/g, "");

		for (const item of Object.values(this.negativeFeedbackData.addedNegativeFeedback)) {
			if (!item.filePath.includes(compactDate)) continue;
			signals.push({
				text: item.text,
				tags: item.tags,
				type: "negative",
			});
		}

		return signals;
	}

	private async extractReflections(dateStr: string): Promise<ReflectionSignal[]> {
		const reflections: ReflectionSignal[] = [];
		const compactDate = dateStr.replace(/-/g, "");
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			if (!file.path.includes(compactDate)) continue;

			const content = await this.app.vault.cachedRead(file);
			const lines = content.split("\n");

			// Pick up lines tagged with #promiseland anywhere in the note
			for (const line of lines) {
				if (line.toLowerCase().includes("#promiseland")) {
					const cleanText = line
						.replace(/^[\s]*[-*]\s+/, "")
						.replace(/#promiseland/gi, "")
						.trim();
					if (cleanText.length > 0) {
						reflections.push({
							text: cleanText,
							filePath: file.path,
						});
					}
				}
			}

			// Also pick up content under a "Reflection" heading section
			let inReflectionSection = false;
			for (const line of lines) {
				if (/^#{1,6}\s+Reflection/i.test(line)) {
					inReflectionSection = true;
					continue;
				}

				// Exit on next heading
				if (inReflectionSection && /^#{1,6}\s+/.test(line)) {
					break;
				}

				if (inReflectionSection) {
					const cleanText = line
						.replace(/^[\s]*[-*]\s+/, "")
						.replace(/#\w+/g, "")
						.trim();
					if (cleanText.length > 0) {
						reflections.push({
							text: cleanText,
							filePath: file.path,
						});
					}
				}
			}
		}

		return reflections;
	}

	/**
	 * Check if a file belongs to a given date via multiple signals:
	 * mtime, ctime, frontmatter date property, or filename pattern.
	 */
	private fileMatchesDate(file: TFile, dateStr: string, dayStart: number, dayEnd: number): boolean {
		// Check mtime
		if (file.stat.mtime >= dayStart && file.stat.mtime < dayEnd) return true;
		// Check ctime (creation time — survives file moves)
		if (file.stat.ctime >= dayStart && file.stat.ctime < dayEnd) return true;
		// Check filename for compact date
		const compactDate = dateStr.replace(/-/g, "");
		if (file.path.includes(compactDate)) return true;
		// Check frontmatter date property
		const cache = this.app.metadataCache.getFileCache(file);
		if (cache?.frontmatter?.date === dateStr) return true;
		return false;
	}

	private getVaultActivity(dateStr: string): VaultActivity {
		const files = this.app.vault.getMarkdownFiles();
		let filesModified = 0;
		const foldersSet = new Set<string>();

		const dayStart = new Date(dateStr + "T00:00:00").getTime();
		const dayEnd = dayStart + 24 * 60 * 60 * 1000;

		for (const file of files) {
			if (this.fileMatchesDate(file, dateStr, dayStart, dayEnd)) {
				filesModified++;
				const folder = file.parent?.path || "/";
				foldersSet.add(folder);
			}
		}

		return {
			filesModified,
			foldersActive: Array.from(foldersSet),
		};
	}

	// ── Git helpers ──

	private getVaultRoot(): string {
		return (this.app.vault.adapter as any).basePath;
	}

	private runGit(cmd: string): string {
		try {
			return execSync(cmd, {
				cwd: this.getVaultRoot(),
				encoding: "utf-8",
				timeout: 10000,
			}).trim();
		} catch {
			return "";
		}
	}

	private truncateDiff(diff: string, maxChars: number): string {
		if (diff.length <= maxChars) return diff;
		// Truncate to maxChars preserving complete lines
		const truncated = diff.substring(0, maxChars);
		const lastNewline = truncated.lastIndexOf("\n");
		return (lastNewline > 0 ? truncated.substring(0, lastNewline) : truncated) + "\n... (truncated)";
	}

	/**
	 * Ensure a daily checkpoint commit exists. Returns the checkpoint commit hash.
	 * The checkpoint marks the start of the day — all diffs are measured from it.
	 */
	private ensureDailyCheckpoint(dateStr: string): void {
		const marker = `promiseland-checkpoint: ${dateStr}`;
		// Check if checkpoint already exists
		const existing = this.runGit(`git log --format=%H --grep="${marker}" -1`);
		if (existing) return; // Already have today's checkpoint

		// Auto-commit any pending changes first, then create the checkpoint
		this.runGit("git add -A");
		const status = this.runGit("git status --porcelain");
		if (status) {
			this.runGit(`git commit -m "${marker}"`);
		} else {
			// No changes, create an empty checkpoint commit for the baseline
			this.runGit(`git commit --allow-empty -m "${marker}"`);
		}
	}

	/**
	 * Find the baseline commit for a given date.
	 * Strategy:
	 * 1. If a checkpoint exists for dateStr, use it
	 * 2. Otherwise, find the last commit BEFORE that date (end of previous day)
	 * 3. Falls back to first commit if nothing else works
	 */
	private getBaselineCommit(dateStr: string): { hash: string; mode: "checkpoint" | "date-range" | "fallback" } {
		// Always prefer: last commit before this date (= end of previous day)
		// This captures ALL changes for the entire day, not just since the last check-in
		const beforeDate = this.runGit(`git log --format=%H --before="${dateStr}T00:00:00" -1`);
		if (beforeDate) return { hash: beforeDate, mode: "date-range" };

		// Fallback to checkpoint if no commits exist before this date
		const marker = `promiseland-checkpoint: ${dateStr}`;
		const checkpoint = this.runGit(`git log --format=%H --grep="${marker}" -1`);
		if (checkpoint) return { hash: checkpoint, mode: "checkpoint" };

		// Fallback: first commit ever
		const firstCommit = this.runGit("git rev-list --max-parents=0 HEAD");
		if (firstCommit) return { hash: firstCommit, mode: "fallback" };

		return { hash: "HEAD", mode: "fallback" };
	}

	/**
	 * Find the end-of-day commit for a given date.
	 * Used for retroactive check-ins to cap the diff range.
	 */
	private getEndOfDayCommit(dateStr: string): string {
		// Find last commit on or before end of this date
		const nextDay = new Date(dateStr + "T00:00:00");
		nextDay.setDate(nextDay.getDate() + 1);
		const nextDayStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, "0")}-${String(nextDay.getDate()).padStart(2, "0")}`;
		const endCommit = this.runGit(`git log --format=%H --before="${nextDayStr}T00:00:00" -1`);
		return endCommit || "HEAD";
	}

	/**
	 * Get modified files for a specific date.
	 * Works for both today (checkpoint-based) and past dates (git log date range).
	 */
	private getModifiedFilesFromGit(dateStr: string): ModifiedFileSignal[] {
		const results: ModifiedFileSignal[] = [];
		const excludedFolders = this.settings.excludedFolders || [];

		const isToday = dateStr === this.getTodayStr();
		const baseline = this.getBaselineCommit(dateStr);

		let changedFilesRaw: string;
		let diffRef: string; // what to diff against for file content
		const newFilesSet = new Set<string>();

		if (isToday) {
			// Today: diff from baseline to HEAD + uncommitted + untracked
			const committedRaw = baseline.hash !== "HEAD"
				? this.runGit(`git diff --name-only ${baseline.hash}..HEAD`)
				: "";
			const uncommittedRaw = this.runGit("git diff --name-only HEAD");
			const untrackedRaw = this.runGit("git ls-files --others --exclude-standard");

			const committed = committedRaw.split("\n").filter(Boolean);
			const uncommitted = uncommittedRaw.split("\n").filter(Boolean);
			const untracked = untrackedRaw.split("\n").filter(Boolean);

			const allFiles = [...new Set([...committed, ...uncommitted, ...untracked])];
			changedFilesRaw = allFiles.join("\n");
			diffRef = baseline.hash;

			// New files
			if (baseline.hash !== "HEAD") {
				const newRaw = this.runGit(`git diff --name-only --diff-filter=A ${baseline.hash}..HEAD`);
				newRaw.split("\n").filter(Boolean).forEach(f => newFilesSet.add(f));
			}
			untracked.forEach(f => newFilesSet.add(f));
		} else {
			// Past date: diff between start-of-day and end-of-day commits
			const endCommit = this.getEndOfDayCommit(dateStr);
			const startCommit = baseline.hash;

			if (startCommit === endCommit) {
				// No changes on that day
				return results;
			}

			changedFilesRaw = this.runGit(`git diff --name-only ${startCommit}..${endCommit}`);
			diffRef = startCommit;

			// New files on that day
			const newRaw = this.runGit(`git diff --name-only --diff-filter=A ${startCommit}..${endCommit}`);
			newRaw.split("\n").filter(Boolean).forEach(f => newFilesSet.add(f));
		}

		const allChangedFiles = changedFilesRaw.split("\n").filter(Boolean);
		if (allChangedFiles.length === 0) return results;

		// Filter to markdown files, exclude configured folders
		const mdFiles = allChangedFiles
			.filter(f => f.endsWith(".md"))
			.filter(f => !excludedFolders.some(folder => f.startsWith(folder + "/") || f === folder));

		// Get diffs and sort by size
		const endRef = isToday ? "" : this.getEndOfDayCommit(dateStr);
		const withDiffs: { file: string; diff: string; diffLen: number }[] = [];
		for (const filePath of mdFiles) {
			let diff: string;
			if (isToday && newFilesSet.has(filePath) && !this.runGit(`git diff ${diffRef} -- "${filePath}"`)) {
				// Untracked new file — read directly
				diff = this.runGit(`head -30 "${filePath}"`);
				if (diff) diff = `+++ new file\n${diff.split("\n").map(l => `+${l}`).join("\n")}`;
			} else if (isToday) {
				diff = this.runGit(`git diff ${diffRef} -- "${filePath}"`);
			} else {
				diff = this.runGit(`git diff ${diffRef}..${endRef} -- "${filePath}"`);
			}
			withDiffs.push({ file: filePath, diff: diff || "", diffLen: diff?.length || 0 });
		}

		// Filter out trivial changes (just metadata/whitespace)
		const meaningful = withDiffs.filter(({ file, diff }) => {
			if (newFilesSet.has(file)) return true; // New files always meaningful
			const contentLines = diff.split("\n").filter(l =>
				(l.startsWith("+") || l.startsWith("-")) &&
				!l.startsWith("+++") && !l.startsWith("---") &&
				l.trim().length > 1
			);
			return contentLines.length >= 3;
		});

		// Sort by diff size descending, cap at 15
		meaningful.sort((a, b) => b.diffLen - a.diffLen);
		const capped = meaningful.slice(0, 15);

		for (const { file: filePath, diff } of capped) {
			const parts = filePath.split("/");
			const fileName = parts[parts.length - 1];
			const folder = parts.length > 1 ? parts.slice(0, -1).join("/") : "/";

			// Extract headings from Obsidian metadata cache
			const headings: string[] = [];
			const tfile = this.app.vault.getAbstractFileByPath(filePath);
			if (tfile && tfile instanceof TFile) {
				const cache = this.app.metadataCache.getFileCache(tfile);
				if (cache?.headings) {
					for (const h of cache.headings) {
						headings.push(h.heading);
					}
				}
			}

			results.push({
				filePath,
				fileName,
				folder,
				headings,
				diff: this.truncateDiff(diff, 500),
				createdToday: newFilesSet.has(filePath),
			});
		}

		return results;
	}

	private getTodayStr(): string {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
	}

	/**
	 * Fallback: detect modified files when git history is unavailable.
	 * Uses multiple signals: mtime, ctime, frontmatter date, filename pattern.
	 */
	private getModifiedFilesByMtime(dateStr: string): ModifiedFileSignal[] {
		const results: ModifiedFileSignal[] = [];
		const excludedFolders = this.settings.excludedFolders || [];
		const dayStart = new Date(dateStr + "T00:00:00").getTime();
		const dayEnd = dayStart + 24 * 60 * 60 * 1000;
		const files = this.app.vault.getMarkdownFiles();

		const modified: { file: TFile; isNew: boolean }[] = [];
		for (const file of files) {
			if (excludedFolders.some(folder => file.path.startsWith(folder + "/") || file.path === folder)) continue;
			if (this.fileMatchesDate(file, dateStr, dayStart, dayEnd)) {
				const ctime = file.stat.ctime;
				const isNew = ctime >= dayStart && ctime < dayEnd;
				modified.push({ file, isNew });
			}
		}

		// Sort by mtime descending, cap at 15
		modified.sort((a, b) => b.file.stat.mtime - a.file.stat.mtime);
		const capped = modified.slice(0, 15);

		for (const { file, isNew } of capped) {
			const parts = file.path.split("/");
			const fileName = parts[parts.length - 1];
			const folder = parts.length > 1 ? parts.slice(0, -1).join("/") : "/";

			const headings: string[] = [];
			const cache = this.app.metadataCache.getFileCache(file);
			if (cache?.headings) {
				for (const h of cache.headings) {
					headings.push(h.heading);
				}
			}

			results.push({
				filePath: file.path,
				fileName,
				folder,
				headings,
				diff: "(no git history available for this date)",
				createdToday: isNew,
			});
		}

		return results;
	}
}
