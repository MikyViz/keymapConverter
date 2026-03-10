// Создаем иконку 128x128
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Фон
ctx.fillStyle = '#667eea';
ctx.fillRect(0, 0, 128, 128);

// Градиент
const gradient = ctx.createLinearGradient(0, 0, 128, 128);
gradient.addColorStop(0, '#667eea');
gradient.addColorStop(1, '#764ba2');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 128, 128);

// Символ глобуса
ctx.fillStyle = 'white';
ctx.font = 'bold 80px Arial';
ctx.textAlign = 'center';
ctx.fillText('🌐', 64, 90);

// Сохраняем как base64 и выводим в консоль
setTimeout(() => {
    const dataURL = canvas.toDataURL('image/png');
    console.log('Base64 icon data:', dataURL);
}, 100);
