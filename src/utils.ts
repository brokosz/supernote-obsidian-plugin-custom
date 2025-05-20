import { SupernotePluginSettings } from './settings';
import { replaceTextWithCustomDictionary } from './customDictionary';

/**
 * Converts a Moment.js format string to a regex pattern
 * Simple implementation for common patterns
 */
export function momentPatternToRegex(momentPattern: string): RegExp {
    // Replace Moment.js tokens with regex patterns
    let pattern = momentPattern
        .replace(/YYYY/g, '\\d{4}')
        .replace(/YY/g, '\\d{2}')
        .replace(/MM/g, '\\d{2}')
        .replace(/M/g, '\\d{1,2}')
        .replace(/DD/g, '\\d{2}')
        .replace(/D/g, '\\d{1,2}')
        .replace(/HH/g, '\\d{2}')
        .replace(/H/g, '\\d{1,2}')
        .replace(/mm/g, '\\d{2}')
        .replace(/m/g, '\\d{1,2}')
        .replace(/ss/g, '\\d{2}')
        .replace(/s/g, '\\d{1,2}');
    
    // Escape other special characters
    pattern = pattern.replace(/([.*+?^${}()|[\]\\])/g, '\\$1');
    
    return new RegExp('^' + pattern + '$');
}

/**
 * Check if a filename matches a Moment.js format pattern
 */
export function filenameMatchesMomentPattern(filename: string, momentPattern: string): boolean {
    const regex = momentPatternToRegex(momentPattern);
    
    // Remove the .note extension if present
    const basename = filename.endsWith('.note') 
        ? filename.substring(0, filename.length - 5) 
        : filename;
        
    return regex.test(basename);
}

/**
 * Generates a timestamp string using a Moment.js style format
 * Default format is Supernote's standard format: "YYYYMMDD-HHMMSS"
 */
export function generateTimestamp(format: string = 'YYYYMMDD-HHMMSS'): string {
    const date = new Date();
    
    // Replace tokens with values
    return format
        .replace(/YYYY/g, date.getFullYear().toString())
        .replace(/YY/g, date.getFullYear().toString().slice(-2))
        .replace(/MM/g, String(date.getMonth() + 1).padStart(2, '0'))
        .replace(/M/g, String(date.getMonth() + 1))
        .replace(/DD/g, String(date.getDate()).padStart(2, '0'))
        .replace(/D/g, String(date.getDate()))
        .replace(/HH/g, String(date.getHours()).padStart(2, '0'))
        .replace(/H/g, String(date.getHours()))
        .replace(/mm/g, String(date.getMinutes()).padStart(2, '0'))
        .replace(/m/g, String(date.getMinutes()))
        .replace(/ss/g, String(date.getSeconds()).padStart(2, '0'))
        .replace(/s/g, String(date.getSeconds()));
}

/**
 * Formats a date using a Moment.js style format string
 */
export function formatDate(date: Date, format: string = 'YYYY-MM-DD'): string {
    return format
        .replace(/YYYY/g, date.getFullYear().toString())
        .replace(/YY/g, date.getFullYear().toString().slice(-2))
        .replace(/MM/g, String(date.getMonth() + 1).padStart(2, '0'))
        .replace(/M/g, String(date.getMonth() + 1))
        .replace(/DD/g, String(date.getDate()).padStart(2, '0'))
        .replace(/D/g, String(date.getDate()))
        .replace(/HH/g, String(date.getHours()).padStart(2, '0'))
        .replace(/H/g, String(date.getHours()))
        .replace(/mm/g, String(date.getMinutes()).padStart(2, '0'))
        .replace(/m/g, String(date.getMinutes()))
        .replace(/ss/g, String(date.getSeconds()).padStart(2, '0'))
        .replace(/s/g, String(date.getSeconds()));
}

/**
 * Formats a date in YYYY-MM-DD format (standard format)
 */
export function formatStandardDate(date: Date): string {
    return formatDate(date, 'YYYY-MM-DD');
}

/**
 * Formats a date in YYYYMMDD-HHMMSS format (Supernote's format)
 */
export function formatSupernoteDate(date: Date): string {
    return formatDate(date, 'YYYYMMDD-HHMMSS');
}

/**
 * Converts a data URL to an ArrayBuffer
 */
export function dataUrlToBuffer(dataUrl: string): ArrayBuffer {
    // Remove data URL prefix (e.g., "data:image/png;base64,")
    const base64 = dataUrl.split(',')[1];
    // Convert base64 to binary string
    const binaryString = atob(base64);
    // Create buffer and view
    const bytes = new Uint8Array(binaryString.length);
    // Convert binary string to buffer
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Processes the Supernote text based on the provided settings
 */
export function processSupernoteText(text: string, settings: SupernotePluginSettings): string {
    let processedText = text;
    if (settings.isCustomDictionaryEnabled) {
        processedText = replaceTextWithCustomDictionary(processedText, settings.customDictionary);
    }
    return processedText;
}