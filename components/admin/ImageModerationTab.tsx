'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatCOP } from '@/config/pricing';
import { getProductDisplayImageUrl, getOriginalProductImageUrl } from '@/lib/image-url';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Scissors,
  Image as ImageIcon,
  EyeOff,
  Eye,
  RotateCcw,
  Check,
  ExternalLink,
  Sliders,
  Filter,
  Layers,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';

interface ModeratedItem {
  id_dropi: number;
  product_name: string;
  supplier_name: string;
  sell_price_cop: number;
  stock_real: number;
  is_active: number;
  has_burned_price: number;
  detected_text: string | null;
  detected_patterns: string[];
  correction_applied: 'none' | 'swapped_gallery' | 'crop_top' | 'crop_bottom' | 'crop_both' | 'deactivated';
  crop_top_pct: number;
  crop_bottom_pct: number;
  original_image_url: string;
  active_image_url: string;
  review_status: 'pending' | 'approved' | 'reverted';
  analyzed_at: string;
  updated_at: string;
}

interface ModerationStats {
  total_reviewed: number;
  total_marked: number;
  total_swapped: number;
  total_cropped: number;
  total_deactivated: number;
  total_approved: number;
}

export function ImageModerationTab() {
  const [items, setItems] = useState<ModeratedItem[]>([]);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('marked');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Estado para ajustar recorte inline
  const [editingCropId, setEditingCropId] = useState<number | null>(null);
  const [tempCropTop, setTempCropTop] = useState<number>(15);
  const [tempCropBottom, setTempCropBottom] = useState<number>(15);
  const [isSavingAction, setIsSavingAction] = useState<number | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/admin/moderation?filter=${filter}&status=${statusFilter}&page=${page}&limit=20`
      );
      const json = await res.json();
      if (json.success) {
        setItems(json.data || []);
        setStats(json.stats || null);
        setTotalPages(json.pagination?.totalPages || 1);
        setTotalCount(json.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Error cargando moderación:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filter, statusFilter, page]);

  // Ejecutar acción de moderación
  const handleAction = async (
    id_dropi: number,
    action: 'approve' | 'revert' | 'update_crop' | 'toggle_active',
    extra?: any
  ) => {
    setIsSavingAction(id_dropi);
    try {
      const res = await fetch('/api/admin/moderation/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          id_dropi,
          ...extra,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccessMsg(`Acción aplicada para #${id_dropi}`);
        setTimeout(() => setActionSuccessMsg(null), 3000);
        setEditingCropId(null);
        loadData();
      } else {
        alert(json.error || 'Error al procesar acción');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setIsSavingAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. KPI Cards de Moderación OCR */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Revisados OCR
          </p>
          <p className="text-xl font-black text-slate-900 mt-1">
            {stats?.total_reviewed.toLocaleString() || '0'}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Catálogo analizado</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-rose-200/80 bg-rose-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
              Marcados
            </p>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-xl font-black text-rose-700 mt-1">
            {stats?.total_marked.toLocaleString() || '0'}
          </p>
          <p className="text-[10px] text-rose-600/80 mt-0.5">Con textos o precios</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              🔄 Galería
            </p>
            <ImageIcon className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-700 mt-1">
            {stats?.total_swapped.toLocaleString() || '0'}
          </p>
          <p className="text-[10px] text-emerald-600/80 mt-0.5">Foto limpia aplicada</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-indigo-200/80 bg-indigo-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
              ✂️ Recortados
            </p>
            <Scissors className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xl font-black text-indigo-700 mt-1">
            {stats?.total_cropped.toLocaleString() || '0'}
          </p>
          <p className="text-[10px] text-indigo-600/80 mt-0.5">Franja superior/inferior</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-amber-200/80 bg-amber-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              🚫 Desactivados
            </p>
            <EyeOff className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-black text-amber-700 mt-1">
            {stats?.total_deactivated.toLocaleString() || '0'}
          </p>
          <p className="text-[10px] text-amber-600/80 mt-0.5">Texto en el centro</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              ✅ Aprobados
            </p>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-slate-800 mt-1">
            {stats?.total_approved.toLocaleString() || '0'}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Confirmados por dueño</p>
        </div>
      </div>

      {/* 2. Barra de Filtros y Controles */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Tipo:</span>
          </span>
          <button
            onClick={() => {
              setFilter('marked');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === 'marked'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos los Marcados ({stats?.total_marked || 0})
          </button>
          <button
            onClick={() => {
              setFilter('swapped_gallery');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === 'swapped_gallery'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🔄 Galería Cambiada ({stats?.total_swapped || 0})
          </button>
          <button
            onClick={() => {
              setFilter('crop');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === 'crop'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ✂️ Recortados ({stats?.total_cropped || 0})
          </button>
          <button
            onClick={() => {
              setFilter('deactivated');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === 'deactivated'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🚫 Desactivados ({stats?.total_deactivated || 0})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">⏳ Pendientes de revisión</option>
            <option value="approved">✅ Aprobados por el dueño</option>
            <option value="reverted">↩️ Revertidos a original</option>
          </select>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
            title="Recargar lista"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* 3. Lista de Productos Moderados con Comparador ANTES / DESPUÉS */}
      {isLoading ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-600">
            Cargando comparativas de moderación OCR...
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-base font-black text-slate-800">
            Ningún producto en este filtro
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {filter === 'marked'
              ? '¡Excelente! No hay productos con precios quemados pendientes.'
              : 'No hay productos que coincidan con los filtros seleccionados.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const isEditingCrop = editingCropId === item.id_dropi;
            const originalUrl = getOriginalProductImageUrl(item);
            const activeUrl = getProductDisplayImageUrl({
              image_url: item.active_image_url || item.original_image_url,
              crop_top_pct: isEditingCrop ? tempCropTop : item.crop_top_pct,
              crop_bottom_pct: isEditingCrop ? tempCropBottom : item.crop_bottom_pct,
            });

            return (
              <div
                key={item.id_dropi}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden transition-all hover:border-slate-300"
              >
                {/* Cabecera del Producto */}
                <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shadow-2xs">
                      #{item.id_dropi}
                    </span>
                    <Link
                      href={`/producto/${item.id_dropi}`}
                      target="_blank"
                      className="text-sm font-black text-slate-900 hover:text-emerald-700 transition flex items-center gap-1 group"
                    >
                      <span>{item.product_name}</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition" />
                    </Link>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">
                      {item.supplier_name}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-black text-emerald-700">
                      {formatCOP(item.sell_price_cop)}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.is_active === 1
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {item.is_active === 1 ? 'Activo en Tienda' : 'Desactivado'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.review_status === 'approved'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : item.review_status === 'reverted'
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {item.review_status === 'approved'
                        ? '✅ Aprobado'
                        : item.review_status === 'reverted'
                        ? '↩️ Revertido'
                        : '⏳ Pendiente Revisión'}
                    </span>
                  </div>
                </div>

                {/* Cuerpo: Comparativa Visual y Texto Detectado */}
                <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  {/* Panel Izquierdo: Patrones Detectados y Regla Aplicada */}
                  <div className="lg:col-span-5 space-y-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Corrección Automática:
                      </span>
                      <div className="mt-1">
                        {item.correction_applied === 'swapped_gallery' && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                            <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Foto reemplazada por imagen limpia de galería</span>
                          </div>
                        )}
                        {(item.correction_applied === 'crop_top' ||
                          item.correction_applied === 'crop_bottom' ||
                          item.correction_applied === 'crop_both') && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-bold">
                            <Scissors className="w-3.5 h-3.5 text-indigo-600" />
                            <span>
                              Recorte de Franja (
                              {item.crop_top_pct > 0 && `Superior -${item.crop_top_pct}%`}
                              {item.crop_top_pct > 0 && item.crop_bottom_pct > 0 && ' • '}
                              {item.crop_bottom_pct > 0 && `Inferior -${item.crop_bottom_pct}%`}
                              )
                            </span>
                          </div>
                        )}
                        {item.correction_applied === 'deactivated' && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold">
                            <EyeOff className="w-3.5 h-3.5 text-rose-600" />
                            <span>Desactivado preventivamente (Texto invasivo en el centro)</span>
                          </div>
                        )}
                        {item.correction_applied === 'none' && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                            <span>Sin corrección aplicada (Foto original limpia)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Patrones Detectados por OCR */}
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Patrones Comerciales Detectados:
                      </span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {item.detected_patterns && item.detected_patterns.length > 0 ? (
                          item.detected_patterns.map((p, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 border border-rose-200 font-mono text-[11px] font-black"
                            >
                              🚨 {p}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Ningún patrón detectado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Texto OCR Completo */}
                    {item.detected_text && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Texto Completo Extraído por OCR:
                        </span>
                        <div className="mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 max-h-24 overflow-y-auto text-[11px] font-mono text-slate-600 leading-relaxed whitespace-pre-wrap select-all">
                          {item.detected_text}
                        </div>
                      </div>
                    )}

                    {/* Controles para Ajustar Recorte */}
                    {isEditingCrop ? (
                      <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-indigo-900 flex items-center gap-1">
                            <Sliders className="w-3.5 h-3.5" />
                            <span>Ajuste Manual de Recorte:</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingCropId(null)}
                            className="text-[11px] text-slate-500 hover:text-slate-800 font-bold"
                          >
                            Cancelar
                          </button>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <div className="flex justify-between text-[11px] font-bold text-slate-700">
                              <span>Recorte Superior:</span>
                              <span className="text-indigo-700">{tempCropTop}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="30"
                              step="1"
                              value={tempCropTop}
                              onChange={(e) => setTempCropTop(Number(e.target.value))}
                              className="w-full accent-indigo-600"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] font-bold text-slate-700">
                              <span>Recorte Inferior:</span>
                              <span className="text-indigo-700">{tempCropBottom}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="30"
                              step="1"
                              value={tempCropBottom}
                              onChange={(e) => setTempCropBottom(Number(e.target.value))}
                              className="w-full accent-indigo-600"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleAction(item.id_dropi, 'update_crop', {
                              crop_top_pct: tempCropTop,
                              crop_bottom_pct: tempCropBottom,
                            })
                          }
                          disabled={isSavingAction === item.id_dropi}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition"
                        >
                          {isSavingAction === item.id_dropi ? 'Guardando...' : 'Guardar y Aprobar Recorte'}
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {/* Panel Derecho: Comparativa Visual ANTES vs DESPUÉS */}
                  <div className="lg:col-span-7 grid grid-cols-2 gap-4">
                    {/* ANTES: Original Dropi */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md border border-rose-200">
                          Antes (Original Dropi)
                        </span>
                      </div>
                      <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-inner group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={originalUrl}
                          alt="Original Dropi"
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 text-center truncate">
                        URL original sin alterar
                      </p>
                    </div>

                    {/* DESPUÉS: Tienda PideFácil */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                          Después (Tienda PideFácil)
                        </span>
                      </div>
                      <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-inner group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={activeUrl}
                          alt="Resultado en Tienda"
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      </div>
                      <p className="text-[10px] text-emerald-700 font-semibold text-center truncate">
                        {item.correction_applied === 'swapped_gallery'
                          ? 'Foto limpia de galería'
                          : item.crop_top_pct > 0 || item.crop_bottom_pct > 0
                          ? `Transform con recorte activo`
                          : 'Publicado'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer de Acciones para el Dueño */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* Botón Aprobar Corrección */}
                    <button
                      type="button"
                      onClick={() => handleAction(item.id_dropi, 'approve')}
                      disabled={isSavingAction === item.id_dropi}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Aprobar Corrección</span>
                    </button>

                    {/* Botón Ajustar Recorte */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCropId(item.id_dropi);
                        setTempCropTop(item.crop_top_pct || 15);
                        setTempCropBottom(item.crop_bottom_pct || 15);
                      }}
                      className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                    >
                      <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Ajustar Recorte</span>
                    </button>

                    {/* Botón Revertir */}
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`¿Revertir #${item.id_dropi} a la imagen original de Dropi?`)) {
                          handleAction(item.id_dropi, 'revert');
                        }
                      }}
                      disabled={isSavingAction === item.id_dropi}
                      className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Revertir</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Alternar Activo / Desactivado */}
                    <button
                      type="button"
                      onClick={() =>
                        handleAction(item.id_dropi, 'toggle_active', {
                          is_active: item.is_active === 1 ? 0 : 1,
                        })
                      }
                      disabled={isSavingAction === item.id_dropi}
                      className={`px-3 py-2 text-xs font-bold rounded-xl border transition flex items-center gap-1 ${
                        item.is_active === 1
                          ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {item.is_active === 1 ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Desactivar Producto</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Activar Producto</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">
                Página {page} de {totalPages} ({totalCount} productos)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-xs font-bold text-slate-700 rounded-xl transition flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Anterior</span>
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-xs font-bold text-slate-700 rounded-xl transition flex items-center gap-1"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
