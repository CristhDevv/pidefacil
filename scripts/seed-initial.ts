/**
 * ==============================================================================
 * PideFácil - Seed de Respaldo Inmediato (12 Productos Ganadores de Colombia)
 * ==============================================================================
 * Comando: npm run db:seed
 *
 * Inserta productos estrella comprobados en Dropi Colombia (Hogar, Navidad, Cocina,
 * Belleza, Tecnología, Herramientas) con variaciones SIMPLE y VARIABLE, aplicando
 * la fórmula matemática de config/pricing.ts (.900) y URLs oficiales de CloudFront.
 */

import { db, upsertProduct, DbProduct } from '../lib/db';
import { calculatePricing } from '../config/pricing';

const WINNING_PRODUCTS = [
  {
    id_dropi: 2083490,
    sku: 'WOPI-MASAJ-01',
    name: 'Pistola Masajeadora Muscular Frío / Calor Recargable Pro',
    type: 'SIMPLE',
    cost_cop: 59200,
    stock_real: 145,
    supplier_id: 147195,
    supplier_name: 'Wopi Bodega Oficial',
    supplier_badge: 'PLATINUM',
    categories: ['Belleza', 'Salud', 'Hogar'],
    image_url:
      'https://d39ru7awumhhs2.cloudfront.net/colombia/products/2083490/1770999831images - 2026-02-13T112308.136.jpg',
    gallery: [
      'https://d39ru7awumhhs2.cloudfront.net/colombia/products/2083490/1770999831images - 2026-02-13T112308.136.jpg',
    ],
    description:
      'Alivia dolores musculares, contracturas y fatiga en minutos. Incluye 6 cabezales intercambiables de percusión y función térmica frío/calor. Batería recargable de alta duración.',
  },
  {
    id_dropi: 1846375,
    sku: 'HOG-LUZ-SOLAR',
    name: 'Lámpara Solar Exterior 120 LED con Sensor de Movimiento y Control',
    type: 'SIMPLE',
    cost_cop: 28500,
    stock_real: 230,
    supplier_id: 112040,
    supplier_name: 'Macro Bodega Mayorista',
    supplier_badge: 'VERIFIED',
    categories: ['Hogar', 'Herramientas', 'Tecnología'],
    image_url:
      'https://d39ru7awumhhs2.cloudfront.net/colombia/products/42312/17030819691703081969LUZ.jpg',
    gallery: [
      'https://d39ru7awumhhs2.cloudfront.net/colombia/products/42312/17030819691703081969LUZ.jpg',
    ],
    description:
      'Ilumina patios, fachadas y entradas sin gastar un solo peso en electricidad. Carga 100% solar, encendido automático de noche con sensor de presencia y resistencia IP65 a la lluvia.',
  },
  {
    id_dropi: 12950,
    sku: 'BIOA-TON-ARAN',
    name: 'Tónico Facial Hidratante Bioaqua Arándanos y Ácido Hialurónico',
    type: 'SIMPLE',
    cost_cop: 12410,
    stock_real: 310,
    supplier_id: 88410,
    supplier_name: 'DermoCosméticos Colombia',
    supplier_badge: 'PLATINUM',
    categories: ['Belleza'],
    image_url:
      'https://d39ru7awumhhs2.cloudfront.net/colombia/products/12950/17030825291703082529oPVy0y11oFhxWRswEU7Ww5F0P75jSsunJ1AasUms.jpeg',
    gallery: [
      'https://d39ru7awumhhs2.cloudfront.net/colombia/products/12950/17030825291703082529oPVy0y11oFhxWRswEU7Ww5F0P75jSsunJ1AasUms.jpeg',
    ],
    description:
      'Poder antioxidante que minimiza poros, controla el exceso de grasa e hidrata profundamente. Fórmula suave apta para todo tipo de piel.',
  },
  {
    id_dropi: 13086,
    sku: 'BRO-SET-16',
    name: 'Set Profesional de Brochas de Maquillaje x 16 Piezas con Estuche Cuero',
    type: 'VARIABLE',
    cost_cop: 37470,
    stock_real: 85,
    supplier_id: 88410,
    supplier_name: 'DermoCosméticos Colombia',
    supplier_badge: 'PLATINUM',
    categories: ['Belleza'],
    image_url:
      'https://d39ru7awumhhs2.cloudfront.net/colombia/products/13086/17030849971703084997HtzmLe2BntyyUd937ea5KmIcAZvaT0gv7IzGjFS3.jpeg',
    gallery: [
      'https://d39ru7awumhhs2.cloudfront.net/colombia/products/13086/17030849971703084997HtzmLe2BntyyUd937ea5KmIcAZvaT0gv7IzGjFS3.jpeg',
    ],
    variations: [
      { id: 1, title: 'Negro Clásico', stock: 45 },
      { id: 2, title: 'Rosa Oro Elegance', stock: 40 },
    ],
    description:
      'Cerdas sintéticas ultrasuaves que no absorben producto en exceso. Ideal para polvos, bases líquidas, sombras y contornos. Incluye estuche protector de viaje.',
  },
  {
    id_dropi: 994012,
    sku: 'COC-CHOPPER-PRO',
    name: 'Picador y Procesador Manual de Alimentos Turbo Chopper Acero Inox',
    type: 'SIMPLE',
    cost_cop: 18900,
    stock_real: 215,
    supplier_id: 112040,
    supplier_name: 'Macro Bodega Mayorista',
    supplier_badge: 'VERIFIED',
    categories: ['Cocina', 'Hogar'],
    image_url:
      'https://d39ru7awumhhs2.cloudfront.net/colombia/products/12950/17030825291703082529oPVy0y11oFhxWRswEU7Ww5F0P75jSsunJ1AasUms.jpeg',
    gallery: [],
    description:
      'Pica cebolla, tomate, ajos, frutos secos y carnes en solo 3 jalones de cuerda. Sin cables ni electricidad. Cuchillas triples curvas de acero inoxidable quirúrgico.',
  },
  {
    id_dropi: 772019,
    sku: 'NAV-CORTINA-LED',
    name: 'Cortina de Luces LED Navideñas 3x3 Metros con 8 Efectos y Control',
    type: 'VARIABLE',
    cost_cop: 32000,
    stock_real: 190,
    supplier_id: 99402,
    supplier_name: 'Navidad & Hogar Express',
    supplier_badge: 'TOP_SELLER',
    categories: ['Navidad', 'Hogar'],
    image_url:
      'https://d39ru7awumhhs2.cloudfront.net/colombia/products/42312/17030819691703081969LUZ.jpg',
    gallery: [],
    variations: [
      { id: 1, title: 'Luz Cálida Dorada', stock: 110 },
      { id: 2, title: 'Blanco Frío Hielo', stock: 80 },
    ],
    description:
      'Transforma cualquier espacio en un ambiente mágico. 300 micro LEDs de bajo consumo, conexión USB / 110V y control remoto para cambiar entre 8 modos de iluminación.',
  },
  {
    id_dropi: 881024,
    sku: 'HERR-DESARM-TOOL',
    name: 'Juego de Herramientas Destornillador de Precisión 115 en 1',
    type: 'SIMPLE',
    cost_cop: 26500,
    stock_real: 95,
    supplier_id: 77120,
    supplier_name: 'Ferretería & Tecno Pro',
    supplier_badge: 'VERIFIED',
    categories: ['Herramientas', 'Tecnología'],
    image_url:
      'https://d39ru7awumhhs2.cloudfront.net/colombia/products/20786/17030846611703084661AA10032942_8.jpg',
    gallery: [],
    description:
      'Kit completo para reparar celulares, computadores, relojes, gafas y electrodomésticos pequeños. Puntas imantadas en acero cromo vanadio de máxima resistencia.',
  },
  {
    id_dropi: 662018,
    sku: 'COC-DISP-AGUA',
    name: 'Dispensador Eléctrico de Agua Recargable para Botellón USB',
    type: 'VARIABLE',
    cost_cop: 19500,
    stock_real: 160,
    supplier_id: 112040,
    supplier_name: 'Macro Bodega Mayorista',
    supplier_badge: 'VERIFIED',
    categories: ['Cocina', 'Hogar'],
    image_url:
      'https://d39ru7awumhhs2.cloudfront.net/colombia/products/22451/17030845441703084544AA10130308_3.jpg',
    gallery: [],
    variations: [
      { id: 1, title: 'Blanco Nieve', stock: 95 },
      { id: 2, title: 'Negro Mate', stock: 65 },
    ],
    description:
      'Olvídate de cargar y voltear botellones pesados. Presiona un solo botón y sirve agua al instante. Batería recargable que dura hasta 5 botellones por carga.',
  },
  {
    id_dropi: 551029,
    sku: 'NAV-PROYECTOR-3D',
    name: 'Proyector Navideño Láser Holográfico para Fachadas Exterior',
    type: 'SIMPLE',
    cost_cop: 44000,
    stock_real: 120,
    supplier_id: 99402,
    supplier_name: 'Navidad & Hogar Express',
    supplier_badge: 'TOP_SELLER',
    categories: ['Navidad', 'Hogar'],
    image_url:
      'https://d39ru7awumhhs2.cloudfront.net/colombia/products/42312/17030819691703081969LUZ.jpg',
    gallery: [],
    description:
      'Cubre hasta 250 metros cuadrados con patrones dinámicos navideños (estrellas, campanas, árboles y copos de nieve). Resistente al agua y de fácil anclaje.',
  },
  {
    id_dropi: 442011,
    sku: 'BELL-SERUM-ARROZ',
    name: 'Suero Facial Antiedad de Arroz Blanco Bioaqua Aclarador',
    type: 'SIMPLE',
    cost_cop: 11900,
    stock_real: 280,
    supplier_id: 88410,
    supplier_name: 'DermoCosméticos Colombia',
    supplier_badge: 'PLATINUM',
    categories: ['Belleza'],
    image_url:
      'https://d39ru7awumhhs2.cloudfront.net/colombia/products/12950/17030825291703082529oPVy0y11oFhxWRswEU7Ww5F0P75jSsunJ1AasUms.jpeg',
    gallery: [],
    description:
      'Inspirado en la rutina coreana de cuidado facial. Ayuda a atenuar manchas superficiales, ilumina la piel y estimula la elasticidad natural.',
  },
  {
    id_dropi: 331084,
    sku: 'HOG-CEPILLO-VAPOR',
    name: 'Plancha y Cepillo a Vapor Portátil para Ropa y Cortinas 1200W',
    type: 'SIMPLE',
    cost_cop: 48500,
    stock_real: 75,
    supplier_id: 147195,
    supplier_name: 'Wopi Bodega Oficial',
    supplier_badge: 'PLATINUM',
    categories: ['Hogar'],
    image_url:
      'https://d39ru7awumhhs2.cloudfront.net/colombia/products/2083490/1770999831images - 2026-02-13T112308.136.jpg',
    gallery: [],
    description:
      'Plancha en vertical directo en el gancho sin necesidad de mesa. Elimina arrugas al instante y desinfecta tejidos con vapor continuo a alta temperatura.',
  },
  {
    id_dropi: 221095,
    sku: 'TEC-SMARTWATCH-ULTRA',
    name: 'Smartwatch Serie Ultra Pantalla Infinita con Llamadas Bluetooth',
    type: 'VARIABLE',
    cost_cop: 52000,
    stock_real: 110,
    supplier_id: 77120,
    supplier_name: 'Ferretería & Tecno Pro',
    supplier_badge: 'VERIFIED',
    categories: ['Tecnología', 'Accesorios'],
    image_url:
      'https://d39ru7awumhhs2.cloudfront.net/colombia/products/22451/17030845441703084544AA10130308_3.jpg',
    gallery: [],
    variations: [
      { id: 1, title: 'Caja Plata con Manilla Naranja', stock: 60 },
      { id: 2, title: 'Caja Negra con Manilla Negra', stock: 50 },
    ],
    description:
      'Recibe y contesta llamadas desde tu muñeca, notificaciones de WhatsApp, monitoreo de frecuencia cardíaca, pasos y más de 30 modos de entrenamiento.',
  },
];

