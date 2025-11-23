# 🌐 Keymap Converter

Universal solution for converting text between keyboard layouts. Supports Russian, English, and Hebrew layouts.

## ✨ Features

- 🔄 Automatic text conversion between layouts
- 🎯 Smart detection of the best conversion option
- 📊 Detailed character analysis and mappings
- 🌐 Web application for browser usage
- 🔧 VS Code extension (including GitHub Copilot Chat support)
- 🌍 Browser extension for any website
- ⚡ Hotkeys for quick conversion
- 📋 Automatic clipboard copy

## 🚀 Quick Start

### 📦 Install Dependencies
```bash
npm install
```
> **Note:** Installation automatically copies `keymap-inspector.js` from npm package to `browser-extension/` (postinstall hook)

### 🌐 Web Application
```bash
npm run dev
```
Open http://localhost:8080

### 🔧 VS Code Extension
```bash
npm run compile
```
Press F5 to launch Extension Development Host

### 🌍 Browser Extension

**Installation (Chrome / Edge / Brave):**

1. **Open extensions page:**
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
   - Brave: `brave://extensions/`

2. **Enable Developer mode** (toggle in top-right corner)

3. **Load extension:**
   - Click "Load unpacked"
   - Select the `browser-extension` folder

4. **Done!** 🎉 Pin the icon to toolbar for quick access

**Development:**
```bash
npm install              # Install + auto-copy keymap-inspector.js
npm run build:browser    # Manual update of keymap-inspector.js from npm package
```

> **Important:** After code changes, click "↻ Reload" in `chrome://extensions/`

## ⌨️ Hotkeys

### VS Code:
- `Ctrl+Shift+K` - Universal conversion
- `Ctrl+Shift+E` - Convert to English
- `Ctrl+Shift+R` - Convert to Russian
- `Ctrl+Shift+H` - Convert to Hebrew

### Browser:
- `Ctrl+Shift+K` - Universal conversion
- `Ctrl+Shift+E` - Convert to English
- `Ctrl+Shift+R` - Convert to Russian
- `Ctrl+Shift+H` - Convert to Hebrew

## 🎯 Usage Examples

### Russian ↔ English
```
ghbdtn → привет
hello → руддщ
```

### English ↔ Hebrew
```
hello → יקדדם
shalom → שהךםם
```

## 📋 Functionality

### 🌐 Web Version
- ✅ Auto-conversion on text selection
- ✅ Switch between conversion modes
- ✅ Detailed character information
- ✅ Copy results to clipboard
- ✅ Responsive design

### 🔧 VS Code Extension
- ✅ Works in editor and GitHub Copilot Chat
- ✅ Quick Pick for conversion variant selection
- ✅ Automatic clipboard copy
- ✅ Replace selected text
- ✅ Detailed analysis in separate document
- ✅ Editor context menu

### 🌍 Browser Extension
- ✅ Works on all websites (Google, Gmail, GitHub, Slack, etc.)
- ✅ Supports INPUT, TEXTAREA, ContentEditable and plain text
- ✅ Floating 🌐 button on text selection
- ✅ Right-click context menu
- ✅ Popup interface for manual conversion
- ✅ Smart text replacement with React/Vue/Angular support
- ✅ Automatic clipboard copy
- ✅ Success notifications

## 🛠️ Technical Details

### Dependencies
- `keymap-inspector@0.1.5` - Keyboard layout conversion library
- `@types/vscode@^1.74.0` - VS Code extension types
- `@types/node@18` - Node.js types
- `typescript@^4.9.4` - TypeScript compiler
- `live-server@^1.2.2` - Local web server

### Supported Layouts
- 🇺🇸 **English (EN)** - QWERTY
- 🇷🇺 **Russian (RU)** - ЙЦУКЕН
- 🇮🇱 **Hebrew (HE)** - /'קראט'

