/**
 * Content Script для Keymap Converter
 * Простая версия для отладки
 */

console.log('🚀 Keymap Converter content script загружен');

// Простые маппинги раскладок для начала
const keymaps = {
    // Русский -> Английский
    'й': 'q', 'ц': 'w', 'у': 'e', 'к': 'r', 'е': 't', 'н': 'y', 'г': 'u', 'ш': 'i', 'щ': 'o', 'з': 'p',
    'ф': 'a', 'ы': 's', 'в': 'd', 'а': 'f', 'п': 'g', 'р': 'h', 'о': 'j', 'л': 'k', 'д': 'l',
    'я': 'z', 'ч': 'x', 'с': 'c', 'м': 'v', 'и': 'b', 'т': 'n', 'ь': 'm',
    
    // Английский -> Русский
    'q': 'й', 'w': 'ц', 'e': 'у', 'r': 'к', 't': 'е', 'y': 'н', 'u': 'г', 'i': 'ш', 'o': 'щ', 'p': 'з',
    'a': 'ф', 's': 'ы', 'd': 'в', 'f': 'а', 'g': 'п', 'h': 'р', 'j': 'о', 'k': 'л', 'l': 'д',
    'z': 'я', 'x': 'ч', 'c': 'с', 'v': 'м', 'b': 'и', 'n': 'т', 'm': 'ь',
    
    // Английский -> Иврит
    'q': 'ק', 'w': 'ו', 'e': 'ע', 'r': 'ר', 't': 'ת', 'y': 'י', 'u': 'ו', 'i': 'י', 'o': 'ו', 'p': 'פ',
    'a': 'א', 's': 'ס', 'd': 'ד', 'f': 'פ', 'g': 'ג', 'h': 'ה', 'j': 'י', 'k': 'כ', 'l': 'ל',
    'z': 'ז', 'x': 'ח', 'c': 'צ', 'v': 'ו', 'b': 'ב', 'n': 'נ', 'm': 'מ'
};

class SimpleKeymapConverter {
    constructor() {
        this.init();
    }

    init() {
        console.log('🔧 Инициализация SimpleKeymapConverter');
        this.setupEventListeners();
        this.createFloatingButton();
        this.showNotification('✅ Keymap Converter готов!', 'success');
    }

