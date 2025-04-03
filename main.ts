import { App, MarkdownView, Plugin, PluginSettingTab, Setting } from "obsidian";

interface FolderHighlighterSettings {
    autoScroll: boolean;
    useImportantTags: boolean;

    // Light Mode Colors
    lightHighlightedFolderColor: string;
    lightHighlightFolderTitleColor: boolean;
    lightHighlightedFolderTitleColor: string;
    lightHighlightedFolderTextColor: string;
    lightHighlightedParentFolderColor: string;
    lightHighlightedParentFolderTextColor: string;
	previousLightHighlightedFolderTitleColor: string;

    // Dark Mode Colors
    darkHighlightedFolderColor: string;
    darkHighlightFolderTitleColor: boolean;
    darkHighlightedFolderTitleColor: string;
    darkHighlightedFolderTextColor: string;
    darkHighlightedParentFolderColor: string;
    darkHighlightedParentFolderTextColor: string;
	previousDarkHighlightedFolderTitleColor: string;

    // Shared Settings
    highlightParentFolder: boolean;
    highlightedFolderBorderRadius: string;
    highlightedParentFolderBorderRadius: string;
    highlightedFolderFontWeight: string;
    highlightedParentFolderFontWeight: string;

    // UI state
    editingDarkTheme: boolean;
}

const DEFAULT_SETTINGS: FolderHighlighterSettings = {
    autoScroll: true,
    useImportantTags: false,

    // Light Theme Defaults
    lightHighlightedFolderColor: "rgba(238, 238, 238, 1)",
    lightHighlightFolderTitleColor: false,
    lightHighlightedFolderTitleColor: "rgba(255, 255, 255, 0)",
    lightHighlightedFolderTextColor: "rgba(0, 0, 0, 1)",
    lightHighlightedParentFolderColor: "rgba(221, 221, 221, 1)",
    lightHighlightedParentFolderTextColor: "rgba(0, 0, 0, 1)",
	previousLightHighlightedFolderTitleColor: "rgba(255, 255, 255, 0.8)",

    // Dark Theme Defaults
    darkHighlightedFolderColor: "rgba(51, 51, 51, 1)",
    darkHighlightFolderTitleColor: false,
    darkHighlightedFolderTitleColor: "rgba(51, 51, 51, 1)",
    darkHighlightedFolderTextColor: "rgba(255, 255, 255, 1)",
    darkHighlightedParentFolderColor: "rgba(68, 68, 68, 1)",
    darkHighlightedParentFolderTextColor: "rgba(255, 255, 255, 1)",
	previousDarkHighlightedFolderTitleColor: "rgba(51, 51, 51, 1)",

    // Shared Settings
	highlightParentFolder: false,
    highlightedFolderBorderRadius: "5px",
    highlightedParentFolderBorderRadius: "5px",
    highlightedFolderFontWeight: "bold",
    highlightedParentFolderFontWeight: "bold",

    // UI State - automatisch den aktuellen Theme-Modus erkennen
    editingDarkTheme: document.body.classList.contains("theme-dark"),
};

