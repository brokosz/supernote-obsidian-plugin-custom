import { createCustomDictionarySettingsUI, CUSTOM_DICTIONARY_DEFAULT_SETTINGS, CustomDictionarySettings } from "./customDictionary";
import SupernotePlugin from "./main";
import { App, ExtraButtonComponent, PluginSettingTab, Setting, TextComponent, TFolder } from 'obsidian';

export const IP_VALIDATION_PATTERN = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/;

// Simple folder suggestion implementation
class FolderInputSuggest {
    private app: App;
    private inputEl: HTMLInputElement;

    constructor(app: App, inputEl: HTMLInputElement) {
        this.app = app;
        this.inputEl = inputEl;
        
        // Setup events for suggestions
        this.inputEl.addEventListener('focus', this.onFocus.bind(this));
        this.inputEl.addEventListener('input', this.onInput.bind(this));
    }

    private onFocus() {
        // Clear any previous suggestions and show new ones
        this.showSuggestions();
    }

    private onInput() {
        // Update suggestions based on current input
        this.showSuggestions();
    }

    private showSuggestions() {
        const inputStr = this.inputEl.value;
        const suggestions = this.getSuggestions(inputStr);

        // Clear any existing suggestions
        const existingSuggestions = document.querySelector('.folder-suggestions');
        if (existingSuggestions) {
            existingSuggestions.remove();
        }

        if (suggestions.length > 0) {
            // Create suggestions dropdown
            const dropdown = document.createElement('div');
            dropdown.className = 'folder-suggestions';
            dropdown.style.position = 'absolute';
            dropdown.style.zIndex = '1000';
            dropdown.style.backgroundColor = 'var(--background-primary)';
            dropdown.style.border = '1px solid var(--background-modifier-border)';
            dropdown.style.borderRadius = '4px';
            dropdown.style.maxHeight = '200px';
            dropdown.style.overflowY = 'auto';
            dropdown.style.width = `${this.inputEl.offsetWidth}px`;

            // Add suggestions to dropdown
            suggestions.forEach(suggestion => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';
                item.style.padding = '6px 10px';
                item.style.cursor = 'pointer';
                item.style.borderBottom = '1px solid var(--background-modifier-border)';
                item.textContent = suggestion;

                item.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    this.selectSuggestion(suggestion);
                });

                item.addEventListener('mouseover', () => {
                    item.style.backgroundColor = 'var(--interactive-accent)';
                    item.style.color = 'var(--text-on-accent)';
                });

                item.addEventListener('mouseout', () => {
                    item.style.backgroundColor = '';
                    item.style.color = '';
                });

                dropdown.appendChild(item);
            });

            // Position dropdown below input using DOM coordinates
            const rect = this.inputEl.getBoundingClientRect();
            
            // Add to DOM - attach to body to avoid container clipping issues
            document.body.appendChild(dropdown);
            
            // Position after adding to DOM
            dropdown.style.top = `${rect.bottom + window.scrollY}px`;
            dropdown.style.left = `${rect.left + window.scrollX}px`;

            // Close on click outside
            document.addEventListener('click', this.close.bind(this), { once: true });
        }
    }

    private getSuggestions(inputStr: string): string[] {
        const abstractFiles = this.app.vault.getAllLoadedFiles();
        const folders: string[] = [];
        const lowerCaseInputStr = inputStr.toLowerCase();

        abstractFiles.forEach((file) => {
            if (file instanceof TFolder && file.path.toLowerCase().includes(lowerCaseInputStr)) {
                folders.push(file.path);
            }
        });

        return folders;
    }

    private selectSuggestion(value: string): void {
        this.inputEl.value = value;
        this.inputEl.dispatchEvent(new Event('input'));
        this.close();
    }

    private close(): void {
        const suggestionsContainer = document.querySelector('.folder-suggestions');
        if (suggestionsContainer) {
            suggestionsContainer.remove();
        }
    }
}

export interface SupernotePluginSettings extends CustomDictionarySettings {
    directConnectIP: string;
    invertColorsWhenDark: boolean;
    showTOC: boolean;
    showExportButtons: boolean;
    collapseRecognizedText: boolean,
    noteImageMaxDim: number;
    // Custom output paths
    customNotesPath: string;
    customImagesPath: string;
    customMarkdownPath: string;
    customPDFPath: string;
    // Note categorization options
    useNoteCategorization: boolean;
    dailyNotePattern: string;
    conceptNoteOutputFolder: string;
    dailyNoteOutputFolder: string;
}

