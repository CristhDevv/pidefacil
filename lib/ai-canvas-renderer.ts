import { formatCOP } from '@/config/pricing';

export interface AiCreativeAngleData {
  title: string;
  hookHeadline: string;
  subHeadline: string;
  sceneBrief?: string;
  sceneDataUrl?: string | null;
  sceneError?: string | null;
  angleNumber?: number;
  angleType?: string;
}

export interface RenderCanvasOptions {
  productName: string;
  imageUrl: string;
  selectedOffer: '1x' | '2x';
  singlePriceCop: number;
  duoPriceCop: number;
  duoSavingsCop: number;
  selectedVariation?: string;
  angle: AiCreativeAngleData;
  sceneDataUrl?: string | null;
}

// Carga y espera a que las fuentes de alto impacto publicitario estén listas
async function ensureFontsReady() {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load('900 46px "Montserrat"'),
      document.fonts.load('700 36px "Oswald"'),
    ]);
  } catch {}
}

// Helper para dibujar rectángulos redondeados con radio configurable
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Helper para ajustar texto largo a 1 o 2 líneas
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number = 2
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth) {
      if (lines.length + 1 >= maxLines) {
        currentLine = `${currentLine}...`;
        lines.push(currentLine);
        return lines;
      }
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  return lines;
}

// Cargar imagen de forma asíncrona mediante el proxy Anti-CORS (o directa si es data URL)
function loadProxiedImage(rawUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const finalSrc =
      rawUrl.startsWith('data:')
        ? rawUrl
        : rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
        ? `/api/proxy-image?url=${encodeURIComponent(rawUrl)}`
        : rawUrl;

    img.onload = () => resolve(img);
    img.onerror = () => {
      if (finalSrc !== rawUrl) {
        const fallbackImg = new Image();
        fallbackImg.crossOrigin = 'anonymous';
        fallbackImg.onload = () => resolve(fallbackImg);
        fallbackImg.onerror = () => reject(new Error('Fallo al cargar imagen'));
        fallbackImg.src = rawUrl;
      } else {
        reject(new Error('Fallo al cargar imagen'));
      }
    };
    img.src = finalSrc;
  });
}

/**
 * RENDERIZADOR CREATIVO PREMIUM (ESTÁNDAR GOOGLE FLOW / HIGH-CONVERTING COD AD)
 * - Fondo 100% full-bleed fotográfico (escena IA o desenfoque ambiental cinematográfico del producto)
 * - Titular con tipografía metálica dorada 3D de alto impacto ('Montserrat'/'Oswald')
 * - Pastilla brillante con beneficio / variante
 * - Tarjeta flotante de precios glassmorphic con acabado ámbar/oro
 * - Botón rojo de alta pulsación ('🛒 ¡PÍDELO AHORA! »') y badges de confianza COD
 */
