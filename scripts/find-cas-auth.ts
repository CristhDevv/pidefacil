process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function findCasAuth() {
  const mainRes = await fetch('https://app.dropi.co/main-UCVOHPFR.js');
  const mainJs = await mainRes.text();
  const matches = mainJs.match(/[a-zA-Z0-9_\-]{5,}\.js/g) || [];
  const unique = [...new Set(matches)];

  for (const chunk of unique) {
    try {
      const res = await fetch('https://app.dropi.co/' + chunk);
      const js = await res.text();
      if (js.includes('cas/auth') || js.includes('casBusiness') || js.includes('casToken')) {
        console.log(`\n🎯 Match in ${chunk}:`);
        for (const pattern of ['cas/auth', 'casBusiness', 'casToken']) {
          let idx = js.indexOf(pattern);
          if (idx !== -1) {
            console.log(`  [${pattern}]:`, js.slice(Math.max(0, idx - 150), idx + 250));
          }
        }
      }
    } catch(e) {}
  }
}

findCasAuth().catch(console.error);
