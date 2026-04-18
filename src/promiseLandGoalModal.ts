import { App, Modal, Setting } from "obsidian";

export class PromiseLandGoalModal extends Modal {
	private goalText = "";
	private timeWindowDays = 30;
	private goalContext = "";
	private checkInFolder = "PromiseLand/check-ins";
	private onSubmit: (goalText: string, timeWindowDays: number, context: string, checkInFolder: string) => void;

	constructor(app: App, onSubmit: (goalText: string, timeWindowDays: number, context: string, checkInFolder: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h3", { text: "Set Your Promise Land" });
		contentEl.createEl("p", {
			text: "Define your goal and lock it in. The goal cannot be changed — only archived and replaced.",
			cls: "setting-item-description",
		});

		new Setting(contentEl)
			.setName("Goal")
			.setDesc("What are you working toward?")
			.addTextArea((text) =>
				text
					.setPlaceholder("e.g., Land a Post-Training Research Engineer role")
					.onChange((value) => {
						this.goalText = value;
					})
			);

		new Setting(contentEl)
			.setName("Time window (days)")
			.setDesc("How many days to reach this goal?")
			.addText((text) =>
				text
					.setPlaceholder("30")
					.setValue("30")
					.onChange((value) => {
						const num = parseInt(value, 10);
						if (!isNaN(num) && num > 0) {
							this.timeWindowDays = num;
						}
					})
			);

		new Setting(contentEl)
			.setName("Check-in folder")
			.setDesc("Where to save check-in notes for this goal")
			.addText((text) =>
				text
					.setPlaceholder("PromiseLand/check-ins")
					.setValue(this.checkInFolder)
					.onChange((value) => {
						this.checkInFolder = value.trim() || "PromiseLand/check-ins";
					})
			);

		new Setting(contentEl)
			.setName("Context / Reference")
			.setDesc("Paste job postings, links, skill requirements, or any reference material that defines what this goal looks like.")
			.addTextArea((text) =>
				text
					.setPlaceholder("e.g., Job posting URL, required skills, key milestones...")
					.onChange((value) => {
						this.goalContext = value;
					})
			);

		// Make the context textarea larger
		const contextTextarea = contentEl.querySelector(".setting-item:nth-child(4) textarea");
		if (contextTextarea instanceof HTMLTextAreaElement) {
			contextTextarea.rows = 6;
		}

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Lock It In")
					.setCta()
					.onClick(() => {
						if (this.goalText.trim().length === 0) return;
						this.onSubmit(this.goalText.trim(), this.timeWindowDays, this.goalContext.trim(), this.checkInFolder);
						this.close();
					})
			);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

export class PromiseLandEditFolderModal extends Modal {
	private folderValue: string;
	private onSubmit: (folder: string) => void;

	constructor(app: App, currentFolder: string, onSubmit: (folder: string) => void) {
		super(app);
		this.folderValue = currentFolder;
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h3", { text: "Check-in Folder" });
		contentEl.createEl("p", {
			text: "Set the folder where check-in notes are saved for this goal.",
			cls: "setting-item-description",
		});

		new Setting(contentEl)
			.setName("Folder path")
			.addText((text) =>
				text
					.setPlaceholder("PromiseLand/check-ins")
					.setValue(this.folderValue)
					.onChange((value) => {
						this.folderValue = value;
					})
			);

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Save")
					.setCta()
					.onClick(() => {
						this.onSubmit(this.folderValue.trim());
						this.close();
					})
			);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

export class PromiseLandEditContextModal extends Modal {
	private contextValue: string;
	private onSubmit: (context: string) => void;

	constructor(app: App, currentContext: string, onSubmit: (context: string) => void) {
		super(app);
		this.contextValue = currentContext;
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h3", { text: "Edit Goal Context" });
		contentEl.createEl("p", {
			text: "Paste job postings, links, skill requirements, or any reference material that defines what this goal looks like.",
			cls: "setting-item-description",
		});

		const textarea = contentEl.createEl("textarea", {
			cls: "acta-promiseland-context-textarea",
			attr: { placeholder: "e.g., Job posting URL, required skills, key milestones...", rows: "8" },
		});
		textarea.value = this.contextValue;
		textarea.style.width = "100%";
		textarea.addEventListener("input", () => {
			this.contextValue = textarea.value;
		});

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Save")
					.setCta()
					.onClick(() => {
						this.onSubmit(this.contextValue.trim());
						this.close();
					})
			);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
