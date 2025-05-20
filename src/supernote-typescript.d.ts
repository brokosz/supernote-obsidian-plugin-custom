declare module 'supernote-typescript' {
    export class SupernoteX {
        constructor(data: Uint8Array);
        
        // Properties
        pageWidth: number;
        pageHeight: number;
        pages: {
            text?: string;
            [key: string]: any;
        }[];
        
        // Methods
        getHeader(): any;
        getFooter(): any;
        getSignature(): any;
        getKeywords(): any;
        getTitles(): any;
        getCover(): any;
    }
}
