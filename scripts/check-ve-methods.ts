process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkVeMethods() {
  const res = await fetch('https://app.dropi.co/chunk-YTYD5P5F.js');
  const js = await res.text();

  const idx = js.indexOf('var ve=');
  const endIdx = js.indexOf('return n})();', idx);
  const snippet = js.slice(idx, endIdx);

  // find this.apiUrl in snippet
  console.log('Snippet of ve methods:\n');
  const re = /(get|post|put|delete)\([^)]+\)\{/g;
  let m;
  while ((m = re.exec(snippet)) !== null) {
    const mIdx = m.index;
    console.log(snippet.slice(mIdx, mIdx + 300));
  }
}

checkVeMethods().catch(console.error);
