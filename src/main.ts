import { Plugin, WorkspaceLeaf, TFile, debounce } from "obsidian";
import { execSync } from "child_process";
import {
	ActaTaskSettings,
	ActaTaskData,
	ActaFeedbackData,
	ActaNegativeFeedbackData,
	DEFAULT_SETTINGS,
	DEFAULT_DATA,
	DEFAULT_FEEDBACK_DATA,
	DEFAULT_NEGATIVE_FEEDBACK_DATA,
	ACTA_TASK_VIEW_TYPE,
	ACTA_FEEDBACK_VIEW_TYPE,
	ACTA_NEGATIVE_FEEDBACK_VIEW_TYPE,
	ACTA_PROMISELAND_VIEW_TYPE,
} from "./types";
import { TaskBoardView } from "./taskBoardView";
import { FeedbackBoardView } from "./feedbackBoardView";
import { NegativeFeedbackBoardView } from "./negativeFeedbackBoardView";
import { PromiseLandBoardView } from "./promiseLandBoardView";
import { ActaTaskSettingTab } from "./settings";
import { TaskManager } from "./taskManager";
import { TaskScanner } from "./taskScanner";
import { TaskToggler } from "./taskToggler";
import { FeedbackManager } from "./feedbackManager";
import { FeedbackScanner } from "./feedbackScanner";
import { NegativeFeedbackManager } from "./negativeFeedbackManager";
import { NegativeFeedbackScanner } from "./negativeFeedbackScanner";
import { ActaPromiseLandData, DEFAULT_PROMISELAND_DATA } from "./promiseLandTypes";
import { PromiseLandManager } from "./promiseLandManager";
import { PromiseLandLlmClient } from "./promiseLandLlmClient";
import { PromiseLandObserver } from "./promiseLandObserver";
import { PromiseLandAgent } from "./promiseLandAgent";

export default class ActaTaskPlugin extends Plugin {
	settings: ActaTaskSettings = DEFAULT_SETTINGS;
	data: ActaTaskData = DEFAULT_DATA;
	feedbackData: ActaFeedbackData = DEFAULT_FEEDBACK_DATA;
	negativeFeedbackData: ActaNegativeFeedbackData = DEFAULT_NEGATIVE_FEEDBACK_DATA;
	promiseLandData: ActaPromiseLandData = { ...DEFAULT_PROMISELAND_DATA };
	taskManager: TaskManager | null = null;
	scanner: TaskScanner | null = null;
	toggler: TaskToggler | null = null;
	feedbackManager: FeedbackManager | null = null;
	feedbackScanner: FeedbackScanner | null = null;
	negativeFeedbackManager: NegativeFeedbackManager | null = null;
	negativeFeedbackScanner: NegativeFeedbackScanner | null = null;
	promiseLandManager: PromiseLandManager | null = null;
	promiseLandLlmClient: PromiseLandLlmClient | null = null;
	promiseLandObserver: PromiseLandObserver | null = null;
	promiseLandAgent: PromiseLandAgent | null = null;
	private autoCommitDebounced: ReturnType<typeof debounce> | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();
		await this.loadTaskData();
		await this.loadFeedbackData();
		await this.loadNegativeFeedbackData();
		await this.loadPromiseLandData();

		// Initialize task managers
		this.taskManager = new TaskManager(
			this.app,
			this.settings,
			this.data,
			() => this.saveTaskData()
		);
		this.scanner = new TaskScanner(this.app, this.taskManager, this.settings);
		this.toggler = new TaskToggler(this.app);

		// Initialize feedback managers
		this.feedbackManager = new FeedbackManager(
			this.app,
			this.settings,
			this.feedbackData,
			() => this.saveFeedbackData()
		);
		this.feedbackScanner = new FeedbackScanner(
			this.app,
			this.feedbackManager,
			this.settings
		);

		// Initialize negative feedback managers
		this.negativeFeedbackManager = new NegativeFeedbackManager(
			this.app,
			this.settings,
			this.negativeFeedbackData,
			() => this.saveNegativeFeedbackData()
		);
		this.negativeFeedbackScanner = new NegativeFeedbackScanner(
			this.app,
			this.negativeFeedbackManager,
			this.settings
		);

