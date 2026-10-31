import { formatCOP } from '@/config/pricing';

export interface CtaImageOptions {
  imageUrl: string;
  productName: string;
  singlePrice: number;
  duoPrice?: number;
  duoSavings?: number;
}

// Carga de imagen con proxy anti-CORS para evitar canvas tainting
function loadProxiedImage(rawUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Canvas solo se ejecuta en navegador'));
    }

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
      // Intento fallback directo
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

// Helper para rectángulos redondeados en canvas
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

// Helper para envolver texto largo en varias líneas
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number = 3
): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = words[i];
      if (lines.length >= maxLines - 1) {
        // En la última línea permitida, truncar con elipsis si excede
        const remaining = words.slice(i).join(' ');
        let lastLine = remaining;
        while (lastLine.length > 3 && ctx.measureText(lastLine + '...').width > maxWidth) {
          lastLine = lastLine.slice(0, -1).trim();
        }
        lines.push(lastLine + '...');
        return lines;
      }
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Renderiza la imagen del producto en formato vertical 9:16 (exactamente 1080×1920 píxeles)
 * optimizada para Estados de WhatsApp, Instagram Stories y anuncios móviles.
 * 
 * Estructura de Lienzo:
 * - Zona 1 (y: 0 - 80px): Cintillo superior de confianza (Envío Gratis + Pago al Recibir).
 * - Zona 2 (y: 80 - 420px): Encabezado con título del producto en letra grande y legible.
 * - Zona 3 (y: 420 - 1420px): Foto real del producto (1000px de altura), sin distorsión ni redibujo.
 * - Zona 4 (y: 1420 - 1920px): Precios gigantes (1x y 2x si aplica), botón CTA de compra y garantía.
 */