export async function renderAiCreativeOnCanvas(options: RenderCanvasOptions): Promise<string> {
  await ensureFontsReady();

  const {
    productName,
    imageUrl,
    selectedOffer,
    singlePriceCop,
    duoPriceCop,
    duoSavingsCop,
    selectedVariation,
    angle,
    sceneDataUrl,
  } = options;

  const isDuo = selectedOffer === '2x';
  const width = 1080;
  const height = 1080;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo inicializar contexto 2D');
  }

  // 1. Cargar imagen de escena generada por IA si existe
  const targetSceneUrl = sceneDataUrl || angle.sceneDataUrl;
  let sceneImg: HTMLImageElement | null = null;
  if (targetSceneUrl) {
    try {
      sceneImg = await loadProxiedImage(targetSceneUrl);
    } catch {}
  }

  const hasAiScene = Boolean(sceneImg);

  // 2. Cargar imagen original del producto (para escena o fallback)
  let productImg: HTMLImageElement | null = null;
  try {
    productImg = await loadProxiedImage(imageUrl);
  } catch {}

  // =========================================================================
  // CAPA 1: FONDO FOTOGRÁFICO FULL-BLEED (100% DEL LIENZO)
  // =========================================================================
  if (hasAiScene && sceneImg) {
    // Si la IA generó una escena fotorrealista nueva, dibujarla a pantalla completa (cover)
    const sAspect = sceneImg.width / sceneImg.height;
    let sDrawW = width;
    let sDrawH = height;
    let sDrawX = 0;
    let sDrawY = 0;
    if (sAspect > 1) {
      sDrawW = height * sAspect;
      sDrawX = (width - sDrawW) / 2;
    } else {
      sDrawH = width / sAspect;
      sDrawY = (height - sDrawH) / 2;
    }
    ctx.drawImage(sceneImg, sDrawX, sDrawY, sDrawW, sDrawH);
  } else if (productImg) {
    // FALLBACK PROFESIONAL (ESTILO ESTUDIO CINEMATOGRÁFICO DE INTERIOR):
    // Cero cajas blancas feas. El producto se integra en un fondo ambiental cálido con profundidad
    ctx.save();
    // 1. Fondo difuminado ambiental que toma los colores reales de la escena
    try {
      ctx.filter = 'blur(35px) brightness(0.35) saturate(1.4)';
    } catch {}
    ctx.drawImage(productImg, -40, -40, width + 80, height + 80);
    ctx.restore();

    // 2. Viñeta ambiental oscura de lujo
    const radialGrad = ctx.createRadialGradient(
      width / 2,
      height / 2 - 40,
      120,
      width / 2,
      height / 2,
      680
    );
    radialGrad.addColorStop(0, 'rgba(15, 23, 42, 0.25)');
    radialGrad.addColorStop(0.7, 'rgba(10, 15, 26, 0.75)');
    radialGrad.addColorStop(1, 'rgba(5, 7, 15, 0.96)');
    ctx.fillStyle = radialGrad;
    ctx.fillRect(0, 0, width, height);

    // 3. Resplandor cálido de foco detrás del producto principal
    const spotGrad = ctx.createRadialGradient(
      width / 2,
      height / 2 - 30,
      40,
      width / 2,
      height / 2 - 30,
      380
    );
    spotGrad.addColorStop(0, 'rgba(245, 158, 11, 0.20)');
    spotGrad.addColorStop(0.6, 'rgba(234, 88, 12, 0.08)');
    spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = spotGrad;
    ctx.fillRect(0, 160, width, 600);

    // 4. Dibujar el producto físicamente grande, nítido y centrado en primer plano
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 20;

    const maxProdW = 760;
    const maxProdH = 500;
    const pAspect = productImg.width / productImg.height;

    let pDrawW = maxProdW;
    let pDrawH = maxProdH;
    if (pAspect > maxProdW / maxProdH) {
      pDrawH = maxProdW / pAspect;
    } else {
      pDrawW = maxProdH * pAspect;
    }

    const pDrawX = (width - pDrawW) / 2;
    const pDrawY = 220 + (maxProdH - pDrawH) / 2;

    ctx.drawImage(productImg, pDrawX, pDrawY, pDrawW, pDrawH);
    ctx.restore();
  } else {
    // Fondo fallback esmeralda ultra oscuro en caso de no haber ninguna foto
    const darkGrad = ctx.createLinearGradient(0, 0, 0, height);
    darkGrad.addColorStop(0, '#0F172A');
    darkGrad.addColorStop(1, '#020617');
    ctx.fillStyle = darkGrad;
    ctx.fillRect(0, 0, width, height);
  }

  // =========================================================================
  // CAPA 2: VIÑETAS DEGRADADAS DE PROTECCIÓN PARA TIPOGRAFÍA
  // =========================================================================
  // Degradado superior para legibilidad del título
  const topGrad = ctx.createLinearGradient(0, 0, 0, 360);
  topGrad.addColorStop(0, 'rgba(5, 7, 15, 0.92)');
  topGrad.addColorStop(0.6, 'rgba(5, 7, 15, 0.60)');
  topGrad.addColorStop(1, 'rgba(5, 7, 15, 0.0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, width, 360);

  // Degradado inferior para legibilidad de precios y botones
  const btmGrad = ctx.createLinearGradient(0, 640, 0, height);
  btmGrad.addColorStop(0, 'rgba(5, 7, 15, 0.0)');
  btmGrad.addColorStop(0.35, 'rgba(5, 7, 15, 0.72)');
  btmGrad.addColorStop(1, 'rgba(5, 7, 15, 0.98)');
  ctx.fillStyle = btmGrad;
  ctx.fillRect(0, 640, width, height - 640);

  // =========================================================================
  // CAPA 3: ENCABEZADO Y TITULAR METÁLICO DORADO 3D (ESTILO GOOGLE FLOW)
  // =========================================================================
  const headerX = 40;
  const headerW = width - headerX * 2;

  // Cintillo Superior Minimalista
  ctx.save();
  ctx.font = '900 16px "Montserrat", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.fillText('🇨🇴 PIDEFÁCIL.CO', headerX, 24);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#FDE68A';
  ctx.fillText('⚡ OFERTA CONTRA ENTREGA', headerX + headerW, 24);
  ctx.restore();

  // Titular Principal Dorado Metálico 3D
  ctx.save();
  ctx.font = '900 44px "Montserrat", "Oswald", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const rawTitle = (angle.hookHeadline || productName).toUpperCase();
  const titleLines = wrapText(ctx, rawTitle, headerW - 60, 2);
  const titleStartY = titleLines.length > 1 ? 82 : 94;

  titleLines.forEach((line, idx) => {
    const curY = titleStartY + idx * 48;

    // Gradiente metálico dorado idéntico a las mejores piezas de publicidad
    const goldGrad = ctx.createLinearGradient(0, curY - 24, 0, curY + 24);
    goldGrad.addColorStop(0.0, '#FFFBEB'); // Destello superior blanco marfil
    goldGrad.addColorStop(0.25, '#FEF08A'); // Amarillo dorado claro
    goldGrad.addColorStop(0.55, '#F59E0B'); // Oro cálido central
    goldGrad.addColorStop(0.85, '#D97706'); // Ámbar metálico
    goldGrad.addColorStop(1.0, '#92400E'); // Sombra bronce inferior

    // Sombra 3D profunda
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 6;

    // Delineado sutil para resaltar sobre cualquier tipo de fondo
    ctx.strokeStyle = 'rgba(69, 26, 3, 0.85)';
    ctx.lineWidth = 3.5;
    ctx.strokeText(line, width / 2, curY);

    ctx.fillStyle = goldGrad;
    ctx.fillText(line, width / 2, curY);
  });
  ctx.restore();

  // Pastilla Brillante de Subtítulo / Beneficio
  const pillY = titleStartY + titleLines.length * 48 + 4;
  const pillH = 42;
  const pillText = (selectedVariation && selectedVariation.trim() !== '')
    ? `✨ ${selectedVariation.toUpperCase()} • ${isDuo ? 'DÚO PACK (2 UNIDADES)' : '1 UNIDAD'}`
    : (isDuo ? '🔥 SÚPER PROMO DÚO PACK — LLEVAS 2' : `⭐ ${angle.subHeadline || angle.title}`.toUpperCase());

  ctx.save();
  ctx.font = '900 18px "Montserrat", system-ui, sans-serif';
  const textWidth = ctx.measureText(pillText).width;
  const pillW = Math.min(headerW, Math.max(340, textWidth + 48));
  const pillX = (width - pillW) / 2;

  // Fondo degradado rojo carmesí / frambuesa con borde brillante
  ctx.shadowColor = 'rgba(225, 29, 72, 0.45)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 3;

  const pillGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY);
  pillGrad.addColorStop(0, '#E11D48');
  pillGrad.addColorStop(0.5, '#F43F5E');
  pillGrad.addColorStop(1, '#E11D48');
  ctx.fillStyle = pillGrad;
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 21);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, width / 2, pillY + pillH / 2);
  ctx.restore();

  // =========================================================================
  // CAPA 4: TARJETA FLOTANTE DE PRECIO GLASSMORPHIC (LOWER THIRD)
  // =========================================================================
  const priceY = 755;
  const priceH = 150;

  ctx.save();
  // Sombra profunda que separa la tarjeta de la foto
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;

  // Fondo de cristal oscuro traslúcido
  drawRoundedRect(ctx, headerX, priceY, headerW, priceH, 26);
  ctx.fillStyle = 'rgba(12, 16, 26, 0.88)';
  ctx.fill();

  ctx.shadowColor = 'transparent';
  // Borde fino color ámbar dorado
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.75)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Línea de brillo interna superior del cristal
  ctx.beginPath();
  ctx.moveTo(headerX + 26, priceY + 1.5);
  ctx.lineTo(headerX + headerW - 26, priceY + 1.5);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Columna 1: 1 Unidad
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '800 15px "Montserrat", sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('1 UNIDAD:', headerX + 34, priceY + 36);

  ctx.font = '900 36px "Montserrat", "Oswald", sans-serif';
  ctx.fillStyle = !isDuo ? '#FBBF24' : '#FFFFFF';
  ctx.fillText(formatCOP(singlePriceCop), headerX + 34, priceY + 76);

  ctx.font = '700 13px "Montserrat", sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.fillText('Envío Gratis incluido', headerX + 34, priceY + 112);
  ctx.restore();

  // Línea divisoria vertical 1
  ctx.save();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(headerX + 310, priceY + 20);
  ctx.lineTo(headerX + 310, priceY + priceH - 20);
  ctx.stroke();
  ctx.restore();

  // Columna 2: DÚO PACK (Destacada con brillo ámbar / dorado)
  const duoBoxX = headerX + 330;
  const duoBoxW = 410;

  if (isDuo) {
    ctx.save();
    drawRoundedRect(ctx, duoBoxX - 12, priceY + 12, duoBoxW, priceH - 24, 18);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.14)';
    ctx.fill();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '900 18px "Montserrat", sans-serif';
  ctx.fillStyle = '#FDE047';
  ctx.fillText('🔥 2x DÚO PACK (LLEVAS 2):', duoBoxX, priceY + 36);

  ctx.font = '900 46px "Montserrat", "Oswald", sans-serif';
  ctx.fillStyle = '#FBBF24'; // Dorado brillante idéntico a Image 2
  ctx.fillText(formatCOP(duoPriceCop), duoBoxX, priceY + 76);

  ctx.font = '800 13px "Montserrat", sans-serif';
  ctx.fillStyle = '#4ADE80';
  ctx.fillText(
    duoSavingsCop > 0 ? `💥 ¡AHORRAS ${formatCOP(duoSavingsCop)} HOY!` : '⭐ Mayor ahorro por unidad',
    duoBoxX,
    priceY + 112
  );
  ctx.restore();

  // Línea divisoria vertical 2
  ctx.save();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(headerX + 760, priceY + 20);
  ctx.lineTo(headerX + 760, priceY + priceH - 20);
  ctx.stroke();
  ctx.restore();

  // Columna 3: Urgencia / Stock
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 20px "Montserrat", sans-serif';
  ctx.fillStyle = '#EF4444';
  ctx.fillText('⚡ ¡ÚLTIMAS', headerX + 875, priceY + 54);
  ctx.fillStyle = '#FCA5A5';
  ctx.fillText('UNIDADES!', headerX + 875, priceY + 84);
  ctx.restore();

  // Sello Circular Flotante 'ALTA CALIDAD ★★★★★' (idéntico al de Image 2)
  ctx.save();
  const sealR = 54;
  const sealX = headerX + headerW - 4;
  const sealY = priceY;

  // Sello Dorado Circular
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(sealX, sealY, sealR, 0, Math.PI * 2);
  const sealGrad = ctx.createRadialGradient(sealX, sealY, 10, sealX, sealY, sealR);
  sealGrad.addColorStop(0, '#FEF08A');
  sealGrad.addColorStop(0.6, '#F59E0B');
  sealGrad.addColorStop(1, '#B45309');
  ctx.fillStyle = sealGrad;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(sealX, sealY, sealR - 6, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(69, 26, 3, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = '900 13px "Montserrat", sans-serif';
  ctx.fillStyle = '#451A03';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ALTA', sealX, sealY - 14);
  ctx.fillText('CALIDAD', sealX, sealY);
  ctx.font = '900 11px "Montserrat", sans-serif';
  ctx.fillText('★★★★★', sealX, sealY + 16);
  ctx.restore();

  // =========================================================================
  // CAPA 5: BARRA INFERIOR DE ACCIÓN (DISPARADORES COD + BOTÓN ROJO HERO)
  // =========================================================================
  const footerY = priceY + priceH + 18;
  const footerH = 92;
  const colGap = 16;
  const colW = (headerW - colGap * 2) / 3;

  // Trigger 1: 💵 PAGO EN CASA
  const t1X = headerX;
  ctx.save();
  drawRoundedRect(ctx, t1X, footerY, colW, footerH, 22);
  ctx.fillStyle = 'rgba(12, 16, 26, 0.88)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.20)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 19px "Montserrat", sans-serif';
  ctx.fillStyle = '#FEF08A';
  ctx.fillText('💵 PAGO EN CASA', t1X + colW / 2, footerY + 34);
  ctx.font = '700 13px "Montserrat", sans-serif';
  ctx.fillStyle = '#CBD5E1';
  ctx.fillText('Pagas en efectivo al recibir', t1X + colW / 2, footerY + 62);
  ctx.restore();

  // Trigger 2: 🚚 ENVÍO GRATIS
  const t2X = t1X + colW + colGap;
  ctx.save();
  drawRoundedRect(ctx, t2X, footerY, colW, footerH, 22);
  ctx.fillStyle = 'rgba(12, 16, 26, 0.88)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.20)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 19px "Montserrat", sans-serif';
  ctx.fillStyle = '#A7F3D0';
  ctx.fillText('🚚 ENVÍO GRATIS', t2X + colW / 2, footerY + 34);
  ctx.font = '700 13px "Montserrat", sans-serif';
  ctx.fillStyle = '#CBD5E1';
  ctx.fillText('Cobertura en toda Colombia', t2X + colW / 2, footerY + 62);
  ctx.restore();

  // Trigger 3: HERO CTA BUTTON ROJO DE ALTA PULSACIÓN (Idéntico a Image 2)
  const t3X = t2X + colW + colGap;
  ctx.save();
  // Resplandor rojo radiante de conversión
  ctx.shadowColor = 'rgba(220, 38, 38, 0.70)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 6;

  const btnGrad = ctx.createLinearGradient(t3X, footerY, t3X, footerY + footerH);
  btnGrad.addColorStop(0, '#EF4444');
  btnGrad.addColorStop(0.5, '#DC2626');
  btnGrad.addColorStop(1, '#991B1B');
  ctx.fillStyle = btnGrad;
  drawRoundedRect(ctx, t3X, footerY, colW, footerH, 22);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Brillo superior del botón
  ctx.beginPath();
  ctx.moveTo(t3X + 22, footerY + 2);
  ctx.lineTo(t3X + colW - 22, footerY + 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 22px "Montserrat", "Oswald", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('🛒 ¡PÍDELO HOY!', t3X + colW / 2, footerY + 34);

  ctx.font = '800 14px "Montserrat", sans-serif';
  ctx.fillStyle = '#FECDD3';
  ctx.fillText('POR MENSAJE »', t3X + colW / 2, footerY + 62);
  ctx.restore();

  return canvas.toDataURL('image/png', 1.0);
}
