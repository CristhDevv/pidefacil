process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function findProductAssignment() {
  const res = await fetch('https://app.dropi.co/chunk-LN7RTX6F.js');
  const js = await res.text();

  // Find where this.product is loaded or assigned
  let idx = 0;
  while ((idx = js.indexOf('.product=', idx)) !== -1) {
    console.log('Snippet around .product=:\n', js.slice(Math.max(0, idx - 200), idx + 300));
    idx += 50;
  }

  // Also search for activatedRoute params or route.snapshot
  let pIdx = js.indexOf('snapshot.params');
  if (pIdx !== -1) {
    console.log('Snapshot params snippet:\n', js.slice(Math.max(0, pIdx - 150), pIdx + 350));
  }
}

findProductAssignment().catch(console.error);
