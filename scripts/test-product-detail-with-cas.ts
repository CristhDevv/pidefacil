process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import fs from 'fs';

async function testDetail() {
  const casToken = fs.readFileSync('.secrets/cas_token.txt', 'utf8').trim();
  const productId = '2075631';

  const urls = [
    `https://api.dropi.co/api/products/productlist/v1/show/?id=${productId}`,
    `https://api-v2.dropi.co/api/products/productlist/v1/show/?id=${productId}`,
    `https://app.dropi.co/api/products/productlist/v1/show/?id=${productId}`,
    `https://api.dropi.co/api/products/v2/${productId}`
  ];

  console.log(`Testing product detail with casToken (${casToken.length} chars)...`);

  for (const url of urls) {
    console.log(`\n========================================`);
    console.log(`URL: ${url}`);
    
    // Test 1: Both headers
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${casToken}`,
          'X-Authorization': `Bearer ${casToken}`,
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const text = await res.text();
      console.log(`[Status ${res.status}] Headers: Authorization + X-Authorization`);
      console.log(`Response body: ${text.slice(0, 500)}`);
    } catch(e: any) {
      console.error(`Request failed:`, e.message);
    }

    // Test 2: Authorization only
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${casToken}`,
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const text = await res.text();
      console.log(`[Status ${res.status}] Headers: Authorization only`);
      console.log(`Response body: ${text.slice(0, 200)}`);
    } catch(e: any) {
      console.error(`Request failed:`, e.message);
    }
  }
}

testDetail().catch(console.error);