### Architecture
- **Web version**: Vanilla JavaScript + keymap-inspector (fallback)
- **VS Code**: TypeScript extension with keymap-inspector via require()
- **Browser**: Manifest V3 extension with keymap-inspector browser bundle
- **Common logic**: keymap-inspector for precise layout conversion

### Keymap-Inspector Integration
```javascript
// VS Code Extension (Node.js)
const { KeymapInspector, en, ru, he } = require('keymap-inspector');

// Browser Extension (UMD bundle)
const script = chrome.runtime.getURL('keymap-inspector.js');
// → Automatically copied from node_modules on npm install
```

## 📝 Development

### Commands
```bash
npm run dev               # Run web version
npm run compile           # Compile VS Code extension
npm run watch             # Watch for changes
npm run build             # Build all versions
npm run build:browser     # Update keymap-inspector.js in browser-extension
npm run package           # Package VS Code extension (.vsix)
npm run publish           # Publish to VS Code Marketplace
```

### Project Structure
```
├── src/                         # VS Code extension
│   ├── extension.ts             # Main logic
│   └── simple-keymap.ts         # Fallback implementation
├── browser-extension/           # Browser extension
│   ├── manifest.json            # Chrome Extension manifest
│   ├── content.js               # Content script with keymap-inspector
│   ├── background.js            # Background script
│   ├── popup.html/js            # Popup interface
│   ├── keymap-inspector.js      # Browser bundle (generated from npm)
│   └── icons/                   # Extension icons
├── index.html                   # Web application
├── app.js                       # Web app logic
├── styles.css                   # Styles
└── package.json                 # Configuration + build scripts
```

> **Important:** `browser-extension/keymap-inspector.js` is auto-generated from `node_modules/keymap-inspector/dist/keymap-inspector.browser.js` during dependency installation

## 🤝 GitHub Copilot Integration

### VS Code extension automatically works in:
- ✅ Main editor
- ✅ GitHub Copilot Chat
- ✅ Any VS Code text field

### How to use:
1. Select text in Copilot Chat
2. Press `Ctrl+Shift+K`
3. Choose target layout
4. Text will be replaced and copied

## 🌍 Browser Extension Usage

### 🖱️ Conversion Methods:

**1. Floating 🌐 Button:**
- Select text → button appears → click to choose layout

**2. Context Menu (Right-Click):**
- Select text → right-click → "🌐 Convert Text"

**3. Hotkeys:**
- `Ctrl+Shift+K` - Automatic selection menu
- `Ctrl+Shift+E` - Convert to English
- `Ctrl+Shift+R` - Convert to Russian
- `Ctrl+Shift+H` - Convert to Hebrew (עברית)

**4. Extension Icon:**
- Click icon in toolbar

### 🎯 Examples:

```
Typed in English instead of Russian:
privet kak dela → Ctrl+Shift+R → привет как дела

Typed in Russian instead of English:
руддщ цщкдв → Ctrl+Shift+E → hello world
```

### 🔧 Troubleshooting:

**If hotkeys don't work:**
- Open `chrome://extensions/shortcuts`
- Check assigned shortcuts for "Keymap Converter"

**If button doesn't appear:**
- Press F12 → Console
- Should see: "✅ BrowserKeymapConverter инициализирован"
- Refresh page (F5)

**Full reinstall:**
1. Remove extension
2. Update code: `npm run build:browser`
3. Reinstall (see Installation section)

## 📦 VS Code Marketplace

Install from VS Code Marketplace:
👉 [Keymap Converter](https://marketplace.visualstudio.com/items?itemName=MooseBro.keymap-converter)

Or search in VS Code Extensions: `Keymap Converter`

## 📄 License

MIT License

## 🙏 Credits

- [keymap-inspector](https://github.com/MikyViz/keymap-inspector) - Powerful keyboard layout library
- VS Code API - For extension capabilities
- Chrome Extensions API - For browser integration

---

💡 **Tip**: Configure hotkeys to your preference for maximum convenience!
