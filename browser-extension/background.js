/**
 * Background Script для Keymap Converter Browser Extension
 * С поддержкой контекстного меню
 */

console.log('🚀 Keymap Converter Background Script запущен');

// Создаем контекстное меню при установке
chrome.runtime.onInstalled.addListener(() => {
    console.log('🎉 Keymap Converter установлен, создаем контекстное меню');
    
    // Удаляем старые меню если есть
    chrome.contextMenus.removeAll(() => {
        // Родительское меню
        chrome.contextMenus.create({
            id: 'keymap-converter-parent',
            title: 'Конвертировать текст',
            contexts: ['selection']
        });

        // Подменю для автоматической конвертации
        chrome.contextMenus.create({
            id: 'convert-auto',
            parentId: 'keymap-converter-parent',
            title: '🔄 Автоматически (показать варианты)',
            contexts: ['selection']
        });

        chrome.contextMenus.create({
            id: 'separator1',
            parentId: 'keymap-converter-parent',
            type: 'separator',
            contexts: ['selection']
        });

        // Подменю для конкретных раскладок
        chrome.contextMenus.create({
            id: 'convert-english',
            parentId: 'keymap-converter-parent',
            title: '🇺🇸 English',
            contexts: ['selection']
        });

        chrome.contextMenus.create({
            id: 'convert-russian',
            parentId: 'keymap-converter-parent',
            title: '🇷🇺 Русский',
            contexts: ['selection']
        });

        chrome.contextMenus.create({
            id: 'convert-hebrew',
            parentId: 'keymap-converter-parent',
            title: '🇮🇱 עברית (иврит)',
            contexts: ['selection']
        });

        console.log('✅ Контекстное меню создано');
    });
});

// Обработка кликов по контекстному меню
chrome.contextMenus.onClicked.addListener((info, tab) => {
    console.log('🖱️ Клик по контекстному меню:', info.menuItemId);
    
    let layout = 'auto';
    
    switch (info.menuItemId) {
        case 'convert-auto':
            layout = 'auto';
            break;
        case 'convert-english':
            layout = 'en';
            break;
        case 'convert-russian':
            layout = 'ru';
            break;
        case 'convert-hebrew':
            layout = 'he';
            break;
        default:
            return;
    }

    sendConversionMessage(tab.id, layout);
});

// Обработка команд из горячих клавиш
chrome.commands.onCommand.addListener(async (command) => {
    console.log('⌨️ Команда получена:', command);
    
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab || !tab.id) {
            console.error('❌ Активная вкладка не найдена');
            return;
        }

        let layout = 'auto';
        
        switch (command) {
            case 'convert-auto':
                layout = 'auto';
                break;
            case 'convert-english':
                layout = 'en';
                break;
            case 'convert-russian':
                layout = 'ru';
                break;
            case 'convert-hebrew':
                layout = 'he';
                break;
        }

        console.log(`🎯 Конвертируем в раскладку: ${layout}`);
        sendConversionMessage(tab.id, layout);
        
    } catch (error) {
        console.error('❌ Общая ошибка:', error);
    }
});

// Обработка клика по иконке расширения
chrome.action.onClicked.addListener(async (tab) => {
    console.log('🖱️ Клик по иконке расширения');
    sendConversionMessage(tab.id, 'auto');
});

// Универсальная функция отправки сообщения
async function sendConversionMessage(tabId, layout) {
    try {
        await chrome.tabs.sendMessage(tabId, {
            action: 'convertSelection',
            layout: layout
        });
        console.log('✅ Команда отправлена в content script');
    } catch (error) {
        console.log('⚠️ Content script не найден, инжектим...');
        
        try {
            // Инжектим content script
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
            });
            
            console.log('✅ Content script заинжекчен');
            
            // Ждем немного и пробуем снова
            setTimeout(async () => {
                try {
                    await chrome.tabs.sendMessage(tabId, {
                        action: 'convertSelection',
                        layout: layout
                    });
                    console.log('✅ Команда отправлена после инжекции');
                } catch (e) {
                    console.error('❌ Не удалось отправить команду:', e);
                }
            }, 200);
            
        } catch (injectionError) {
            console.error('❌ Ошибка инжекции:', injectionError);
        }
    }
}

// Обработка сообщений от content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateContextMenu') {
        console.log('📝 Обновление контекстного меню:', message);
        // Здесь можно динамически обновлять меню если нужно
    }
    return true;
});

console.log('✅ Background Script полностью инициализирован');
