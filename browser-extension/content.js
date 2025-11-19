/**
 * Content Script для Keymap Converter
 * Простая рабочая версия с горячими клавишами и контекстным меню
 */

class BrowserKeymapConverter {
    constructor() {
        this.layoutMaps = this.createLayoutMaps();
        this.currentSelection = null;
        this.setupEventListeners();
        this.createFloatingButton();
        this.setupKeyboardShortcuts();
        console.log('🚀 Keymap Converter загружен и готов!');
    }

    createLayoutMaps() {
        return {
            // Английский -> Русский (QWERTY -> ЙЦУКЕН)
            en_ru: {
                'q': 'й', 'w': 'ц', 'e': 'у', 'r': 'к', 't': 'е', 'y': 'н', 'u': 'г', 'i': 'ш', 'o': 'щ', 'p': 'з',
                '[': 'х', ']': 'ъ', 'a': 'ф', 's': 'ы', 'd': 'в', 'f': 'а', 'g': 'п', 'h': 'р', 'j': 'о', 'k': 'л',
                'l': 'д', ';': 'ж', "'": 'э', 'z': 'я', 'x': 'ч', 'c': 'с', 'v': 'м', 'b': 'и', 'n': 'т', 'm': 'ь',
                ',': 'б', '.': 'ю', '/': '.', '`': 'ё',
                'Q': 'Й', 'W': 'Ц', 'E': 'У', 'R': 'К', 'T': 'Е', 'Y': 'Н', 'U': 'Г', 'I': 'Ш', 'O': 'Щ', 'P': 'З',
                '{': 'Х', '}': 'Ъ', 'A': 'Ф', 'S': 'Ы', 'D': 'В', 'F': 'А', 'G': 'П', 'H': 'Р', 'J': 'О', 'K': 'Л',
                'L': 'Д', ':': 'Ж', '"': 'Э', 'Z': 'Я', 'X': 'Ч', 'C': 'С', 'V': 'М', 'B': 'И', 'N': 'Т', 'M': 'Ь',
                '<': 'Б', '>': 'Ю', '?': ',', '~': 'Ё'
            },
            // Английский -> Иврит
            en_he: {
                'q': 'ק', 'w': 'ו', 'e': 'ע', 'r': 'ר', 't': 'ת', 'y': 'י', 'u': 'ו', 'i': 'י', 'o': 'ו', 'p': 'פ',
                'a': 'א', 's': 'ס', 'd': 'ד', 'f': 'פ', 'g': 'ג', 'h': 'ה', 'j': 'י', 'k': 'כ', 'l': 'ל',
                'z': 'ז', 'x': 'ח', 'c': 'צ', 'v': 'ו', 'b': 'ב', 'n': 'נ', 'm': 'מ'
            }
        };
    }

