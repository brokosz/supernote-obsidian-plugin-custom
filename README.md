# Customized Supernote-Obsidian Plugin

This is a customized fork of the [Supernote-Obsidian plugin](https://github.com/philips/supernote-obsidian-plugin) with enhanced features for better organization of notes, images, and exported files.

## Added Features

### Custom Output Paths
- Specify custom folders for note files, exported markdown, images, and PDFs
- Keep your vault organized with dedicated asset folders
- Automatically create necessary folders if they don't exist

### Note Categorization
- Automatically categorize notes as "daily notes" or "other notes" based on filename patterns
- Send daily notes to a dedicated folder of your choice
- Send other notes to a separate folder or the vault root
- Customize the detection pattern with moment.js format strings

### Folder Suggestion
- Improved folder path suggestions when typing in path fields
- Makes it easier to navigate your vault folder structure

## Installation

### Manual Installation
1. Download the latest release from this repository
2. Extract the files to your `.obsidian/plugins/supernote-obsidian-plugin/` directory
3. Enable the plugin in Obsidian settings

## Configuration

### Custom Output Paths
In the plugin settings, you can specify custom paths for:
- Images: Where exported PNG files will be saved (default: `_assets/supernote/images`)
- Markdown: Where exported markdown files will be saved (default: empty - same location as source)
- PDF: Where exported PDF files will be saved (default: `_assets/supernote/pdf`)

### Note Categorization
The plugin can intelligently sort notes based on their filename:
- Enable note categorization: Toggle this setting on to use smart categorization
- Daily note pattern: Use a moment.js format to identify which notes are daily notes (default: `YYYYMMDD-HHMMSS`)
- Daily note output folder: The folder where daily notes will be placed
- Other notes output folder: The folder where non-daily notes will be placed (leave empty to use vault root)

## Workflow Examples

### Daily Notes Workflow
1. Supernote devices automatically name files with a timestamp format like `20250519-123045.note`
2. Enable note categorization in the plugin settings
3. Set the daily note pattern to `YYYYMMDD-HHMMSS` (the default)
4. Set your preferred output folder for daily notes
5. When exported, these timestamp-named notes will automatically go to your chosen daily notes folder

### Other Notes Workflow
1. When you create custom-named notes on your Supernote (like `Meeting Notes.note` or `Project Ideas.note`)
2. These will be recognized as non-daily notes (not matching the timestamp pattern)
3. When exported, these notes will be placed in your designated folder for other notes (or the vault root if left empty)

## Development

To build this plugin from source:
1. Clone this repository
2. Install dependencies: `npm install`
3. Build the plugin: `npm run build`

## Credits

This plugin is a customized version of the original [Supernote-Obsidian plugin](https://github.com/philips/supernote-obsidian-plugin) by @philips.