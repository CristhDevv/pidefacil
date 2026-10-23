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
  if (typeof document === 'undefined') return;
  try {
    if (!document.getElementById('pidefacil-creative-fonts')) {
      const link = document.createElement('link');
      link.id = 'pidefacil-creative-fonts';
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,700;0,800;0,900;1,900&family=Oswald:wght@600;700&display=swap';
      document.head.appendChild(link);
    }
    if (document.fonts) {
      await document.fonts.ready;
      await Promise.all([
        document.fonts.load('900 48px "Montserrat"').catch(() => {}),
        document.fonts.load('800 24px "Montserrat"').catch(() => {}),
        document.fonts.load('700 36px "Oswald"').catch(() => {}),
      ]);
    }
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

// Helper para dibujar la medalla dorada dentada (saw-tooth starburst seal de alta calidad)
function drawSealStarburst(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerR: number,
  innerR: number
) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerR;
    y = cy + Math.sin(rot) * outerR;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerR;
    y = cy + Math.sin(rot) * innerR;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerR);
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

// Cargar imagen mediante el proxy Anti-CORS (o directa si es data URL)
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
 * RENDERIZADOR CREATIVO PUBLICITARIO SENIOR (DIRECTIVA DE ARTE Y CONVERSIÓN GOOGLE FLOW)
 * 1. Fondo 100% full-bleed fotográfico inmersivo (recreación fotorrealista o desenfoque bokeh ambiental)
 * 2. Titular superior impactante con tipografía limpia, destacada y dorada metálica 3D ('Montserrat' 900 / 'Oswald' 700)
 * 3. NUNCA bloques negros ni recuadros planos que tapen la imagen
 * 4. Bloque de valor/precio flotante con contraste sutil + Medalla de Alta Calidad ★★★★★
 * 5. Barra inferior con botones redondeados de alta pulsación ('PAGO EN CASA', 'ENVÍO GRATIS', '🛒 ¡PÍDELO HOY!')
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
  // PASO 1: REGENERACIÓN DE LA ESCENA (FONDO Y CONTEXTO 100% FULL-BLEED)
  // =========================================================================
  if (hasAiScene && sceneImg) {
    // Escena fotorrealista generada por IA que cubre todo el lienzo de borde a borde
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
    // RECREACIÓN DE ENTORNO FOTOGRÁFICO PROFESIONAL:
    // Cero recuadros planos. Fondo de ambiente lifestyle inmersivo con bokeh y viñeta
    ctx.save();
    try {
      ctx.filter = 'blur(28px) brightness(0.42) saturate(1.4)';
    } catch {}
    ctx.drawImage(productImg, -40, -40, width + 80, height + 80);
    ctx.restore();

    // Viñeta ambiental cinematográfica sutil (deja ver el ambiente con calidez)
    const radialGrad = ctx.createRadialGradient(
      width / 2,
      height / 2 - 20,
      140,
      width / 2,
      height / 2,
      720
    );
    radialGrad.addColorStop(0, 'rgba(15, 23, 42, 0.12)');
    radialGrad.addColorStop(0.7, 'rgba(10, 15, 26, 0.55)');
    radialGrad.addColorStop(1, 'rgba(5, 7, 15, 0.90)');
    ctx.fillStyle = radialGrad;
    ctx.fillRect(0, 0, width, height);

    // Resplandor cálido de luz de estudio proyectada detrás del producto
    const spotGrad = ctx.createRadialGradient(
      width / 2,
      height / 2 - 20,
      50,
      width / 2,
      height / 2 - 20,
      420
    );
    spotGrad.addColorStop(0, 'rgba(245, 158, 11, 0.22)');
    spotGrad.addColorStop(0.6, 'rgba(234, 88, 12, 0.08)');
    spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = spotGrad;
    ctx.fillRect(0, 140, width, 680);

    // Producto principal destacado en primer plano con sombra natural proyectada
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 36;
    ctx.shadowOffsetY = 18;

    const maxProdW = 820;
    const maxProdH = 560;
    const pAspect = productImg.width / productImg.height;

    let pDrawW = maxProdW;
    let pDrawH = maxProdH;
    if (pAspect > maxProdW / maxProdH) {
      pDrawH = maxProdW / pAspect;
    } else {
      pDrawW = maxProdH * pAspect;
    }

    const pDrawX = (width - pDrawW) / 2;
    const pDrawY = 190 + (maxProdH - pDrawH) / 2;

    ctx.drawImage(productImg, pDrawX, pDrawY, pDrawW, pDrawH);
    ctx.restore();
  } else {
    const darkGrad = ctx.createLinearGradient(0, 0, 0, height);
    darkGrad.addColorStop(0, '#0F172A');
    darkGrad.addColorStop(1, '#020617');
    ctx.fillStyle = darkGrad;
    ctx.fillRect(0, 0, width, height);
  }

  // =========================================================================
  // PASO 2: VIÑETAS SUAVES DE GRADIENTE (SOLO PARA CONTRASTE TIPOGRÁFICO)
  // =========================================================================
  // Degradado suave superior
  const topGrad = ctx.createLinearGradient(0, 0, 0, 300);
  topGrad.addColorStop(0, 'rgba(5, 7, 15, 0.88)');
  topGrad.addColorStop(0.6, 'rgba(5, 7, 15, 0.40)');
  topGrad.addColorStop(1, 'rgba(5, 7, 15, 0.0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, width, 300);

  // Degradado suave inferior (permite que el producto y la escena se vean limpios)
  const btmGrad = ctx.createLinearGradient(0, 720, 0, height);
  btmGrad.addColorStop(0, 'rgba(5, 7, 15, 0.0)');
  btmGrad.addColorStop(0.5, 'rgba(5, 7, 15, 0.60)');
  btmGrad.addColorStop(1, 'rgba(5, 7, 15, 0.94)');
  ctx.fillStyle = btmGrad;
  ctx.fillRect(0, 720, width, height - 720);

  // =========================================================================
  // PASO 3: TITULAR SUPERIOR IMPACTANTE CON TIPOGRAFÍA METÁLICA DORADA
  // =========================================================================
  const headerX = 44;
  const headerW = width - headerX * 2;

  // Mini insignia superior sutil
  ctx.save();
  ctx.font = '900 14px "Montserrat", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillText('🇨🇴 PIDEFÁCIL.CO', headerX, 24);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#FDE68A';
  ctx.fillText('⚡ PAGA EN CASA AL RECIBIR', headerX + headerW, 24);
  ctx.restore();

  // Titular de Impacto (Tipografía 3D Dorada Metálica)
  ctx.save();
  ctx.font = '900 46px "Montserrat", "Oswald", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const rawTitle = (angle.hookHeadline || productName).toUpperCase();
  const titleLines = wrapText(ctx, rawTitle, headerW - 40, 2);
  const titleStartY = titleLines.length > 1 ? 84 : 96;

  titleLines.forEach((line, idx) => {
    const curY = titleStartY + idx * 50;

    // Gradiente metálico dorado 3D (estilo Google Flow)
    const goldGrad = ctx.createLinearGradient(0, curY - 25, 0, curY + 25);
    goldGrad.addColorStop(0.0, '#FFFBEB');
    goldGrad.addColorStop(0.25, '#FEF08A');
    goldGrad.addColorStop(0.55, '#F59E0B');
    goldGrad.addColorStop(0.85, '#D97706');
    goldGrad.addColorStop(1.0, '#92400E');

    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 6;

    ctx.strokeStyle = 'rgba(69, 26, 3, 0.85)';
    ctx.lineWidth = 3.5;
    ctx.strokeText(line, width / 2, curY);

    ctx.fillStyle = goldGrad;
    ctx.fillText(line, width / 2, curY);
  });
  ctx.restore();

  // Insignia / Pastilla redondeada de beneficio o variante
  const pillY = titleStartY + titleLines.length * 50 + 6;
  const pillH = 38;
  const pillText = (selectedVariation && selectedVariation.trim() !== '')
    ? `✨ ${selectedVariation.toUpperCase()} • ${isDuo ? 'DÚO PACK (2 UNIDADES)' : '1 UNIDAD'}`
    : (isDuo ? '🔥 SÚPER PROMO DÚO PACK — LLEVAS 2' : `⭐ ${angle.subHeadline || angle.title}`.toUpperCase());

  ctx.save();
  ctx.font = '900 16px "Montserrat", sans-serif';
  const textWidth = ctx.measureText(pillText).width;
  const pillW = Math.min(headerW, Math.max(300, textWidth + 40));
  const pillX = (width - pillW) / 2;

  ctx.shadowColor = 'rgba(225, 29, 72, 0.50)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 3;

  const pillGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY);
  pillGrad.addColorStop(0, '#E11D48');
  pillGrad.addColorStop(0.5, '#F43F5E');
  pillGrad.addColorStop(1, '#E11D48');
  ctx.fillStyle = pillGrad;
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 19);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, width / 2, pillY + pillH / 2);
  ctx.restore();

  // =========================================================================
  // PASO 4: ELEMENTO DE OFERTA / PRECIO SUTIL + MEDALLA DE CALIDAD
  // (Fórmula exacta Google Flow: Caja de precios a la izquierda, Medalla a la derecha)
  // =========================================================================
  const priceBarY = 828;
  const priceBarH = 92;
  const sealDiameter = 120;
  const priceBarW = headerW - sealDiameter - 20; // Deja espacio para la medalla a la derecha

  // 1. CAJA DE PRECIOS TRANSLÚCIDA CON BORDE DORADO
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;

  // Fondo cristal oscuro traslúcido
  drawRoundedRect(ctx, headerX, priceBarY, priceBarW, priceBarH, 20);
  ctx.fillStyle = 'rgba(10, 14, 23, 0.86)';
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.75)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Segmento 1: 1x Unidad
  const col1W = priceBarW * 0.32;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 15px "Montserrat", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('1 x', headerX + col1W / 2, priceBarY + 28);
  ctx.font = '900 30px "Montserrat", "Oswald", sans-serif';
  ctx.fillStyle = !isDuo ? '#FDE047' : '#FFFFFF';
  ctx.fillText(formatCOP(singlePriceCop), headerX + col1W / 2, priceBarY + 62);
  ctx.restore();

  // Divisor 1
  ctx.save();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.30)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(headerX + col1W, priceBarY + 14);
  ctx.lineTo(headerX + col1W, priceBarY + priceBarH - 14);
  ctx.stroke();
  ctx.restore();

  // Segmento 2: 2x Dúo Pack (Destacado)
  const col2X = headerX + col1W;
  const col2W = priceBarW * 0.38;

  if (isDuo) {
    ctx.save();
    drawRoundedRect(ctx, col2X + 6, priceBarY + 8, col2W - 12, priceBarH - 16, 14);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.16)';
    ctx.fill();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 15px "Montserrat", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('2 x', col2X + col2W / 2, priceBarY + 28);
  ctx.font = '900 32px "Montserrat", "Oswald", sans-serif';
  ctx.fillStyle = '#FDE047';
  ctx.fillText(formatCOP(duoPriceCop), col2X + col2W / 2, priceBarY + 62);
  ctx.restore();

  // Divisor 2
  ctx.save();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.30)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(col2X + col2W, priceBarY + 14);
  ctx.lineTo(col2X + col2W, priceBarY + priceBarH - 14);
  ctx.stroke();
  ctx.restore();

  // Segmento 3: ¡ÚLTIMAS UNIDADES!
  const col3X = col2X + col2W;
  const col3W = priceBarW - (col1W + col2W);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 17px "Montserrat", sans-serif';
  ctx.fillStyle = '#EF4444';
  ctx.fillText('¡ÚLTIMAS', col3X + col3W / 2, priceBarY + 30);
  ctx.fillText('UNIDADES!', col3X + col3W / 2, priceBarY + 60);
  ctx.restore();

  // 2. MEDALLA DENTADA DE ALTA CALIDAD ★★★★★ (Saw-tooth gold medal)
  const sealCX = headerX + headerW - sealDiameter / 2;
  const sealCY = priceBarY + priceBarH / 2;
  const outerR = 56;
  const innerR = 49;

  ctx.save();
  ctx.shadowColor = 'rgba(245, 158, 11, 0.45)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 4;

  const sealGrad = ctx.createLinearGradient(
    sealCX - outerR,
    sealCY - outerR,
    sealCX + outerR,
    sealCY + outerR
  );
  sealGrad.addColorStop(0, '#FEF08A');
  sealGrad.addColorStop(0.5, '#F59E0B');
  sealGrad.addColorStop(1, '#D97706');
  ctx.fillStyle = sealGrad;
  drawSealStarburst(ctx, sealCX, sealCY, 24, outerR, innerR);
  ctx.fill();

  // Círculo interior oscuro
  ctx.beginPath();
  ctx.arc(sealCX, sealCY, 42, 0, Math.PI * 2);
  ctx.fillStyle = '#0F172A';
  ctx.fill();
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.8)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Texto dentro de la medalla
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 13px "Montserrat", sans-serif';
  ctx.fillStyle = '#FEF08A';
  ctx.fillText('ALTA', sealCX, sealCY - 16);
  ctx.fillText('CALIDAD', sealCX, sealCY);
  ctx.font = '900 12px "Montserrat", sans-serif';
  ctx.fillStyle = '#F59E0B';
  ctx.fillText('★★★★★', sealCX, sealCY + 16);
  ctx.restore();

  // =========================================================================
  // PASO 5: LLAMADO A LA ACCIÓN (CTA) Y BOTONES REDONDEADOS FLOTANTES
  // =========================================================================
  const footerY = priceBarY + priceBarH + 16;
  const footerH = 68;
  const colGap = 14;
  const colW = (headerW - colGap * 2) / 3;

  // Botón Redondeado 1: 💵 PAGO EN CASA
  const t1X = headerX;
  ctx.save();
  drawRoundedRect(ctx, t1X, footerY, colW, footerH, 34);
  ctx.fillStyle = 'rgba(10, 15, 26, 0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(34, 197, 94, 0.65)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 17px "Montserrat", sans-serif';
  ctx.fillStyle = '#86EFAC';
  ctx.fillText('💵 PAGO EN CASA', t1X + colW / 2, footerY + 25);
  ctx.font = '700 12px "Montserrat", sans-serif';
  ctx.fillStyle = '#CBD5E1';
  ctx.fillText('Pagas en efectivo al recibir', t1X + colW / 2, footerY + 47);
  ctx.restore();

  // Botón Redondeado 2: 🚚 ENVÍO GRATIS
  const t2X = t1X + colW + colGap;
  ctx.save();
  drawRoundedRect(ctx, t2X, footerY, colW, footerH, 34);
  ctx.fillStyle = 'rgba(10, 15, 26, 0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 17px "Montserrat", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('🚚 ENVÍO GRATIS', t2X + colW / 2, footerY + 25);
  ctx.font = '700 12px "Montserrat", sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('A toda Colombia', t2X + colW / 2, footerY + 47);
  ctx.restore();

  // Botón Redondeado 3: CTA HERO RADIANTE (🛒 ¡PÍDELO HOY!)
  const t3X = t2X + colW + colGap;
  ctx.save();
  ctx.shadowColor = 'rgba(220, 38, 38, 0.85)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 4;

  const btnGrad = ctx.createLinearGradient(t3X, footerY, t3X, footerY + footerH);
  btnGrad.addColorStop(0, '#EF4444');
  btnGrad.addColorStop(0.5, '#DC2626');
  btnGrad.addColorStop(1, '#991B1B');
  ctx.fillStyle = btnGrad;
  drawRoundedRect(ctx, t3X, footerY, colW, footerH, 34);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 19px "Montserrat", "Oswald", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('🛒 ¡PÍDELO HOY!', t3X + colW / 2, footerY + 25);

  ctx.font = '800 12px "Montserrat", sans-serif';
  ctx.fillStyle = '#FECDD3';
  ctx.fillText('POR MENSAJE »', t3X + colW / 2, footerY + 47);
  ctx.restore();

  return canvas.toDataURL('image/png', 1.0);
}
