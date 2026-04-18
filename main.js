var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ActaTaskPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian13 = require("obsidian");
var import_child_process2 = require("child_process");

// src/types.ts
var DEFAULT_SETTINGS = {
  excludedTags: [],
  excludedFolders: [".obsidian"],
  showCompleted: true,
  showSourceNote: true,
  topicSortOrder: "alphabetical",
  taskSortOrder: "incompleteFirst",
  anthropicApiKey: "",
  promiseLandModel: "claude-sonnet-4-20250514"
};
var DEFAULT_DATA = {
  addedTasks: {}
};
var ACTA_TASK_VIEW_TYPE = "promiseland-board";
var DEFAULT_FEEDBACK_DATA = {
  addedFeedback: {}
};
var ACTA_FEEDBACK_VIEW_TYPE = "acta-feedback-board";
var FEEDBACK_TRIGGER_TAGS = ["#\u6B63\u53CD\u9988", "#\u2764\uFE0F"];
var DEFAULT_NEGATIVE_FEEDBACK_DATA = {
  addedNegativeFeedback: {}
};
var ACTA_NEGATIVE_FEEDBACK_VIEW_TYPE = "acta-negative-feedback-board";
var NEGATIVE_FEEDBACK_TRIGGER_TAGS = ["#\u{1F612}"];
var ACTA_PROMISELAND_VIEW_TYPE = "acta-promiseland-board";

// src/taskBoardView.ts
var import_obsidian = require("obsidian");
var TaskBoardView = class extends import_obsidian.ItemView {
  constructor(leaf, scanner, toggler, taskManager, settings) {
    super(leaf);
    this.collapsedTopics = /* @__PURE__ */ new Set();
    this.boardEl = null;
    this.scanner = scanner;
    this.toggler = toggler;
    this.taskManager = taskManager;
    this.settings = settings;
  }
  getViewType() {
    return ACTA_TASK_VIEW_TYPE;
  }
  getDisplayText() {
    return "PromiseLand Board";
  }
  getIcon() {
    return "list-checks";
  }
  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("promiseland-container");
    this.boardEl = container.createDiv({ cls: "promiseland-board" });
    await this.refresh();
    this.registerEvents();
  }
  async onClose() {
  }
  updateSettings(settings) {
    this.settings = settings;
    this.scanner.updateSettings(settings);
    this.refresh();
  }
  registerEvents() {
    const debouncedRefresh = (0, import_obsidian.debounce)(() => this.refresh(), 500, true);
    this.registerEvent(
      this.app.metadataCache.on("changed", () => debouncedRefresh())
    );
    this.registerEvent(
      this.app.vault.on("create", () => debouncedRefresh())
    );
    this.registerEvent(
      this.app.vault.on("delete", () => debouncedRefresh())
    );
    this.registerEvent(
      this.app.vault.on("rename", () => debouncedRefresh())
    );
  }
  async refresh() {
    if (!this.boardEl)
      return;
    const topics = await this.scanner.scanBoard();
    this.renderBoard(topics);
  }
  renderBoard(topics) {
    if (!this.boardEl)
      return;
    this.boardEl.empty();
    const header = this.boardEl.createDiv({ cls: "promiseland-header" });
    const titleRow = header.createDiv({ cls: "promiseland-title-row" });
    titleRow.createEl("h4", { text: "Task Board" });
    const refreshBtn = titleRow.createEl("button", {
      cls: "promiseland-refresh-btn clickable-icon",
      attr: { "aria-label": "Refresh" }
    });
    refreshBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`;
    refreshBtn.addEventListener("click", () => this.refresh());
    const totalTasks = topics.reduce((sum, t) => sum + t.totalCount, 0);
    const completedTasks = topics.reduce(
      (sum, t) => sum + t.completedCount,
      0
    );
    header.createDiv({
      cls: "promiseland-stats",
      text: `${completedTasks}/${totalTasks} done across ${topics.length} topics`
    });
    if (topics.length === 0) {
      this.boardEl.createDiv({
        cls: "promiseland-empty",
        text: "No tasks yet. Add checkboxes with inline hashtags (e.g. - [ ] #people do something) to see them here."
      });
      return;
    }
    const list = this.boardEl.createDiv({ cls: "promiseland-topics" });
    for (const topic of topics) {
      this.renderTopicSection(list, topic);
    }
  }
  renderTopicSection(parent, topic) {
    const section = parent.createDiv({ cls: "promiseland-topic-section" });
    const isCollapsed = this.collapsedTopics.has(topic.tag);
    const topicHeader = section.createDiv({
      cls: "promiseland-topic-header"
    });
    const chevron = topicHeader.createSpan({
      cls: `promiseland-chevron ${isCollapsed ? "is-collapsed" : ""}`
    });
    chevron.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    topicHeader.createSpan({
      cls: "promiseland-topic-tag",
      text: `#${topic.displayTag}`
    });
    topicHeader.createSpan({
      cls: "promiseland-topic-count",
      text: `${topic.completedCount}/${topic.totalCount}`
    });
    topicHeader.addEventListener("click", () => {
      if (this.collapsedTopics.has(topic.tag)) {
        this.collapsedTopics.delete(topic.tag);
      } else {
        this.collapsedTopics.add(topic.tag);
      }
      this.refresh();
    });
    if (!isCollapsed) {
      const taskList = section.createDiv({ cls: "promiseland-list" });
      for (const task of topic.tasks) {
        if (!this.settings.showCompleted && task.completed)
          continue;
        this.renderTaskItem(taskList, task);
      }
    }
  }
  renderTaskItem(parent, task) {
    const item = parent.createDiv({
      cls: `promiseland-item ${task.completed ? "is-completed" : ""}`
    });
    const checkbox = item.createEl("input", {
      type: "checkbox",
      cls: "promiseland-checkbox task-list-item-checkbox"
    });
    checkbox.checked = task.completed;
    checkbox.addEventListener("click", async (e) => {
      e.preventDefault();
      const success = await this.toggler.toggleTask(task);
      if (!success) {
        console.error("PromiseLand: Failed to toggle task", task.id);
      }
    });
    item.createSpan({
      cls: "promiseland-text",
      text: task.text
    });
    if (this.settings.showSourceNote) {
      const metaContainer = item.createSpan({
        cls: "promiseland-meta"
      });
      const badge = metaContainer.createSpan({
        cls: "promiseland-source-badge",
        text: task.fileName
      });
      badge.addEventListener("click", async (e) => {
        e.stopPropagation();
        const file = this.app.vault.getAbstractFileByPath(
          task.filePath
        );
        if (file instanceof import_obsidian.TFile) {
          await this.app.workspace.getLeaf(false).openFile(file, {
            eState: { line: task.line }
          });
        }
      });
      const date = new Date(task.addedAt);
      const dateStr = date.toLocaleDateString(void 0, {
        month: "short",
        day: "numeric"
      });
      metaContainer.createSpan({
        cls: "promiseland-date-badge",
        text: dateStr
      });
    }
    const removeBtn = item.createSpan({
      cls: "promiseland-remove-btn",
      text: "\xD7",
      attr: { title: "Remove from board" }
    });
    removeBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await this.taskManager.removeTask(task.id);
      this.refresh();
    });
  }
};

// src/feedbackBoardView.ts
var import_obsidian2 = require("obsidian");
var FeedbackBoardView = class extends import_obsidian2.ItemView {
  constructor(leaf, scanner, feedbackManager, settings) {
    super(leaf);
    this.collapsedTopics = /* @__PURE__ */ new Set();
    this.boardEl = null;
    this.scanner = scanner;
    this.feedbackManager = feedbackManager;
    this.settings = settings;
  }
  getViewType() {
    return ACTA_FEEDBACK_VIEW_TYPE;
  }
  getDisplayText() {
    return "\u2764\uFE0F \u6B63\u53CD\u9988board";
  }
  getIcon() {
    return "heart";
  }
  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("promiseland-container");
    this.boardEl = container.createDiv({ cls: "promiseland-board" });
    await this.refresh();
    this.registerEvents();
  }
  async onClose() {
  }
  updateSettings(settings) {
    this.settings = settings;
    this.scanner.updateSettings(settings);
    this.refresh();
  }
  registerEvents() {
    const debouncedRefresh = (0, import_obsidian2.debounce)(() => this.refresh(), 500, true);
    this.registerEvent(
      this.app.metadataCache.on("changed", () => debouncedRefresh())
    );
    this.registerEvent(
      this.app.vault.on("create", () => debouncedRefresh())
    );
    this.registerEvent(
      this.app.vault.on("delete", () => debouncedRefresh())
    );
    this.registerEvent(
      this.app.vault.on("rename", () => debouncedRefresh())
    );
  }
  async refresh() {
    if (!this.boardEl)
      return;
    const topics = await this.scanner.scanBoard();
    this.renderBoard(topics);
  }
  renderBoard(topics) {
    if (!this.boardEl)
      return;
    this.boardEl.empty();
    const header = this.boardEl.createDiv({ cls: "promiseland-header" });
    const titleRow = header.createDiv({ cls: "promiseland-title-row" });
    titleRow.createEl("h4", { text: "\u2764\uFE0F \u6B63\u53CD\u9988board" });
    const refreshBtn = titleRow.createEl("button", {
      cls: "promiseland-refresh-btn clickable-icon",
      attr: { "aria-label": "Refresh" }
    });
    refreshBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`;
    refreshBtn.addEventListener("click", () => this.refresh());
    const totalItems = topics.reduce((sum, t) => sum + t.totalCount, 0);
    header.createDiv({
      cls: "promiseland-stats",
      text: `${totalItems} items across ${topics.length} topics`
    });
    if (topics.length === 0) {
      this.boardEl.createDiv({
        cls: "promiseland-empty",
        text: "No \u6B63\u53CD\u9988 items yet. Add notes with #\u6B63\u53CD\u9988 or #\u2764\uFE0F and a topic tag (e.g. #coding) to see them here."
      });
      return;
    }
    const list = this.boardEl.createDiv({ cls: "promiseland-topics" });
    for (const topic of topics) {
      this.renderTopicSection(list, topic);
    }
  }
  renderTopicSection(parent, topic) {
    const section = parent.createDiv({ cls: "promiseland-topic-section" });
    const isCollapsed = this.collapsedTopics.has(topic.tag);
    const topicHeader = section.createDiv({
      cls: "promiseland-topic-header"
    });
    const chevron = topicHeader.createSpan({
      cls: `promiseland-chevron ${isCollapsed ? "is-collapsed" : ""}`
    });
    chevron.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    topicHeader.createSpan({
      cls: "promiseland-topic-tag",
      text: `#${topic.displayTag}`
    });
    topicHeader.createSpan({
      cls: "promiseland-topic-count",
      text: `${topic.totalCount}`
    });
    topicHeader.addEventListener("click", () => {
      if (this.collapsedTopics.has(topic.tag)) {
        this.collapsedTopics.delete(topic.tag);
      } else {
        this.collapsedTopics.add(topic.tag);
      }
      this.refresh();
    });
    if (!isCollapsed) {
      const itemList = section.createDiv({ cls: "promiseland-list" });
      for (const item of topic.items) {
        this.renderFeedbackItem(itemList, item);
      }
    }
  }
  renderFeedbackItem(parent, item) {
    const itemEl = parent.createDiv({
      cls: "promiseland-item acta-feedback-item"
    });
    itemEl.createSpan({
      cls: "promiseland-text acta-feedback-text",
      text: item.text
    });
    if (this.settings.showSourceNote) {
      const metaContainer = itemEl.createSpan({
        cls: "promiseland-meta"
      });
      const badge = metaContainer.createSpan({
        cls: "promiseland-source-badge",
        text: item.fileName
      });
      badge.addEventListener("click", async (e) => {
        e.stopPropagation();
        const file = this.app.vault.getAbstractFileByPath(
          item.filePath
        );
        if (file instanceof import_obsidian2.TFile) {
          await this.app.workspace.getLeaf(false).openFile(file, {
            eState: { line: item.line }
          });
        }
      });
      const date = new Date(item.addedAt);
      const dateStr = date.toLocaleDateString(void 0, {
        month: "short",
        day: "numeric"
      });
      metaContainer.createSpan({
        cls: "promiseland-date-badge",
        text: dateStr
      });
    }
    const removeBtn = itemEl.createSpan({
      cls: "promiseland-remove-btn",
      text: "\xD7",
      attr: { title: "Remove from board" }
    });
    removeBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await this.feedbackManager.removeFeedback(item.id);
      this.refresh();
    });
  }
};

// src/negativeFeedbackBoardView.ts
var import_obsidian3 = require("obsidian");
var NegativeFeedbackBoardView = class extends import_obsidian3.ItemView {
  constructor(leaf, scanner, negativeFeedbackManager, settings) {
    super(leaf);
    this.collapsedTopics = /* @__PURE__ */ new Set();
    this.boardEl = null;
    this.scanner = scanner;
    this.negativeFeedbackManager = negativeFeedbackManager;
    this.settings = settings;
  }
  getViewType() {
    return ACTA_NEGATIVE_FEEDBACK_VIEW_TYPE;
  }
  getDisplayText() {
    return "\u{1F612} \u8D1F\u53CD\u9988board";
  }
  getIcon() {
    return "frown";
  }
  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("promiseland-container");
    this.boardEl = container.createDiv({ cls: "promiseland-board acta-negative-feedback-board" });
    await this.refresh();
    this.registerEvents();
  }
  async onClose() {
  }
  updateSettings(settings) {
    this.settings = settings;
    this.scanner.updateSettings(settings);
    this.refresh();
  }
  registerEvents() {
    const debouncedRefresh = (0, import_obsidian3.debounce)(() => this.refresh(), 500, true);
    this.registerEvent(
      this.app.metadataCache.on("changed", () => debouncedRefresh())
    );
    this.registerEvent(
      this.app.vault.on("create", () => debouncedRefresh())
    );
    this.registerEvent(
      this.app.vault.on("delete", () => debouncedRefresh())
    );
    this.registerEvent(
      this.app.vault.on("rename", () => debouncedRefresh())
    );
  }
  async refresh() {
    if (!this.boardEl)
      return;
    const topics = await this.scanner.scanBoard();
    this.renderBoard(topics);
  }
  renderBoard(topics) {
    if (!this.boardEl)
      return;
    this.boardEl.empty();
    const header = this.boardEl.createDiv({ cls: "promiseland-header" });
    const titleRow = header.createDiv({ cls: "promiseland-title-row" });
    titleRow.createEl("h4", { text: "\u{1F612} \u8D1F\u53CD\u9988board" });
    const refreshBtn = titleRow.createEl("button", {
      cls: "promiseland-refresh-btn clickable-icon",
      attr: { "aria-label": "Refresh" }
    });
    refreshBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`;
    refreshBtn.addEventListener("click", () => this.refresh());
    const totalItems = topics.reduce((sum, t) => sum + t.totalCount, 0);
    header.createDiv({
      cls: "promiseland-stats",
      text: `${totalItems} items across ${topics.length} topics`
    });
    if (topics.length === 0) {
      this.boardEl.createDiv({
        cls: "promiseland-empty",
        text: "No \u8D1F\u53CD\u9988 items yet. Add notes with #\u{1F612} and a topic tag (e.g. #work) to see them here."
      });
      return;
    }
    const list = this.boardEl.createDiv({ cls: "promiseland-topics" });
    for (const topic of topics) {
      this.renderTopicSection(list, topic);
    }
  }
  renderTopicSection(parent, topic) {
    const section = parent.createDiv({ cls: "promiseland-topic-section" });
    const isCollapsed = this.collapsedTopics.has(topic.tag);
    const topicHeader = section.createDiv({
      cls: "promiseland-topic-header"
    });
    const chevron = topicHeader.createSpan({
      cls: `promiseland-chevron ${isCollapsed ? "is-collapsed" : ""}`
    });
    chevron.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    topicHeader.createSpan({
      cls: "promiseland-topic-tag",
      text: `#${topic.displayTag}`
    });
    topicHeader.createSpan({
      cls: "promiseland-topic-count",
      text: `${topic.totalCount}`
    });
    topicHeader.addEventListener("click", () => {
      if (this.collapsedTopics.has(topic.tag)) {
        this.collapsedTopics.delete(topic.tag);
      } else {
        this.collapsedTopics.add(topic.tag);
      }
      this.refresh();
    });
    if (!isCollapsed) {
      const itemList = section.createDiv({ cls: "promiseland-list" });
      for (const item of topic.items) {
        this.renderFeedbackItem(itemList, item);
      }
    }
  }
  renderFeedbackItem(parent, item) {
    const itemEl = parent.createDiv({
      cls: "promiseland-item acta-feedback-item acta-negative-feedback-item"
    });
    itemEl.createSpan({
      cls: "promiseland-text acta-feedback-text",
      text: item.text
    });
    if (this.settings.showSourceNote) {
      const metaContainer = itemEl.createSpan({
        cls: "promiseland-meta"
      });
      const badge = metaContainer.createSpan({
        cls: "promiseland-source-badge",
        text: item.fileName
      });
      badge.addEventListener("click", async (e) => {
        e.stopPropagation();
        const file = this.app.vault.getAbstractFileByPath(
          item.filePath
        );
        if (file instanceof import_obsidian3.TFile) {
          await this.app.workspace.getLeaf(false).openFile(file, {
            eState: { line: item.line }
          });
        }
      });
      const date = new Date(item.addedAt);
      const dateStr = date.toLocaleDateString(void 0, {
        month: "short",
        day: "numeric"
      });
      metaContainer.createSpan({
        cls: "promiseland-date-badge",
        text: dateStr
      });
    }
    const removeBtn = itemEl.createSpan({
      cls: "promiseland-remove-btn",
      text: "\xD7",
      attr: { title: "Remove from board" }
    });
    removeBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await this.negativeFeedbackManager.removeFeedback(item.id);
      this.refresh();
    });
  }
};

// src/promiseLandBoardView.ts
var import_obsidian5 = require("obsidian");

