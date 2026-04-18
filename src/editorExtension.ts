import {
	EditorView,
	Decoration,
	DecorationSet,
	ViewPlugin,
	ViewUpdate,
	WidgetType,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { TaskManager } from "./taskManager";
import { TFile } from "obsidian";

class AddTaskWidget extends WidgetType {
	constructor(
		private taskManager: TaskManager,
		private file: TFile,
		private line: number,
		private onAdd: () => void
	) {
		super();
	}

	toDOM(): HTMLElement {
		const span = document.createElement("span");
		span.className = "promiseland-add-button";
		span.textContent = "+";
		span.title = "Add to task board";

		span.addEventListener("click", async (e) => {
			e.preventDefault();
			e.stopPropagation();

			const task = await this.taskManager.getTaskAtPosition(
				this.file,
				this.line
			);
			if (task) {
				const success = await this.taskManager.addTask(task);
				if (success) {
					this.onAdd();
				}
			}
		});

		return span;
	}

	ignoreEvent(): boolean {
		return false;
	}
}

function createEditorExtension(
	taskManager: TaskManager,
	onTaskAdded: () => void
) {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;

			constructor(view: EditorView) {
				this.decorations = this.buildDecorations(view);
			}

			update(update: ViewUpdate) {
				if (
					update.docChanged ||
					update.viewportChanged ||
					update.selectionSet
				) {
					this.decorations = this.buildDecorations(update.view);
				}
			}

			buildDecorations(view: EditorView): DecorationSet {
				const builder = new RangeSetBuilder<Decoration>();
				const file = (view as any).file;

				if (!(file instanceof TFile)) {
					return builder.finish();
				}

				const doc = view.state.doc;

				for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
					const line = doc.line(lineNum);
					const lineText = line.text;

					// Check if line has marker emoji
					if (!taskManager.hasMarkerEmoji(lineText)) continue;

					// Check if already added
					const taskId = `${file.path}:${lineNum - 1}`;
					if (taskManager.isTaskAdded(taskId)) continue;

					// Add widget at end of line
					const widget = Decoration.widget({
						widget: new AddTaskWidget(
							taskManager,
							file,
							lineNum - 1,
							onTaskAdded
						),
						side: 1,
					});

					builder.add(line.to, line.to, widget);
				}

				return builder.finish();
			}
		},
		{
			decorations: (v) => v.decorations,
		}
	);
}

export { createEditorExtension };
