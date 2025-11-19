/**
 * Простая реализация конвертера раскладок для веб-версии
 */

// Маппинг клавиш для основных раскладок
const keyMappings = {
    // Верхний ряд цифр
    '1': { en: '1', ru: '1', he: '1' },
    '2': { en: '2', ru: '2', he: '2' },
    '3': { en: '3', ru: '3', he: '3' },
    '4': { en: '4', ru: '4', he: '4' },
    '5': { en: '5', ru: '5', he: '5' },
    '6': { en: '6', ru: '6', he: '6' },
    '7': { en: '7', ru: '7', he: '7' },
    '8': { en: '8', ru: '8', he: '8' },
    '9': { en: '9', ru: '9', he: '9' },
    '0': { en: '0', ru: '0', he: '0' },

    // Верхний ряд букв
    'q': { en: 'q', ru: 'й', he: '/' },
    'w': { en: 'w', ru: 'ц', he: '\'' },
    'e': { en: 'e', ru: 'у', he: 'ק' },
    'r': { en: 'r', ru: 'к', he: 'ר' },
    't': { en: 't', ru: 'е', he: 'א' },
    'y': { en: 'y', ru: 'н', he: 'ט' },
    'u': { en: 'u', ru: 'г', he: 'ו' },
    'i': { en: 'i', ru: 'ш', he: 'ן' },
    'o': { en: 'o', ru: 'щ', he: 'ם' },
    'p': { en: 'p', ru: 'з', he: 'פ' },

    // Средний ряд
    'a': { en: 'a', ru: 'ф', he: 'ש' },
    's': { en: 's', ru: 'ы', he: 'ד' },
    'd': { en: 'd', ru: 'в', he: 'ג' },
    'f': { en: 'f', ru: 'а', he: 'כ' },
    'g': { en: 'g', ru: 'п', he: 'ע' },
    'h': { en: 'h', ru: 'р', he: 'י' },
    'j': { en: 'j', ru: 'о', he: 'ח' },
    'k': { en: 'k', ru: 'л', he: 'ל' },
    'l': { en: 'l', ru: 'д', he: 'ך' },

    // Нижний ряд
    'z': { en: 'z', ru: 'я', he: 'ז' },
    'x': { en: 'x', ru: 'ч', he: 'ס' },
    'c': { en: 'c', ru: 'с', he: 'ב' },
    'v': { en: 'v', ru: 'м', he: 'ה' },
    'b': { en: 'b', ru: 'и', he: 'נ' },
    'n': { en: 'n', ru: 'т', he: 'מ' },
    'm': { en: 'm', ru: 'ь', he: 'צ' },

    // Пробел остается пробелом
    ' ': { en: ' ', ru: ' ', he: ' ' },

    // Знаки препинания
    '.': { en: '.', ru: '.', he: '.' },
    ',': { en: ',', ru: ',', he: ',' },
    '?': { en: '?', ru: '?', he: '?' },
    '!': { en: '!', ru: '!', he: '!' },
    ':': { en: ':', ru: ':', he: ':' },
    ';': { en: ';', ru: ';', he: ';' },
    '-': { en: '-', ru: '-', he: '-' },
    '=': { en: '=', ru: '=', he: '=' },
};

// Создаем обратный маппинг для всех раскладок
const reverseMapping = {};

Object.keys(keyMappings).forEach(key => {
    const mapping = keyMappings[key];
    reverseMapping[mapping.en.toLowerCase()] = key;
    reverseMapping[mapping.ru.toLowerCase()] = key;
    reverseMapping[mapping.he] = key;
});

class SimpleKeymapInspector {
    inspect(char) {
        const lowerChar = char.toLowerCase();
        
        // Прямой поиск в маппингах
        if (keyMappings[lowerChar]) {
            return {
                char,
                layouts: keyMappings[lowerChar],
                keyDefinition: {
                    key: lowerChar,
                    code: `Key${lowerChar.toUpperCase()}`
                }
            };
        }

        // Обратный поиск
        const physicalKey = reverseMapping[lowerChar];
        if (physicalKey && keyMappings[physicalKey]) {
            return {
                char,
                layouts: keyMappings[physicalKey],
                keyDefinition: {
                    key: physicalKey,
                    code: `Key${physicalKey.toUpperCase()}`
                }
            };
        }

        // Если символ не найден, возвращаем как есть
        return {
            char,
            layouts: { en: char, ru: char, he: char }
        };
    }

    convertText(text, targetLayout) {
        return Array.from(text).map(char => {
            try {
                const result = this.inspect(char);
                return result.layouts[targetLayout] || char;
            } catch (error) {
                return char;
            }
        }).join('');
    }
}

// Экспортируем для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SimpleKeymapInspector };
}

// Делаем доступным глобально для браузера
if (typeof window !== 'undefined') {
    window.SimpleKeymapInspector = SimpleKeymapInspector;
}
