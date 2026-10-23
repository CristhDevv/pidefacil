process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkExports() {
  const res = await fetch('https://app.dropi.co/chunk-YTYD5P5F.js');
  const js = await res.text();

  // Find export {
  const expIdx = js.lastIndexOf('export{');
  console.log('Exports of chunk-YTYD5P5F.js:\n', js.slice(expIdx));
}

checkExports().catch(console.error);
