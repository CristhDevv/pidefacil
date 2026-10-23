'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { formatCOP } from '@/config/pricing';
import { CodCheckoutModal } from '@/components/CodCheckoutModal';
import { OrderSuccessModal } from '@/components/OrderSuccessModal';
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
} from 'lucide-react';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;

  const [product, setProduct] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariation, setSelectedVariation] = useState<string>('');

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
              setSelectedVariation(firstAvailable.title || firstAvailable.name || '');
            }
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

  const images = product.gallery && product.gallery.length > 0
    ? product.gallery
    : product.image_url
    ? [product.image_url]
    : ['/placeholder.png'];

  const variations = product.variations || [];
  const currentPrice = product.sell_price_cop;

  // Ancla visual de precio anterior tachado
  const anchorPrice =
    product.suggested_price_cop && product.suggested_price_cop > product.sell_price_cop
      ? product.suggested_price_cop
      : Math.round((product.sell_price_cop * 1.35) / 1000) * 1000 + 900;

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 md:pb-12">
      {/* Top Bar PDP */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <Link
            href="/"
            className="p-1 rounded-full text-slate-600 hover:bg-slate-100 transition flex items-center gap-1 text-xs font-bold"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver</span>
          </Link>
          <div className="flex items-center gap-1 text-xs font-bold text-slate-900">
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
            <span>PideFácil.co</span>
          </div>
          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
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
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm shadow flex items-center justify-center text-slate-700 active:scale-95"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm shadow flex items-center justify-center text-slate-700 active:scale-95"
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
          <div className="absolute top-3 left-3 bg-amber-100/95 backdrop-blur-sm text-[#B45309] text-xs font-black px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-xs border border-amber-200/60">
            <span>💵 Pagas en casa al recibir</span>
          </div>
        </div>

        {/* Título, Precios y Stock en Vivo */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <Clock className="w-3 h-3 text-emerald-600" />
              <span>En stock — Despacho inmediato</span>
            </span>
            {product.stock_real < 1000 && (
              <>
                <span className="text-xs text-slate-300">•</span>
                <span className={`text-xs font-semibold ${
                  product.stock_real <= 15 ? 'text-amber-600 font-bold' : 'text-slate-500'
                }`}>
                  {product.stock_real <= 15
                    ? `¡Últimas ${product.stock_real} unidades!`
                    : `${product.stock_real} disponibles`}
                </span>
              </>
            )}
          </div>

          <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
            {product.name}
          </h1>

          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-sm text-slate-400 line-through">
              {formatCOP(anchorPrice)}
            </span>
            <span className="text-2xl font-black text-[#16A34A] tracking-tight">
              {formatCOP(product.sell_price_cop)}
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
              Envío Gratis
            </span>
          </div>
        </div>

        {/* Selector de Variaciones Obligatorio si VARIABLE */}
        {variations.length > 0 && (
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
            <label className="block text-xs font-bold text-slate-800 mb-2.5">
              Selecciona tu opción o color:
            </label>
            <div className="flex flex-wrap gap-2">
              {variations
                .filter((v: any) => v.stock === undefined || v.stock > 0)
                .map((v: any, index: number) => {
                  const label = v.title || v.name || `Opción ${index + 1}`;
                  const isSelected = selectedVariation === label;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedVariation(label)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* Bloque de Confianza con Íconos Limpios */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm grid grid-cols-3 gap-2 text-center">
          <div className="flex flex-col items-center">
            <Banknote className="w-6 h-6 text-emerald-600 mb-1" />
            <span className="text-xs font-bold text-slate-800">Pago en Efectivo</span>
            <span className="text-[10px] text-slate-500">Al transportador</span>
          </div>
          <div className="flex flex-col items-center border-x border-slate-100">
            <Truck className="w-6 h-6 text-emerald-600 mb-1" />
            <span className="text-xs font-bold text-slate-800">Envío Gratis</span>
            <span className="text-[10px] text-slate-500">Toda Colombia</span>
          </div>
          <div className="flex flex-col items-center">
            <ShieldCheck className="w-6 h-6 text-emerald-600 mb-1" />
            <span className="text-xs font-bold text-slate-800">Garantía Total</span>
            <span className="text-[10px] text-slate-500">Por defectos</span>
          </div>
        </div>

        {/* Descripción si está disponible */}
        {product.description && (
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              Detalles del Producto
            </h3>
            <div
              className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2 prose prose-sm max-w-none prose-p:my-1 prose-headings:text-slate-800 prose-strong:text-slate-900 prose-ul:list-disc prose-ul:ml-4 prose-li:my-0.5"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          </div>
        )}
      </div>

      {/* Sticky Bottom Bar en Móvil (Alto Contraste #16A34A) */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 p-3 shadow-2xl">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full bg-[#16A34A] hover:bg-[#15803D] active:scale-[0.98] text-white font-black py-3.5 px-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <span>👉 PEDIR Y PAGAR EN CASA</span>
            <span>—</span>
            <span>{formatCOP(currentPrice)}</span>
          </button>
        </div>
      </div>

      {/* Modal / Drawer 1-Step COD Checkout */}
      {isCheckoutOpen && (
        <CodCheckoutModal
          product={product}
          quantityType="1x"
          selectedVariation={selectedVariation}
          totalAmount={currentPrice}
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
