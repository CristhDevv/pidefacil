import Database from 'better-sqlite3';

const db = new Database('./data/pidefacil.db');
db.pragma('busy_timeout = 10000');

const initialCount = (db.prepare('SELECT COUNT(*) as c FROM products WHERE cost_cop < 5000').get() as any).c;
console.log('Total products with cost_cop < 5000:', initialCount);

const res = db.prepare(`
  UPDATE products SET
    needs_review = 1,
    is_active = 0,
    deactivation_reason = 'precio_sospechoso',
    updated_at = datetime('now')
  WHERE cost_cop < 5000
`).run();

console.log('Successfully updated records:', res.changes);

const verified = (db.prepare(`
  SELECT COUNT(*) as c FROM products
  WHERE deactivation_reason = 'precio_sospechoso' AND is_active = 0 AND needs_review = 1
`).get() as any).c;

console.log('Verified count in database:', verified);
