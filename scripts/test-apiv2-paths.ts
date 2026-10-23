process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import fs from 'fs';

async function testApiV2() {
  const dropiToken = fs.readFileSync('.secrets/dropi_token.txt', 'utf8').trim();
  const casToken = fs.readFileSync('.secrets/cas_token.txt', 'utf8').trim();
  const id = '2075631';

  const paths = [
    `/products/${id}`,
    `/product/${id}`,
    `/products/detail/${id}`,
    `/products/productlist/v1/show/?id=${id}`,
    `/produit/${id}`,
    `/produit/detail/${id}`,
    `/api/products/${id}`
  ];

  for (const p of paths) {
    const url = `https://api-v2.dropi.co${p}`;
    for (const [tName, tok] of [['DROPI', dropiToken], ['CAS', casToken]]) {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'X-Authorization': `Bearer ${tok}`,
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        const text = await res.text();
        console.log(`[${res.status}] ${url} (${tName}) -> ${text.slice(0, 100)}`);
      } catch (e: any) {
        console.error(e.message);
      }
    }
  }
}

testApiV2().catch(console.error);
