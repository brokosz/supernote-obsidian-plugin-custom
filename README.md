# Customized Supernote-Obsidian Plugin

This is a customized fork of the [Supernote-Obsidian plugin](https://github.com/philips/supernote-obsidian-plugin) with enhanced features for better organization of notes, images, and exported files.

## Added Features

### Custom Output Paths
- Specify custom folders for note files, exported markdown, images, and PDFs
- Keep your vault organized with dedicated asset folders
- Automatically create necessary folders if they don't exist

### Note Categorization
- Automatically categorize notes as "daily notes" or "concept notes" based on filename patterns
- Send daily notes to a dedicated Daily Notes folder
- Send concept notes (non-daily) to a separate Notes folder
- Customize the detection pattern with regular expressions

## Installation

### Manual Installation
1. Download the latest release from this repository
2. Extract the files to your `.obsidian/plugins/supernote-obsidian-plugin/` directory
3. Enable the plugin in Obsidian settings

## Configuration

### Custom Output Paths
In the plugin settings, you can specify custom paths for:
- Images: Where exported PNG files will be saved (default: `_assets/supernote/images`)
- Markdown: Where exported markdown files will be saved (default: `_assets/supernote/markdown`)
- PDF: Where exported PDF files will be saved (default: `_assets/supernote/pdf`)

### Note Categorization
The plugin can intelligently sort notes based on their filename:
- Enable note categorization: Toggle this setting on to use smart categorization
- Daily note pattern: Use a regular expression to identify which notes are daily notes (default pattern matches YYYY-MM-DD format)
- Daily note output folder: The folder where daily notes will be placed (default: `Daily Notes`)
- Concept note output folder: The folder where non-daily notes will be placed (default: `Notes`)

## Workflow Examples

### Daily Notes Workflow
1. Create notes on your Supernote using the date format (e.g., `2025-05-19`)
2. Enable note categorization and set your preferred daily note pattern
3. When exported, these notes will automatically go to your Daily Notes folder, while their assets (images, original .note files) will go to the specified asset folders

### Concept Notes Workflow
1. Create notes on your Supernote with descriptive titles (e.g., `Project Ideas`, `Meeting with Claire`)
2. These will be recognized as concept notes (not matching the daily note pattern)
3. When exported, these notes will be placed in your designated Notes folder

## Development

To build this plugin from source:
1. Clone this repository
2. Install dependencies: `npm install`
3. Build the plugin: `npm run build`

## Credits

This plugin is a customized version of the original [Supernote-Obsidian plugin](https://github.com/philips/supernote-obsidian-plugin) by @philips.
