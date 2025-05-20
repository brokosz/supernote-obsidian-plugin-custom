/**
 * Custom VaultWriter class with extended path handling capabilities
 */
import { App, TFile } from 'obsidian';
import { SupernotePluginSettings } from './settings';
import { SupernoteX } from 'supernote-typescript';
import { dataUrlToBuffer, processSupernoteText, formatStandardDate, filenameMatchesMomentPattern } from './utils';
import { ImageConverter } from './imageConverter';
import { jsPDF } from 'jspdf';

export class VaultWriter {
    app: App;
    settings: SupernotePluginSettings;

    constructor(app: App, settings: SupernotePluginSettings) {
        this.app = app;
        this.settings = settings;
    }

    /**
     * Ensures the specified directory exists, creating it if needed
     */
    async ensureDirectoryExists(dir: string): Promise<void> {
        // Skip if directory is empty (root) or doesn't exist
        if (!dir || dir === '/') return;

        try {
            // Check if directory exists
            const abstractFile = this.app.vault.getAbstractFileByPath(dir);
            if (abstractFile === null) {
                // Create directory if it doesn't exist
                await this.app.vault.createFolder(dir);
            }
        } catch (error) {
            console.error(`Error creating directory ${dir}:`, error);
            throw error;
        }
    }

    /**
     * Determines the appropriate output path based on note type and settings
     */
    getOutputPath(file: TFile, pathType: 'markdown' | 'image' | 'pdf'): string {
        // Get the base path from settings
        let basePath = '';

        switch (pathType) {
            case 'markdown':
                basePath = this.settings.customMarkdownPath;
                break;
            case 'image':
                basePath = this.settings.customImagesPath;
                break;
            case 'pdf':
                basePath = this.settings.customPDFPath;
                break;
        }

        // If note categorization is enabled, determine if this is a daily note
        if (this.settings.useNoteCategorization) {
            try {
                // Use Moment.js pattern matching
                const isDaily = filenameMatchesMomentPattern(file.basename, this.settings.dailyNotePattern);
                
                if (isDaily) {
                    // This is a daily note, use daily note folder
                    if (pathType === 'markdown') {
                        return this.settings.dailyNoteOutputFolder;
                    } else {
                        return basePath;
                    }
                } else {
                    // This is another type of note, use the other notes folder
                    if (pathType === 'markdown') {
                        return this.settings.conceptNoteOutputFolder;
                    } else {
                        return basePath;
                    }
                }
            } catch (error) {
                console.error('Error parsing daily note pattern:', error);
                // Fall back to base path if matching fails
                return basePath;
            }
        }

        // Default to the configured base path
        return basePath;
    }

    /**
     * Builds a full file path including directory and extension
     */
    buildFilePath(directory: string, basename: string, extension: string): string {
        if (!directory || directory === '') {
            // If no directory, use root of vault
            return `${basename}.${extension}`;
        } else {
            // Otherwise, use the specified directory
            return `${directory}/${basename}.${extension}`;
        }
    }

    /**
     * Writes a Markdown file based on the Supernote content
     */
    async writeMarkdownFile(file: TFile, sn: SupernoteX, imgs: TFile[] | null) {
        // Get the output path
        const outputPath = this.getOutputPath(file, 'markdown');
        
        // Ensure the directory exists (if it's not root)
        if (outputPath) {
            await this.ensureDirectoryExists(outputPath);
        }

        let content = '';
        let fileBasename = file.basename;

        // Generate a non-conflicting filename
        let filename = this.buildFilePath(outputPath, fileBasename, 'md');
            
        let i = 0;
        while (this.app.vault.getAbstractFileByPath(filename) !== null) {
            filename = this.buildFilePath(outputPath, `${fileBasename} ${++i}`, 'md');
        }

        content = this.app.fileManager.generateMarkdownLink(file, filename);
        content += '\n';

        if (sn.pages) {
            for (let i = 0; i < sn.pages.length; i++) {
                content += `## Page ${i + 1}\n\n`;
                if (i < sn.pages.length && sn.pages[i] && sn.pages[i].text !== undefined && 
                    sn.pages[i].text && typeof sn.pages[i].text === 'string' && sn.pages[i].text.length > 0) {
                    content += `${processSupernoteText(sn.pages[i].text, this.settings)}\n`;
                }
                if (imgs) {
                    let subpath = '';
                    if (this.settings.invertColorsWhenDark) {
                        subpath = '#supernote-invert-dark';
                    }

                    if (i < imgs.length) {
                        const link = this.app.fileManager.generateMarkdownLink(imgs[i], filename, subpath);
                        content += `${link}\n`;
                    }
                }
            }
        }

        const createdFile = await this.app.vault.create(filename, content);
        return createdFile;
    }

