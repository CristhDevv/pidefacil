process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function benchmark() {
  const urls = [
    { name: 'Homepage (1st hit - warm up)', url: 'https://pidefacil-umber.vercel.app/' },
    { name: 'Homepage (2nd hit - Edge CDN ISR)', url: 'https://pidefacil-umber.vercel.app/' },
    { name: 'Catalog API (1st hit - origin)', url: 'https://pidefacil-umber.vercel.app/api/products' },
    { name: 'Catalog API (2nd hit - Edge CDN Cache)', url: 'https://pidefacil-umber.vercel.app/api/products' },
    { name: 'Category Filter (Tecnologia)', url: 'https://pidefacil-umber.vercel.app/api/products?category=tecnologia' },
    { name: 'Category Filter (Tecnologia 2nd hit)', url: 'https://pidefacil-umber.vercel.app/api/products?category=tecnologia' },
    { name: 'Product PDP API 602501 (1st hit)', url: 'https://pidefacil-umber.vercel.app/api/products/602501' },
    { name: 'Product PDP API 602501 (2nd hit)', url: 'https://pidefacil-umber.vercel.app/api/products/602501' },
  ];

  console.log('========================================================================');
  console.log(' BENCHMARK OFICIAL DE VELOCIDAD: PIDEFACIL EN VERCEL EDGE CDN');
  console.log('========================================================================\n');

  for (const item of urls) {
    const t0 = Date.now();
    const res = await fetch(item.url);
    const ms = Date.now() - t0;
    const vCache = res.headers.get('x-vercel-cache') || 'N/A';
    const cControl = res.headers.get('cache-control') || 'N/A';
    console.log(`${item.name.padEnd(42)} | Status: ${res.status} | Time: ${ms.toString().padStart(4)}ms | Vercel-Cache: ${vCache}`);
  }
  console.log('\n========================================================================');
}

benchmark().catch(console.error);
