'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatCOP } from '@/config/pricing';
import { Truck, CheckCircle2, ArrowRight, Briefcase, Crown, Sparkles } from 'lucide-react';
import { getProductDisplayImageUrl } from '@/lib/image-url';
import { useAuth } from '@/context/AuthContext';

export interface ProductSummary {
  id_dropi: number;
  sku: string | null;
  name: string;
  type: string;
  cost_cop: number;
  suggested_price_cop?: number | null;
  sell_price_cop: number;
  has_price_variance?: boolean;
  min_price_cop?: number;
  max_price_cop?: number;
  duo_price_cop: number;
  duo_savings_cop: number;
  stock_real: number;
  supplier_name: string | null;
  supplier_badge?: string | null;
  image_url: string | null;
  crop_top_pct?: number | null;
  crop_bottom_pct?: number | null;
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
  const { role, isSeller, isAdmin, pricingMode } = useAuth();
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

  const showRolePricing = pricingMode === 'role' && (isSeller || isAdmin || role === 'operador');

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
        <h3 className="text-base font-bold text-slate-800 mb-1 font-heading">
          No encontramos productos
        </h3>
        <p className="text-xs text-slate-500 font-sans">
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
          ? getProductDisplayImageUrl(prod)
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
            className={`bg-white rounded-2xl p-2.5 border shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col justify-between cursor-pointer active:scale-[0.98] select-none group ${
              showRolePricing
                ? 'border-blue-200/90 hover:border-blue-400 bg-gradient-to-b from-blue-50/20 to-white'
                : 'border-slate-100 hover:border-emerald-200'
            }`}
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

                {/* Badge Sutil en Imagen */}
                {showRolePricing ? (
                  prod.supplier_badge === 'PREMIUM EXCLUSIVO' ? (
                    <div className="absolute top-1.5 left-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs font-sans">
                      <Crown className="w-2.5 h-2.5" />
                      <span>Exclusivo</span>
                    </div>
                  ) : prod.supplier_badge === 'PREMIUM' ? (
                    <div className="absolute top-1.5 left-1.5 bg-purple-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs font-sans">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Premium</span>
                    </div>
                  ) : prod.supplier_badge === 'VERIFICADO' || prod.supplier_badge === 'VERIFIED' ? (
                    <div className="absolute top-1.5 left-1.5 bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs font-sans">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>Verificado</span>
                    </div>
                  ) : (
                    <div className="absolute top-1.5 left-1.5 bg-blue-600/95 backdrop-blur-sm text-white text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs font-sans">
                      <Briefcase className="w-2.5 h-2.5" />
                      <span>Venta COD</span>
                    </div>
                  )
                ) : (
                  <div className="absolute top-1.5 left-1.5 bg-amber-100/95 backdrop-blur-sm text-[#B45309] text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs border border-amber-200/50 font-sans">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>Pagas en casa</span>
                  </div>
                )}

                {/* Badge de Stock para Vendedores / Admin */}
                {showRolePricing && prod.stock_real > 0 && (
                  <div className="absolute bottom-1.5 right-1.5 bg-black/60 backdrop-blur-xs text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md font-sans">
                    Stock: {prod.stock_real}
                  </div>
                )}
              </div>

              {/* Título Limpio en Máximo 2 Líneas */}
              <h3 className="product-name font-heading text-xs sm:text-sm font-bold text-slate-800 line-clamp-2 leading-snug mb-1.5 group-hover:text-emerald-700 transition-colors">
                {prod.name}
              </h3>
            </div>

            <div className="pt-1">
              {showRolePricing ? (
                /* VISTA INTELIGENTE DE PRECIOS PARA VENDEDOR / ADMIN */
                <div className="space-y-1.5">
                  <div className="bg-blue-50/80 border border-blue-200/70 rounded-xl p-2 font-sans">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Costo Mayorista:</span>
                      <span className="font-extrabold text-blue-900 font-price">
                        {formatCOP(prod.cost_cop)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] mt-0.5">
                      <span className="text-slate-500 font-medium">PVP Sugerido:</span>
                      <span className="font-semibold text-slate-700 font-price">
                        {prod.has_price_variance ? 'Desde ' : ''}
                        {formatCOP(prod.min_price_cop || prod.sell_price_cop)}
                      </span>
                    </div>
                    <div className="mt-1 pt-1 border-t border-blue-200/50 flex items-center justify-between text-[11px]">
                      <span className="text-emerald-700 font-extrabold">Tu Ganancia:</span>
                      <span className="font-extrabold text-[#16A34A] font-price text-xs">
                        +{formatCOP(Math.max(0, prod.sell_price_cop - prod.cost_cop))}
                      </span>
                    </div>
                  </div>

                  <div className="btn-cta font-heading w-full bg-blue-600 group-hover:bg-blue-700 text-white font-extrabold text-[11px] sm:text-xs py-1.5 px-2 rounded-xl text-center flex items-center justify-center gap-1 transition-all shadow-xs">
                    <Briefcase className="w-3 h-3" />
                    <span>Cotizar / Despachar</span>
                  </div>
                </div>
              ) : (
                /* VISTA REGULAR PARA CLIENTE PÚBLICO */
                <div>
                  {/* Badge Envío Gratis */}
                  <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 mb-1 font-sans">
                    <Truck className="w-3 h-3 text-emerald-600" />
                    <span>Envío Gratis</span>
                  </div>

                  {/* Precios: Anterior Tachado + Final en Negrita 800 #16A34A */}
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[11px] sm:text-xs text-slate-400 line-through font-sans font-normal">
                      {formatCOP(anchorPrice)}
                    </span>
                    <span className="price-tag font-price text-base sm:text-lg font-extrabold text-[#16A34A] tracking-tight">
                      {prod.has_price_variance && (
                        <span className="text-xs font-semibold text-slate-500 mr-1">Desde</span>
                      )}
                      {formatCOP(prod.min_price_cop || prod.sell_price_cop)}
                    </span>
                  </div>

                  {/* Oferta Combo 2x (Más Elegido) */}
                  {prod.duo_price_cop > 0 && prod.duo_price_cop > prod.sell_price_cop && (
                    <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/60 font-sans">
                      <span className="font-medium">🔥 2x por</span>
                      <span className="font-price font-extrabold text-emerald-700 text-[11px] sm:text-xs">
                        {formatCOP(prod.duo_price_cop)}
                      </span>
                    </div>
                  )}

                  {/* Botón Táctil "Ver producto" */}
                  <div className="btn-cta font-heading mt-2 w-full bg-slate-100 group-hover:bg-[#16A34A] group-hover:text-white text-slate-700 group-hover:font-extrabold font-bold text-[11px] sm:text-xs py-1.5 px-2 rounded-xl text-center flex items-center justify-center gap-1 transition-all">
                    <span>Ver producto</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
};