// src/promiseLandGoalModal.ts
var import_obsidian4 = require("obsidian");
var PromiseLandGoalModal = class extends import_obsidian4.Modal {
  constructor(app, onSubmit) {
    super(app);
    this.goalText = "";
    this.timeWindowDays = 30;
    this.goalContext = "";
    this.checkInFolder = "PromiseLand/check-ins";
    this.onSubmit = onSubmit;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "Set Your Promise Land" });
    contentEl.createEl("p", {
      text: "Define your goal and lock it in. The goal cannot be changed \u2014 only archived and replaced.",
      cls: "setting-item-description"
    });
    new import_obsidian4.Setting(contentEl).setName("Goal").setDesc("What are you working toward?").addTextArea(
      (text) => text.setPlaceholder("e.g., Land a Post-Training Research Engineer role").onChange((value) => {
        this.goalText = value;
      })
    );
    new import_obsidian4.Setting(contentEl).setName("Time window (days)").setDesc("How many days to reach this goal?").addText(
      (text) => text.setPlaceholder("30").setValue("30").onChange((value) => {
        const num = parseInt(value, 10);
        if (!isNaN(num) && num > 0) {
          this.timeWindowDays = num;
        }
      })
    );
    new import_obsidian4.Setting(contentEl).setName("Check-in folder").setDesc("Where to save check-in notes for this goal").addText(
      (text) => text.setPlaceholder("PromiseLand/check-ins").setValue(this.checkInFolder).onChange((value) => {
        this.checkInFolder = value.trim() || "PromiseLand/check-ins";
      })
    );
    new import_obsidian4.Setting(contentEl).setName("Context / Reference").setDesc("Paste job postings, links, skill requirements, or any reference material that defines what this goal looks like.").addTextArea(
      (text) => text.setPlaceholder("e.g., Job posting URL, required skills, key milestones...").onChange((value) => {
        this.goalContext = value;
      })
    );
    const contextTextarea = contentEl.querySelector(".setting-item:nth-child(4) textarea");
    if (contextTextarea instanceof HTMLTextAreaElement) {
      contextTextarea.rows = 6;
    }
    new import_obsidian4.Setting(contentEl).addButton(
      (btn) => btn.setButtonText("Lock It In").setCta().onClick(() => {
        if (this.goalText.trim().length === 0)
          return;
        this.onSubmit(this.goalText.trim(), this.timeWindowDays, this.goalContext.trim(), this.checkInFolder);
        this.close();
      })
    );
  }
  onClose() {
    this.contentEl.empty();
  }
};
var PromiseLandEditFolderModal = class extends import_obsidian4.Modal {
  constructor(app, currentFolder, onSubmit) {
    super(app);
    this.folderValue = currentFolder;
    this.onSubmit = onSubmit;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "Check-in Folder" });
    contentEl.createEl("p", {
      text: "Set the folder where check-in notes are saved for this goal.",
      cls: "setting-item-description"
    });
    new import_obsidian4.Setting(contentEl).setName("Folder path").addText(
      (text) => text.setPlaceholder("PromiseLand/check-ins").setValue(this.folderValue).onChange((value) => {
        this.folderValue = value;
      })
    );
    new import_obsidian4.Setting(contentEl).addButton(
      (btn) => btn.setButtonText("Save").setCta().onClick(() => {
        this.onSubmit(this.folderValue.trim());
        this.close();
      })
    );
  }
  onClose() {
    this.contentEl.empty();
  }
};
var PromiseLandEditContextModal = class extends import_obsidian4.Modal {
  constructor(app, currentContext, onSubmit) {
    super(app);
    this.contextValue = currentContext;
    this.onSubmit = onSubmit;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "Edit Goal Context" });
    contentEl.createEl("p", {
      text: "Paste job postings, links, skill requirements, or any reference material that defines what this goal looks like.",
      cls: "setting-item-description"
    });
    const textarea = contentEl.createEl("textarea", {
      cls: "acta-promiseland-context-textarea",
      attr: { placeholder: "e.g., Job posting URL, required skills, key milestones...", rows: "8" }
    });
    textarea.value = this.contextValue;
    textarea.style.width = "100%";
    textarea.addEventListener("input", () => {
      this.contextValue = textarea.value;
    });
    new import_obsidian4.Setting(contentEl).addButton(
      (btn) => btn.setButtonText("Save").setCta().onClick(() => {
        this.onSubmit(this.contextValue.trim());
        this.close();
      })
    );
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/promiseLandBoardView.ts
var TOOL_DEFINITIONS = [
  {
    name: "get_today_date",
    description: "Get date info, day number for the current goal, and whether a check-in already exists. ALWAYS call this first before observe_signals or run_assessment. When the user says 'check in for yesterday', pass date='yesterday'. The returned date MUST be used for all subsequent tool calls.",
    input_schema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Pass 'yesterday' when user asks for yesterday's check-in, or a YYYY-MM-DD date for a specific day. Omit for today."
        }
      },
      required: []
    }
  },
  {
    name: "observe_signals",
    description: "Scan the vault for signals on a given date: tasks, feedback, reflections, and vault activity. Call get_today_date first, then pass the date here.",
    input_schema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "The date to observe in YYYY-MM-DD format (from get_today_date)"
        }
      },
      required: ["date"]
    }
  },
  {
    name: "run_assessment",
    description: "Run LLM alignment assessment on collected signals for the current goal. Call observe_signals first. Pass the same date.",
    input_schema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "The date for this assessment in YYYY-MM-DD format (from get_today_date)"
        }
      },
      required: ["date"]
    }
  },
  {
    name: "save_conversation_summary",
    description: "Summarize the current Tinker conversation and append it to today's check-in note. Call this when the user asks to summarize, capture takeaways, or save conversation notes. Write the summary in markdown with key insights, action items, and decisions.",
    input_schema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "The date of the check-in note to append to, in YYYY-MM-DD format (from get_today_date)"
        },
        summary: {
          type: "string",
          description: "The conversation summary in markdown. Include: key insights, action items, and any decisions made. Use bullet points and keep it concise. If rewriting an existing summary, produce a single unified summary that merges old and new insights."
        },
        overwrite: {
          type: "boolean",
          description: "Set to true when rewriting an existing summary with merged content. On first call, omit this \u2014 the tool will return existing content for you to merge."
        }
      },
      required: ["date", "summary"]
    }
  },
  {
    name: "get_assessment_history",
    description: "Retrieve past assessments for trend analysis for the current goal.",
    input_schema: {
      type: "object",
      properties: {
        count: {
          type: "number",
          description: "Number of recent assessments to retrieve (default 5)"
        }
      },
      required: []
    }
  }
];
var PromiseLandBoardView = class extends import_obsidian5.ItemView {
  constructor(leaf, manager, agent, llmClient, settings) {
    super(leaf);
    this.boardEl = null;
    this.isSending = false;
    this.chatMessagesEl = null;
    this.lastObservedSignals = null;
    this.activeGoalId = null;
    // @ mention state
    this.referencedFiles = [];
    this.mentionDropdownEl = null;
    this.mentionQuery = "";
    this.mentionStartIndex = -1;
    this.mentionSelectedIndex = 0;
    this.mentionFilteredFiles = [];
    this.fileChipsEl = null;
    this.manager = manager;
    this.agent = agent;
    this.llmClient = llmClient;
    this.settings = settings;
  }
  getViewType() {
    return ACTA_PROMISELAND_VIEW_TYPE;
  }
  getDisplayText() {
    return "Promise Land";
  }
  getIcon() {
    return "star";
  }
  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("promiseland-container");
    this.activeGoalId = this.manager.getActiveGoalId();
    this.boardEl = container.createDiv({ cls: "acta-promiseland-board" });
    this.renderBoard();
  }
  async onClose() {
  }
  updateSettings(settings) {
    this.settings = settings;
  }
  refresh() {
    if (!this.isSending) {
      this.renderBoard();
    }
  }
  getLocalDateStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  getYesterdayDateStr() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  renderBoard() {
    if (!this.boardEl)
      return;
    this.boardEl.empty();
    this.chatMessagesEl = null;
    const goals = this.manager.getGoals();
    this.renderHeader();
    if (goals.length === 0) {
      this.activeGoalId = null;
      this.renderEmptyGoalState();
      return;
    }
    if (!this.activeGoalId || !goals.find((g) => g.id === this.activeGoalId)) {
      this.activeGoalId = goals[0].id;
    }
    this.renderGoalsSection(goals);
    this.renderTinkerChat();
  }
  renderHeader() {
    if (!this.boardEl)
      return;
    const header = this.boardEl.createDiv({ cls: "acta-promiseland-header" });
    const titleRow = header.createDiv({ cls: "acta-promiseland-title-row" });
    titleRow.createEl("h4", { text: "Promise Land" });
    const btnGroup = titleRow.createDiv({ cls: "acta-promiseland-btn-group" });
    const refreshBtn = btnGroup.createEl("button", {
      cls: "acta-promiseland-refresh-btn clickable-icon",
      attr: { "aria-label": "Refresh" }
    });
    refreshBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`;
    refreshBtn.addEventListener("click", () => this.refresh());
  }
  renderEmptyGoalState() {
    if (!this.boardEl)
      return;
    const empty = this.boardEl.createDiv({ cls: "acta-promiseland-empty" });
    empty.createEl("p", { text: "No goal set yet." });
    const setBtn = empty.createEl("button", {
      cls: "acta-promiseland-set-goal-btn",
      text: "Set Your Promise Land"
    });
    setBtn.addEventListener("click", () => this.openGoalModal());
  }
  switchActiveGoal(goalId) {
    this.activeGoalId = goalId;
    this.manager.setActiveGoalId(goalId);
    this.renderBoard();
  }
  renderGoalsSection(goals) {
    if (!this.boardEl)
      return;
    const section = this.boardEl.createDiv({ cls: "acta-promiseland-goals-section" });
    const activeIndex = goals.findIndex((g) => g.id === this.activeGoalId);
    const currentIndex = activeIndex >= 0 ? activeIndex : 0;
    const activeGoal = goals[currentIndex];
    const carousel = section.createDiv({ cls: "acta-promiseland-goal-carousel" });
    const leftArrow = carousel.createEl("button", {
      cls: "acta-promiseland-carousel-arrow",
      text: "\u2039",
      attr: { "aria-label": "Previous goal" }
    });
    leftArrow.disabled = currentIndex === 0;
    leftArrow.addEventListener("click", () => {
      if (currentIndex > 0 && !this.isSending) {
        this.switchActiveGoal(goals[currentIndex - 1].id);
      }
    });
    const cardWrapper = carousel.createDiv({ cls: "acta-promiseland-carousel-card-wrapper" });
    this.renderGoalCard(cardWrapper, activeGoal);
    const rightArrow = carousel.createEl("button", {
      cls: "acta-promiseland-carousel-arrow",
      text: "\u203A",
      attr: { "aria-label": "Next goal" }
    });
    rightArrow.disabled = currentIndex === goals.length - 1;
    rightArrow.addEventListener("click", () => {
      if (currentIndex < goals.length - 1 && !this.isSending) {
        this.switchActiveGoal(goals[currentIndex + 1].id);
      }
    });
    if (goals.length > 1) {
      const dots = section.createDiv({ cls: "acta-promiseland-carousel-dots" });
      for (let i = 0; i < goals.length; i++) {
        const dot = dots.createDiv({
          cls: `acta-promiseland-carousel-dot${i === currentIndex ? " is-active" : ""}`
        });
        dot.addEventListener("click", () => {
          if (i !== currentIndex && !this.isSending) {
            this.switchActiveGoal(goals[i].id);
          }
        });
      }
    }
    if (this.manager.canAddGoal()) {
      const addBtn = section.createDiv({ cls: "acta-promiseland-add-goal-btn" });
      addBtn.textContent = "+";
      addBtn.setAttribute("aria-label", "Add another goal");
      addBtn.addEventListener("click", () => this.openGoalModal());
    }
  }
  renderGoalCard(parent, goal) {
    const isActive = goal.id === this.activeGoalId;
    const card = parent.createDiv({ cls: `acta-promiseland-goal-card${isActive ? " is-active" : ""}` });
    card.addEventListener("click", () => {
      if (this.activeGoalId !== goal.id && !this.isSending) {
        this.switchActiveGoal(goal.id);
      }
    });
    const topRow = card.createDiv({ cls: "acta-promiseland-goal-top-row" });
    const completeBtn = topRow.createEl("button", {
      cls: "acta-promiseland-complete-btn clickable-icon",
      attr: { "aria-label": "Mark goal as completed" }
    });
    completeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`;
    completeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.completeGoal(goal);
    });
    const goalText = topRow.createDiv({ cls: "acta-promiseland-goal-text" });
    goalText.createEl("span", { text: goal.text });
    const badges = card.createDiv({ cls: "acta-promiseland-goal-badges" });
    const dayNum = this.manager.getDayNumber(goal.id);
    badges.createEl("span", {
      cls: "acta-promiseland-badge",
      text: `Day ${dayNum} of ${goal.timeWindowDays}`
    });
    const daysLeft = this.manager.getDaysLeft(goal.id);
    badges.createEl("span", {
      cls: `acta-promiseland-badge ${daysLeft <= 7 ? "acta-promiseland-badge-urgent" : ""}`,
      text: `${daysLeft}d left`
    });
    const contextLink = badges.createEl("span", {
      cls: "acta-promiseland-goal-context-link",
      text: goal.context ? "edit context" : "+ context",
      attr: { "aria-label": goal.context ? "Edit context" : "Add reference context" }
    });
    contextLink.addEventListener("click", (e) => {
      e.stopPropagation();
      this.openEditContextModal(goal);
    });
    const folderLink = badges.createEl("span", {
      cls: "acta-promiseland-goal-context-link",
      text: `\u{1F4C1} ${goal.checkInFolder || "PromiseLand/check-ins"}`,
      attr: { "aria-label": "Change check-in folder" }
    });
    folderLink.addEventListener("click", (e) => {
      e.stopPropagation();
      new PromiseLandEditFolderModal(this.app, goal.checkInFolder || "PromiseLand/check-ins", async (folder) => {
        await this.manager.updateGoalCheckInFolder(goal.id, folder);
        new import_obsidian5.Notice(`Check-in folder updated to: ${folder || "PromiseLand/check-ins"}`);
        this.renderBoard();
      }).open();
    });
  }
  async completeGoal(goal) {
    const confirm = window.confirm(
      `Mark "${goal.text}" as completed and archive it?

This will remove it from the active goals list. Assessment history is preserved.`
    );
    if (!confirm)
      return;
    await this.manager.archiveGoal(goal.id);
    this.showCelebration(goal);
    const remaining = this.manager.getGoals();
    if (remaining.length > 0) {
      this.activeGoalId = remaining[0].id;
      this.manager.setActiveGoalId(remaining[0].id);
    } else {
      this.activeGoalId = null;
    }
    setTimeout(() => this.renderBoard(), 4e3);
  }
  showCelebration(goal) {
    const overlay = document.body.createDiv({ cls: "promiseland-celebration-overlay" });
    const content = overlay.createDiv({ cls: "promiseland-celebration-content" });
    content.createEl("div", { cls: "promiseland-celebration-emoji", text: "\u2B50" });
    content.createEl("div", { cls: "promiseland-celebration-title", text: "Goal Complete!" });
    content.createEl("div", { cls: "promiseland-celebration-goal", text: goal.text });
    const dayNum = this.manager.getDayNumber(goal.id);
    content.createEl("div", {
      cls: "promiseland-celebration-stats",
      text: `${dayNum} days of focus. You shipped it.`
    });
    const colors = ["#f39c12", "#e74c3c", "#27ae60", "#3498db", "#9b59b6", "#e67e22", "#1abc9c"];
    for (let i = 0; i < 80; i++) {
      const particle = overlay.createDiv({ cls: "promiseland-confetti" });
      const color = colors[Math.floor(Math.random() * colors.length)];
      const left = Math.random() * 100;
      const delay = Math.random() * 1.5;
      const duration = 2 + Math.random() * 2;
      const size = 6 + Math.random() * 8;
      const rotation = Math.random() * 360;
      particle.style.cssText = `
				left: ${left}%;
				background: ${color};
				width: ${size}px;
				height: ${size * 0.6}px;
				animation-delay: ${delay}s;
				animation-duration: ${duration}s;
				transform: rotate(${rotation}deg);
			`;
    }
    if (!document.getElementById("promiseland-celebration-styles")) {
      const style = document.createElement("style");
      style.id = "promiseland-celebration-styles";
      style.textContent = `
				.promiseland-celebration-overlay {
					position: fixed; top: 0; left: 0; right: 0; bottom: 0;
					z-index: 10000; pointer-events: none;
					display: flex; align-items: center; justify-content: center;
					animation: promiseland-fade-in 0.3s ease-out;
				}
				.promiseland-celebration-content {
					text-align: center; padding: 40px;
					background: var(--background-primary);
					border: 2px solid var(--text-accent);
					border-radius: 16px;
					box-shadow: 0 20px 60px rgba(0,0,0,0.3);
					pointer-events: auto;
					animation: promiseland-pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
				}
				.promiseland-celebration-emoji {
					font-size: 64px; margin-bottom: 12px;
					animation: promiseland-pulse 1s ease-in-out infinite;
				}
				.promiseland-celebration-title {
					font-size: 28px; font-weight: 700;
					color: var(--text-normal); margin-bottom: 8px;
				}
				.promiseland-celebration-goal {
					font-size: 16px; color: var(--text-muted);
					max-width: 400px; margin: 0 auto 12px;
				}
				.promiseland-celebration-stats {
					font-size: 14px; color: var(--text-faint);
				}
				.promiseland-confetti {
					position: fixed; top: -10px;
					border-radius: 2px;
					animation: promiseland-confetti-fall linear forwards;
					pointer-events: none;
				}
				@keyframes promiseland-confetti-fall {
					0% { top: -10px; opacity: 1; }
					100% { top: 110vh; opacity: 0; transform: rotate(720deg) translateX(100px); }
				}
				@keyframes promiseland-pop-in {
					0% { transform: scale(0.5); opacity: 0; }
					100% { transform: scale(1); opacity: 1; }
				}
				@keyframes promiseland-pulse {
					0%, 100% { transform: scale(1); }
					50% { transform: scale(1.2); }
				}
				@keyframes promiseland-fade-in {
					0% { opacity: 0; }
					100% { opacity: 1; }
				}
			`;
      document.head.appendChild(style);
    }
    setTimeout(() => overlay.remove(), 4e3);
  }
  formatCategoryName(category) {
    const names = {
      build: "Build + Learn",
      ship: "Ship",
      learn: "Build + Learn"
      // Legacy: learn is now merged into build
    };
    return names[category] || category;
  }
  openGoalModal() {
    new PromiseLandGoalModal(this.app, async (text, days, context, checkInFolder) => {
      await this.manager.addGoal(text, days, context || void 0, checkInFolder);
      new import_obsidian5.Notice("Promise Land goal locked in!");
      this.renderBoard();
    }).open();
  }
  openEditContextModal(goal) {
    new PromiseLandEditContextModal(this.app, goal.context || "", async (context) => {
      await this.manager.updateGoalContext(goal.id, context);
      new import_obsidian5.Notice(context ? "Goal context updated!" : "Goal context cleared.");
      this.renderBoard();
    }).open();
  }
  // ── Check-in note creation ──
  async createCheckInNote(assessment, goal, signals) {
    var _a, _b;
    const folderPath = goal.checkInFolder || "PromiseLand/check-ins";
    const goalSuffix = this.manager.getGoals().length > 1 ? ` \u2014 ${goal.text.slice(0, 40).replace(/[\\/:*?"<>|]/g, "").trim()}` : "";
    const filePath = `${folderPath}/Promise Land Check-in \u2014 ${assessment.date}${goalSuffix}.md`;
    if (!this.app.vault.getAbstractFileByPath(folderPath)) {
      await this.app.vault.createFolder(folderPath);
    }
    const scoreColor = (pct) => pct >= 70 ? "#27ae60" : pct >= 40 ? "#f39c12" : "#e74c3c";
    const buildBar = (pct) => {
      const color = scoreColor(pct);
      return `<div style="height:8px;background:#e0e0e0;border-radius:4px;overflow:hidden;margin:6px 0 10px 0"><div style="height:100%;width:${Math.min(100, Math.max(0, pct))}%;background:${color};border-radius:4px"></div></div>`;
    };
    const overallColor = scoreColor(assessment.overallScore);
    const knownFiles = (((_a = signals == null ? void 0 : signals.vaultActivity) == null ? void 0 : _a.modifiedFiles) || []).map((f) => f.fileName.replace(/\.md$/, ""));
    const autoLink = (text) => {
      let result = text;
      for (const name of knownFiles) {
        if (name.length < 4)
          continue;
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`(?<!\\[\\[)\\b${escaped}\\b(?!\\]\\])`, "gi");
        result = result.replace(regex, `[[${name}]]`);
      }
      return result;
    };
    const breakdownHtml = assessment.signalBreakdown.map((s) => {
      const pct = s.maxScore > 0 ? Math.round(s.score / s.maxScore * 100) : 0;
      let reasoning = s.reasoning.startsWith("- ") ? s.reasoning : s.reasoning.split(". ").filter(Boolean).map((pt) => `- ${pt.trim().replace(/\.$/, "")}`).join("\n");
      reasoning = autoLink(reasoning);
      return `### ${this.formatCategoryName(s.category)} \u2014 ${Math.round(s.score)}/${Math.round(s.maxScore)}

${buildBar(pct)}

${reasoning}`;
    }).join("\n\n");
    const driftMd = assessment.driftIndicators.length > 0 ? assessment.driftIndicators.map((d) => `- ${autoLink(d)}`).join("\n") : "None";
    const momentumMd = assessment.momentumIndicators.length > 0 ? assessment.momentumIndicators.map((m) => `- ${autoLink(m)}`).join("\n") : "None";
    let daySummaryMd = "";
    const modifiedFiles = ((_b = signals == null ? void 0 : signals.vaultActivity) == null ? void 0 : _b.modifiedFiles) || [];
    if (modifiedFiles.length > 0) {
      const categorize = (folder) => {
        if (folder.startsWith("Build"))
          return "Build";
        if (folder.startsWith("Learn"))
          return "Learn";
        if (folder.startsWith("Job Diary"))
          return "Job Diary";
        if (folder.startsWith("2026") || folder.startsWith("2025") || folder.startsWith("2027"))
          return "Journal";
        if (folder.startsWith("People"))
          return "People";
        if (folder.startsWith("PromiseLand"))
          return "PromiseLand";
        if (folder.startsWith("Projects"))
          return "Build";
        return folder.split("/")[0] || "Root";
      };
      const rows = modifiedFiles.map((f) => {
        const category = categorize(f.folder);
        const baseName = f.fileName.replace(/\.md$/, "");
        const link = `[[${baseName}]]`;
        const type = f.createdToday ? "New" : "Modified";
        const description = f.headings.length > 0 ? f.headings.slice(0, 3).join(", ") : "";
        return `| **${category}** | ${link} | ${type} | ${description} |`;
      });
      daySummaryMd = `### What Changed Today

| Category | Item | Type | Description |
| --- | --- | --- | --- |
${rows.join("\n")}

---
`;
    }
    const content = `**Goal:** ${goal.text}
**Day ${assessment.dayNumber} of ${goal.timeWindowDays}**

---

${daySummaryMd}
## <span style="color:${overallColor}">${assessment.overallScore}</span>/100

${breakdownHtml}

---

### Drift

${driftMd}

### Momentum

${momentumMd}
`;
    const existing = this.app.vault.getAbstractFileByPath(filePath);
    if (existing) {
      await this.app.vault.modify(existing, content);
    } else {
      await this.app.vault.create(filePath, content);
    }
  }
  // ── Day Summary Table ──
  async updateDaySummaryTable(dateStr, signals) {
    const compactDate = dateStr.replace(/-/g, "");
    const year = dateStr.slice(0, 4);
    const dailyNotePath = `${year}/${compactDate}.md`;
    const dailyNote = this.app.vault.getAbstractFileByPath(dailyNotePath);
    if (!dailyNote || !(dailyNote instanceof import_obsidian5.TFile))
      return;
    const modifiedFiles = signals.vaultActivity.modifiedFiles || [];
    if (modifiedFiles.length === 0)
      return;
    const categorize = (folder) => {
      if (folder.startsWith("Build"))
        return "Build";
      if (folder.startsWith("Learn"))
        return "Learn";
      if (folder.startsWith("Job Diary"))
        return "Job Diary";
      if (folder.startsWith("2026") || folder.startsWith("2025") || folder.startsWith("2027"))
        return "Journal";
      if (folder.startsWith("People"))
        return "People";
      if (folder.startsWith("PromiseLand"))
        return "PromiseLand";
      if (folder.startsWith("Projects"))
        return "Build";
      return folder.split("/")[0] || "Root";
    };
    const rows = modifiedFiles.map((f) => {
      const category = categorize(f.folder);
      const baseName = f.fileName.replace(/\.md$/, "");
      const link = `[[${baseName}]]`;
      const type = f.createdToday ? "New" : "Modified";
      const description = f.headings.length > 0 ? f.headings.slice(0, 3).join(", ") : "";
      return `| **${category}** | ${link} | ${type} | ${description} |`;
    });
    const table = `| Category | Item | Type | Description |
| --- | --- | --- | --- |
${rows.join("\n")}`;
    const content = await this.app.vault.read(dailyNote);
    const lines = content.split("\n");
    let sectionStart = -1;
    let sectionEnd = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^#{1,6}\s+Day\s+Summary\s+Table/i.test(lines[i])) {
        sectionStart = i;
        for (let j = i + 1; j < lines.length; j++) {
          if (/^#{1,6}\s+/.test(lines[j])) {
            sectionEnd = j;
            break;
          }
        }
        if (sectionEnd === -1)
          sectionEnd = lines.length;
        break;
      }
    }
    if (sectionStart === -1)
      return;
    const before = lines.slice(0, sectionStart + 1);
    const after = lines.slice(sectionEnd);
    const updated = [...before, "", table, "", ...after].join("\n");
    await this.app.vault.modify(dailyNote, updated);
  }
  // ── Check-in note link (inline in chat) ──
  renderCheckInLink(parent, assessment, goal) {
    const goalSuffix = this.manager.getGoals().length > 1 ? ` \u2014 ${goal.text.slice(0, 40).replace(/[\\/:*?"<>|]/g, "").trim()}` : "";
    const notePath = `PromiseLand/check-ins/Promise Land Check-in \u2014 ${assessment.date}${goalSuffix}.md`;
    const link = parent.createDiv({ cls: "acta-promiseland-checkin-link" });
    const scoreClass = assessment.overallScore >= 70 ? "acta-promiseland-score-good" : assessment.overallScore >= 40 ? "acta-promiseland-score-mid" : "acta-promiseland-score-low";
    link.createEl("span", { cls: `acta-promiseland-checkin-score ${scoreClass}`, text: `${assessment.overallScore}/100` });
    const goalLabel = this.manager.getGoals().length > 1 ? ` \u2014 ${goal.text.slice(0, 30)}${goal.text.length > 30 ? "..." : ""}` : "";
    link.createEl("span", { cls: "acta-promiseland-checkin-label", text: ` \u2014 Day ${assessment.dayNumber} Check-in${goalLabel}` });
    link.createEl("span", { cls: "acta-promiseland-checkin-open", text: "Open note \u2197" });
    link.addEventListener("click", () => {
      this.app.workspace.openLinkText(notePath, "", false);
    });
  }
  // ── Tinker Chat ──
  renderTinkerChat() {
    if (!this.boardEl || !this.activeGoalId)
      return;
    const container = this.boardEl.createDiv({ cls: "acta-promiseland-tinker-container" });
    container.createEl("h5", { text: "Tinker" });
    const messagesEl = container.createDiv({ cls: "acta-promiseland-tinker-messages" });
    this.chatMessagesEl = messagesEl;
    const messages = this.manager.getTinkerMessages(this.activeGoalId);
    for (const msg of messages) {
      if (msg.assessmentId) {
        const assessments = this.manager.getAssessments(this.activeGoalId);
        const assessment = assessments.find((a) => a.id === msg.assessmentId);
        if (assessment) {
          const goalCtx = this.manager.getGoalContext(this.activeGoalId);
          if (goalCtx) {
            this.renderCheckInLink(messagesEl, assessment, goalCtx.goal);
          }
        }
      }
      this.appendMessageBubble(messagesEl, msg);
    }
    const inputContainer = container.createDiv({ cls: "acta-promiseland-input-container" });
    const inputBox = inputContainer.createDiv({ cls: "acta-promiseland-input-box" });
    const textarea = inputBox.createEl("textarea", {
      cls: "acta-promiseland-input",
      attr: { placeholder: "Ask Tinker about your goal... (@ to mention files)", rows: "3" }
    });
    this.fileChipsEl = inputBox.createDiv({ cls: "acta-promiseland-file-chips" });
    this.referencedFiles = [];
    this.updateFileChips();
    this.mentionDropdownEl = inputContainer.createDiv({ cls: "acta-promiseland-mention-dropdown" });
    this.mentionDropdownEl.style.display = "none";
    const toolbar = inputBox.createDiv({ cls: "acta-promiseland-input-toolbar" });
    const models = [
      { value: "claude-haiku-4-5-20251001", label: "Haiku" },
      { value: "claude-sonnet-4-20250514", label: "Sonnet" },
      { value: "claude-opus-4-6", label: "Opus" }
    ];
    const currentModel = models.find((m) => m.value === this.settings.promiseLandModel);
    const modelSelector = toolbar.createDiv({ cls: "acta-promiseland-model-selector" });
    const modelBtn = modelSelector.createDiv({ cls: "acta-promiseland-model-btn" });
    const modelLabel = modelBtn.createEl("span", { text: (currentModel == null ? void 0 : currentModel.label) || "Sonnet" });
    modelBtn.createEl("span", { cls: "acta-promiseland-model-chevron", text: "\u25B4" });
    const dropdown = modelSelector.createDiv({ cls: "acta-promiseland-model-dropdown" });
    for (const m of models) {
      const option = dropdown.createDiv({
        cls: `acta-promiseland-model-option ${m.value === this.settings.promiseLandModel ? "is-selected" : ""}`,
        text: m.label
      });
      option.addEventListener("click", () => {
        this.settings.promiseLandModel = m.value;
        modelLabel.textContent = m.label;
        dropdown.querySelectorAll(".acta-promiseland-model-option").forEach((el) => el.removeClass("is-selected"));
        option.addClass("is-selected");
      });
    }
    const sendBtn = toolbar.createEl("button", {
      cls: "acta-promiseland-send-btn",
      attr: { "aria-label": "Send" }
    });
    sendBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
    const doSend = () => {
      const text = textarea.value.trim();
      if (!text || this.isSending)
        return;
      textarea.value = "";
      const filesToSend = [...this.referencedFiles];
      this.referencedFiles = [];
      this.updateFileChips();
      this.sendTinkerMessage(text, messagesEl, textarea, sendBtn, filesToSend);
    };
    sendBtn.addEventListener("click", doSend);
    textarea.addEventListener("input", () => {
      this.handleMentionInput(textarea);
    });
    textarea.addEventListener("keydown", (e) => {
      if (this.mentionDropdownEl && this.mentionDropdownEl.style.display !== "none") {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          this.navigateMention(1);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          this.navigateMention(-1);
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          this.selectMentionItem(textarea);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          this.closeMentionDropdown();
          return;
        }
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        doSend();
      }
    });
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }
  appendMessageBubble(container, msg) {
    const bubble = container.createDiv({
      cls: `acta-promiseland-tinker-bubble acta-promiseland-tinker-bubble-${msg.role}`
    });
    if (msg.role === "user" && msg.referencedFiles && msg.referencedFiles.length > 0) {
      const refsEl = bubble.createDiv({ cls: "acta-promiseland-bubble-refs" });
      for (const ref of msg.referencedFiles) {
        refsEl.createSpan({ cls: "acta-promiseland-bubble-ref-chip", text: `@${ref.basename}` });
      }
    }
    const contentEl = bubble.createDiv({ cls: "acta-promiseland-tinker-bubble-content" });
    import_obsidian5.MarkdownRenderer.renderMarkdown(msg.content, contentEl, "", this);
    return bubble;
  }
  // ── Tool step indicators ──
  renderToolStep(container, label) {
    const step = container.createDiv({ cls: "acta-promiseland-tool-step" });
    const indicator = step.createSpan({ cls: "acta-promiseland-step-indicator" });
    indicator.textContent = "\u25CF";
    step.createSpan({ cls: "acta-promiseland-step-label", text: label });
    step.addClass("acta-promiseland-step-running");
    container.scrollTop = container.scrollHeight;
    return step;
  }
  renderToolSubstep(parent, text, status) {
    const sub = parent.createDiv({ cls: "acta-promiseland-tool-substep" });
    const indicator = sub.createSpan({ cls: "acta-promiseland-step-indicator" });
    indicator.textContent = status === "done" ? "\u2713" : "\u25CF";
    sub.createSpan({ cls: "acta-promiseland-step-label", text });
    sub.addClass(status === "done" ? "acta-promiseland-step-done" : "acta-promiseland-step-running");
    return sub;
  }
  completeToolStep(stepEl, detail) {
    stepEl.removeClass("acta-promiseland-step-running");
    stepEl.addClass("acta-promiseland-step-done");
    const indicator = stepEl.querySelector(".acta-promiseland-step-indicator");
    if (indicator)
      indicator.textContent = "\u2713";
    if (detail) {
      stepEl.createSpan({ cls: "acta-promiseland-step-detail", text: ` \u2014 ${detail}` });
    }
  }
  // ── Typing indicator helpers ──
  addTypingIndicator(messagesEl) {
    const typingEl = messagesEl.createDiv({ cls: "acta-promiseland-tinker-typing" });
    typingEl.createSpan({ cls: "acta-promiseland-tinker-dot" });
    typingEl.createSpan({ cls: "acta-promiseland-tinker-dot" });
    typingEl.createSpan({ cls: "acta-promiseland-tinker-dot" });
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return typingEl;
  }
  // ── Tool execution ──
  async executeTool(toolName, toolInput, messagesEl) {
    var _a, _b;
    switch (toolName) {
      case "get_today_date": {
        const today = this.getLocalDateStr();
        const yesterday = this.getYesterdayDateStr();
        const currentHour = new Date().getHours();
        const rawDate = toolInput.date;
        const requestedDate = rawDate === "yesterday" ? yesterday : rawDate || today;
        const isYesterday = requestedDate === yesterday;
        if (!this.activeGoalId) {
          return { result: `Today is ${today}. No active goal selected.` };
        }
        const goalCtx = this.manager.getGoalContext(this.activeGoalId);
        if (!goalCtx) {
          return { result: `Today is ${today}. No active goal found.` };
        }
        const goal = goalCtx.goal;
        const dayNumber = this.manager.getDayNumber(goal.id);
        const adjustedDayNumber = isYesterday ? Math.max(1, dayNumber - 1) : dayNumber;
        const existing = this.manager.getAssessments(goal.id).find((a) => a.date === requestedDate);
        const hasCheckin = !!existing;
        let dateResult = `Today is ${today}. Requested date: ${requestedDate}.`;
        dateResult += `
Goal "${goal.text.slice(0, 50)}": Day ${adjustedDayNumber}.`;
        if (hasCheckin) {
          dateResult += ` Check-in exists (score: ${existing.overallScore}/100). Running again will update it.`;
        } else {
          dateResult += ` No check-in yet.`;
        }
        if (isYesterday) {
          dateResult += `
NOTE: This is yesterday's date. The user is doing a retroactive check-in. This is allowed \u2014 better late than never. Give a brief, gentle reminder to try to be more punctual next time, but proceed with the check-in.`;
        } else if (!toolInput.date && currentHour >= 0 && currentHour < 5) {
          dateResult += `
LATE-NIGHT NOTE: It's past midnight (${currentHour}:00). The user might want to check in for yesterday (${yesterday}) instead of today. If the user's message suggests they're reflecting on today's (now yesterday's) work, ask if they'd like to check in for ${yesterday}. Otherwise proceed with today.`;
        }
        return { result: dateResult };
      }
      case "observe_signals": {
        const dateStr = toolInput.date || this.getLocalDateStr();
        const stepEl = this.renderToolStep(messagesEl, `Observing vault signals for ${dateStr}...`);
        const signals = await this.agent.observeSignals(dateStr, (stepId, status, detail) => {
          if (status === "done") {
            this.renderToolSubstep(stepEl, `${stepId} \u2014 ${detail}`, "done");
            messagesEl.scrollTop = messagesEl.scrollHeight;
          }
        });
        if (this.activeGoalId) {
          const allMessages = this.manager.getTinkerMessages(this.activeGoalId);
          const dayStart = new Date(dateStr + "T00:00:00").getTime();
          const dayEnd = dayStart + 24 * 60 * 60 * 1e3;
          const dayMessages = allMessages.filter((m) => m.timestamp >= dayStart && m.timestamp < dayEnd);
          if (dayMessages.length > 0) {
            const userMessages = dayMessages.filter((m) => m.role === "user");
            const excerpts = [];
            let totalLen = 0;
            for (const msg of userMessages) {
              const text = msg.content.slice(0, 500);
              const line = `[User]: ${text}${msg.content.length > 500 ? "..." : ""}`;
              if (totalLen + line.length > 4e3)
                break;
              excerpts.push(line);
              totalLen += line.length;
            }
            if (excerpts.length > 0) {
              signals.conversationContext = excerpts.join("\n");
            }
          }
        }
        this.lastObservedSignals = signals;
        const gitFileCount = ((_a = signals.vaultActivity.modifiedFiles) == null ? void 0 : _a.length) || 0;
        const convCount = signals.conversationContext ? signals.conversationContext.split("\n").length : 0;
        const noteStatus = signals.rawNoteContent ? `${Math.round(signals.rawNoteContent.length / 1e3)}k chars` : "not found";
        const summary = `Observed for ${dateStr}: daily note (${noteStatus}), ${gitFileCount} files changed (git diff), ${signals.feedback.length} feedback, ${convCount} conversation messages`;
        this.completeToolStep(stepEl, summary);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return { result: summary };
      }
      case "run_assessment": {
        if (!this.lastObservedSignals) {
          return { result: "Error: No observed signals available. Call observe_signals first." };
        }
        const dateStr = toolInput.date || this.getLocalDateStr();
        if (!this.activeGoalId) {
          return { result: "Error: No active goal selected." };
        }
        const goalCtx = this.manager.getGoalContext(this.activeGoalId);
        if (!goalCtx) {
          return { result: "Error: Active goal not found." };
        }
        const goal = goalCtx.goal;
        const stepEl = this.renderToolStep(messagesEl, `Running assessment for "${goal.text.slice(0, 40)}${goal.text.length > 40 ? "..." : ""}"...`);
        const assessment = await this.agent.assessSignals(goal.id, dateStr, this.lastObservedSignals);
        this.completeToolStep(stepEl, `Score: ${assessment.overallScore}/100`);
        await this.createCheckInNote(assessment, goal, this.lastObservedSignals);
        this.renderCheckInLink(messagesEl, assessment, goal);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        const result = `Goal "${goal.text.slice(0, 50)}": ${assessment.overallScore}/100 (Day ${assessment.dayNumber}). Drift: ${assessment.driftIndicators.join("; ") || "None"}. Momentum: ${assessment.momentumIndicators.join("; ") || "None"}.`;
        return { result, assessments: [assessment] };
      }
      case "save_conversation_summary": {
        const dateStr = toolInput.date || this.getLocalDateStr();
        const summary = toolInput.summary;
        const overwrite = toolInput.overwrite;
        if (!summary) {
          return { result: "Error: No summary content provided." };
        }
        const activeGoalForFolder = this.activeGoalId ? (_b = this.manager.getGoalContext(this.activeGoalId)) == null ? void 0 : _b.goal : null;
        const folderPath = (activeGoalForFolder == null ? void 0 : activeGoalForFolder.checkInFolder) || "PromiseLand/check-ins";
        const activeGoalCtx = this.activeGoalId ? this.manager.getGoalContext(this.activeGoalId) : null;
        const goalSuffix = activeGoalCtx && this.manager.getGoals().length > 1 ? ` \u2014 ${activeGoalCtx.goal.text.slice(0, 40).replace(/[\\/:*?"<>|]/g, "").trim()}` : "";
        const filePath = `${folderPath}/Promise Land Check-in \u2014 ${dateStr}${goalSuffix}.md`;
        const existingFile = this.app.vault.getAbstractFileByPath(filePath);
        if (existingFile && !overwrite) {
          const currentContent = await this.app.vault.read(existingFile);
          const marker = "## Conversation Notes";
          const markerIdx = currentContent.indexOf(marker);
          if (markerIdx >= 0) {
            const existingSummary = currentContent.substring(markerIdx + marker.length).trim();
            return {
              result: `EXISTING CONVERSATION NOTES FOUND for ${dateStr}:

${existingSummary}

You must merge the old notes with the new conversation insights into a single unified summary. Call save_conversation_summary again with overwrite: true and a rewritten summary that incorporates BOTH the previous notes and the current conversation.`
            };
          }
        }
        const stepEl = this.renderToolStep(messagesEl, "Saving conversation notes...");
        const summaryBlock = `

---

## Conversation Notes

${summary}
`;
        if (existingFile) {
          const currentContent = await this.app.vault.read(existingFile);
          const marker = "## Conversation Notes";
          const markerIdx = currentContent.indexOf(marker);
          if (markerIdx >= 0) {
            const beforeMarker = currentContent.lastIndexOf("---", markerIdx);
            const trimPoint = beforeMarker >= 0 ? beforeMarker : markerIdx;
            const updated = currentContent.substring(0, trimPoint).trimEnd() + summaryBlock;
            await this.app.vault.modify(existingFile, updated);
          } else {
            await this.app.vault.modify(existingFile, currentContent.trimEnd() + summaryBlock);
          }
          this.completeToolStep(stepEl, "Updated check-in note with conversation notes");
        } else {
          if (!this.app.vault.getAbstractFileByPath(folderPath)) {
            await this.app.vault.createFolder(folderPath);
          }
          const goalText = activeGoalCtx ? activeGoalCtx.goal.text : "No goal set";
          const content = `**Goal:** ${goalText}
${summaryBlock}`;
          await this.app.vault.create(filePath, content);
          this.completeToolStep(stepEl, "Created check-in note with conversation notes");
        }
        if (activeGoalCtx) {
          const latestAssessment = this.manager.getAssessments(activeGoalCtx.goal.id).find((a) => a.date === dateStr);
          if (latestAssessment) {
            this.renderCheckInLink(messagesEl, latestAssessment, activeGoalCtx.goal);
          }
        }
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return { result: `Conversation summary saved to check-in note for ${dateStr}.` };
      }
      case "get_assessment_history": {
        const count = toolInput.count || 5;
        if (!this.activeGoalId) {
          return { result: "No active goal selected." };
        }
        const goalCtx = this.manager.getGoalContext(this.activeGoalId);
        if (!goalCtx) {
          return { result: "Active goal not found." };
        }
        const assessments = this.manager.getAssessments(this.activeGoalId);
        const recent = assessments.slice(-count);
        if (recent.length === 0) {
          return { result: `Goal "${goalCtx.goal.text.slice(0, 50)}": No assessment history.` };
        }
        const lines = recent.map(
          (a) => `  Day ${a.dayNumber} (${a.date}): ${a.overallScore}/100`
        );
        return { result: `Goal "${goalCtx.goal.text.slice(0, 50)}" (last ${recent.length}):
${lines.join("\n")}` };
      }
      default:
        return { result: `Unknown tool: ${toolName}` };
    }
  }
  // ── Agentic loop ──
  async sendTinkerMessage(text, messagesEl, textarea, sendBtn, referencedFiles = []) {
    if (!this.activeGoalId)
      return;
    const goalId = this.activeGoalId;
    this.isSending = true;
    textarea.disabled = true;
    sendBtn.disabled = true;
    sendBtn.addClass("is-disabled");
    const refMeta = referencedFiles.length > 0 ? referencedFiles.map((f) => ({ path: f.path, basename: f.basename })) : void 0;
    const userMsg = { role: "user", content: text, timestamp: Date.now(), referencedFiles: refMeta };
    await this.manager.addTinkerMessage(goalId, userMsg);
    this.appendMessageBubble(messagesEl, userMsg);
    let typingEl = this.addTypingIndicator(messagesEl);
    let producedAssessments = [];
    try {
      const systemPrompt = this.buildTinkerSystemPrompt();
      const MAX_FILE_SIZE = 50 * 1024;
      const persistedMessages = this.manager.getTinkerMessages(goalId);
      const apiMessages = [];
      for (const m of persistedMessages) {
        let content = m.content;
        if (m.role === "user" && m.referencedFiles && m.referencedFiles.length > 0) {
          const fileBlocks = [];
          for (const ref of m.referencedFiles) {
            const file = this.app.vault.getAbstractFileByPath(ref.path);
            if (file && file instanceof import_obsidian5.TFile) {
              try {
                let fileContent = await this.app.vault.cachedRead(file);
                if (fileContent.length > MAX_FILE_SIZE) {
                  fileContent = fileContent.substring(0, MAX_FILE_SIZE) + "\n... (truncated)";
                }
                fileBlocks.push(`<referenced_file path="${ref.path}">
${fileContent}
</referenced_file>`);
              } catch (e) {
                fileBlocks.push(`<referenced_file path="${ref.path}">
[Error reading file]
</referenced_file>`);
              }
            }
          }
          if (fileBlocks.length > 0) {
            content = fileBlocks.join("\n\n") + "\n\n" + content;
          }
        }
        apiMessages.push({ role: m.role, content });
      }
      let maxIterations = 10;
      while (maxIterations-- > 0) {
        const response = await this.llmClient.chatWithTools(systemPrompt, apiMessages, TOOL_DEFINITIONS);
        apiMessages.push({ role: "assistant", content: response.content });
        if (response.stop_reason === "end_turn") {
          const textParts = response.content.filter((b) => b.type === "text").map((b) => b.text);
          const finalText = textParts.join("\n").trim();
          typingEl.remove();
          if (finalText) {
            const assistantMsg = {
              role: "assistant",
              content: finalText,
              timestamp: Date.now(),
              assessmentId: producedAssessments.length > 0 ? producedAssessments[0].id : void 0
            };
            await this.manager.addTinkerMessage(goalId, assistantMsg);
            this.appendMessageBubble(messagesEl, assistantMsg);
          }
          break;
        }
        if (response.stop_reason === "tool_use") {
          typingEl.remove();
          const toolUseBlocks = response.content.filter(
            (b) => b.type === "tool_use"
          );
          const toolResults = [];
          for (const toolBlock of toolUseBlocks) {
            try {
              const { result, assessments } = await this.executeTool(
                toolBlock.name,
                toolBlock.input,
                messagesEl
              );
              if (assessments) {
                producedAssessments = assessments;
              }
              toolResults.push({
                type: "tool_result",
                tool_use_id: toolBlock.id,
                content: result
              });
            } catch (e) {
              const errorMsg = e instanceof Error ? e.message : "Unknown error";
              toolResults.push({
                type: "tool_result",
                tool_use_id: toolBlock.id,
                content: `Error: ${errorMsg}`,
                is_error: true
              });
            }
          }
          apiMessages.push({ role: "user", content: toolResults });
          typingEl = this.addTypingIndicator(messagesEl);
          continue;
        }
        typingEl.remove();
        break;
      }
    } catch (e) {
      typingEl.remove();
      const errorMsg = e instanceof Error ? e.message : "Unknown error";
      const errorEl = messagesEl.createDiv({ cls: "acta-promiseland-tinker-error" });
      errorEl.textContent = `Error: ${errorMsg}`;
    }
    messagesEl.scrollTop = messagesEl.scrollHeight;
    this.isSending = false;
    textarea.disabled = false;
    sendBtn.disabled = false;
    sendBtn.removeClass("is-disabled");
    textarea.focus();
  }
  // ── @ Mention handling ──
  handleMentionInput(textarea) {
    const cursorPos = textarea.selectionStart;
    const text = textarea.value.substring(0, cursorPos);
    let atIndex = -1;
    for (let i = text.length - 1; i >= 0; i--) {
      if (text[i] === "@") {
        if (i === 0 || /\s/.test(text[i - 1])) {
          atIndex = i;
        }
        break;
      }
      if (text[i] === "\n")
        break;
    }
    if (atIndex === -1) {
      this.closeMentionDropdown();
      return;
    }
    this.mentionStartIndex = atIndex;
    this.mentionQuery = text.substring(atIndex + 1);
    this.showMentionDropdown(textarea);
  }
  showMentionDropdown(textarea) {
    if (!this.mentionDropdownEl)
      return;
    const query = this.mentionQuery.toLowerCase();
    const allFiles = this.app.vault.getMarkdownFiles();
    const referencedPaths = new Set(this.referencedFiles.map((f) => f.path));
    this.mentionFilteredFiles = allFiles.filter((f) => !referencedPaths.has(f.path)).filter((f) => {
      if (!query)
        return true;
      return f.basename.toLowerCase().includes(query) || f.path.toLowerCase().includes(query);
    }).slice(0, 10);
    if (this.mentionFilteredFiles.length === 0) {
      this.closeMentionDropdown();
      return;
    }
    this.mentionSelectedIndex = 0;
    this.mentionDropdownEl.empty();
    this.mentionDropdownEl.style.display = "block";
    for (let i = 0; i < this.mentionFilteredFiles.length; i++) {
      const file = this.mentionFilteredFiles[i];
      const item = this.mentionDropdownEl.createDiv({
        cls: `acta-promiseland-mention-item${i === 0 ? " is-selected" : ""}`
      });
      item.createSpan({ cls: "acta-promiseland-mention-name", text: file.basename });
      const folder = file.path.substring(0, file.path.length - file.name.length - 1);
      if (folder) {
        item.createSpan({ cls: "acta-promiseland-mention-path", text: folder });
      }
      item.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.mentionSelectedIndex = i;
        this.selectMentionItem(textarea);
      });
    }
  }
  navigateMention(direction) {
    if (this.mentionFilteredFiles.length === 0)
      return;
    this.mentionSelectedIndex = (this.mentionSelectedIndex + direction + this.mentionFilteredFiles.length) % this.mentionFilteredFiles.length;
    this.updateMentionSelection();
  }
  updateMentionSelection() {
    if (!this.mentionDropdownEl)
      return;
    const items = this.mentionDropdownEl.querySelectorAll(".acta-promiseland-mention-item");
    items.forEach((el, i) => {
      if (i === this.mentionSelectedIndex) {
        el.addClass("is-selected");
        el.scrollIntoView({ block: "nearest" });
      } else {
        el.removeClass("is-selected");
      }
    });
  }
  selectMentionItem(textarea) {
    const file = this.mentionFilteredFiles[this.mentionSelectedIndex];
    if (!file)
      return;
    this.referencedFiles.push(file);
    this.updateFileChips();
    const before = textarea.value.substring(0, this.mentionStartIndex);
    const after = textarea.value.substring(textarea.selectionStart);
    textarea.value = before + after;
    textarea.selectionStart = textarea.selectionEnd = before.length;
    this.closeMentionDropdown();
    textarea.focus();
  }
  closeMentionDropdown() {
    if (this.mentionDropdownEl) {
      this.mentionDropdownEl.style.display = "none";
      this.mentionDropdownEl.empty();
    }
    this.mentionQuery = "";
    this.mentionStartIndex = -1;
    this.mentionSelectedIndex = 0;
    this.mentionFilteredFiles = [];
  }
  updateFileChips() {
    if (!this.fileChipsEl)
      return;
    this.fileChipsEl.empty();
    if (this.referencedFiles.length === 0) {
      this.fileChipsEl.style.display = "none";
      return;
    }
    this.fileChipsEl.style.display = "flex";
    for (let i = 0; i < this.referencedFiles.length; i++) {
      const file = this.referencedFiles[i];
      const chip = this.fileChipsEl.createDiv({ cls: "acta-promiseland-file-chip" });
      chip.createSpan({ text: file.basename });
      const removeBtn = chip.createSpan({ cls: "acta-promiseland-file-chip-remove", text: "\xD7" });
      removeBtn.addEventListener("click", () => {
        this.referencedFiles.splice(i, 1);
        this.updateFileChips();
      });
    }
  }
  buildTinkerSystemPrompt() {
    if (!this.activeGoalId)
      return "No active goals.";
    const goalCtx = this.manager.getGoalContext(this.activeGoalId);
    if (!goalCtx)
      return "No active goals.";
    const goal = goalCtx.goal;
    const dayNumber = this.manager.getDayNumber(goal.id);
    const daysLeft = this.manager.getDaysLeft(goal.id);
    const latest = this.manager.getLatestAssessment(goal.id);
    let assessmentBlock = "No assessment yet.";
    if (latest) {
      const breakdownLines = latest.signalBreakdown.map(
        (s) => `- ${this.formatCategoryName(s.category)}: ${Math.round(s.score)}/${Math.round(s.maxScore)}`
      ).join("\n");
      assessmentBlock = `Score: ${latest.overallScore}/100 (Day ${latest.dayNumber}, ${latest.date})
Signal Breakdown:
${breakdownLines}`;
    }
    const contextBlock = goal.context ? `
Reference Context:
${goal.context}
` : "";
    const goalBlock = `### Goal: "${goal.text}"
Day ${dayNumber} of ${goal.timeWindowDays} | ${daysLeft}d left
${contextBlock}
Latest Assessment:
${assessmentBlock}`;
    return `You are Tinker, a goal-alignment coach embedded in Promise Land. This conversation is scoped to a single goal.

## Your Role
- Challenge assumptions, surface patterns, pressure-test decisions
- Be direct and specific \u2014 reference actual tasks, scores, and signals
- Push back when the user rationalizes drift
- You are NOT a general-purpose assistant. Stay focused on the goal.

## Coaching Philosophy: Deep Focus, Not Task Pile-On
The user is a deep focus builder, NOT a parallel worker. Their best output comes from sustained, concentrated effort on ONE thing at a time (e.g. SofaGenius: 7 hours all-in, extremely high quality output).

NEVER suggest multiple parallel workstreams in a single day. NEVER suggest jumping to a different task tomorrow when the current work is still in progress.

The right move is almost always: **go deeper on what you're already doing.** If the user launched a training run today, tomorrow should be evaluating that run, iterating on it, improving it \u2014 NOT switching to writing a narrative or doing something else. Results and narrative come naturally from deep, sustained work. Suggest the next depth-step on the current workstream, not the next item on a task list.

Bad: "Today you should work on MOE training, write the Terminal Bench narrative, and make an open source PR"
Bad: "Today: all-in on MOE training. Tomorrow: Terminal Bench narrative. Day after: open source PR." (This is task-hopping disguised as sequencing)
Good: "You launched the training run today. Tomorrow: check if the loss is converging, run inference on the first checkpoint, evaluate quality. Go deeper before moving on."

Only suggest switching to a different workstream when the current one has reached a natural stopping point with solid results.

If the user has a full-time job, be realistic about bandwidth. One meaningful deep-work session per day outside of work is already excellent.

## Tools Available
When the user asks for a "check-in", "how am I doing", "run a cycle", or similar:
1. First call get_today_date \u2014 if the user says "yesterday", pass date="yesterday". If they say a specific date, pass that date. If they just say "check in", omit the date (defaults to today).
2. The tool returns the resolved date (e.g. "2026-02-15"). Use THIS date for ALL subsequent tool calls.
3. Call observe_signals with that EXACT date
4. Call run_assessment with that EXACT date
5. Provide your commentary and coaching

CRITICAL: When the user says "check in for yesterday", you MUST pass date="yesterday" to get_today_date. Do NOT use today's date. The returned date from get_today_date is the one you use for observe_signals and run_assessment. Never default to today when the user explicitly asked for a different date.

## Late & Retroactive Check-ins
- If the user asks to check in for yesterday, or it's past midnight and they're reflecting on the day that just ended: ALLOW IT. Better late than never.
- When doing a retroactive check-in, give a brief, warm reminder like: "Let's do the check-in for yesterday \u2014 but let's try to be more punctual next time so we capture things while they're fresh."
- Do NOT refuse or lecture. Just gently note it and proceed.
- If it's past midnight (the get_today_date tool will tell you), proactively ask whether they want to check in for yesterday or today.

Use get_assessment_history when the user asks about trends or progress over time.

When the user asks to "summarize", "save notes", "capture takeaways", or similar:
1. Call get_today_date first if you haven't already
2. Call save_conversation_summary with a markdown summary of the conversation \u2014 include key insights, action items, and decisions
3. The summary will be appended to that day's check-in note

IMPORTANT for save_conversation_summary:
- Write the summary in the SAME language(s) the conversation used. If the user spoke in Chinese, summarize in Chinese. If mixed (e.g. Chinese + English), keep that mix. Preserve the original voice and expressions \u2014 do not translate.
- Do NOT include a title/heading in the summary \u2014 the "## Conversation Notes" heading is added automatically. Start directly with the content (e.g. bullet points, sections with ### subheadings).

Do NOT call tools unless the conversation warrants it. For regular coaching questions, just respond with text.

## Current Goal
${goalBlock}

## Assessment Signals (IMPORTANT)
The system collects evidence from vault activity (git diffs showing actual file changes), conversation context, and optionally priority actions and ship items. Assess based on ALL evidence. Do NOT penalize for missing priority actions or empty structured sections \u2014 some days people just work without planning.

Deep work includes any sustained focused work: coding, reading papers, research, studying, designing, writing \u2014 not just "development". If a priority task has a time annotation (like @10PM-1AM), that's a deep work session.

## After Check-ins: Tone and Approach
When presenting check-in results:
- **Lead with what was accomplished today.** Acknowledge the work before anything else.
- **Do NOT lecture or moralize.** No "honest take" editorials, no "but you still need to..." piling on.
- **Do NOT reference previous days' failures.** Each check-in is about TODAY. Don't bring up past missed days, past distractions, or "accumulated debt."
- **Do NOT list all the things the user hasn't started yet.** They're sequencing tasks deliberately \u2014 one thing per day. Listing untouched workstreams feels like a guilt trip.
- **Keep it short.** Score + what was done + one suggestion for going deeper on the current work. That's it. Do NOT suggest switching to a different task unless the current workstream has reached a clear stopping point.
- **Help reflect:** Proactively offer 1-2 reflection points based on today's work, or ask "Anything you want to reflect on?" Make reflection easy, not punitive.

## What Tinker never does
- No file/vault operations
- No general Q&A unrelated to the goal
- No flattery or empty encouragement
- No lecturing, moralizing, or "honest take" sermons
- No referencing past days' failures in today's check-in`;
  }
};

