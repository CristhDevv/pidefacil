'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatCOP } from '@/config/pricing';
import { Truck, CheckCircle2, ArrowRight } from 'lucide-react';

export interface ProductSummary {
  id_dropi: number;
  sku: string | null;
  name: string;
  type: string;
  cost_cop: number;
  suggested_price_cop?: number | null;
  sell_price_cop: number;
  duo_price_cop: number;
  duo_savings_cop: number;
  stock_real: number;
  supplier_name: string | null;
  image_url: string | null;
  categories?: any[];
}

interface ProductGridProps {
  products: ProductSummary[];
  isLoading?: boolean;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  isLoading,
}) => {
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-2.5 border border-slate-100 shadow-sm animate-pulse"
          >
            <div className="aspect-square bg-slate-100 rounded-xl mb-2.5" />
            <div className="h-3.5 bg-slate-100 rounded w-4/5 mb-1.5" />
            <div className="h-3.5 bg-slate-100 rounded w-2/3 mb-3" />
            <div className="h-5 bg-slate-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm max-w-md mx-auto my-6">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
          🔍
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">
          No encontramos productos
        </h3>
        <p className="text-xs text-slate-500">
          Intenta con otro término de búsqueda o selecciona otra categoría.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {products.map((prod, index) => {
        const hasImgError = imgErrors[prod.id_dropi];
        const displayImage = !hasImgError && prod.image_url
          ? prod.image_url
          : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80';

        // Ancla visual de precio anterior tachado
        const anchorPrice =
          prod.suggested_price_cop && prod.suggested_price_cop > prod.sell_price_cop
            ? prod.suggested_price_cop
            : Math.round((prod.sell_price_cop * 1.35) / 1000) * 1000 + 900;

        return (
          <Link
            key={prod.id_dropi}
            href={`/producto/${prod.id_dropi}`}
            className="bg-white rounded-2xl p-2.5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-emerald-200 transition-all flex flex-col justify-between cursor-pointer active:scale-[0.98] select-none group"
          >
            <div>
              {/* Imagen Cuadrada 1:1 Oficial con Fallback */}
              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-50 mb-2 border border-slate-50">
                <Image
                  src={displayImage}
                  alt={prod.name}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  unoptimized={true}
                  priority={index < 4}
                  onError={() =>
                    setImgErrors((prev) => ({ ...prev, [prod.id_dropi]: true }))
                  }
                />

                {/* Badge Sutil: Pagas al recibir */}
                <div className="absolute top-1.5 left-1.5 bg-amber-100/95 backdrop-blur-sm text-[#B45309] text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs border border-amber-200/50">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>Pagas en casa</span>
                </div>
              </div>

              {/* Título Limpio en Máximo 2 Líneas */}
              <h3 className="text-xs font-semibold text-slate-800 line-clamp-2 leading-snug mb-1.5 group-hover:text-emerald-700 transition-colors">
                {prod.name}
              </h3>
            </div>

            <div className="pt-1">
              {/* Badge Envío Gratis */}
              <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 mb-1">
                <Truck className="w-3 h-3 text-emerald-600" />
                <span>Envío Gratis</span>
              </div>

              {/* Precios: Anterior Tachado + Final en Negrita #16A34A */}
              <div className="flex items-baseline gap-1.5">
                <span className="text-[11px] text-slate-400 line-through">
                  {formatCOP(anchorPrice)}
                </span>
                <span className="text-base font-extrabold text-[#16A34A] tracking-tight">
                  {formatCOP(prod.sell_price_cop)}
                </span>
              </div>

              {/* Oferta Combo 2x (Más Elegido) */}
              {prod.duo_price_cop > 0 && prod.duo_price_cop > prod.sell_price_cop && (
                <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/60">
                  <span>🔥 2x por</span>
                  <span className="font-black text-emerald-700">{formatCOP(prod.duo_price_cop)}</span>
                </div>
              )}

              {/* Botón Táctil "Ver oferta" que lleva a la página del producto */}
              <div className="mt-2 w-full bg-slate-100 group-hover:bg-[#16A34A] group-hover:text-white text-slate-700 font-bold text-[11px] py-1.5 px-2 rounded-xl text-center flex items-center justify-center gap-1 transition-all">
                <span>Ver producto</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
};