export default class FolderHighlighter extends Plugin {
	settings: FolderHighlighterSettings;
	private styleEl: HTMLStyleElement | null = null;
	private revealTimeout: NodeJS.Timeout | undefined;
	private debounceTimer: NodeJS.Timeout | undefined;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new FolderHighlighterSettingTab(this.app, this));
		this.updateStyles();
	
		// For reveal functionality
		this.registerEvent(
			this.app.workspace.on("file-open", () => {
				this.handleReveal();
			})
		);
	
		// Only for highlighting
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
						this.highlightFolders();
					})
		);
	
		// Initial setup when Obsidian starts
		this.app.workspace.onLayoutReady(() => {
			this.highlightFolders();
			
			// Reveal active file and then return focus to editor
			setTimeout(() => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					// First reveal the file in explorer
					this.revealActiveFileInExplorer();
					
					// Then return focus to the editor after a short delay
					setTimeout(() => {
						const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
						if (activeView && activeView.editor) {
							activeView.editor.focus();
						}

					}, 300);
				}
			}, 500);
		});

	}
	
	private handleReveal() {
		if (this.debounceTimer) clearTimeout(this.debounceTimer);
		this.debounceTimer = setTimeout(() => {
			const file = this.app.workspace.getActiveFile();
			if (!file) return;
			this.revealActiveFileInExplorer();
		}, 150);
	}
	
	/*private handleHighlight() {
		const file = this.app.workspace.getActiveFile();
		if (!file) return;
		this.highlightFolders();
	} */

	private async revealActiveFileInExplorer() {
		try {
			const file = this.app.workspace.getActiveFile();
			if (!file) return;
	
			const leaf = this.app.workspace.getLeavesOfType("file-explorer")[0];
			if (!leaf) return;
	
			const explorer = leaf.view as any;
			if (typeof explorer.revealInFolder !== "function") return;
	
			if (this.revealTimeout) {
				clearTimeout(this.revealTimeout);
			}
	
			explorer.revealInFolder(file);
			
			// Scroll to the file if auto-scroll is enabled
			if (this.settings.autoScroll) {
				this.revealTimeout = setTimeout(() => {
					const fileElement = document.querySelector(`[data-path="${file.path}"]`);
					if (!fileElement) return;
	
					const container = fileElement.closest('.nav-files-container');
					if (!(container instanceof HTMLElement)) return;
	
					const fileHTMLElement = fileElement as HTMLElement;
					container.scrollTo({
						top: fileHTMLElement.offsetTop - container.clientHeight / 2,
						behavior: 'smooth'
					});
				}, 200);
			}
		} catch (error) {
			console.error("Error revealing file:", error);
		}
	}
		
	
	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.updateStyles();
	}

	async onunload() {
		if (this.revealTimeout) clearTimeout(this.revealTimeout);
		if (this.debounceTimer) clearTimeout(this.debounceTimer);
		if (this.styleEl) this.styleEl.remove();
	}

	highlightFolders() {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			this.clearHighlight();	
			return;
		}
	
		// Remove all previous highlights
		const allFolders = document.querySelectorAll(".nav-folder");
		allFolders.forEach((folder) => {
			folder.classList.remove(
				"highlighted-folder",
				"highlighted-parent-folder",
				"highlighted-intermediate-folder"
			);
		});
	
		// Highlight the folder containing the active note
		const currentFolder = this.getParentFolderElement(activeFile.path);
		if (currentFolder) {
			currentFolder.classList.add("highlighted-folder");
	
			// Highlight the root folder in the path to the active note
			if (this.settings.highlightParentFolder) {
				const rootFolder = this.getRootFolderInPath(activeFile.path);
				if (rootFolder && rootFolder !== currentFolder) {
					rootFolder.classList.add("highlighted-parent-folder");
				}
			}
	
			// Highlight intermediate folders if necessary
			const intermediateFolders = this.getIntermediateFoldersInPath(
				activeFile.path
			);
			for (const intermediateFolder of intermediateFolders) {
				if (intermediateFolder && 
					intermediateFolder !== currentFolder && 
					(!this.settings.highlightParentFolder || intermediateFolder !== this.getRootFolderInPath(activeFile.path))) {
					intermediateFolder.classList.add(
						"highlighted-intermediate-folder"
					);
				}
			}
		}
	}	

	clearHighlight() {
		document.querySelectorAll(".highlighted-folder").forEach((el) => {
		el.classList.remove("highlighted-folder", "highlighted-parent-folder");
		});
	}

	getParentFolderElement(filePath: string): Element | null {
		const folderPaths = filePath.split("/");
		folderPaths.pop();
		let folderElement: Element | null = null;

		while (folderPaths.length > 0) {
			const folderName = folderPaths.join("/");
			const possibleFolderElement = document.querySelector(
				`[data-path="${folderName}"]`
			);
			if (possibleFolderElement) {
				folderElement = possibleFolderElement.closest(".nav-folder");
				break;
			}
			folderPaths.pop();
		}

		return folderElement;
	}

	getRootFolderInPath(filePath: string): Element | null {
		const folderPaths = filePath.split("/");
		folderPaths.pop();

		if (folderPaths.length > 0) {
			const rootFolderName = folderPaths[0];
			return (
				document
					.querySelector(`[data-path="${rootFolderName}"]`)
					?.closest(".nav-folder") || null
			);
		}

		return null;
	}

	getIntermediateFoldersInPath(filePath: string) {
		const intermediateFolders = [];
		const folderPaths = filePath.split("/");
		folderPaths.pop();

		while (folderPaths.length > 1) {
			const folderName = folderPaths.join("/");
			const folderElement = document.querySelector(
				`[data-path="${folderName}"]`
			);
			if (folderElement) {
				intermediateFolders.push(folderElement.closest(".nav-folder"));
			}
			folderPaths.pop();
		}

		return intermediateFolders;
	}

	updateStyles() {
		const rootEl = document.documentElement;
		const important = this.settings.useImportantTags ? " !important" : "";
		
		// Light Theme Variablen
		rootEl.style.setProperty('--light-highlighted-folder-color', this.settings.lightHighlightedFolderColor);
		rootEl.style.setProperty('--light-highlighted-folder-title-color', this.settings.lightHighlightedFolderTitleColor);
		rootEl.style.setProperty('--light-highlighted-folder-text-color', this.settings.lightHighlightedFolderTextColor);
		rootEl.style.setProperty('--light-highlighted-parent-folder-color', this.settings.lightHighlightedParentFolderColor);
		rootEl.style.setProperty('--light-highlighted-parent-folder-text-color', this.settings.lightHighlightedParentFolderTextColor);
	
		// Dark Theme Variablen
		rootEl.style.setProperty('--dark-highlighted-folder-color', this.settings.darkHighlightedFolderColor);
		rootEl.style.setProperty('--dark-highlighted-folder-title-color', this.settings.darkHighlightedFolderTitleColor);
		rootEl.style.setProperty('--dark-highlighted-folder-text-color', this.settings.darkHighlightedFolderTextColor);
		rootEl.style.setProperty('--dark-highlighted-parent-folder-color', this.settings.darkHighlightedParentFolderColor);
		rootEl.style.setProperty('--dark-highlighted-parent-folder-text-color', this.settings.darkHighlightedParentFolderTextColor);
	
		// Gemeinsame Variablen mit expliziter Formatierung
		rootEl.style.setProperty('--highlighted-folder-border-radius', `${this.settings.highlightedFolderBorderRadius}${important}`);
		rootEl.style.setProperty('--highlighted-parent-folder-border-radius', `${this.settings.highlightedParentFolderBorderRadius}`);
		rootEl.style.setProperty('--highlighted-folder-font-weight', `${this.settings.highlightedFolderFontWeight}${important}`);
		rootEl.style.setProperty('--highlighted-parent-folder-font-weight', `${this.settings.highlightedParentFolderFontWeight}${important}`);

		const borderRadiusValue = parseInt(this.settings.highlightedParentFolderBorderRadius);
		if (borderRadiusValue > 30) {
			rootEl.style.setProperty('--parent-folder-padding', '7px');
		} else {
			rootEl.style.setProperty('--parent-folder-padding', '3px');
		}
		
		// Direkte CSS-Regeln für kritische Werte (als Fallback)
		const styleSheet = document.createElement('style');
		styleSheet.textContent = `
			.highlighted-folder > .nav-folder-title {
				font-weight: ${this.settings.highlightedFolderFontWeight}${important};
				border-radius: ${this.settings.highlightedFolderBorderRadius}${important};
			}
			.highlighted-parent-folder > .nav-folder-title {
				font-weight: ${this.settings.highlightedParentFolderFontWeight}${important};
				border-radius: ${this.settings.highlightedParentFolderBorderRadius}${important};
			}
		`;
		document.head.appendChild(styleSheet);
		
		// Important-Marker für Farben, falls aktiviert
		if (this.settings.useImportantTags) {
			const addImportant = (variable: string) => {
				const value = getComputedStyle(rootEl).getPropertyValue(variable);
				if (value && !value.includes('!important')) {
					rootEl.style.setProperty(variable, value + ' !important');
				}
			};
			
			// Alle Farbvariablen mit !important markieren
			[
				'--light-highlighted-folder-color',
				'--light-highlighted-folder-title-color',
				'--light-highlighted-folder-text-color',
				'--light-highlighted-parent-folder-color',
				'--light-highlighted-parent-folder-text-color',
				'--dark-highlighted-folder-color',
				'--dark-highlighted-folder-title-color',
				'--dark-highlighted-folder-text-color',
				'--dark-highlighted-parent-folder-color',
				'--dark-highlighted-parent-folder-text-color'
			].forEach(addImportant);
		}
	}
}	

