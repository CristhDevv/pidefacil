'use client';

import React, { useState, useEffect } from 'react';
import { Key, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, Lock, ExternalLink } from 'lucide-react';

export function DropiTokenCard() {
  const [tokenStatus, setTokenStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newTokenInput, setNewTokenInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const checkTokenStatus = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/dropi-token');
      const json = await res.json();
      if (json.success) {
        setTokenStatus(json);
      } else {
        setTokenStatus({ status: 'unknown', message: json.error || 'Error al consultar token' });
      }
    } catch {
      setTokenStatus({ status: 'unknown', message: 'Error de red al consultar token de Dropi' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkTokenStatus();
  }, []);

  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenInput.trim()) return;

    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/dropi-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: newTokenInput.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({
          type: 'success',
          text: json.status === 'valid'
            ? '✅ Token guardado y verificado en vivo con Dropi API v2.'
            : '⚠️ Token guardado, pero Dropi respondió 401/403. Por favor verifica que el token esté vigente.',
        });
        setNewTokenInput('');
        checkTokenStatus();
      } else {
        setMessage({ type: 'error', text: json.error || 'Error al guardar token' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de red al guardar token' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
            <Key className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>Token de Autenticación Dropi (Cotización en Vivo)</span>
              {tokenStatus?.status === 'valid' && (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                  Activo
                </span>
              )}
              {tokenStatus?.status === 'expired' && (
                <span className="text-[10px] font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                  Expirado
                </span>
              )}
              {tokenStatus?.status === 'missing' && (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                  No Configurado
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500">
              Permite a los vendedores cotizar fletes en tiempo real mediante la API Dropi v2 (/bff/orders/quote).
            </p>
          </div>
        </div>

        <button
          onClick={checkTokenStatus}
          disabled={isLoading}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
          title="Verificar token en vivo"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Estado actual del token */}
      <div className="p-3.5 rounded-2xl border text-xs font-medium space-y-2 bg-slate-50 border-slate-200">
        <div className="flex items-center gap-2">
          {tokenStatus?.status === 'valid' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : tokenStatus?.status === 'expired' ? (
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          ) : (
            <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
          )}
          <span className="text-slate-800 font-bold">
            {isLoading ? 'Verificando estado con Dropi...' : tokenStatus?.message || 'Estado no disponible'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] text-slate-600 border-t border-slate-200/60 font-sans">
          <div>
            <span className="text-slate-400">Almacenamiento:</span>{' '}
            <span className="font-semibold text-slate-800">{tokenStatus?.storage_location || 'Consultando...'}</span>
          </div>
          {tokenStatus?.hours_remaining !== undefined && tokenStatus?.hours_remaining !== null && (
            <div>
              <span className="text-slate-400">Vigencia estimada:</span>{' '}
              <span className={`font-semibold ${tokenStatus.hours_remaining <= 2 ? 'text-amber-700 font-bold' : 'text-emerald-700'}`}>
                {tokenStatus.hours_remaining > 0 ? `${tokenStatus.hours_remaining} horas restantes` : 'Expirado'}
              </span>
            </div>
          )}
        </div>

        {tokenStatus?.token_preview && (
          <p className="text-[10px] font-mono text-slate-400 pt-0.5">
            Token actual: {tokenStatus.token_preview}
          </p>
        )}
      </div>

      {message && (
        <div
          className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Formulario para renovar token */}
      <form onSubmit={handleSaveToken} className="space-y-3 pt-2 border-t border-slate-100">
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Actualizar Token Dropi (Bearer JWT)
          </label>
          <input
            type="text"
            value={newTokenInput}
            onChange={(e) => setNewTokenInput(e.target.value)}
            placeholder="Pega aquí el nuevo token de app.dropi.co..."
            className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <p className="text-[10px] text-slate-400 mt-1">
            El token nunca se expone al navegador ni a los clientes públicos. Se almacena de forma segura en el servidor.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <a
            href="https://app.dropi.co"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
          >
            <span>Abrir app.dropi.co</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            type="submit"
            disabled={isSaving || !newTokenInput.trim()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-xs"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Validando...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Guardar y Validar</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
