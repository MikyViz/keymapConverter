"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
// Import keymap-inspector
const { KeymapInspector, en, ru, he } = require('keymap-inspector');
/**
 * Class for working with layout conversion in VS Code
 */
class VSCodeKeymapConverter {
    constructor() {
        this.layoutNames = {
            'en': '🇺🇸 English',
            'ru': '🇷🇺 Русский',
            'he': '🇮🇱 עברית'
        };
        // Initialize keymap-inspector with supported layouts
        this.inspector = new KeymapInspector({ en, ru, he });
    }
    /**
     * Show Quick Pick for layout selection and conversion
     * Works with editor selection OR clipboard
     */
    async convertSelectedText() {
        const editor = vscode.window.activeTextEditor;
        let selectedText = '';
        let isEditorMode = false;
        let selection;
        // Try to get text from editor first
        if (editor && !editor.selection.isEmpty) {
            selection = editor.selection;
            selectedText = editor.document.getText(selection);
            isEditorMode = true;
        }
        // If no selection in editor, try clipboard
        if (!selectedText) {
            try {
                selectedText = await vscode.env.clipboard.readText();
                isEditorMode = false;
            }
            catch (error) {
                // Ignore clipboard errors
            }
        }
        if (!selectedText || !selectedText.trim()) {
            // Show helpful message based on context
            if (editor) {
                vscode.window.showWarningMessage('💡 Select text to convert (in editor or copy to clipboard first with Ctrl+C)');
            }
            else {
                vscode.window.showInformationMessage('💡 To convert text: 1) Select text 2) Copy (Ctrl+C) 3) Run this command again', 'Got it');
            }
            return;
        }
        try {
            // Convert to all available layouts
            const variants = this.convertTextToAllLayouts(selectedText);
            if (variants.length === 0) {
                vscode.window.showInformationMessage('Text does not require conversion');
                return;
            }
            // Create variants for Quick Pick
            const layoutNames = this.layoutNames;
            const modeLabel = isEditorMode ? '📝 Editor' : '📋 Clipboard';
            const quickPickItems = [
                {
                    label: '🎯 Auto-detect',
                    description: 'Choose the best option automatically',
                    detail: this.getBestConversion(selectedText, variants)
                },
                ...variants.map(variant => ({
                    label: layoutNames[variant.layout],
                    description: variant.layout.toUpperCase(),
                    detail: variant.text
                })),
                {
                    label: '📊 Show details',
                    description: 'Detailed character information',
                    detail: 'Open window with conversion details'
                }
            ];
            const selected = await vscode.window.showQuickPick(quickPickItems, {
                placeHolder: `${modeLabel} Convert "${selectedText.length > 30 ? selectedText.substring(0, 30) + '...' : selectedText}"`,
                title: 'Keymap Converter'
            });
            if (!selected) {
                return;
            }
            if (selected.label === '📊 Show details') {
                await this.showCharacterDetails(selectedText);
            }
            else if (selected.label === '🎯 Auto-detect') {
                const bestConversion = this.getBestConversion(selectedText, variants);
                if (isEditorMode && editor && selection) {
                    await this.replaceText(editor, selection, bestConversion);
                    vscode.window.showInformationMessage(`✅ Text converted in editor`);
                }
                else {
                    await this.copyToClipboard(bestConversion);
                    vscode.window.showInformationMessage(`✅ Converted and copied to clipboard (paste with Ctrl+V)`);
                }
            }
            else {
                // Find the matching variant
                const variant = variants.find(v => layoutNames[v.layout] === selected.label);
                if (variant) {
                    if (isEditorMode && editor && selection) {
                        await this.replaceText(editor, selection, variant.text);
                        vscode.window.showInformationMessage(`✅ Converted to ${selected.label}`);
                    }
                    else {
                        await this.copyToClipboard(variant.text);
                        vscode.window.showInformationMessage(`✅ Converted to ${selected.label} (paste with Ctrl+V)`);
                    }
                }
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Conversion error: ${error}`);
        }
    }
    /**
     * Convert text to all supported layouts
     */
    convertTextToAllLayouts(text) {
        const results = [];
        const layouts = ['en', 'ru', 'he'];
        layouts.forEach(layout => {
            try {
                const converted = this.convertToLayout(text, layout);
                if (converted !== text && converted.trim()) {
                    results.push({ layout, text: converted });
                }
            }
            catch (error) {
                console.warn(`Error converting to ${layout}:`, error);
            }
        });
        return results;
    }
    /**
     * Convert to specific layout
     */
    convertToLayout(text, targetLayout) {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            // Check if it's whitespace/special character
            if (char === ' ' || char === '\n' || char === '\t' || char === '\r') {
                result += char;
                continue;
            }
            try {
                // Inspect character
                const inspection = this.inspector.inspect(char);
                if (inspection && inspection.layouts && inspection.layouts[targetLayout]) {
                    // Convert to target layout
                    result += inspection.layouts[targetLayout];
                }
                else {
                    // If conversion not possible, keep as is
                    result += char;
                }
            }
            catch (error) {
                // In case of error, keep character as is
                result += char;
            }
        }
        return result;
    }
    /**
     * Determine the best conversion option
     */
    getBestConversion(originalText, variants) {
        if (variants.length === 0) {
            return originalText;
        }
        // Simple heuristic: choose the variant with the most changes
        let bestVariant = variants[0];
        let maxChanges = 0;
        variants.forEach(variant => {
            const changes = this.countDifferences(originalText, variant.text);
            if (changes > maxChanges) {
                maxChanges = changes;
                bestVariant = variant;
            }
        });
        return bestVariant.text;
    }
    /**
     * Count differences between strings
     */
    countDifferences(str1, str2) {
        let differences = 0;
        const minLength = Math.min(str1.length, str2.length);
        for (let i = 0; i < minLength; i++) {
            if (str1[i] !== str2[i]) {
                differences++;
            }
        }
        return differences + Math.abs(str1.length - str2.length);
    }
    /**
     * Replace text in editor
     */
    async replaceText(editor, selection, newText) {
        await editor.edit(editBuilder => {
            editBuilder.replace(selection, newText);
        });
    }
    /**
     * Copy to clipboard
     */
    async copyToClipboard(text) {
        await vscode.env.clipboard.writeText(text);
    }
    /**
     * Show detailed character information
     */
    async showCharacterDetails(text) {
        const details = [`📊 Text analysis: "${text}"\n`];
        details.push(`Length: ${text.length} characters\n`);
        const convertibleChars = Array.from(text).filter(char => {
            try {
                this.inspector.inspect(char);
                return true;
            }
            catch {
                return false;
            }
        });
        details.push(`Convertible characters: ${convertibleChars.length}\n`);
        details.push('─'.repeat(50) + '\n');
        // Analyze each character (max 20 characters)
        const charsToAnalyze = Array.from(text).slice(0, 20);
        charsToAnalyze.forEach((char, index) => {
            if (char.trim()) {
                try {
                    const result = this.inspector.inspect(char);
                    if (result && result.layouts) {
                        details.push(`Character ${index + 1}: "${char}"`);
                        details.push(`  🇺🇸 EN: ${result.layouts.en || '—'}`);
                        details.push(`  🇷🇺 RU: ${result.layouts.ru || '—'}`);
                        details.push(`  🇮🇱 HE: ${result.layouts.he || '—'}`);
                        details.push(`  Key: ${result.keyDefinition?.key || '—'} | Code: ${result.keyDefinition?.code || '—'}`);
                        details.push('');
                    }
                }
                catch (error) {
                    details.push(`Character ${index + 1}: "${char}" - not found in layouts`);
                    details.push('');
                }
            }
        });
        if (text.length > 20) {
            details.push(`... and ${text.length - 20} more characters`);
        }
        // Create temporary document with results
        const doc = await vscode.workspace.openTextDocument({
            content: details.join('\n'),
            language: 'plaintext'
        });
        await vscode.window.showTextDocument(doc, {
            viewColumn: vscode.ViewColumn.Beside,
            preview: true
        });
    }
    /**
     * Convert selected text to specific layout (for commands)
     * Works with editor selection OR clipboard
     */
    async convertToSpecificLayout(layout) {
        const editor = vscode.window.activeTextEditor;
        let selectedText = '';
        let isEditorMode = false;
        let selection;
        // Try to get text from editor first
        if (editor && !editor.selection.isEmpty) {
            selection = editor.selection;
            selectedText = editor.document.getText(selection);
            isEditorMode = true;
        }
        // If no selection in editor, try clipboard
        if (!selectedText) {
            try {
                selectedText = await vscode.env.clipboard.readText();
                isEditorMode = false;
            }
            catch (error) {
                // Ignore clipboard errors
            }
        }
        if (!selectedText || !selectedText.trim()) {
            if (editor) {
                vscode.window.showWarningMessage('💡 Select text to convert (in editor or copy to clipboard first with Ctrl+C)');
            }
            else {
                vscode.window.showInformationMessage('💡 To convert text: 1) Select text 2) Copy (Ctrl+C) 3) Run this command again', 'Got it');
            }
            return;
        }
        try {
            const converted = this.convertToLayout(selectedText, layout);
            if (converted !== selectedText) {
                const layoutNames = this.layoutNames;
                const layoutName = layoutNames[layout];
                if (isEditorMode && editor && selection) {
                    await this.replaceText(editor, selection, converted);
                    vscode.window.showInformationMessage(`✅ Converted to ${layoutName}`);
                }
                else {
                    await this.copyToClipboard(converted);
                    vscode.window.showInformationMessage(`✅ Converted to ${layoutName} → Now paste with Ctrl+V`);
                }
            }
            else {
                vscode.window.showInformationMessage('Text is already in the target layout');
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Conversion error: ${error}`);
        }
    }
    /**
     * Convert text from clipboard (works anywhere in VS Code)
     */
    async convertFromClipboard() {
        try {
            // Read from clipboard
            const clipboardText = await vscode.env.clipboard.readText();
            if (!clipboardText || !clipboardText.trim()) {
                vscode.window.showWarningMessage('Clipboard is empty');
                return;
            }
            // Convert to all available layouts
            const variants = this.convertTextToAllLayouts(clipboardText);
            if (variants.length === 0) {
                vscode.window.showInformationMessage('Text does not require conversion');
                return;
            }
            // Create variants for Quick Pick
            const layoutNames = this.layoutNames;
            const quickPickItems = [
                {
                    label: '🎯 Auto-detect',
                    description: 'Choose the best option automatically',
                    detail: this.getBestConversion(clipboardText, variants)
                },
                ...variants.map(variant => ({
                    label: layoutNames[variant.layout],
                    description: variant.layout.toUpperCase(),
                    detail: variant.text
                }))
            ];
            const selected = await vscode.window.showQuickPick(quickPickItems, {
                placeHolder: `Convert clipboard: "${clipboardText.length > 30 ? clipboardText.substring(0, 30) + '...' : clipboardText}"`,
                title: 'Keymap Converter - Clipboard Mode'
            });
            if (!selected) {
                return;
            }
            if (selected.label === '🎯 Auto-detect') {
                const bestConversion = this.getBestConversion(clipboardText, variants);
                await this.copyToClipboard(bestConversion);
                vscode.window.showInformationMessage(`✅ Converted and copied back to clipboard`);
            }
            else {
                // Find the matching variant
                const variant = variants.find(v => layoutNames[v.layout] === selected.label);
                if (variant) {
                    await this.copyToClipboard(variant.text);
                    vscode.window.showInformationMessage(`✅ Converted to ${selected.label} and copied to clipboard`);
                }
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Conversion error: ${error}`);
        }
    }
    /**
     * Convert clipboard to specific layout
     */
    async convertClipboardToLayout(layout) {
        try {
            const clipboardText = await vscode.env.clipboard.readText();
            if (!clipboardText || !clipboardText.trim()) {
                vscode.window.showWarningMessage('Clipboard is empty');
                return;
            }
            const converted = this.convertToLayout(clipboardText, layout);
            if (converted !== clipboardText) {
                await this.copyToClipboard(converted);
                const layoutNames = this.layoutNames;
                const layoutName = layoutNames[layout];
                vscode.window.showInformationMessage(`✅ Clipboard converted to ${layoutName}`);
            }
            else {
                vscode.window.showInformationMessage('Text is already in the target layout');
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Conversion error: ${error}`);
        }
    }
}
/**
 * Extension activation
 */