export async function generateCtaImage(options: CtaImageOptions): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('generateCtaImage solo puede ejecutarse en el cliente');
  }

  const { imageUrl, productName, singlePrice, duoPrice, duoSavings } = options;
  const width = 1080;
  const height = 1920;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo inicializar el contexto de canvas 2D');
  }

  // 1. Cargar imagen del producto
  const img = await loadProxiedImage(imageUrl);

  // 2. Fondo neutro limpio blanco completo
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // =========================================================================
  // ZONA 1: CINTILLO SUPERIOR DE CONFIANZA (y: 0 a 80px, alto: 80px)
  // =========================================================================
  const topBarH = 80;
  ctx.fillStyle = '#064E3B'; // Esmeralda institucional oscuro
  ctx.fillRect(0, 0, width, topBarH);

  ctx.font = 'bold 26px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🚚 ENVÍO GRATIS A TODA COLOMBIA  •  💵 PAGA AL RECIBIR EN CASA', width / 2, topBarH / 2);

  // =========================================================================
  // ZONA 2: ENCABEZADO CON TÍTULO DEL PRODUCTO (y: 80 a 420px, alto: 340px)
  // =========================================================================
  const headerY = topBarH;
  const headerH = 340;

  // Fondo sutil blanco con borde divisorio
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, headerY, width, headerH);

  // Badges superiores: Logo y Garantía
  const badgeY = headerY + 22;

  // Badge Izquierdo: 100% Seguro
  ctx.save();
  ctx.fillStyle = '#ECFDF5';
  drawRoundedRect(ctx, 50, badgeY, 260, 42, 12);
  ctx.fill();
  ctx.strokeStyle = '#A7F3D0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#065F46';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🛡️ COMPRA 100% PROTEGIDA', 50 + 130, badgeY + 21);
  ctx.restore();

  // Badge Derecho: Marca PideFácil.co
  const brandX = width - 50 - 200;
  ctx.save();
  ctx.fillStyle = '#F8FAFC';
  drawRoundedRect(ctx, brandX, badgeY, 200, 42, 12);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = '900 22px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0F172A';
  ctx.fillText('Pide', brandX + 60, badgeY + 21);
  ctx.fillStyle = '#0047BA';
  ctx.fillText('Fácil', brandX + 112, badgeY + 21);
  ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('.co', brandX + 162, badgeY + 21);
  ctx.restore();

  // Título del Producto: Grande, legible y centrado
  ctx.save();
  ctx.font = '900 44px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#0F172A';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxTitleW = width - 100; // 980px
  const titleLines = wrapText(ctx, productName, maxTitleW, 3);
  const lineHeight = 54;
  const totalTitleHeight = titleLines.length * lineHeight;
  const titleStartY = headerY + 85 + (headerH - 85 - totalTitleHeight) / 2 + lineHeight / 2;

  titleLines.forEach((line, idx) => {
    ctx.fillText(line, width / 2, titleStartY + idx * lineHeight);
  });
  ctx.restore();

  // Línea divisoria inferior de la zona superior
  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(40, headerY + headerH - 1, width - 80, 1.5);

  // =========================================================================
  // ZONA 3: FOTO REAL DEL PRODUCTO (y: 420 a 1420px, alto: 1000px)
  // =========================================================================
  const photoBoxX = 20;
  const photoBoxY = 420;
  const photoBoxW = width - 40; // 1040px
  const photoBoxH = 1000;

  // Fondo blanco puro para que resalte la foto
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, photoBoxY, width, photoBoxH);

  // Dimensiones sin distorsión (preserve aspect ratio)
  const imgW = img.naturalWidth || img.width || 1;
  const imgH = img.naturalHeight || img.height || 1;
  const imgAspect = imgW / imgH;

  const maxPhotoW = 1020;
  const maxPhotoH = 960;
  const targetAspect = maxPhotoW / maxPhotoH;

  let drawW = maxPhotoW;
  let drawH = maxPhotoH;
  let drawX = (width - drawW) / 2;
  let drawY = photoBoxY + (photoBoxH - drawH) / 2;

  if (imgAspect > targetAspect) {
    // La imagen es más ancha: ajustar al ancho máximo disponible
    drawW = maxPhotoW;
    drawH = maxPhotoW / imgAspect;
    drawX = (width - drawW) / 2;
    drawY = photoBoxY + (photoBoxH - drawH) / 2;
  } else {
    // La imagen es más alta o cuadrada: ajustar a la altura máxima disponible
    drawH = maxPhotoH;
    drawW = maxPhotoH * imgAspect;
    drawX = (width - drawW) / 2;
    drawY = photoBoxY + (photoBoxH - drawH) / 2;
  }

  ctx.drawImage(img, drawX, drawY, drawW, drawH);

  // Insignia sutil de calidad en esquina inferior derecha de la foto
  ctx.save();
  const certW = 210;
  const certH = 38;
  const certX = width - 50 - certW;
  const certY = photoBoxY + photoBoxH - 50;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  drawRoundedRect(ctx, certX, certY, certW, certH, 10);
  ctx.fill();
  ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⭐ Calidad Verificada', certX + certW / 2, certY + certH / 2);
  ctx.restore();

  // =========================================================================
  // ZONA 4: FRANJA CTA INFERIOR DE PRECIOS Y COMPRA (y: 1420 a 1920px, alto: 500px)
  // =========================================================================
  const ctaY = 1420;
  const ctaH = 500;

  // Fondo degradado de alto contraste: Verde esmeralda profundo a Azul medianoche
  const grad = ctx.createLinearGradient(0, ctaY, 0, height);
  grad.addColorStop(0, '#064E3B');
  grad.addColorStop(0.35, '#0B132B');
  grad.addColorStop(1, '#020617');
  ctx.fillStyle = grad;
  ctx.fillRect(0, ctaY, width, ctaH);

  // Borde superior luminoso esmeralda
  ctx.fillStyle = '#10B981';
  ctx.fillRect(0, ctaY, width, 6);

  // Comprobar si hay oferta de 2 unidades diferente al unitario
  const hasValidDuo = Boolean(duoPrice && duoPrice > 0 && duoPrice !== singlePrice);

  if (hasValidDuo) {
    // -----------------------------------------------------------------------
    // DOS TARJETAS PARALELAS: 1 UNIDAD vs 2 UNIDADES (COMBO HERO)
    // -----------------------------------------------------------------------
    const cardW = 485;
    const cardH = 220;
    const cardY = ctaY + 28;

    // --- TARJETA 1: 1 UNIDAD (Izquierda) ---
    const card1X = 40;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    drawRoundedRect(ctx, card1X, cardY, cardW, cardH, 22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Etiqueta superior
    ctx.fillStyle = '#CBD5E1';
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('LLEVA 1 UNIDAD', card1X + cardW / 2, cardY + 20);

    // Precio 1x grande
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 56px system-ui, -apple-system, sans-serif';
    ctx.fillText(formatCOP(singlePrice), card1X + cardW / 2, cardY + 62);

    // Envío gratis
    ctx.fillStyle = '#34D399';
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    ctx.fillText('✓ Envío Gratis Incluido', card1X + cardW / 2, cardY + 148);
    ctx.restore();

    // --- TARJETA 2: 2 UNIDADES COMBO HERO (Derecha) ---
    const card2X = width - cardW - 40;
    ctx.save();
    const card2Grad = ctx.createLinearGradient(card2X, cardY, card2X + cardW, cardY + cardH);
    card2Grad.addColorStop(0, 'rgba(16, 185, 129, 0.28)');
    card2Grad.addColorStop(1, 'rgba(245, 158, 11, 0.24)');
    ctx.fillStyle = card2Grad;
    drawRoundedRect(ctx, card2X, cardY, cardW, cardH, 22);
    ctx.fill();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Badge "🔥 MÁS ELEGIDO / 2 UNIDADES"
    const badgeW = 320;
    const badgeH = 36;
    const badgeX = card2X + (cardW - badgeW) / 2;
    const badgeTopY = cardY - 18;
    ctx.fillStyle = '#F59E0B';
    drawRoundedRect(ctx, badgeX, badgeTopY, badgeW, badgeH, 18);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.font = '900 16px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔥 ¡OFERTA 2 UNIDADES! (MÁS ELEGIDO)', badgeX + badgeW / 2, badgeTopY + badgeH / 2);

    // Etiqueta superior
    ctx.fillStyle = '#FDE68A';
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('LLEVA 2 UNIDADES POR:', card2X + cardW / 2, cardY + 24);

    // Precio 2x gigante dorado
    ctx.fillStyle = '#FBBF24';
    ctx.font = '900 60px system-ui, -apple-system, sans-serif';
    ctx.fillText(formatCOP(duoPrice!), card2X + cardW / 2, cardY + 62);

    // Ahorro
    const savings = duoSavings && duoSavings > 0 ? duoSavings : (singlePrice * 2 - duoPrice!);
    const savingsText = savings > 0
      ? `💥 AHORRAS ${formatCOP(savings)}`
      : '💥 ¡Super Descuento en la 2da!';
    ctx.fillStyle = '#6EE7B7';
    ctx.font = '900 20px system-ui, -apple-system, sans-serif';
    ctx.fillText(savingsText, card2X + cardW / 2, cardY + 148);
    ctx.restore();
  } else {
    // -----------------------------------------------------------------------
    // TARJETA ÚNICA CENTRADA (Cuando solo tiene 1 precio)
    // -----------------------------------------------------------------------
    const cardW = width - 80; // 1000px
    const cardH = 220;
    const cardX = 40;
    const cardY = ctaY + 28;

    ctx.save();
    const singleGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    singleGrad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
    singleGrad.addColorStop(1, 'rgba(59, 130, 246, 0.2)');
    ctx.fillStyle = singleGrad;
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 22);
    ctx.fill();
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Badge de oferta
    const badgeW = 340;
    const badgeH = 36;
    const badgeX = cardX + (cardW - badgeW) / 2;
    const badgeTopY = cardY - 18;
    ctx.fillStyle = '#10B981';
    drawRoundedRect(ctx, badgeX, badgeTopY, badgeW, badgeH, 18);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 16px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔥 PRECIO ESPECIAL DE LANZAMIENTO', badgeX + badgeW / 2, badgeTopY + badgeH / 2);

    ctx.fillStyle = '#FDE68A';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('PRECIO CONTRA ENTREGA:', cardX + cardW / 2, cardY + 24);

    ctx.fillStyle = '#FBBF24';
    ctx.font = '900 76px system-ui, -apple-system, sans-serif';
    ctx.fillText(formatCOP(singlePrice), cardX + cardW / 2, cardY + 60);

    ctx.fillStyle = '#34D399';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText('✓ Envío Gratis a Todo el País • Pago en Efectivo al Recibir', cardX + cardW / 2, cardY + 152);
    ctx.restore();
  }

  // -------------------------------------------------------------------------
  // BOTÓN CTA INFERIOR GIGANTE (Pide Aquí y Paga en Casa)
  // -------------------------------------------------------------------------
  const btnW = width - 80; // 1000px
  const btnH = 92;
  const btnX = 40;
  const btnY = ctaY + 276;

  ctx.save();
  const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY);
  btnGrad.addColorStop(0, '#10B981');
  btnGrad.addColorStop(0.5, '#059669');
  btnGrad.addColorStop(1, '#047857');
  ctx.fillStyle = btnGrad;
  drawRoundedRect(ctx, btnX, btnY, btnW, btnH, 26);
  ctx.fill();
  ctx.strokeStyle = '#34D399';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.font = '900 32px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('👉 ¡PIDE AQUÍ Y PAGA EN CASA EN EFECTIVO! 👈', btnX + btnW / 2, btnY + btnH / 2);
  ctx.restore();

  // -------------------------------------------------------------------------
  // PIE DE PÁGINA DE CONFIANZA Y SEGURIDAD (Garantías)
  // -------------------------------------------------------------------------
  ctx.save();
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#E2E8F0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🛡️ 100% Seguro  •  Sin tarjetas ni transferencias previas  •  Garantía Total', width / 2, ctaY + 400);

  ctx.font = '600 16px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('PideFácil.co  •  Tu compra protegida de principio a fin', width / 2, ctaY + 440);
  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.95);
}

/**
 * Genera la imagen CTA y dispara la descarga en el navegador del usuario.
 */
export async function downloadCtaImage(
  options: CtaImageOptions,
  customFilename?: string
): Promise<void> {
  const dataUrl = await generateCtaImage(options);

  const cleanName = (options.productName || 'producto')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40);

  const filename = customFilename || `pidefacil-${cleanName}-1080x1920-cta.jpg`;

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
  }, 1000);
}
