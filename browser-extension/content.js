/**
 * Content Script для Keymap Converter
 * Использует keymap-inspector npm пакет для конвертации
 */

class BrowserKeymapConverter {
    constructor() {
        this.version = '2.0.0';
        this.inspector = null;
        this.currentSelection = null;
        this.showFloatingButton = true; // настройка по умолчанию
        this.init();
    }
    
    async init() {
        try {
            // Загружаем настройки
            await this.loadSettings();
            // Загружаем keymap-inspector из скрипта
            await this.loadKeymapInspector();
            this.setupEventListeners();
            this.createFloatingButton();
            this.setupKeyboardShortcuts();
            this.setupMessageListener();
            console.log('🚀 Keymap Converter v' + this.version + ' загружен и готов!');
            console.log('✅ Используется keymap-inspector v0.1.5');
            console.log('✅ Поддержка: INPUT, TEXTAREA, ContentEditable, обычный текст');
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
        }
    }
    
    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['showFloatingButton']);
            this.showFloatingButton = result.showFloatingButton !== undefined ? result.showFloatingButton : true;
            console.log('⚙️ Загружена настройка showFloatingButton:', this.showFloatingButton);
            console.log('⚙️ Рав результат из storage:', result);
            
            // Если кнопка выключена, убедимся что она скрыта
            if (!this.showFloatingButton) {
                setTimeout(() => this.hideConvertButton(), 100);
            }
        } catch (e) {
            console.error('Ошибка загрузки настроек:', e);
            this.showFloatingButton = true;
        }
    }
    
    setupMessageListener() {
        // Слушаем сообщения об изменении настроек
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'updateSettings') {
                console.log('⚙️ Получено обновление настроек:', message.showFloatingButton);
                this.showFloatingButton = message.showFloatingButton;
                console.log('⚙️ Новое значение showFloatingButton:', this.showFloatingButton);
                // Скрываем кнопку, если нужно
                if (!this.showFloatingButton) {
                    this.hideConvertButton();
                    console.log('⚙️ Кнопка скрыта');
                } else {
                    console.log('⚙️ Кнопка включена');
                }
            }
        });
    }
    
    async loadKeymapInspector() {
        // keymap-inspector.js загружается автоматически через manifest.json
        // Просто ждем немного на случай если скрипт еще не успел выполниться
        return new Promise((resolve, reject) => {
            const checkLoaded = () => {
                if (typeof window.KeymapInspector !== 'undefined') {
                    try {
                        this.initializeInspector();
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    // Ждем еще немного
                    setTimeout(checkLoaded, 50);
                }
            };
            
            checkLoaded();
            
            // Таймаут на случай если что-то пошло не так
            setTimeout(() => {
                if (!this.inspector) {
                    reject(new Error('KeymapInspector не загрузился за отведенное время'));
                }
            }, 5000);
        });
    }
    
    initializeInspector() {
        const KeymapInspector = window.KeymapInspector;
        
        if (!KeymapInspector) {
            throw new Error('KeymapInspector не найден');
        }
        
        // Получаем раскладки из разных мест, где они могут быть экспортированы
        const en = window.en || (window.KeymapLayouts && window.KeymapLayouts.en) || KeymapInspector.en;
        const ru = window.ru || (window.KeymapLayouts && window.KeymapLayouts.ru) || KeymapInspector.ru;
        const he = window.he || (window.KeymapLayouts && window.KeymapLayouts.he) || KeymapInspector.he;
        
        if (!en || !ru || !he) {
            console.error('Доступные объекты в window:', Object.keys(window).filter(k => k === 'KeymapInspector' || k === 'KeymapLayouts' || k === 'en' || k === 'ru' || k === 'he'));
            throw new Error('Раскладки не найдены. EN: ' + !!en + ', RU: ' + !!ru + ', HE: ' + !!he);
        }
        
        // Инициализируем inspector с тремя раскладками
        this.inspector = new KeymapInspector({ en, ru, he });
        console.log('✅ KeymapInspector инициализирован с раскладками: EN, RU, HE');
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
                    if (this.showFloatingButton) {
                        this.showConvertButton();
                    }
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
                    if (this.showFloatingButton) {
                        this.showConvertButton();
                    }
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

        const button = document.createElement('img');
        button.id = 'keymap-converter-float-btn';
        button.src = chrome.runtime.getURL('icons/icon48.png');
        button.title = 'Convert text (Ctrl+Shift+K)\nDrag to move';
        
        // Загружаем сохраненную позицию
        const savedPosition = this.loadButtonPosition();
        
        Object.assign(button.style, {
            position: 'fixed',
            top: savedPosition.top,
            right: savedPosition.right,
            left: savedPosition.left,
            bottom: savedPosition.bottom,
            width: '48px',
            height: '48px',
            display: 'none',
            cursor: 'move',
            zIndex: '2147483647', // максимальный z-index
            filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3))',
            transition: 'transform 0.3s ease, filter 0.3s ease',
            userSelect: 'none'
        });

        // Переменные для drag and drop
        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let buttonStartX = 0;
        let buttonStartY = 0;

        button.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // только левая кнопка мыши
            
            isDragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            
            const rect = button.getBoundingClientRect();
            buttonStartX = rect.left;
            buttonStartY = rect.top;
            
            button.style.transition = 'none';
            button.classList.add('dragging');
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - dragStartX;
            const deltaY = e.clientY - dragStartY;
            
            const newX = buttonStartX + deltaX;
            const newY = buttonStartY + deltaY;
            
            // Ограничиваем позицию в пределах viewport
            const maxX = window.innerWidth - 50;
            const maxY = window.innerHeight - 50;
            
            const constrainedX = Math.max(0, Math.min(newX, maxX));
            const constrainedY = Math.max(0, Math.min(newY, maxY));
            
            button.style.left = constrainedX + 'px';
            button.style.top = constrainedY + 'px';
            button.style.right = 'auto';
            button.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', (e) => {
            if (isDragging) {
                isDragging = false;
                button.style.transition = 'transform 0.3s ease, filter 0.3s ease';
                button.classList.remove('dragging');
                
                // Сохраняем новую позицию
                this.saveButtonPosition(button);
                
                // Если кнопка не была перемещена значительно, это клик
                const deltaX = Math.abs(e.clientX - dragStartX);
                const deltaY = Math.abs(e.clientY - dragStartY);
                if (deltaX < 5 && deltaY < 5) {
                    this.handleConversion('auto');
                }
            }
        });

        button.addEventListener('mouseenter', () => {
            if (!isDragging) {
                button.style.transform = 'scale(1.15)';
                button.style.filter = 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4))';
            }
        });

        button.addEventListener('mouseleave', () => {
            if (!isDragging) {
                button.style.transform = 'scale(1)';
                button.style.filter = 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3))';
            }
        });

        document.body.appendChild(button);
        console.log('🔘 Плавающая кнопка создана (можно перетаскивать)');
    }

    loadButtonPosition() {
        try {
            const saved = localStorage.getItem('keymapConverter-buttonPosition');
            if (saved) {
                const position = JSON.parse(saved);
                // Проверяем, что позиция все еще в пределах видимой области
                if (position.left !== 'auto' && parseInt(position.left) > window.innerWidth - 50) {
                    return { top: '20px', right: '20px', left: 'auto', bottom: 'auto' };
                }
                return position;
            }
        } catch (e) {
            console.error('Ошибка загрузки позиции кнопки:', e);
        }
        // Позиция по умолчанию
        return { top: '20px', right: '20px', left: 'auto', bottom: 'auto' };
    }

    saveButtonPosition(button) {
        try {
            const position = {
                top: button.style.top,
                right: button.style.right,
                left: button.style.left,
                bottom: button.style.bottom
            };
            localStorage.setItem('keymapConverter-buttonPosition', JSON.stringify(position));
        } catch (e) {
            console.error('Ошибка сохранения позиции кнопки:', e);
        }
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
            this.showNotification('⚠️ Select text to convert', 'warning');
            return;
        }

        console.log('🔄 Conversion:', selectedText, 'to', layout);
        if (layout === 'auto') {
            this.showConvertMenu(selectedText);
            return;
        }

        try {
            const converted = this.convertToLayout(selectedText, layout);
            if (converted !== selectedText) {
                this.replaceSelectedText(converted);
                this.copyToClipboard(converted);
                this.showNotification(`✅ Converted to ${this.getLayoutName(layout)}`, 'success');
            } else {
                this.showNotification('ℹ️ Text is already in the desired layout', 'info');
            }
        } catch (error) {
            this.showNotification('❌ Conversion error: ' + error.message, 'error');
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
        
        const h3 = document.createElement('h3');
        Object.assign(h3.style, { margin: '0 0 15px 0', color: '#333', fontSize: '18px' });
        h3.textContent = '🌐 Convert text';
        
        const previewDiv = document.createElement('div');
        Object.assign(previewDiv.style, { background: '#f5f5f5', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontFamily: 'monospace', fontSize: '14px', maxHeight: '100px', overflowY: 'auto' });
        previewDiv.textContent = `"${preview}"`;
        
        const variantsDiv = document.createElement('div');
        variantsDiv.id = 'convert-variants';
        Object.assign(variantsDiv.style, { margin: '15px 0' });
        
        menu.appendChild(h3);
        menu.appendChild(previewDiv);
        menu.appendChild(variantsDiv);
        
        const closeButtonDiv = document.createElement('div');
        Object.assign(closeButtonDiv.style, { marginTop: '15px', textAlign: 'right' });
        
        const closeButton = document.createElement('button');
        closeButton.id = 'close-menu';
        Object.assign(closeButton.style, { background: '#e0e0e0', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', transition: 'background 0.2s' });
        closeButton.textContent = 'Close';
        
        closeButtonDiv.appendChild(closeButton);
        menu.appendChild(closeButtonDiv);

        const variantsContainer = menu.querySelector('#convert-variants');
        
        if (variants.length === 0) {
            const noConversion = document.createElement('p');
            Object.assign(noConversion.style, { color: '#666', textAlign: 'center', padding: '20px' });
            noConversion.textContent = 'No conversion needed';
            variantsContainer.appendChild(noConversion);
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
                
                const strong = document.createElement('strong');
                Object.assign(strong.style, { color: '#667eea', fontSize: '15px' });
                strong.textContent = this.getLayoutName(variant.layout);
                
                const br = document.createElement('br');
                
                const span = document.createElement('span');
                span.style.color = '#333';
                span.textContent = variant.text;
                
                button.appendChild(strong);
                button.appendChild(br);
                button.appendChild(span);
                
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
                    this.showNotification(`✅ Converted to ${this.getLayoutName(variant.layout)}`, 'success');
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
        if (!this.inspector) {
            console.error('❌ Inspector not initialized');
            return [];
        }
        
        const results = [];
        const layouts = ['en', 'ru', 'he'];

        layouts.forEach(targetLayout => {
            try {
                const converted = this.convertToLayout(text, targetLayout);
                if (converted !== text && converted.trim()) {
                    results.push({ layout: targetLayout, text: converted });
                }
            } catch (error) {
                console.warn(`Conversion error in ${targetLayout}:`, error);
            }
        });

        return results;
    }

    convertToLayout(text, targetLayout) {
        if (!this.inspector) {
            throw new Error('Inspector not initialized');
        }
        
        // Конвертируем каждый символ используя keymap-inspector
        let result = '';
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            
            // Проверяем не пробел/спецсимвол ли это
            if (char === ' ' || char === '\n' || char === '\t') {
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
                this.showNotification('📋 Text copied to clipboard. Please paste manually (Ctrl+V)', 'info');
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
