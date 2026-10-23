process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function findGetMethod() {
  const res = await fetch('https://app.dropi.co/chunk-YTYD5P5F.js');
  const js = await res.text();

  // Find class fe which is ApiService (with apiUrl)
  const idx = js.indexOf('this.apiUrl=b.cas.api_url');
  console.log('Snippet of ApiService methods:\n', js.slice(idx, idx + 1200));
}

findGetMethod().catch(console.error);
