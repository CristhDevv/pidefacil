import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PideFácil — Pide fácil, paga en casa | Colombia',
  description:
    'E-commerce Mobile-First con Pago Contra Entrega en Colombia. Pide tus productos favoritos y paga en efectivo al recibir en la puerta de tu casa.',
  keywords: ['pago contra entrega', 'colombia', 'pide facil', 'paga en casa', 'domicilio gratis'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#16a34a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="bg-[#F8FAFC]">
      <body className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased selection:bg-emerald-100 selection:text-emerald-900 pb-16 md:pb-0">
        {/* Cintillo Superior Fijo de Confianza y Urgencia */}
        <header className="sticky top-0 z-50">
          <div className="bg-emerald-700 text-white text-xs font-semibold py-1.5 px-3 text-center tracking-wide flex items-center justify-center gap-1.5 shadow-sm">
            <span>🇨🇴</span>
            <span>Envío Gratis + Pago Contra Entrega en toda Colombia</span>
          </div>
        </header>

        {children}
      </body>
    </html>
  );
}
