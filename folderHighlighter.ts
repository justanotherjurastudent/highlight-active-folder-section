import { MarkdownView, Plugin } from "obsidian";
import { FolderHighlighterSettings, DEFAULT_SETTINGS } from "./settings";
import { FolderHighlighterSettingTab } from "./folderHighlighterSettingTab";

export default class FolderHighlighter extends Plugin {
	settings: FolderHighlighterSettings;
	private debounceTimer: NodeJS.Timeout | undefined;
	private isProcessing: boolean = false;
	private operationQueue: Array<() => Promise<void>> = [];
	private lastExplorerClickTime = 0;
	private readonly USER_INTERACTION_DEBOUNCE = 300;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new FolderHighlighterSettingTab(this.app, this));
		this.updateStyles();

		this.registerEvent(
			this.app.workspace.on("file-open", () =>
				this.debouncedHandleFileChange()
			)
		);
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () =>
				this.debouncedHandleFileChange()
			)
		);

		this.app.workspace.onLayoutReady(() => {
			this.addFileExplorerClickListener();
			setTimeout(() => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile)
					this.queueOperation(() => this.executeSequentially());
			}, 1000);
		});

		this.registerEvent(
			this.app.workspace.on("layout-change", () =>
				this.addFileExplorerClickListener()
			)
		);
	}

	private addFileExplorerClickListener() {
		const explorerLeaf =
			this.app.workspace.getLeavesOfType("file-explorer")[0];
		if (explorerLeaf && (explorerLeaf.view as any).containerEl) {
			this.registerDomEvent(
				(explorerLeaf.view as any).containerEl,
				"click",
				() => {
					this.lastExplorerClickTime = Date.now();
				}
			);
		}
	}

	private getParentPath = (filePath: string): string => {
		const parts = filePath.split("/");
		parts.pop();
		return parts.join("/");
	};

	private debouncedHandleFileChange() {
		if (this.debounceTimer) clearTimeout(this.debounceTimer);
		this.debounceTimer = setTimeout(
			() => this.queueOperation(() => this.executeSequentially()),
			150
		);
	}

	private async queueOperation(operation: () => Promise<void>) {
		this.operationQueue.push(operation);
		if (!this.isProcessing) await this.processQueue();
	}

	private async processQueue() {
		if (this.isProcessing || this.operationQueue.length === 0) return;
		this.isProcessing = true;
		try {
			const lastOperation = this.operationQueue.pop();
			this.operationQueue = [];
			if (lastOperation) await lastOperation();
		} catch (error) {
			console.error("Error processing operation queue:", error);
		} finally {
			this.isProcessing = false;
		}
	}

	private async executeSequentially(): Promise<void> {
		try {
			const newFile = this.app.workspace.getActiveFile();
			if (!newFile) return;

			const now = Date.now();
			const isRecentUserInteraction =
				now - this.lastExplorerClickTime <
				this.USER_INTERACTION_DEBOUNCE;

			if (
				this.settings.autoCollapseOtherFolders &&
				!isRecentUserInteraction
			) {
				await this.collapseFolders(newFile.path);
				await new Promise((resolve) => setTimeout(resolve, 50));
			}

			if (this.settings.autoScroll && !isRecentUserInteraction) {
				await this.scrollToActiveFile();
				await new Promise((resolve) => setTimeout(resolve, 50));
			}

			this.highlightFolders();
			
			// Only restore focus to editor if no other element (like title input) currently has focus
			const activeElement = document.activeElement;
			const shouldRestoreFocus = 
				!activeElement || 
				activeElement === document.body || 
				activeElement.tagName === 'DIV';
			
			if (shouldRestoreFocus) {
				const activeView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView?.editor) activeView.editor.focus();
			}
		} catch (error) {
			console.error("Error in executeSequentially:", error);
		}
	}

	private async collapseFolders(activeFilePath: string): Promise<void> {
		const fileExplorerView = this.app.workspace.getLeavesOfType(
			"file-explorer"
		)[0]?.view as any;
		if (!fileExplorerView || !fileExplorerView.containerEl) return;

		const pathsToKeepOpen = new Set<string>();
		let currentPath = "";
		for (const segment of this.getParentPath(activeFilePath).split("/")) {
			if (!segment && currentPath !== "") continue;
			currentPath = currentPath ? `${currentPath}/${segment}` : segment;
			pathsToKeepOpen.add(currentPath);
		}

		const allFolders =
			fileExplorerView.containerEl.querySelectorAll(".nav-folder");
		allFolders.forEach((folderEl: HTMLElement) => {
			const folderTitleEl = folderEl.querySelector(
				".nav-folder-title"
			) as HTMLElement;
			if (!folderTitleEl) return;
			const folderPath = folderTitleEl.getAttribute("data-path");
			const isCollapsed = folderEl.classList.contains("is-collapsed");
			if (folderPath && pathsToKeepOpen.has(folderPath)) {
				if (isCollapsed) folderTitleEl.click();
			} else {
				if (!isCollapsed) folderTitleEl.click();
			}
		});
	}

	private async scrollToActiveFile(): Promise<void> {
		return new Promise((resolve) => {
			setTimeout(() => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) return resolve();
				const fileEl = document.querySelector(
					`[data-path="${activeFile.path}"]`
				);
				if (fileEl)
					fileEl.scrollIntoView({
						behavior: "smooth",
						block: "center",
					});
				resolve();
			}, 100);
		});
	}

	async onunload() {
		if (this.debounceTimer) clearTimeout(this.debounceTimer);
		this.operationQueue = [];
		this.isProcessing = false;
	}

	highlightFolders() {
		document
			.querySelectorAll(
				".nav-folder.highlighted-folder, .nav-folder.highlighted-parent-folder"
			)
			.forEach((el) =>
				el.classList.remove(
					"highlighted-folder",
					"highlighted-parent-folder"
				)
			);
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) return;
		const currentFolder = this.getParentFolderElement(activeFile.path);
		if (currentFolder) {
			currentFolder.classList.add("highlighted-folder");
			if (this.settings.highlightParentFolder) {
				const rootFolder = this.getRootFolderInPath(activeFile.path);
				if (rootFolder && rootFolder !== currentFolder) {
					rootFolder.classList.add("highlighted-parent-folder");
				}
			}
		}
	}

	getParentFolderElement = (filePath: string): Element | null => {
		const p = this.getParentPath(filePath);
		if (p) {
			const el = document.querySelector(`[data-path="${p}"]`);
			return el?.closest(".nav-folder") || null;
		}
		return null;
	};
	getRootFolderInPath = (filePath: string): Element | null => {
		const p = filePath.split("/")[0];
		return (
			document
				.querySelector(`[data-path="${p}"]`)
				?.closest(".nav-folder") || null
		);
	};
	getIntermediateFoldersInPath = (filePath: string): (Element | null)[] => {
		const i: (Element | null)[] = [];
		const p = this.getParentPath(filePath).split("/");
		while (p.length > 1) {
			p.pop();
			const n = p.join("/");
			const e = document.querySelector(`[data-path="${n}"]`);
			if (e) i.push(e.closest(".nav-folder"));
		}
		return i;
	};

	updateStyles() {
		const rootEl = document.documentElement;
		const important = this.settings.useImportantTags ? " !important" : "";
		const properties: Record<string, string> = {
			"--light-highlighted-folder-color":
				this.settings.lightHighlightedFolderColor,
			"--light-highlighted-folder-title-color":
				this.settings.lightHighlightedFolderTitleColor,
			"--light-highlighted-folder-text-color":
				this.settings.lightHighlightedFolderTextColor,
			"--light-highlighted-parent-folder-color":
				this.settings.lightHighlightedParentFolderColor,
			"--light-highlighted-parent-folder-text-color":
				this.settings.lightHighlightedParentFolderTextColor,
			"--dark-highlighted-folder-color":
				this.settings.darkHighlightedFolderColor,
			"--dark-highlighted-folder-title-color":
				this.settings.darkHighlightedFolderTitleColor,
			"--dark-highlighted-folder-text-color":
				this.settings.darkHighlightedFolderTextColor,
			"--dark-highlighted-parent-folder-color":
				this.settings.darkHighlightedParentFolderColor,
			"--dark-highlighted-parent-folder-text-color":
				this.settings.darkHighlightedParentFolderTextColor,
			"--fh-folder-border-radius": `${this.settings.highlightedFolderBorderRadius}${important}`,
			"--fh-folder-font-weight": `${this.settings.highlightedFolderFontWeight}${important}`,
			"--fh-parent-folder-border-radius": `${this.settings.highlightedParentFolderBorderRadius}${important}`,
			"--fh-parent-folder-font-weight": `${this.settings.highlightedParentFolderFontWeight}${important}`,
		};
		Object.entries(properties).forEach(([key, value]) =>
			rootEl.style.setProperty(key, value)
		);
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}
	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.updateStyles();
		this.highlightFolders();
	}
}
