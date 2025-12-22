/**
 * Popup Script для Keymap Converter
 * Интерфейс расширения браузера
 */

class PopupKeymapConverter {
    constructor() {
        this.selectedLayout = 'auto';
        this.inspector = null;
        this.isReady = false;
        
        this.init();
    }

    async init() {
        await this.loadKeymapInspector();
        await this.loadSettings();
        this.setupEventListeners();
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['showFloatingButton']);
            const showButton = result.showFloatingButton !== undefined ? result.showFloatingButton : true;
            document.getElementById('showFloatingButton').checked = showButton;
        } catch (e) {
            console.error('Ошибка загрузки настроек:', e);
        }
    }

    async loadKeymapInspector() {
        // Простая имплементация для popup
        // В реальном расширении keymap-inspector будет загружен через content script
        this.layoutMaps = {
            'en_ru': {
                'q': 'й', 'w': 'ц', 'e': 'у', 'r': 'к', 't': 'е', 'y': 'н', 'u': 'г', 'i': 'ш', 'o': 'щ', 'p': 'з',
                'a': 'ф', 's': 'ы', 'd': 'в', 'f': 'а', 'g': 'п', 'h': 'р', 'j': 'о', 'k': 'л', 'l': 'д',
                'z': 'я', 'x': 'ч', 'c': 'с', 'v': 'м', 'b': 'и', 'n': 'т', 'm': 'ь'
            },
            'en_he': {
                'q': 'ק', 'w': 'ו', 'e': 'ע', 'r': 'ר', 't': 'ת', 'y': 'י', 'u': 'ו', 'i': 'י', 'o': 'ו', 'p': 'פ',
                'a': 'א', 's': 'ס', 'd': 'ד', 'f': 'פ', 'g': 'ג', 'h': 'ה', 'j': 'י', 'k': 'כ', 'l': 'ל',
                'z': 'ז', 'x': 'ח', 'c': 'צ', 'v': 'ו', 'b': 'ב', 'n': 'נ', 'm': 'מ'
            }
        };
        this.isReady = true;
    }

    setupEventListeners() {
        const inputText = document.getElementById('inputText');
        const outputVariants = document.getElementById('outputVariants');
        
        // Обработка ввода текста
        inputText.addEventListener('input', () => {
            this.processText(inputText.value);
        });

        // Кнопки выбора раскладки
        document.querySelectorAll('.layout-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectLayout(e.target.dataset.layout);
                this.processText(inputText.value);
            });
        });
        
        // Настройка плавающей кнопки
        const showFloatingButton = document.getElementById('showFloatingButton');
        showFloatingButton.addEventListener('change', async (e) => {
            try {
                console.log('⚙️ Изменение настройки showFloatingButton:', e.target.checked);
                await chrome.storage.sync.set({ showFloatingButton: e.target.checked });
                console.log('⚙️ Настройка сохранена в storage');
                
                // Уведомляем все вкладки об изменении
                const tabs = await chrome.tabs.query({});
                console.log('⚙️ Отправка обновления на', tabs.length, 'вкладок');
                
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'updateSettings',
                        showFloatingButton: e.target.checked
                    }).catch(() => {}); // Игнорируем ошибки для вкладок без content script
                });
                this.showNotification('✅ Настройки сохранены');
            } catch (e) {
                console.error('Ошибка сохранения настроек:', e);
                this.showNotification('❌ Ошибка сохранения', 'error');
            }
        });
    }

    selectLayout(layout) {
        this.selectedLayout = layout;
        
        // Обновляем активную кнопку
        document.querySelectorAll('.layout-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-layout="${layout}"]`).classList.add('active');
    }

    processText(text) {
        const outputVariants = document.getElementById('outputVariants');
        
        if (!text.trim()) {
            outputVariants.innerHTML = '<div class="empty-state">Enter text to convert</div>';
            return;
        }

        const variants = this.convertTextToAllLayouts(text);
        this.displayResults(variants, text);
    }

    convertTextToAllLayouts(text) {
        const results = [];
        
        if (this.selectedLayout === 'auto') {
            // Конвертируем во все раскладки
            const layouts = ['en', 'ru', 'he'];
            layouts.forEach(layout => {
                const converted = this.convertToLayout(text, layout);
                if (converted !== text && converted.trim()) {
                    results.push({ layout, text: converted });
                }
            });
        } else {
            // Конвертируем в выбранную раскладку
            const converted = this.convertToLayout(text, this.selectedLayout);
            if (converted !== text && converted.trim()) {
                results.push({ layout: this.selectedLayout, text: converted });
            }
        }

        return results;
    }

    convertToLayout(text, targetLayout) {
        // Простая конвертация (в реальном расширении используется keymap-inspector)
        const lowerText = text.toLowerCase();
        let result = text;

        if (targetLayout === 'ru') {
            // EN -> RU
            result = Array.from(lowerText).map(char => {
                return this.layoutMaps.en_ru[char] || char;
            }).join('');
        } else if (targetLayout === 'en') {
            // RU -> EN или HE -> EN
            const ruToEn = Object.fromEntries(
                Object.entries(this.layoutMaps.en_ru).map(([k, v]) => [v, k])
            );
            result = Array.from(text).map(char => {
                return ruToEn[char.toLowerCase()] || char;
            }).join('');
        } else if (targetLayout === 'he') {
            // EN -> HE
            result = Array.from(lowerText).map(char => {
                return this.layoutMaps.en_he[char] || char;
            }).join('');
        }

        return result;
    }

    displayResults(variants, originalText) {
        const outputVariants = document.getElementById('outputVariants');
        
        if (variants.length === 0) {
            outputVariants.innerHTML = '<div class="empty-state">No conversion needed</div>';
            return;
        }

        const layoutNames = {
            'en': '🇺🇸 English',
            'ru': '🇷🇺 Русский',
            'he': '🇮🇱 עברית'
        };

        outputVariants.innerHTML = '';
        
        variants.forEach(variant => {
            const card = document.createElement('div');
            card.className = 'variant-card';
            card.innerHTML = `
                <div class="variant-title">${layoutNames[variant.layout]}</div>
                <div class="variant-text">${this.escapeHtml(variant.text)}</div>
            `;
            
            card.addEventListener('click', () => {
                this.copyToClipboard(variant.text);
                this.sendToActiveTab(variant.text);
            });
            
            outputVariants.appendChild(card);
        });
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('Скопировано в буфер обмена!');
        } catch (error) {
            this.showNotification('Ошибка копирования', 'error');
        }
    }

    sendToActiveTab(text) {
        // Отправляем текст в активную вкладку для замены выделенного текста
        chrome.runtime.sendMessage({
            action: 'convertText',
            text: text
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 2000);
    }
}

// Инициализируем popup при загрузке
document.addEventListener('DOMContentLoaded', () => {
    new PopupKeymapConverter();
});
