import { SupernoteX } from 'supernote-typescript';

// Create a transparent 1x1 pixel as a placeholder
const PLACEHOLDER_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

/**
 * Simplified ImageConverter class that doesn't use workers
 */
export class ImageConverter {
    constructor() {
        // No worker initialization needed
    }

    async convertToImages(note: SupernoteX, pageNumbers?: number[]): Promise<string[]> {
        // If no pages, return empty array
        if (!note.pages || note.pages.length === 0) {
            return [];
        }

        // Set up page numbers
        const pages = pageNumbers ?? Array.from({length: note.pages.length}, (_, i) => i+1);
        
        // Instead of using a worker, just return placeholder images
        // This is a simplified implementation for development
        return Promise.resolve(pages.map(() => PLACEHOLDER_IMAGE));
    }

    terminate() {
        // No worker to terminate
    }
}