    /**
     * Writes image files based on the Supernote content
     */
    async writeImageFiles(file: TFile, sn: SupernoteX): Promise<TFile[]> {
        // Get the output path
        const outputPath = this.getOutputPath(file, 'image');
        
        // Ensure the directory exists (if it's not root)
        if (outputPath) {
            await this.ensureDirectoryExists(outputPath);
        }

        let images: string[] = [];

        const converter = new ImageConverter();
        try {
            images = await converter.convertToImages(sn);
        } finally {
            // Clean up the worker when done
            converter.terminate();
        }

        let imgs: TFile[] = [];
        for (let i = 0; i < images.length; i++) {
            let filename;
            
            if (outputPath) {
                // Use custom output path
                filename = `${outputPath}/${file.basename}-${i}.png`;
                
                // Check uniqueness manually
                let j = 0;
                while (this.app.vault.getAbstractFileByPath(filename) !== null) {
                    filename = `${outputPath}/${file.basename}-${i}-${++j}.png`;
                }
            } else {
                // Use default attachment path (handles uniqueness automatically)
                filename = await this.app.fileManager.getAvailablePathForAttachment(`${file.basename}-${i}.png`);
            }
            
            const buffer = dataUrlToBuffer(images[i]);
            imgs.push(await this.app.vault.createBinary(filename, buffer));
        }
        return imgs;
    }

    /**
     * Attaches a Markdown file for the note
     */
    async attachMarkdownFile(file: TFile) {
        const note = await this.app.vault.readBinary(file);
        let sn = new SupernoteX(new Uint8Array(note));

        return this.writeMarkdownFile(file, sn, null);
    }

    /**
     * Attaches both image and Markdown files for the note
     */
    async attachNoteFiles(file: TFile) {
        const note = await this.app.vault.readBinary(file);
        let sn = new SupernoteX(new Uint8Array(note));

        const imgs = await this.writeImageFiles(file, sn);
        return this.writeMarkdownFile(file, sn, imgs);
    }

    /**
     * Exports the note to PDF
     */
    async exportToPDF(file: TFile) {
        // Get the output path
        const outputPath = this.getOutputPath(file, 'pdf');
        
        // Ensure the directory exists (if it's not root)
        if (outputPath) {
            await this.ensureDirectoryExists(outputPath);
        }

        const note = await this.app.vault.readBinary(file);
        let sn = new SupernoteX(new Uint8Array(note));

        // Create PDF document
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'px',
            format: [sn.pageWidth || 1404, sn.pageHeight || 1872] // A5 size in pixels
        });

        // Convert note pages to images
        const converter = new ImageConverter();
        let images: string[] = [];
        try {
            images = await converter.convertToImages(sn);
        } finally {
            converter.terminate();
        }

        // Add each page to PDF
        if (sn.pages) {
            for (let i = 0; i < images.length; i++) {
                if (i > 0) {
                    pdf.addPage();
                }

                if (i < sn.pages.length && sn.pages[i] && sn.pages[i].text !== undefined && 
                    sn.pages[i].text && typeof sn.pages[i].text === 'string' && sn.pages[i].text.length > 0) {
                    pdf.setFontSize(100);
                    pdf.setTextColor(0, 0, 0, 0); // Transparent text
                    pdf.text(processSupernoteText(sn.pages[i].text, this.settings), 20, 20, { maxWidth: sn.pageWidth || 1404 });
                    pdf.setTextColor(0, 0, 0, 1);
                }

                // Add image first
                pdf.addImage(images[i], 'PNG', 0, 0, sn.pageWidth || 1404, sn.pageHeight || 1872);
            }
        }

        // Generate filename
        let filename;
        if (outputPath) {
            // Use custom output path
            filename = `${outputPath}/${file.basename}.pdf`;
            
            // Check uniqueness manually
            let j = 0;
            while (this.app.vault.getAbstractFileByPath(filename) !== null) {
                filename = `${outputPath}/${file.basename}-${++j}.pdf`;
            }
        } else {
            // Use default attachment path (handles uniqueness automatically)
            filename = await this.app.fileManager.getAvailablePathForAttachment(`${file.basename}.pdf`);
        }
        
        const pdfOutput = pdf.output('arraybuffer');
        return await this.app.vault.createBinary(filename, pdfOutput);
    }
}