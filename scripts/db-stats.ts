import Database from 'better-sqlite3';

const db = new Database('./data/pidefacil.db');
const total = (db.prepare('SELECT COUNT(*) as c FROM products').get() as any).c;
const active = (db.prepare('SELECT COUNT(*) as c FROM products WHERE is_active = 1').get() as any).c;
const under5k = (db.prepare('SELECT COUNT(*) as c FROM products WHERE cost_cop < 5000').get() as any).c;
const suspiciousPrice = (db.prepare("SELECT COUNT(*) as c FROM products WHERE deactivation_reason = 'precio_sospechoso'").get() as any).c;
const suspiciousStock = (db.prepare("SELECT COUNT(*) as c FROM products WHERE deactivation_reason = 'stock_sospechoso'").get() as any).c;

console.log({
  totalProducts: total,
  activeProducts: active,
  costUnder5k: under5k,
  suspiciousPriceFlagged: suspiciousPrice,
  suspiciousStockFlagged: suspiciousStock
});
