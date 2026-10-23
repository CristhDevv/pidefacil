/**
 * ==============================================================================
 * PideFácil - Detector Inteligente de Packs y Claridad de Ofertas
 * ==============================================================================
 * Resuelve la ambigüedad en productos tipo "Boxer x10 unidades", "Pack x3",
 * "Kit x 4", diferenciando cuándo "2 unidades" significa 2 paquetes completos
 * (20 unidades en total) vs productos individuales como relojes o freidoras.
 */

export interface PackOfferInfo {
  isPack: boolean;
  packSize: number;
  unitWord: string; // "Paquete" | "Unidad"
  singleBadge: string;
  duoBadge: string;
  singleTitle: string;
  duoTitle: string;
  singleExpl: string;
  duoExpl: string;
}

export function detectPackOfferInfo(productName: string): PackOfferInfo {
  const cleanName = productName || '';

  // Patrones para detectar packs múltiples: x10, x 10, pack x3, kit x4, set x12, 10 unidades, 6 pares
  const match =
    cleanName.match(/\b(?:x|pack\s*x?|kit\s*x?|combo\s*x?|set\s*x?|paquete\s*x?)\s*(\d+)\b/i) ||
    cleanName.match(/\b(\d+)\s*(?:unidades|unds?|piezas|pcs?|pares|uds)\b/i);

  if (match) {
    const qty = parseInt(match[1], 10);
    // Rango razonable para packs múltiples (de 2 a 200 piezas)
    if (qty > 1 && qty <= 200) {
      return {
        isPack: true,
        packSize: qty,
        unitWord: 'Paquete',
        singleBadge: `1 Paquete (${qty} uds)`,
        duoBadge: `2 Paquetes (${qty * 2} uds)`,
        singleTitle: `1 Paquete (${qty} unidades incluidas)`,
        duoTitle: `Lleva 2 Paquetes (${qty * 2} unidades en total)`,
        singleExpl: `Recibes 1 paquete sellado con las ${qty} unidades incluidas en la publicación.`,
        duoExpl: `Recibes 2 paquetes completos (¡${qty * 2} unidades en total!). La 2da caja te queda a precio de costo.`,
      };
    }
  }

  // Producto individual estándar
  return {
    isPack: false,
    packSize: 1,
    unitWord: 'Unidad',
    singleBadge: '1 Unidad',
    duoBadge: '2 Unidades',
    singleTitle: '1 Unidad (Pedido Estándar)',
    duoTitle: 'Lleva 2 Unidades (Dúo Pack)',
    singleExpl: 'Recibes 1 producto oficial con envío gratis y garantía.',
    duoExpl: 'Recibes 2 productos idénticos. La 2da unidad te queda a precio de costo de fábrica.',
  };
}
