'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { formatCOP, calculateDuoPrice } from '@/config/pricing';
import { getVariationLabel } from '@/lib/variations';
import { detectPackOfferInfo } from '@/lib/pack-detector';
import { getProductDisplayImageUrl } from '@/lib/image-url';
import { CodCheckoutModal } from '@/components/CodCheckoutModal';
import { OrderSuccessModal } from '@/components/OrderSuccessModal';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowLeft,
  ShieldCheck,
  Truck,
  Banknote,
  Flame,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RotateCcw,
  Clock,
  ShoppingBag,
  Briefcase,
  Crown,
  ExternalLink,
  Plus,
  Minus,
  CheckCircle2,
  Building2,
  Info,
} from 'lucide-react';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;
  const { role, isSeller, isAdmin, pricingMode } = useAuth();
  const showRolePricing = pricingMode === 'role' && (isSeller || isAdmin || role === 'operador');

  const [product, setProduct] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariation, setSelectedVariation] = useState<string>('');
  const [selectedVariationId, setSelectedVariationId] = useState<number | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<'2x' | '1x'>('2x'); // 2x Combo es el MÁS ELEGIDO por defecto

  // Estado de cantidades libres multivariante para VENDEDORES COD
  const [variantQuantities, setVariantQuantities] = useState<Record<number, number>>({});
  const [singleQuantity, setSingleQuantity] = useState<number>(1);

  // Control modal checkout COD
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);

  useEffect(() => {
    async function loadProduct() {
      if (!productId) return;
      setIsLoading(true);
      try {
        const res = await fetch(`/api/products/${productId}`);
        const json = await res.json();
        if (json.success && json.data) {
          setProduct(json.data);
          // Si tiene variaciones, preseleccionar la primera con stock
          if (json.data.variations && json.data.variations.length > 0) {
            const firstAvailable = json.data.variations.find((v: any) => v.stock === undefined || v.stock > 0);
            if (firstAvailable) {
              setSelectedVariation(getVariationLabel(firstAvailable, 0));
              setSelectedVariationId(firstAvailable.id || null);
            }
            // Inicializar cantidades de vendedor: 1 unidad en la primera disponible
            const initialQuantities: Record<number, number> = {};
            json.data.variations.forEach((v: any, idx: number) => {
              const varId = v.id || idx + 1;
              const isFirst = (firstAvailable ? (firstAvailable.id || 1) : 1) === varId;
              initialQuantities[varId] = isFirst ? 1 : 0;
            });
            setVariantQuantities(initialQuantities);
          }
        }
      } catch (e) {
        console.error('Error loading product:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadProduct();
  }, [productId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-500">Cargando producto oficial...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="text-center max-w-sm bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-base font-bold text-slate-800 mb-2">Producto no disponible</p>
          <p className="text-xs text-slate-500 mb-4">El producto que buscas ya no está en catálogo o se agotó.</p>
          <Link
            href="/"
            className="inline-block bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl"
          >
            Ver más productos
          </Link>
        </div>
      </div>
    );
  }

  const primaryDisplayImage = getProductDisplayImageUrl(product);
  const images = product.gallery && product.gallery.length > 0
    ? [primaryDisplayImage, ...product.gallery.filter((g: string) => g !== product.image_url)]
    : [primaryDisplayImage];

  const variations = product.variations || [];
  const packInfo = detectPackOfferInfo(product.name);

  // Encontrar la variante activa seleccionada para pricing dinámico
  const activeVariation =
    variations.find((v: any) => (selectedVariationId && v.id === selectedVariationId) || v.label === selectedVariation) ||
    variations[0];

  const activeSellPrice = activeVariation?.sell_price_cop || product.sell_price_cop;
  const activeCost = activeVariation?.cost_cop || product.cost_cop;
  const activeDuoPrice = activeVariation?.duo_price_cop || product.duo_price_cop;
  const activeDuoSavings = activeVariation?.duo_savings_cop || product.duo_savings_cop;
  const currentPrice = selectedOffer === '2x' ? activeDuoPrice : activeSellPrice;
  const activeStock = activeVariation?.stock !== undefined ? activeVariation.stock : product.stock_real;

  // Ancla visual de precio anterior tachado
  const anchorPrice =
    activeVariation?.suggested_price && Number(activeVariation.suggested_price) > activeSellPrice
      ? Number(activeVariation.suggested_price)
      : product.suggested_price_cop && product.suggested_price_cop > activeSellPrice
      ? product.suggested_price_cop
      : Math.round((activeSellPrice * 1.35) / 1000) * 1000 + 900;

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // ----------------------------------------------------------------------------
  // LÓGICA Y CÁLCULOS DINÁMICOS EXCLUSIVOS PARA VENDEDOR COD
  // ----------------------------------------------------------------------------
  const handleUpdateVariantQty = (varId: number, delta: number, maxStock: number) => {
    setVariantQuantities((prev) => {
      const current = prev[varId] || 0;
      const next = Math.max(0, Math.min(maxStock || 9999, current + delta));
      return { ...prev, [varId]: next };
    });
  };

  const handleSetVariantQty = (varId: number, val: number, maxStock: number) => {
    const next = Math.max(0, Math.min(maxStock || 9999, val));
    setVariantQuantities((prev) => ({ ...prev, [varId]: next }));
  };

  const DEFAULT_AVG_FREIGHT = 25000;

  // Lista de items seleccionados por el vendedor
  const sellerSelectedItems =
    variations.length > 0
      ? variations
          .map((v: any, idx: number) => {
            const varId = v.id || idx + 1;
            const qty = variantQuantities[varId] || 0;
            return {
              variationId: varId,
              label: getVariationLabel(v, idx),
              quantity: qty,
              unitCost: v.cost_cop,
              unitPvp: v.sell_price_cop,
              stock: v.stock,
            };
          })
          .filter((it: any) => it.quantity > 0)
      : [
          {
            variationId: null,
            label: 'Estándar',
            quantity: singleQuantity,
            unitCost: activeCost,
            unitPvp: activeSellPrice,
            stock: activeStock,
          },
        ];

  const totalSellerUnits =
    variations.length > 0
      ? sellerSelectedItems.reduce((acc: number, it: any) => acc + it.quantity, 0)
      : singleQuantity;

  const totalSellerCost =
    variations.length > 0
      ? sellerSelectedItems.reduce((acc: number, it: any) => acc + it.unitCost * it.quantity, 0)
      : activeCost * singleQuantity;

  const totalSellerPvp =
    variations.length > 0
      ? sellerSelectedItems.reduce((acc: number, it: any) => acc + it.unitPvp * it.quantity, 0)
      : activeSellPrice * singleQuantity;

  const estimatedFreight = totalSellerUnits > 0 ? DEFAULT_AVG_FREIGHT : 0;
  const totalToPayWarehouse = totalSellerCost + estimatedFreight;
  const estimatedSellerProfit = Math.max(0, totalSellerPvp - totalToPayWarehouse);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 md:pb-12">
      {/* Top Bar PDP */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <Link
            href="/"
            className="p-1 rounded-full text-slate-600 hover:bg-slate-100 transition flex items-center gap-1 text-xs font-bold font-sans"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver</span>
          </Link>
          <div className="flex items-center gap-1 text-xs font-extrabold text-slate-900 font-heading">
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
            <span>PideFácil.co</span>
          </div>
          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-sans">
            🚚 Envío Gratis
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Galería Deslizable */}
        <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-white shadow-sm border border-slate-100">
          <Image
            src={images[activeImageIndex] || '/placeholder.png'}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, 600px"
            className="object-cover"
            priority
            unoptimized={true}
          />

          {images.length > 1 && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm shadow flex items-center justify-center text-slate-700 active:scale-95 font-heading"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm shadow flex items-center justify-center text-slate-700 active:scale-95 font-heading"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-full backdrop-blur-xs">
                {images.map((_: any, idx: number) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === activeImageIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Insignia Flotante: Pagas al recibir */}
          <div className="absolute top-3 left-3 bg-amber-100/95 backdrop-blur-sm text-[#B45309] text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-xs border border-amber-200/60 font-sans">
            <span>💵 Pagas en casa al recibir</span>
          </div>
        </div>

        {/* Título, Precios y Stock en Vivo */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-sans">
              <Clock className="w-3 h-3 text-emerald-600" />
              <span>En stock — Despacho inmediato</span>
            </span>
          </div>

          <h1 className="product-name font-heading text-lg sm:text-2xl font-extrabold text-slate-900 leading-snug">
            {product.name}
          </h1>

          {showRolePricing ? (
            /* VISTA DE PRECIO PARA VENDEDOR: SOLO PRECIO DE COSTO */
            <div className="pt-2 pb-1 space-y-2 font-sans">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Costo Mayorista de Bodega:
                </span>
                <span className="price-tag font-price text-2xl sm:text-3xl font-extrabold text-blue-900 tracking-tight">
                  {formatCOP(activeCost)}
                </span>
                <span className="text-[10px] font-black uppercase text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-md border border-blue-200">
                  Solo Costo de Fábrica
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                <span>
                  PVP sugerido en tienda:{' '}
                  <strong className="text-slate-900 font-bold">{formatCOP(activeSellPrice)}</strong>
                </span>
                <span>•</span>
                <span className="text-emerald-700 font-bold">
                  Tu margen unitario: +{formatCOP(Math.max(0, activeSellPrice - activeCost))}
                </span>
              </div>
            </div>
          ) : (
            /* VISTA REGULAR PARA CLIENTE PÚBLICO */
            <div className="flex items-baseline gap-2.5 pt-1">
              <span className="text-sm sm:text-base text-slate-400 line-through font-sans font-normal">
                {formatCOP(anchorPrice)}
              </span>
              <span className="price-tag font-price text-2xl sm:text-3xl font-extrabold text-[#16A34A] tracking-tight">
                {formatCOP(activeSellPrice)}
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-md font-sans">
                Envío Gratis
              </span>
            </div>
          )}
        </div>

        {/* INSIGNIA DE PROVEEDOR VERIFICADO / PREMIUM / EXCLUSIVO (RECOMENDACIÓN PARA VENDEDORES) */}
        {showRolePricing && (
          <div className="font-sans animate-fade-in">
            {product.supplier_badge === 'PREMIUM EXCLUSIVO' ? (
              <div className="flex items-start gap-3 bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-amber-600/20 border-2 border-amber-400 p-3.5 rounded-3xl text-amber-950 shadow-xs">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-black text-xs uppercase tracking-wider text-amber-900">
                      ⭐ Proveedor Premium Exclusivo
                    </span>
                    <span className="text-[10px] bg-amber-500 text-white font-extrabold px-1.5 py-0.2 rounded">
                      TOP 1%
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">
                    {product.supplier_name || 'Bodega Nacional Aliada'}
                  </p>
                  <p className="text-[11px] text-amber-900/90 leading-tight mt-1">
                    🎯 <strong>Altamente Recomendado:</strong> Despacho prioritario el mismo día, inventario en tiempo real garantizado y tasa de entrega superior al 92% en Colombia.
                  </p>
                </div>
              </div>
            ) : product.supplier_badge === 'PREMIUM' ? (
              <div className="flex items-start gap-3 bg-gradient-to-r from-purple-500/10 to-indigo-500/15 border-2 border-purple-300 p-3.5 rounded-3xl text-purple-950 shadow-xs">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-black text-xs uppercase tracking-wider text-purple-900">
                      💎 Proveedor Premium
                    </span>
                    <span className="text-[10px] bg-purple-600 text-white font-extrabold px-1.5 py-0.2 rounded">
                      RECOMENDADO
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">
                    {product.supplier_name || 'Bodega Nacional Aliada'}
                  </p>
                  <p className="text-[11px] text-purple-900/90 leading-tight mt-1">
                    Bodega de alto volumen y fiabilidad verificada. Embalaje reforzado y cumplimiento estricto de despachos.
                  </p>
                </div>
              </div>
            ) : product.supplier_badge === 'VERIFICADO' || product.supplier_badge === 'VERIFIED' ? (
              <div className="flex items-start gap-3 bg-emerald-50/90 border-2 border-emerald-300 p-3.5 rounded-3xl text-emerald-950 shadow-xs">
                <div className="w-9 h-9 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-black text-xs uppercase tracking-wider text-emerald-900">
                      🛡️ Bodega Verificada
                    </span>
                    <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-1.5 py-0.2 rounded">
                      VERIFICADO
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">
                    {product.supplier_name || 'Bodega Nacional Aliada'}
                  </p>
                  <p className="text-[11px] text-emerald-900/90 leading-tight mt-1">
                    Bodega física nacional auditada documentalmente para despacho con Pago Contra Entrega.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-2xl text-slate-700">
                <Building2 className="w-5 h-5 text-slate-500 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-slate-800">Bodega Nacional: </span>
                  <span>{product.supplier_name || 'Almacén Central Colombia'}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* BLOQUE CENTRAL: CONFIGURADOR MAYORISTA (VENDEDOR) vs OFERTAS B2C (CLIENTE) */}
        {/* ========================================================================= */}
        {showRolePricing ? (
          /* CONFIGURADOR DE PEDIDO MAYORISTA PARA VENDEDOR */
          <div className="space-y-4 font-sans animate-fade-in">
            <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 font-heading flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                    <span>Selección de Variantes y Cantidad a Pedir</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Elige la cantidad de unidades que desees de cada opción disponible.
                  </p>
                </div>
                <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                  Libre Cantidad
                </span>
              </div>

              {/* Si tiene variantes */}
              {variations.length > 0 ? (
                <div className="space-y-2.5">
                  {variations.map((v: any, index: number) => {
                    const varId = v.id || index + 1;
                    const label = getVariationLabel(v, index);
                    const qty = variantQuantities[varId] || 0;
                    const cost = v.cost_cop || activeCost;
                    const pvp = v.sell_price_cop || activeSellPrice;
                    const lineSubtotal = qty * cost;
                    const isOutOfStock = v.stock !== undefined && v.stock <= 0;

                    return (
                      <div
                        key={varId}
                        className={`p-3 rounded-2xl border transition-all ${
                          qty > 0
                            ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20'
                            : 'bg-slate-50/60 border-slate-200/80 hover:border-slate-300'
                        } ${isOutOfStock ? 'opacity-60 bg-slate-100' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs sm:text-sm font-extrabold text-slate-900 truncate font-heading">
                                {label}
                              </span>
                              {v.stock !== undefined && (
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                    v.stock > 10 ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  Stock: {v.stock}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                              <span>
                                Costo:{' '}
                                <strong className="text-blue-900 font-price font-extrabold">
                                  {formatCOP(cost)}
                                </strong>
                              </span>
                              <span>•</span>
                              <span>
                                PVP Sug.:{' '}
                                <strong className="text-slate-700 font-price">{formatCOP(pvp)}</strong>
                              </span>
                            </div>
                          </div>

                          {/* Control Stepper de Cantidad */}
                          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-xs shrink-0">
                            <button
                              type="button"
                              disabled={qty <= 0}
                              onClick={() => handleUpdateVariantQty(varId, -1, v.stock || 9999)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-700 active:scale-95 transition"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={v.stock || 9999}
                              value={qty}
                              onChange={(e) =>
                                handleSetVariantQty(
                                  varId,
                                  parseInt(e.target.value, 10) || 0,
                                  v.stock || 9999
                                )
                              }
                              className="w-10 text-center text-xs font-bold text-slate-900 focus:outline-none font-price"
                            />
                            <button
                              type="button"
                              disabled={isOutOfStock || (v.stock !== undefined && qty >= v.stock)}
                              onClick={() => handleUpdateVariantQty(varId, 1, v.stock || 9999)}
                              className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white active:scale-95 transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {qty > 0 && (
                          <div className="mt-2 pt-1.5 border-t border-blue-200/50 flex items-center justify-between text-xs">
                            <span className="text-slate-500">
                              Subtotal ({qty} {qty === 1 ? 'unidad' : 'unidades'}):
                            </span>
                            <span className="font-price font-extrabold text-blue-900">
                              {formatCOP(lineSubtotal)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Producto Simple (Sin variantes) */
                <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-extrabold text-slate-900 block font-heading">
                        Cantidad de unidades a pedir:
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Costo unitario:{' '}
                        <strong className="text-blue-900 font-price">{formatCOP(activeCost)}</strong> • Stock:{' '}
                        {activeStock}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-xs shrink-0">
                      <button
                        type="button"
                        disabled={singleQuantity <= 1}
                        onClick={() => setSingleQuantity((prev) => Math.max(1, prev - 1))}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-700 active:scale-95 transition"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={activeStock || 9999}
                        value={singleQuantity}
                        onChange={(e) =>
                          setSingleQuantity(
                            Math.max(
                              1,
                              Math.min(activeStock || 9999, parseInt(e.target.value, 10) || 1)
                            )
                          )
                        }
                        className="w-12 text-center text-sm font-extrabold text-slate-900 focus:outline-none font-price"
                      />
                      <button
                        type="button"
                        disabled={activeStock !== undefined && singleQuantity >= activeStock}
                        onClick={() =>
                          setSingleQuantity((prev) => Math.min(activeStock || 9999, prev + 1))
                        }
                        className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white active:scale-95 transition"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Botones de incremento rápido */}
                  <div className="flex items-center gap-2 pt-1 border-t border-blue-200/50">
                    <span className="text-[10px] text-slate-500 font-medium">Acceso rápido:</span>
                    {[1, 2, 5, 10, 20].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setSingleQuantity(amt)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-bold transition font-price ${
                          singleQuantity === amt
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {amt} {amt === 1 ? 'ud' : 'uds'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* SECCIÓN DE FLETE NACIONAL PROMEDIO ($25.000 COP) */}
            <div className="bg-amber-50/70 border border-amber-200/80 p-4 rounded-3xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-900 font-heading font-extrabold text-xs sm:text-sm">
                  <Truck className="w-4 h-4 text-amber-700" />
                  <span>Valor de Flete Promedio Nacional:</span>
                </div>
                <span className="font-price font-extrabold text-sm sm:text-base text-amber-950 bg-amber-200/70 px-2.5 py-0.5 rounded-lg border border-amber-300">
                  {formatCOP(DEFAULT_AVG_FREIGHT)} COP
                </span>
              </div>
              <p className="text-[11px] text-amber-900/90 leading-relaxed font-sans">
                ⚠️ <strong>Nota logística importante:</strong> El valor del flete promedio estimado es de{' '}
                <strong>$25.000 COP</strong> pero puede cambiar y variar según la transportadora (Interrapidísimo,
                Servientrega, Envía, Coordinadora) y el municipio de destino exacto al momento de generar la guía de
                despacho.
              </p>
              <div className="pt-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px]">
                <Link
                  href="/seller"
                  className="text-blue-700 hover:text-blue-800 font-extrabold flex items-center gap-1 hover:underline"
                >
                  <span>¿Deseas cotizar flete exacto por municipio? Ir al Cotizador en Vivo</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>

                {(Boolean(product.has_real_measures) || (Number(product.weight_kg) > 0 && Number(product.length_cm) > 0 && Number(product.width_cm) > 0 && Number(product.height_cm) > 0)) && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300">
                    ⚖️ Medidas: {product.weight_kg} kg ({product.length_cm}x{product.width_cm}x{product.height_cm} cm) — Cotizable en vivo
                  </span>
                )}
              </div>
            </div>

            {/* RESUMEN FINANCIERO DINÁMICO EN TIEMPO REAL (PANEL DE LIQUIDACIÓN) */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white p-5 rounded-3xl shadow-lg border border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="text-xs font-black uppercase tracking-wider text-blue-300 font-heading flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                  <span>Liquidación Financiera en Tiempo Real</span>
                </span>
                <span className="text-[10px] font-extrabold text-white bg-blue-600 px-2.5 py-0.5 rounded-full">
                  {totalSellerUnits} {totalSellerUnits === 1 ? 'Unidad seleccionada' : 'Unidades seleccionadas'}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Subtotal Costo de Fábrica ({totalSellerUnits} uds):</span>
                  <span className="font-price font-bold text-white text-sm">{formatCOP(totalSellerCost)}</span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span>Flete Promedio Estimado (Nacional):</span>
                  <span className="font-price font-bold text-slate-300">{formatCOP(estimatedFreight)}</span>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-blue-200 font-bold">
                  <span>Total Estimado a Pagar a Bodega (Costo + Flete):</span>
                  <span className="font-price font-extrabold text-base text-blue-300">
                    {formatCOP(totalToPayWarehouse)}
                  </span>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-slate-200">
                  <span>Cantidad Sugerida a Cobrar al Cliente:</span>
                  <span className="font-price font-extrabold text-base text-white">{formatCOP(totalSellerPvp)}</span>
                </div>

                <div className="pt-2 border-t-2 border-emerald-500 flex items-center justify-between bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-500/40">
                  <div>
                    <span className="text-xs font-black text-emerald-400 uppercase block font-heading">
                      Tu Ganancia Neta Estimada:
                    </span>
                    <span className="text-[10px] text-emerald-300">Margen libre garantizado</span>
                  </div>
                  <span className="font-price font-black text-lg sm:text-xl text-emerald-400">
                    +{formatCOP(estimatedSellerProfit)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* VISTA REGULAR PARA CLIENTE: Selector de Ofertas 1x vs 2x Combo y Variaciones B2C */
          <>
            {/* Selector de Ofertas: 1x vs Combo 2x (Más Elegido) */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 font-heading">
                  <span>Elige tu Oferta con Envío Gratis:</span>
                </label>
                <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-sans">
                  Pagas al recibir
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {/* Opción 2: COMBO 2X (MÁS ELEGIDO) */}
                <div
                  onClick={() => setSelectedOffer('2x')}
                  className={`relative rounded-2xl p-3.5 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    selectedOffer === '2x'
                      ? 'border-emerald-600 bg-emerald-50/40 shadow-sm ring-2 ring-emerald-600/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="absolute -top-2.5 right-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1 font-heading">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>⭐ MÁS ELEGIDO</span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            selectedOffer === '2x'
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {selectedOffer === '2x' && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight font-heading">
                          {packInfo.duoTitle}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-snug pl-6 mb-2 font-sans">
                      {packInfo.duoExpl}
                    </p>
                  </div>

                  <div className="pl-6 pt-1 flex items-baseline justify-between border-t border-slate-100">
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded font-sans">
                      Ahorras {formatCOP(activeDuoSavings)}
                    </span>
                    <span className="price-tag font-price text-xl sm:text-2xl font-extrabold text-[#16A34A]">
                      {formatCOP(activeDuoPrice)}
                    </span>
                  </div>
                </div>

                {/* Opción 1: PEDIDO INDIVIDUAL */}
                <div
                  onClick={() => setSelectedOffer('1x')}
                  className={`relative rounded-2xl p-3.5 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    selectedOffer === '1x'
                      ? 'border-emerald-600 bg-emerald-50/40 shadow-sm ring-2 ring-emerald-600/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            selectedOffer === '1x'
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {selectedOffer === '1x' && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="text-sm sm:text-base font-bold text-slate-800 leading-tight font-heading">
                          {packInfo.singleTitle}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-snug pl-6 mb-2 font-sans">
                      {packInfo.singleExpl}
                    </p>
                  </div>

                  <div className="pl-6 pt-1 flex items-baseline justify-between border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 font-medium font-sans">Precio regular</span>
                    <span className="price-tag font-price text-xl sm:text-2xl font-extrabold text-slate-800">
                      {formatCOP(activeSellPrice)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Selector de Variaciones para Cliente */}
            {variations.length > 0 && (
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <label className="block text-xs font-bold text-slate-800 mb-2.5 font-heading">
                  Selecciona tu opción o color:
                </label>
                <div className="flex flex-wrap gap-2">
                  {variations
                    .filter((v: any) => v.stock === undefined || v.stock > 0)
                    .map((v: any, index: number) => {
                      const label = getVariationLabel(v, index);
                      const isSelected = selectedVariation === label;
                      return (
                        <button
                          key={v.id || index}
                          type="button"
                          onClick={() => {
                            setSelectedVariation(label);
                            setSelectedVariationId(v.id || null);
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition font-heading flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span>{label}</span>
                          {v.has_custom_price && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-black font-price ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {formatCOP(v.sell_price_cop)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Bloque de Confianza con Íconos Limpios */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm grid grid-cols-3 gap-2 text-center">
          <div className="flex flex-col items-center">
            <Banknote className="w-6 h-6 text-emerald-600 mb-1" />
            <span className="text-xs font-bold text-slate-800 font-heading">Pago en Efectivo</span>
            <span className="text-[10px] text-slate-500 font-sans">Al transportador</span>
          </div>
          <div className="flex flex-col items-center border-x border-slate-100">
            <Truck className="w-6 h-6 text-emerald-600 mb-1" />
            <span className="text-xs font-bold text-slate-800 font-heading">Envío Gratis</span>
            <span className="text-[10px] text-slate-500 font-sans">Toda Colombia</span>
          </div>
          <div className="flex flex-col items-center">
            <ShieldCheck className="w-6 h-6 text-emerald-600 mb-1" />
            <span className="text-xs font-bold text-slate-800 font-heading">Garantía Total</span>
            <span className="text-[10px] text-slate-500 font-sans">Por defectos</span>
          </div>
        </div>

        {/* Descripción si está disponible */}
        {product.description && (
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 font-heading">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              Detalles del Producto
            </h3>
            <div
              className="product-description font-sans text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2 prose prose-sm max-w-none prose-p:my-1 prose-headings:text-slate-800 prose-headings:font-heading prose-headings:font-bold prose-strong:text-slate-900 prose-ul:list-disc prose-ul:ml-4 prose-li:my-0.5"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          </div>
        )}
      </div>

      {/* Sticky Bottom Bar en Móvil (Alto Contraste) */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 p-3 shadow-2xl">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {showRolePricing ? (
            <button
              onClick={() => setIsCheckoutOpen(true)}
              disabled={totalSellerUnits === 0}
              className={`btn-cta font-heading w-full py-3.5 px-4 rounded-2xl shadow-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base ${
                totalSellerUnits === 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-extrabold'
              }`}
            >
              <div className="flex items-center gap-2 font-heading">
                <span>📦 DESPACHAR {totalSellerUnits} {totalSellerUnits === 1 ? 'UNIDAD' : 'UNIDADES'}</span>
                <span>—</span>
                <span className="font-price font-extrabold text-base sm:text-lg">
                  COSTO {formatCOP(totalSellerCost)}
                </span>
              </div>
              <span className="text-[11px] font-sans font-medium text-emerald-100">
                (Cobro sugerido: {formatCOP(totalSellerPvp)} • Ganancia est.: +{formatCOP(estimatedSellerProfit)})
              </span>
            </button>
          ) : (
            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="btn-cta font-heading w-full bg-[#16A34A] hover:bg-[#15803D] active:scale-[0.98] text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <span className="font-heading font-extrabold">
                👉 PEDIR {selectedOffer === '2x' ? packInfo.duoBadge.toUpperCase() : packInfo.singleBadge.toUpperCase()}
              </span>
              <span>—</span>
              <span className="font-price font-extrabold text-base sm:text-lg">{formatCOP(currentPrice)}</span>
            </button>
          )}
        </div>
      </div>

      {/* Modal / Drawer 1-Step COD Checkout */}
      {isCheckoutOpen && (
        <CodCheckoutModal
          product={product}
          quantityType={showRolePricing ? `${totalSellerUnits}x` : selectedOffer}
          selectedVariation={selectedVariation}
          selectedVariationId={selectedVariationId || activeVariation?.id}
          totalAmount={showRolePricing ? totalSellerPvp : currentPrice}
          isSellerMode={showRolePricing}
          sellerItems={showRolePricing ? sellerSelectedItems : undefined}
          estimatedFreight={estimatedFreight}
          onClose={() => setIsCheckoutOpen(false)}
          onSuccess={(orderData) => {
            setIsCheckoutOpen(false);
            setCompletedOrder(orderData);
          }}
        />
      )}

      {/* Pantalla de Éxito Post-Pedido con Botón WhatsApp */}
      {completedOrder && (
        <OrderSuccessModal
          order={completedOrder}
          onClose={() => router.push('/')}
        />
      )}
    </div>
  );
}
