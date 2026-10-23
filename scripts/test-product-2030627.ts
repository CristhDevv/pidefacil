process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import fs from 'fs';

async function testProduct() {
  const token = fs.readFileSync('.secrets/dropi_token.txt', 'utf8').trim();
  const id = 2030627;
  const url = `https://api.dropi.co/api/products/productlist/v1/show/?id=${id}`;
  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'X-Authorization': 'Bearer ' + token,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://app.dropi.co',
    'Referer': `https://app.dropi.co/dashboard/product-details/${id}/producto`,
    'Sec-Fetch-Site': 'same-site',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty',
    'Accept-Language': 'es-419,es;q=0.9,en;q=0.8'
  };

  try {
    const res = await fetch(url, { headers });
    console.log(`Status for ${id}:`, res.status);
    const text = await res.text();
    console.log(`Body:`, text.slice(0, 300));
  } catch (e: any) {
    console.error('Fetch error:', e);
  }
}

testProduct().catch(console.error);
