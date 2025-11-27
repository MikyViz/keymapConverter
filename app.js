/**
 * Keymap Converter - Приложение для конвертации текста между раскладками
 * Поддерживаемые раскладки: Русская, Английская, Иврит
 */

class KeymapConverterApp {
    constructor() {
        this.inspector = null;
        this.isInspectorReady = false;
        this.selectedLayout = 'auto';
        this.autoConvert = true;

        // Элементы DOM
        this.inputText = document.getElementById('inputText');
        this.outputVariants = document.getElementById('outputVariants');
        this.detailsOutput = document.getElementById('detailsOutput');
        this.infoSection = document.getElementById('infoSection');
        this.selectionInfo = document.getElementById('selectionInfo');
        this.autoConvertCheckbox = document.getElementById('autoConvert');
        this.notification = document.getElementById('notification');

        this.initializeInspector();
        this.setupEventListeners();
    }

    /**
     * Инициализация keymap-inspector
     */
    async initializeInspector() {
        try {
            // Инициализируем наш простой инспектор
            this.inspector = new SimpleKeymapInspector();
            this.isInspectorReady = true;
            
            this.showNotification('✅ Приложение готово к работе!', 'success');
            console.log('🚀 KeymapInspector успешно инициализирован');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации KeymapInspector:', error);
            this.showNotification('❌ Ошибка загрузки: ' + error.message, 'error');
        }
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Обработка выделения текста
        this.inputText.addEventListener('mouseup', () => this.handleTextSelection());
        this.inputText.addEventListener('keyup', () => this.handleTextSelection());
        
        // Обработка ввода текста
        this.inputText.addEventListener('input', () => this.handleTextInput());

        // Переключение автоконвертации
        this.autoConvertCheckbox.addEventListener('change', (e) => {
            this.autoConvert = e.target.checked;
            this.updateSelectionInfo();
        });

        // Кнопки выбора раскладки
        document.querySelectorAll('.layout-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectLayout(e.target.dataset.layout);
            });
        });

        // Глобальное выделение текста (для работы в других областях)
        document.addEventListener('mouseup', () => {
            const selection = window.getSelection().toString();
            if (selection && this.autoConvert && this.isInspectorReady) {
                this.processText(selection, true);
            }
        });
    }

    /**
     * Обработка выделения текста в textarea
     */
    handleTextSelection() {
        const start = this.inputText.selectionStart;
        const end = this.inputText.selectionEnd;
        const selectedText = this.inputText.value.substring(start, end);

        if (selectedText && this.autoConvert && this.isInspectorReady) {
            this.processText(selectedText, true);
            this.updateSelectionInfo(`Выделено: "${selectedText.length > 30 ? selectedText.substring(0, 30) + '...' : selectedText}"`);
        } else if (!selectedText) {
            this.updateSelectionInfo();
        }
    }

    /**
     * Обработка ввода текста
     */
    handleTextInput() {
        const text = this.inputText.value;
        if (text && !this.autoConvert && this.isInspectorReady) {
            this.processText(text);
        } else if (!text) {
            this.clearOutput();
        }
    }

    /**
     * Выбор раскладки для конвертации
     */
    selectLayout(layout) {
        this.selectedLayout = layout;
        
        // Обновляем активную кнопку
        document.querySelectorAll('.layout-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-layout="${layout}"]`).classList.add('active');

        // Перерабатываем текст с новой раскладкой
        const text = this.inputText.value || window.getSelection().toString();
        if (text && this.isInspectorReady) {
            this.processText(text);
        }
    }

    /**
     * Основная функция обработки текста
     */
    processText(text, isSelection = false) {
        if (!this.isInspectorReady || !text.trim()) {
            return;
        }

        try {
            const results = this.convertText(text);
            this.displayResults(results, text);
            this.displayCharacterDetails(text);
            
            if (isSelection) {
                this.showNotification(`Converted ${text.length} characters`, 'success');
            }
            
        } catch (error) {
            console.error('Error processing text:', error);
            this.showNotification('Conversion error: ' + error.message, 'error');
        }
    }

    /**
     * Конвертация текста между раскладками
     */
    convertText(text) {
        const results = {
            original: text,
            variants: {}
        };

        // Определяем целевые раскладки
        const targetLayouts = this.selectedLayout === 'auto' 
            ? ['en', 'ru', 'he'] 
            : [this.selectedLayout];

        targetLayouts.forEach(layout => {
            try {
                const converted = this.convertToLayout(text, layout);
                if (converted !== text) { // Показываем только если есть изменения
                    results.variants[layout] = converted;
                }
            } catch (error) {
                console.warn(`Conversion error in ${layout}:`, error);
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
     * Отображение результатов конвертации
     */
    displayResults(results, originalText) {
        this.outputVariants.innerHTML = '';

        // Если нет вариантов для отображения
        if (Object.keys(results.variants).length === 0) {
            this.outputVariants.innerHTML = `
                <div class="variant-card">
                    <div class="variant-title">ℹ️ Information</div>
                    <div class="variant-text">The text does not require conversion or contains characters not supported by the layouts.</div>
                </div>
            `;
            return;
        }

        // Создаем карточки для каждого варианта
        Object.entries(results.variants).forEach(([layout, text]) => {
            const layoutNames = {
                'en': '🇺🇸 English',
                'ru': '🇷🇺 Русский',
                'he': '🇮🇱 עברית'
            };

            const card = document.createElement('div');
            card.className = 'variant-card';
            card.innerHTML = `
                <div class="variant-header">
                    <div class="variant-title">${layoutNames[layout]}</div>
                    <button class="copy-btn" onclick="app.copyToClipboard('${text.replace(/'/g, "\\'")}', '${layoutNames[layout]}')">
                        📋 Копировать
                    </button>
                </div>
                <div class="variant-text">${this.escapeHtml(text)}</div>
            `;
            
            this.outputVariants.appendChild(card);
        });
    }

    /**
     * Отображение детальной информации о символах
     */
    displayCharacterDetails(text) {
        if (text.length > 50) {
            // Для длинных текстов показываем только статистику
            this.detailsOutput.innerHTML = `
                <div class="char-info">
                    <div>📊 Text statistics:</div>
                    <div>Characters: ${text.length}</div>
                    <div>Convertible characters: ${this.getConvertibleCount(text)}</div>
                </div>
            `;
        } else {
            // Для коротких текстов показываем детали каждого символа
            this.detailsOutput.innerHTML = '';
            
            Array.from(text).forEach((char, index) => {
                if (char.trim()) { // Пропускаем пробелы
                    try {
                        const result = this.inspector.inspect(char);
                        const charDiv = document.createElement('div');
                        charDiv.className = 'char-info';
                        charDiv.innerHTML = `
                            <div class="char-original">Character: "${char}"</div>
                            <div class="char-layouts">
                                <div class="layout-variant">🇺🇸 EN: ${result.layouts.en || '—'}</div>
                                <div class="layout-variant">🇷🇺 RU: ${result.layouts.ru || '—'}</div>
                                <div class="layout-variant">🇮🇱 HE: ${result.layouts.he || '—'}</div>
                            </div>
                            <div style="margin-top: 5px; font-size: 12px; color: #666;">
                                Key: ${result.keyDefinition?.key || '—'} | Code: ${result.keyDefinition?.code || '—'}
                            </div>
                        `;
                        this.detailsOutput.appendChild(charDiv);
                    } catch (error) {
                        // Символ не найден в keymap
                    }
                }
            });
        }

        // Показываем секцию с информацией
        this.infoSection.classList.remove('hidden');
    }

    /**
     * Подсчет конвертируемых символов
     */
    getConvertibleCount(text) {
        let count = 0;
        Array.from(text).forEach(char => {
            try {
                this.inspector.inspect(char);
                count++;
            } catch (error) {
                // Символ не конвертируется
            }
        });
        return count;
    }

    /**
     * Копирование в буфер обмена
     */
    async copyToClipboard(text, layoutName) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification(`📋 Copied to clipboard: ${layoutName}`, 'success');
        } catch (error) {
            // Fallback для старых браузеров
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            this.showNotification(`📋 Copied to clipboard: ${layoutName}`, 'success');
        }
    }

    /**
     * Обновление информации о выделении
     */
    updateSelectionInfo(message = null) {
        if (message) {
            this.selectionInfo.textContent = message;
            this.selectionInfo.style.background = '#e8f5e8';
            this.selectionInfo.style.borderColor = '#4caf50';
        } else {
            const defaultMessage = this.autoConvert 
                ? '💡 Select text for automatic conversion'
                : '💡 Auto-conversion is off. Enter text and use the layout buttons.';
            this.selectionInfo.textContent = defaultMessage;
            this.selectionInfo.style.background = '#e3f2fd';
            this.selectionInfo.style.borderColor = '#2196f3';
        }
    }

    /**
     * Очистка результатов
     */
    clearOutput() {
        this.outputVariants.innerHTML = '';
        this.infoSection.classList.add('hidden');
        this.updateSelectionInfo();
    }

    /**
     * Показ уведомлений
     */
    showNotification(message, type = 'success') {
        this.notification.textContent = message;
        this.notification.className = `notification ${type}`;
        this.notification.classList.add('show');

        setTimeout(() => {
            this.notification.classList.remove('show');
        }, 3000);
    }

    /**
     * Экранирование HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Инициализация приложения после загрузки DOM
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new KeymapConverterApp();
});

// Глобальная функция для использования в onclick
window.app = app;