    setupEventListeners() {
        // Слушаем сообщения от background script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('📨 Получено сообщение:', message);
            
            if (message.action === 'convertSelection') {
                this.convertSelectedText(message.layout);
                sendResponse({ success: true });
            }
            return true;
        });

        // Обработка выделения текста
        document.addEventListener('mouseup', (e) => {
            setTimeout(() => {
                const selection = window.getSelection();
                if (selection && selection.toString().trim()) {
                    console.log('📝 Текст выделен:', selection.toString());
                    this.showFloatingButton(true);
                } else {
                    this.showFloatingButton(false);
                }
            }, 100);
        });

        // Скрываем кнопку при клике
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.keymap-converter-button')) {
                this.showFloatingButton(false);
            }
        });
    }

    createFloatingButton() {
        if (document.getElementById('keymap-converter-float-btn')) return;

        const button = document.createElement('div');
        button.id = 'keymap-converter-float-btn';
        button.className = 'keymap-converter-button';
        button.innerHTML = '🌐';
        button.title = 'Конвертировать текст (Ctrl+Shift+K)';
        
        // Стили для кнопки
        Object.assign(button.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            width: '50px',
            height: '50px',
            backgroundColor: '#667eea',
            color: 'white',
            borderRadius: '50%',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '20px',
            zIndex: '10000',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transition: 'all 0.3s ease',
            border: 'none',
            fontFamily: 'Arial, sans-serif'
        });

        button.addEventListener('click', () => {
            console.log('🖱️ Клик по плавающей кнопке');
            this.showConvertMenu();
        });

        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
            button.style.backgroundColor = '#5a6fd8';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.backgroundColor = '#667eea';
        });

        document.body.appendChild(button);
        console.log('🔘 Плавающая кнопка создана');
    }

    showFloatingButton(show) {
        const button = document.getElementById('keymap-converter-float-btn');
        if (button) {
            button.style.display = show ? 'flex' : 'none';
        }
    }

    showConvertMenu() {
        const selectedText = window.getSelection().toString().trim();
        if (!selectedText) {
            this.showNotification('⚠️ Выделите текст для конвертации', 'warning');
            return;
        }

        console.log('🔄 Показываем меню конвертации для:', selectedText);

        // Создаем простое меню
        const menu = document.createElement('div');
        menu.id = 'keymap-converter-menu';
        
        Object.assign(menu.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            borderRadius: '10px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            padding: '20px',
            zIndex: '10001',
            maxWidth: '400px',
            fontFamily: 'Segoe UI, Arial, sans-serif',
            border: '1px solid #ddd'
        });

        // Конвертируем текст
        const variants = this.convertText(selectedText);
        
        let menuHTML = `
            <h3 style="margin: 0 0 15px 0; color: #333; font-size: 16px;">🌐 Конвертировать текст</h3>
            <div style="background: #f5f5f5; padding: 10px; border-radius: 5px; margin-bottom: 15px; font-family: monospace; word-break: break-all;">
                "${selectedText.length > 50 ? selectedText.substring(0, 50) + '...' : selectedText}"
            </div>
        `;

        if (variants.length === 0) {
            menuHTML += '<p style="color: #666; margin: 10px 0;">Конвертация не требуется</p>';
        } else {
            variants.forEach(variant => {
                menuHTML += `
                    <button class="convert-option" data-text="${variant.text.replace(/"/g, '&quot;')}" style="
                        display: block;
                        width: 100%;
                        margin: 8px 0;
                        padding: 12px;
                        background: #f8f9fa;
                        border: 1px solid #ddd;
                        border-radius: 5px;
                        cursor: pointer;
                        text-align: left;
                        font-family: inherit;
                        transition: background 0.2s;
                    ">
                        <strong>${variant.layout}</strong><br>
                        <span style="font-family: monospace; color: #555;">${variant.text}</span>
                    </button>
                `;
            });
        }

        menuHTML += `
            <div style="margin-top: 15px; text-align: right;">
                <button id="close-menu" style="background: #ccc; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">Закрыть</button>
            </div>
        `;

        menu.innerHTML = menuHTML;

        // Добавляем обработчики
        menu.querySelectorAll('.convert-option').forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.background = '#e9ecef';
                btn.style.borderColor = '#667eea';
            });
            
            btn.addEventListener('mouseleave', () => {
                btn.style.background = '#f8f9fa';
                btn.style.borderColor = '#ddd';
            });
            
            btn.addEventListener('click', () => {
                const newText = btn.dataset.text;
                this.replaceSelectedText(newText);
                menu.remove();
            });
        });

        menu.querySelector('#close-menu').addEventListener('click', () => {
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

    convertText(text) {
        const results = [];
        const layouts = [
            { name: '🇺🇸 English', key: 'en' },
            { name: '🇷🇺 Русский', key: 'ru' },
            { name: '🇮🇱 עברית', key: 'he' }
        ];

        layouts.forEach(layout => {
            const converted = this.convertToLayout(text, layout.key);
            if (converted !== text && converted.trim()) {
                results.push({
                    layout: layout.name,
                    text: converted
                });
            }
        });

        return results;
    }

    convertToLayout(text, targetLayout) {
        return Array.from(text).map(char => {
            const lowerChar = char.toLowerCase();
            
            // Простая конвертация через маппинг
            if (keymaps[lowerChar]) {
                // Сохраняем регистр
                const converted = keymaps[lowerChar];
                return char === char.toUpperCase() ? converted.toUpperCase() : converted;
            }
            
            return char; // Возвращаем символ как есть, если не найден
        }).join('');
    }

    async convertSelectedText(targetLayout = 'auto') {
        const selectedText = window.getSelection().toString().trim();
        if (!selectedText) {
            this.showNotification('⚠️ Выделите текст для конвертации', 'warning');
            return;
        }

        console.log('🔄 Конвертируем:', selectedText, 'в раскладку:', targetLayout);

        if (targetLayout === 'auto') {
            this.showConvertMenu();
            return;
        }

        try {
            const converted = this.convertToLayout(selectedText, targetLayout);
            if (converted !== selectedText) {
                await this.replaceSelectedText(converted);
                this.showNotification(`✅ Конвертировано в ${this.getLayoutName(targetLayout)}`, 'success');
            } else {
                this.showNotification('ℹ️ Текст уже в нужной раскладке', 'info');
            }
        } catch (error) {
            console.error('❌ Ошибка конвертации:', error);
            this.showNotification('❌ Ошибка конвертации: ' + error.message, 'error');
        }
    }

    async replaceSelectedText(newText) {
        // Копируем в буфер обмена
        try {
            await navigator.clipboard.writeText(newText);
            console.log('📋 Текст скопирован в буфер:', newText);
        } catch (error) {
            console.warn('⚠️ Не удалось скопировать в буфер:', error);
        }

        // Пытаемся заменить выделенный текст
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            
            try {
                // Проверяем, можно ли редактировать
                const container = range.commonAncestorContainer;
                const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
                
                if (this.isEditableElement(element)) {
                    range.deleteContents();
                    range.insertNode(document.createTextNode(newText));
                    
                    // Устанавливаем курсор в конец вставленного текста
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    
                    console.log('✅ Текст заменен в редактируемом элементе');
                } else {
                    console.log('ℹ️ Элемент не редактируется, текст только скопирован');
                    this.showNotification('📋 Текст скопирован в буфер обмена', 'info');
                }
            } catch (error) {
                console.warn('⚠️ Ошибка замены текста:', error);
                this.showNotification('📋 Текст скопирован в буфер обмена', 'info');
            }
        }
    }

    isEditableElement(element) {
        if (!element) return false;
        
        return (
            element.isContentEditable ||
            element.tagName === 'INPUT' ||
            element.tagName === 'TEXTAREA' ||
            element.closest('[contenteditable="true"]') ||
            element.closest('input') ||
            element.closest('textarea')
        );
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
        console.log(`📢 Уведомление (${type}):`, message);
        
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
            top: '20px',
            right: '80px', // Справа от плавающей кнопки
            backgroundColor: colors[type] || colors.info,
            color: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            zIndex: '10002',
            fontFamily: 'Segoe UI, Arial, sans-serif',
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });

        notification.textContent = message;
        document.body.appendChild(notification);

        // Автоматическое удаление через 4 секунды
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => notification.remove(), 300);
            }
        }, 4000);
    }
}

// Инициализируем конвертер
console.log('🚀 Создаем SimpleKeymapConverter');
const keymapConverter = new SimpleKeymapConverter();