		// Initialize Promise Land
		this.promiseLandManager = new PromiseLandManager(
			this.app,
			this.settings,
			this.promiseLandData,
			() => this.savePromiseLandData()
		);
		this.promiseLandLlmClient = new PromiseLandLlmClient(this.settings);
		this.promiseLandObserver = new PromiseLandObserver(
			this.app,
			this.settings,
			this.data,
			this.feedbackData,
			this.negativeFeedbackData
		);
		this.promiseLandAgent = new PromiseLandAgent(
			this.promiseLandManager,
			this.promiseLandObserver,
			this.promiseLandLlmClient
		);

		// Write lightweight goals.json for external agents
		await this.promiseLandManager.saveGoalsFile();

		// Register task board view
		this.registerView(ACTA_TASK_VIEW_TYPE, (leaf) => {
			return new TaskBoardView(
				leaf,
				this.scanner!,
				this.toggler!,
				this.taskManager!,
				this.settings
			);
		});

		// Register feedback board view
		this.registerView(ACTA_FEEDBACK_VIEW_TYPE, (leaf) => {
			return new FeedbackBoardView(
				leaf,
				this.feedbackScanner!,
				this.feedbackManager!,
				this.settings
			);
		});

		// Register negative feedback board view
		this.registerView(ACTA_NEGATIVE_FEEDBACK_VIEW_TYPE, (leaf) => {
			return new NegativeFeedbackBoardView(
				leaf,
				this.negativeFeedbackScanner!,
				this.negativeFeedbackManager!,
				this.settings
			);
		});

		// Register Promise Land board view
		this.registerView(ACTA_PROMISELAND_VIEW_TYPE, (leaf) => {
			return new PromiseLandBoardView(
				leaf,
				this.promiseLandManager!,
				this.promiseLandAgent!,
				this.promiseLandLlmClient!,
				this.settings
			);
		});

		// Task board ribbon and commands
		this.addRibbonIcon("list-checks", "Open PromiseLand Board", () => {
			this.openBoard();
		});

		this.addCommand({
			id: "open-promiseland-board",
			name: "Open task board",
			callback: () => this.openBoard(),
		});

		this.addCommand({
			id: "refresh-promiseland-board",
			name: "Refresh task board",
			callback: () => this.refreshBoard(),
		});

		// Feedback board ribbon and commands
		this.addRibbonIcon("heart", "Open ❤️ 正反馈board", () => {
			this.openFeedbackBoard();
		});

		this.addCommand({
			id: "open-acta-feedback-board",
			name: "Open ❤️ 正反馈board",
			callback: () => this.openFeedbackBoard(),
		});

		this.addCommand({
			id: "refresh-acta-feedback-board",
			name: "Refresh ❤️ 正反馈board",
			callback: () => this.refreshFeedbackBoard(),
		});

		// Negative feedback board ribbon and commands
		this.addRibbonIcon("frown", "Open 😒 负反馈board", () => {
			this.openNegativeFeedbackBoard();
		});

		this.addCommand({
			id: "open-acta-negative-feedback-board",
			name: "Open 😒 负反馈board",
			callback: () => this.openNegativeFeedbackBoard(),
		});

		this.addCommand({
			id: "refresh-acta-negative-feedback-board",
			name: "Refresh 😒 负反馈board",
			callback: () => this.refreshNegativeFeedbackBoard(),
		});

		// Promise Land board ribbon and commands
		this.addRibbonIcon("star", "Open Promise Land board", () => {
			this.openPromiseLandBoard();
		});

		this.addCommand({
			id: "open-acta-promiseland-board",
			name: "Open Promise Land board",
			callback: () => this.openPromiseLandBoard(),
		});

		this.addCommand({
			id: "refresh-acta-promiseland-board",
			name: "Refresh Promise Land board",
			callback: () => this.refreshPromiseLandBoard(),
		});

		this.addSettingTab(new ActaTaskSettingTab(this.app, this));

		// Pull remote changes on startup
		this.runGit("git pull --no-rebase origin main");

		// Auto-commit on file changes (debounced 60s)
		this.setupAutoCommit();

