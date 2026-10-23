process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import fs from 'fs';

async function testCasAuthWithId() {
  const token = fs.readFileSync('.secrets/dropi_token.txt', 'utf8').trim();
  const casId = '65b50d055f200bc3e64bc3cf';

  const urls = [
    'https://api-v2.dropi.co/cas/auth',
    'https://api.dropi.co/api/cas/auth'
  ];

  const bodies = [
    { casBusiness: casId },
    { casBusiness: { _id: casId } },
    { casBusiness: { _id: casId, name: 'DROPI' } }
  ];

  for (const url of urls) {
    for (const body of bodies) {
      console.log('\n--- URL:', url, 'Body:', JSON.stringify(body), '---');
      for (const headerName of ['X-Authorization', 'Authorization', 'BOTH']) {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };
        if (headerName === 'X-Authorization') {
          headers['X-Authorization'] = 'Bearer ' + token;
        } else if (headerName === 'Authorization') {
          headers['Authorization'] = 'Bearer ' + token;
        } else {
          headers['X-Authorization'] = 'Bearer ' + token;
          headers['Authorization'] = 'Bearer ' + token;
        }

        try {
          const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
          });
          const text = await res.text();
          console.log(`[${headerName}] -> Status: ${res.status} | Body: ${text.slice(0, 300)}`);
          if (res.status === 200) {
            try {
              const json = JSON.parse(text);
              if (json.objects?.token) {
                console.log('🎉 FOUND CAS TOKEN:', json.objects.token);
                fs.writeFileSync('.secrets/cas_token.txt', json.objects.token);
              }
            } catch(e) {}
          }
        } catch(e: any) {
          console.error(e.message);
        }
      }
    }
  }
}

testCasAuthWithId().catch(console.error);
