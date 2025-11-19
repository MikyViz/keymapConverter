import * as vscode from 'vscode';

// Импортируем keymap-inspector
const { KeymapInspector, en, ru, he } = require('keymap-inspector');

/**
 * Класс для работы с конвертацией раскладок в VS Code
 */
class VSCodeKeymapConverter {
    private inspector: any;
    private readonly layoutNames = {
        'en': '🇺🇸 English',
        'ru': '🇷🇺 Русский', 
        'he': '🇮🇱 עברית'
    };

    constructor() {
        // Инициализируем keymap-inspector с поддерживаемыми раскладками
        this.inspector = new KeymapInspector({ en, ru, he });
    }

    /**
     * Показать Quick Pick для выбора раскладки и конвертации
     */
    async convertSelectedText(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('Откройте файл для работы с текстом');
            return;
        }

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);

        if (!selectedText) {
            vscode.window.showWarningMessage('Выделите текст для конвертации');
            return;
        }

        try {
            // Конвертируем во все доступные раскладки
            const variants = this.convertTextToAllLayouts(selectedText);
            
            if (variants.length === 0) {
                vscode.window.showInformationMessage('Текст не требует конвертации');
                return;
            }

            // Создаем варианты для Quick Pick
            const layoutNames = this.layoutNames;
            const quickPickItems: vscode.QuickPickItem[] = [
                {
                    label: '🎯 Автоопределение',
                    description: 'Выбрать лучший вариант автоматически',
                    detail: this.getBestConversion(selectedText, variants)
                },
                ...variants.map(variant => ({
                    label: layoutNames[variant.layout as keyof typeof layoutNames],
                    description: variant.layout.toUpperCase(),
                    detail: variant.text
                })),
                {
                    label: '📊 Показать детали',
                    description: 'Подробная информация о символах',
                    detail: 'Открыть окно с деталями конвертации'
                }
            ];

            const selected = await vscode.window.showQuickPick(quickPickItems, {
                placeHolder: `Конвертировать "${selectedText.length > 30 ? selectedText.substring(0, 30) + '...' : selectedText}"`,
                title: 'Keymap Converter'
            });

            if (!selected) {
                return;
            }

            if (selected.label === '📊 Показать детали') {
                await this.showCharacterDetails(selectedText);
            } else if (selected.label === '🎯 Автоопределение') {
                const bestConversion = this.getBestConversion(selectedText, variants);
                await this.replaceText(editor, selection, bestConversion);
                await this.copyToClipboard(bestConversion);
                vscode.window.showInformationMessage(`✅ Текст конвертирован и скопирован в буфер`);
            } else {
                // Находим соответствующий вариант
                const variant = variants.find(v => 
                    layoutNames[v.layout as keyof typeof layoutNames] === selected.label
                );
                if (variant) {
                    await this.replaceText(editor, selection, variant.text);
                    await this.copyToClipboard(variant.text);
                    vscode.window.showInformationMessage(`✅ Конвертировано в ${selected.label}`);
                }
            }

        } catch (error) {
            vscode.window.showErrorMessage(`Ошибка конвертации: ${error}`);
        }
    }

    /**
     * Конвертация текста во все поддерживаемые раскладки
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
                console.warn(`Ошибка конвертации в ${layout}:`, error);
            }
        });

        return results;
    }

    /**
     * Конвертация в конкретную раскладку
     */
    private convertToLayout(text: string, targetLayout: string): string {
        let result = '';
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            
            // Проверяем не пробел/спецсимвол ли это
            if (char === ' ' || char === '\n' || char === '\t' || char === '\r') {
                result += char;
                continue;
            }
            
            try {
                // Инспектируем символ
                const inspection = this.inspector.inspect(char);
                
                if (inspection && inspection.layouts && inspection.layouts[targetLayout]) {
                    // Конвертируем в целевую раскладку
                    result += inspection.layouts[targetLayout];
                } else {
                    // Если конвертация невозможна, оставляем как есть
                    result += char;
                }
            } catch (error) {
                // В случае ошибки оставляем символ как есть
                result += char;
            }
        }
        
        return result;
    }

    /**
     * Определение лучшего варианта конвертации
     */
    private getBestConversion(originalText: string, variants: Array<{layout: string, text: string}>): string {
        if (variants.length === 0) {
            return originalText;
        }

        // Простая эвристика: выбираем вариант с наибольшим количеством изменений
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
     * Подсчет различий между строками
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
     * Замена текста в редакторе
     */
    private async replaceText(editor: vscode.TextEditor, selection: vscode.Selection, newText: string): Promise<void> {
        await editor.edit(editBuilder => {
            editBuilder.replace(selection, newText);
        });
    }

    /**
     * Копирование в буфер обмена
     */
    private async copyToClipboard(text: string): Promise<void> {
        await vscode.env.clipboard.writeText(text);
    }

    /**
     * Показ детальной информации о символах
     */
    private async showCharacterDetails(text: string): Promise<void> {
        const details: string[] = [`📊 Анализ текста: "${text}"\n`];
        
        details.push(`Длина: ${text.length} символов\n`);
        
        const convertibleChars = Array.from(text).filter(char => {
            try {
                this.inspector.inspect(char);
                return true;
            } catch {
                return false;
            }
        });
        
        details.push(`Конвертируемых символов: ${convertibleChars.length}\n`);
        details.push('─'.repeat(50) + '\n');

        // Анализ каждого символа (максимум 20 символов)
        const charsToAnalyze = Array.from(text).slice(0, 20);
        
        charsToAnalyze.forEach((char, index) => {
            if (char.trim()) {
                try {
                    const result = this.inspector.inspect(char);
                    if (result && result.layouts) {
                        details.push(`Символ ${index + 1}: "${char}"`);
                        details.push(`  🇺🇸 EN: ${(result.layouts as any).en || '—'}`);
                        details.push(`  🇷🇺 RU: ${(result.layouts as any).ru || '—'}`);
                        details.push(`  🇮🇱 HE: ${(result.layouts as any).he || '—'}`);
                        details.push(`  Key: ${result.keyDefinition?.key || '—'} | Code: ${result.keyDefinition?.code || '—'}`);
                        details.push('');
                    }
                } catch (error) {
                    details.push(`Символ ${index + 1}: "${char}" - не найден в раскладках`);
                    details.push('');
                }
            }
        });

        if (text.length > 20) {
            details.push(`... и еще ${text.length - 20} символов`);
        }

        // Создаем временный документ с результатами
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
     * Конвертация выделенного текста в конкретную раскладку (для команд)
     */
    async convertToSpecificLayout(layout: string): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('Откройте файл для работы с текстом');
            return;
        }

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);

        if (!selectedText) {
            vscode.window.showWarningMessage('Выделите текст для конвертации');
            return;
        }

        try {
            const converted = this.convertToLayout(selectedText, layout);
            if (converted !== selectedText) {
                await this.replaceText(editor, selection, converted);
                await this.copyToClipboard(converted);
                const layoutNames = this.layoutNames;
                const layoutName = layoutNames[layout as keyof typeof layoutNames];
                vscode.window.showInformationMessage(`✅ Конвертировано в ${layoutName}`);
            } else {
                vscode.window.showInformationMessage('Текст уже в нужной раскладке');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Ошибка конвертации: ${error}`);
        }
    }
}

/**
 * Активация расширения
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('🚀 Keymap Converter extension activated');

    const converter = new VSCodeKeymapConverter();

    // Основная команда конвертации
    const convertCommand = vscode.commands.registerCommand(
        'keymapConverter.convertSelection',
        () => converter.convertSelectedText()
    );

    // Команды для быстрой конвертации в конкретные раскладки
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

    // Регистрируем команды
    context.subscriptions.push(
        convertCommand,
        convertToEnglish,
        convertToRussian,
        convertToHebrew
    );

    // Регистрируем провайдер для автодополнения с конвертацией
    const completionProvider = vscode.languages.registerCompletionItemProvider(
        '*',
        {
            provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                // Получаем слово под курсором
                const range = document.getWordRangeAtPosition(position);
                if (!range) {
                    return [];
                }

                const word = document.getText(range);
                if (word.length < 2) {
                    return [];
                }

                // Создаем предложения для конвертации
                const suggestions: vscode.CompletionItem[] = [];
                const variants = converter['convertTextToAllLayouts'](word);

                variants.forEach(variant => {
                    const item = new vscode.CompletionItem(
                        variant.text,
                        vscode.CompletionItemKind.Text
                    );
                    item.detail = `Keymap: ${converter['layoutNames'][variant.layout as keyof typeof converter['layoutNames']]}`;
                    item.documentation = `Конвертация "${word}" в ${variant.layout.toUpperCase()}`;
                    item.insertText = variant.text;
                    suggestions.push(item);
                });

                return suggestions;
            }
        }
    );

    context.subscriptions.push(completionProvider);

    vscode.window.showInformationMessage('✅ Keymap Converter готов к работе! Используйте Ctrl+Shift+K');
}

/**
 * Деактивация расширения
 */
export function deactivate() {
    console.log('Keymap Converter extension deactivated');
}
