/**
 * Migración Fase 3 (ajustes):
 *  - ventas.estado: reemplaza 'confirmada' por 'entregada'. El flujo real es
 *      apartar (pendiente, sin tocar stock) -> producir -> entregar (descuenta stock).
 *  - venta_garantias.articulos_txt: guarda a qué artículo(s) cubre cada bloque
 *      de garantía, para poder etiquetarlo en la nota cuando hay varios productos.
 *
 * Ejecutar una vez:  npm run migrate:ventas
 * Idempotente.
 */
import 'dotenv/config';
import { pool } from './pool';

async function tryExec(label: string, sql: string) {
  try {
    await pool.query(sql);
    console.log('  + ' + label);
  } catch (e: any) {
    if (['ER_DUP_FIELDNAME', 'ER_DUP_KEYNAME'].includes(e.code) || /Duplicate|already exists/i.test(e.message)) {
      console.log('  = ' + label + ' (ya existía)');
    } else {
      throw e;
    }
  }
}

async function main() {
  console.log('Migración Fase 3 (estados de venta + garantía por artículo)...');

  // 1) Enum superset para poder convertir sin violar la restricción.
  await tryExec('enum ventas (superset temporal)',
    `ALTER TABLE ventas MODIFY COLUMN estado
       ENUM('pendiente','confirmada','entregada','cancelada') NOT NULL DEFAULT 'pendiente'`);
  // 2) Migra las 'confirmada' existentes a 'entregada'.
  const [res]: any = await pool.query("UPDATE ventas SET estado = 'entregada' WHERE estado = 'confirmada'");
  console.log(`  · ${res.affectedRows} venta(s) 'confirmada' -> 'entregada'`);
  // 3) Enum final sin 'confirmada'.
  await tryExec('enum ventas (final)',
    `ALTER TABLE ventas MODIFY COLUMN estado
       ENUM('pendiente','entregada','cancelada') NOT NULL DEFAULT 'pendiente'`);

  await tryExec('columna venta_garantias.articulos_txt',
    `ALTER TABLE venta_garantias ADD COLUMN articulos_txt VARCHAR(400) NULL`);

  console.log('Listo.');
  await pool.end();
}

main().catch(async (e) => { console.error(e); await pool.end().catch(() => {}); process.exit(1); });
