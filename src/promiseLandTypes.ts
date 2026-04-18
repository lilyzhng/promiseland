// Promise Land — All interfaces, constants, and defaults

export interface PromiseLandGoal {
	id: string;
	text: string;
	context?: string;
	checkInFolder?: string; // custom folder for check-in notes (default: "PromiseLand/check-ins")
	timeWindowDays: number;
	lockedAt: number; // timestamp
	active: boolean;
}

export interface SignalWeights {
	build: number;
	ship: number;
	learn?: number; // Deprecated: merged into build
}

export interface Milestone {
	id: string;
	text: string;
	deadline: string; // ISO date string
	completed: boolean;
	completedAt?: number;
	droppedAt?: number;
	reason?: string;
}

export interface PromiseLandPolicy {
	signalWeights: SignalWeights;
	checkInPrompts: string[];
	milestones: Milestone[];
	version: number;
}

export interface TaskSignal {
	title: string;
	tags: string[];
	completed: boolean;
	timeAnnotation?: string;
	durationMin?: number;
	effort: "deep_work" | "quick_action";
	priority: boolean;
}

export interface FeedbackSignal {
	text: string;
	tags: string[];
	type: "positive" | "negative";
}

export interface ReflectionSignal {
	text: string;
	filePath: string;
}

export interface ModifiedFileSignal {
	filePath: string;
	fileName: string;
	folder: string;
	headings: string[];
	diff: string;           // git diff output for this file (truncated)
	createdToday: boolean;  // new file (not in last commit)
}

export interface VaultActivity {
	filesModified: number;
	foldersActive: string[];
	modifiedFiles?: ModifiedFileSignal[];
}

export interface ShipSignal {
	title: string;
	completed: boolean;
}

export interface DaySignals {
	date: string;
	tasks: TaskSignal[];
	ships: ShipSignal[];
	feedback: FeedbackSignal[];
	reflections: ReflectionSignal[];
	vaultActivity: VaultActivity;
	conversationContext?: string; // Tinker conversation excerpts from this day
	rawNoteContent?: string; // Full daily note content for LLM-based understanding
}

export interface SignalBreakdownItem {
	category: string;
	weight: number;
	score: number;
	maxScore: number;
	reasoning: string;
}

export interface Assessment {
	id: string;
	goalId: string;
	date: string;
	dayNumber: number;
	overallScore: number; // 0-100
	signalBreakdown: SignalBreakdownItem[];
	driftIndicators: string[];
	momentumIndicators: string[];
	rawSignals: DaySignals;
	policyVersion: number;
}

export interface GoalContext {
	goal: PromiseLandGoal;
	policy: PromiseLandPolicy;
	assessments: Assessment[];
	tinkerMessages: TinkerMessage[];
}

// Anthropic API content block types for tool use
export interface TextBlock { type: "text"; text: string }
export interface ToolUseBlock { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
export interface ToolResultBlock { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean }
export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

export interface ApiMessage { role: "user" | "assistant"; content: string | ContentBlock[] }
export interface ToolDefinition { name: string; description: string; input_schema: Record<string, unknown> }
export interface ApiResponse { content: ContentBlock[]; stop_reason: string }

export interface TinkerMessage {
	role: "user" | "assistant";
	content: string;
	timestamp: number;
	assessmentId?: string;
	referencedFiles?: { path: string; basename: string }[];
}

export interface ActaPromiseLandData {
	goalContexts: GoalContext[];
	archivedGoals: PromiseLandGoal[];
	activeGoalId?: string | null;
	tinkerMessages?: TinkerMessage[]; // Legacy: shared messages (migrated to per-goal)
	// Legacy fields for migration (pre-multi-goal)
	goal?: PromiseLandGoal | null;
	policy?: PromiseLandPolicy;
	assessments?: Assessment[];
}

export const DEFAULT_SIGNAL_WEIGHTS: SignalWeights = {
	build: 0.65,
	ship: 0.35,
};

export const DEFAULT_POLICY: PromiseLandPolicy = {
	signalWeights: { ...DEFAULT_SIGNAL_WEIGHTS },
	checkInPrompts: [],
	milestones: [],
	version: 1,
};

export const DEFAULT_PROMISELAND_DATA: ActaPromiseLandData = {
	goalContexts: [],
	archivedGoals: [],
};

export const TIME_ANNOTATION_REGEX = /@(\d{1,2}(?::?\d{2})?)\s*(?:AM|PM|am|pm)?\s*[-–]\s*(\d{1,2}(?::?\d{2})?)\s*(?:AM|PM|am|pm)?/;
