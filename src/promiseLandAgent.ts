import { PromiseLandManager } from "./promiseLandManager";
import { PromiseLandObserver } from "./promiseLandObserver";
import { PromiseLandLlmClient } from "./promiseLandLlmClient";
import {
	Assessment,
	DaySignals,
	PromiseLandGoal,
	PromiseLandPolicy,
	SignalBreakdownItem,
} from "./promiseLandTypes";

export type CycleProgressCallback = (step: string, status: "running" | "done", detail: string) => void;

export class PromiseLandAgent {
	constructor(
		private manager: PromiseLandManager,
		private observer: PromiseLandObserver,
		private llmClient: PromiseLandLlmClient
	) {}

	async observeSignals(dateStr: string, onProgress?: CycleProgressCallback): Promise<DaySignals> {
		return this.observer.observe(dateStr, (step, detail) => {
			const isRunning = detail.startsWith("Scanning") || detail.startsWith("Checking");
			onProgress?.(step, isRunning ? "running" : "done", detail);
		});
	}

	async assessSignals(goalId: string, dateStr: string, signals: DaySignals): Promise<Assessment> {
		const ctx = this.manager.getGoalContext(goalId);
		if (!ctx) throw new Error(`No goal context found for goalId: ${goalId}`);
		const dayNumber = this.manager.getDayNumber(goalId, dateStr);
		const assessment = await this.assess(ctx.goal, signals, ctx.policy, dayNumber, dateStr);
		assessment.goalId = goalId;
		await this.manager.addAssessment(goalId, assessment);
		return assessment;
	}

	async runCycle(goalId: string, dateStr: string, onProgress?: CycleProgressCallback): Promise<Assessment> {
		const ctx = this.manager.getGoalContext(goalId);
		if (!ctx) throw new Error(`No goal context found for goalId: ${goalId}`);

		const dayNumber = this.manager.getDayNumber(goalId, dateStr);

		// OBSERVE — each sub-step reports progress
		const signals = await this.observer.observe(dateStr, (step, detail) => {
			const isRunning = detail.startsWith("Scanning") || detail.startsWith("Checking");
			onProgress?.(step, isRunning ? "running" : "done", detail);
		});

		// ASSESS
		onProgress?.("assess", "running", "Sending signals to Claude for assessment...");
		const assessment = await this.assess(ctx.goal, signals, ctx.policy, dayNumber, dateStr);
		assessment.goalId = goalId;
		onProgress?.("assess", "done", `Assessment complete — score: ${assessment.overallScore}/100`);

		// STORE
		onProgress?.("save", "running", "Saving assessment...");
		await this.manager.addAssessment(goalId, assessment);
		onProgress?.("save", "done", "Assessment saved to data.json");

		return assessment;
	}

	private async assess(
		goal: PromiseLandGoal,
		signals: DaySignals,
		policy: PromiseLandPolicy,
		dayNumber: number,
		dateStr: string
	): Promise<Assessment> {
		const systemPrompt = this.buildAssessSystemPrompt();
		const userMessage = this.buildAssessUserMessage(goal, signals, policy, dayNumber);

		const rawResponse = await this.llmClient.call(systemPrompt, userMessage);
		return this.parseAssessResponse(rawResponse, dateStr, dayNumber, signals, policy.version, goal.id);
	}

	private buildAssessSystemPrompt(): string {
		return `You are an alignment assessment agent for Promise Land.

The user's philosophy is **Build -> Ship, Repeat**. Score today's alignment on exactly 2 categories:

1. **build** — Did focused work, learning, or growth happen toward the goal? This includes: coding, designing, writing, deep thinking, debugging complex systems, figuring out new frameworks, reading papers, studying, strategic thinking, documenting insights, recording demos, preparing submissions. Building and learning are the same activity — any sustained effort or growth counts.
2. **ship** — Did something get completed or reach a milestone? This includes: completing a training run, finishing an experiment, pushing code, deploying a product, submitting an entry, posting content, finishing a deliverable. Internal milestones count — shipping does NOT require external visibility. A completed training run IS a shipped artifact.

## Evidence Sources

You will receive:
- DAILY NOTE — the user's full daily note. Read it carefully. Tasks, ships, progress, and reflections may appear in ANY format: checkboxes, tables, bullet points, prose, or mixed. Extract what was accomplished by understanding the content, not by looking for a specific format.
- VAULT ACTIVITY — git diffs showing file changes across the vault
- FEEDBACK — positive/negative feedback entries
- CONVERSATION CONTEXT — excerpts from Tinker coaching chat. This is critical — it captures work outside the vault (demos, submissions, coding in other tools). Trust the conversation when vault signals are sparse.

## Adaptive Weights

Adapt weights based on the goal:
- **Sprint goals** (hackathons, deadlines, 1-7 days): build 0.45, ship 0.55
- **Learning goals** (interview prep, studying, research): build 0.75, ship 0.25
- **Long-term goals** (products, research): build 0.65, ship 0.35

## Rules
- Priority actions and Ship sections are OPTIONAL organizational tools. Not setting them is a valid workflow choice — NEVER treat empty priority actions as drift, slipping discipline, or a negative signal. Assess based on what was actually done, not on process compliance.
- Assess based on EVIDENCE OF WORK (vault diffs, conversation context, shipped artifacts) — not on whether the user followed a specific planning format.
- **Deep focus philosophy:** The user is a deep focus builder who works best going all-in on ONE thing per day. If today's work shows deep, concentrated effort on a single workstream, that is EXCELLENT execution — do NOT list other untouched workstreams as drift. Only flag something as drift if it's been neglected for many days AND is time-critical. "Haven't started X yet" is not drift when the user is deliberately sequencing tasks.
- Be specific — reference actual file names using [[filename]] wiki-link syntax (e.g. [[Final Submission]], [[SofaGenius - Talk Note]]). This makes the check-in note navigable.
- Be honest and calibrated — don't inflate scores, but also don't deflate them. If the reasoning you write supports a high score, the numeric score MUST match. Do not write strong reasoning then give a low number.

- **Scope: TODAY only.** Score based exclusively on what happened TODAY. Do NOT penalize today's score for what happened (or didn't happen) on previous days. Past missed days, past distractions, or accumulated debt from earlier days are irrelevant to today's score. Each day stands on its own. Drift indicators should only reference patterns visible IN TODAY'S signals — not historical complaints.

You MUST respond with valid JSON only:

{
  "overallScore": <number 0-100>,
  "signalBreakdown": [
    {
      "category": "<string: build | ship>",
      "weight": <number: adapted weight>,
      "score": <number: points earned>,
      "maxScore": <number: weight * 100>,
      "reasoning": "<string: 2-4 bullet points, each starting with '- '. Be specific about what was done TODAY.>"
    }
  ],
  "driftIndicators": ["<string: specific misalignment observation FROM TODAY — never reference previous days>"],
  "momentumIndicators": ["<string: specific progress observation FROM TODAY>"]
}

overallScore = sum of all scores. Each maxScore = weight * 100.`;
	}

