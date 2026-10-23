process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function main() {
  const res = await fetch('https://app.dropi.co');
  const html = await res.text();
  const scriptRegex = /src="([^"]+\.js)"/g;
  let match;
  const jsUrls: string[] = [];
  while ((match = scriptRegex.exec(html)) !== null) {
    const url = match[1].startsWith('http') ? match[1] : 'https://app.dropi.co/' + match[1].replace(/^\//, '');
    jsUrls.push(url);
  }
  console.log('Main scripts found:', jsUrls);

  for (const url of jsUrls) {
    console.log(`Checking ${url}...`);
    const sRes = await fetch(url);
    const code = await sRes.text();
    console.log(`Size: ${code.length}`);
    if (code.includes('product-details')) {
      console.log(`🎯 FOUND 'product-details' in ${url}!`);
      const idx = code.indexOf('product-details');
      console.log('Snippet:', code.slice(Math.max(0, idx - 200), idx + 300));
    }
    // Also look for other chunk references
    const chunkMatches = code.match(/chunk-[A-Za-z0-9]+\.js/g);
    if (chunkMatches) {
      console.log(`Found ${chunkMatches.length} chunk references in this script.`);
    }
  }
}

main().catch(console.error);
