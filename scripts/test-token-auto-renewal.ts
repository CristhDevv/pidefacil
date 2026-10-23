process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import fs from 'fs';
import { execFileSync } from 'child_process';

async function simulateTokenExpiryAndRecovery() {
  console.log('===============================================================');
  console.log('🧪 PRUEBA DE ACEPTACIÓN: AUTO-RENOVACIÓN ANTE TOKEN VENCIDO');
  console.log('===============================================================');

  let testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.SIMULATED_EXPIRED_TOKEN_MOCK.INVALID_SIGNATURE';
  const productId = 602501;

  console.log(`1. Petición inicial con token simulado vencido...`);
  const url = `https://api.dropi.co/api/products/productlist/v1/show/?id=${productId}`;
  const headers: any = {
    'Accept': 'application/json, text/plain, */*',
    'X-Authorization': 'Bearer ' + testToken,
    'Origin': 'https://app.dropi.co',
    'Referer': `https://app.dropi.co/dashboard/product-details/${productId}/producto`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  };

  const res1 = await fetch(url, { headers });
  console.log(`   Resultado con token vencido -> HTTP Status: ${res1.status}`);

  if (res1.status === 401) {
    console.log(`\n2. 401 detectado correctamente. Invocando extractor automático de Chrome...`);
    const out = execFileSync('python', ['scripts/extract_chrome_token.py'], { encoding: 'utf8' });
    const match = out.match(/SUCCESS_TOKEN:(eyJ[A-Za-z0-9_\-\.]+)/);
    
    if (match) {
      const freshToken = match[1].trim();
      console.log(`   ✅ Token fresco recuperado de Chrome LevelDB! (Longitud: ${freshToken.length})`);
      testToken = freshToken;

      console.log(`\n3. Reintentando la petición con el token auto-renovado...`);
      headers['X-Authorization'] = 'Bearer ' + testToken;
      const res2 = await fetch(url, { headers });
      console.log(`   Resultado tras auto-renovación -> HTTP Status: ${res2.status}`);
      if (res2.status === 200) {
        const json = await res2.json();
        console.log(`   🎉 ÉXITO: Producto recuperado: "${json.objects?.name}"`);
        console.log(`   Longitud descripción: ${json.objects?.description?.length} caracteres.`);
      }
    } else {
      console.log('   Alerta: No se encontró sesión en Chrome.');
    }
  }
}

simulateTokenExpiryAndRecovery().catch(console.error);
