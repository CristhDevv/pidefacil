import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PideFácil — Paga en Casa Colombia',
    short_name: 'PideFácil',
    description: 'E-commerce mobile-first con pago contra entrega en toda Colombia. Pide fácil y paga en efectivo al recibir.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F8FAFC',
    theme_color: '#16a34a',
    orientation: 'portrait-primary',
    lang: 'es-CO',
    categories: ['shopping', 'business', 'lifestyle'],
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    shortcuts: [
      {
        name: 'Catálogo de Ofertas',
        short_name: 'Ofertas',
        description: 'Ver los productos más vendidos con pago contra entrega',
        url: '/',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Portal de Vendedores COD',
        short_name: 'Vendedores',
        description: 'Cotizar fletes Dropi y despachar pedidos',
        url: '/seller',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
    ],
  };
}
