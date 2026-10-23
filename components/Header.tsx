'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ShieldCheck, ShoppingBag, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { formatCOP } from '@/config/pricing';

interface HeaderProps {
  onSearch: (query: string) => void;
  searchQuery: string;
  onSelectSuggestion?: (productId: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSearch,
  searchQuery,
  onSelectSuggestion,
}) => {
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce de 250 ms exactos con búsqueda FTS5 instantánea
  useEffect(() => {
    const timer = setTimeout(async () => {
      onSearch(localQuery);

      if (localQuery.trim().length >= 2) {
        try {
          const res = await fetch(
            `/api/products/search?q=${encodeURIComponent(localQuery.trim())}`
          );
          const json = await res.json();
          if (json.success && json.data) {
            setSuggestions(json.data);
            setShowDropdown(true);
          }
        } catch (e) {
          console.error('Autocomplete error:', e);
        }
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [localQuery, onSearch]);

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClear = () => {
    setLocalQuery('');
    onSearch('');
    setSuggestions([]);
    setShowDropdown(false);
  };

  return (
    <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-[29px] z-40 transition-all">
      <div className="max-w-4xl mx-auto px-4 py-2.5">
        <div className="flex items-center justify-between gap-3 mb-2">
          {/* Logo PideFácil */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-lg shadow-sm group-hover:bg-emerald-700 transition">
              <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-baseline">
                <span className="text-xl font-black tracking-tight text-slate-900">
                  Pide<span className="text-emerald-600">Fácil</span>
                </span>
                <span className="text-xs font-semibold text-slate-400 ml-0.5">.co</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium -mt-1 leading-none hidden sm:block">
                Pide fácil, paga en casa
              </p>
            </div>
          </Link>

          {/* Badges de Confianza */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60 shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>100% Seguro</span>
            </div>
          </div>
        </div>

        {/* Buscador Instantáneo FTS5 con Debounce 250ms */}
        <div className="relative" ref={dropdownRef}>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={localQuery}
            onFocus={() => {
              if (suggestions.length > 0) setShowDropdown(true);
            }}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="¿Qué producto buscas hoy? (ej. reloj, luz, tónico, masajeador...)"
            className="w-full pl-9 pr-9 py-2 bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-transparent focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all"
          />
          {localQuery && (
            <button
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Autocompletado en Vivo (FTS5 Dropdown) */}
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden z-50 animate-slide-up max-h-[380px] overflow-y-auto">
              <div className="p-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                Sugerencias rápidas
              </div>
              <div className="divide-y divide-slate-100">
                {suggestions.map((item) => (
                  <Link
                    key={item.id_dropi}
                    href={`/producto/${item.id_dropi}`}
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-3 p-2.5 hover:bg-emerald-50/50 transition group"
                  >
                    <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-100">
                      <Image
                        src={item.image_url || '/placeholder.png'}
                        alt={item.name}
                        fill
                        className="object-cover"
                        unoptimized={true}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-emerald-700 transition">
                        {item.name}
                      </p>
                      <p className="text-[11px] font-bold text-emerald-800">
                        {formatCOP(item.sell_price_cop)}
                        <span className="text-[9px] text-amber-700 font-semibold bg-amber-50 px-1 py-0.2 rounded ml-1.5">
                          Envío Gratis
                        </span>
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
