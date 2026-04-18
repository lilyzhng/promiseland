export interface TaskItem {
	id: string;           // `${filePath}:${lineNumber}`
	text: string;         // Task text (without the checkbox syntax and emoji)
	completed: boolean;
	filePath: string;
	fileName: string;
	line: number;         // 0-indexed line number in source file
	tags: string[];       // Tags from the note
	addedAt: number;      // Timestamp when added to board
}

export interface TopicGroup {
	tag: string;          // Raw tag e.g. "#work"
	displayTag: string;   // Display name e.g. "work"
	tasks: TaskItem[];
	completedCount: number;
	totalCount: number;
}

export interface BoardState {
	topics: TopicGroup[];
	lastUpdated: number;
}

export interface ActaTaskSettings {
	excludedTags: string[];
	excludedFolders: string[];
	showCompleted: boolean;
	showSourceNote: boolean;
	topicSortOrder: "alphabetical" | "taskCount";
	taskSortOrder: "byFile" | "incompleteFirst";
	anthropicApiKey: string;
	promiseLandModel: string;
}

export interface ActaTaskData {
	addedTasks: Record<string, TaskItem>; // taskId -> TaskItem
}

export const DEFAULT_SETTINGS: ActaTaskSettings = {
	excludedTags: [],
	excludedFolders: [".obsidian"],
	showCompleted: true,
	showSourceNote: true,
	topicSortOrder: "alphabetical",
	taskSortOrder: "incompleteFirst",
	anthropicApiKey: "",
	promiseLandModel: "claude-sonnet-4-20250514",
};

export const DEFAULT_DATA: ActaTaskData = {
	addedTasks: {},
};

export const ACTA_TASK_VIEW_TYPE = "promiseland-board";

// Feedback types
export interface FeedbackItem {
	id: string;           // `${filePath}:${lineNumber}`
	text: string;         // Feedback text (without tags)
	filePath: string;
	fileName: string;
	line: number;         // Line number in source file
	tags: string[];       // Topic tags from the line (excluding trigger tags)
	addedAt: number;      // Timestamp when added to board
}

export interface FeedbackGroup {
	tag: string;          // Raw tag e.g. "#coding"
	displayTag: string;   // Display name e.g. "coding"
	items: FeedbackItem[];
	totalCount: number;
}

export interface ActaFeedbackData {
	addedFeedback: Record<string, FeedbackItem>; // filePath -> FeedbackItem
}

export const DEFAULT_FEEDBACK_DATA: ActaFeedbackData = {
	addedFeedback: {},
};

export const ACTA_FEEDBACK_VIEW_TYPE = "acta-feedback-board";
export const FEEDBACK_TRIGGER_TAG = "#正反馈";
export const FEEDBACK_TRIGGER_TAGS = ["#正反馈", "#❤️"];

// Negative Feedback types
export interface ActaNegativeFeedbackData {
	addedNegativeFeedback: Record<string, FeedbackItem>; // filePath -> FeedbackItem
}

export const DEFAULT_NEGATIVE_FEEDBACK_DATA: ActaNegativeFeedbackData = {
	addedNegativeFeedback: {},
};

export const ACTA_NEGATIVE_FEEDBACK_VIEW_TYPE = "acta-negative-feedback-board";
export const NEGATIVE_FEEDBACK_TRIGGER_TAGS = ["#😒"];

// Promise Land types
export const ACTA_PROMISELAND_VIEW_TYPE = "acta-promiseland-board";
