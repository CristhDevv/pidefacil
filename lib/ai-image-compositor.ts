import sharp from 'sharp';
import { AngleFormulation } from './ai-creative-skill';
import { formatCOP } from '@/config/pricing';

export interface CompositeCreativeOptions {
  productName: string;
  selectedOffer: '1x' | '2x';
  singlePriceCop: number;
  duoPriceCop: number;
  duoSavingsCop: number;
  selectedVariation?: string;
  angle: AngleFormulation;
}

// Escapa caracteres especiales para SVG seguro
function escapeXml(unsafe: string): string {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Superpone el marco tipográfico de alta precisión (Regla de 3 Tercios para Meta Ads Colombia)
 * sobre la escena fotorrealista generada por IA.
 */
export async function compositeAiCreativeImage(
  baseImageBuffer: Buffer,
  options: CompositeCreativeOptions
): Promise<Buffer> {
  const {
    productName,
    selectedOffer,
    singlePriceCop,
    duoPriceCop,
    duoSavingsCop,
    selectedVariation,
    angle,
  } = options;

  const isDuo = selectedOffer === '2x';
  const width = 1080;
  const height = 1080;

  // Ajustar imagen base al tamaño de la zona central hero (880x560 con márgenes)
  const heroWidth = 980;
  const heroHeight = 560;
  const heroX = (width - heroWidth) / 2;
  const heroY = 230;

  // Redimensionar la imagen de producto/escena IA con ajuste contain/cover sobre fondo blanco
  const resizedHero = await sharp(baseImageBuffer)
    .resize(heroWidth, heroHeight, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toBuffer();

  const hookText = escapeXml(angle.hookHeadline.toUpperCase());
  const subHeadlineText = escapeXml(angle.subHeadline);
  const singlePriceStr = formatCOP(singlePriceCop);
  const duoPriceStr = formatCOP(duoPriceCop);
  const duoSavingsStr = formatCOP(duoSavingsCop);
  const variantText = selectedVariation ? escapeXml(selectedVariation) : '';

  // SVG Overlay con diseño gráfico de respuesta directa de alto impacto
  const svgOverlay = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Gradientes -->
      <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#022C22" />
        <stop offset="25%" stop-color="#064E3B" />
        <stop offset="75%" stop-color="#0F172A" />
        <stop offset="100%" stop-color="#020617" />
      </linearGradient>

      <linearGradient id="goldPillGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#DC2626" />
        <stop offset="50%" stop-color="#F59E0B" />
        <stop offset="100%" stop-color="#DC2626" />
      </linearGradient>

      <linearGradient id="priceBoxGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#064E3B" />
        <stop offset="50%" stop-color="#042F2E" />
        <stop offset="100%" stop-color="#0F172A" />
      </linearGradient>

      <linearGradient id="ctaBtnGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#22C55E" />
        <stop offset="100%" stop-color="#15803D" />
      </linearGradient>

      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="6" stdDeviation="8" flood-opacity="0.5"/>
      </filter>
    </defs>

    <!-- Marco de fondo general -->
    <rect width="${width}" height="${height}" fill="url(#bgGrad)" />

    <!-- Tarjeta Blanca Central Hero para el Producto -->
    <rect x="${heroX - 6}" y="${heroY - 6}" width="${heroWidth + 12}" height="${heroHeight + 12}" rx="32" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="4" filter="url(#shadow)" />

    <!-- ========================================== -->
    <!-- TERCIO SUPERIOR (EL GANCHO EN 1 SEGUNDO)   -->
    <!-- ========================================== -->
    <!-- Mini Cintillo Superior -->
    <rect x="50" y="24" width="${width - 100}" height="42" rx="21" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" />
    <text x="75" y="51" fill="#A7F3D0" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="900" text-anchor="start">🇨🇴 PIDEFÁCIL.CO</text>
    <text x="${width - 75}" y="51" fill="#FDE68A" font-family="system-ui, -apple-system, sans-serif" font-size="19" font-weight="bold" text-anchor="end">🚚 ENVÍO GRATIS + PAGO EN CASA</text>

    <!-- Titular de Impacto Ganador (Hook Headline) -->
    <text x="${width / 2}" y="125" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="900" text-anchor="middle" filter="url(#shadow)">
      ${hookText}
    </text>

    <!-- Pastilla Central Llamativa (Subtítulo de Ángulo) -->
    <g transform="translate(${width / 2 - 320}, 150)">
      <rect width="640" height="52" rx="26" fill="url(#goldPillGrad)" stroke="#FFFFFF" stroke-width="2.5" filter="url(#shadow)" />
      <text x="320" y="34" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="900" text-anchor="middle">
        ${isDuo ? '🔥 SÚPER PROMO DÚO PACK — LLEVAS 2' : '⭐ ' + subHeadlineText}
      </text>
    </g>

    <!-- ========================================== -->
    <!-- SELLOS FLOTANTES EN ZONA CENTRAL           -->
    <!-- ========================================== -->
    <!-- Sello Superior Derecho: ALTA CALIDAD ★★★★★ -->
    <g transform="translate(${heroX + heroWidth - 270}, ${heroY + 20})">
      <rect width="250" height="46" rx="23" fill="#0F172A" stroke="#F59E0B" stroke-width="2" />
      <text x="125" y="29" fill="#FBBF24" font-family="system-ui, -apple-system, sans-serif" font-size="17" font-weight="bold" text-anchor="middle">
        ALTA CALIDAD ★★★★★
      </text>
    </g>

    <!-- Sello Superior Izquierdo: Ahorro Si es Dúo Pack -->
    ${
      isDuo && duoSavingsCop > 0
        ? `
    <g transform="translate(${heroX + 20}, ${heroY + 20})">
      <rect width="280" height="46" rx="23" fill="#16A34A" stroke="#FFFFFF" stroke-width="2" />
      <text x="140" y="29" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="900" text-anchor="middle">
        💥 ¡AHORRAS ${duoSavingsStr}!
      </text>
    </g>
    `
        : ''
    }

    <!-- Píldora de Variante (si aplica) -->
    ${
      variantText
        ? `
    <g transform="translate(${width / 2 - 200}, ${heroY + heroHeight - 54})">
      <rect width="400" height="40" rx="20" fill="rgba(15,23,42,0.92)" stroke="#38BDF8" stroke-width="1.5" />
      <text x="200" y="26" fill="#E0F2FE" font-family="system-ui, -apple-system, sans-serif" font-size="17" font-weight="bold" text-anchor="middle">
        ✨ Opción: ${variantText}
      </text>
    </g>
    `
        : ''
    }

    <!-- ========================================== -->
    <!-- TERCIO INFERIOR: BLOQUE COMERCIAL DE PRECIOS-->
    <!-- ========================================== -->
    <g transform="translate(${heroX}, 810)">
      <rect width="${heroWidth}" height="142" rx="28" fill="url(#priceBoxGrad)" stroke="#10B981" stroke-width="3" filter="url(#shadow)" />

      <!-- Columna 1: Opción 1 Unidad -->
      <g transform="translate(40, 28)">
        <text x="0" y="20" fill="#94A3B8" font-family="system-ui, -apple-system, sans-serif" font-size="19" font-weight="bold">1 Unidad:</text>
        <text x="0" y="60" fill="${!isDuo ? '#22C55E' : '#E2E8F0'}" font-family="system-ui, -apple-system, sans-serif" font-size="${!isDuo ? '44' : '34'}" font-weight="900">
          ${singlePriceStr}
        </text>
        <text x="0" y="90" fill="#64748B" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="bold">Envío Gratis</text>
      </g>

      <!-- Divisor Vertical -->
      <line x1="330" y1="20" x2="330" y2="122" stroke="rgba(255,255,255,0.15)" stroke-width="2" />

      <!-- Columna 2 (Destacada): Dúo Pack (2 Unidades) -->
      <g transform="translate(370, 24)">
        <rect x="-15" y="-6" width="360" height="106" rx="20" fill="${isDuo ? 'rgba(34,197,94,0.18)' : 'transparent'}" stroke="${isDuo ? '#22C55E' : 'transparent'}" stroke-width="2" />
        <text x="0" y="22" fill="#FDE68A" font-family="system-ui, -apple-system, sans-serif" font-size="19" font-weight="900">🔥 DÚO PACK (LLEVAS 2):</text>
        <text x="0" y="66" fill="#22C55E" font-family="system-ui, -apple-system, sans-serif" font-size="48" font-weight="900">
          ${duoPriceStr}
        </text>
        <text x="0" y="94" fill="#86EFAC" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="bold">⭐ Mejor Precio por Unidad</text>
      </g>

      <!-- Divisor Vertical -->
      <line x1="750" y1="20" x2="750" y2="122" stroke="rgba(255,255,255,0.15)" stroke-width="2" />

      <!-- Columna 3: Urgencia y Garantía -->
      <g transform="translate(775, 45)">
        <text x="90" y="20" fill="#EF4444" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="900" text-anchor="middle">⚡ ¡ÚLTIMAS</text>
        <text x="90" y="46" fill="#FCA5A5" font-family="system-ui, -apple-system, sans-serif" font-size="19" font-weight="900" text-anchor="middle">UNIDADES!</text>
      </g>
    </g>

    <!-- ========================================== -->
    <!-- CINTILLO BASE CON LOS 3 DISPARADORES COD   -->
    <!-- ========================================== -->
    <!-- Trigger 1: PAGO EN CASA -->
    <g transform="translate(${heroX}, 972)">
      <rect width="300" height="88" rx="20" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" stroke-width="1.5" />
      <text x="150" y="38" fill="#FEF08A" font-family="system-ui, -apple-system, sans-serif" font-size="21" font-weight="900" text-anchor="middle">💵 PAGO EN CASA</text>
      <text x="150" y="66" fill="#E2E8F0" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="bold" text-anchor="middle">Pagas al recibir</text>
    </g>

    <!-- Trigger 2: ENVÍO GRATIS -->
    <g transform="translate(${heroX + 340}, 972)">
      <rect width="300" height="88" rx="20" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" stroke-width="1.5" />
      <text x="150" y="38" fill="#A7F3D0" font-family="system-ui, -apple-system, sans-serif" font-size="21" font-weight="900" text-anchor="middle">🚚 ENVÍO GRATIS</text>
      <text x="150" y="66" fill="#E2E8F0" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="bold" text-anchor="middle">Toda Colombia</text>
    </g>

    <!-- Trigger 3: CTA BOTÓN TÁCTIL (PÍDELO AHORA) -->
    <g transform="translate(${heroX + 680}, 972)">
      <rect width="300" height="88" rx="20" fill="url(#ctaBtnGrad)" stroke="#86EFAC" stroke-width="2.5" filter="url(#shadow)" />
      <text x="150" y="38" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="21" font-weight="900" text-anchor="middle">🛒 ¡PÍDELO HOY!</text>
      <text x="150" y="66" fill="#DCFCE7" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="900" text-anchor="middle">POR MENSAJE »</text>
    </g>
  </svg>
  `;

  // Componer: Fondo + Imagen Hero Central + SVG Overlay
  const finalImage = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 2, g: 44, b: 34, alpha: 1 },
    },
  })
    .composite([
      { input: resizedHero, top: heroY, left: heroX },
      { input: Buffer.from(svgOverlay), top: 0, left: 0 },
    ])
    .png({ quality: 95 })
    .toBuffer();

  return finalImage;
}
