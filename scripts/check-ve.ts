process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkVe() {
  const res = await fetch('https://app.dropi.co/chunk-YTYD5P5F.js');
  const js = await res.text();

  const idx = js.indexOf('var ve=');
  console.log('Snippet of var ve:\n', js.slice(idx, idx + 1000));
}

checkVe().catch(console.error);
