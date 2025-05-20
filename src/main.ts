import { installAtPolyfill } from './polyfills';
import { App, Modal, TFile, Plugin, Editor, MarkdownView, WorkspaceLeaf, FileView, Notice } from 'obsidian';
import { SupernotePluginSettings, SupernoteSettingTab, DEFAULT_SETTINGS } from './settings';
import { SupernoteX } from 'supernote-typescript';
import { DownloadListModal, UploadListModal } from './FileListModal';
import { generateTimestamp, dataUrlToBuffer } from './utils';
import { ImageConverter } from './imageConverter';
import { VaultWriter } from './vaultWriter';

// Simplified implementation of fetchMirrorFrame for compatibility
async function fetchMirrorFrame(ipAddress: string): Promise<{ toBuffer: () => ArrayBuffer }> {
    try {
        const response = await fetch(`http://${ipAddress}/screenshot`, {
            method: 'GET',
            mode: 'cors',
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch mirror frame: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        
        return {
            toBuffer: () => arrayBuffer
        };
    } catch (error) {
        console.error('Error fetching mirror frame:', error);
        throw error;
    }
}

let vw: VaultWriter;
export const VIEW_TYPE_SUPERNOTE = "supernote-view";

export class SupernoteView extends FileView {
    file: TFile;
    settings: SupernotePluginSettings;
    constructor(leaf: WorkspaceLeaf, settings: SupernotePluginSettings) {
        super(leaf);
        this.settings = settings;
    }

    getViewType() {
        return VIEW_TYPE_SUPERNOTE;
    }

    getDisplayText() {
        if (!this.file) {
            return "Supernote View"
        }
        return this.file.basename;
    }

    async onLoadFile(file: TFile): Promise<void> {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl("h1", { text: file.name });

        const note = await this.app.vault.readBinary(file);
        let sn = new SupernoteX(new Uint8Array(note));
        let images: string[] = [];

        const converter = new ImageConverter();
        try {
            images = await converter.convertToImages(sn);
        } finally {
            // Clean up the worker when done
            converter.terminate();
        }

        if (this.settings.showExportButtons) {
            const exportNoteBtn = container.createEl("p").createEl("button", {
                text: "Attach markdown to vault",
                cls: "mod-cta",
            });

            exportNoteBtn.addEventListener("click", async () => {
                try {
                    const mdFile = await vw.attachMarkdownFile(file);
                    if (mdFile) {
                        new Notice(`Markdown file created at: ${mdFile.path}`);
                    }
                } catch (error) {
                    console.error("Error creating markdown file:", error);
                    new Notice("Error creating markdown file. Check console for details.");
                }
            });

            const exportAllBtn = container.createEl("p").createEl("button", {
                text: "Attach markdown and images to vault",
                cls: "mod-cta",
            });

            exportAllBtn.addEventListener("click", async () => {
                try {
                    const mdFile = await vw.attachNoteFiles(file);
                    if (mdFile) {
                        new Notice(`Markdown and images created. Markdown at: ${mdFile.path}`);
                    }
                } catch (error) {
                    console.error("Error creating files:", error);
                    new Notice("Error creating files. Check console for details.");
                }
            });

            const exportPDFBtn = container.createEl("p").createEl("button", {
                text: "Attach as PDF",
                cls: "mod-cta",
            });

            exportPDFBtn.addEventListener("click", async () => {
                try {
                    const pdfFile = await vw.exportToPDF(file);
                    if (pdfFile) {
                        new Notice(`PDF created at: ${pdfFile.path}`);
                    }
                } catch (error) {
                    console.error("Error creating PDF:", error);
                    new Notice("Error creating PDF. Check console for details.");
                }
            });
        }

        if (images.length > 1 && this.settings.showTOC) {
            const atoc = container.createEl("a");
            atoc.id = "toc";
            atoc.createEl("h2", { text: "Table of contents" });
            const ul = container.createEl("ul");
            for (let i = 0; i < images.length; i++) {
                const a = container.createEl("li").createEl("a");
                a.href = `#page${i + 1}`
                a.text = `Page ${i + 1}`
            }
        }

        for (let i = 0; i < images.length; i++) {
            const imageDataUrl = images[i];

            const pageContainer = container.createEl("div", {
                cls: 'page-container',
            })
            pageContainer.setAttr('style', 'max-width: ' + this.settings.noteImageMaxDim + 'px;')

            if (images.length > 1 && this.settings.showTOC) {
                const a = pageContainer.createEl("a");
                a.id = `page${i + 1}`;
                a.href = "#toc";
                a.createEl("h3", { text: `Page ${i + 1}` });
            }

            // Show the text of the page, if any
            if (sn.pages && i < sn.pages.length && sn.pages[i] && sn.pages[i].text !== undefined && sn.pages[i].text && sn.pages[i].text.length > 0) {
                let text;

                // If Collapse Text setting is enabled, place the text into an HTML `details` element
                if (this.settings.collapseRecognizedText) {
                    text = pageContainer.createEl('details', {
                        text: '\n' + sn.pages[i].text,
                        cls: 'page-recognized-text',
                    });
                    text.createEl('summary', { text: `Page ${i + 1} Recognized Text` });
                } else {
                    text = pageContainer.createEl('div', {
                        text: sn.pages[i].text,
                        cls: 'page-recognized-text',
                    });
                }
            }

            // Show the img of the page
            const imgElement = pageContainer.createEl("img");
            imgElement.src = imageDataUrl;
            if (this.settings.invertColorsWhenDark) {
                imgElement.addClass("supernote-invert-dark");
            }
            imgElement.setAttr('style', 'max-height: ' + this.settings.noteImageMaxDim + 'px;')
            imgElement.draggable = true;

            // Create a button to save image to vault
            if (this.settings.showExportButtons) {
                const saveButton = pageContainer.createEl("button", {
                    text: "Save image to vault",
                    cls: "mod-cta",
                });

                saveButton.addEventListener("click", async () => {
                    try {
                        // Use the custom image path if available
                        let filePath = this.settings.customImagesPath 
                            ? `${this.settings.customImagesPath}/${file.basename}-${i}.png`
                            : await this.app.fileManager.getAvailablePathForAttachment(`${file.basename}-${i}.png`);
                        
                        // If using custom path, ensure it exists
                        if (this.settings.customImagesPath) {
                            await vw.ensureDirectoryExists(this.settings.customImagesPath);
                            
                            // Check if file already exists and create a unique name if needed
                            let j = 0;
                            while (this.app.vault.getAbstractFileByPath(filePath) !== null) {
                                filePath = `${this.settings.customImagesPath}/${file.basename}-${i}-${++j}.png`;
                            }
                        }
                        
                        const buffer = dataUrlToBuffer(imageDataUrl);
                        const createdFile = await this.app.vault.createBinary(filePath, buffer);
                        if (createdFile) {
                            new Notice(`Image saved at: ${createdFile.path}`);
                        }
                    } catch (error) {
                        console.error("Error saving image:", error);
                        new Notice("Error saving image. Check console for details.");
                    }
                });
            }
        }
    }

    async onClose() { }
}

export default class SupernotePlugin extends Plugin {
    settings: SupernotePluginSettings;

    async onload() {
        // Install polyfills before any other code runs
        installAtPolyfill();

        await this.loadSettings();
        vw = new VaultWriter(this.app, this.settings);

        this.addSettingTab(new SupernoteSettingTab(this.app, this));

        this.addCommand({
            id: 'attach-supernote-file-from-device',
            name: 'Attach Supernote file from device',
            callback: () => {
                if (this.settings.directConnectIP.length === 0) {
                    new DirectConnectErrorModal(this.app, this.settings, new Error("IP is unset")).open();
                    return;
                }
                new DownloadListModal(this.app, this).open();
            }
        });

        this.addCommand({
            id: 'upload-file-to-supernote',
            name: 'Upload the current file to a Supernote device',
            callback: () => {
                if (this.settings.directConnectIP.length === 0) {
                    new DirectConnectErrorModal(this.app, this.settings, new Error("IP is unset")).open();
                    return;
                }
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) {
                    new UploadListModal(this.app, this, activeFile).open();
                }
            }
        });

        this.registerView(
            VIEW_TYPE_SUPERNOTE,
            (leaf) => new SupernoteView(leaf, this.settings)
        );
        this.registerExtensions(['note'], VIEW_TYPE_SUPERNOTE);

        this.addCommand({
            id: 'insert-supernote-screen-mirror-image',
            name: 'Insert a Supernote screen mirroring image as attachment',
            editorCallback: async (editor: Editor, view: MarkdownView) => {
                // generate a unique filename for the mirror based on the current note path
                let ts = generateTimestamp();
                const f = this.app.workspace.activeEditor?.file?.basename || '';
                
                // Use the custom image path if available
                let filename;
                if (this.settings.customImagesPath) {
                    try {
                        // Ensure directory exists
                        await vw.ensureDirectoryExists(this.settings.customImagesPath);
                        filename = `${this.settings.customImagesPath}/supernote-mirror-${f}-${ts}.png`;
                        
                        // Check if file exists
                        let i = 0;
                        while (this.app.vault.getAbstractFileByPath(filename) !== null) {
                            filename = `${this.settings.customImagesPath}/supernote-mirror-${f}-${ts}-${++i}.png`;
                        }
                    } catch (error) {
                        console.error("Error with custom path:", error);
                        // Fall back to default
                        filename = await this.app.fileManager.getAvailablePathForAttachment(`supernote-mirror-${f}-${ts}.png`);
                    }
                } else {
                    filename = await this.app.fileManager.getAvailablePathForAttachment(`supernote-mirror-${f}-${ts}.png`);
                }

                try {
                    if (this.settings.directConnectIP.length == 0) {
                        throw new Error("IP is unset, please set in Supernote plugin settings")
                    }
                    let image = await fetchMirrorFrame(`${this.settings.directConnectIP}:8080`);

                    const file = await this.app.vault.createBinary(filename, image.toBuffer());
                    const path = this.app.workspace.activeEditor?.file?.path;
                    if (!path) {
                        throw new Error("Active file path is null")
                    }
                    const link = this.app.fileManager.generateMarkdownLink(file, path);
                    editor.replaceRange(link, editor.getCursor());
                } catch (err: any) {
                    new DirectConnectErrorModal(this.app, this.settings, err).open();
                }
            },
        });

        this.addCommand({
            id: 'export-supernote-note-as-files',
            name: 'Export this Supernote note as a markdown and PNG files as attachments',
            checkCallback: (checking: boolean) => {
                const file = this.app.workspace.getActiveFile();
                const ext = file?.extension;

                if (ext === "note") {
                    if (checking) {
                        return true
                    }
                    try {
                        if (!file) {
                            throw new Error("No file to attach");
                        }
                        vw.attachNoteFiles(file)
                            .then(mdFile => {
                                if (mdFile) {
                                    new Notice(`Markdown and images created. Markdown at: ${mdFile.path}`);
                                }
                            })
                            .catch(error => {
                                console.error("Error creating files:", error);
                                new Notice("Error creating files. Check console for details.");
                            });
                    } catch (err: any) {
                        new ErrorModal(this.app, err).open();
                    }
                    return true;
                }

                return false;
            },
        });

        this.addCommand({
            id: 'export-supernote-note-as-pdf',
            name: 'Export this Supernote note as PDF',
            checkCallback: (checking: boolean) => {
                const file = this.app.workspace.getActiveFile();
                const ext = file?.extension;

                if (ext === "note") {
                    if (checking) {
                        return true
                    }
                    try {
                        if (!file) {
                            throw new Error("No file to attach");
                        }
                        vw.exportToPDF(file)
                            .then(pdfFile => {
                                if (pdfFile) {
                                    new Notice(`PDF created at: ${pdfFile.path}`);
                                }
                            })
                            .catch(error => {
                                console.error("Error creating PDF:", error);
                                new Notice("Error creating PDF. Check console for details.");
                            });
                    } catch (err: any) {
                        new ErrorModal(this.app, err).open();
                    }
                    return true;
                }

                return false;
            },
        });

        this.addCommand({
            id: 'export-supernote-note-as-markdown',
            name: 'Export this Supernote note as a markdown file attachment',
            checkCallback: (checking: boolean) => {
                const file = this.app.workspace.getActiveFile();
                const ext = file?.extension;

                if (ext === "note") {
                    if (checking) {
                        return true
                    }
                    try {
                        if (!file) {
                            throw new Error("No file to attach");
                        }
                        vw.attachMarkdownFile(file)
                            .then(mdFile => {
                                if (mdFile) {
                                    new Notice(`Markdown file created at: ${mdFile.path}`);
                                }
                            })
                            .catch(error => {
                                console.error("Error creating markdown file:", error);
                                new Notice("Error creating markdown file. Check console for details.");
                            });
                    } catch (err: any) {
                        new ErrorModal(this.app, err).open();
                    }
                    return true;
                }

                return false;
            },
        });
    }

    onunload() {
        // Clean up when plugin is disabled
    }

    async activateView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_SUPERNOTE);

        if (leaves.length > 0) {
            // A leaf with our view already exists, use that
            leaf = leaves[0];
        } else {
            // Our view could not be found in the workspace, create a new leaf
            // in the right sidebar for it
            leaf = workspace.getRightLeaf(false);
            if (!leaf) {
                throw new Error("leaf is null");
            }
            await leaf.setViewState({ type: VIEW_TYPE_SUPERNOTE, active: true });
        }

        // "Reveal" the leaf in case it is in a collapsed sidebar
        workspace.revealLeaf(leaf);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class DirectConnectErrorModal extends Modal {
    error: Error;
    public settings: SupernotePluginSettings;

    constructor(app: App, settings: SupernotePluginSettings, error: Error) {
        super(app);
        this.error = error;
        this.settings = settings;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.setText(`Error: ${this.error.message}. Is the Supernote connected to Wifi on IP ${this.settings.directConnectIP} and running Screen Mirroring?`);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

class ErrorModal extends Modal {
    error: Error;

    constructor(app: App, error: Error) {
        super(app);
        this.error = error;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.setText(`Error: ${this.error.message}.`);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}