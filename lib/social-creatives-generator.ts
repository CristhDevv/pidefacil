import { formatCOP } from '@/config/pricing';

export type CreativeFormat = '1:1' | '9:16';

export interface CreativeRenderOptions {
  productName: string;
  imageUrl: string;
  selectedOffer: '1x' | '2x';
  singlePrice: number;
  anchorPrice: number;
  duoPrice: number;
  duoSavings: number;
  selectedVariation?: string;
  packInfo?: {
    singleTitle: string;
    duoTitle: string;
    singleBadge: string;
    duoBadge: string;
  };
  format: CreativeFormat;
  imageIndex: number;
  totalImages: number;
}

export interface GeneratedCreative {
  format: CreativeFormat;
  imageIndex: number;
  blob: Blob;
  dataUrl: string;
  filename: string;
  width: number;
  height: number;
}

// Helper para dibujar rectángulos redondeados compatible con todos los navegadores
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number | number[]
) {
  const r = typeof radius === 'number'
    ? { tl: radius, tr: radius, br: radius, bl: radius }
    : { tl: radius[0] || 0, tr: radius[1] || 0, br: radius[2] || 0, bl: radius[3] || 0 };

  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + width - r.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r.tr);
  ctx.lineTo(x + width, y + height - r.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r.br, y + height);
  ctx.lineTo(x + r.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.quadraticCurveTo(x, y, x + r.tl, y);
  ctx.closePath();
}

// Helper para ajustar y cortar texto en múltiples líneas
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
        // Cortar con ellipsis en la última línea permitida
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

