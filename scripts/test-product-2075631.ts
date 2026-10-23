process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import fs from 'fs';

async function testProduct() {
  const token = fs.readFileSync('.secrets/dropi_token.txt', 'utf8').trim();
  const id = '2075631';
  const url = `https://api.dropi.co/api/products/productlist/v1/show/?id=${id}`;
  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'X-Authorization': 'Bearer ' + token,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://app.dropi.co',
    'Referer': `https://app.dropi.co/dashboard/product-details/${id}/test`,
    'Sec-Fetch-Site': 'same-site',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty',
    'Accept-Language': 'es-419,es;q=0.9,en;q=0.8'
  };

  const res = await fetch(url, { headers });
  console.log(`Product ${id} Status:`, res.status);
  const text = await res.text();
  console.log('Body:', text.slice(0, 300));
  if (res.status === 200) {
    const json = JSON.parse(text);
    console.log('Description:', json.objects?.description);
    console.log('Gallery count:', json.objects?.gallery?.length);
  }
}

testProduct().catch(console.error);
