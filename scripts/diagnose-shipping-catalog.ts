import { getSqliteDb } from '../lib/db';
import { supabaseAdmin, isSupabaseConfigured } from '../lib/supabase';

async function main() {
  const db = getSqliteDb();

  console.log('=== DIAGNÓSTICO DE MEDIDAS Y PESO EN CATÁLOGO SQLITE ===');

  const total = db.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number };
  const active = db.prepare('SELECT COUNT(*) as c FROM products WHERE is_active = 1').get() as { c: number };
  const withStock = db.prepare('SELECT COUNT(*) as c FROM products WHERE is_active = 1 AND stock_real > 0').get() as { c: number };

  const withFullMeasures = db.prepare(`
    SELECT COUNT(*) as c FROM products 
    WHERE weight_kg IS NOT NULL AND weight_kg > 0
      AND length_cm IS NOT NULL AND length_cm > 0
      AND width_cm IS NOT NULL AND width_cm > 0
      AND height_cm IS NOT NULL AND height_cm > 0
  `).get() as { c: number };

  const withAnyWeight = db.prepare(`
    SELECT COUNT(*) as c FROM products 
    WHERE weight_kg IS NOT NULL AND weight_kg > 0
  `).get() as { c: number };

  const withAnyDimensions = db.prepare(`
    SELECT COUNT(*) as c FROM products 
    WHERE (length_cm IS NOT NULL AND length_cm > 0)
       OR (width_cm IS NOT NULL AND width_cm > 0)
       OR (height_cm IS NOT NULL AND height_cm > 0)
  `).get() as { c: number };

  const withOriginCity = db.prepare(`
    SELECT COUNT(*) as c FROM products 
    WHERE origin_city_id IS NOT NULL AND origin_city_id > 0
  `).get() as { c: number };

  console.log(`Total productos en DB SQLite: ${total.c}`);
  console.log(`Productos activos: ${active.c}`);
  console.log(`Activos con stock real > 0: ${withStock.c}`);
  console.log(`Con peso Y dimensiones completas (> 0): ${withFullMeasures.c}`);
  console.log(`Con algún peso registrado (> 0): ${withAnyWeight.c}`);
  console.log(`Con alguna dimensión registrada (> 0): ${withAnyDimensions.c}`);
  console.log(`Con ciudad de origen registrada: ${withOriginCity.c}`);

  console.log('\n--- MUESTRA DE LOS 3 PRODUCTOS SEÑALADOS EN EL DIAGNÓSTICO ---');
  const ids = [2246366, 1935829, 2303089];
  for (const id of ids) {
    const row = db.prepare('SELECT id_dropi, name, weight_kg, length_cm, width_cm, height_cm, origin_city_id, origin_city_name, raw FROM products WHERE id_dropi = ?').get(id) as any;
    if (!row) {
      console.log(`ID ${id}: NO encontrado en SQLite`);
      continue;
    }
    console.log(`\nID ${row.id_dropi}: "${row.name}"`);
    console.log(`  weight_kg: ${row.weight_kg}, length: ${row.length_cm}, width: ${row.width_cm}, height: ${row.height_cm}`);
    console.log(`  origin_city_id: ${row.origin_city_id}, origin_city_name: ${row.origin_city_name}`);
    
    if (row.raw) {
      try {
        const rawObj = JSON.parse(row.raw);
        const keys = Object.keys(rawObj);
        const measureKeys = keys.filter(k => /weight|peso|dim|width|height|length|alto|ancho|largo|size|volum|medid/i.test(k));
        console.log(`  Claves en raw relacionadas con medidas/peso: ${JSON.stringify(measureKeys)}`);
        for (const mk of measureKeys) {
          console.log(`    rawObj[${mk}] = ${JSON.stringify(rawObj[mk])}`);
        }
      } catch (e) {
        console.log('  Error parsing raw JSON');
      }
    } else {
      console.log('  raw column is NULL');
    }
  }

  // Si Supabase está configurado, revisar también Supabase
  console.log('\n=== REVISIÓN EN SUPABASE ===');
  console.log(`¿Supabase configurado? ${isSupabaseConfigured}`);
  if (isSupabaseConfigured) {
    try {
      const { count: sbTotal } = await supabaseAdmin.from('products').select('*', { count: 'exact', head: true });
      const { count: sbWithWeight } = await supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).gt('weight_kg', 0);
      const { count: sbWithMeasures } = await supabaseAdmin
        .from('products')
        .select('*', { count: 'exact', head: true })
        .gt('weight_kg', 0)
        .gt('length_cm', 0)
        .gt('width_cm', 0)
        .gt('height_cm', 0);

      console.log(`Supabase total productos: ${sbTotal}`);
      console.log(`Supabase con peso > 0: ${sbWithWeight}`);
      console.log(`Supabase con medidas completas: ${sbWithMeasures}`);

      for (const id of ids) {
        const { data: sbProd } = await supabaseAdmin
          .from('products')
          .select('id_dropi, name, weight_kg, length_cm, width_cm, height_cm, origin_city_id, origin_city_name, raw')
          .eq('id_dropi', id)
          .maybeSingle();

        if (sbProd) {
          console.log(`\nSupabase ID ${sbProd.id_dropi}: "${sbProd.name}"`);
          console.log(`  weight_kg: ${sbProd.weight_kg}, length: ${sbProd.length_cm}, width: ${sbProd.width_cm}, height: ${sbProd.height_cm}`);
          console.log(`  origin_city_id: ${sbProd.origin_city_id}, origin_city_name: ${sbProd.origin_city_name}`);
        } else {
          console.log(`\nSupabase ID ${id}: NO encontrado`);
        }
      }
    } catch (err: any) {
      console.error('Error consultando Supabase:', err.message);
    }
  }
}

main().catch(console.error);
