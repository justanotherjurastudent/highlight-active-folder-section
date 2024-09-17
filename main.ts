import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface FolderHighlighterSettings {
    useImportantTags: boolean;
    highlightedFolderColor: string;
    highlightFolderTitleColor: boolean;
    highlightedFolderTitleColor: string;
    highlightedFolderTextColor: string;
    highlightParentFolder: boolean;
    highlightedParentFolderColor: string;
    highlightedParentFolderTextColor: string;
    highlightedFolderBorderRadius: string;
    highlightedParentFolderBorderRadius: string;
    highlightedFolderFontWeight: string;
    highlightedParentFolderFontWeight: string;
}

const DEFAULT_SETTINGS: FolderHighlighterSettings = {
    useImportantTags: false,
    highlightedFolderColor: '#eeeeee',
    highlightFolderTitleColor: false,
    highlightedFolderTitleColor: '#ffffff00',
	highlightedFolderTextColor: '#000000',
    highlightParentFolder: false,
    highlightedParentFolderColor: '#dddddd',
	highlightedParentFolderTextColor: '#000000',
    highlightedFolderBorderRadius: '5px',
    highlightedParentFolderBorderRadius: '5px',
    highlightedFolderFontWeight: 'bold',
    highlightedParentFolderFontWeight: 'bold'
};

export default class FolderHighlighter extends Plugin {
    settings: FolderHighlighterSettings;
    private styleEl: HTMLStyleElement | null = null;

    async onload() {
        await this.loadSettings();

        this.addSettingTab(new FolderHighlighterSettingTab(this.app, this));

        // Apply styles immediately after loading
        this.updateStyles();

        // Register event to update the highlighted folder when the active note changes
        this.registerEvent(
            this.app.workspace.on("active-leaf-change", () => {
                this.highlightFolders();
            })
        );

        // Highlight the parent folder and apply styles when the layout is ready
        this.app.workspace.onLayoutReady(() => {
            this.highlightFolders();
            this.updateStyles();

            // Add a short timeout to ensure styles are applied after everything is loaded
            setTimeout(() => {
                this.updateStyles();
                this.highlightFolders();
            }, 500);
        });
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.updateStyles();
    }

    highlightFolders() {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) return;

        // Remove all previous highlights
        const allFolders = document.querySelectorAll(".nav-folder");
        allFolders.forEach((folder) => {
            folder.classList.remove("highlighted-folder", "highlighted-parent-folder");
        });

        // Highlight the folder containing the active note
        const currentFolder = this.getParentFolderElement(activeFile.path);
        if (currentFolder) {
                    currentFolder.classList.add("highlighted-folder");

            if (this.settings.highlightParentFolder) {
                // Highlight the root folder in the path to the active note
                const rootFolder = this.getRootFolderInPath(activeFile.path);
                if (rootFolder && rootFolder !== currentFolder) {
                    rootFolder.classList.add("highlighted-parent-folder");
                }
            }
        }
    }

    getParentFolderElement(filePath: string): Element | null {
        const folderPaths = filePath.split("/");
        folderPaths.pop();
        let folderElement: Element | null = null;

        while (folderPaths.length > 0) {
            const folderName = folderPaths.join("/");
            const possibleFolderElement = document.querySelector(`[data-path="${folderName}"]`);
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
            return document.querySelector(`[data-path="${rootFolderName}"]`)?.closest(".nav-folder") || null;
        }

        return null;
    }

    updateStyles() {
        if (!this.styleEl) {
            this.styleEl = document.createElement('style');
            this.styleEl.id = 'folder-highlighter-styles';
            document.head.appendChild(this.styleEl);
        }
    
        const important = this.settings.useImportantTags ? ' !important' : '';
    
        const styleContent = `
            .highlighted-folder {
                background-color: ${this.settings.highlightedFolderColor}${important};
                border-radius: ${this.settings.highlightedFolderBorderRadius}${important};
            }
            .highlighted-folder > .nav-folder-title {
                ${this.settings.highlightFolderTitleColor ? `background-color: ${this.settings.highlightedFolderTitleColor}${important};` : ''}
                color: ${this.settings.highlightedFolderTextColor}${important};
                border-radius: ${this.settings.highlightedFolderBorderRadius}${important};
                font-weight: ${this.settings.highlightedFolderFontWeight}${important};
            }
            .highlighted-parent-folder {
                background-color: ${this.settings.highlightedParentFolderColor}${important};
                border-radius: ${this.settings.highlightedParentFolderBorderRadius}${important};
            }
            .highlighted-parent-folder > .nav-folder-title {
                color: ${this.settings.highlightedParentFolderTextColor}${important};
                font-weight: ${this.settings.highlightedParentFolderFontWeight}${important};
                border-radius: ${this.settings.highlightedParentFolderBorderRadius}${important};
            }
            .highlighted-folder > .nav-folder-title:hover,
            .highlighted-folder > .nav-folder-title.is-being-dragged,
            .highlighted-parent-folder > .nav-folder-title:hover,
            .highlighted-parent-folder > .nav-folder-title.is-being-dragged {
                color: ${this.settings.highlightedFolderTextColor}${important};
                font-weight: ${this.settings.highlightedFolderFontWeight}${important};
            }
            .highlighted-folder .nav-file-title.is-active {
                font-weight: ${this.settings.highlightedFolderFontWeight}${important};
            }
            .highlighted-parent-folder .nav-file-title.is-active {
                font-weight: ${this.settings.highlightedParentFolderFontWeight}${important};
            }
        `;
        this.styleEl.textContent = styleContent;
    }

    onunload() {
        if (this.styleEl) {
            this.styleEl.remove();
        }
    }
}

