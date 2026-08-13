export interface FolderHighlighterSettings {
	autoScroll: boolean;
	useImportantTags: boolean;
	autoCollapseOtherFolders: boolean;
	lightHighlightedFolderColor: string;
	lightHighlightFolderTitleColor: boolean;
	lightHighlightedFolderTitleColor: string;
	lightHighlightedFolderTextColor: string;
	lightHighlightedParentFolderColor: string;
	lightHighlightedParentFolderTextColor: string;
	previousLightHighlightedFolderTitleColor: string;
	darkHighlightedFolderColor: string;
	darkHighlightFolderTitleColor: boolean;
	darkHighlightedFolderTitleColor: string;
	darkHighlightedFolderTextColor: string;
	darkHighlightedParentFolderColor: string;
	darkHighlightedParentFolderTextColor: string;
	previousDarkHighlightedFolderTitleColor: string;
	highlightParentFolder: boolean;
	highlightedFolderBorderRadius: string;
	highlightedParentFolderBorderRadius: string;
	highlightedFolderFontWeight: string;
	highlightedParentFolderFontWeight: string;
	editingDarkTheme: boolean;
}

export const DEFAULT_SETTINGS: FolderHighlighterSettings = {
	autoScroll: true,
	useImportantTags: false,
	autoCollapseOtherFolders: false,
	lightHighlightedFolderColor: "rgba(238, 238, 238, 1)",
	lightHighlightFolderTitleColor: false,
	lightHighlightedFolderTitleColor: "rgba(255, 255, 255, 0)",
	lightHighlightedFolderTextColor: "rgba(0, 0, 0, 1)",
	lightHighlightedParentFolderColor: "rgba(221, 221, 221, 1)",
	lightHighlightedParentFolderTextColor: "rgba(0, 0, 0, 1)",
	previousLightHighlightedFolderTitleColor: "rgba(255, 255, 255, 0.8)",
	darkHighlightedFolderColor: "rgba(51, 51, 51, 1)",
	darkHighlightFolderTitleColor: false,
	darkHighlightedFolderTitleColor: "rgba(51, 51, 51, 1)",
	darkHighlightedFolderTextColor: "rgba(255, 255, 255, 1)",
	darkHighlightedParentFolderColor: "rgba(68, 68, 68, 1)",
	darkHighlightedParentFolderTextColor: "rgba(255, 255, 255, 1)",
	previousDarkHighlightedFolderTitleColor: "rgba(51, 51, 51, 1)",
	highlightParentFolder: false,
	highlightedFolderBorderRadius: "5px",
	highlightedParentFolderBorderRadius: "5px",
	highlightedFolderFontWeight: "bold",
	highlightedParentFolderFontWeight: "bold",
	editingDarkTheme: document.body.classList.contains("theme-dark"),
};
