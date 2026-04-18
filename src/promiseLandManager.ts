import { App } from "obsidian";
import { ActaTaskSettings } from "./types";
import {
	ActaPromiseLandData,
	PromiseLandGoal,
	PromiseLandPolicy,
	GoalContext,
	Assessment,
	TinkerMessage,
	DEFAULT_SIGNAL_WEIGHTS,
	DEFAULT_POLICY,
} from "./promiseLandTypes";

const MAX_GOALS = 2;

export class PromiseLandManager {
	constructor(
		private app: App,
		private settings: ActaTaskSettings,
		private data: ActaPromiseLandData,
		private saveData: () => Promise<void>
	) {
		this.migrateTinkerMessages();
	}

	updateSettings(settings: ActaTaskSettings): void {
		this.settings = settings;
	}

	updateData(data: ActaPromiseLandData): void {
		this.data = data;
		this.migrateTinkerMessages();
	}

	/** Migrate legacy shared tinkerMessages into the first goal context */
	private migrateTinkerMessages(): void {
		// Ensure every goal context has a tinkerMessages array
		for (const gc of this.data.goalContexts) {
			if (!gc.tinkerMessages) gc.tinkerMessages = [];
		}

		// Migrate legacy shared messages to the first goal context
		if (this.data.tinkerMessages && this.data.tinkerMessages.length > 0) {
			if (this.data.goalContexts.length > 0 && this.data.goalContexts[0].tinkerMessages.length === 0) {
				this.data.goalContexts[0].tinkerMessages = [...this.data.tinkerMessages];
			}
			delete this.data.tinkerMessages;
			this.saveData();
		}
	}

	// ── Active goal persistence ──

	getActiveGoalId(): string | null {
		return this.data.activeGoalId ?? null;
	}

	async setActiveGoalId(goalId: string | null): Promise<void> {
		this.data.activeGoalId = goalId;
		await this.saveData();
		await this.saveGoalsFile();
	}

	// ── Goal access ──

	getGoals(): PromiseLandGoal[] {
		return this.data.goalContexts.map(gc => gc.goal);
	}

	getGoalContext(goalId: string): GoalContext | null {
		return this.data.goalContexts.find(gc => gc.goal.id === goalId) ?? null;
	}

	getGoalContexts(): GoalContext[] {
		return this.data.goalContexts;
	}

	getPolicy(goalId: string): PromiseLandPolicy {
		const ctx = this.getGoalContext(goalId);
		if (!ctx) return { ...DEFAULT_POLICY, signalWeights: { ...DEFAULT_SIGNAL_WEIGHTS }, milestones: [] };
		return ctx.policy;
	}

	getAssessments(goalId: string): Assessment[] {
		const ctx = this.getGoalContext(goalId);
		if (!ctx) return [];
		return ctx.assessments;
	}

	getAllAssessments(): Assessment[] {
		return this.data.goalContexts.flatMap(gc => gc.assessments);
	}

	getLatestAssessment(goalId: string): Assessment | null {
		const assessments = this.getAssessments(goalId);
		if (assessments.length === 0) return null;
		return assessments[assessments.length - 1];
	}

	getDayNumber(goalId: string, forDate?: string): number {
		const ctx = this.getGoalContext(goalId);
		if (!ctx) return 0;
		const lockedDate = new Date(ctx.goal.lockedAt);
		lockedDate.setHours(0, 0, 0, 0);
		const target = forDate ? new Date(forDate + "T00:00:00") : new Date();
		target.setHours(0, 0, 0, 0);
		const diffMs = target.getTime() - lockedDate.getTime();
		return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
	}

	getDaysLeft(goalId: string): number {
		const ctx = this.getGoalContext(goalId);
		if (!ctx) return 0;
		return Math.max(0, ctx.goal.timeWindowDays - this.getDayNumber(goalId) + 1);
	}

