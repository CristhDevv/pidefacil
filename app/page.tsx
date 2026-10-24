import { getActiveProducts } from '@/lib/db';
import { calculateDuoPrice } from '@/config/pricing';
import { HomeClient } from '@/components/HomeClient';
import { ProductSummary } from '@/components/ProductGrid';

// Revalidación periódica Edge ISR (60 segundos) para servir la página en <30ms desde la CDN de Vercel
export const revalidate = 60;

export default async function HomePage() {
  const { products: dbProducts, total } = await getActiveProducts({
    limit: 40,
    offset: 0,
  });

  const initialProducts: ProductSummary[] = dbProducts.map((p) => {
    const duo = calculateDuoPrice(p.sell_price_cop, p.cost_cop);
    return {
      id_dropi: p.id_dropi,
      sku: p.sku,
      name: p.name,
      type: p.type,
      cost_cop: p.cost_cop,
      suggested_price_cop: p.suggested_price_cop,
      sell_price_cop: p.sell_price_cop,
      duo_price_cop: duo.duoPriceCop,
      duo_savings_cop: duo.savingsCop,
      stock_real: p.stock_real,
      supplier_name: p.supplier_name,
      image_url: p.image_url,
      crop_top_pct: p.crop_top_pct || 0,
      crop_bottom_pct: p.crop_bottom_pct || 0,
      categories: p.categories ? JSON.parse(p.categories) : [],
    };
  });

  return <HomeClient initialProducts={initialProducts} initialTotal={total} />;
}
