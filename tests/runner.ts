/**
 * ==============================================================================
 * MASTER TEST RUNNER: PIDEFÁCIL E-COMMERCE SUITE GLOBAL
 * ==============================================================================
 * Ejecuta de manera consolidada todas las pruebas unitarias que cubren:
 * 1. Motor de Precios y Redondeo a 9.900 (config/pricing.ts)
 * 2. Variaciones y Precios Dinámicos (lib/variations.ts)
 * 3. Seguridad, Hashing y Roles (lib/auth.ts, lib/seller-auth.ts)
 * 4. Validación de Pedidos COD y Anti-Adulteración (app/api/orders)
 * 5. Geografía Nacional DANE y Fletes (lib/colombia-geo.ts, lib/dropi-geography.ts, lib/dropi-quote.ts)
 * 6. Proxy de Imágenes y Decisión OCR (lib/image-url.ts, lib/ocr-detector.ts)
 * 7. Packs Múltiples y Copies Comerciales (lib/pack-detector.ts, lib/social-copy-generator.ts)
 * 8. PWA Manifest, Recursos e Integridad Marca Blanca (app/manifest.ts, public/)
 */

import { runPricingTests } from './pricing.test';
import { runVariationsTests } from './variations.test';
import { runAuthTests } from './auth.test';
import { runOrderValidationTests } from './order-validation.test';
import { runGeographyAndShippingTests } from './geography-and-shipping.test';
import { runImageAndOcrTests } from './image-and-ocr.test';
import { runPackDetectorAndCopyTests } from './pack-detector-and-copy.test';
import { runPwaAndBrandingTests } from './pwa-manifest-and-branding.test';
import { TestStats } from './test-utils';

async function runAllSuites() {
  const startTime = Date.now();

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║       🚀 EJECUTANDO SUITE COMPLETA DE PRUEBAS UNITARIAS         ║');
  console.log('║              PIDEFÁCIL.CO — ARQUITECTURA GLOBAL                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const summaries: TestStats[] = [];

  try {
    summaries.push(runPricingTests());
    summaries.push(runVariationsTests());
    summaries.push(runAuthTests());
    summaries.push(runOrderValidationTests());
    summaries.push(runGeographyAndShippingTests());
    summaries.push(runImageAndOcrTests());
    summaries.push(runPackDetectorAndCopyTests());
    summaries.push(runPwaAndBrandingTests());
  } catch (err) {
    console.error('💥 Error inesperado durante la ejecución de los suites:', err);
    process.exit(1);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;

  console.log('\n\n╔═════════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                         📊 INFORME EJECUTIVO DE RESULTADOS                             ║');
  console.log('╠═════════════════════════════════════════════════════════════════════════════════════════╣');
  console.log('║ Módulo / Suite                                   │ Total │ Pasadas │ Falladas │ Estado ║');
  console.log('╟──────────────────────────────────────────────────┼───────┼─────────┼──────────┼────────╢');

  summaries.forEach((s) => {
    totalTests += s.total;
    totalPassed += s.passed;
    totalFailed += s.failed;

    const shortName = s.suiteName.padEnd(48).slice(0, 48);
    const totStr = String(s.total).padStart(5);
    const passStr = String(s.passed).padStart(7);
    const failStr = String(s.failed).padStart(8);
    const status = s.failed === 0 ? '  ✅ OK ' : '  ❌ FAIL';

    console.log(`║ ${shortName} │ ${totStr} │ ${passStr} │ ${failStr} │${status} ║`);
  });

  console.log('╠═════════════════════════════════════════════════════════════════════════════════════════╣');
  const summaryLine = `TOTAL GENERAL: ${totalPassed}/${totalTests} pruebas superadas en ${durationSec}s`.padEnd(87);
  console.log(`║ ${summaryLine} ║`);
  console.log('╚═════════════════════════════════════════════════════════════════════════════════════════╝\n');

  if (totalFailed > 0) {
    console.error(`🚨 Fallaron ${totalFailed} pruebas unitarias. Por favor revisa los módulos señalados arriba.`);
    process.exit(1);
  } else {
    console.log(`🎉 ¡ÉXITO TOTAL! Todas las ${totalPassed} pruebas unitarias de la aplicación pasaron al 100%.\n`);
    process.exit(0);
  }
}

runAllSuites();
