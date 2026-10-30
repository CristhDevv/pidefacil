import { formatCOP } from '@/config/pricing';

export interface CtaImageOptions {
  imageUrl: string;
  productName: string;
  singlePrice: number;
  duoPrice: number;
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

/**
 * Renderiza la imagen del producto en un canvas de alta definición (1200x1200px)
 * con una franja CTA promocional de alta conversión para ventas en Colombia
 * (Pago Contra Entrega, Envío Gratis, Precio Unitario y Oferta de 2 Unidades).
 */
export async function generateCtaImage(options: CtaImageOptions): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('generateCtaImage solo puede ejecutarse en el cliente');
  }

  const { imageUrl, productName, singlePrice, duoPrice, duoSavings } = options;
  const width = 1200;
  const height = 1200;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo inicializar el contexto de canvas 2D');
  }

  // 1. Cargar la imagen del producto
  const img = await loadProxiedImage(imageUrl);

  // 2. Fondo neutro limpio blanco
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // 3. Dibujar la foto del producto en el área superior (y: 60 a 860, altura disponible 800px)
  const availableWidth = width;
  const availableHeight = 850;
  const imgAspect = (img.width || 1) / (img.height || 1);
  const targetAspect = availableWidth / availableHeight;

  let drawW = availableWidth;
  let drawH = availableHeight;
  let drawX = 0;
  let drawY = 60;

  if (imgAspect > targetAspect) {
    // La imagen es más ancha: ajustar al ancho y centrar verticalmente
    drawW = availableWidth;
    drawH = availableWidth / imgAspect;
    drawY = 60 + (availableHeight - drawH) / 2;
  } else {
    // La imagen es más alta: ajustar al alto y centrar horizontalmente
    drawH = availableHeight;
    drawW = availableHeight * imgAspect;
    drawX = (availableWidth - drawW) / 2;
    drawY = 60;
  }

  ctx.drawImage(img, drawX, drawY, drawW, drawH);

  // 4. Cintillo Superior: "PAGO CONTRA ENTREGA • ENVÍO GRATIS A TODA COLOMBIA"
  const topBarH = 56;
  ctx.fillStyle = '#064E3B'; // Verde esmeralda oscuro de confianza
  ctx.fillRect(0, 0, width, topBarH);

  // Texto cintillo superior
  ctx.font = 'bold 22px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🚚 ENVÍO GRATIS A TODA COLOMBIA  •  💵 PAGA AL RECIBIR EN CASA', width / 2, topBarH / 2);

  // 5. Marca de agua sutil en la esquina superior derecha
  const brandX = width - 140;
  const brandY = topBarH + 20;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  drawRoundedRect(ctx, brandX, brandY, 125, 34, 10);
  ctx.fill();
  ctx.font = '900 16px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#0F172A';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Pide', brandX + 16, brandY + 17);
  ctx.fillStyle = '#0047BA';
  ctx.fillText('Fácil', brandX + 54, brandY + 17);
  ctx.fillStyle = '#94A3B8';
  ctx.font = '700 12px system-ui, -apple-system, sans-serif';
  ctx.fillText('.co', brandX + 96, brandY + 17);
  ctx.restore();

  // =========================================================================
  // 6. FRANJA CTA INFERIOR DE ALTA CONVERSIÓN (y: 860 a 1200, altura: 340px)
  // =========================================================================
  const ctaY = 860;
  const ctaH = 340;

  // Fondo degradado elegante: de esmeralda ultra oscuro a azul noche profundo
  const grad = ctx.createLinearGradient(0, ctaY, 0, height);
  grad.addColorStop(0, '#064E3B');
  grad.addColorStop(0.35, '#0B132B');
  grad.addColorStop(1, '#020617');
  ctx.fillStyle = grad;
  ctx.fillRect(0, ctaY, width, ctaH);

  // Línea divisoria luminosa en el borde superior del CTA
  ctx.fillStyle = '#10B981';
  ctx.fillRect(0, ctaY, width, 5);

  // Título del producto centrado arriba de los precios (1 línea limpia)
  ctx.save();
  ctx.font = 'bold 24px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#F8FAFC';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Acortar si es muy largo
  let cleanName = productName.trim();
  if (ctx.measureText(cleanName).width > width - 80) {
    while (cleanName.length > 10 && ctx.measureText(cleanName + '...').width > width - 80) {
      cleanName = cleanName.slice(0, -1);
    }
    cleanName += '...';
  }
  ctx.fillText(cleanName, width / 2, ctaY + 36);
  ctx.restore();

  // =========================================================================
  // 7. DOS TARJETAS DE PRECIOS PARALELAS (1 UNIDAD vs 2 UNIDADES COMBO HERO)
  // =========================================================================
  const cardW = 540;
  const cardH = 160;
  const cardY = ctaY + 68;

  // -----------------------------------------
  // TARJETA 1: PRECIO 1 UNIDAD (Columna Izq)
  // -----------------------------------------
  const card1X = 40;
  ctx.save();
  // Fondo tarjeta 1
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  drawRoundedRect(ctx, card1X, cardY, cardW, cardH, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Etiqueta superior de la tarjeta 1
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('LLEVA 1 UNIDAD', card1X + cardW / 2, cardY + 16);

  // Precio unitario
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 48px system-ui, -apple-system, sans-serif';
  ctx.fillText(formatCOP(singlePrice), card1X + cardW / 2, cardY + 44);

  // Subetiqueta
  ctx.fillStyle = '#34D399';
  ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
  ctx.fillText('✓ Envío Gratis Incluido', card1X + cardW / 2, cardY + 112);
  ctx.restore();

  // ----------------------------------------------------
  // TARJETA 2: PRECIO 2 UNIDADES (Columna Der - HERO CTA)
  // ----------------------------------------------------
  const card2X = width - cardW - 40;
  ctx.save();
  // Fondo tarjeta 2 (destacada dorada/esmeralda)
  const card2Grad = ctx.createLinearGradient(card2X, cardY, card2X + cardW, cardY + cardH);
  card2Grad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
  card2Grad.addColorStop(1, 'rgba(245, 158, 11, 0.2)');
  ctx.fillStyle = card2Grad;
  drawRoundedRect(ctx, card2X, cardY, cardW, cardH, 20);
  ctx.fill();
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Badge "🔥 MÁS VENDIDO / MEJOR OFERTA" sobre la tarjeta
  const badgeW = 260;
  const badgeH = 30;
  const badgeX = card2X + (cardW - badgeW) / 2;
  const badgeY = cardY - 14;
  ctx.fillStyle = '#F59E0B';
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 15);
  ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.font = '900 13px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🔥 ¡OFERTA 2 UNIDADES! (MÁS ELEGIDO)', badgeX + badgeW / 2, badgeY + badgeH / 2);

  // Etiqueta de la tarjeta 2
  ctx.fillStyle = '#FDE68A';
  ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('LLEVA 2 UNIDADES POR:', card2X + cardW / 2, cardY + 22);

  // Precio 2 unidades (dorado grande de impacto)
  ctx.fillStyle = '#FBBF24';
  ctx.font = '900 52px system-ui, -apple-system, sans-serif';
  ctx.fillText(formatCOP(duoPrice), card2X + cardW / 2, cardY + 48);

  // Ahorro o texto secundario
  const savingsText =
    duoSavings && duoSavings > 0
      ? `💥 AHORRAS ${formatCOP(duoSavings)} (¡Gran Descuento!)`
      : '💥 ¡Super Descuento en la 2da Unidad!';
  ctx.fillStyle = '#6EE7B7';
  ctx.font = '900 15px system-ui, -apple-system, sans-serif';
  ctx.fillText(savingsText, card2X + cardW / 2, cardY + 116);
  ctx.restore();

  // =========================================================================
  // 8. BOTÓN CTA INFERIOR LLAMATIVO (Pide y Paga al Recibir)
  // =========================================================================
  const btnY = cardY + cardH + 16;
  const btnW = width - 80;
  const btnH = 64;
  const btnX = 40;

  ctx.save();
  // Degradado vibrante esmeralda
  const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY);
  btnGrad.addColorStop(0, '#10B981');
  btnGrad.addColorStop(1, '#059669');
  ctx.fillStyle = btnGrad;
  drawRoundedRect(ctx, btnX, btnY, btnW, btnH, 20);
  ctx.fill();

  // Sombra suave en botón
  ctx.strokeStyle = '#34D399';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Texto del botón
  ctx.font = '900 24px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('👉 ¡PIDE AQUÍ Y PAGA EN CASA EN EFECTIVO! 👈', btnX + btnW / 2, btnY + btnH / 2);
  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.94);
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

  const filename = customFilename || `pidefacil-${cleanName}-precios-cta.jpg`;

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
  }, 1000);
}
