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
// Импортируем keymap-inspector
const { KeymapInspector, en, ru, he } = require('keymap-inspector');
/**
 * Класс для работы с конвертацией раскладок в VS Code
 */
class VSCodeKeymapConverter {
    constructor() {
        this.layoutNames = {
            'en': '🇺🇸 English',
            'ru': '🇷🇺 Русский',
            'he': '🇮🇱 עברית'
        };
        // Инициализируем keymap-inspector с поддерживаемыми раскладками
        this.inspector = new KeymapInspector({ en, ru, he });
    }
    /**
     * Показать Quick Pick для выбора раскладки и конвертации
     */
    async convertSelectedText() {
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
            const quickPickItems = [
                {
                    label: '🎯 Автоопределение',
                    description: 'Выбрать лучший вариант автоматически',
                    detail: this.getBestConversion(selectedText, variants)
                },
                ...variants.map(variant => ({
                    label: layoutNames[variant.layout],
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
            }
            else if (selected.label === '🎯 Автоопределение') {
                const bestConversion = this.getBestConversion(selectedText, variants);
                await this.replaceText(editor, selection, bestConversion);
                await this.copyToClipboard(bestConversion);
                vscode.window.showInformationMessage(`✅ Текст конвертирован и скопирован в буфер`);
            }
            else {
                // Находим соответствующий вариант
                const variant = variants.find(v => layoutNames[v.layout] === selected.label);
                if (variant) {
                    await this.replaceText(editor, selection, variant.text);
                    await this.copyToClipboard(variant.text);
                    vscode.window.showInformationMessage(`✅ Конвертировано в ${selected.label}`);
                }
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Ошибка конвертации: ${error}`);
        }
    }
    /**
     * Конвертация текста во все поддерживаемые раскладки
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
                console.warn(`Ошибка конвертации в ${layout}:`, error);
            }
        });
        return results;
    }
    /**
     * Конвертация в конкретную раскладку
     */
    convertToLayout(text, targetLayout) {
        return this.inspector.convertText(text, targetLayout);
    }
    /**
     * Определение лучшего варианта конвертации
     */
    getBestConversion(originalText, variants) {
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
     * Замена текста в редакторе
     */
    async replaceText(editor, selection, newText) {
        await editor.edit(editBuilder => {
            editBuilder.replace(selection, newText);
        });
    }
    /**
     * Копирование в буфер обмена
     */
    async copyToClipboard(text) {
        await vscode.env.clipboard.writeText(text);
    }
    /**
     * Показ детальной информации о символах
     */
    async showCharacterDetails(text) {
        const details = [`📊 Анализ текста: "${text}"\n`];
        details.push(`Длина: ${text.length} символов\n`);
        const convertibleChars = Array.from(text).filter(char => {
            try {
                this.inspector.inspect(char);
                return true;
            }
            catch {
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
                        details.push(`  🇺🇸 EN: ${result.layouts.en || '—'}`);
                        details.push(`  🇷🇺 RU: ${result.layouts.ru || '—'}`);
                        details.push(`  🇮🇱 HE: ${result.layouts.he || '—'}`);
                        details.push(`  Key: ${result.keyDefinition?.key || '—'} | Code: ${result.keyDefinition?.code || '—'}`);
                        details.push('');
                    }
                }
                catch (error) {
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
    async convertToSpecificLayout(layout) {
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
                const layoutName = layoutNames[layout];
                vscode.window.showInformationMessage(`✅ Конвертировано в ${layoutName}`);
            }
            else {
                vscode.window.showInformationMessage('Текст уже в нужной раскладке');
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Ошибка конвертации: ${error}`);
        }
    }
}
/**
 * Активация расширения
 */
function activate(context) {
    console.log('🚀 Keymap Converter extension activated');
    const converter = new VSCodeKeymapConverter();
    // Основная команда конвертации
    const convertCommand = vscode.commands.registerCommand('keymapConverter.convertSelection', () => converter.convertSelectedText());
    // Команды для быстрой конвертации в конкретные раскладки
    const convertToEnglish = vscode.commands.registerCommand('keymapConverter.convertToEnglish', () => converter.convertToSpecificLayout('en'));
    const convertToRussian = vscode.commands.registerCommand('keymapConverter.convertToRussian', () => converter.convertToSpecificLayout('ru'));
    const convertToHebrew = vscode.commands.registerCommand('keymapConverter.convertToHebrew', () => converter.convertToSpecificLayout('he'));
    // Регистрируем команды
    context.subscriptions.push(convertCommand, convertToEnglish, convertToRussian, convertToHebrew);
    // Регистрируем провайдер для автодополнения с конвертацией
    const completionProvider = vscode.languages.registerCompletionItemProvider('*', {
        provideCompletionItems(document, position) {
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
            const suggestions = [];
            const variants = converter['convertTextToAllLayouts'](word);
            variants.forEach(variant => {
                const item = new vscode.CompletionItem(variant.text, vscode.CompletionItemKind.Text);
                item.detail = `Keymap: ${converter['layoutNames'][variant.layout]}`;
                item.documentation = `Конвертация "${word}" в ${variant.layout.toUpperCase()}`;
                item.insertText = variant.text;
                suggestions.push(item);
            });
            return suggestions;
        }
    });
    context.subscriptions.push(completionProvider);
    vscode.window.showInformationMessage('✅ Keymap Converter готов к работе! Используйте Ctrl+Shift+K');
}
exports.activate = activate;
/**
 * Деактивация расширения
 */
function deactivate() {
    console.log('Keymap Converter extension deactivated');
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map