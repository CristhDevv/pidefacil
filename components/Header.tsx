'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  ShieldCheck,
  ShoppingBag,
  ArrowRight,
  User,
  Briefcase,
  Crown,
  LogOut,
  ChevronDown,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { formatCOP } from '@/config/pricing';
import { getProductDisplayImageUrl } from '@/lib/image-url';
import { useAuth } from '@/context/AuthContext';

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
  const { user, role, isLoggedIn, isSeller, isAdmin, logout, setIsLoginModalOpen, pricingMode, setPricingMode } = useAuth();
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Cerrar menús al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
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
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-extrabold text-lg shadow-sm group-hover:bg-emerald-700 transition">
              <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-baseline">
                <span className="text-xl font-extrabold tracking-tight text-slate-900 font-heading store-logo">
                  Pide<span className="text-emerald-600">Fácil</span>
                </span>
                <span className="text-xs font-bold text-slate-400 ml-0.5 font-heading">.co</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium -mt-1 leading-none hidden sm:block font-sans">
                Pide fácil, paga en casa
              </p>
            </div>
          </Link>

          {/* Badges y Acceso de Usuario Inteligente por Rol */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60 shadow-xs font-sans">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>100% Seguro</span>
            </div>

            {!isLoggedIn ? (
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 px-3 py-1.5 rounded-full border border-slate-200/90 shadow-xs transition active:scale-95 font-sans"
              >
                <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                <span>Soy Vendedor / Entrar</span>
              </button>
            ) : (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full shadow-xs transition font-sans border ${
                    role === 'admin'
                      ? 'bg-amber-50 text-amber-900 border-amber-200/90 hover:bg-amber-100/70'
                      : role === 'operador'
                      ? 'bg-indigo-50 text-indigo-900 border-indigo-200/90 hover:bg-indigo-100/70'
                      : 'bg-blue-50 text-blue-900 border-blue-200/90 hover:bg-blue-100/70'
                  }`}
                >
                  {role === 'admin' ? (
                    <Crown className="w-3.5 h-3.5 text-amber-600" />
                  ) : (
                    <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                  )}
                  <span className="max-w-[95px] sm:max-w-[130px] truncate">{user?.name}</span>
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase text-white ${
                      role === 'admin'
                        ? 'bg-amber-600'
                        : role === 'operador'
                        ? 'bg-indigo-600'
                        : 'bg-blue-600'
                    }`}
                  >
                    {role}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {/* Dropdown del Menú de Usuario */}
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-2 z-50 animate-slide-up text-left">
                    <div className="p-2.5 bg-slate-50 rounded-xl mb-1.5">
                      <p className="text-xs font-black text-slate-900 truncate font-heading">
                        {user?.name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate font-sans">
                        {user?.email}
                      </p>
                      <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                        <span>Rol activo: {role.toUpperCase()}</span>
                      </div>
                    </div>

                    {/* Selector de modo de precios para Vendedor o Admin */}
                    {(role === 'vendedor' || role === 'admin') && (
                      <div className="p-2 border-b border-slate-100 mb-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Visualización de Precios
                        </p>
                        <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px]">
                          <button
                            type="button"
                            onClick={() => setPricingMode('role')}
                            className={`flex-1 py-1 rounded font-bold transition ${
                              pricingMode === 'role'
                                ? 'bg-white text-blue-700 shadow-xs'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            💼 Costos & Ganancia
                          </button>
                          <button
                            type="button"
                            onClick={() => setPricingMode('public')}
                            className={`flex-1 py-1 rounded font-bold transition ${
                              pricingMode === 'public'
                                ? 'bg-white text-emerald-700 shadow-xs'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            🛒 Vista Cliente
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-0.5 font-sans">
                      <Link
                        href="/seller"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center justify-between p-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition group"
                      >
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4 text-emerald-600" />
                          <span>Portal de Despachos COD</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600" />
                      </Link>

                      {(role === 'admin' || role === 'operador') && (
                        <Link
                          href="/admin"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center justify-between p-2 rounded-xl text-xs font-bold text-amber-900 hover:bg-amber-50/70 transition group"
                        >
                          <div className="flex items-center gap-2">
                            <Crown className="w-4 h-4 text-amber-600" />
                            <span>Panel de Control Admin</span>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-amber-400 group-hover:text-amber-700" />
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={async () => {
                          setShowUserMenu(false);
                          await logout();
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
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
            className="w-full pl-9 pr-9 py-2 bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-transparent focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-sans font-medium transition-all"
          />
          {localQuery && (
            <button
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 font-heading"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Autocompletado en Vivo (FTS5 Dropdown) */}
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden z-50 animate-slide-up max-h-[380px] overflow-y-auto">
              <div className="p-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100 font-sans">
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
                        src={getProductDisplayImageUrl(item)}
                        alt={item.name}
                        fill
                        className="object-cover"
                        unoptimized={true}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-700 transition font-heading">
                        {item.name}
                      </p>
                      <p className="text-xs font-extrabold text-[#16A34A] font-price">
                        {formatCOP(item.sell_price_cop)}
                        <span className="text-[9px] text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded ml-1.5 font-sans">
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
