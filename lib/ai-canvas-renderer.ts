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

// Helper para dibujar rectángulos redondeados compatible con cualquier navegador
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
      // Fallback
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
 * Renderiza el anuncio fotorrealista de alta conversión directamente en Canvas HTML5
 * con soporte nativo de fuentes del sistema y emojis a todo color (sin tofu [][][]).
 */
export async function renderAiCreativeOnCanvas(options: RenderCanvasOptions): Promise<string> {
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

  // 1. Intentar cargar la escena generada por IA (sceneDataUrl)
  const targetSceneUrl = sceneDataUrl || angle.sceneDataUrl;
  let sceneImg: HTMLImageElement | null = null;
  if (targetSceneUrl) {
    try {
      sceneImg = await loadProxiedImage(targetSceneUrl);
    } catch (sceneErr) {
      console.warn('[Canvas Renderer] Falló carga de escena IA, usando foto de proveedor:', sceneErr);
    }
  }

  const hasScene = Boolean(sceneImg);

  // 2. Si no hay escena IA generada, cargar la foto original del proveedor para el fallback
  let productImg: HTMLImageElement | null = null;
  if (!hasScene) {
    try {
      productImg = await loadProxiedImage(imageUrl);
    } catch (e) {
      console.warn('No se pudo cargar la imagen original del proveedor:', e);
    }
  }

  // 3. FONDO: Escena IA a sangrado completo O Gradiente Esmeralda Fallback
  if (hasScene && sceneImg) {
    // Dibujar escena generada por IA cubriendo el 100% del canvas (object-fit: cover)
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

    // Degradado oscuro superior (de rgba(0,0,0,0.78) a transparente, primeros ~34% de alto)
    const topGrad = ctx.createLinearGradient(0, 0, 0, height * 0.34);
    topGrad.addColorStop(0, 'rgba(0, 0, 0, 0.78)');
    topGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.40)');
    topGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, width, height * 0.34);

    // Degradado oscuro inferior (de transparente a rgba(0,0,0,0.88), desde el 60% de alto)
    const btmStartY = height * 0.60;
    const btmGrad = ctx.createLinearGradient(0, btmStartY, 0, height);
    btmGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    btmGrad.addColorStop(0.4, 'rgba(0, 0, 0, 0.60)');
    btmGrad.addColorStop(1, 'rgba(0, 0, 0, 0.88)');
    ctx.fillStyle = btmGrad;
    ctx.fillRect(0, btmStartY, width, height - btmStartY);
  } else {
    // Fondo Base Fallback: Gradiente Premium Esmeralda a Pizarra
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#022C22');
    bgGrad.addColorStop(0.25, '#064E3B');
    bgGrad.addColorStop(0.75, '#0F172A');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Patrón geométrico sutil en fallback
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < width + height; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(0, i);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ==========================================
  // SECCIÓN 1: ENCABEZADO SUPERIOR
  // ==========================================
  const headerX = 40;
  const headerW = width - headerX * 2;

  // Mini barra superior
  ctx.save();
  drawRoundedRect(ctx, headerX, 22, headerW, 40, 20);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = '900 18px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#A7F3D0';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('🇨🇴 PIDEFÁCIL.CO', headerX + 20, 42);

  ctx.fillStyle = '#FDE68A';
  ctx.textAlign = 'right';
  ctx.fillText('🚚 ENVÍO GRATIS + PAGO EN CASA', headerX + headerW - 20, 42);
  ctx.restore();

  // Titular de Impacto de la IA (Hook Headline)
  ctx.save();
  ctx.font = '900 38px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;

  const hookLines = wrapText(ctx, (angle.hookHeadline || productName).toUpperCase(), headerW - 40, 2);
  const hookStartY = hookLines.length > 1 ? 95 : 105;
  hookLines.forEach((line, idx) => {
    ctx.fillText(line, width / 2, hookStartY + idx * 44);
  });
  ctx.restore();

  // Pastilla Central: Subtítulo de Ángulo / Combo
  const pillY = hookStartY + hookLines.length * 44 + 8;
  const pillH = 48;
  const pillW = Math.min(headerW, 680);
  const pillX = (width - pillW) / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(220, 38, 38, 0.45)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 3;

  const pillGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY);
  pillGrad.addColorStop(0, '#DC2626');
  pillGrad.addColorStop(0.5, '#F59E0B');
  pillGrad.addColorStop(1, '#DC2626');
  ctx.fillStyle = pillGrad;
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 24);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = '900 20px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const pillText = isDuo
    ? `🔥 SÚPER PROMO DÚO PACK — LLEVAS 2`
    : `⭐ ${angle.subHeadline || angle.title}`;
  ctx.fillText(pillText, width / 2, pillY + pillH / 2);
  ctx.restore();

  // ==========================================
  // SECCIÓN 2: TERCIO CENTRAL (ESCENA O TARJETA HERO)
  // ==========================================
  const cardTop = pillY + pillH + 16;
  const cardBottom = 780;
  const cardHeight = cardBottom - cardTop;
  const cardWidth = headerW;

  if (!hasScene) {
    // FALLBACK: Tarjeta Blanca Heroica con la foto del proveedor
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    drawRoundedRect(ctx, headerX, cardTop, cardWidth, cardHeight, 32);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.restore();

    // Dibujar el producto físicamente dentro de la tarjeta
    if (productImg) {
      ctx.save();
      drawRoundedRect(ctx, headerX + 4, cardTop + 4, cardWidth - 8, cardHeight - 8, 28);
      ctx.clip();

      const pad = 20;
      const availW = cardWidth - pad * 2;
      const availH = cardHeight - pad * 2;

      const imgAspect = productImg.width / productImg.height;
      const boxAspect = availW / availH;

      let drawW = availW;
      let drawH = availH;
      let drawX = headerX + pad;
      let drawY = cardTop + pad;

      if (imgAspect > boxAspect) {
        drawH = availW / imgAspect;
        drawY = cardTop + pad + (availH - drawH) / 2;
      } else {
        drawW = availH * imgAspect;
        drawX = headerX + pad + (availW - drawW) / 2;
      }

      ctx.drawImage(productImg, drawX, drawY, drawW, drawH);
      ctx.restore();
    }
  }

  // Sello Superior Derecho: ALTA CALIDAD ★★★★★
  ctx.save();
  const badgeW = 250;
  const badgeH = 42;
  const badgeX = headerX + cardWidth - badgeW - 16;
  const badgeY = cardTop + 16;
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 21);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.fill();
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#FBBF24';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⭐ CALIDAD GARANTIZADA', badgeX + badgeW / 2, badgeY + badgeH / 2);
  ctx.restore();

  // Sello Superior Izquierdo: Ahorro Dúo Pack (ubicado en esquina superior izquierda para no tapar el producto)
  if (isDuo && duoSavingsCop > 0) {
    ctx.save();
    const saveW = 270;
    const saveH = 42;
    const saveX = headerX + 16;
    const saveY = cardTop + 16;
    drawRoundedRect(ctx, saveX, saveY, saveW, saveH, 21);
    ctx.fillStyle = '#16A34A';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = '900 17px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`💥 ¡AHORRAS ${formatCOP(duoSavingsCop)}!`, saveX + saveW / 2, saveY + saveH / 2);
    ctx.restore();
  }

  // Píldora de Variante seleccionada
  if (selectedVariation && selectedVariation.trim() !== '') {
    ctx.save();
    const varText = `✨ Opción: ${selectedVariation}`;
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    const varW = Math.min(cardWidth - 60, ctx.measureText(varText).width + 36);
    const varX = (width - varW) / 2;
    const varY = cardBottom - 48;
    drawRoundedRect(ctx, varX, varY, varW, 36, 18);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fill();
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#E0F2FE';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(varText, width / 2, varY + 18);
    ctx.restore();
  }

  // ==========================================
  // SECCIÓN 3: BLOQUE COMERCIAL DE PRECIOS
  // ==========================================
  const priceY = cardBottom + 16;
  const priceH = 142;

  ctx.save();
  drawRoundedRect(ctx, headerX, priceY, cardWidth, priceH, 28);
  if (hasScene) {
    // Fondo semitransparente oscuro cuando hay escena publicitaria IA para máximo contraste y legibilidad
    ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
    ctx.fill();
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  } else {
    const priceGrad = ctx.createLinearGradient(headerX, priceY, headerX + cardWidth, priceY + priceH);
    priceGrad.addColorStop(0, '#064E3B');
    priceGrad.addColorStop(0.5, '#042F2E');
    priceGrad.addColorStop(1, '#0F172A');
    ctx.fillStyle = priceGrad;
    ctx.fill();
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Columna 1: 1 Unidad
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('1 Unidad:', headerX + 36, priceY + 36);

  ctx.font = '900 36px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = !isDuo ? '#22C55E' : '#E2E8F0';
  ctx.fillText(formatCOP(singlePriceCop), headerX + 36, priceY + 76);

  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.fillText('Envío Gratis incluido', headerX + 36, priceY + 108);

  // Línea divisoria vertical 1
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(headerX + 330, priceY + 20);
  ctx.lineTo(headerX + 330, priceY + priceH - 20);
  ctx.stroke();

  // Columna 2: Dúo Pack (Destacado)
  const duoBoxX = headerX + 355;
  const duoBoxW = 380;
  if (isDuo) {
    drawRoundedRect(ctx, duoBoxX - 10, priceY + 12, duoBoxW, priceH - 24, 18);
    ctx.fillStyle = 'rgba(34, 197, 94, 0.20)';
    ctx.fill();
    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.font = '900 18px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#FDE68A';
  ctx.fillText('🔥 DÚO PACK (LLEVAS 2):', duoBoxX, priceY + 36);

  ctx.font = '900 46px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#22C55E';
  ctx.fillText(formatCOP(duoPriceCop), duoBoxX, priceY + 76);

  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#86EFAC';
  ctx.fillText('⭐ Mayor ahorro por unidad', duoBoxX, priceY + 108);

  // Línea divisoria vertical 2
  ctx.beginPath();
  ctx.moveTo(headerX + 750, priceY + 20);
  ctx.lineTo(headerX + 750, priceY + priceH - 20);
  ctx.stroke();

  // Columna 3: Urgencia
  ctx.textAlign = 'center';
  ctx.font = '900 20px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#EF4444';
  ctx.fillText('⚡ ¡ÚLTIMAS', headerX + 865, priceY + 54);
  ctx.fillStyle = '#FCA5A5';
  ctx.fillText('UNIDADES!', headerX + 865, priceY + 84);
  ctx.restore();

  // ==========================================
  // SECCIÓN 4: CINTILLO BASE CON LOS 3 DISPARADORES
  // ==========================================
  const footerY = priceY + priceH + 16;
  const footerH = 88;
  const colGap = 16;
  const colW = (cardWidth - colGap * 2) / 3;

  // Trigger 1: PAGO EN CASA
  const t1X = headerX;
  ctx.save();
  drawRoundedRect(ctx, t1X, footerY, colW, footerH, 20);
  ctx.fillStyle = hasScene ? 'rgba(0, 0, 0, 0.55)' : 'rgba(255, 255, 255, 0.08)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 20px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#FEF08A';
  ctx.fillText('💵 PAGO EN CASA', t1X + colW / 2, footerY + 32);
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#CBD5E1';
  ctx.fillText('Pagas en efectivo al recibir', t1X + colW / 2, footerY + 58);
  ctx.restore();

  // Trigger 2: ENVÍO GRATIS
  const t2X = t1X + colW + colGap;
  ctx.save();
  drawRoundedRect(ctx, t2X, footerY, colW, footerH, 20);
  ctx.fillStyle = hasScene ? 'rgba(0, 0, 0, 0.55)' : 'rgba(255, 255, 255, 0.08)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 20px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#A7F3D0';
  ctx.fillText('🚚 ENVÍO GRATIS', t2X + colW / 2, footerY + 32);
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#CBD5E1';
  ctx.fillText('Cobertura en toda Colombia', t2X + colW / 2, footerY + 58);
  ctx.restore();

  // Trigger 3: CTA BOTÓN TÁCTIL
  const t3X = t2X + colW + colGap;
  ctx.save();
  drawRoundedRect(ctx, t3X, footerY, colW, footerH, 20);
  ctx.shadowColor = 'rgba(34, 197, 94, 0.5)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 4;

  const btnGrad = ctx.createLinearGradient(t3X, footerY, t3X, footerY + footerH);
  btnGrad.addColorStop(0, '#22C55E');
  btnGrad.addColorStop(1, '#15803D');
  ctx.fillStyle = btnGrad;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#86EFAC';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 19px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('🛒 ¡PÍDELO HOY!', t3X + colW / 2, footerY + 32);
  ctx.font = '900 14px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#DCFCE7';
  ctx.fillText('POR MENSAJE »', t3X + colW / 2, footerY + 58);
  ctx.restore();

  return canvas.toDataURL('image/png', 1.0);
}
