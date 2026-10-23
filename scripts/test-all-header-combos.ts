process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import fs from 'fs';

async function runCombinations() {
  const dropiToken = fs.readFileSync('.secrets/dropi_token.txt', 'utf8').trim();
  const casToken = fs.readFileSync('.secrets/cas_token.txt', 'utf8').trim();
  const url = 'https://api.dropi.co/api/products/productlist/v1/show/?id=2075631';

  const combos: { name: string; headers: Record<string, string> }[] = [
    {
      name: 'Auth: Bearer CAS',
      headers: { 'Authorization': `Bearer ${casToken}` }
    },
    {
      name: 'Auth: Raw CAS (no Bearer)',
      headers: { 'Authorization': casToken }
    },
    {
      name: 'X-Auth: Bearer CAS',
      headers: { 'X-Authorization': `Bearer ${casToken}` }
    },
    {
      name: 'X-Auth: Raw CAS',
      headers: { 'X-Authorization': casToken }
    },
    {
      name: 'Both: Bearer CAS',
      headers: { 'Authorization': `Bearer ${casToken}`, 'X-Authorization': `Bearer ${casToken}` }
    },
    {
      name: 'Both: Raw CAS',
      headers: { 'Authorization': casToken, 'X-Authorization': casToken }
    },
    {
      name: 'Auth: DROPI, X-Auth: CAS',
      headers: { 'Authorization': `Bearer ${dropiToken}`, 'X-Authorization': `Bearer ${casToken}` }
    },
    {
      name: 'Auth: CAS, X-Auth: DROPI',
      headers: { 'Authorization': `Bearer ${casToken}`, 'X-Authorization': `Bearer ${dropiToken}` }
    },
    {
      name: 'Auth: Raw DROPI, X-Auth: Raw CAS',
      headers: { 'Authorization': dropiToken, 'X-Authorization': casToken }
    },
    {
      name: 'Auth: Bearer DROPI, X-Auth: Bearer DROPI',
      headers: { 'Authorization': `Bearer ${dropiToken}`, 'X-Authorization': `Bearer ${dropiToken}` }
    },
    {
      name: 'X-Auth: Bearer DROPI only',
      headers: { 'X-Authorization': `Bearer ${dropiToken}` }
    },
    {
      name: 'Auth: Bearer DROPI only',
      headers: { 'Authorization': `Bearer ${dropiToken}` }
    }
  ];

  for (const c of combos) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          ...c.headers,
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const text = await res.text();
      console.log(`[${res.status}] ${c.name} -> Body: ${text.slice(0, 150)}`);
      if (res.status === 200) {
        console.log('🎉🎉🎉 HIT 200 ON:', c.name);
        console.log('Full body:', text.slice(0, 1000));
        return;
      }
    } catch (e: any) {
      console.error(`Error on ${c.name}:`, e.message);
    }
  }
}

runCombinations().catch(console.error);
