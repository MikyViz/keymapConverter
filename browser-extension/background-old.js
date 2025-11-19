/**
 * Background Script для Keymap Converter
 * Обрабатывает команды клавиатуры и контекстное меню
 */

// Создаем контекстное меню при установке расширения
chrome.runtime.onInstalled.addListener(() => {
    // Создаем контекстное меню для выделенного текста
    chrome.contextMenus.create({
        id: 'keymap-convert-selection',
        title: '🌐 Конвертировать выделенный текст',
        contexts: ['selection']
    });

    chrome.contextMenus.create({
        id: 'keymap-convert-to-en',
        title: '🇺🇸 В английскую раскладку',
        contexts: ['selection'],
        parentId: 'keymap-convert-selection'
    });

    chrome.contextMenus.create({
        id: 'keymap-convert-to-ru', 
        title: '🇷🇺 В русскую раскладку',
        contexts: ['selection'],
        parentId: 'keymap-convert-selection'
    });

    chrome.contextMenus.create({
        id: 'keymap-convert-to-he',
        title: '🇮🇱 В ивритскую раскладку',
        contexts: ['selection'],
        parentId: 'keymap-convert-selection'
    });

    console.log('🚀 Keymap Converter установлен!');
});

// Обработка кликов по контекстному меню
chrome.contextMenus.onClicked.addListener((info, tab) => {
    let layout = 'auto';
    
    switch (info.menuItemId) {
        case 'keymap-convert-selection':
            layout = 'auto';
            break;
        case 'keymap-convert-to-en':
            layout = 'en';
            break;
        case 'keymap-convert-to-ru':
            layout = 'ru';
            break;
        case 'keymap-convert-to-he':
            layout = 'he';
            break;
    }

    // Отправляем сообщение в content script
    chrome.tabs.sendMessage(tab.id, {
        action: 'convertSelection',
        layout: layout
    });
});

// Обработка горячих клавиш
chrome.commands.onCommand.addListener((command, tab) => {
    let layout = 'auto';
    
    switch (command) {
        case 'convert-selection':
            layout = 'auto';
            break;
        case 'convert-to-english':
            layout = 'en';
            break;
        case 'convert-to-russian':
            layout = 'ru';
            break;
        case 'convert-to-hebrew':
            layout = 'he';
            break;
    }

    // Отправляем сообщение в content script
    chrome.tabs.sendMessage(tab.id, {
        action: 'convertSelection',
        layout: layout
    });
});

// Обработка сообщений от popup или content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'convertText') {
        // Пересылаем сообщение в активную вкладку
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, message);
            }
        });
    }
    
    sendResponse({ success: true });
});