    setupKeyboardShortcuts() {
        // Обработка горячих клавиш
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+K - автоматическое меню
            if (e.ctrlKey && e.shiftKey && e.key === 'K') {
                e.preventDefault();
                this.handleConversion('auto');
                return;
            }
            
            // Ctrl+Shift+E - в English
            if (e.ctrlKey && e.shiftKey && e.key === 'E') {
                e.preventDefault();
                this.handleConversion('en');
                return;
            }
            
            // Ctrl+Shift+R - в Русский
            if (e.ctrlKey && e.shiftKey && e.key === 'R') {
                e.preventDefault();
                this.handleConversion('ru');
                return;
            }
            
            // Ctrl+Shift+H - в иврит
            if (e.ctrlKey && e.shiftKey && e.key === 'H') {
                e.preventDefault();
                this.handleConversion('he');
                return;
            }
        }, true); // useCapture = true чтобы перехватывать раньше
        
        console.log('⌨️ Горячие клавиши активированы: Ctrl+Shift+K/E/R/H');
    }

    setupEventListeners() {
        // Слушаем команды от background script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('📨 Получено сообщение:', message);
            if (message.action === 'convertSelection') {
                this.handleConversion(message.layout);
                sendResponse({ success: true });
            }
            return true;
        });

        // Обработка выделения текста (для обычного текста)
        document.addEventListener('mouseup', () => {
            setTimeout(() => {
                const activeElement = document.activeElement;
                let hasSelection = false;
                
                // Проверяем INPUT/TEXTAREA
                if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                    const start = activeElement.selectionStart;
                    const end = activeElement.selectionEnd;
                    if (start !== end) {
                        this.currentSelection = activeElement.value.substring(start, end);
                        hasSelection = true;
                    }
                } else {
                    // Обычное выделение
                    const selection = window.getSelection();
                    const text = selection?.toString().trim();
                    this.currentSelection = text;
                    hasSelection = !!text;
                }
                
                if (hasSelection) {
                    this.showConvertButton();
                } else {
                    this.hideConvertButton();
                }
            }, 10);
        });
        
        // Дополнительная проверка для input/textarea при изменении выделения
        document.addEventListener('selectionchange', () => {
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                const start = activeElement.selectionStart;
                const end = activeElement.selectionEnd;
                if (start !== end) {
                    this.currentSelection = activeElement.value.substring(start, end);
                    this.showConvertButton();
                } else {
                    this.hideConvertButton();
                }
            }
        });

        // Контекстное меню через сообщение
        document.addEventListener('contextmenu', (e) => {
            const selection = window.getSelection()?.toString().trim();
            if (selection) {
                this.currentSelection = selection;
                chrome.runtime.sendMessage({
                    action: 'updateContextMenu',
                    hasSelection: true,
                    text: selection
                });
            }
        });

        console.log('👂 Event listeners установлены');
    }

    createFloatingButton() {
        if (document.getElementById('keymap-converter-float-btn')) return;

        const button = document.createElement('div');
        button.id = 'keymap-converter-float-btn';
        button.innerHTML = '🌐';
        button.title = 'Конвертировать текст (Ctrl+Shift+K)';
        
        Object.assign(button.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            width: '50px',
            height: '50px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: '50%',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '20px',
            zIndex: '2147483647', // максимальный z-index
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
            transition: 'all 0.3s ease',
            fontFamily: 'Arial, sans-serif',
            userSelect: 'none'
        });

        button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleConversion('auto');
        });

        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.15)';
            button.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
        });

        document.body.appendChild(button);
        console.log('🔘 Плавающая кнопка создана');
    }

    showConvertButton() {
        const button = document.getElementById('keymap-converter-float-btn');
        if (button) {
            button.style.display = 'flex';
        }
    }

    hideConvertButton() {
        const button = document.getElementById('keymap-converter-float-btn');
        if (button) {
            button.style.display = 'none';
        }
    }

    handleConversion(layout) {
        // Получаем выделенный текст из разных источников
        let selectedText = '';
        const activeElement = document.activeElement;
        
        // Проверяем INPUT или TEXTAREA
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            const start = activeElement.selectionStart;
            const end = activeElement.selectionEnd;
            if (start !== end) {
                selectedText = activeElement.value.substring(start, end);
            }
        } else {
            // Обычное выделение
            selectedText = window.getSelection()?.toString().trim() || this.currentSelection;
        }
        
        if (!selectedText || !selectedText.trim()) {
            this.showNotification('⚠️ Выделите текст для конвертации', 'warning');
            return;
        }

        console.log('🔄 Конвертация:', selectedText, 'в', layout);

        if (layout === 'auto') {
            this.showConvertMenu(selectedText);
            return;
        }

        try {
            const converted = this.convertToLayout(selectedText, layout);
            if (converted !== selectedText) {
                this.replaceSelectedText(converted);
                this.copyToClipboard(converted);
                this.showNotification(`✅ Конвертировано в ${this.getLayoutName(layout)}`, 'success');
            } else {
                this.showNotification('ℹ️ Текст уже в нужной раскладке', 'info');
            }
        } catch (error) {
            this.showNotification('❌ Ошибка конвертации: ' + error.message, 'error');
        }
    }

    showConvertMenu(text) {
        // Удаляем существующее меню
        const existingMenu = document.getElementById('keymap-converter-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const menu = document.createElement('div');
        menu.id = 'keymap-converter-menu';
        
        Object.assign(menu.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            padding: '25px',
            zIndex: '2147483646',
            maxWidth: '500px',
            fontFamily: 'Arial, sans-serif',
            minWidth: '400px'
        });

        const variants = this.convertTextToAllLayouts(text);
        
        const preview = text.length > 60 ? text.substring(0, 60) + '...' : text;
        
        menu.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">🌐 Конвертировать текст</h3>
            <div style="background: #f5f5f5; padding: 12px; border-radius: 8px; margin-bottom: 15px; font-family: monospace; font-size: 14px; max-height: 100px; overflow-y: auto;">
                "${preview}"
            </div>
            <div id="convert-variants" style="margin: 15px 0;"></div>
            <div style="margin-top: 15px; text-align: right;">
                <button id="close-menu" style="background: #e0e0e0; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; transition: background 0.2s;">Закрыть</button>
            </div>
        `;

        const variantsContainer = menu.querySelector('#convert-variants');
        
        if (variants.length === 0) {
            variantsContainer.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">Текст не требует конвертации</p>';
        } else {
            variants.forEach(variant => {
                const button = document.createElement('button');
                Object.assign(button.style, {
                    display: 'block',
                    width: '100%',
                    margin: '8px 0',
                    padding: '12px',
                    background: '#f8f9fa',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    transition: 'all 0.2s'
                });
                
                button.innerHTML = `
                    <strong style="color: #667eea; font-size: 15px;">${this.getLayoutName(variant.layout)}</strong><br>
                    <span style="color: #333;">${variant.text}</span>
                `;
                
                button.addEventListener('mouseenter', () => {
                    button.style.background = '#667eea';
                    button.style.borderColor = '#667eea';
                    button.style.color = 'white';
                    button.querySelector('strong').style.color = 'white';
                    button.querySelector('span').style.color = 'white';
                });
                
                button.addEventListener('mouseleave', () => {
                    button.style.background = '#f8f9fa';
                    button.style.borderColor = '#e0e0e0';
                    button.style.color = '#333';
                    button.querySelector('strong').style.color = '#667eea';
                    button.querySelector('span').style.color = '#333';
                });
                
                button.addEventListener('click', () => {
                    this.replaceSelectedText(variant.text);
                    this.copyToClipboard(variant.text);
                    this.showNotification(`✅ Конвертировано в ${this.getLayoutName(variant.layout)}`, 'success');
                    menu.remove();
                });
                
                variantsContainer.appendChild(button);
            });
        }

        const closeBtn = menu.querySelector('#close-menu');
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.background = '#d0d0d0';
        });
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.background = '#e0e0e0';
        });
        closeBtn.addEventListener('click', () => {
            menu.remove();
        });

        // Закрытие по Escape
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                menu.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        document.body.appendChild(menu);
    }

    convertTextToAllLayouts(text) {
        const results = [];
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

    convertToLayout(text, targetLayout) {
        let result = '';

        if (targetLayout === 'ru') {
            // EN -> RU
            result = Array.from(text).map(char => {
                return this.layoutMaps.en_ru[char] || char;
            }).join('');
        } else if (targetLayout === 'en') {
            // RU -> EN (создаем обратную карту)
            const ruToEn = this.createReverseMap(this.layoutMaps.en_ru);
            result = Array.from(text).map(char => {
                return ruToEn[char] || char;
            }).join('');
        } else if (targetLayout === 'he') {
            // EN -> HE
            result = Array.from(text).map(char => {
                const lower = char.toLowerCase();
                return this.layoutMaps.en_he[lower] || char;
            }).join('');
        }

        return result;
    }

    createReverseMap(originalMap) {
        const reverseMap = {};
        Object.entries(originalMap).forEach(([key, value]) => {
            reverseMap[value] = key;
        });
        return reverseMap;
    }

    replaceSelectedText(newText) {
        const activeElement = document.activeElement;
        
        // Проверяем INPUT или TEXTAREA
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            const start = activeElement.selectionStart;
            const end = activeElement.selectionEnd;
            const value = activeElement.value;
            
            // Заменяем выделенный текст
            activeElement.value = value.substring(0, start) + newText + value.substring(end);
            
            // Восстанавливаем курсор после вставленного текста
            activeElement.selectionStart = activeElement.selectionEnd = start + newText.length;
            
            // Триггерим события для React/Vue/Angular
            activeElement.dispatchEvent(new Event('input', { bubbles: true }));
            activeElement.dispatchEvent(new Event('change', { bubbles: true }));
            
            console.log('✅ Текст заменен в input/textarea:', newText);
            return;
        }
        
        // Проверяем contenteditable элементы
        if (activeElement && activeElement.isContentEditable) {
            try {
                document.execCommand('insertText', false, newText);
                console.log('✅ Текст заменен в contenteditable:', newText);
                return;
            } catch (error) {
                console.warn('⚠️ execCommand не сработал:', error);
            }
        }
        
        // Обычный текст на странице
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            
            try {
                // Сначала пробуем execCommand (работает лучше на многих сайтах)
                if (document.execCommand('insertText', false, newText)) {
                    console.log('✅ Текст заменен через execCommand:', newText);
                    return;
                }
                
                // Fallback - прямая замена
                range.deleteContents();
                range.insertNode(document.createTextNode(newText));
                
                // Восстанавливаем выделение
                const newRange = document.createRange();
                newRange.selectNodeContents(range.startContainer);
                selection.removeAllRanges();
                selection.addRange(newRange);
                
                console.log('✅ Текст заменен напрямую:', newText);
            } catch (error) {
                console.warn('⚠️ Не удалось заменить текст:', error);
                // Копируем в буфер обмена как последний fallback
                this.copyToClipboard(newText);
                this.showNotification('📋 Текст скопирован в буфер обмена. Вставьте вручную (Ctrl+V)', 'info');
            }
        }
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            console.log('📋 Скопировано в буфер обмена:', text);
            return true;
        } catch (error) {
            console.warn('⚠️ Clipboard API недоступен:', error);
            // Fallback метод
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                document.body.removeChild(textarea);
                return true;
            } catch (e) {
                document.body.removeChild(textarea);
                return false;
            }
        }
    }

    getLayoutName(layout) {
        const names = {
            'en': '🇺🇸 English',
            'ru': '🇷🇺 Русский',
            'he': '🇮🇱 עברית'
        };
        return names[layout] || layout;
    }

    showNotification(message, type = 'info') {
        // Удаляем существующие уведомления
        const existing = document.querySelectorAll('.keymap-converter-notification');
        existing.forEach(el => el.remove());

        const notification = document.createElement('div');
        notification.className = 'keymap-converter-notification';
        
        const colors = {
            success: '#4caf50',
            error: '#f44336', 
            warning: '#ff9800',
            info: '#2196f3'
        };

        Object.assign(notification.style, {
            position: 'fixed',
            top: '80px',
            right: '20px',
            background: colors[type] || colors.info,
            color: 'white',
            padding: '15px 20px',
            borderRadius: '10px',
            zIndex: '2147483647',
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
            maxWidth: '300px',
            animation: 'slideIn 0.3s ease'
        });

        notification.textContent = message;
        document.body.appendChild(notification);

        // Анимация появления
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);

        // Автоматическое удаление через 3 секунды
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideIn 0.3s ease reverse';
                setTimeout(() => notification.remove(), 300);
            }
        }, 3000);
    }
}

// Инициализация с проверкой готовности DOM
function initConverter() {
    if (document.body) {
        try {
            window.keymapConverter = new BrowserKeymapConverter();
            console.log('✅ BrowserKeymapConverter инициализирован');
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
        }
    } else {
        console.log('⏳ Ожидаем загрузку DOM...');
        setTimeout(initConverter, 100);
    }
}

// Запускаем инициализацию
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initConverter);
} else {
    initConverter();
}