	private buildAssessUserMessage(
		goal: PromiseLandGoal,
		signals: DaySignals,
		policy: PromiseLandPolicy,
		dayNumber: number
	): string {
		const modifiedFiles = signals.vaultActivity.modifiedFiles || [];

		const contextSection = goal.context
			? `\n## Goal Context\n${goal.context}\n`
			: "";

		// Build vault activity section with git diffs
		let vaultActivitySection: string;
		if (modifiedFiles.length > 0) {
			const fileEntries = modifiedFiles.map(f => {
				const newTag = f.createdToday ? " [NEW]" : "";
				const headingsLine = f.headings.length > 0
					? `  Headings: ${f.headings.join(" > ")}`
					: "";
				const diffBlock = f.diff
					? `  Changes:\n  \`\`\`diff\n  ${f.diff}\n  \`\`\``
					: "  (no diff available)";
				return `- **${f.fileName}** (${f.folder})${newTag}\n${headingsLine}\n${diffBlock}`;
			}).join("\n\n");
			vaultActivitySection = fileEntries;
		} else {
			vaultActivitySection = "No file changes detected via git diff.";
		}

		return `## Locked Goal
"${goal.text}"
Time window: ${goal.timeWindowDays} days
Day: ${dayNumber} of ${goal.timeWindowDays}
${contextSection}
## Measurement Policy (v${policy.version})
Default signal weights (adapt to goal type):
- build: ${policy.signalWeights.build}
- ship: ${policy.signalWeights.ship}

${policy.milestones.length > 0 ? `Milestones:\n${policy.milestones.map(m => `- ${m.text} (deadline: ${m.deadline}, completed: ${m.completed})`).join("\n")}` : "No milestones set yet."}

## Daily Note — Full Content

Read this carefully. Tasks, ships, progress, and reflections may appear in any format (tables, checkboxes, prose, bullet points). Understand what was accomplished from the content itself.

${signals.rawNoteContent || "(No daily note found for this date.)"}

## Vault Activity — What Changed Today (${modifiedFiles.length} files)

${vaultActivitySection}

### Feedback (${signals.feedback.length})
${signals.feedback.length > 0
	? signals.feedback.map(f => `- [${f.type}] ${f.text} ${f.tags.join(" ")}`).join("\n")
	: "No feedback entries today."}

${signals.conversationContext ? `## Conversation Context — What the User Discussed Today

The following are excerpts from the user's Tinker coaching conversation on this day. This reveals work and thinking that may not be captured in the vault signals above.

${signals.conversationContext}` : "## Conversation Context\nNo Tinker conversation recorded for this day."}

Produce the assessment JSON now. Evaluate ALL evidence — the daily note content, vault activity diffs, conversation context, and feedback. Read the daily note thoroughly — work items, completed tasks, shipped artifacts, and reflections can appear in any format.`;
	}

	private parseAssessResponse(
		raw: string,
		dateStr: string,
		dayNumber: number,
		signals: DaySignals,
		policyVersion: number,
		goalId: string
	): Assessment {
		let jsonStr = raw.trim();
		const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
		if (jsonMatch) {
			jsonStr = jsonMatch[1].trim();
		}

		const parsed = JSON.parse(jsonStr);

		return {
			id: `assess-${dateStr}-${Date.now()}`,
			goalId,
			date: dateStr,
			dayNumber,
			overallScore: Math.max(0, Math.min(100, parsed.overallScore || 0)),
			signalBreakdown: (parsed.signalBreakdown || []).map((s: SignalBreakdownItem) => ({
				category: s.category,
				weight: s.weight,
				score: s.score,
				maxScore: s.maxScore,
				reasoning: s.reasoning,
			})),
			driftIndicators: parsed.driftIndicators || [],
			momentumIndicators: parsed.momentumIndicators || [],
			rawSignals: signals,
			policyVersion,
		};
	}
}