function activate(context) {
    console.log('🚀 Keymap Converter extension activated');
    const converter = new VSCodeKeymapConverter();
    // Main conversion command
    const convertCommand = vscode.commands.registerCommand('keymapConverter.convertSelection', () => converter.convertSelectedText());
    // Commands for quick conversion to specific layouts
    const convertToEnglish = vscode.commands.registerCommand('keymapConverter.convertToEnglish', () => converter.convertToSpecificLayout('en'));
    const convertToRussian = vscode.commands.registerCommand('keymapConverter.convertToRussian', () => converter.convertToSpecificLayout('ru'));
    const convertToHebrew = vscode.commands.registerCommand('keymapConverter.convertToHebrew', () => converter.convertToSpecificLayout('he'));
    // Clipboard conversion commands (work anywhere in VS Code)
    const convertFromClipboard = vscode.commands.registerCommand('keymapConverter.convertFromClipboard', () => converter.convertFromClipboard());
    const convertClipboardToEnglish = vscode.commands.registerCommand('keymapConverter.convertClipboardToEnglish', () => converter.convertClipboardToLayout('en'));
    const convertClipboardToRussian = vscode.commands.registerCommand('keymapConverter.convertClipboardToRussian', () => converter.convertClipboardToLayout('ru'));
    const convertClipboardToHebrew = vscode.commands.registerCommand('keymapConverter.convertClipboardToHebrew', () => converter.convertClipboardToLayout('he'));
    // Register commands
    context.subscriptions.push(convertCommand, convertToEnglish, convertToRussian, convertToHebrew, convertFromClipboard, convertClipboardToEnglish, convertClipboardToRussian, convertClipboardToHebrew);
    // Register completion provider for conversion
    const completionProvider = vscode.languages.registerCompletionItemProvider('*', {
        provideCompletionItems(document, position) {
            // Get word at cursor
            const range = document.getWordRangeAtPosition(position);
            if (!range) {
                return [];
            }
            const word = document.getText(range);
            if (word.length < 2) {
                return [];
            }
            // Create conversion suggestions
            const suggestions = [];
            const variants = converter['convertTextToAllLayouts'](word);
            variants.forEach(variant => {
                const item = new vscode.CompletionItem(variant.text, vscode.CompletionItemKind.Text);
                item.detail = `Keymap: ${converter['layoutNames'][variant.layout]}`;
                item.documentation = `Convert "${word}" to ${variant.layout.toUpperCase()}`;
                item.insertText = variant.text;
                suggestions.push(item);
            });
            return suggestions;
        }
    });
    context.subscriptions.push(completionProvider);
    vscode.window.showInformationMessage('✅ Keymap Converter is ready! Use Ctrl+Shift+K');
}
exports.activate = activate;
/**
 * Extension deactivation
 */
function deactivate() {
    console.log('Keymap Converter extension deactivated');
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map