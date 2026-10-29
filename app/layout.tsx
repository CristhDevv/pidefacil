import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ClientProviders } from '@/components/ClientProviders';

export const metadata: Metadata = {
  title: 'PideFácil — Pide fácil, paga en casa | Colombia',
  description:
    'E-commerce Mobile-First con Pago Contra Entrega en Colombia. Pide tus productos favoritos y paga en efectivo al recibir en la puerta de tu casa.',
  keywords: ['pago contra entrega', 'colombia', 'pide facil', 'paga en casa', 'domicilio gratis'],
  manifest: '/manifest.webmanifest',
  applicationName: 'PideFácil',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PideFácil',
  },
  formatDetection: {
    telephone: true,
  },
  icons: {
    icon: [
      { url: '/icons/favicon-64x64.png', sizes: '64x64', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
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
        {/* Meta tags para PWA e instalación en iOS y Android */}
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="64x64" href="/icons/favicon-64x64.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="PideFácil" />

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

        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
