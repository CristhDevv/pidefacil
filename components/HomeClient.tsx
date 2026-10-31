'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '@/components/Header';
import { CategoryPills } from '@/components/CategoryPills';
import { ProductGrid, ProductSummary } from '@/components/ProductGrid';
import { Truck, Sparkles } from 'lucide-react';

interface HomeClientProps {
  initialProducts: ProductSummary[];
  initialTotal: number;
}

export const HomeClient: React.FC<HomeClientProps> = ({
  initialProducts,
  initialTotal,
}) => {
  const [products, setProducts] = useState<ProductSummary[]>(initialProducts);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todo');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(Math.ceil(initialTotal / 40) || 1);
  const [totalProducts, setTotalProducts] = useState(initialTotal);
  const [isReady, setIsReady] = useState(false);

  const lastFetchedKeyRef = useRef<string>('');

  const fetchProducts = useCallback(
    async (query = searchQuery, category = selectedCategory, pageNum = 1) => {
      const fetchKey = `${query}::${category}::${pageNum}`;
      lastFetchedKeyRef.current = fetchKey;
      setIsLoading(true);
      try {
        const catParam = category === 'todo' ? '' : category;
        const res = await fetch(
          `/api/products?q=${encodeURIComponent(query)}&category=${encodeURIComponent(
            catParam
          )}&page=${pageNum}&limit=40`
        );
        const json = await res.json();
        if (json.success) {
          setProducts(json.data);
          setTotalPages(json.pagination.totalPages);
          setTotalProducts(json.pagination.total);
        }
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [searchQuery, selectedCategory]
  );

  // 1. Restaurar búsqueda al montar (desde URL ?q=... o sessionStorage)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Marcador de navegación dentro del catálogo
    sessionStorage.setItem('pidefacil_from_catalog', 'true');

    const urlParams = new URLSearchParams(window.location.search);
    const qParam = urlParams.get('q');
    const stored = sessionStorage.getItem('pidefacil_last_search');
    const restoredQuery = (qParam !== null ? qParam : (stored || '')).trim();

    if (restoredQuery) {
      setSearchQuery(restoredQuery);
      fetchProducts(restoredQuery, selectedCategory, 1);
    } else {
      lastFetchedKeyRef.current = `::${selectedCategory}::1`;
    }
    setIsReady(true);
  }, []); // Solo al montar

  // 2. Ejecutar búsqueda cuando cambie searchQuery, categoría o página
  useEffect(() => {
    if (!isReady) return;

    const currentKey = `${searchQuery}::${selectedCategory}::${page}`;
    if (lastFetchedKeyRef.current === currentKey) {
      return;
    }

    fetchProducts(searchQuery, selectedCategory, page);
  }, [searchQuery, selectedCategory, page, fetchProducts, isReady]);

  // 3. Sincronizar URL y sessionStorage con la búsqueda activa
  useEffect(() => {
    if (!isReady || typeof window === 'undefined') return;
    const trimmed = searchQuery.trim();
    if (trimmed) {
      sessionStorage.setItem('pidefacil_last_search', trimmed);
      const url = new URL(window.location.href);
      if (url.searchParams.get('q') !== trimmed) {
        url.searchParams.set('q', trimmed);
        window.history.replaceState(null, '', url.toString());
      }
    } else {
      sessionStorage.removeItem('pidefacil_last_search');
      const url = new URL(window.location.href);
      if (url.searchParams.has('q')) {
        url.searchParams.delete('q');
        const cleanUrl = url.pathname + (url.search ? url.search : '');
        window.history.replaceState(null, '', cleanUrl);
      }
    }
  }, [searchQuery, isReady]);

  // 4. Manejar navegación con botones de atrás/adelante del navegador (popstate)
  useEffect(() => {
    if (!isReady || typeof window === 'undefined') return;
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const q = (urlParams.get('q') || '').trim();
      setSearchQuery(q);
      setPage(1);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isReady]);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setPage(1);
  };

  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat);
    setPage(1);
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      {/* Header Fijo con Buscador Instantáneo FTS5 */}
      <Header onSearch={handleSearch} searchQuery={searchQuery} />

      {/* Píldoras de Categorías Deslizables (Swipeable) */}
      <CategoryPills
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
      />

      {/* Banner Promocional Limpio */}
      <div className="max-w-4xl mx-auto px-4 pt-3.5 pb-1">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-200 mb-0.5 font-sans">
              <Sparkles className="w-3.5 h-3.5" />
              <span>OFERTAS DE PAGO CONTRA ENTREGA</span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold leading-tight font-heading">
              Paga en Efectivo al Recibir en tu Puerta
            </h2>
            <p className="text-xs text-emerald-100 font-normal mt-0.5 font-sans">
              Sin tarjetas ni transferencias previas. Cero riesgo.
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-center bg-white/10 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/20 text-center font-heading">
            <Truck className="w-6 h-6 text-emerald-100 mb-1" />
            <span className="text-[10px] font-bold">100% Gratis</span>
          </div>
        </div>
      </div>

      {/* Catálogo de Productos Mobile-First (Cada uno con enlace directo a /producto/[id]) */}
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-3 text-xs text-slate-500 font-medium font-sans">
          <span>
            {isLoading
              ? 'Buscando productos...'
              : 'Catálogo Oficial • Envío Gratis y Pago en Casa'}
          </span>
          {searchQuery && (
            <span className="text-emerald-700 font-semibold font-sans">
              Búsqueda: &ldquo;{searchQuery}&rdquo;
            </span>
          )}
        </div>

        <ProductGrid
          products={products}
          isLoading={isLoading}
          searchQuery={searchQuery}
        />

        {/* Paginación Limpia */}
        {totalPages > 1 && !isLoading && (
          <div className="flex items-center justify-center gap-2 mt-8 mb-6">
            <button
              disabled={page <= 1}
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-4 py-2 bg-white text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition font-heading"
            >
              Anterior
            </button>
            <span className="text-xs font-semibold text-slate-600 px-3 font-sans">
              Página {page} de {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => {
                setPage((p) => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-4 py-2 bg-white text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition font-heading"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* Footer Minimalista de Confianza */}
      <footer className="bg-white border-t border-slate-200/80 py-8 px-4 mt-8">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center text-white font-extrabold text-xs font-heading">
              PF
            </div>
            <span className="text-sm font-extrabold text-slate-800 font-heading">
              PideFácil.co
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-sans font-normal">
            La plataforma líder de comercio electrónico con Pago Contra Entrega en Colombia.
            Envíos asegurados a más de 1.100 municipios del país.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs font-medium text-slate-600 pt-2 font-sans">
            <span>🛡️ Garantía PideFácil</span>
            <span>•</span>
            <span>💵 Pago en Efectivo</span>
            <span>•</span>
            <span>🚚 Despacho Nacional</span>
          </div>
          <p className="text-[10px] text-slate-400 pt-2 font-sans">
            © 2026 PideFácil Colombia — Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </main>
  );
};