// src/settings.ts
var import_obsidian6 = require("obsidian");
var ActaTaskSettingTab = class extends import_obsidian6.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "PromiseLand Settings" });
    containerEl.createEl("p", {
      text: "Tasks with inline hashtags (e.g. - [ ] #people do something) are automatically tracked on the board.",
      cls: "setting-item-description"
    });
    new import_obsidian6.Setting(containerEl).setName("Excluded tags").setDesc(
      "Comma-separated list of tags to exclude (e.g. #daily, #template)"
    ).addText(
      (text) => text.setPlaceholder("#daily, #template").setValue(this.plugin.settings.excludedTags.join(", ")).onChange(async (value) => {
        this.plugin.settings.excludedTags = value.split(",").map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0).map((t) => t.startsWith("#") ? t : "#" + t);
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName("Excluded folders").setDesc(
      "Comma-separated list of folders to exclude (e.g. templates, archive)"
    ).addText(
      (text) => text.setPlaceholder("templates, archive").setValue(this.plugin.settings.excludedFolders.join(", ")).onChange(async (value) => {
        this.plugin.settings.excludedFolders = value.split(",").map((f) => f.trim()).filter((f) => f.length > 0);
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName("Show completed tasks").setDesc("Display completed tasks in the board").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.showCompleted).onChange(async (value) => {
        this.plugin.settings.showCompleted = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName("Show source note").setDesc("Display the source note name next to each task").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.showSourceNote).onChange(async (value) => {
        this.plugin.settings.showSourceNote = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName("Topic sort order").setDesc("How to sort topic sections").addDropdown(
      (dropdown) => dropdown.addOption("alphabetical", "Alphabetical").addOption("taskCount", "Task count (most first)").setValue(this.plugin.settings.topicSortOrder).onChange(async (value) => {
        this.plugin.settings.topicSortOrder = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName("Task sort order").setDesc("How to sort tasks within a topic").addDropdown(
      (dropdown) => dropdown.addOption("incompleteFirst", "Incomplete first").addOption("byFile", "By file").setValue(this.plugin.settings.taskSortOrder).onChange(async (value) => {
        this.plugin.settings.taskSortOrder = value;
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("h2", { text: "Promise Land" });
    new import_obsidian6.Setting(containerEl).setName("Anthropic API key").setDesc("Required for Promise Land alignment assessments").addText(
      (text) => text.setPlaceholder("sk-ant-...").setValue(this.plugin.settings.anthropicApiKey).then((t) => {
        t.inputEl.type = "password";
      }).onChange(async (value) => {
        this.plugin.settings.anthropicApiKey = value.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName("Model").setDesc("Claude model for assessments").addDropdown(
      (dropdown) => dropdown.addOption("claude-sonnet-4-20250514", "Claude Sonnet 4").addOption("claude-haiku-4-5-20251001", "Claude Haiku 4.5").addOption("claude-opus-4-6", "Claude Opus 4.6").setValue(this.plugin.settings.promiseLandModel).onChange(async (value) => {
        this.plugin.settings.promiseLandModel = value;
        await this.plugin.saveSettings();
      })
    );
  }
};

// src/taskManager.ts
var import_obsidian7 = require("obsidian");
var TASK_REGEX_BASE = /^[\s]*[-*]\s+\[([ xX])\]\s*/;
var INLINE_TAG_REGEX = /#[\w\-\/]+/g;
var TaskManager = class {
  constructor(app, settings, data, saveData) {
    this.app = app;
    this.settings = settings;
    this.data = data;
    this.saveData = saveData;
  }
  updateSettings(settings) {
    this.settings = settings;
  }
  updateData(data) {
    this.data = data;
  }
  /**
   * Check if a line contains a task with inline hashtag
   */
  hasInlineTag(line) {
    const match = line.match(TASK_REGEX_BASE);
    if (!match)
      return false;
    const textAfterCheckbox = line.substring(match[0].length);
    return INLINE_TAG_REGEX.test(textAfterCheckbox);
  }
  /**
   * Extract inline tags from task text
   */
  extractInlineTags(text) {
    const matches = text.match(INLINE_TAG_REGEX);
    return matches ? matches.map((tag) => tag.toLowerCase()) : [];
  }
  /**
   * Parse task from line (returns null if not a valid task with inline tag)
   */
  parseTaskFromLine(line, lineNumber, file) {
    const match = line.match(TASK_REGEX_BASE);
    if (!match)
      return null;
    const textAfterCheckbox = line.substring(match[0].length).trim();
    const inlineTags = this.extractInlineTags(textAfterCheckbox);
    if (inlineTags.length === 0)
      return null;
    const completed = match[1].toLowerCase() === "x";
    const displayText = textAfterCheckbox.replace(INLINE_TAG_REGEX, "").trim();
    return {
      id: `${file.path}:${lineNumber}`,
      text: displayText,
      completed,
      filePath: file.path,
      fileName: file.basename,
      line: lineNumber,
      tags: inlineTags,
      addedAt: Date.now()
    };
  }
  /**
   * Add task to board (with confirmation)
   */
  async addTask(task) {
    if (this.data.addedTasks[task.id]) {
      new import_obsidian7.Notice("Task is already on the board");
      return false;
    }
    this.data.addedTasks[task.id] = task;
    await this.saveData();
    new import_obsidian7.Notice("Task added to board");
    return true;
  }
  /**
   * Add task silently (no notice)
   */
  async addTaskSilently(task) {
    if (this.data.addedTasks[task.id]) {
      return false;
    }
    this.data.addedTasks[task.id] = task;
    await this.saveData();
    return true;
  }
  /**
   * Remove task from board
   */
  async removeTask(taskId) {
    if (!this.data.addedTasks[taskId])
      return;
    delete this.data.addedTasks[taskId];
    await this.saveData();
    new import_obsidian7.Notice("Task removed from board");
  }
  /**
   * Check if task is already added
   */
  isTaskAdded(taskId) {
    return !!this.data.addedTasks[taskId];
  }
  /**
   * Get all added tasks (synced with current file state)
   */
  async getAddedTasks() {
    const tasks = [];
    const toRemove = [];
    for (const [taskId, task] of Object.entries(this.data.addedTasks)) {
      const file = this.app.vault.getAbstractFileByPath(task.filePath);
      if (!(file instanceof import_obsidian7.TFile)) {
        toRemove.push(taskId);
        continue;
      }
      const content = await this.app.vault.cachedRead(file);
      const lines = content.split("\n");
      if (task.line >= lines.length) {
        toRemove.push(taskId);
        continue;
      }
      const line = lines[task.line];
      if (!this.hasInlineTag(line)) {
        toRemove.push(taskId);
        continue;
      }
      const updatedTask = this.parseTaskFromLine(line, task.line, file);
      if (updatedTask) {
        updatedTask.addedAt = task.addedAt;
        tasks.push(updatedTask);
      } else {
        toRemove.push(taskId);
      }
    }
    if (toRemove.length > 0) {
      for (const id of toRemove) {
        delete this.data.addedTasks[id];
      }
      await this.saveData();
    }
    return tasks;
  }
  /**
   * Get task at cursor position (if it has inline tag)
   */
  async getTaskAtPosition(file, line) {
    const content = await this.app.vault.cachedRead(file);
    const lines = content.split("\n");
    if (line >= lines.length)
      return null;
    return this.parseTaskFromLine(lines[line], line, file);
  }
};

// src/taskScanner.ts
var TaskScanner = class {
  constructor(app, taskManager, settings) {
    this.app = app;
    this.taskManager = taskManager;
    this.settings = settings;
  }
  updateSettings(settings) {
    this.settings = settings;
    this.taskManager.updateSettings(settings);
  }
  async scanBoard() {
    await this.autoAddMarkedTasks();
    const tasks = await this.taskManager.getAddedTasks();
    return this.buildTopicGroups(tasks);
  }
  async autoAddMarkedTasks() {
    const files = this.app.vault.getMarkdownFiles();
    for (const file of files) {
      const content = await this.app.vault.cachedRead(file);
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!this.taskManager.hasInlineTag(line))
          continue;
        const taskId = `${file.path}:${i}`;
        if (this.taskManager.isTaskAdded(taskId))
          continue;
        const task = this.taskManager.parseTaskFromLine(line, i, file);
        if (task) {
          await this.taskManager.addTaskSilently(task);
        }
      }
    }
  }
  buildTopicGroups(tasks) {
    const tagTaskMap = /* @__PURE__ */ new Map();
    for (const task of tasks) {
      for (const tag of task.tags) {
        const normalizedTag = tag.toLowerCase();
        if (this.settings.excludedTags.includes(normalizedTag))
          continue;
        if (!tagTaskMap.has(normalizedTag)) {
          tagTaskMap.set(normalizedTag, []);
        }
        tagTaskMap.get(normalizedTag).push(task);
      }
    }
    const groups = [];
    for (const [tag, tasks2] of tagTaskMap) {
      const sortedTasks = this.sortTasks(tasks2);
      groups.push({
        tag,
        displayTag: tag.replace(/^#/, ""),
        tasks: sortedTasks,
        completedCount: sortedTasks.filter((t) => t.completed).length,
        totalCount: sortedTasks.length
      });
    }
    return this.sortTopics(groups);
  }
  sortTasks(tasks) {
    if (this.settings.taskSortOrder === "incompleteFirst") {
      return tasks.sort((a, b) => {
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        return a.addedAt - b.addedAt;
      });
    }
    return tasks.sort(
      (a, b) => a.filePath.localeCompare(b.filePath) || a.line - b.line
    );
  }
  sortTopics(groups) {
    if (this.settings.topicSortOrder === "taskCount") {
      return groups.sort((a, b) => b.totalCount - a.totalCount);
    }
    return groups.sort(
      (a, b) => a.displayTag.localeCompare(b.displayTag)
    );
  }
};

// src/taskToggler.ts
var import_obsidian8 = require("obsidian");
var CHECKBOX_REGEX = /^([\s]*[-*]\s+\[)([ xX])(\]\s*.*)/;
var TaskToggler = class {
  constructor(app) {
    this.app = app;
  }
  async toggleTask(task) {
    const file = this.app.vault.getAbstractFileByPath(task.filePath);
    if (!(file instanceof import_obsidian8.TFile))
      return false;
    const content = await this.app.vault.read(file);
    const lines = content.split("\n");
    if (task.line < 0 || task.line >= lines.length)
      return false;
    const line = lines[task.line];
    const match = line.match(CHECKBOX_REGEX);
    if (!match)
      return false;
    const currentState = match[2].toLowerCase();
    const newState = currentState === "x" ? " " : "x";
    lines[task.line] = match[1] + newState + match[3];
    await this.app.vault.modify(file, lines.join("\n"));
    return true;
  }
};

// src/feedbackManager.ts
var import_obsidian9 = require("obsidian");
var TAG_REGEX = /#[\w\-\/\u4e00-\u9fa5❤️]+/g;
var FeedbackManager = class {
  constructor(app, settings, data, saveData) {
    this.app = app;
    this.settings = settings;
    this.data = data;
    this.saveData = saveData;
  }
  updateSettings(settings) {
    this.settings = settings;
  }
  updateData(data) {
    this.data = data;
  }
  /**
   * Extract all tags from text
   */
  extractTags(text) {
    const matches = text.match(TAG_REGEX);
    return matches ? matches.map((tag) => tag.toLowerCase()) : [];
  }
  /**
   * Check if a line has the feedback trigger tag
   */
  hasFeedbackTag(line) {
    const tags = this.extractTags(line);
    return FEEDBACK_TRIGGER_TAGS.some(
      (triggerTag) => tags.includes(triggerTag.toLowerCase())
    );
  }
  /**
   * Check if a line is a list item (- or * prefix)
   */
  isListItem(line) {
    return /^[\s]*[-*]\s+/.test(line);
  }
  /**
   * Parse feedback item from a line
   */
  parseFeedbackFromLine(line, lineNumber, file) {
    if (!this.isListItem(line)) {
      return null;
    }
    if (!this.hasFeedbackTag(line)) {
      return null;
    }
    const allTags = this.extractTags(line);
    const topicTags = allTags.filter((tag) => {
      const isTriggerTag = FEEDBACK_TRIGGER_TAGS.some(
        (triggerTag) => tag === triggerTag.toLowerCase()
      );
      return !isTriggerTag && !this.settings.excludedTags.includes(tag);
    });
    const displayText = line.replace(/^[\s]*[-*]\s+/, "").replace(TAG_REGEX, "").trim();
    return {
      id: `${file.path}:${lineNumber}`,
      text: displayText,
      filePath: file.path,
      fileName: file.basename,
      line: lineNumber,
      tags: topicTags,
      addedAt: Date.now()
    };
  }
  /**
   * Get feedback item at a specific line
   */
  async getFeedbackAtPosition(file, line) {
    const content = await this.app.vault.cachedRead(file);
    const lines = content.split("\n");
    if (line >= lines.length)
      return null;
    return this.parseFeedbackFromLine(lines[line], line, file);
  }
  /**
   * Add feedback item silently (no notice)
   */
  async addFeedbackSilently(item) {
    if (this.data.addedFeedback[item.id]) {
      return false;
    }
    this.data.addedFeedback[item.id] = item;
    await this.saveData();
    return true;
  }
  /**
   * Remove feedback item from board
   */
  async removeFeedback(itemId) {
    if (!this.data.addedFeedback[itemId])
      return;
    delete this.data.addedFeedback[itemId];
    await this.saveData();
    new import_obsidian9.Notice("Feedback removed from board");
  }
  /**
   * Check if feedback is already added
   */
  isFeedbackAdded(itemId) {
    return !!this.data.addedFeedback[itemId];
  }
  /**
   * Get all added feedback items (synced with current file state)
   */
  async getAddedFeedback() {
    const items = [];
    const toRemove = [];
    for (const [itemId, item] of Object.entries(this.data.addedFeedback)) {
      const file = this.app.vault.getAbstractFileByPath(item.filePath);
      if (!(file instanceof import_obsidian9.TFile)) {
        toRemove.push(itemId);
        continue;
      }
      const content = await this.app.vault.cachedRead(file);
      const lines = content.split("\n");
      if (item.line >= lines.length) {
        toRemove.push(itemId);
        continue;
      }
      const line = lines[item.line];
      if (!this.hasFeedbackTag(line)) {
        toRemove.push(itemId);
        continue;
      }
      const updatedItem = this.parseFeedbackFromLine(
        line,
        item.line,
        file
      );
      if (updatedItem) {
        updatedItem.addedAt = item.addedAt;
        items.push(updatedItem);
      } else {
        toRemove.push(itemId);
      }
    }
    if (toRemove.length > 0) {
      for (const id of toRemove) {
        delete this.data.addedFeedback[id];
      }
      await this.saveData();
    }
    return items;
  }
};

// src/feedbackScanner.ts
var FeedbackScanner = class {
  constructor(app, feedbackManager, settings) {
    this.app = app;
    this.feedbackManager = feedbackManager;
    this.settings = settings;
  }
  updateSettings(settings) {
    this.settings = settings;
    this.feedbackManager.updateSettings(settings);
  }
  async scanBoard() {
    await this.autoAddMarkedNotes();
    const items = await this.feedbackManager.getAddedFeedback();
    return this.buildTopicGroups(items);
  }
  async autoAddMarkedNotes() {
    const files = this.app.vault.getMarkdownFiles();
    for (const file of files) {
      const isExcluded = this.settings.excludedFolders.some(
        (folder) => file.path.startsWith(folder)
      );
      if (isExcluded)
        continue;
      const content = await this.app.vault.cachedRead(file);
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!this.feedbackManager.hasFeedbackTag(line))
          continue;
        const itemId = `${file.path}:${i}`;
        if (this.feedbackManager.isFeedbackAdded(itemId))
          continue;
        const item = this.feedbackManager.parseFeedbackFromLine(
          line,
          i,
          file
        );
        if (item) {
          await this.feedbackManager.addFeedbackSilently(item);
        }
      }
    }
  }
  buildTopicGroups(items) {
    const tagItemMap = /* @__PURE__ */ new Map();
    for (const item of items) {
      if (item.tags.length === 0) {
        const untaggedKey = "#\u672A\u5206\u7C7B";
        if (!tagItemMap.has(untaggedKey)) {
          tagItemMap.set(untaggedKey, []);
        }
        tagItemMap.get(untaggedKey).push(item);
      } else {
        for (const tag of item.tags) {
          const normalizedTag = tag.toLowerCase();
          if (this.settings.excludedTags.includes(normalizedTag))
            continue;
          if (!tagItemMap.has(normalizedTag)) {
            tagItemMap.set(normalizedTag, []);
          }
          tagItemMap.get(normalizedTag).push(item);
        }
      }
    }
    const groups = [];
    for (const [tag, items2] of tagItemMap) {
      const sortedItems = this.sortItems(items2);
      groups.push({
        tag,
        displayTag: tag.replace(/^#/, ""),
        items: sortedItems,
        totalCount: sortedItems.length
      });
    }
    return this.sortTopics(groups);
  }
  sortItems(items) {
    return items.sort((a, b) => b.addedAt - a.addedAt);
  }
  sortTopics(groups) {
    if (this.settings.topicSortOrder === "taskCount") {
      return groups.sort((a, b) => b.totalCount - a.totalCount);
    }
    return groups.sort(
      (a, b) => a.displayTag.localeCompare(b.displayTag)
    );
  }
};

// src/negativeFeedbackManager.ts
var import_obsidian10 = require("obsidian");
var TAG_REGEX2 = /#[\w\-\/\u4e00-\u9fa5😒]+/g;
var NegativeFeedbackManager = class {
  constructor(app, settings, data, saveData) {
    this.app = app;
    this.settings = settings;
    this.data = data;
    this.saveData = saveData;
  }
  updateSettings(settings) {
    this.settings = settings;
  }
  updateData(data) {
    this.data = data;
  }
  /**
   * Extract all tags from text
   */
  extractTags(text) {
    const matches = text.match(TAG_REGEX2);
    return matches ? matches.map((tag) => tag.toLowerCase()) : [];
  }
  /**
   * Check if a line has the negative feedback trigger tag
   */
  hasNegativeFeedbackTag(line) {
    const tags = this.extractTags(line);
    return NEGATIVE_FEEDBACK_TRIGGER_TAGS.some(
      (triggerTag) => tags.includes(triggerTag.toLowerCase())
    );
  }
  /**
   * Check if a line is a list item (- or * prefix)
   */
  isListItem(line) {
    return /^[\s]*[-*]\s+/.test(line);
  }
  /**
   * Parse feedback item from a line
   */
  parseFeedbackFromLine(line, lineNumber, file) {
    if (!this.isListItem(line)) {
      return null;
    }
    if (!this.hasNegativeFeedbackTag(line)) {
      return null;
    }
    const allTags = this.extractTags(line);
    const topicTags = allTags.filter((tag) => {
      const isTriggerTag = NEGATIVE_FEEDBACK_TRIGGER_TAGS.some(
        (triggerTag) => tag === triggerTag.toLowerCase()
      );
      return !isTriggerTag && !this.settings.excludedTags.includes(tag);
    });
    const displayText = line.replace(/^[\s]*[-*]\s+/, "").replace(TAG_REGEX2, "").trim();
    return {
      id: `${file.path}:${lineNumber}`,
      text: displayText,
      filePath: file.path,
      fileName: file.basename,
      line: lineNumber,
      tags: topicTags,
      addedAt: Date.now()
    };
  }
  /**
   * Get feedback item at a specific line
   */
  async getFeedbackAtPosition(file, line) {
    const content = await this.app.vault.cachedRead(file);
    const lines = content.split("\n");
    if (line >= lines.length)
      return null;
    return this.parseFeedbackFromLine(lines[line], line, file);
  }
  /**
   * Add feedback item silently (no notice)
   */
  async addFeedbackSilently(item) {
    if (this.data.addedNegativeFeedback[item.id]) {
      return false;
    }
    this.data.addedNegativeFeedback[item.id] = item;
    await this.saveData();
    return true;
  }
  /**
   * Remove feedback item from board
   */
  async removeFeedback(itemId) {
    if (!this.data.addedNegativeFeedback[itemId])
      return;
    delete this.data.addedNegativeFeedback[itemId];
    await this.saveData();
    new import_obsidian10.Notice("Negative feedback removed from board");
  }
  /**
   * Check if feedback is already added
   */
  isFeedbackAdded(itemId) {
    return !!this.data.addedNegativeFeedback[itemId];
  }
  /**
   * Get all added feedback items (synced with current file state)
   */
  async getAddedFeedback() {
    const items = [];
    const toRemove = [];
    for (const [itemId, item] of Object.entries(this.data.addedNegativeFeedback)) {
      const file = this.app.vault.getAbstractFileByPath(item.filePath);
      if (!(file instanceof import_obsidian10.TFile)) {
        toRemove.push(itemId);
        continue;
      }
      const content = await this.app.vault.cachedRead(file);
      const lines = content.split("\n");
      if (item.line >= lines.length) {
        toRemove.push(itemId);
        continue;
      }
      const line = lines[item.line];
      if (!this.hasNegativeFeedbackTag(line)) {
        toRemove.push(itemId);
        continue;
      }
      const updatedItem = this.parseFeedbackFromLine(
        line,
        item.line,
        file
      );
      if (updatedItem) {
        updatedItem.addedAt = item.addedAt;
        items.push(updatedItem);
      } else {
        toRemove.push(itemId);
      }
    }
    if (toRemove.length > 0) {
      for (const id of toRemove) {
        delete this.data.addedNegativeFeedback[id];
      }
      await this.saveData();
    }
    return items;
  }
};

// src/negativeFeedbackScanner.ts
var NegativeFeedbackScanner = class {
  constructor(app, negativeFeedbackManager, settings) {
    this.app = app;
    this.negativeFeedbackManager = negativeFeedbackManager;
    this.settings = settings;
  }
  updateSettings(settings) {
    this.settings = settings;
    this.negativeFeedbackManager.updateSettings(settings);
  }
  async scanBoard() {
    await this.autoAddMarkedNotes();
    const items = await this.negativeFeedbackManager.getAddedFeedback();
    return this.buildTopicGroups(items);
  }
  async autoAddMarkedNotes() {
    const files = this.app.vault.getMarkdownFiles();
    for (const file of files) {
      const isExcluded = this.settings.excludedFolders.some(
        (folder) => file.path.startsWith(folder)
      );
      if (isExcluded)
        continue;
      const content = await this.app.vault.cachedRead(file);
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!this.negativeFeedbackManager.hasNegativeFeedbackTag(line))
          continue;
        const itemId = `${file.path}:${i}`;
        if (this.negativeFeedbackManager.isFeedbackAdded(itemId))
          continue;
        const item = this.negativeFeedbackManager.parseFeedbackFromLine(
          line,
          i,
          file
        );
        if (item) {
          await this.negativeFeedbackManager.addFeedbackSilently(item);
        }
      }
    }
  }
  buildTopicGroups(items) {
    const tagItemMap = /* @__PURE__ */ new Map();
    for (const item of items) {
      if (item.tags.length === 0) {
        const untaggedKey = "#\u672A\u5206\u7C7B";
        if (!tagItemMap.has(untaggedKey)) {
          tagItemMap.set(untaggedKey, []);
        }
        tagItemMap.get(untaggedKey).push(item);
      } else {
        for (const tag of item.tags) {
          const normalizedTag = tag.toLowerCase();
          if (this.settings.excludedTags.includes(normalizedTag))
            continue;
          if (!tagItemMap.has(normalizedTag)) {
            tagItemMap.set(normalizedTag, []);
          }
          tagItemMap.get(normalizedTag).push(item);
        }
      }
    }
    const groups = [];
    for (const [tag, items2] of tagItemMap) {
      const sortedItems = this.sortItems(items2);
      groups.push({
        tag,
        displayTag: tag.replace(/^#/, ""),
        items: sortedItems,
        totalCount: sortedItems.length
      });
    }
    return this.sortTopics(groups);
  }
  sortItems(items) {
    return items.sort((a, b) => b.addedAt - a.addedAt);
  }
  sortTopics(groups) {
    if (this.settings.topicSortOrder === "taskCount") {
      return groups.sort((a, b) => b.totalCount - a.totalCount);
    }
    return groups.sort(
      (a, b) => a.displayTag.localeCompare(b.displayTag)
    );
  }
};

// src/promiseLandTypes.ts
var DEFAULT_SIGNAL_WEIGHTS = {
  build: 0.65,
  ship: 0.35
};
var DEFAULT_POLICY = {
  signalWeights: { ...DEFAULT_SIGNAL_WEIGHTS },
  checkInPrompts: [],
  milestones: [],
  version: 1
};
var DEFAULT_PROMISELAND_DATA = {
  goalContexts: [],
  archivedGoals: []
};
var TIME_ANNOTATION_REGEX = /@(\d{1,2}(?::?\d{2})?)\s*(?:AM|PM|am|pm)?\s*[-–]\s*(\d{1,2}(?::?\d{2})?)\s*(?:AM|PM|am|pm)?/;

// src/promiseLandManager.ts
var MAX_GOALS = 2;
var PromiseLandManager = class {
  constructor(app, settings, data, saveData) {
    this.app = app;
    this.settings = settings;
    this.data = data;
    this.saveData = saveData;
    this.migrateTinkerMessages();
  }
  updateSettings(settings) {
    this.settings = settings;
  }
  updateData(data) {
    this.data = data;
    this.migrateTinkerMessages();
  }
  /** Migrate legacy shared tinkerMessages into the first goal context */
  migrateTinkerMessages() {
    for (const gc of this.data.goalContexts) {
      if (!gc.tinkerMessages)
        gc.tinkerMessages = [];
    }
    if (this.data.tinkerMessages && this.data.tinkerMessages.length > 0) {
      if (this.data.goalContexts.length > 0 && this.data.goalContexts[0].tinkerMessages.length === 0) {
        this.data.goalContexts[0].tinkerMessages = [...this.data.tinkerMessages];
      }
      delete this.data.tinkerMessages;
      this.saveData();
    }
  }
  // ── Active goal persistence ──
  getActiveGoalId() {
    var _a;
    return (_a = this.data.activeGoalId) != null ? _a : null;
  }
  async setActiveGoalId(goalId) {
    this.data.activeGoalId = goalId;
    await this.saveData();
    await this.saveGoalsFile();
  }
  // ── Goal access ──
  getGoals() {
    return this.data.goalContexts.map((gc) => gc.goal);
  }
  getGoalContext(goalId) {
    var _a;
    return (_a = this.data.goalContexts.find((gc) => gc.goal.id === goalId)) != null ? _a : null;
  }
  getGoalContexts() {
    return this.data.goalContexts;
  }
  getPolicy(goalId) {
    const ctx = this.getGoalContext(goalId);
    if (!ctx)
      return { ...DEFAULT_POLICY, signalWeights: { ...DEFAULT_SIGNAL_WEIGHTS }, milestones: [] };
    return ctx.policy;
  }
  getAssessments(goalId) {
    const ctx = this.getGoalContext(goalId);
    if (!ctx)
      return [];
    return ctx.assessments;
  }
  getAllAssessments() {
    return this.data.goalContexts.flatMap((gc) => gc.assessments);
  }
  getLatestAssessment(goalId) {
    const assessments = this.getAssessments(goalId);
    if (assessments.length === 0)
      return null;
    return assessments[assessments.length - 1];
  }
  getDayNumber(goalId, forDate) {
    const ctx = this.getGoalContext(goalId);
    if (!ctx)
      return 0;
    const lockedDate = new Date(ctx.goal.lockedAt);
    lockedDate.setHours(0, 0, 0, 0);
    const target = forDate ? new Date(forDate + "T00:00:00") : new Date();
    target.setHours(0, 0, 0, 0);
    const diffMs = target.getTime() - lockedDate.getTime();
    return Math.floor(diffMs / (1e3 * 60 * 60 * 24)) + 1;
  }
  getDaysLeft(goalId) {
    const ctx = this.getGoalContext(goalId);
    if (!ctx)
      return 0;
    return Math.max(0, ctx.goal.timeWindowDays - this.getDayNumber(goalId) + 1);
  }
  async addGoal(text, timeWindowDays, context, checkInFolder) {
    if (this.data.goalContexts.length >= MAX_GOALS) {
      throw new Error(`Maximum of ${MAX_GOALS} concurrent goals allowed`);
    }
    const goal = {
      id: `ns-${Date.now()}`,
      text,
      ...context ? { context } : {},
      ...checkInFolder && checkInFolder !== "PromiseLand/check-ins" ? { checkInFolder } : {},
      timeWindowDays,
      lockedAt: Date.now(),
      active: true
    };
    const ctx = {
      goal,
      policy: {
        signalWeights: { ...DEFAULT_SIGNAL_WEIGHTS },
        checkInPrompts: [],
        milestones: [],
        version: 1
      },
      assessments: [],
      tinkerMessages: []
    };
    this.data.goalContexts.push(ctx);
    await this.saveData();
    await this.saveGoalsFile();
    return goal;
  }
  async addAssessment(goalId, assessment) {
    const ctx = this.getGoalContext(goalId);
    if (!ctx)
      throw new Error(`Goal context not found for goalId: ${goalId}`);
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
  async archiveGoal(goalId) {
    const idx = this.data.goalContexts.findIndex((gc) => gc.goal.id === goalId);
    if (idx < 0)
      return;
    const ctx = this.data.goalContexts[idx];
    ctx.goal.active = false;
    this.data.archivedGoals.push(ctx.goal);
    this.data.goalContexts.splice(idx, 1);
    await this.saveData();
    await this.saveGoalsFile();
  }
  async updateGoalContext(goalId, context) {
    const ctx = this.getGoalContext(goalId);
    if (!ctx)
      throw new Error(`Goal context not found for goalId: ${goalId}`);
    if (context) {
      ctx.goal.context = context;
    } else {
      delete ctx.goal.context;
    }
    await this.saveData();
    await this.saveGoalsFile();
  }
  async updateGoalCheckInFolder(goalId, folder) {
    const ctx = this.getGoalContext(goalId);
    if (!ctx)
      throw new Error(`Goal context not found for goalId: ${goalId}`);
    if (folder && folder !== "PromiseLand/check-ins") {
      ctx.goal.checkInFolder = folder;
    } else {
      delete ctx.goal.checkInFolder;
    }
    await this.saveData();
    await this.saveGoalsFile();
  }
  canAddGoal() {
    return this.data.goalContexts.length < MAX_GOALS;
  }
  // ── Tinker messages (per-goal) ──
  getTinkerMessages(goalId) {
    const ctx = this.getGoalContext(goalId);
    if (!ctx)
      return [];
    return ctx.tinkerMessages;
  }
  async addTinkerMessage(goalId, msg) {
    const ctx = this.getGoalContext(goalId);
    if (!ctx)
      return;
    ctx.tinkerMessages.push(msg);
    await this.saveData();
  }
  async clearTinkerMessages(goalId) {
    const ctx = this.getGoalContext(goalId);
    if (!ctx)
      return;
    ctx.tinkerMessages = [];
    await this.saveData();
  }
  // ── Lightweight goals.json for external agents ──
  async saveGoalsFile() {
    var _a;
    const goalsData = {
      activeGoalId: (_a = this.data.activeGoalId) != null ? _a : null,
      goals: this.data.goalContexts.map((gc) => ({
        id: gc.goal.id,
        text: gc.goal.text,
        ...gc.goal.context ? { context: gc.goal.context } : {},
        timeWindowDays: gc.goal.timeWindowDays,
        lockedAt: gc.goal.lockedAt,
        active: gc.goal.active
      }))
    };
    await this.app.vault.adapter.write(
      "PromiseLand/goals.json",
      JSON.stringify(goalsData, null, 2) + "\n"
    );
  }
};

// src/promiseLandLlmClient.ts
var import_obsidian11 = require("obsidian");
var PromiseLandLlmClient = class {
  constructor(settings) {
    this.settings = settings;
  }
  updateSettings(settings) {
    this.settings = settings;
  }
  async chat(systemPrompt, messages) {
    const apiKey = this.settings.anthropicApiKey;
    if (!apiKey) {
      throw new Error("Anthropic API key not set. Go to Settings \u2192 PromiseLand to add it.");
    }
    let response;
    try {
      response = await (0, import_obsidian11.requestUrl)({
        url: "https://api.anthropic.com/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: this.settings.promiseLandModel,
          max_tokens: 4096,
          system: systemPrompt,
          messages: messages.map((m) => ({ role: m.role, content: m.content }))
        }),
        throw: false
      });
    } catch (e) {
      throw new Error(`Network error: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (response.status === 401) {
      throw new Error("Invalid API key. Check your key in Settings \u2192 PromiseLand.");
    }
    if (response.status !== 200) {
      throw new Error(`API error (${response.status}): ${response.text}`);
    }
    const data = response.json;
    if (data.content && data.content.length > 0 && data.content[0].type === "text") {
      return data.content[0].text;
    }
    throw new Error("Unexpected API response format");
  }
  async chatWithTools(systemPrompt, messages, tools) {
    const apiKey = this.settings.anthropicApiKey;
    if (!apiKey) {
      throw new Error("Anthropic API key not set. Go to Settings \u2192 PromiseLand to add it.");
    }
    let response;
    try {
      response = await (0, import_obsidian11.requestUrl)({
        url: "https://api.anthropic.com/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: this.settings.promiseLandModel,
          max_tokens: 4096,
          system: systemPrompt,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          tools
        }),
        throw: false
      });
    } catch (e) {
      throw new Error(`Network error: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (response.status === 401) {
      throw new Error("Invalid API key. Check your key in Settings \u2192 PromiseLand.");
    }
    if (response.status !== 200) {
      throw new Error(`API error (${response.status}): ${response.text}`);
    }
    const data = response.json;
    return {
      content: data.content || [],
      stop_reason: data.stop_reason || "end_turn"
    };
  }
  async call(systemPrompt, userMessage) {
    const apiKey = this.settings.anthropicApiKey;
    if (!apiKey) {
      throw new Error("Anthropic API key not set. Go to Settings \u2192 PromiseLand to add it.");
    }
    let response;
    try {
      response = await (0, import_obsidian11.requestUrl)({
        url: "https://api.anthropic.com/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: this.settings.promiseLandModel,
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }]
        }),
        throw: false
      });
    } catch (e) {
      throw new Error(`Network error: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (response.status === 401) {
      throw new Error("Invalid API key. Check your key in Settings \u2192 PromiseLand.");
    }
    if (response.status !== 200) {
      throw new Error(`API error (${response.status}): ${response.text}`);
    }
    const data = response.json;
    if (data.content && data.content.length > 0 && data.content[0].type === "text") {
      return data.content[0].text;
    }
    throw new Error("Unexpected API response format");
  }
};

// src/promiseLandObserver.ts
var import_obsidian12 = require("obsidian");
var import_child_process = require("child_process");
var PromiseLandObserver = class {
  constructor(app, settings, taskData, feedbackData, negativeFeedbackData) {
    this.app = app;
    this.settings = settings;
    this.taskData = taskData;
    this.feedbackData = feedbackData;
    this.negativeFeedbackData = negativeFeedbackData;
  }
  updateSettings(settings) {
    this.settings = settings;
  }
  updateData(taskData, feedbackData, negativeFeedbackData) {
    this.taskData = taskData;
    this.feedbackData = feedbackData;
    this.negativeFeedbackData = negativeFeedbackData;
  }
  async observe(dateStr, onStep) {
    onStep == null ? void 0 : onStep("checkpoint", "Ensuring daily git checkpoint...");
    this.ensureDailyCheckpoint(dateStr);
    onStep == null ? void 0 : onStep("checkpoint", `Daily checkpoint ready`);
    onStep == null ? void 0 : onStep("daily-note", "Reading daily note content...");
    const rawNoteContent = await this.readDailyNoteContent(dateStr);
    const noteLength = rawNoteContent ? rawNoteContent.length : 0;
    onStep == null ? void 0 : onStep("daily-note", noteLength > 0 ? `Read daily note (${Math.round(noteLength / 1e3)}k chars)` : `No daily note found for ${dateStr}`);
    onStep == null ? void 0 : onStep("positive-feedback", "Scanning positive feedback...");
    const positiveFeedback = this.extractPositiveFeedbackSignals(dateStr);
    onStep == null ? void 0 : onStep("positive-feedback", `Found ${positiveFeedback.length} positive feedback entries`);
    onStep == null ? void 0 : onStep("negative-feedback", "Scanning negative feedback...");
    const negativeFeedback = this.extractNegativeFeedbackSignals(dateStr);
    onStep == null ? void 0 : onStep("negative-feedback", `Found ${negativeFeedback.length} negative feedback entries`);
    const feedback = [...positiveFeedback, ...negativeFeedback];
    onStep == null ? void 0 : onStep("vault", "Checking vault activity...");
    const vaultActivity = this.getVaultActivity(dateStr);
    onStep == null ? void 0 : onStep("vault", `${vaultActivity.filesModified} files modified today across ${vaultActivity.foldersActive.length} folders`);
    onStep == null ? void 0 : onStep("git-diff", `Scanning git diff for ${dateStr} changes...`);
    let modifiedFiles = this.getModifiedFilesFromGit(dateStr);
    if (modifiedFiles.length === 0 && vaultActivity.filesModified > 0) {
      modifiedFiles = this.getModifiedFilesByMtime(dateStr);
      const fileList = modifiedFiles.map((f) => `  \u2022 ${f.fileName}${f.createdToday ? " [NEW]" : ""}`).join("\n");
      onStep == null ? void 0 : onStep("git-diff", `${modifiedFiles.length} files detected (mtime fallback):
${fileList}`);
    } else {
      const fileList = modifiedFiles.map((f) => `  \u2022 ${f.fileName}${f.createdToday ? " [NEW]" : ""}`).join("\n");
      onStep == null ? void 0 : onStep("git-diff", `${modifiedFiles.length} files changed (git diff):
${fileList}`);
    }
    vaultActivity.modifiedFiles = modifiedFiles;
    return {
      date: dateStr,
      tasks: [],
      ships: [],
      feedback,
      reflections: [],
      vaultActivity,
      rawNoteContent: rawNoteContent || void 0
    };
  }
  /**
   * Read the full daily note content. The LLM will extract signals from it.
   */
  async readDailyNoteContent(dateStr) {
    const compactDate = dateStr.replace(/-/g, "");
    const files = this.app.vault.getMarkdownFiles();
    for (const file of files) {
      if (!file.path.includes(compactDate))
        continue;
      const content = await this.app.vault.cachedRead(file);
      if (content.length > 15e3) {
        return content.substring(0, 15e3) + "\n\n... (note truncated at 15k chars)";
      }
      return content;
    }
    return null;
  }
  /**
   * Read priority tasks directly from the daily note's "Today's Priority Actions" section.
   * This is the single source of truth — no task board indirection.
   */
  async extractPriorityTasksFromNote(dateStr) {
    const signals = [];
    const compactDate = dateStr.replace(/-/g, "");
    const files = this.app.vault.getMarkdownFiles();
    for (const file of files) {
      if (!file.path.includes(compactDate))
        continue;
      const content = await this.app.vault.cachedRead(file);
      const lines = content.split("\n");
      let inPrioritySection = false;
      for (const line of lines) {
        if (/^#{1,6}\s+Today'?s?\s+Priority\s+Actions/i.test(line)) {
          inPrioritySection = true;
          continue;
        }
        if (inPrioritySection && /^#{1,6}\s+/.test(line)) {
          break;
        }
        if (inPrioritySection) {
          const checkboxMatch = line.match(/^\s*-\s+\[([ xX])\]\s+(.*)/i);
          if (checkboxMatch) {
            const completed = checkboxMatch[1].toLowerCase() === "x";
            const fullText = checkboxMatch[2];
            const timeMatch = fullText.match(TIME_ANNOTATION_REGEX);
            let timeAnnotation;
            let durationMin;
            if (timeMatch) {
              timeAnnotation = timeMatch[0];
              durationMin = this.parseDuration(timeMatch[1], timeMatch[2]);
            }
            const tags = [];
            const tagMatches = fullText.matchAll(/#(\w+)/g);
            for (const m of tagMatches) {
              tags.push(`#${m[1]}`);
            }
            const title = fullText.replace(TIME_ANNOTATION_REGEX, "").replace(/\[\[.*?\]\]/g, "").replace(/\[.*?\]\(.*?\)/g, "").replace(/\s+/g, " ").trim();
            if (title.length > 0) {
              signals.push({
                title,
                tags,
                completed,
                timeAnnotation,
                durationMin,
                effort: timeMatch ? "deep_work" : "quick_action",
                priority: true
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
  async extractShipsFromNote(dateStr) {
    const ships = [];
    const compactDate = dateStr.replace(/-/g, "");
    const files = this.app.vault.getMarkdownFiles();
    for (const file of files) {
      if (!file.path.includes(compactDate))
        continue;
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
          const checkboxMatch = line.match(/^\s*-\s+\[([ xX])\]\s+(.*)/i);
          if (checkboxMatch) {
            const completed = checkboxMatch[1].toLowerCase() === "x";
            const title = checkboxMatch[2].replace(/#\w+/g, "").replace(/\[\[.*?\]\]/g, "").replace(/\[.*?\]\(.*?\)/g, "").replace(/\s+/g, " ").trim();
            if (title.length > 0) {
              ships.push({ title, completed });
            }
          }
          if (!checkboxMatch && line.startsWith("|") && !line.match(/^\|\s*[-:]+/) && !line.match(/^\|\s*#\s*\|/)) {
            const cells = line.split("|").slice(1, -1).map((c) => c.trim());
            if (cells.length >= 4) {
              const taskCell = cells[1];
              const statusCell = cells[3];
              const isCompleted = /✅|shipped|done|complete/i.test(statusCell);
              const isFailed = /❌|failed|crashed/i.test(statusCell);
              const isDropped = /🚫|dropped|skipped/i.test(statusCell);
              if (isCompleted || isFailed || isDropped) {
                const title = taskCell.replace(/`/g, "").replace(/#\w+/g, "").replace(/\[\[.*?\]\]/g, "").replace(/\[.*?\]\(.*?\)/g, "").replace(/\s+/g, " ").trim();
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
  parseDuration(startStr, endStr) {
    const startHour = this.parseHour(startStr);
    const endHour = this.parseHour(endStr);
    let diff = endHour - startHour;
    if (diff <= 0)
      diff += 12;
    return Math.round(diff * 60);
  }
  parseHour(timeStr) {
    const cleaned = timeStr.replace(":", "");
    if (cleaned.length <= 2) {
      return parseInt(cleaned, 10);
    }
    const hours = parseInt(cleaned.slice(0, -2), 10);
    const minutes = parseInt(cleaned.slice(-2), 10);
    return hours + minutes / 60;
  }
  extractPositiveFeedbackSignals(dateStr) {
    const signals = [];
    const compactDate = dateStr.replace(/-/g, "");
    for (const item of Object.values(this.feedbackData.addedFeedback)) {
      if (!item.filePath.includes(compactDate))
        continue;
      signals.push({
        text: item.text,
        tags: item.tags,
        type: "positive"
      });
    }
    return signals;
  }
  extractNegativeFeedbackSignals(dateStr) {
    const signals = [];
    const compactDate = dateStr.replace(/-/g, "");
    for (const item of Object.values(this.negativeFeedbackData.addedNegativeFeedback)) {
      if (!item.filePath.includes(compactDate))
        continue;
      signals.push({
        text: item.text,
        tags: item.tags,
        type: "negative"
      });
    }
    return signals;
  }
  async extractReflections(dateStr) {
    const reflections = [];
    const compactDate = dateStr.replace(/-/g, "");
    const files = this.app.vault.getMarkdownFiles();
    for (const file of files) {
      if (!file.path.includes(compactDate))
        continue;
      const content = await this.app.vault.cachedRead(file);
      const lines = content.split("\n");
      for (const line of lines) {
        if (line.toLowerCase().includes("#promiseland")) {
          const cleanText = line.replace(/^[\s]*[-*]\s+/, "").replace(/#promiseland/gi, "").trim();
          if (cleanText.length > 0) {
            reflections.push({
              text: cleanText,
              filePath: file.path
            });
          }
        }
      }
      let inReflectionSection = false;
      for (const line of lines) {
        if (/^#{1,6}\s+Reflection/i.test(line)) {
          inReflectionSection = true;
          continue;
        }
        if (inReflectionSection && /^#{1,6}\s+/.test(line)) {
          break;
        }
        if (inReflectionSection) {
          const cleanText = line.replace(/^[\s]*[-*]\s+/, "").replace(/#\w+/g, "").trim();
          if (cleanText.length > 0) {
            reflections.push({
              text: cleanText,
              filePath: file.path
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
  fileMatchesDate(file, dateStr, dayStart, dayEnd) {
    var _a;
    if (file.stat.mtime >= dayStart && file.stat.mtime < dayEnd)
      return true;
    if (file.stat.ctime >= dayStart && file.stat.ctime < dayEnd)
      return true;
    const compactDate = dateStr.replace(/-/g, "");
    if (file.path.includes(compactDate))
      return true;
    const cache = this.app.metadataCache.getFileCache(file);
    if (((_a = cache == null ? void 0 : cache.frontmatter) == null ? void 0 : _a.date) === dateStr)
      return true;
    return false;
  }
  getVaultActivity(dateStr) {
    var _a;
    const files = this.app.vault.getMarkdownFiles();
    let filesModified = 0;
    const foldersSet = /* @__PURE__ */ new Set();
    const dayStart = new Date(dateStr + "T00:00:00").getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1e3;
    for (const file of files) {
      if (this.fileMatchesDate(file, dateStr, dayStart, dayEnd)) {
        filesModified++;
        const folder = ((_a = file.parent) == null ? void 0 : _a.path) || "/";
        foldersSet.add(folder);
      }
    }
    return {
      filesModified,
      foldersActive: Array.from(foldersSet)
    };
  }
  // ── Git helpers ──
  getVaultRoot() {
    return this.app.vault.adapter.basePath;
  }
  runGit(cmd) {
    try {
      return (0, import_child_process.execSync)(cmd, {
        cwd: this.getVaultRoot(),
        encoding: "utf-8",
        timeout: 1e4
      }).trim();
    } catch (e) {
      return "";
    }
  }
  truncateDiff(diff, maxChars) {
    if (diff.length <= maxChars)
      return diff;
    const truncated = diff.substring(0, maxChars);
    const lastNewline = truncated.lastIndexOf("\n");
    return (lastNewline > 0 ? truncated.substring(0, lastNewline) : truncated) + "\n... (truncated)";
  }
  /**
   * Ensure a daily checkpoint commit exists. Returns the checkpoint commit hash.
   * The checkpoint marks the start of the day — all diffs are measured from it.
   */
  ensureDailyCheckpoint(dateStr) {
    const marker = `promiseland-checkpoint: ${dateStr}`;
    const existing = this.runGit(`git log --format=%H --grep="${marker}" -1`);
    if (existing)
      return;
    this.runGit("git add -A");
    const status = this.runGit("git status --porcelain");
    if (status) {
      this.runGit(`git commit -m "${marker}"`);
    } else {
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
  getBaselineCommit(dateStr) {
    const beforeDate = this.runGit(`git log --format=%H --before="${dateStr}T00:00:00" -1`);
    if (beforeDate)
      return { hash: beforeDate, mode: "date-range" };
    const marker = `promiseland-checkpoint: ${dateStr}`;
    const checkpoint = this.runGit(`git log --format=%H --grep="${marker}" -1`);
    if (checkpoint)
      return { hash: checkpoint, mode: "checkpoint" };
    const firstCommit = this.runGit("git rev-list --max-parents=0 HEAD");
    if (firstCommit)
      return { hash: firstCommit, mode: "fallback" };
    return { hash: "HEAD", mode: "fallback" };
  }
  /**
   * Find the end-of-day commit for a given date.
   * Used for retroactive check-ins to cap the diff range.
   */
  getEndOfDayCommit(dateStr) {
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
  getModifiedFilesFromGit(dateStr) {
    const results = [];
    const excludedFolders = this.settings.excludedFolders || [];
    const isToday = dateStr === this.getTodayStr();
    const baseline = this.getBaselineCommit(dateStr);
    let changedFilesRaw;
    let diffRef;
    const newFilesSet = /* @__PURE__ */ new Set();
    if (isToday) {
      const committedRaw = baseline.hash !== "HEAD" ? this.runGit(`git diff --name-only ${baseline.hash}..HEAD`) : "";
      const uncommittedRaw = this.runGit("git diff --name-only HEAD");
      const untrackedRaw = this.runGit("git ls-files --others --exclude-standard");
      const committed = committedRaw.split("\n").filter(Boolean);
      const uncommitted = uncommittedRaw.split("\n").filter(Boolean);
      const untracked = untrackedRaw.split("\n").filter(Boolean);
      const allFiles = [.../* @__PURE__ */ new Set([...committed, ...uncommitted, ...untracked])];
      changedFilesRaw = allFiles.join("\n");
      diffRef = baseline.hash;
      if (baseline.hash !== "HEAD") {
        const newRaw = this.runGit(`git diff --name-only --diff-filter=A ${baseline.hash}..HEAD`);
        newRaw.split("\n").filter(Boolean).forEach((f) => newFilesSet.add(f));
      }
      untracked.forEach((f) => newFilesSet.add(f));
    } else {
      const endCommit = this.getEndOfDayCommit(dateStr);
      const startCommit = baseline.hash;
      if (startCommit === endCommit) {
        return results;
      }
      changedFilesRaw = this.runGit(`git diff --name-only ${startCommit}..${endCommit}`);
      diffRef = startCommit;
      const newRaw = this.runGit(`git diff --name-only --diff-filter=A ${startCommit}..${endCommit}`);
      newRaw.split("\n").filter(Boolean).forEach((f) => newFilesSet.add(f));
    }
    const allChangedFiles = changedFilesRaw.split("\n").filter(Boolean);
    if (allChangedFiles.length === 0)
      return results;
    const mdFiles = allChangedFiles.filter((f) => f.endsWith(".md")).filter((f) => !excludedFolders.some((folder) => f.startsWith(folder + "/") || f === folder));
    const endRef = isToday ? "" : this.getEndOfDayCommit(dateStr);
    const withDiffs = [];
    for (const filePath of mdFiles) {
      let diff;
      if (isToday && newFilesSet.has(filePath) && !this.runGit(`git diff ${diffRef} -- "${filePath}"`)) {
        diff = this.runGit(`head -30 "${filePath}"`);
        if (diff)
          diff = `+++ new file
${diff.split("\n").map((l) => `+${l}`).join("\n")}`;
      } else if (isToday) {
        diff = this.runGit(`git diff ${diffRef} -- "${filePath}"`);
      } else {
        diff = this.runGit(`git diff ${diffRef}..${endRef} -- "${filePath}"`);
      }
      withDiffs.push({ file: filePath, diff: diff || "", diffLen: (diff == null ? void 0 : diff.length) || 0 });
    }
    const meaningful = withDiffs.filter(({ file, diff }) => {
      if (newFilesSet.has(file))
        return true;
      const contentLines = diff.split("\n").filter(
        (l) => (l.startsWith("+") || l.startsWith("-")) && !l.startsWith("+++") && !l.startsWith("---") && l.trim().length > 1
      );
      return contentLines.length >= 3;
    });
    meaningful.sort((a, b) => b.diffLen - a.diffLen);
    const capped = meaningful.slice(0, 15);
    for (const { file: filePath, diff } of capped) {
      const parts = filePath.split("/");
      const fileName = parts[parts.length - 1];
      const folder = parts.length > 1 ? parts.slice(0, -1).join("/") : "/";
      const headings = [];
      const tfile = this.app.vault.getAbstractFileByPath(filePath);
      if (tfile && tfile instanceof import_obsidian12.TFile) {
        const cache = this.app.metadataCache.getFileCache(tfile);
        if (cache == null ? void 0 : cache.headings) {
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
        createdToday: newFilesSet.has(filePath)
      });
    }
    return results;
  }
  getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  /**
   * Fallback: detect modified files when git history is unavailable.
   * Uses multiple signals: mtime, ctime, frontmatter date, filename pattern.
   */
  getModifiedFilesByMtime(dateStr) {
    const results = [];
    const excludedFolders = this.settings.excludedFolders || [];
    const dayStart = new Date(dateStr + "T00:00:00").getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1e3;
    const files = this.app.vault.getMarkdownFiles();
    const modified = [];
    for (const file of files) {
      if (excludedFolders.some((folder) => file.path.startsWith(folder + "/") || file.path === folder))
        continue;
      if (this.fileMatchesDate(file, dateStr, dayStart, dayEnd)) {
        const ctime = file.stat.ctime;
        const isNew = ctime >= dayStart && ctime < dayEnd;
        modified.push({ file, isNew });
      }
    }
    modified.sort((a, b) => b.file.stat.mtime - a.file.stat.mtime);
    const capped = modified.slice(0, 15);
    for (const { file, isNew } of capped) {
      const parts = file.path.split("/");
      const fileName = parts[parts.length - 1];
      const folder = parts.length > 1 ? parts.slice(0, -1).join("/") : "/";
      const headings = [];
      const cache = this.app.metadataCache.getFileCache(file);
      if (cache == null ? void 0 : cache.headings) {
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
        createdToday: isNew
      });
    }
    return results;
  }
};

// src/promiseLandAgent.ts
var PromiseLandAgent = class {
  constructor(manager, observer, llmClient) {
    this.manager = manager;
    this.observer = observer;
    this.llmClient = llmClient;
  }
  async observeSignals(dateStr, onProgress) {
    return this.observer.observe(dateStr, (step, detail) => {
      const isRunning = detail.startsWith("Scanning") || detail.startsWith("Checking");
      onProgress == null ? void 0 : onProgress(step, isRunning ? "running" : "done", detail);
    });
  }
  async assessSignals(goalId, dateStr, signals) {
    const ctx = this.manager.getGoalContext(goalId);
    if (!ctx)
      throw new Error(`No goal context found for goalId: ${goalId}`);
    const dayNumber = this.manager.getDayNumber(goalId, dateStr);
    const assessment = await this.assess(ctx.goal, signals, ctx.policy, dayNumber, dateStr);
    assessment.goalId = goalId;
    await this.manager.addAssessment(goalId, assessment);
    return assessment;
  }
  async runCycle(goalId, dateStr, onProgress) {
    const ctx = this.manager.getGoalContext(goalId);
    if (!ctx)
      throw new Error(`No goal context found for goalId: ${goalId}`);
    const dayNumber = this.manager.getDayNumber(goalId, dateStr);
    const signals = await this.observer.observe(dateStr, (step, detail) => {
      const isRunning = detail.startsWith("Scanning") || detail.startsWith("Checking");
      onProgress == null ? void 0 : onProgress(step, isRunning ? "running" : "done", detail);
    });
    onProgress == null ? void 0 : onProgress("assess", "running", "Sending signals to Claude for assessment...");
    const assessment = await this.assess(ctx.goal, signals, ctx.policy, dayNumber, dateStr);
    assessment.goalId = goalId;
    onProgress == null ? void 0 : onProgress("assess", "done", `Assessment complete \u2014 score: ${assessment.overallScore}/100`);
    onProgress == null ? void 0 : onProgress("save", "running", "Saving assessment...");
    await this.manager.addAssessment(goalId, assessment);
    onProgress == null ? void 0 : onProgress("save", "done", "Assessment saved to data.json");
    return assessment;
  }
  async assess(goal, signals, policy, dayNumber, dateStr) {
    const systemPrompt = this.buildAssessSystemPrompt();
    const userMessage = this.buildAssessUserMessage(goal, signals, policy, dayNumber);
    const rawResponse = await this.llmClient.call(systemPrompt, userMessage);
    return this.parseAssessResponse(rawResponse, dateStr, dayNumber, signals, policy.version, goal.id);
  }
  buildAssessSystemPrompt() {
    return `You are an alignment assessment agent for Promise Land.

The user's philosophy is **Build -> Ship, Repeat**. Score today's alignment on exactly 2 categories:

1. **build** \u2014 Did focused work, learning, or growth happen toward the goal? This includes: coding, designing, writing, deep thinking, debugging complex systems, figuring out new frameworks, reading papers, studying, strategic thinking, documenting insights, recording demos, preparing submissions. Building and learning are the same activity \u2014 any sustained effort or growth counts.
2. **ship** \u2014 Did something get completed or reach a milestone? This includes: completing a training run, finishing an experiment, pushing code, deploying a product, submitting an entry, posting content, finishing a deliverable. Internal milestones count \u2014 shipping does NOT require external visibility. A completed training run IS a shipped artifact.

## Evidence Sources

You will receive:
- DAILY NOTE \u2014 the user's full daily note. Read it carefully. Tasks, ships, progress, and reflections may appear in ANY format: checkboxes, tables, bullet points, prose, or mixed. Extract what was accomplished by understanding the content, not by looking for a specific format.
- VAULT ACTIVITY \u2014 git diffs showing file changes across the vault
- FEEDBACK \u2014 positive/negative feedback entries
- CONVERSATION CONTEXT \u2014 excerpts from Tinker coaching chat. This is critical \u2014 it captures work outside the vault (demos, submissions, coding in other tools). Trust the conversation when vault signals are sparse.

## Adaptive Weights

Adapt weights based on the goal:
- **Sprint goals** (hackathons, deadlines, 1-7 days): build 0.45, ship 0.55
- **Learning goals** (interview prep, studying, research): build 0.75, ship 0.25
- **Long-term goals** (products, research): build 0.65, ship 0.35

## Rules
- Priority actions and Ship sections are OPTIONAL organizational tools. Not setting them is a valid workflow choice \u2014 NEVER treat empty priority actions as drift, slipping discipline, or a negative signal. Assess based on what was actually done, not on process compliance.
- Assess based on EVIDENCE OF WORK (vault diffs, conversation context, shipped artifacts) \u2014 not on whether the user followed a specific planning format.
- **Deep focus philosophy:** The user is a deep focus builder who works best going all-in on ONE thing per day. If today's work shows deep, concentrated effort on a single workstream, that is EXCELLENT execution \u2014 do NOT list other untouched workstreams as drift. Only flag something as drift if it's been neglected for many days AND is time-critical. "Haven't started X yet" is not drift when the user is deliberately sequencing tasks.
- Be specific \u2014 reference actual file names using [[filename]] wiki-link syntax (e.g. [[Final Submission]], [[SofaGenius - Talk Note]]). This makes the check-in note navigable.
- Be honest and calibrated \u2014 don't inflate scores, but also don't deflate them. If the reasoning you write supports a high score, the numeric score MUST match. Do not write strong reasoning then give a low number.

- **Scope: TODAY only.** Score based exclusively on what happened TODAY. Do NOT penalize today's score for what happened (or didn't happen) on previous days. Past missed days, past distractions, or accumulated debt from earlier days are irrelevant to today's score. Each day stands on its own. Drift indicators should only reference patterns visible IN TODAY'S signals \u2014 not historical complaints.

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
  "driftIndicators": ["<string: specific misalignment observation FROM TODAY \u2014 never reference previous days>"],
  "momentumIndicators": ["<string: specific progress observation FROM TODAY>"]
}

overallScore = sum of all scores. Each maxScore = weight * 100.`;
  }
  buildAssessUserMessage(goal, signals, policy, dayNumber) {
    const modifiedFiles = signals.vaultActivity.modifiedFiles || [];
    const contextSection = goal.context ? `
## Goal Context
${goal.context}
` : "";
    let vaultActivitySection;
    if (modifiedFiles.length > 0) {
      const fileEntries = modifiedFiles.map((f) => {
        const newTag = f.createdToday ? " [NEW]" : "";
        const headingsLine = f.headings.length > 0 ? `  Headings: ${f.headings.join(" > ")}` : "";
        const diffBlock = f.diff ? `  Changes:
  \`\`\`diff
  ${f.diff}
  \`\`\`` : "  (no diff available)";
        return `- **${f.fileName}** (${f.folder})${newTag}
${headingsLine}
${diffBlock}`;
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

${policy.milestones.length > 0 ? `Milestones:
${policy.milestones.map((m) => `- ${m.text} (deadline: ${m.deadline}, completed: ${m.completed})`).join("\n")}` : "No milestones set yet."}

## Daily Note \u2014 Full Content

Read this carefully. Tasks, ships, progress, and reflections may appear in any format (tables, checkboxes, prose, bullet points). Understand what was accomplished from the content itself.

${signals.rawNoteContent || "(No daily note found for this date.)"}

## Vault Activity \u2014 What Changed Today (${modifiedFiles.length} files)

${vaultActivitySection}

### Feedback (${signals.feedback.length})
${signals.feedback.length > 0 ? signals.feedback.map((f) => `- [${f.type}] ${f.text} ${f.tags.join(" ")}`).join("\n") : "No feedback entries today."}

${signals.conversationContext ? `## Conversation Context \u2014 What the User Discussed Today

The following are excerpts from the user's Tinker coaching conversation on this day. This reveals work and thinking that may not be captured in the vault signals above.

${signals.conversationContext}` : "## Conversation Context\nNo Tinker conversation recorded for this day."}

Produce the assessment JSON now. Evaluate ALL evidence \u2014 the daily note content, vault activity diffs, conversation context, and feedback. Read the daily note thoroughly \u2014 work items, completed tasks, shipped artifacts, and reflections can appear in any format.`;
  }
  parseAssessResponse(raw, dateStr, dayNumber, signals, policyVersion, goalId) {
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
      signalBreakdown: (parsed.signalBreakdown || []).map((s) => ({
        category: s.category,
        weight: s.weight,
        score: s.score,
        maxScore: s.maxScore,
        reasoning: s.reasoning
      })),
      driftIndicators: parsed.driftIndicators || [],
      momentumIndicators: parsed.momentumIndicators || [],
      rawSignals: signals,
      policyVersion
    };
  }
};

// src/main.ts
var ActaTaskPlugin = class extends import_obsidian13.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.data = DEFAULT_DATA;
    this.feedbackData = DEFAULT_FEEDBACK_DATA;
    this.negativeFeedbackData = DEFAULT_NEGATIVE_FEEDBACK_DATA;
    this.promiseLandData = { ...DEFAULT_PROMISELAND_DATA };
    this.taskManager = null;
    this.scanner = null;
    this.toggler = null;
    this.feedbackManager = null;
    this.feedbackScanner = null;
    this.negativeFeedbackManager = null;
    this.negativeFeedbackScanner = null;
    this.promiseLandManager = null;
    this.promiseLandLlmClient = null;
    this.promiseLandObserver = null;
    this.promiseLandAgent = null;
    this.autoCommitDebounced = null;
  }
  async onload() {
    await this.loadSettings();
    await this.loadTaskData();
    await this.loadFeedbackData();
    await this.loadNegativeFeedbackData();
    await this.loadPromiseLandData();
    this.taskManager = new TaskManager(
      this.app,
      this.settings,
      this.data,
      () => this.saveTaskData()
    );
    this.scanner = new TaskScanner(this.app, this.taskManager, this.settings);
    this.toggler = new TaskToggler(this.app);
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
    await this.promiseLandManager.saveGoalsFile();
    this.registerView(ACTA_TASK_VIEW_TYPE, (leaf) => {
      return new TaskBoardView(
        leaf,
        this.scanner,
        this.toggler,
        this.taskManager,
        this.settings
      );
    });
    this.registerView(ACTA_FEEDBACK_VIEW_TYPE, (leaf) => {
      return new FeedbackBoardView(
        leaf,
        this.feedbackScanner,
        this.feedbackManager,
        this.settings
      );
    });
    this.registerView(ACTA_NEGATIVE_FEEDBACK_VIEW_TYPE, (leaf) => {
      return new NegativeFeedbackBoardView(
        leaf,
        this.negativeFeedbackScanner,
        this.negativeFeedbackManager,
        this.settings
      );
    });
    this.registerView(ACTA_PROMISELAND_VIEW_TYPE, (leaf) => {
      return new PromiseLandBoardView(
        leaf,
        this.promiseLandManager,
        this.promiseLandAgent,
        this.promiseLandLlmClient,
        this.settings
      );
    });
    this.addRibbonIcon("list-checks", "Open PromiseLand Board", () => {
      this.openBoard();
    });
    this.addCommand({
      id: "open-promiseland-board",
      name: "Open task board",
      callback: () => this.openBoard()
    });
    this.addCommand({
      id: "refresh-promiseland-board",
      name: "Refresh task board",
      callback: () => this.refreshBoard()
    });
    this.addRibbonIcon("heart", "Open \u2764\uFE0F \u6B63\u53CD\u9988board", () => {
      this.openFeedbackBoard();
    });
    this.addCommand({
      id: "open-acta-feedback-board",
      name: "Open \u2764\uFE0F \u6B63\u53CD\u9988board",
      callback: () => this.openFeedbackBoard()
    });
    this.addCommand({
      id: "refresh-acta-feedback-board",
      name: "Refresh \u2764\uFE0F \u6B63\u53CD\u9988board",
      callback: () => this.refreshFeedbackBoard()
    });
    this.addRibbonIcon("frown", "Open \u{1F612} \u8D1F\u53CD\u9988board", () => {
      this.openNegativeFeedbackBoard();
    });
    this.addCommand({
      id: "open-acta-negative-feedback-board",
      name: "Open \u{1F612} \u8D1F\u53CD\u9988board",
      callback: () => this.openNegativeFeedbackBoard()
    });
    this.addCommand({
      id: "refresh-acta-negative-feedback-board",
      name: "Refresh \u{1F612} \u8D1F\u53CD\u9988board",
      callback: () => this.refreshNegativeFeedbackBoard()
    });
    this.addRibbonIcon("star", "Open Promise Land board", () => {
      this.openPromiseLandBoard();
    });
    this.addCommand({
      id: "open-acta-promiseland-board",
      name: "Open Promise Land board",
      callback: () => this.openPromiseLandBoard()
    });
    this.addCommand({
      id: "refresh-acta-promiseland-board",
      name: "Refresh Promise Land board",
      callback: () => this.refreshPromiseLandBoard()
    });
    this.addSettingTab(new ActaTaskSettingTab(this.app, this));
    this.runGit("git pull --no-rebase origin main");
    this.setupAutoCommit();
    this.setupDateStamping();
  }
  async onunload() {
    this.app.workspace.detachLeavesOfType(ACTA_TASK_VIEW_TYPE);
    this.app.workspace.detachLeavesOfType(ACTA_FEEDBACK_VIEW_TYPE);
    this.app.workspace.detachLeavesOfType(ACTA_NEGATIVE_FEEDBACK_VIEW_TYPE);
    this.app.workspace.detachLeavesOfType(ACTA_PROMISELAND_VIEW_TYPE);
    this.runAutoCommitAndPush();
  }
  async loadSettings() {
    const data = await this.loadData();
    const settings = data == null ? void 0 : data.settings;
    if ((settings == null ? void 0 : settings.northStarModel) && !(settings == null ? void 0 : settings.promiseLandModel)) {
      settings.promiseLandModel = settings.northStarModel;
      delete settings.northStarModel;
    }
    this.settings = Object.assign({}, DEFAULT_SETTINGS, settings);
  }
  async saveSettings() {
    await this.saveData({
      settings: this.settings,
      tasks: this.data,
      feedback: this.feedbackData,
      negativeFeedback: this.negativeFeedbackData,
      promiseLand: this.promiseLandData
    });
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
    if (promiseLandView)
      promiseLandView.updateSettings(this.settings);
    const taskView = this.getActiveTaskView();
    if (taskView)
      taskView.updateSettings(this.settings);
    const feedbackView = this.getActiveFeedbackView();
    if (feedbackView)
      feedbackView.updateSettings(this.settings);
    const negativeFeedbackView = this.getActiveNegativeFeedbackView();
    if (negativeFeedbackView)
      negativeFeedbackView.updateSettings(this.settings);
    this.app.workspace.updateOptions();
  }
  async loadTaskData() {
    const data = await this.loadData();
    this.data = Object.assign({}, DEFAULT_DATA, data == null ? void 0 : data.tasks);
  }
  async saveTaskData() {
    await this.saveData({
      settings: this.settings,
      tasks: this.data,
      feedback: this.feedbackData,
      negativeFeedback: this.negativeFeedbackData,
      promiseLand: this.promiseLandData
    });
  }
  async loadFeedbackData() {
    const data = await this.loadData();
    this.feedbackData = Object.assign(
      {},
      DEFAULT_FEEDBACK_DATA,
      data == null ? void 0 : data.feedback
    );
  }
  async saveFeedbackData() {
    await this.saveData({
      settings: this.settings,
      tasks: this.data,
      feedback: this.feedbackData,
      negativeFeedback: this.negativeFeedbackData,
      promiseLand: this.promiseLandData
    });
  }
  async loadNegativeFeedbackData() {
    const data = await this.loadData();
    this.negativeFeedbackData = Object.assign(
      {},
      DEFAULT_NEGATIVE_FEEDBACK_DATA,
      data == null ? void 0 : data.negativeFeedback
    );
  }
  async saveNegativeFeedbackData() {
    await this.saveData({
      settings: this.settings,
      tasks: this.data,
      feedback: this.feedbackData,
      negativeFeedback: this.negativeFeedbackData,
      promiseLand: this.promiseLandData
    });
  }
  async loadPromiseLandData() {
    var _a;
    const data = await this.loadData();
    const raw = (_a = data == null ? void 0 : data.promiseLand) != null ? _a : data == null ? void 0 : data.northStar;
    this.promiseLandData = Object.assign(
      {},
      DEFAULT_PROMISELAND_DATA,
      raw
    );
    if (!this.promiseLandData.archivedGoals) {
      this.promiseLandData.archivedGoals = [];
    }
    if (!this.promiseLandData.goalContexts) {
      this.promiseLandData.goalContexts = [];
    }
    if ((raw == null ? void 0 : raw.goal) && !raw.goalContexts) {
      const legacyGoal = raw.goal;
      const legacyPolicy = raw.policy || { ...DEFAULT_PROMISELAND_DATA };
      const legacyAssessments = raw.assessments || [];
      for (const a of legacyAssessments) {
        if (!a.goalId) {
          a.goalId = legacyGoal.id;
        }
      }
      this.promiseLandData.goalContexts = [{
        goal: legacyGoal,
        policy: legacyPolicy,
        assessments: legacyAssessments,
        tinkerMessages: []
      }];
      delete this.promiseLandData.goal;
      delete this.promiseLandData.policy;
      delete this.promiseLandData.assessments;
    }
  }
  async savePromiseLandData() {
    await this.saveData({
      settings: this.settings,
      tasks: this.data,
      feedback: this.feedbackData,
      negativeFeedback: this.negativeFeedbackData,
      promiseLand: this.promiseLandData
    });
  }
  getActiveTaskView() {
    const leaves = this.app.workspace.getLeavesOfType(
      ACTA_TASK_VIEW_TYPE
    );
    if (leaves.length > 0) {
      return leaves[0].view;
    }
    return null;
  }
  getActiveFeedbackView() {
    const leaves = this.app.workspace.getLeavesOfType(
      ACTA_FEEDBACK_VIEW_TYPE
    );
    if (leaves.length > 0) {
      return leaves[0].view;
    }
    return null;
  }
  getActiveNegativeFeedbackView() {
    const leaves = this.app.workspace.getLeavesOfType(
      ACTA_NEGATIVE_FEEDBACK_VIEW_TYPE
    );
    if (leaves.length > 0) {
      return leaves[0].view;
    }
    return null;
  }
  refreshBoard() {
    const view = this.getActiveTaskView();
    if (view)
      view.refresh();
  }
  refreshFeedbackBoard() {
    const view = this.getActiveFeedbackView();
    if (view)
      view.refresh();
  }
  refreshNegativeFeedbackBoard() {
    const view = this.getActiveNegativeFeedbackView();
    if (view)
      view.refresh();
  }
  async openBoard() {
    const existing = this.app.workspace.getLeavesOfType(ACTA_TASK_VIEW_TYPE);
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({
        type: ACTA_TASK_VIEW_TYPE,
        active: true
      });
      this.app.workspace.revealLeaf(leaf);
    }
  }
  async openFeedbackBoard() {
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
        active: true
      });
      this.app.workspace.revealLeaf(leaf);
    }
  }
  async openNegativeFeedbackBoard() {
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
        active: true
      });
      this.app.workspace.revealLeaf(leaf);
    }
  }
  getActivePromiseLandView() {
    const leaves = this.app.workspace.getLeavesOfType(
      ACTA_PROMISELAND_VIEW_TYPE
    );
    if (leaves.length > 0) {
      return leaves[0].view;
    }
    return null;
  }
  refreshPromiseLandBoard() {
    const view = this.getActivePromiseLandView();
    if (view)
      view.refresh();
  }
  async openPromiseLandBoard() {
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
        active: true
      });
      this.app.workspace.revealLeaf(leaf);
    }
  }
  // ── Auto-commit on file changes ──
  getVaultRoot() {
    return this.app.vault.adapter.basePath;
  }
  runGit(cmd) {
    try {
      return (0, import_child_process2.execSync)(cmd, {
        cwd: this.getVaultRoot(),
        encoding: "utf-8",
        timeout: 15e3
      }).trim();
    } catch (e) {
      return "";
    }
  }
  setupAutoCommit() {
    this.autoCommitDebounced = (0, import_obsidian13.debounce)(
      () => this.runAutoCommitAndPush(),
      60 * 1e3,
      true
      // reset timer on each call
    );
    this.registerEvent(
      this.app.vault.on("modify", () => {
        var _a;
        return (_a = this.autoCommitDebounced) == null ? void 0 : _a.call(this);
      })
    );
    this.registerEvent(
      this.app.vault.on("create", () => {
        var _a;
        return (_a = this.autoCommitDebounced) == null ? void 0 : _a.call(this);
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", () => {
        var _a;
        return (_a = this.autoCommitDebounced) == null ? void 0 : _a.call(this);
      })
    );
    this.registerEvent(
      this.app.vault.on("rename", () => {
        var _a;
        return (_a = this.autoCommitDebounced) == null ? void 0 : _a.call(this);
      })
    );
  }
  runAutoCommitAndPush() {
    this.runGit("git pull --no-rebase origin main");
    const status = this.runGit("git status --porcelain");
    if (!status)
      return;
    const now = new Date();
    const timestamp = now.toISOString().replace(/\.\d{3}Z$/, "");
    this.runGit("git add -A");
    this.runGit(`git commit -m "vault: auto-save ${timestamp}"`);
    this.runGit("git push");
  }
  // ── Auto date-stamp new files ──
  setupDateStamping() {
    this.registerEvent(
      this.app.vault.on("create", (file) => {
        if (!(file instanceof import_obsidian13.TFile))
          return;
        if (!file.path.endsWith(".md"))
          return;
        if (file.path.startsWith(".obsidian/"))
          return;
        if (file.path.startsWith("PromiseLand/check-ins/"))
          return;
        setTimeout(() => this.stampDateProperty(file), 500);
      })
    );
  }
  async stampDateProperty(file) {
    try {
      const now = Date.now();
      if (now - file.stat.ctime > 1e4)
        return;
      const content = await this.app.vault.read(file);
      if (content.startsWith("---")) {
        const endIdx = content.indexOf("---", 3);
        if (endIdx > 0) {
          const frontmatter = content.substring(3, endIdx);
          if (/^date:/m.test(frontmatter))
            return;
        }
      }
      const nowDate = new Date();
      const dateStr = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, "0")}-${String(nowDate.getDate()).padStart(2, "0")}`;
      const timeStr = `${String(nowDate.getHours()).padStart(2, "0")}:${String(nowDate.getMinutes()).padStart(2, "0")}`;
      let newContent;
      if (content.startsWith("---")) {
        const endIdx = content.indexOf("---", 3);
        if (endIdx > 0) {
          const frontmatter = content.substring(3, endIdx);
          newContent = `---
date: ${dateStr}
time: ${timeStr}
${frontmatter.trim() ? frontmatter.trimEnd() + "\n" : ""}---${content.substring(endIdx + 3)}`;
        } else {
          newContent = `---
date: ${dateStr}
time: ${timeStr}
---
${content}`;
        }
      } else {
        newContent = `---
date: ${dateStr}
time: ${timeStr}
---
${content}`;
      }
      await this.app.vault.modify(file, newContent);
    } catch (e) {
    }
  }
};
