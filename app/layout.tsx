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
      <head>
        {/* Preconexión optimizada a Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Google Fonts: Plus Jakarta Sans (600, 700, 800) + DM Sans (400, 500, 700) */}
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,400;1,9..40,500;1,9..40,700&family=Plus+Jakarta+Sans:ital,wght@0,600;0,700;0,800;1,600;1,700;1,800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900 pb-16 md:pb-0">
        {/* Cintillo Superior Fijo de Confianza y Urgencia */}
        <header className="sticky top-0 z-50 font-sans">
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