export const DEFAULT_SETTINGS: SupernotePluginSettings = {
    directConnectIP: '',
    invertColorsWhenDark: true,
    showTOC: true,
    showExportButtons: true,
    collapseRecognizedText: false,
    noteImageMaxDim: 800, // Sensible default for Nomad pages to be legible but not too big. Unit: px
    // Custom output paths with defaults
    customNotesPath: '',  // Empty means default location
    customImagesPath: '_assets/supernote/images',
    customMarkdownPath: '',
    customPDFPath: '_assets/supernote/pdf',
    // Note categorization options
    useNoteCategorization: false,
    dailyNotePattern: 'YYYYMMDD-HHMMSS', // Default pattern for Supernote format: YYYYMMDD-HHMMSS
    conceptNoteOutputFolder: '',  // Empty means same as file source
    dailyNoteOutputFolder: 'Daily Notes',
    ...CUSTOM_DICTIONARY_DEFAULT_SETTINGS,
}

export class SupernoteSettingTab extends PluginSettingTab {
    plugin: SupernotePlugin;

    constructor(app: App, plugin: SupernotePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        
        let alert: ExtraButtonComponent;

        // Original settings
        new Setting(containerEl)
            .setName('Supernote IP address')
            .setDesc('(Optional) When using the Supernote "Browse and Access" for document upload/download or "Screen Mirroring" screenshot attachment this is the IP of the Supernote device')
            .addText(text => text
                .setPlaceholder('IP only e.g. 192.168.1.2')
                .setValue(this.plugin.settings.directConnectIP)
                .onChange(async (value) => {
                    if (IP_VALIDATION_PATTERN.test(value) || value === '') {
                        this.plugin.settings.directConnectIP = value;
                        alert.extraSettingsEl.style.display = 'none';
                        await this.plugin.saveSettings();
                    } else {
                        alert.extraSettingsEl.style.display = 'inline';
                    }
                })
                .inputEl.setAttribute('pattern', IP_VALIDATION_PATTERN.source)
            )
            .addExtraButton(btn => {
                btn.setIcon('alert-triangle')
                    .setTooltip('Invalid IP format: must be xxx.xxx.xxx.xxx');
                btn.extraSettingsEl.style.display = 'none';
                alert = btn
                return btn;
            });

        new Setting(containerEl)
            .setName('Invert colors in "Dark mode"')
            .setDesc('When Obsidian is in "Dark mode" increase image visibility by inverting colors of images')
            .addToggle(text => text
                .setValue(this.plugin.settings.invertColorsWhenDark)
                .onChange(async (value) => {
                    this.plugin.settings.invertColorsWhenDark = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName('Show table of contents and page headings')
            .setDesc(
                'When viewing .note files, show a table of contents and page number headings',
            )
            .addToggle((text) =>
                text
                    .setValue(this.plugin.settings.showTOC)
                    .onChange(async (value) => {
                        this.plugin.settings.showTOC = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Show export buttons')
            .setDesc(
                'When viewing .note files, show buttons for exporting images and/or markdown files to vault. These features can still be accessed via the command pallete.',
            )
            .addToggle((text) =>
                text
                    .setValue(this.plugin.settings.showExportButtons)
                    .onChange(async (value) => {
                        this.plugin.settings.showExportButtons = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Collapse recognized text')
            .setDesc('When viewing .note files, hide recognized text in a collapsible element. This does not affect exported markdown.')
            .addToggle(text => text
                .setValue(this.plugin.settings.collapseRecognizedText)
                .onChange(async (value) => {
                    this.plugin.settings.collapseRecognizedText = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName('Max image side length in .note files')
            .setDesc('Maximum width and height (in pixels) of the note image when viewing .note files. Does not affect exported images and markdown.')
            .addSlider(text => text
                .setLimits(200, 1900, 100) // Resolution of an A5X/A6X2/Nomad page is 1404 x 1872 px (with no upscaling)
                .setDynamicTooltip()
                .setValue(this.plugin.settings.noteImageMaxDim)
                .onChange(async (value) => {
                    this.plugin.settings.noteImageMaxDim = value;
                    await this.plugin.saveSettings();
                })
            );

        // Add a heading for the new custom output path settings
        containerEl.createEl('h3', { text: 'Custom Output Path Settings' });

        // Custom output path for images
        const imagePathSetting = new Setting(containerEl)
            .setName('Custom images path')
            .setDesc('Relative path where exported images should be saved (leave empty for same folder as the file)')
            .addText(text => {
                text.setPlaceholder('_assets/supernote/images')
                    .setValue(this.plugin.settings.customImagesPath)
                    .onChange(async (value) => {
                        this.plugin.settings.customImagesPath = value;
                        await this.plugin.saveSettings();
                    });
                // Add folder suggestion
                if (text.inputEl) {
                    new FolderInputSuggest(this.app, text.inputEl);
                }
                return text;
            });

        // Custom output path for markdown
        const markdownPathSetting = new Setting(containerEl)
            .setName('Custom markdown path')
            .setDesc('Relative path where exported markdown files should be saved (leave empty for same folder as the file)')
            .addText(text => {
                text.setPlaceholder('_assets/supernote/markdown')
                    .setValue(this.plugin.settings.customMarkdownPath)
                    .onChange(async (value) => {
                        this.plugin.settings.customMarkdownPath = value;
                        await this.plugin.saveSettings();
                    });
                // Add folder suggestion
                if (text.inputEl) {
                    new FolderInputSuggest(this.app, text.inputEl);
                }
                return text;
            });

        // Custom output path for PDF
        const pdfPathSetting = new Setting(containerEl)
            .setName('Custom PDF path')
            .setDesc('Relative path where exported PDF files should be saved (leave empty for same folder as the file)')
            .addText(text => {
                text.setPlaceholder('_assets/supernote/pdf')
                    .setValue(this.plugin.settings.customPDFPath)
                    .onChange(async (value) => {
                        this.plugin.settings.customPDFPath = value;
                        await this.plugin.saveSettings();
                    });
                // Add folder suggestion
                if (text.inputEl) {
                    new FolderInputSuggest(this.app, text.inputEl);
                }
                return text;
            });

        // Note categorization section
        containerEl.createEl('h3', { text: 'Note Categorization Settings' });

        // Toggle for using note categorization
        new Setting(containerEl)
            .setName('Enable note categorization')
            .setDesc('Categorize notes as "daily notes" or "other notes" based on filename pattern')
            .addToggle(text => text
                .setValue(this.plugin.settings.useNoteCategorization)
                .onChange(async (value) => {
                    this.plugin.settings.useNoteCategorization = value;
                    await this.plugin.saveSettings();
                })
            );

        // Daily note pattern
        new Setting(containerEl)
            .setName('Daily note pattern')
            .setDesc('Moment.js date format to identify daily notes (default: "YYYYMMDD-HHMMSS" matches Supernote\'s format)')
            .addText(text => text
                .setPlaceholder('YYYYMMDD-HHMMSS')
                .setValue(this.plugin.settings.dailyNotePattern)
                .onChange(async (value) => {
                    this.plugin.settings.dailyNotePattern = value;
                    await this.plugin.saveSettings();
                })
            );

        // Daily note output folder
        new Setting(containerEl)
            .setName('Daily note output folder')
            .setDesc('Folder where daily notes should be saved (leave empty for same folder as the file)')
            .addText(text => {
                text.setPlaceholder('Daily Notes')
                    .setValue(this.plugin.settings.dailyNoteOutputFolder)
                    .onChange(async (value) => {
                        this.plugin.settings.dailyNoteOutputFolder = value;
                        await this.plugin.saveSettings();
                    });
                // Add folder suggestion
                if (text.inputEl) {
                    new FolderInputSuggest(this.app, text.inputEl);
                }
                return text;
            });

        // Other notes output folder
        new Setting(containerEl)
            .setName('Other notes output folder')
            .setDesc('Folder where non-daily notes should be saved (leave empty for same folder as the file)')
            .addText(text => {
                text.setPlaceholder('')
                    .setValue(this.plugin.settings.conceptNoteOutputFolder)
                    .onChange(async (value) => {
                        this.plugin.settings.conceptNoteOutputFolder = value;
                        await this.plugin.saveSettings();
                    });
                // Add folder suggestion
                if (text.inputEl) {
                    new FolderInputSuggest(this.app, text.inputEl);
                }
                return text;
            });

        // Add custom dictionary settings to the settings tab
        createCustomDictionarySettingsUI(containerEl, this.plugin);
    }
}