class FolderHighlighterSettingTab extends PluginSettingTab {
    plugin: FolderHighlighter;
    themeToggleButton: HTMLElement;
    colorSettings: Array<HTMLElement> = [];

    constructor(app: App, plugin: FolderHighlighter) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        this.colorSettings = [];

        // Theme Header
        const themeHeaderEl = containerEl.createEl('div', { cls: 'theme-header' });
        themeHeaderEl.createEl('h2', { 
            text: this.plugin.settings.editingDarkTheme ? 'Dark Theme' : 'Light Theme', 
            cls: 'theme-title' 
        });

        this.themeToggleButton = themeHeaderEl.createEl('div', { cls: 'theme-toggle-button' });
        this.updateThemeToggleIcon();

        // Theme Toggle Handler mit einer einzelnen Animation
		this.themeToggleButton.addEventListener('click', async () => {
			// Nur Animation auf Container-Ebene anwenden
			this.containerEl.addClass('theme-transition');
			
			// Themawechsel
			this.plugin.settings.editingDarkTheme = !this.plugin.settings.editingDarkTheme;
			await this.plugin.saveSettings();
			
			// Verzögerung für Animation
			setTimeout(() => {
				this.display();
				
				// Animation nach Abschluss entfernen
				setTimeout(() => {
					this.containerEl.removeClass('theme-transition');
				}, 850);
			}, 150);
		});