	async addGoal(text: string, timeWindowDays: number, context?: string, checkInFolder?: string): Promise<PromiseLandGoal> {
		if (this.data.goalContexts.length >= MAX_GOALS) {
			throw new Error(`Maximum of ${MAX_GOALS} concurrent goals allowed`);
		}

		const goal: PromiseLandGoal = {
			id: `ns-${Date.now()}`,
			text,
			...(context ? { context } : {}),
			...(checkInFolder && checkInFolder !== "PromiseLand/check-ins" ? { checkInFolder } : {}),
			timeWindowDays,
			lockedAt: Date.now(),
			active: true,
		};

		const ctx: GoalContext = {
			goal,
			policy: {
				signalWeights: { ...DEFAULT_SIGNAL_WEIGHTS },
				checkInPrompts: [],
				milestones: [],
				version: 1,
			},
			assessments: [],
			tinkerMessages: [],
		};

		this.data.goalContexts.push(ctx);
		await this.saveData();
		await this.saveGoalsFile();
		return goal;
	}

	async addAssessment(goalId: string, assessment: Assessment): Promise<void> {
		const ctx = this.getGoalContext(goalId);
		if (!ctx) throw new Error(`Goal context not found for goalId: ${goalId}`);

		// Replace existing assessment for the same date, or add new
		const existingIndex = ctx.assessments.findIndex(
			(a) => a.date === assessment.date
		);
		if (existingIndex >= 0) {
			ctx.assessments[existingIndex] = assessment;
		} else {
			ctx.assessments.push(assessment);
		}
		await this.saveData();
	}

	async archiveGoal(goalId: string): Promise<void> {
		const idx = this.data.goalContexts.findIndex(gc => gc.goal.id === goalId);
		if (idx < 0) return;

		const ctx = this.data.goalContexts[idx];
		ctx.goal.active = false;
		this.data.archivedGoals.push(ctx.goal);
		this.data.goalContexts.splice(idx, 1);

		await this.saveData();
		await this.saveGoalsFile();
	}

	async updateGoalContext(goalId: string, context: string): Promise<void> {
		const ctx = this.getGoalContext(goalId);
		if (!ctx) throw new Error(`Goal context not found for goalId: ${goalId}`);
		if (context) {
			ctx.goal.context = context;
		} else {
			delete ctx.goal.context;
		}
		await this.saveData();
		await this.saveGoalsFile();
	}

	async updateGoalCheckInFolder(goalId: string, folder: string): Promise<void> {
		const ctx = this.getGoalContext(goalId);
		if (!ctx) throw new Error(`Goal context not found for goalId: ${goalId}`);
		if (folder && folder !== "PromiseLand/check-ins") {
			ctx.goal.checkInFolder = folder;
		} else {
			delete ctx.goal.checkInFolder;
		}
		await this.saveData();
		await this.saveGoalsFile();
	}

	canAddGoal(): boolean {
		return this.data.goalContexts.length < MAX_GOALS;
	}

	// ── Tinker messages (per-goal) ──

	getTinkerMessages(goalId: string): TinkerMessage[] {
		const ctx = this.getGoalContext(goalId);
		if (!ctx) return [];
		return ctx.tinkerMessages;
	}

	async addTinkerMessage(goalId: string, msg: TinkerMessage): Promise<void> {
		const ctx = this.getGoalContext(goalId);
		if (!ctx) return;
		ctx.tinkerMessages.push(msg);
		await this.saveData();
	}

	async clearTinkerMessages(goalId: string): Promise<void> {
		const ctx = this.getGoalContext(goalId);
		if (!ctx) return;
		ctx.tinkerMessages = [];
		await this.saveData();
	}

	// ── Lightweight goals.json for external agents ──

	async saveGoalsFile(): Promise<void> {
		const goalsData = {
			activeGoalId: this.data.activeGoalId ?? null,
			goals: this.data.goalContexts.map(gc => ({
				id: gc.goal.id,
				text: gc.goal.text,
				...(gc.goal.context ? { context: gc.goal.context } : {}),
				timeWindowDays: gc.goal.timeWindowDays,
				lockedAt: gc.goal.lockedAt,
				active: gc.goal.active,
			})),
		};
		await this.app.vault.adapter.write(
			"PromiseLand/goals.json",
			JSON.stringify(goalsData, null, 2) + "\n"
		);
	}
}
