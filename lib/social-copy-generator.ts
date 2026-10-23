import { formatCOP } from '@/config/pricing';

export interface CopyGeneratorOptions {
  productName: string;
  selectedOffer: '1x' | '2x';
  singlePrice: number;
  anchorPrice: number;
  duoPrice: number;
  duoSavings: number;
  selectedVariation?: string;
  packInfo?: {
    singleTitle: string;
    duoTitle: string;
  };
}

/**
 * Genera un copy publicitario de alta conversión para publicar en:
 * - Estados de WhatsApp
 * - Publicaciones / Historias de Instagram
 * - Marketplace y Grupos de Facebook
 * - TikTok
 */
export function generatePersuasiveCopy(options: CopyGeneratorOptions): string {
  const {
    productName,
    selectedOffer,
    singlePrice,
    anchorPrice,
    duoPrice,
    duoSavings,
    selectedVariation,
    packInfo,
  } = options;

  const isDuo = selectedOffer === '2x';
  const offerTitle = isDuo
    ? (packInfo?.duoTitle || 'Dúo Pack (Llevas 2 Unidades)')
    : (packInfo?.singleTitle || '1 Unidad');

  const mainPrice = isDuo ? duoPrice : singlePrice;

  let text = `🔥 ¡SÚPER OFERTA DISPONIBLE EN COLOMBIA! 🔥\n\n`;
  text += `👉 *${productName}*\n\n`;

  if (isDuo) {
    text += `⭐ *OFERTA ESPECIAL DÚO PACK (MÁS ELEGIDO)* ⭐\n`;
    text += `💥 *Llevas 2 por solo:* ${formatCOP(duoPrice)} COP\n`;
    if (duoSavings > 0) {
      text += `🎁 *¡Te AHORRAS ${formatCOP(duoSavings)} hoy mismo!*\n`;
    }
  } else {
    text += `⭐ *OFERTA 1 UNIDAD:* ${formatCOP(singlePrice)} COP\n`;
    if (anchorPrice > singlePrice) {
      text += `❌ Antes: ~${formatCOP(anchorPrice)} COP~\n`;
    }
  }

  if (selectedVariation && selectedVariation.trim() !== '') {
    text += `\n🎨 *Opción / Variante:* ${selectedVariation}\n`;
  }

  text += `\n✨ *BENEFICIOS INCLUIDOS:*\n`;
  text += `🚚 *ENVÍO TOTALMENTE GRATIS* a cualquier ciudad o municipio de Colombia.\n`;
  text += `💵 *PAGO EN CASA (Contra Entrega):* No pagas nada por adelantado, pagas en efectivo cuando lo recibes en la puerta de tu casa.\n`;
  text += `🛡️ *Garantía Total:* Producto 100% verificado y garantizado.\n\n`;

  text += `📲 *¿CÓMO PEDIR EL TUYO?*\n`;
  text += `¡Es súper fácil! Solo responde a este mensaje o escribe diciendo:\n`;
  text += `*"Hola, quiero pedir el ${productName} (${offerTitle})"* y te tomamos los datos de envío de inmediato. 📦🏃💨\n\n`;
  text += `⚡ *¡Pocas unidades disponibles con precio de promoción! Pide el tuyo ahora.*`;

  return text;
}