        // Allgemeine Einstellungen
        this.createGeneralSettings(containerEl);
        
        // Aktiver Ordner Einstellungen
        this.createActiveFolderSettings(containerEl);

        // Root-Ordner Einstellungen
        this.createRootFolderSettings(containerEl);
    }

    private createGeneralSettings(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName("Override theme styles")
            .setDesc("Use !important for style definitions")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.useImportantTags)
                .onChange(async (value) => {
                    this.plugin.settings.useImportantTags = value;
                    await this.plugin.saveSettings();
                    this.plugin.updateStyles();
                }));

        new Setting(containerEl)
            .setName("Auto scroll")
            .setDesc("Automatically scroll to active file")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoScroll)
                .onChange(async (value) => {
                    this.plugin.settings.autoScroll = value;
                    await this.plugin.saveSettings();
                }));
    }

    private createActiveFolderSettings(containerEl: HTMLElement) {
        new Setting(containerEl).setName("Active Folder").setHeading();

        // Folder Title Background Toggle
        const settingContainer = containerEl.createEl('div', { cls: 'setting-indent' });
        
        new Setting(settingContainer)
			.setName("Enable title background")
			.setDesc("Show background color for folder titles")
			.addToggle(toggle => toggle
				.setValue(this.getCurrentThemeSetting('HighlightFolderTitleColor'))
				.onChange(async (value) => {
					// Setze den Boolean-Wert
					this.setThemeSetting('HighlightFolderTitleColor', value);
					
					if (!value) {
						// Beim Deaktivieren: Sichere aktuelle Werte und setze auf transparent
						this.plugin.settings.previousLightHighlightedFolderTitleColor = 
							this.plugin.settings.lightHighlightedFolderTitleColor;
						this.plugin.settings.previousDarkHighlightedFolderTitleColor = 
							this.plugin.settings.darkHighlightedFolderTitleColor;
						
						this.plugin.settings.lightHighlightedFolderTitleColor = "rgba(0, 0, 0, 0)";
						this.plugin.settings.darkHighlightedFolderTitleColor = "rgba(0, 0, 0, 0)";
					} else {
						// Beim Aktivieren: Stelle gespeicherte Werte wieder her oder nutze Standardwerte
						if (this.plugin.settings.previousLightHighlightedFolderTitleColor && 
							this.plugin.settings.previousLightHighlightedFolderTitleColor !== "rgba(0, 0, 0, 0)") {
							this.plugin.settings.lightHighlightedFolderTitleColor = 
								this.plugin.settings.previousLightHighlightedFolderTitleColor;
						} else {
							this.plugin.settings.lightHighlightedFolderTitleColor = 
								DEFAULT_SETTINGS.lightHighlightedFolderTitleColor;
						}
						
						if (this.plugin.settings.previousDarkHighlightedFolderTitleColor && 
							this.plugin.settings.previousDarkHighlightedFolderTitleColor !== "rgba(0, 0, 0, 0)") {
							this.plugin.settings.darkHighlightedFolderTitleColor = 
								this.plugin.settings.previousDarkHighlightedFolderTitleColor;
						} else {
							this.plugin.settings.darkHighlightedFolderTitleColor = 
								DEFAULT_SETTINGS.darkHighlightedFolderTitleColor;
						}
					}
					
					await this.plugin.saveSettings();
					this.plugin.updateStyles();
					this.plugin.highlightFolders();
					this.display();
				}));




        // Conditional Color Settings
        if (this.getCurrentThemeSetting('HighlightFolderTitleColor')) {
            this.createColorSetting(
                settingContainer,
                "Title background color",
                "Color for folder title background",
                "HighlightedFolderTitleColor"
            );
        }

        // Common Active Folder Settings
        this.createColorSetting(
            settingContainer,
            "Folder background",
            "Background color for folder container",
            "HighlightedFolderColor"
        );

        this.createColorSetting(
            settingContainer,
            "Text color",
            "Color for folder items",
            "HighlightedFolderTextColor"
        );

        new Setting(settingContainer)
            .setName("Font weight")
            .setDesc("Font weight for folder titles")
            .addDropdown(dropdown => dropdown
                .addOptions({"200": "Thin", "400": "Normal", "700": "Bold"})
                .setValue(this.plugin.settings.highlightedFolderFontWeight)
                .onChange(async (value) => {
                    this.plugin.settings.highlightedFolderFontWeight = value;
                    await this.plugin.saveSettings();
                    this.plugin.updateStyles();
                }));

        new Setting(settingContainer)
            .setName("Border radius")
            .setDesc("Corner rounding for folders")
            .addSlider(slider => slider
                .setLimits(0, 50, 1)
                .setValue(parseInt(this.plugin.settings.highlightedFolderBorderRadius))
                .onChange(async (value) => {
                    this.plugin.settings.highlightedFolderBorderRadius = `${value}px`;
                    await this.plugin.saveSettings();
                    this.plugin.updateStyles();
                })
                .setDynamicTooltip());
    }

    private createRootFolderSettings(containerEl: HTMLElement) {
        new Setting(containerEl).setName("Root Folder").setHeading();

        new Setting(containerEl)
            .setName("Highlight root folders")
            .setDesc("Enable special styling for root folders")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.highlightParentFolder)
                .onChange(async (value) => {
                    this.plugin.settings.highlightParentFolder = value;
                    await this.plugin.saveSettings();
                    this.plugin.highlightFolders(); // Sofort aktualisieren
                    this.display();
                }));

        if (this.plugin.settings.highlightParentFolder) {
            const settingContainer = containerEl.createEl('div', { cls: 'setting-indent' });
            
            this.createColorSetting(
                settingContainer,
                "Root background",
                "Background color for root folders",
                "HighlightedParentFolderColor"
            );

            this.createColorSetting(
                settingContainer,
                "Root text color",
                "Text color for root folders",
                "HighlightedParentFolderTextColor"
            );

            new Setting(settingContainer)
                .setName("Root font weight")
                .setDesc("Font weight for root folders")
                .addDropdown(dropdown => dropdown
                    .addOptions({"200": "Thin", "400": "Normal", "700": "Bold"})
                    .setValue(this.plugin.settings.highlightedParentFolderFontWeight)
                    .onChange(async (value) => {
                        this.plugin.settings.highlightedParentFolderFontWeight = value;
                        await this.plugin.saveSettings();
                        this.plugin.updateStyles();
                    }));

            new Setting(settingContainer)
                .setName("Root border radius")
                .setDesc("Corner rounding for root folders")
                .addSlider(slider => slider
                    .setLimits(0, 50, 1)
                    .setValue(parseInt(this.plugin.settings.highlightedParentFolderBorderRadius))
                    .onChange(async (value) => {
                        this.plugin.settings.highlightedParentFolderBorderRadius = `${value}px`;
                        await this.plugin.saveSettings();
                        this.plugin.updateStyles();
                    })
                    .setDynamicTooltip());
        }
    }

	private createColorSetting(containerEl: HTMLElement, name: string, desc: string, baseKey: string) {
		const prefix = this.plugin.settings.editingDarkTheme ? 'dark' : 'light';
		const key = `${prefix}${baseKey}` as keyof FolderHighlighterSettings;
		const value = this.plugin.settings[key] as string;
		const defaultKey = `${prefix}${baseKey}` as keyof typeof DEFAULT_SETTINGS;
		const defaultValue = DEFAULT_SETTINGS[defaultKey];
	
		// Extrahiere Farbe und Alpha-Wert
		const rgba = this.extractRgbaComponents(value);
		const alpha = rgba.a;
	
		// Erstelle Setting mit ColorPicker und Reset-Button
		const settingEl = new Setting(containerEl)
			.setName(name)
			.setDesc(desc)
			.addColorPicker(color => color
				.setValue(this.rgbToHex(rgba))
				.onChange(async (newColor) => {
					// Konvertiere Hex zu RGB und kombiniere mit bestehendem Alpha
					const newRgb = this.hexToRgb(newColor);
					const newRgba = `rgba(${newRgb.r}, ${newRgb.g}, ${newRgb.b}, ${alpha})`;
					
					(this.plugin.settings[key] as any) = newRgba;
					await this.plugin.saveSettings();
					this.plugin.updateStyles();
				}))
			.addExtraButton(button => button
				.setIcon("reset")
				.setTooltip("Reset to default value")
				.onClick(async () => {
					(this.plugin.settings[key] as any) = defaultValue;
					await this.plugin.saveSettings();
					this.plugin.updateStyles();
					this.display(); // Einstellungsansicht aktualisieren
				}));
	
		// Für die Animation    
		this.colorSettings.push(settingEl.settingEl);
	
		// Füge separaten Transparenz-Slider hinzu
		const transparencyContainer = containerEl.createEl('div', { 
			cls: 'transparency-slider-container' 
		});
		
		transparencyContainer.createEl('div', {
			cls: 'setting-item-info',
			text: 'Transparency'
		});
		
		const slider = transparencyContainer.createEl('input', {
			cls: 'transparency-slider',
			attr: {
				type: 'range',
				min: '0',
				max: '100',
				value: Math.round((1 - alpha) * 100).toString()
			}
		});
		
		const valueDisplay = transparencyContainer.createEl('span', {
			cls: 'transparency-value',
			text: `${Math.round((1 - alpha) * 100)}%`
		});
		
		slider.addEventListener('input', async (e) => {
			const target = e.target as HTMLInputElement;
			const transparencyValue = parseInt(target.value);
			const newAlpha = 1 - (transparencyValue / 100);
			
			// Aktualisiere Anzeige
			valueDisplay.textContent = `${transparencyValue}%`;
			
			// Extrahiere aktuelle RGB-Werte und aktualisiere nur Alpha
			const currentRgba = this.extractRgbaComponents(this.plugin.settings[key] as string);
			const newRgba = `rgba(${currentRgba.r}, ${currentRgba.g}, ${currentRgba.b}, ${newAlpha})`;
			
			(this.plugin.settings[key] as any) = newRgba;
			await this.plugin.saveSettings();
			this.plugin.updateStyles();
		});
		
		return settingEl;
	}
	
	
	// Helper-Methoden für die Farbverarbeitung
	private extractRgbaComponents(rgba: string): { r: number, g: number, b: number, a: number } {
		const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
		if (match) {
			return {
				r: parseInt(match[1]),
				g: parseInt(match[2]),
				b: parseInt(match[3]),
				a: match[4] ? parseFloat(match[4]) : 1
			};
		}
		return { r: 0, g: 0, b: 0, a: 1 };
	}
	
	private hexToRgb(hex: string): { r: number, g: number, b: number } {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : { r: 0, g: 0, b: 0 };
	}
	
	private rgbToHex(rgba: { r: number, g: number, b: number }): string {
		return "#" + ((1 << 24) + (rgba.r << 16) + (rgba.g << 8) + rgba.b).toString(16).slice(1);
	}
	

    private getCurrentThemeSetting(key: string): boolean {
        const themeKey = this.plugin.settings.editingDarkTheme 
            ? `dark${key}`
            : `light${key}`;
        return this.plugin.settings[themeKey as keyof FolderHighlighterSettings] as boolean;
    }

    private setThemeSetting(key: string, value: boolean) {
        (this.plugin.settings[`dark${key}` as keyof FolderHighlighterSettings] as boolean) = value;
        (this.plugin.settings[`light${key}` as keyof FolderHighlighterSettings] as boolean) = value;
    }
    
    // Aktualisiert das Icon je nach Modus
    updateThemeToggleIcon() {
        this.themeToggleButton.empty();
        
        if (this.plugin.settings.editingDarkTheme) {
            // Mond-Icon für Dunkel-Modus
            this.themeToggleButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-moon"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            `;
        } else {
            // Sonnen-Icon für Hell-Modus
            this.themeToggleButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-sun"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            `;
        }
    }

    // Fügt eine Farbvergleichsanzeige hinzu
    addColorComparison(containerEl: HTMLElement, currentColor: string, otherColor: string) {
        const comparisonEl = containerEl.createEl('div', { cls: 'color-comparison' });
        comparisonEl.createSpan({ text: `Im ${this.plugin.settings.editingDarkTheme ? 'hellen' : 'dunklen'} Theme: ` });
        
        // Farbvorschau-Element
        const colorPreview = comparisonEl.createEl('div', { cls: 'color-preview' });
        colorPreview.style.backgroundColor = otherColor;
        
        comparisonEl.createSpan({ text: otherColor });
    }
    
    // Aktualisiert die Farbvergleichsanzeige
    updateColorComparison(containerEl: HTMLElement, currentColor: string, otherColor: string) {
        const existingComparison = containerEl.querySelector('.color-comparison');
        if (existingComparison) {
            existingComparison.remove();
        }
        
        this.addColorComparison(containerEl, currentColor, otherColor);
    }
    
}