class FolderHighlighterSettingTab extends PluginSettingTab {
    plugin: FolderHighlighter;

    constructor(app: App, plugin: FolderHighlighter) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
        .setName('Overrides theme settings')
        .setDesc('Enable this to override theme styles with !important tags.')
        .addToggle(toggle => toggle
            .setValue(this.plugin.settings.useImportantTags)
            .onChange(async (value) => {
                this.plugin.settings.useImportantTags = value;
                await this.plugin.saveSettings();
                this.plugin.updateStyles();
            }));

        new Setting(containerEl).setName('Active folder').setHeading();

        // Function to create color settings with transparency slider and reset button
        const createColorSetting = (name: string, desc: string, key: keyof FolderHighlighterSettings) => {
            let savedColor = this.plugin.settings[key];
            let alphaValue = 1; // Default alpha value

            // Parse initial alpha value if rgba is used
            if (typeof savedColor === 'string') {
                const match = savedColor.match(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/);
                if (match) {
                    alphaValue = parseFloat(match[4]);
                }
            }
            const match = (savedColor as string).match(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/);
            if (match) {
                alphaValue = parseFloat(match[4]);
            }

            new Setting(containerEl)
                .setName(name)
                .setDesc(desc)
                .addText(text => {
                    text.setPlaceholder('#eeeeee')
                        .setValue(savedColor.toString())
                        .onChange(async (value) => {
                            (this.plugin.settings as any)[key] = value;
                            await this.plugin.saveSettings();
                        });

                    // Add the color picker next to the text input
                    text.inputEl.classList.add('input-width-150'); // Adjust the width of the text field
                    const colorPicker = document.createElement('input');
                    colorPicker.type = 'color';
                    // Extract only the color without alpha for the color picker
                    const rgbColor = this.extractRgbFromRgba(savedColor.toString());
                    colorPicker.value = this.rgbToHex(rgbColor);
                    colorPicker.title = 'Choose a color';
                    colorPicker.addEventListener('input', async (event: any) => {
                        const value = event.target.value;
                        // Convert the hex color to RGB
                        const rgb = this.hexToRgb(value);
                        (this.plugin.settings as any)[key] = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alphaValue})` as string;
                        await this.plugin.saveSettings();
                        text.setValue((this.plugin.settings as any)[key]);
                    });
                    text.inputEl.parentElement?.appendChild(colorPicker);

                    // Add the transparency slider
                    const transparencySlider = document.createElement('input');
                    transparencySlider.type = 'range';
                    transparencySlider.min = '0';
                    transparencySlider.max = '1';
                    transparencySlider.step = '0.01';
                    transparencySlider.value = alphaValue.toString();
                    transparencySlider.classList.add('margin-left-10');
                    transparencySlider.title = 'Move the slider to adjust transparency';
                    transparencySlider.addEventListener('input', async (event: any) => {
                        alphaValue = parseFloat(event.target.value);
                        const rgb = this.hexToRgb(colorPicker.value);
                        (this.plugin.settings as any)[key] = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alphaValue})`;
                        await this.plugin.saveSettings();
                        text.setValue((this.plugin.settings as any)[key]);
                    });
                    text.inputEl.parentElement?.appendChild(transparencySlider);

                    // Add the reset button next to the transparency slider
                    const resetButton = document.createElement('button');
                    resetButton.textContent = 'Reset';
                    resetButton.title = 'Reset to previous color';
                    resetButton.classList.add('margin-left-10');
                    resetButton.addEventListener('click', async () => {
                        // Reset to the last saved color
                        (this.plugin.settings as any)[key] = savedColor;
                        await this.plugin.saveSettings();

                        // Update the color picker
                        const rgbColor = this.extractRgbFromRgba(savedColor.toString());
                        colorPicker.value = this.rgbToHex(rgbColor);

                        // Update the transparency slider
                        const alpha = this.extractAlphaFromRgba(savedColor.toString());
                        transparencySlider.value = alpha.toString();

                        // Update the text input
                        text.setValue(savedColor.toString());
                    });
                    text.inputEl.parentElement?.appendChild(resetButton);
                });
        };

        // Highlighted Section Color
        createColorSetting('Folder section background-color', 'Choose a background-color of the active folder-container.', 'highlightedFolderColor');

        // Highlight Folder Background-Color
        new Setting(containerEl)
            .setName('Folder background color')
            .setDesc('Enable background-color of the folder title.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.highlightFolderTitleColor)
                .onChange(async (value) => {
                    this.plugin.settings.highlightFolderTitleColor = value;
                    if (!value) {
                        this.plugin.settings.highlightedFolderTitleColor = '#ffffff00'; // Reset background color
                    }
                    await this.plugin.saveSettings();
                    this.display();
                    this.plugin.updateStyles(); // Update styles immediately
                }));

        // Highlighted Folder Title Color
        if (this.plugin.settings.highlightFolderTitleColor) {
            createColorSetting('Folder background-color', 'Choose a color for the highlighted folder title.', 'highlightedFolderTitleColor');
        }

		// Highlighted Folder Text Color
		createColorSetting('Folder text color', 'Choose a color for the highlighted folder text.', 'highlightedFolderTextColor');

        // Highlighted Folder Font Weight
        new Setting(containerEl)
            .setName('Highlighted folder font weight')
            .setDesc('Set the font weight of the highlighted folder titles.')
            .addDropdown(dropdown => dropdown
                .addOption('200', 'Thin')
                .addOption('400', 'Normal')
                .addOption('700', 'Bold')
                .setValue(this.plugin.settings.highlightedFolderFontWeight || '700')
                .onChange(async (value) => {
                    this.plugin.settings.highlightedFolderFontWeight = value;
                    await this.plugin.saveSettings();
                    this.plugin.updateStyles(); // Update styles immediately
                }));

        // Highlighted Folder Border Radius
        new Setting(containerEl)
            .setName('Folder border radius')
            .setDesc('Set the border radius of the highlighted folder.')
            .addSlider(slider => slider
                .setLimits(0, 50, 1)  // Min, Max, Step
                .setValue(parseInt(this.plugin.settings.highlightedFolderBorderRadius))
                .onChange(async (value) => {
                    const radiusWithPx = `${value}px`;
                    this.plugin.settings.highlightedFolderBorderRadius = radiusWithPx;
                    await this.plugin.saveSettings();
                    this.plugin.updateStyles(); // Update styles immediately
                })
                .setDynamicTooltip() // Adds a tooltip showing the current value
            );  

        
        new Setting(containerEl).setName('Root folder').setHeading();

        // New setting for highlighting root folder
        new Setting(containerEl)
            .setName('Highlight root folder')
            .setDesc('Enable background-color of the root folder segment in the path to the active note.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.highlightParentFolder)
                .onChange(async (value) => {
                    this.plugin.settings.highlightParentFolder = value;
                    await this.plugin.saveSettings();
                    this.display();
                }));
        
        // Root Folder Color
		if (this.plugin.settings.highlightParentFolder) {
			createColorSetting('Root folder section background-color', 'Choose a background-color of the root folder segment.', 'highlightedParentFolderColor');
			createColorSetting('Root folder text color', 'Choose a color for the highlighted root folder text.', 'highlightedParentFolderTextColor');
            
            // Highlighted Parent Folder Font Weight
            new Setting(containerEl)
                .setName('Highlighted root folder font weight')
                .setDesc('Set the font weight of the highlighted parent folder titles.')
                .addDropdown(dropdown => dropdown
                    .addOption('200', 'Thin')
                    .addOption('400', 'Normal')
                    .addOption('700', 'Bold')
                    .setValue(this.plugin.settings.highlightedParentFolderFontWeight || '700')
                    .onChange(async (value) => {
                        this.plugin.settings.highlightedParentFolderFontWeight = value;
                        await this.plugin.saveSettings();
                        this.plugin.updateStyles(); // Update styles immediately
                    }));
            
            // Highlighted Root Folder Border Radius
            new Setting(containerEl)
                .setName('Root folder border radius')
                .setDesc('Set the border radius of the highlighted root folder.')
                .addSlider(slider => slider
                    .setLimits(0, 50, 1)  // Min, Max, Step
                    .setValue(parseInt(this.plugin.settings.highlightedParentFolderBorderRadius))
                    .onChange(async (value) => {
                        const radiusWithPx = `${value}px`;
                        this.plugin.settings.highlightedParentFolderBorderRadius = radiusWithPx;
                        await this.plugin.saveSettings();
                        this.plugin.updateStyles(); // Update styles immediately
                    })
                    .setDynamicTooltip());  // Adds a tooltip showing the current value
                }
            }

    // Helper function to convert hex color to RGB
    hexToRgb(hex: string) {
        const bigint = parseInt(hex.slice(1), 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return { r, g, b };
    }

    // Helper function to extract RGB values from RGBA string
    extractRgbFromRgba(rgba: string) {
        const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
            return {
                r: parseInt(match[1]),
                g: parseInt(match[2]),
                b: parseInt(match[3])
            };
        }
        return { r: 0, g: 0, b: 0 };
    }

    // Helper function to extract alpha value from RGBA string
    extractAlphaFromRgba(rgba: string) {
        const match = rgba.match(/rgba?\(.*?,\s*([\d.]+)\)/);
        return match ? parseFloat(match[1]) : 1;
    }

    // Helper function to convert RGB to HEX
    rgbToHex(rgb: { r: number, g: number, b: number }) {
        return "#" + ((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).slice(1);
    }
}
