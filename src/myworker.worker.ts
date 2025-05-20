// Skip type checking in this file
// @ts-nocheck

import { installAtPolyfill } from './polyfills';
installAtPolyfill();

import { SupernoteX } from 'supernote-typescript';

export { };

export type SupernoteWorkerMessage = {
    type: 'convert';
    note: SupernoteX;
    pageNumbers?: number[];
}

export type SupernoteWorkerResponse = {
    type: 'result';
    images: string[];
    error?: string;
}

// A transparent 1x1 pixel data URL
const PLACEHOLDER_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

self.onmessage = function(e) {
    try {
        const data = e.data;
        
        if (data.type === 'convert') {
            const note = data.note;
            const pageNumbers = data.pageNumbers || Array.from({length: note.pages?.length || 1}, (_, i) => i+1);
            
            // Generate placeholder images for each page
            const images = pageNumbers.map(() => PLACEHOLDER_IMAGE);
            
            self.postMessage({
                type: 'result',
                images: images
            });
        }
    } catch (error) {
        self.postMessage({
            type: 'result',
            images: [],
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
};