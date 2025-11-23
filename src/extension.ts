import * as vscode from 'vscode';

// Import keymap-inspector
const { KeymapInspector, en, ru, he } = require('keymap-inspector');

/**
 * Class for working with layout conversion in VS Code
 */
class VSCodeKeymapConverter {
    private inspector: any;
    private readonly layoutNames = {
        'en': '🇺🇸 English',
        'ru': '🇷🇺 Русский', 
        'he': '🇮🇱 עברית'
    };

    constructor() {
        // Initialize keymap-inspector with supported layouts
        this.inspector = new KeymapInspector({ en, ru, he });
    }

    /**
     * Show Quick Pick for layout selection and conversion
     */
    async convertSelectedText(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('Open a file to work with text');
            return;
        }

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);

        if (!selectedText) {
            vscode.window.showWarningMessage('Select text to convert');
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
            const quickPickItems: vscode.QuickPickItem[] = [
                {
                    label: '🎯 Auto-detect',
                    description: 'Choose the best option automatically',
                    detail: this.getBestConversion(selectedText, variants)
                },
                ...variants.map(variant => ({
                    label: layoutNames[variant.layout as keyof typeof layoutNames],
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
                placeHolder: `Convert "${selectedText.length > 30 ? selectedText.substring(0, 30) + '...' : selectedText}"`,
                title: 'Keymap Converter'
            });

            if (!selected) {
                return;
            }

            if (selected.label === '📊 Show details') {
                await this.showCharacterDetails(selectedText);
            } else if (selected.label === '🎯 Auto-detect') {
                const bestConversion = this.getBestConversion(selectedText, variants);
                await this.replaceText(editor, selection, bestConversion);
                await this.copyToClipboard(bestConversion);
                vscode.window.showInformationMessage(`✅ Text converted and copied to clipboard`);
            } else {
                // Find the matching variant
                const variant = variants.find(v => 
                    layoutNames[v.layout as keyof typeof layoutNames] === selected.label
                );
                if (variant) {
                    await this.replaceText(editor, selection, variant.text);
                    await this.copyToClipboard(variant.text);
                    vscode.window.showInformationMessage(`✅ Converted to ${selected.label}`);
                }
            }

        } catch (error) {
            vscode.window.showErrorMessage(`Conversion error: ${error}`);
        }
    }

    /**
     * Convert text to all supported layouts
     */
    private convertTextToAllLayouts(text: string): Array<{layout: string, text: string}> {
        const results: Array<{layout: string, text: string}> = [];
        const layouts = ['en', 'ru', 'he'];

        layouts.forEach(layout => {
            try {
                const converted = this.convertToLayout(text, layout);
                if (converted !== text && converted.trim()) {
                    results.push({ layout, text: converted });
                }
            } catch (error) {
                console.warn(`Error converting to ${layout}:`, error);
            }
        });

        return results;
    }

    /**
     * Convert to specific layout
     */
    private convertToLayout(text: string, targetLayout: string): string {
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
                } else {
                    // If conversion not possible, keep as is
                    result += char;
                }
            } catch (error) {
                // In case of error, keep character as is
                result += char;
            }
        }
        
        return result;
    }

    /**
     * Determine the best conversion option
     */
    private getBestConversion(originalText: string, variants: Array<{layout: string, text: string}>): string {
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
    private countDifferences(str1: string, str2: string): number {
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
    private async replaceText(editor: vscode.TextEditor, selection: vscode.Selection, newText: string): Promise<void> {
        await editor.edit(editBuilder => {
            editBuilder.replace(selection, newText);
        });
    }

    /**
     * Copy to clipboard
     */
    private async copyToClipboard(text: string): Promise<void> {
        await vscode.env.clipboard.writeText(text);
    }

    /**
     * Show detailed character information
     */
    private async showCharacterDetails(text: string): Promise<void> {
        const details: string[] = [`📊 Text analysis: "${text}"\n`];
        
        details.push(`Length: ${text.length} characters\n`);
        
        const convertibleChars = Array.from(text).filter(char => {
            try {
                this.inspector.inspect(char);
                return true;
            } catch {
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
                        details.push(`  🇺🇸 EN: ${(result.layouts as any).en || '—'}`);
                        details.push(`  🇷🇺 RU: ${(result.layouts as any).ru || '—'}`);
                        details.push(`  🇮🇱 HE: ${(result.layouts as any).he || '—'}`);
                        details.push(`  Key: ${result.keyDefinition?.key || '—'} | Code: ${result.keyDefinition?.code || '—'}`);
                        details.push('');
                    }
                } catch (error) {
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
     */
    async convertToSpecificLayout(layout: string): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('Open a file to work with text');
            return;
        }

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);

        if (!selectedText) {
            vscode.window.showWarningMessage('Select text to convert');
            return;
        }

        try {
            const converted = this.convertToLayout(selectedText, layout);
            if (converted !== selectedText) {
                await this.replaceText(editor, selection, converted);
                await this.copyToClipboard(converted);
                const layoutNames = this.layoutNames;
                const layoutName = layoutNames[layout as keyof typeof layoutNames];
                vscode.window.showInformationMessage(`✅ Converted to ${layoutName}`);
            } else {
                vscode.window.showInformationMessage('Text is already in the target layout');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Conversion error: ${error}`);
        }
    }
}

/**
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('🚀 Keymap Converter extension activated');

    const converter = new VSCodeKeymapConverter();

    // Main conversion command
    const convertCommand = vscode.commands.registerCommand(
        'keymapConverter.convertSelection',
        () => converter.convertSelectedText()
    );

    // Commands for quick conversion to specific layouts
    const convertToEnglish = vscode.commands.registerCommand(
        'keymapConverter.convertToEnglish',
        () => converter.convertToSpecificLayout('en')
    );

    const convertToRussian = vscode.commands.registerCommand(
        'keymapConverter.convertToRussian',
        () => converter.convertToSpecificLayout('ru')
    );

    const convertToHebrew = vscode.commands.registerCommand(
        'keymapConverter.convertToHebrew',
        () => converter.convertToSpecificLayout('he')
    );

    // Register commands
    context.subscriptions.push(
        convertCommand,
        convertToEnglish,
        convertToRussian,
        convertToHebrew
    );

    // Register completion provider for conversion
    const completionProvider = vscode.languages.registerCompletionItemProvider(
        '*',
        {
            provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
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
                const suggestions: vscode.CompletionItem[] = [];
                const variants = converter['convertTextToAllLayouts'](word);

                variants.forEach(variant => {
                    const item = new vscode.CompletionItem(
                        variant.text,
                        vscode.CompletionItemKind.Text
                    );
                    item.detail = `Keymap: ${converter['layoutNames'][variant.layout as keyof typeof converter['layoutNames']]}`;
                    item.documentation = `Convert "${word}" to ${variant.layout.toUpperCase()}`;
                    item.insertText = variant.text;
                    suggestions.push(item);
                });

                return suggestions;
            }
        }
    );

    context.subscriptions.push(completionProvider);

    vscode.window.showInformationMessage('✅ Keymap Converter is ready! Use Ctrl+Shift+K');
}

/**
 * Extension deactivation
 */
export function deactivate() {
    console.log('Keymap Converter extension deactivated');
}
