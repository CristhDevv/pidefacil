const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// SVG Vectorial del Logo Oficial PideFácil
// Icono: Bolso de compras moderno con asa, esquinas redondeadas y tilde/check de pago seguro
function createSvg(size, isMaskable = false) {
  const padding = isMaskable ? size * 0.22 : size * 0.12;
  const contentSize = size - padding * 2;
  const rx = isMaskable ? 0 : size * 0.22; // Squircle redondeado para iconos normales, full bleed para maskable

  return `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="pideBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#16a34a" />
        <stop offset="100%" stop-color="#047857" />
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="${size * 0.03}" stdDeviation="${size * 0.03}" flood-color="#064e3b" flood-opacity="0.35"/>
      </filter>
    </defs>

    <!-- Fondo Verde Esmeralda PideFácil -->
    <rect width="${size}" height="${size}" rx="${rx}" fill="url(#pideBg)"/>

    <!-- Bolsa de Compras Vectorial con Sombra -->
    <g transform="translate(${padding}, ${padding})" filter="url(#shadow)">
      <!-- Asa de la Bolsa -->
      <path 
        d="M ${contentSize * 0.33} ${contentSize * 0.35} 
           C ${contentSize * 0.33} ${contentSize * 0.15}, 
             ${contentSize * 0.67} ${contentSize * 0.15}, 
             ${contentSize * 0.67} ${contentSize * 0.35}" 
        fill="none" 
        stroke="#ffffff" 
        stroke-width="${contentSize * 0.08}" 
        stroke-linecap="round" 
      />

      <!-- Cuerpo de la Bolsa -->
      <path 
        d="M ${contentSize * 0.18} ${contentSize * 0.35} 
           L ${contentSize * 0.82} ${contentSize * 0.35} 
           L ${contentSize * 0.77} ${contentSize * 0.88} 
           C ${contentSize * 0.76} ${contentSize * 0.93}, ${contentSize * 0.71} ${contentSize * 0.95}, ${contentSize * 0.65} ${contentSize * 0.95} 
           L ${contentSize * 0.35} ${contentSize * 0.95} 
           C ${contentSize * 0.29} ${contentSize * 0.95}, ${contentSize * 0.24} ${contentSize * 0.93}, ${contentSize * 0.23} ${contentSize * 0.88} 
           Z" 
        fill="#ffffff" 
      />

      <!-- Símbolo Check / Relámpago Verde Central (Pago Contra Entrega Rápido) -->
      <path 
        d="M ${contentSize * 0.38} ${contentSize * 0.62} 
           L ${contentSize * 0.47} ${contentSize * 0.72} 
           L ${contentSize * 0.63} ${contentSize * 0.52}" 
        fill="none" 
        stroke="#16a34a" 
        stroke-width="${contentSize * 0.08}" 
        stroke-linecap="round" 
        stroke-linejoin="round" 
      />
    </g>
  </svg>
  `;
}

async function run() {
  console.log('Generando iconos PWA...');

  // 1. Icono 192x192
  const svg192 = Buffer.from(createSvg(192, false));
  await sharp(svg192).png().toFile(path.join(ICONS_DIR, 'icon-192x192.png'));
  console.log('✓ icon-192x192.png generado');

  // 2. Icono 512x512
  const svg512 = Buffer.from(createSvg(512, false));
  await sharp(svg512).png().toFile(path.join(ICONS_DIR, 'icon-512x512.png'));
  console.log('✓ icon-512x512.png generado');

  // 3. Icono Maskable 512x512 (para Android con safe area)
  const svgMaskable = Buffer.from(createSvg(512, true));
  await sharp(svgMaskable).png().toFile(path.join(ICONS_DIR, 'icon-maskable-512x512.png'));
  console.log('✓ icon-maskable-512x512.png generado');

  // 4. Apple Touch Icon 180x180
  const svgApple = Buffer.from(createSvg(180, false));
  await sharp(svgApple).png().toFile(path.join(ICONS_DIR, 'apple-touch-icon.png'));
  console.log('✓ apple-touch-icon.png generado');

  // 5. Favicon 64x64
  const svgFavicon = Buffer.from(createSvg(64, false));
  await sharp(svgFavicon).png().toFile(path.join(ICONS_DIR, 'favicon-64x64.png'));
  console.log('✓ favicon-64x64.png generado');
}

run().catch((err) => {
  console.error('Error generando iconos:', err);
  process.exit(1);
});
