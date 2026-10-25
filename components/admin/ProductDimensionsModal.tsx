'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Package, MapPin, Scale, Box, Check, X, RefreshCw, AlertTriangle } from 'lucide-react';

interface ProductDimensionsModalProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedFields: {
    weight_kg: number | null;
    length_cm: number | null;
    width_cm: number | null;
    height_cm: number | null;
    origin_city_id: number | null;
    origin_city_name: string | null;
  }) => Promise<void>;
}

export function ProductDimensionsModal({
  product,
  isOpen,
  onClose,
  onSave,
}: ProductDimensionsModalProps) {
  const [weightKg, setWeightKg] = useState<string>('');
  const [lengthCm, setLengthCm] = useState<string>('');
  const [widthCm, setWidthCm] = useState<string>('');
  const [heightCm, setHeightCm] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('BOGOTA D.C.');
  const [selectedCityId, setSelectedCityId] = useState<number>(1);
  const [selectedCityName, setSelectedCityName] = useState<string>('BOGOTA, D.C.');

  const [geoData, setGeoData] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cargar geografía
  useEffect(() => {
    async function loadGeo() {
      try {
        const res = await fetch('/api/geography/cities');
        const json = await res.json();
        if (json.success) {
          setGeoData(json.data || []);
        }
      } catch (err) {
        console.error('Error cargando geografía:', err);
      }
    }
    loadGeo();
  }, []);

  // Inicializar campos con datos del producto
  useEffect(() => {
    if (product) {
      setWeightKg(product.weight_kg !== null && product.weight_kg !== undefined ? String(product.weight_kg) : '');
      setLengthCm(product.length_cm !== null && product.length_cm !== undefined ? String(product.length_cm) : '');
      setWidthCm(product.width_cm !== null && product.width_cm !== undefined ? String(product.width_cm) : '');
      setHeightCm(product.height_cm !== null && product.height_cm !== undefined ? String(product.height_cm) : '');

      if (product.origin_city_name) {
        setSelectedCityName(product.origin_city_name);
        if (product.origin_city_id) {
          setSelectedCityId(Number(product.origin_city_id));
        }
      } else {
        setSelectedCityName('BOGOTA, D.C.');
        setSelectedCityId(1);
      }
      setErrorMsg(null);
    }
  }, [product]);

  // Sincronizar depto cuando cambia geoData o selectedCityId
  useEffect(() => {
    if (geoData.length > 0 && selectedCityId) {
      for (const d of geoData) {
        const found = d.cities?.find((c: any) => c.id === selectedCityId);
        if (found) {
          setSelectedDept(d.name);
          break;
        }
      }
    }
  }, [geoData, selectedCityId]);

  const currentCities = useMemo(() => {
    if (!geoData.length) return [];
    const deptObj = geoData.find((d) => d.name === selectedDept);
    return deptObj?.cities || [];
  }, [geoData, selectedDept]);

  // Cálculos en vivo
  const w = parseFloat(weightKg) || 0;
  const l = parseFloat(lengthCm) || 0;
  const wi = parseFloat(widthCm) || 0;
  const h = parseFloat(heightCm) || 0;

  const volumetricWeight = l > 0 && wi > 0 && h > 0 ? Number(((l * wi * h) / 6000).toFixed(2)) : 0;
  const chargeableWeight = Math.max(w, volumetricWeight);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);

    const wNum = parseFloat(weightKg);
    const lNum = parseFloat(lengthCm);
    const wiNum = parseFloat(widthCm);
    const hNum = parseFloat(heightCm);

    if (
      (weightKg && isNaN(wNum)) ||
      (lengthCm && isNaN(lNum)) ||
      (widthCm && isNaN(wiNum)) ||
      (heightCm && isNaN(hNum))
    ) {
      setErrorMsg('Por favor introduce valores numéricos válidos');
      setIsSaving(false);
      return;
    }

    try {
      await onSave({
        weight_kg: !isNaN(wNum) && wNum > 0 ? wNum : null,
        length_cm: !isNaN(lNum) && lNum > 0 ? lNum : null,
        width_cm: !isNaN(wiNum) && wiNum > 0 ? wiNum : null,
        height_cm: !isNaN(hNum) && hNum > 0 ? hNum : null,
        origin_city_id: selectedCityId || null,
        origin_city_name: selectedCityName || null,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar dimensiones');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Box className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Dimensiones & Origen Dropi</h3>
              <p className="text-[11px] text-slate-300">ID Dropi: {product.id_dropi} • {product.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {(!product.weight_kg || !product.length_cm) && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
              <span>
                Este producto no tiene medidas registradas. Los vendedores no podrán cotizar su flete en vivo hasta que se completen.
              </span>
            </div>
          )}

          {/* Dimensiones físicas */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-emerald-600" />
              <span>Peso y Paquete</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Peso Real (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Ej: 0.5"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Largo (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  placeholder="Ej: 20"
                  value={lengthCm}
                  onChange={(e) => setLengthCm(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Ancho (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  placeholder="Ej: 15"
                  value={widthCm}
                  onChange={(e) => setWidthCm(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Alto (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  placeholder="Ej: 10"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Cálculo de peso cobrable */}
            {w > 0 && l > 0 && wi > 0 && h > 0 && (
              <div className="mt-2.5 p-2.5 bg-emerald-50/70 border border-emerald-200/60 rounded-xl flex items-center justify-between text-[11px] text-slate-700">
                <span>
                  Volumétrico: <strong>{volumetricWeight} kg</strong>
                </span>
                <span>•</span>
                <span>
                  Peso Cobrable Dropi: <strong className="text-emerald-700 font-black">{chargeableWeight} kg</strong>
                </span>
              </div>
            )}
          </div>

          {/* Origen del Proveedor */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>Ciudad Origen del Proveedor (Bodega Dropi)</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Departamento</label>
                <select
                  value={selectedDept}
                  onChange={(e) => {
                    const nextDept = e.target.value;
                    setSelectedDept(nextDept);
                    const dObj = geoData.find((d) => d.name === nextDept);
                    if (dObj?.cities?.length > 0) {
                      setSelectedCityId(dObj.cities[0].id);
                      setSelectedCityName(dObj.cities[0].name);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {geoData.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Ciudad / Municipio (ID Dropi)</label>
                <select
                  value={selectedCityId}
                  onChange={(e) => {
                    const cId = Number(e.target.value);
                    setSelectedCityId(cId);
                    const found = currentCities.find((c: any) => c.id === cId);
                    if (found) setSelectedCityName(found.name);
                  }}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {currentCities.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (ID: {c.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Esta ciudad se usa como punto remitente para simular el flete exacto de la transportadora.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center gap-1.5 active:scale-95"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Guardar Medidas</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
