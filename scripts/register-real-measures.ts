import { getSqliteDb } from '../lib/db';
import { supabaseAdmin, isSupabaseConfigured } from '../lib/supabase';

async function updateProductMeasures() {
  const id = 2246366;
  const weight = 2.0;
  const length = 50.0;
  const width = 20.0;
  const height = 20.0;
  const originCityId = 444; // SOACHA
  const originCityName = 'SOACHA';

  console.log(`Registrando medidas reales para producto #${id} ("Set Juego De Ollas Original Nia x6")...`);

  // 1. SQLite
  const db = getSqliteDb();
  const resSqlite = db.prepare(`
    UPDATE products 
    SET weight_kg = ?, length_cm = ?, width_cm = ?, height_cm = ?, origin_city_id = ?, origin_city_name = ?
    WHERE id_dropi = ?
  `).run(weight, length, width, height, originCityId, originCityName, id);

  console.log(`SQLite actualizado: ${resSqlite.changes} fila(s) afectada(s).`);

  // 2. Supabase
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabaseAdmin
        .from('products')
        .update({
          weight_kg: weight,
          length_cm: length,
          width_cm: width,
          height_cm: height,
          origin_city_id: originCityId,
          origin_city_name: originCityName,
        })
        .eq('id_dropi', id)
        .select('id_dropi, name, weight_kg, length_cm, width_cm, height_cm, origin_city_id, origin_city_name');

      if (error) {
        console.error('Error actualizando Supabase:', error);
      } else {
        console.log('Supabase actualizado exitosamente:', data);
      }
    } catch (e: any) {
      console.error('Exception en Supabase update:', e.message);
    }
  }

  // Verificar lectura
  const row = db.prepare('SELECT id_dropi, name, weight_kg, length_cm, width_cm, height_cm, origin_city_id, origin_city_name FROM products WHERE id_dropi = ?').get(id);
  console.log('Fila verificada en SQLite:', row);
}

updateProductMeasures().catch(console.error);
