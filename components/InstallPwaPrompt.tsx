'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Download, X, Share, PlusSquare, Sparkles, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPwaPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Registrar Service Worker oficial
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('PWA ServiceWorker registrado con éxito:', reg.scope);
          })
          .catch((err) => {
            console.warn('Error registrando ServiceWorker:', err);
          });
      });
    }

    // 2. Comprobar si ya está instalada / modo standalone
    const isAppStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(isAppStandalone);
    if (isAppStandalone) return;

    // 3. Comprobar si el usuario la cerró recientemente
    const dismissedAt = localStorage.getItem('pf_pwa_dismissed_at');
    if (dismissedAt) {
      const daysSinceDismiss = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < 5) {
        return; // No molestar por 5 días si la descartó
      }
    }

    // 4. Detección de iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari =
      /safari/.test(userAgent) &&
      !/chrome/.test(userAgent) &&
      !/crios/.test(userAgent) &&
      !/fxios/.test(userAgent);

    if (isIosDevice && isSafari) {
      setIsIOS(true);
      // Mostrar sugerencia en iOS después de 4 segundos
      const timer = setTimeout(() => setShowPrompt(true), 4000);
      return () => clearTimeout(timer);
    }

    // 5. Capturar evento nativo `beforeinstallprompt` (Android, Chrome, Edge, Windows, Mac)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Mostrar el banner tras 2 segundos de interacción
      setTimeout(() => setShowPrompt(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 6. Detectar cuando se completa la instalación
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // 7. Evento manual desde menús o botones ("Instalar App")
    const handleManualTrigger = () => {
      setShowPrompt(true);
      if (deferredPrompt) {
        deferredPrompt.prompt().catch(() => {});
      }
    };
    window.addEventListener('pf_trigger_install', handleManualTrigger);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pf_trigger_install', handleManualTrigger);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } catch (e) {
      console.warn('Error al ejecutar prompt de instalación:', e);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    try {
      localStorage.setItem('pf_pwa_dismissed_at', Date.now().toString());
    } catch {}
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:bottom-4 z-50 max-w-sm sm:w-[380px] animate-slide-up font-sans">
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-3xl shadow-2xl border border-slate-700/80 relative">
        {/* Botón Cerrar */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition"
          aria-label="Cerrar aviso"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3">
          {/* Icono de la App */}
          <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-emerald-600 shrink-0 shadow-md border border-emerald-400/40">
            <Image
              src="/icons/icon-192x192.png"
              alt="PideFácil App"
              fill
              className="object-cover"
              priority
            />
          </div>

          <div className="flex-1 pr-4">
            <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-extrabold uppercase tracking-wide">
              <Sparkles className="w-3 h-3" />
              <span>Instalar Aplicación</span>
            </div>
            <h4 className="text-sm font-black text-white font-heading tracking-tight mt-0.5">
              PideFácil en tu Teléfono
            </h4>
            <p className="text-[11px] text-slate-300 font-medium leading-relaxed mt-0.5">
              Accede al instante sin escribir URL, con carga ultra rápida y cotizador sin conexión.
            </p>
          </div>
        </div>

        {/* CONTROLES SEGÚN PLATAFORMA */}
        {isIOS ? (
          <div className="mt-3.5 pt-3 border-t border-slate-800 text-[11px] text-slate-300 space-y-1.5 bg-slate-800/60 p-2.5 rounded-2xl">
            <p className="font-bold text-white flex items-center gap-1">
              <span>Para instalar en iPhone / iPad:</span>
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-200">
              <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center font-bold text-[10px]">1</span>
              <span>Toca el botón <strong>Compartir</strong> en Safari</span>
              <Share className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-200">
              <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center font-bold text-[10px]">2</span>
              <span>Selecciona <strong>"Agregar al inicio"</strong></span>
              <PlusSquare className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
        ) : (
          <div className="mt-3.5 pt-2.5 flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-heading font-extrabold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Instalar Gratis</span>
            </button>
            <button
              onClick={handleDismiss}
              className="text-xs font-bold text-slate-400 hover:text-white px-3 py-2.5 rounded-xl transition"
            >
              Ahora no
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
