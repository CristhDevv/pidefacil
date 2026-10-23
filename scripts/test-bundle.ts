process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import fs from 'fs';

async function testApiDropiCo() {
  const token = fs.readFileSync('.secrets/dropi_token.txt', 'utf8').trim();
  const id = 2075631;

  const endpoints = [
    'https://api.dropi.co/api/products/productlist/v1/show/?id=' + id,
    'https://api.dropi.co/api/products/v2/' + id,
    'https://api.dropi.co/api/products/' + id,
    'https://app.dropi.co/api/products/productlist/v1/show/?id=' + id,
  ];

  for (const url of endpoints) {
    console.log('\n--- Testing:', url, '---');
    for (const authHeader of ['X-Authorization', 'Authorization']) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };
        headers[authHeader] = 'Bearer ' + token;
        const res = await fetch(url, { method: 'GET', headers });
        console.log(`With ${authHeader} -> Status:`, res.status, res.statusText);
        const text = await res.text();
        console.log('Snippet:', text.slice(0, 300));
        if (res.status === 200 && text.startsWith('{')) {
          const json = JSON.parse(text);
          console.log('Root keys:', Object.keys(json));
          if (json.objects) console.log('json.objects keys:', Object.keys(json.objects));
          if (json.data) console.log('json.data keys:', Object.keys(json.data));
        }
      } catch(err: any) {
        console.error(err.message);
      }
    }
  }
}

testApiDropiCo().catch(console.error);
