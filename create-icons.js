const fs = require('fs');
const path = require('path');

// Создаем простые SVG иконки
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
<rect width="128" height="128" fill="url(#gradient)"/>
<defs>
  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color:#667eea"/>
    <stop offset="100%" style="stop-color:#764ba2"/>
  </linearGradient>
</defs>
<circle cx="64" cy="64" r="50" fill="none" stroke="white" stroke-width="3"/>
<circle cx="64" cy="64" r="30" fill="none" stroke="white" stroke-width="2"/>
<path d="M 64,14 A 50,50 0 0,1 64,114" fill="none" stroke="white" stroke-width="2"/>
<path d="M 14,64 A 50,50 0 0,1 114,64" fill="none" stroke="white" stroke-width="2"/>
<text x="64" y="70" text-anchor="middle" fill="white" font-family="Arial" font-size="16" font-weight="bold">КМ</text>
</svg>`;

// Сохраняем как SVG
const iconsDir = path.join('browser-extension', 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon128.svg'), svgIcon);

// Создаем уменьшенные версии
const sizes = [16, 32, 48];
sizes.forEach(size => {
    const smallIcon = svgIcon.replace(/width="128"/g, `width="${size}"`).replace(/height="128"/g, `height="${size}"`);
    fs.writeFileSync(path.join(iconsDir, `icon${size}.svg`), smallIcon);
});

console.log('SVG иконки созданы для всех размеров');