// Cargar imagen de forma asíncrona mediante el proxy Anti-CORS
function loadProxiedImage(rawUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const finalSrc = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
      ? `/api/proxy-image?url=${encodeURIComponent(rawUrl)}`
      : rawUrl;

    img.onload = () => resolve(img);
    img.onerror = () => {
      // Fallback: intentar cargar directo si el proxy falla
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
 * Renderiza el creativo persuasivo en Canvas en alta resolución (1080x1080 o 1080x1920)
 */
export async function renderSocialCreative(
  options: CreativeRenderOptions
): Promise<GeneratedCreative> {
  const {
    productName,
    imageUrl,
    selectedOffer,
    singlePrice,
    anchorPrice,
    duoPrice,
    duoSavings,
    selectedVariation,
    packInfo,
    format,
    imageIndex,
  } = options;

  const isDuo = selectedOffer === '2x';
  const width = 1080;
  const height = format === '1:1' ? 1080 : 1920;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo inicializar el contexto 2D de Canvas');
  }

  // 1. Cargar imagen original
  let productImg: HTMLImageElement | null = null;
  try {
    productImg = await loadProxiedImage(imageUrl);
  } catch (e) {
    console.warn('No se pudo cargar la imagen para renderizado:', e);
  }

  // 2. Fondo Base: Gradiente Premium Suave
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  if (format === '1:1') {
    bgGrad.addColorStop(0, '#022C22'); // Esmeralda muy oscuro
    bgGrad.addColorStop(0.3, '#064E3B');
    bgGrad.addColorStop(0.7, '#0F172A'); // Pizarra oscura
    bgGrad.addColorStop(1, '#020617');
  } else {
    // 9:16 vertical
    bgGrad.addColorStop(0, '#022C22');
    bgGrad.addColorStop(0.25, '#064E3B');
    bgGrad.addColorStop(0.65, '#0F172A');
    bgGrad.addColorStop(1, '#020617');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Patrón sutil de fondo
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 2;
  for (let i = 0; i < width + height; i += 60) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(0, i);
    ctx.stroke();
  }
  ctx.restore();

  // ==========================================
  // SECCIÓN 1: ENCABEZADO DE IMPACTO (SUPERIOR)
  // ==========================================
  const headerTop = 24;
  const headerPaddingX = 36;

  // Mini barra superior: PideFácil.co y Garantía
  ctx.save();
  drawRoundedRect(ctx, headerPaddingX, headerTop, width - headerPaddingX * 2, 44, 22);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = 'bold 20px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#A7F3D0'; // Esmeralda claro
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('🇨🇴 PIDEFÁCIL.CO', headerPaddingX + 20, headerTop + 22);

  ctx.fillStyle = '#FDE68A'; // Ámbar claro
  ctx.textAlign = 'right';
  ctx.fillText('🚚 ENVÍO GRATIS + PAGO EN CASA', width - headerPaddingX - 20, headerTop + 22);
  ctx.restore();

  // Título del Producto (Tipografía Grande y Clara)
  ctx.save();
  ctx.font = '900 38px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const titleMaxWidth = width - 80;
  const titleY = headerTop + 60;
  const titleLines = wrapText(ctx, productName.toUpperCase(), titleMaxWidth, 2);
  titleLines.forEach((line, idx) => {
    ctx.fillText(line, width / 2, titleY + idx * 46);
  });
  ctx.restore();

  // Pastilla Central: Combo Activo (Ámbar / Dorado de Alto Contraste)
  const pillY = titleY + titleLines.length * 46 + 12;
  const comboText = isDuo
    ? `🔥 SÚPER PROMO DÚO PACK — LLEVAS 2 UNIDADES`
    : `⭐ OFERTA ESPECIAL — 1 UNIDAD EXCLUSIVA`;

  ctx.save();
  ctx.font = '900 24px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const pillTextWidth = ctx.measureText(comboText).width;
  const pillWidth = Math.min(width - 80, pillTextWidth + 60);
  const pillHeight = 52;
  const pillX = (width - pillWidth) / 2;

  // Sombra de la pastilla
  ctx.shadowColor = 'rgba(245, 158, 11, 0.5)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 4;

  const pillGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillWidth, pillY);
  if (isDuo) {
    pillGrad.addColorStop(0, '#DC2626'); // Rojo brillante
    pillGrad.addColorStop(0.5, '#F59E0B'); // Ámbar
    pillGrad.addColorStop(1, '#DC2626');
  } else {
    pillGrad.addColorStop(0, '#D97706'); // Ámbar dorado
    pillGrad.addColorStop(0.5, '#FBBF24');
    pillGrad.addColorStop(1, '#D97706');
  }
  ctx.fillStyle = pillGrad;
  drawRoundedRect(ctx, pillX, pillY, pillWidth, pillHeight, 26);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(comboText, width / 2, pillY + pillHeight / 2);
  ctx.restore();

  // ==========================================
  // SECCIÓN 2: ZONA CENTRAL (FOTOGRAFÍA DEL PRODUCTO)
  // ==========================================
  const cardMarginX = 40;
  const cardTop = pillY + pillHeight + 20;
  // Ajustar altura de la tarjeta según formato
  const cardBottom = format === '1:1' ? 760 : 1380;
  const cardWidth = width - cardMarginX * 2;
  const cardHeight = cardBottom - cardTop;

  // Tarjeta Blanca con Borde y Sombra para Resaltar el Producto
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;

  drawRoundedRect(ctx, cardMarginX, cardTop, cardWidth, cardHeight, 36);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  // Dibujar la imagen dentro de la tarjeta respetando aspect-ratio (contain)
  if (productImg) {
    ctx.save();
    // Clip dentro del área de la tarjeta
    drawRoundedRect(ctx, cardMarginX + 8, cardTop + 8, cardWidth - 16, cardHeight - 16, 30);
    ctx.clip();

    const imgPadding = 24;
    const availWidth = cardWidth - imgPadding * 2;
    const availHeight = cardHeight - imgPadding * 2;

    const imgAspect = productImg.width / productImg.height;
    const boxAspect = availWidth / availHeight;

    let drawW = availWidth;
    let drawH = availHeight;
    let drawX = cardMarginX + imgPadding;
    let drawY = cardTop + imgPadding;

    if (imgAspect > boxAspect) {
      drawH = availWidth / imgAspect;
      drawY = cardTop + imgPadding + (availHeight - drawH) / 2;
    } else {
      drawW = availHeight * imgAspect;
      drawX = cardMarginX + imgPadding + (availWidth - drawW) / 2;
    }

    ctx.drawImage(productImg, drawX, drawY, drawW, drawH);
    ctx.restore();
  }

  // Insignia Flotante 1: Superior Derecha ("ALTA CALIDAD • GARANTIZADO")
  ctx.save();
  const badgeRightX = cardMarginX + cardWidth - 280;
  const badgeRightY = cardTop + 24;
  drawRoundedRect(ctx, badgeRightX, badgeRightY, 260, 48, 24);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fill();
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = 'bold 18px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#FBBF24';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⭐ CALIDAD GARANTIZADA', badgeRightX + 130, badgeRightY + 24);
  ctx.restore();

  // Insignia Flotante 2: Si es Dúo Pack, Sello de Ahorro en la Esquina Superior Izquierda
  if (isDuo && duoSavings > 0) {
    ctx.save();
    const saveBadgeX = cardMarginX + 24;
    const saveBadgeY = cardTop + 24;
    const saveText = `💥 ¡AHORRAS ${formatCOP(duoSavings)}!`;

    ctx.font = '900 19px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const saveWidth = ctx.measureText(saveText).width + 36;

    drawRoundedRect(ctx, saveBadgeX, saveBadgeY, saveWidth, 48, 24);
    const saveGrad = ctx.createLinearGradient(saveBadgeX, saveBadgeY, saveBadgeX + saveWidth, saveBadgeY);
    saveGrad.addColorStop(0, '#16A34A');
    saveGrad.addColorStop(1, '#059669');
    ctx.fillStyle = saveGrad;
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(saveText, saveBadgeX + saveWidth / 2, saveBadgeY + 24);
    ctx.restore();
  }

  // Píldora de Variante Seleccionada (si aplica)
  if (selectedVariation && selectedVariation.trim() !== '') {
    ctx.save();
    const varText = `✨ Opción: ${selectedVariation}`;
    ctx.font = 'bold 18px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const varWidth = Math.min(cardWidth - 60, ctx.measureText(varText).width + 40);
    const varX = (width - varWidth) / 2;
    const varY = cardBottom - 60;

    drawRoundedRect(ctx, varX, varY, varWidth, 44, 22);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fill();
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#E0F2FE';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(varText, width / 2, varY + 22);
    ctx.restore();
  }

  // ==========================================
  // SECCIÓN 3: BLOQUE COMERCIAL DE PRECIOS
  // ==========================================
  const priceBoxTop = cardBottom + (format === '1:1' ? 16 : 30);
  const priceBoxHeight = format === '1:1' ? 144 : 220;
  const priceBoxY = priceBoxTop;

  ctx.save();
  // Caja de alto impacto para precios
  drawRoundedRect(ctx, cardMarginX, priceBoxY, cardWidth, priceBoxHeight, 30);
  const priceGrad = ctx.createLinearGradient(cardMarginX, priceBoxY, cardMarginX + cardWidth, priceBoxY + priceBoxHeight);
  priceGrad.addColorStop(0, '#064E3B');
  priceGrad.addColorStop(0.5, '#042F2E');
  priceGrad.addColorStop(1, '#0F172A');
  ctx.fillStyle = priceGrad;
  ctx.fill();

  ctx.strokeStyle = '#10B981';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Contenido de la Caja de Precios
  const finalPrice = isDuo ? duoPrice : singlePrice;
  const finalPriceText = formatCOP(finalPrice);

  if (format === '1:1') {
    // Disposición Horizontal para Formato 1:1 Cuadrado
    // Lado Izquierdo: Antes tachado y Oferta
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 20px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#94A3B8';
    const beforeY = priceBoxY + 44;
    const beforeText = isDuo ? `Antes: ~${formatCOP(singlePrice * 2)}~` : `Antes: ~${formatCOP(anchorPrice)}~`;
    ctx.fillText(beforeText, cardMarginX + 32, beforeY);

    // Línea tachada sobre el texto anterior
    const beforeW = ctx.measureText(beforeText).width;
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cardMarginX + 30, beforeY);
    ctx.lineTo(cardMarginX + 34 + beforeW, beforeY);
    ctx.stroke();

    ctx.font = '900 24px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#FDE68A';
    ctx.fillText(
      isDuo ? '🔥 PRECIO COMBO DÚO:' : '⭐ PRECIO EN PROMO:',
      cardMarginX + 32,
      priceBoxY + 95
    );

    // Lado Derecho: Precio Gigante
    ctx.textAlign = 'right';
    ctx.font = '900 62px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#22C55E'; // Verde brillante
    ctx.shadowColor = 'rgba(34, 197, 94, 0.4)';
    ctx.shadowBlur = 16;
    ctx.fillText(finalPriceText, cardMarginX + cardWidth - 32, priceBoxY + 72);
  } else {
    // Disposición Vertical para Formato 9:16 Historia
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Antes tachado
    ctx.font = 'bold 26px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#94A3B8';
    const beforeY = priceBoxY + 44;
    const beforeText = isDuo ? `Precio Regular: ${formatCOP(singlePrice * 2)}` : `Precio Regular: ${formatCOP(anchorPrice)}`;
    ctx.fillText(beforeText, width / 2, beforeY);

    const beforeW = ctx.measureText(beforeText).width;
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(width / 2 - beforeW / 2 - 8, beforeY);
    ctx.lineTo(width / 2 + beforeW / 2 + 8, beforeY);
    ctx.stroke();

    // Etiqueta
    ctx.font = '900 30px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#FDE68A';
    ctx.fillText(
      isDuo ? '🔥 LLEVAS 2 UNIDADES HOY POR SOLO:' : '⭐ PRECIO ESPECIAL HOY:',
      width / 2,
      priceBoxY + 96
    );

    // Precio Gigante
    ctx.font = '900 78px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#22C55E';
    ctx.shadowColor = 'rgba(34, 197, 94, 0.5)';
    ctx.shadowBlur = 24;
    ctx.fillText(finalPriceText, width / 2, priceBoxY + 162);
  }
  ctx.restore();

  // ==========================================
  // SECCIÓN 4: BARRA INFERIOR DE CONFIANZA Y CTA (FOOTER)
  // ==========================================
  const footerY = priceBoxY + priceBoxHeight + (format === '1:1' ? 14 : 26);
  const footerHeight = format === '1:1' ? 96 : 140;
  const colGap = 16;
  const colWidth = (cardWidth - colGap * 2) / 3;

  // Insignia 1: PAGO EN CASA
  const b1X = cardMarginX;
  ctx.save();
  drawRoundedRect(ctx, b1X, footerY, colWidth, footerHeight, 20);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (format === '1:1') {
    ctx.font = '900 20px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#FEF08A';
    ctx.fillText('💵 PAGO EN CASA', b1X + colWidth / 2, footerY + 34);
    ctx.font = 'bold 15px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#E2E8F0';
    ctx.fillText('Pagas al recibir', b1X + colWidth / 2, footerY + 64);
  } else {
    ctx.font = '900 24px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#FEF08A';
    ctx.fillText('💵 PAGO EN CASA', b1X + colWidth / 2, footerY + 50);
    ctx.font = 'bold 18px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#CBD5E1';
    ctx.fillText('Pagas en efectivo al recibir', b1X + colWidth / 2, footerY + 90);
  }
  ctx.restore();

  // Insignia 2: ENVÍO GRATIS
  const b2X = b1X + colWidth + colGap;
  ctx.save();
  drawRoundedRect(ctx, b2X, footerY, colWidth, footerHeight, 20);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (format === '1:1') {
    ctx.font = '900 20px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#A7F3D0';
    ctx.fillText('🚚 ENVÍO GRATIS', b2X + colWidth / 2, footerY + 34);
    ctx.font = 'bold 15px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#E2E8F0';
    ctx.fillText('Toda Colombia', b2X + colWidth / 2, footerY + 64);
  } else {
    ctx.font = '900 24px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#A7F3D0';
    ctx.fillText('🚚 ENVÍO GRATIS', b2X + colWidth / 2, footerY + 50);
    ctx.font = 'bold 18px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#CBD5E1';
    ctx.fillText('Cobertura en toda Colombia', b2X + colWidth / 2, footerY + 90);
  }
  ctx.restore();

  // Insignia 3: BOTÓN TÁCTIL CTA (¡PÍDELO HOY POR MENSAJE!)
  const b3X = b2X + colWidth + colGap;
  ctx.save();
  drawRoundedRect(ctx, b3X, footerY, colWidth, footerHeight, 20);

  // Sombra de botón 3D llamativo
  ctx.shadowColor = 'rgba(22, 163, 74, 0.6)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 4;

  const ctaGrad = ctx.createLinearGradient(b3X, footerY, b3X, footerY + footerHeight);
  ctaGrad.addColorStop(0, '#22C55E');
  ctaGrad.addColorStop(1, '#15803D');
  ctx.fillStyle = ctaGrad;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#86EFAC';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (format === '1:1') {
    ctx.font = '900 18px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('🛒 ¡PÍDELO HOY!', b3X + colWidth / 2, footerY + 34);
    ctx.font = 'bold 14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#DCFCE7';
    ctx.fillText('POR MENSAJE »', b3X + colWidth / 2, footerY + 64);
  } else {
    ctx.font = '900 22px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('🛒 ¡PÍDELO HOY!', b3X + colWidth / 2, footerY + 50);
    ctx.font = 'bold 17px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#DCFCE7';
    ctx.fillText('POR MENSAJE DIRECTO »', b3X + colWidth / 2, footerY + 90);
  }
  ctx.restore();

  // 3. Exportar Canvas a Blob (PNG de alta definición 100% nítido)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Fallo al exportar el lienzo a Blob'));
          return;
        }
        const dataUrl = canvas.toDataURL('image/png');
        const cleanName = productName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .slice(0, 30);
        const comboTag = isDuo ? 'duo-2x' : 'individual-1x';
        const formatTag = format === '1:1' ? 'feed-1080x1080' : 'historia-1080x1920';
        const filename = `PideFacil_${cleanName}_${comboTag}_foto${imageIndex + 1}_${formatTag}.png`;

        resolve({
          format,
          imageIndex,
          blob,
          dataUrl,
          filename,
          width,
          height,
        });
      },
      'image/png',
      1.0
    );
  });
}
