process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function findProductServiceProv() {
  const res = await fetch('https://app.dropi.co/chunk-AMBWKNRI.js');
  const js = await res.text();

  // Find class h that has getProductById
  const idx = js.indexOf('getProductById(e)');
  // Search forwards for static
  const staticIdx = js.indexOf('static', idx);
  console.log('Static snippet of ProductService:\n', js.slice(staticIdx, staticIdx + 500));
}

findProductServiceProv().catch(console.error);