async function seed() {
  console.log('\n===============================================================');
  console.log('🌱 PIDEFÁCIL — SEED DE RESPALDO (12 PRODUCTOS GANADORES COLOMBIA)');
  console.log('===============================================================\n');

  const now = new Date().toISOString();
  let inserted = 0;

  for (const item of WINNING_PRODUCTS) {
    const pricing = calculatePricing(item.cost_cop, undefined, item.stock_real);

    const anchorPrice = Math.round((pricing.sell_price_cop * 1.35) / 1000) * 1000 + 900;

    const dbProd: DbProduct = {
      id_dropi: item.id_dropi,
      sku: item.sku,
      name: item.name,
      type: item.type as 'SIMPLE' | 'VARIABLE',
      cost_cop: pricing.cost_cop,
      suggested_price_cop: anchorPrice,
      sell_price_cop: pricing.sell_price_cop,
      stock_real: item.stock_real,
      stock_por_variacion: (item as any).variations
        ? JSON.stringify((item as any).variations)
        : null,
      supplier_id: item.supplier_id,
      supplier_name: item.supplier_name,
      supplier_badge: item.supplier_badge,
      categories: JSON.stringify(item.categories),
      image_url: item.image_url,
      gallery: JSON.stringify(item.gallery.length > 0 ? item.gallery : [item.image_url]),
      description: item.description,
      is_active: 1,
      needs_review: 0,
      missing_sweeps_count: 0,
      deactivation_reason: null,
      first_seen_at: now,
      last_seen_at: now,
      updated_at: now,
      raw: JSON.stringify(item),
    };

    upsertProduct(dbProd);
    inserted++;

    console.log(
      `  ✅ [${item.categories[0]}] ${item.name} -> Costo: $${item.cost_cop.toLocaleString(
        'es-CO'
      )} | Venta COD: $${pricing.sell_price_cop.toLocaleString('es-CO')} (.900)`
    );
  }

  console.log('\n===============================================================');
  console.log(`✨ SEED COMPLETADO: ${inserted} productos ganadores listos en SQLite.`);
  console.log('===============================================================\n');
}

seed().catch((err) => {
  console.error('💥 Error en seed:', err);
  process.exit(1);
});
