process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function findCatalogRoute() {
  const res = await fetch('https://app.dropi.co/chunk-XLTOHA7I.js');
  const js = await res.text();
  console.log('Size of Dashboard chunk:', js.length);

  // Search for products or catalog routes
  const re = /path:\s*["']([^"']+)["']/g;
  let m;
  const paths: string[] = [];
  while ((m = re.exec(js)) !== null) {
    paths.push(m[1]);
  }
  console.log('Dashboard child routes:', paths);

  // Look for any route with 'product' or 'catalog'
  for (const p of paths) {
    if (p.includes('prod') || p.includes('cat')) {
      const idx = js.indexOf(`path:"${p}"`);
      console.log(`Route "${p}" definition:\n`, js.slice(Math.max(0, idx - 50), idx + 250));
    }
  }
}

findCatalogRoute().catch(console.error);