		// Auto-stamp new files with date property
		this.setupDateStamping();
	}

	async onunload(): Promise<void> {
		this.app.workspace.detachLeavesOfType(ACTA_TASK_VIEW_TYPE);
		this.app.workspace.detachLeavesOfType(ACTA_FEEDBACK_VIEW_TYPE);
		this.app.workspace.detachLeavesOfType(ACTA_NEGATIVE_FEEDBACK_VIEW_TYPE);
		this.app.workspace.detachLeavesOfType(ACTA_PROMISELAND_VIEW_TYPE);
		// Final auto-commit on plugin unload
		this.runAutoCommitAndPush();
	}

	async loadSettings(): Promise<void> {
		const data = await this.loadData();
		const settings = data?.settings;
		// Migrate legacy northStarModel -> promiseLandModel
		if (settings?.northStarModel && !settings?.promiseLandModel) {
			settings.promiseLandModel = settings.northStarModel;
			delete settings.northStarModel;
		}
		this.settings = Object.assign({}, DEFAULT_SETTINGS, settings);
	}

	async saveSettings(): Promise<void> {
		await this.saveData({
			settings: this.settings,
			tasks: this.data,
			feedback: this.feedbackData,
			negativeFeedback: this.negativeFeedbackData,
			promiseLand: this.promiseLandData,
		});
		// Propagate settings to managers and views
		if (this.taskManager) {
			this.taskManager.updateSettings(this.settings);
		}
		if (this.scanner) {
			this.scanner.updateSettings(this.settings);
		}
		if (this.feedbackManager) {
			this.feedbackManager.updateSettings(this.settings);
		}
		if (this.feedbackScanner) {
			this.feedbackScanner.updateSettings(this.settings);
		}
		if (this.negativeFeedbackManager) {
			this.negativeFeedbackManager.updateSettings(this.settings);
		}
		if (this.negativeFeedbackScanner) {
			this.negativeFeedbackScanner.updateSettings(this.settings);
		}
		if (this.promiseLandManager) {
			this.promiseLandManager.updateSettings(this.settings);
		}
		if (this.promiseLandLlmClient) {
			this.promiseLandLlmClient.updateSettings(this.settings);
		}
		if (this.promiseLandObserver) {
			this.promiseLandObserver.updateSettings(this.settings);
		}
		const promiseLandView = this.getActivePromiseLandView();
		if (promiseLandView) promiseLandView.updateSettings(this.settings);
		const taskView = this.getActiveTaskView();
		if (taskView) taskView.updateSettings(this.settings);
		const feedbackView = this.getActiveFeedbackView();
		if (feedbackView) feedbackView.updateSettings(this.settings);
		const negativeFeedbackView = this.getActiveNegativeFeedbackView();
		if (negativeFeedbackView) negativeFeedbackView.updateSettings(this.settings);
		// Force editor refresh for new marker emoji
		this.app.workspace.updateOptions();
	}

	async loadTaskData(): Promise<void> {
		const data = await this.loadData();
		this.data = Object.assign({}, DEFAULT_DATA, data?.tasks);
	}

	async saveTaskData(): Promise<void> {
		await this.saveData({
			settings: this.settings,
			tasks: this.data,
			feedback: this.feedbackData,
			negativeFeedback: this.negativeFeedbackData,
			promiseLand: this.promiseLandData,
		});
	}

	async loadFeedbackData(): Promise<void> {
		const data = await this.loadData();
		this.feedbackData = Object.assign(
			{},
			DEFAULT_FEEDBACK_DATA,
			data?.feedback
		);
	}

	async saveFeedbackData(): Promise<void> {
		await this.saveData({
			settings: this.settings,
			tasks: this.data,
			feedback: this.feedbackData,
			negativeFeedback: this.negativeFeedbackData,
			promiseLand: this.promiseLandData,
		});
	}

	async loadNegativeFeedbackData(): Promise<void> {
		const data = await this.loadData();
		this.negativeFeedbackData = Object.assign(
			{},
			DEFAULT_NEGATIVE_FEEDBACK_DATA,
			data?.negativeFeedback
		);
	}

	async saveNegativeFeedbackData(): Promise<void> {
		await this.saveData({
			settings: this.settings,
			tasks: this.data,
			feedback: this.feedbackData,
			negativeFeedback: this.negativeFeedbackData,
			promiseLand: this.promiseLandData,
		});
	}

	async loadPromiseLandData(): Promise<void> {
		const data = await this.loadData();
		// Migrate legacy northStar -> promiseLand
		const raw = data?.promiseLand ?? data?.northStar;
		this.promiseLandData = Object.assign(
			{},
			DEFAULT_PROMISELAND_DATA,
			raw
		);
		// Ensure nested defaults
		if (!this.promiseLandData.archivedGoals) {
			this.promiseLandData.archivedGoals = [];
		}
		// tinkerMessages is now per-goal (legacy shared field handled by manager migration)
		if (!this.promiseLandData.goalContexts) {
			this.promiseLandData.goalContexts = [];
		}

		// Migrate legacy single-goal data to goalContexts
		if (raw?.goal && !raw.goalContexts) {
			const legacyGoal = raw.goal;
			const legacyPolicy = raw.policy || { ...DEFAULT_PROMISELAND_DATA };
			const legacyAssessments: import("./promiseLandTypes").Assessment[] = raw.assessments || [];

			// Backfill goalId on legacy assessments
			for (const a of legacyAssessments) {
				if (!a.goalId) {
					a.goalId = legacyGoal.id;
				}
			}

			this.promiseLandData.goalContexts = [{
				goal: legacyGoal,
				policy: legacyPolicy,
				assessments: legacyAssessments,
				tinkerMessages: [],
			}];

			// Clean up legacy fields
			delete this.promiseLandData.goal;
			delete this.promiseLandData.policy;
			delete this.promiseLandData.assessments;
		}
	}

	async savePromiseLandData(): Promise<void> {
		await this.saveData({
			settings: this.settings,
			tasks: this.data,
			feedback: this.feedbackData,
			negativeFeedback: this.negativeFeedbackData,
			promiseLand: this.promiseLandData,
		});
	}

	private getActiveTaskView(): TaskBoardView | null {
		const leaves = this.app.workspace.getLeavesOfType(
			ACTA_TASK_VIEW_TYPE
		);
		if (leaves.length > 0) {
			return leaves[0].view as TaskBoardView;
		}
		return null;
	}

	private getActiveFeedbackView(): FeedbackBoardView | null {
		const leaves = this.app.workspace.getLeavesOfType(
			ACTA_FEEDBACK_VIEW_TYPE
		);
		if (leaves.length > 0) {
			return leaves[0].view as FeedbackBoardView;
		}
		return null;
	}

	private getActiveNegativeFeedbackView(): NegativeFeedbackBoardView | null {
		const leaves = this.app.workspace.getLeavesOfType(
			ACTA_NEGATIVE_FEEDBACK_VIEW_TYPE
		);
		if (leaves.length > 0) {
			return leaves[0].view as NegativeFeedbackBoardView;
		}
		return null;
	}

	private refreshBoard(): void {
		const view = this.getActiveTaskView();
		if (view) view.refresh();
	}

	private refreshFeedbackBoard(): void {
		const view = this.getActiveFeedbackView();
		if (view) view.refresh();
	}

	private refreshNegativeFeedbackBoard(): void {
		const view = this.getActiveNegativeFeedbackView();
		if (view) view.refresh();
	}

	private async openBoard(): Promise<void> {
		const existing =
			this.app.workspace.getLeavesOfType(ACTA_TASK_VIEW_TYPE);
		if (existing.length > 0) {
			this.app.workspace.revealLeaf(existing[0]);
			return;
		}

		const leaf = this.app.workspace.getRightLeaf(false);
		if (leaf) {
			await leaf.setViewState({
				type: ACTA_TASK_VIEW_TYPE,
				active: true,
			});
			this.app.workspace.revealLeaf(leaf);
		}
	}

	private async openFeedbackBoard(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(
			ACTA_FEEDBACK_VIEW_TYPE
		);
		if (existing.length > 0) {
			this.app.workspace.revealLeaf(existing[0]);
			return;
		}

		const leaf = this.app.workspace.getRightLeaf(false);
		if (leaf) {
			await leaf.setViewState({
				type: ACTA_FEEDBACK_VIEW_TYPE,
				active: true,
			});
			this.app.workspace.revealLeaf(leaf);
		}
	}

	private async openNegativeFeedbackBoard(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(
			ACTA_NEGATIVE_FEEDBACK_VIEW_TYPE
		);
		if (existing.length > 0) {
			this.app.workspace.revealLeaf(existing[0]);
			return;
		}

		const leaf = this.app.workspace.getRightLeaf(false);
		if (leaf) {
			await leaf.setViewState({
				type: ACTA_NEGATIVE_FEEDBACK_VIEW_TYPE,
				active: true,
			});
			this.app.workspace.revealLeaf(leaf);
		}
	}

	private getActivePromiseLandView(): PromiseLandBoardView | null {
		const leaves = this.app.workspace.getLeavesOfType(
			ACTA_PROMISELAND_VIEW_TYPE
		);
		if (leaves.length > 0) {
			return leaves[0].view as PromiseLandBoardView;
		}
		return null;
	}

	private refreshPromiseLandBoard(): void {
		const view = this.getActivePromiseLandView();
		if (view) view.refresh();
	}

	private async openPromiseLandBoard(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(
			ACTA_PROMISELAND_VIEW_TYPE
		);
		if (existing.length > 0) {
			this.app.workspace.revealLeaf(existing[0]);
			return;
		}

		const leaf = this.app.workspace.getRightLeaf(false);
		if (leaf) {
			await leaf.setViewState({
				type: ACTA_PROMISELAND_VIEW_TYPE,
				active: true,
			});
			this.app.workspace.revealLeaf(leaf);
		}
	}

	// ── Auto-commit on file changes ──

	private getVaultRoot(): string {
		return (this.app.vault.adapter as any).basePath;
	}

	private runGit(cmd: string): string {
		try {
			return execSync(cmd, {
				cwd: this.getVaultRoot(),
				encoding: "utf-8",
				timeout: 15000,
			}).trim();
		} catch {
			return "";
		}
	}

	private setupAutoCommit(): void {
		// Debounce: wait 60 seconds after the last file change before committing
		this.autoCommitDebounced = debounce(
			() => this.runAutoCommitAndPush(),
			60 * 1000,
			true // reset timer on each call
		);

		// Listen for file modifications, creations, and deletions
		this.registerEvent(
			this.app.vault.on("modify", () => this.autoCommitDebounced?.())
		);
		this.registerEvent(
			this.app.vault.on("create", () => this.autoCommitDebounced?.())
		);
		this.registerEvent(
			this.app.vault.on("delete", () => this.autoCommitDebounced?.())
		);
		this.registerEvent(
			this.app.vault.on("rename", () => this.autoCommitDebounced?.())
		);
	}

	private runAutoCommitAndPush(): void {
		// Pull remote changes first to stay in sync with other agents
		this.runGit("git pull --no-rebase origin main");

		const status = this.runGit("git status --porcelain");
		if (!status) return; // Nothing to commit

		const now = new Date();
		const timestamp = now.toISOString().replace(/\.\d{3}Z$/, "");
		this.runGit("git add -A");
		this.runGit(`git commit -m "vault: auto-save ${timestamp}"`);
		this.runGit("git push");
	}

	// ── Auto date-stamp new files ──

	private setupDateStamping(): void {
		this.registerEvent(
			this.app.vault.on("create", (file) => {
				if (!(file instanceof TFile)) return;
				if (!file.path.endsWith(".md")) return;
				// Skip system folders
				if (file.path.startsWith(".obsidian/")) return;
				if (file.path.startsWith("PromiseLand/check-ins/")) return;

				// Small delay to let Obsidian/templates finish writing initial content
				setTimeout(() => this.stampDateProperty(file), 500);
			})
		);
	}

	private async stampDateProperty(file: TFile): Promise<void> {
		try {
			// Only stamp truly new files — skip moved/existing files
			// A truly new file was created within the last 10 seconds
			const now = Date.now();
			if (now - file.stat.ctime > 10000) return; // File is older than 10s, likely moved

			const content = await this.app.vault.read(file);

			// Don't stamp if file already has frontmatter with a date
			if (content.startsWith("---")) {
				const endIdx = content.indexOf("---", 3);
				if (endIdx > 0) {
					const frontmatter = content.substring(3, endIdx);
					if (/^date:/m.test(frontmatter)) return;
				}
			}

			const nowDate = new Date();
			const dateStr = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, "0")}-${String(nowDate.getDate()).padStart(2, "0")}`;
			const timeStr = `${String(nowDate.getHours()).padStart(2, "0")}:${String(nowDate.getMinutes()).padStart(2, "0")}`;

			let newContent: string;
			if (content.startsWith("---")) {
				// Existing frontmatter — inject date + time after opening ---
				const endIdx = content.indexOf("---", 3);
				if (endIdx > 0) {
					const frontmatter = content.substring(3, endIdx);
					newContent = `---\ndate: ${dateStr}\ntime: ${timeStr}\n${frontmatter.trim() ? frontmatter.trimEnd() + "\n" : ""}---${content.substring(endIdx + 3)}`;
				} else {
					newContent = `---\ndate: ${dateStr}\ntime: ${timeStr}\n---\n${content}`;
				}
			} else {
				// No frontmatter — add it
				newContent = `---\ndate: ${dateStr}\ntime: ${timeStr}\n---\n${content}`;
			}

			await this.app.vault.modify(file, newContent);
		} catch {
			// Silently fail — don't break the user's workflow
		}
	}
}
