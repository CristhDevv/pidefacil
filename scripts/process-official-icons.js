const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SOURCE_PATH = 'C:/Users/USER/.gemini/antigravity/brain/06fc6ba6-22ab-4dc3-ac41-07e23639070f/.user_uploaded/uploaded_media_1793236176932.jpg';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');

if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

async function processIcons() {
  console.log('Procesando icono oficial de PideFácil...');

  // 1. Guardar logo original en public
  await sharp(SOURCE_PATH)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'logo.png'));
  console.log('✓ public/logo.png guardado');

  // 2. Icono 512x512
  await sharp(SOURCE_PATH)
    .resize(512, 512, { fit: 'cover' })
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-512x512.png'));
  console.log('✓ icon-512x512.png');

  // 3. Icono 192x192
  await sharp(SOURCE_PATH)
    .resize(192, 192, { fit: 'cover' })
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-192x192.png'));
  console.log('✓ icon-192x192.png');

  // 4. Icono Maskable 512x512 (con 15% de padding seguro para Android)
  const innerSize = Math.round(512 * 0.76); // 389px dentro de 512px
  const innerBuffer = await sharp(SOURCE_PATH)
    .resize(innerSize, innerSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: innerBuffer, gravity: 'center' }])
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-maskable-512x512.png'));
  console.log('✓ icon-maskable-512x512.png');

  // 5. Apple Touch Icon 180x180
  await sharp(SOURCE_PATH)
    .resize(180, 180, { fit: 'cover' })
    .png()
    .toFile(path.join(ICONS_DIR, 'apple-touch-icon.png'));
  
  await sharp(SOURCE_PATH)
    .resize(180, 180, { fit: 'cover' })
    .png()
    .toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));
  console.log('✓ apple-touch-icon.png');

  // 6. Favicon 64x64 y 32x32
  await sharp(SOURCE_PATH)
    .resize(64, 64, { fit: 'cover' })
    .png()
    .toFile(path.join(ICONS_DIR, 'favicon-64x64.png'));

  await sharp(SOURCE_PATH)
    .resize(64, 64, { fit: 'cover' })
    .png()
    .toFile(path.join(PUBLIC_DIR, 'favicon.png'));
  console.log('✓ favicon.png');

  console.log('¡Todos los iconos oficiales PWA generados con éxito!');
}

processIcons().catch((err) => {
  console.error('Error procesando iconos:', err);
  process.exit(1);
});
