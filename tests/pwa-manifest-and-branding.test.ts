/**
 * ==============================================================================
 * SUITE DE PRUEBAS UNITARIAS: MANIFEST PWA, ASSETS Y MARCA BLANCA (WHITE-LABEL)
 * ==============================================================================
 * Verifica la especificación estándar de Progressive Web App (PWA), la presencia
 * física de los iconos oficiales y la erradicación de referencias al proveedor
 * en las interfaces de cliente y vendedor.
 */

import fs from 'fs';
import path from 'path';
import manifest from '../app/manifest';
import { TestSuite } from './test-utils';

export function runPwaAndBrandingTests() {
  const suite = new TestSuite('PWA Manifest, Iconos y Marca Blanca');

  console.log('\n===============================================================');
  console.log('🧪 EJECUTANDO TEST SUITE: PWA Manifest, Assets e Integridad Visual');
  console.log('===============================================================\n');

  // 1. Especificación del Manifest PWA
  console.log('📌 Bloque 1: Configuración Estándar Web Manifest');

  const m = manifest();

  suite.assertEqual(m.name, 'PideFácil — Paga en Casa Colombia', 'Nombre completo de la PWA configurado');
  suite.assertEqual(m.short_name, 'PideFácil', 'Nombre corto (pantalla de inicio) configurado');
  suite.assertEqual(m.start_url, '/', 'start_url apunta a la raíz');
  suite.assertEqual(m.display, 'standalone', 'Modo de visualización standalone (sin barra de navegador)');
  suite.assertEqual(m.theme_color, '#16a34a', 'Color de tema verde esmeralda (#16a34a)');
  suite.assertEqual(m.background_color, '#F8FAFC', 'Color de fondo configurado');
  suite.assertEqual(m.orientation, 'portrait-primary', 'Orientación vertical bloqueada para móvil');

  // Validación de iconos en el manifest
  const icons = m.icons || [];
  suite.assert(icons.some((i) => i.sizes === '192x192'), 'Manifest declara icono 192x192');
  suite.assert(icons.some((i) => i.sizes === '512x512' && i.purpose === 'any'), 'Manifest declara icono 512x512');
  suite.assert(icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable'), 'Manifest declara icono adaptable maskable 512x512');
  suite.assert(icons.some((i) => i.sizes === '180x180'), 'Manifest declara icono apple-touch-icon 180x180');

  // Accesos directos (shortcuts)
  const shortcuts = m.shortcuts || [];
  suite.assert(shortcuts.length >= 2, 'PWA incluye al menos 2 accesos directos nativos');
  suite.assert(shortcuts.some((s) => s.url === '/seller' || s.url === '/seller/login'), 'Acceso directo a Portal de Vendedores');

  // 2. Existencia Física de Archivos en Disco
  console.log('\n📌 Bloque 2: Archivos PWA y Recursos Gráficos en public/');

  const publicFiles = [
    'public/manifest.json',
    'public/sw.js',
    'public/logo.png',
    'public/favicon.png',
    'public/apple-touch-icon.png',
    'public/icons/icon-192x192.png',
    'public/icons/icon-512x512.png',
    'public/icons/icon-maskable-512x512.png',
    'public/icons/apple-touch-icon.png',
    'public/icons/favicon-64x64.png',
  ];

  publicFiles.forEach((relPath) => {
    const fullPath = path.resolve(relPath);
    const exists = fs.existsSync(fullPath);
    let size = 0;
    if (exists) {
      size = fs.statSync(fullPath).size;
    }
    suite.assert(exists && size > 100, `Recurso físico válido: ${relPath} (${size} bytes)`);
  });

  // 3. Regla Estricta de Marca Blanca (White-Label)
  console.log('\n📌 Bloque 3: Auditoría Anti-Fuga de Proveedor (Marca Blanca)');

  // Comprobar que en manifest no exista la palabra 'dropi'
  const manifestString = JSON.stringify(m).toLowerCase();
  suite.assert(!manifestString.includes('dropi'), 'El manifest no menciona al proveedor logístico');

  // Comprobar archivos clave cliente
  const clientFilesToCheck = [
    'components/HomeClient.tsx',
    'components/Header.tsx',
    'components/ProductGrid.tsx',
    'app/login/page.tsx',
    'components/LoginModal.tsx',
    'app/seller/login/page.tsx',
  ];

  clientFilesToCheck.forEach((relPath) => {
    const fullPath = path.resolve(relPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      // Aislar texto visible en JSX removiendo bloques de lógica { ... } para ignorar variables como prod.id_dropi
      const textOnly = content.replace(/\{[\s\S]*?\}/g, '');
      const matches = textOnly.match(/>[^<]*dropi[^<]*</gi) || [];
      suite.assert(
        matches.length === 0,
        `Cero menciones visibles al proveedor en ${relPath} (matches: ${matches.length})`
      );
    }
  });

  return suite.summary();
}

if (process.argv[1]?.endsWith('pwa-manifest-and-branding.test.ts')) {
  const result = runPwaAndBrandingTests();
  if (result.failed > 0) process.exit(1);
}
