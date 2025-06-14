import { App, PluginSettingTab, Setting, SliderComponent } from "obsidian";
import type FolderHighlighter from "./folderHighlighter";
import { DEFAULT_SETTINGS, FolderHighlighterSettings } from "./settings";

export class FolderHighlighterSettingTab extends PluginSettingTab {
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
		const themeHeaderEl = containerEl.createEl("div", {
			cls: "theme-header",
		});
		themeHeaderEl.createEl("h2", {
			text: this.plugin.settings.editingDarkTheme
				? "Dark Theme"
				: "Light Theme",
			cls: "theme-title",
		});
		this.themeToggleButton = themeHeaderEl.createEl("div", {
			cls: "theme-toggle-button",
		});
		this.updateThemeToggleIcon();
		this.themeToggleButton.addEventListener("click", async () => {
			this.containerEl.addClass("theme-transition");
			this.plugin.settings.editingDarkTheme =
				!this.plugin.settings.editingDarkTheme;
			await this.plugin.saveSettings();
			setTimeout(() => {
				this.display();
				setTimeout(
					() => this.containerEl.removeClass("theme-transition"),
					850
				);
			}, 150);
		});
		this.createGeneralSettings(containerEl);
		this.createActiveFolderSettings(containerEl);
		this.createRootFolderSettings(containerEl);
	}
	private createGeneralSettings(containerEl: HTMLElement) {
		new Setting(containerEl)
			.setName("Override theme styles")
			.setDesc("Use !important for style definitions")
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.useImportantTags)
					.onChange(async (v) => {
						this.plugin.settings.useImportantTags = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Center active file on scroll")
			.setDesc(
				"Additionally scrolls the active file to the center of the explorer. Works best with Obsidian's native 'Auto-reveal current file' setting enabled."
			)
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.autoScroll)
					.onChange(async (v) => {
						this.plugin.settings.autoScroll = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Auto-collapse other folders")
			.setDesc(
				"Collapse all folders not in the path to the active file. Works best with Obsidian's native 'Auto-reveal current file' setting enabled."
			)
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.autoCollapseOtherFolders)
					.onChange(async (v) => {
						this.plugin.settings.autoCollapseOtherFolders = v;
						await this.plugin.saveSettings();
					})
			);
	}
	private createActiveFolderSettings(containerEl: HTMLElement) {
		new Setting(containerEl).setName("Active Folder").setHeading();
		const settingContainer = containerEl.createEl("div", {
			cls: "setting-indent",
		});
		new Setting(settingContainer)
			.setName("Enable title background")
			.addToggle((t) =>
				t
					.setValue(
						this.getCurrentThemeSetting("highlightFolderTitleColor")
					)
					.onChange(async (v) => {
						this.setThemeSetting("highlightFolderTitleColor", v);
						if (!v) {
							this.plugin.settings.previousLightHighlightedFolderTitleColor =
								this.plugin.settings.lightHighlightedFolderTitleColor;
							this.plugin.settings.previousDarkHighlightedFolderTitleColor =
								this.plugin.settings.darkHighlightedFolderTitleColor;
							this.plugin.settings.lightHighlightedFolderTitleColor =
								"rgba(0,0,0,0)";
							this.plugin.settings.darkHighlightedFolderTitleColor =
								"rgba(0,0,0,0)";
						} else {
							this.plugin.settings.lightHighlightedFolderTitleColor =
								this.plugin.settings
									.previousLightHighlightedFolderTitleColor !==
								"rgba(0,0,0,0)"
									? this.plugin.settings
											.previousLightHighlightedFolderTitleColor
									: DEFAULT_SETTINGS.lightHighlightedFolderTitleColor;
							this.plugin.settings.darkHighlightedFolderTitleColor =
								this.plugin.settings
									.previousDarkHighlightedFolderTitleColor !==
								"rgba(0,0,0,0)"
									? this.plugin.settings
											.previousDarkHighlightedFolderTitleColor
									: DEFAULT_SETTINGS.darkHighlightedFolderTitleColor;
						}
						await this.plugin.saveSettings();
						this.display();
					})
			);
		if (this.getCurrentThemeSetting("highlightFolderTitleColor"))
			this.createColorSetting(
				settingContainer,
				"Title background color",
				"",
				"HighlightedFolderTitleColor"
			);
		this.createColorSetting(
			settingContainer,
			"Folder background",
			"",
			"HighlightedFolderColor"
		);
		this.createColorSetting(
			settingContainer,
			"Text color",
			"",
			"HighlightedFolderTextColor"
		);
		new Setting(settingContainer)
					.setName("Font weight")
					.setDesc(createFragment((frag: DocumentFragment) => {
						frag.createEl('small', { text: "Note: This might be overridden by your current theme." });
					}))
			.addDropdown(d => d.addOptions({"200":"Thin","400":"Normal","700":"Bold"}).setValue(this.plugin.settings.highlightedFolderFontWeight).onChange(async v => { this.plugin.settings.highlightedFolderFontWeight = v; await this.plugin.saveSettings(); }));

		new Setting(settingContainer)
			.setName("Border radius")
			.setDesc(createFragment((frag: DocumentFragment) => {
				frag.createEl('small', { text: "Note: This might be overridden by your current theme." });
			}))
			.addSlider((s: SliderComponent) => {
				s.setLimits(0, 50, 1);
				s.setValue(parseInt(this.plugin.settings.highlightedFolderBorderRadius));
				s.onChange(async (v: number) => {
					this.plugin.settings.highlightedFolderBorderRadius = `${v}px`;
					await this.plugin.saveSettings();
				});
				s.setDynamicTooltip();
				return s;
			});
	}
	private createRootFolderSettings(containerEl: HTMLElement) {
		new Setting(containerEl).setName("Root Folder").setHeading();
		new Setting(containerEl)
			.setName("Highlight root folders")
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.highlightParentFolder)
					.onChange(async (v) => {
						this.plugin.settings.highlightParentFolder = v;
						await this.plugin.saveSettings();
						this.display();
					})
			);
		if (this.plugin.settings.highlightParentFolder) {
			const settingContainer = containerEl.createEl("div", {
				cls: "setting-indent",
			});
			this.createColorSetting(
				settingContainer,
				"Root background",
				"",
				"HighlightedParentFolderColor"
			);
			this.createColorSetting(
				settingContainer,
				"Root text color",
				"",
				"HighlightedParentFolderTextColor"
			);
			
			new Setting(settingContainer)
							.setName("Root font weight")
							.setDesc(createFragment((frag: DocumentFragment) => {
								frag.createEl('small', { text: "Note: This might be overridden by your current theme." });
							}))
                .addDropdown(d => d.addOptions({"200":"Thin","400":"Normal","700":"Bold"}).setValue(this.plugin.settings.highlightedParentFolderFontWeight).onChange(async v => { this.plugin.settings.highlightedParentFolderFontWeight = v; await this.plugin.saveSettings(); }));

			new Setting(settingContainer)
				.setName("Root border radius")
				.addSlider((s: SliderComponent) => {
					s.setLimits(0, 50, 1);
					s.setValue(parseInt(this.plugin.settings.highlightedParentFolderBorderRadius));
					s.onChange(async (v: number) => {
						this.plugin.settings.highlightedParentFolderBorderRadius = `${v}px`;
						await this.plugin.saveSettings();
					});
				s.setDynamicTooltip();
				return s;
				});
		}
	}
	private createColorSetting(
		containerEl: HTMLElement,
		name: string,
		desc: string,
		baseKey: string
	) {
		const theme = this.plugin.settings.editingDarkTheme ? "dark" : "light";
		const key = `${theme}${baseKey}` as keyof FolderHighlighterSettings;
		const value = this.plugin.settings[key] as string;
		const rgba = this.extractRgbaComponents(value);
		new Setting(containerEl)
			.setName(name)
			.setDesc(desc)
			.addColorPicker((c) =>				c.setValue(this.rgbToHex(rgba)).onChange(async (nc) => {
					const nr = this.hexToRgb(nc);
					(this.plugin.settings[key] as string) = `rgba(${nr.r}, ${nr.g}, ${nr.b}, ${rgba.a})`;
					await this.plugin.saveSettings();
				})
			)			.addExtraButton((b) =>
				b.setIcon("reset").onClick(async () => {
					(this.plugin.settings[key] as string) = DEFAULT_SETTINGS[
						`${theme}${baseKey}` as keyof typeof DEFAULT_SETTINGS
					] as string;
					await this.plugin.saveSettings();
					this.display();
				})
			);
		const tc = containerEl.createEl("div", {
			cls: "transparency-slider-container",
		});
		tc.createEl("div", { cls: "setting-item-info", text: "Transparency" });
		const s = tc.createEl("input", {
			cls: "transparency-slider",
			attr: {
				type: "range",
				min: "0",
				max: "100",
				value: Math.round((1 - rgba.a) * 100).toString(),
			},
		});
		const vd = tc.createEl("span", {
			cls: "transparency-value",
			text: `${Math.round((1 - rgba.a) * 100)}%`,
		});
		s.addEventListener("input", async (e) => {
			const tv = parseInt((e.target as HTMLInputElement).value);
			const na = 1 - tv / 100;
			vd.textContent = `${tv}%`;
			const cr = this.extractRgbaComponents(
				this.plugin.settings[key] as string
			);
			(this.plugin.settings[key] as string) = `rgba(${cr.r}, ${cr.g}, ${cr.b}, ${na})`;
			await this.plugin.saveSettings();
		});
	}
	private extractRgbaComponents = (rgba: string) => {
		const m = rgba.match(
			/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/
		);
		return m
			? {
					r: parseInt(m[1]),
					g: parseInt(m[2]),
					b: parseInt(m[3]),
					a: m[4] ? parseFloat(m[4]) : 1,
				}
			: { r: 0, g: 0, b: 0, a: 1 };
	};
	private hexToRgb = (hex: string) => {
		const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return r
			? {
					r: parseInt(r[1], 16),
					g: parseInt(r[2], 16),
					b: parseInt(r[3], 16),
				}
			: { r: 0, g: 0, b: 0 };
	};
	private rgbToHex = (rgba: { r: number; g: number; b: number }) =>
		"#" +
		((1 << 24) + (rgba.r << 16) + (rgba.g << 8) + rgba.b)
			.toString(16)
			.slice(1);
	private getCurrentThemeSetting = (key: string): boolean =>
		this.plugin.settings[
			(this.plugin.settings.editingDarkTheme
				? `dark${key}`
				: `light${key}`) as keyof FolderHighlighterSettings
		] as boolean;
	private setThemeSetting = (key: string, value: boolean) => {
		(this.plugin.settings as unknown as { [key: string]: boolean })[`light${key}`] = value;
		(this.plugin.settings as unknown as { [key: string]: boolean })[`dark${key}`] = value;
	};
	updateThemeToggleIcon() {
		this.themeToggleButton.empty();
		this.themeToggleButton.innerHTML = this.plugin.settings.editingDarkTheme
			? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-moon"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`
			: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-sun"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
	}
}
