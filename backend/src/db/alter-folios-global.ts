/**
 * Folios GLOBALES por tipo (nov 2026).
 * El negocio pidió que la numeración de folios sea una sola secuencia por tipo
 * (venta/remision/produccion) para TODAS las sucursales, no por sucursal.
 *
 * Esta migración NO renumera lo existente: crea la tabla `folios_seq` (contador
 * global por tipo) y la inicializa al folio MÁS ALTO que ya exista de cada tipo,
 * para que los NUEVOS folios continúen por encima (sin chocar con los actuales).
 * La vieja tabla `folios` (por sucursal) se deja intacta pero ya no se usa.
 *
 *   npm run migrate:folios-global    (idempotente)
 */
import 'dotenv/config';
import { pool } from './pool';

async function main() {
  console.log('Migración folios globales...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS folios_seq (
      tipo         ENUM('venta','remision','produccion') NOT NULL PRIMARY KEY,
      ultimo_folio INT UNSIGNED NOT NULL DEFAULT 0
    ) ENGINE=InnoDB`);

  // Inicializa cada contador al máximo folio existente (de TODAS las sucursales).
  const fuentes: Array<[string, string]> = [
    ['venta', 'ventas'],
    ['remision', 'remisiones'],
    ['produccion', 'producciones'],
  ];
  for (const [tipo, tabla] of fuentes) {
    const [r]: any = await pool.query(`SELECT IFNULL(MAX(folio),0) AS maxf FROM ${tabla}`);
    const maxf = Number(r[0].maxf);
    // GREATEST evita bajar el contador si se vuelve a correr después de haber avanzado.
    await pool.query(
      `INSERT INTO folios_seq (tipo, ultimo_folio) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE ultimo_folio = GREATEST(ultimo_folio, VALUES(ultimo_folio))`,
      [tipo, maxf]);
    console.log(`  ${tipo}: contador global = ${maxf} (el próximo folio será ${maxf + 1})`);
  }

  console.log('Listo. Las nuevas ventas/remisiones/producciones usan folio global.');
  await pool.end();
}

main().catch(async (e) => { console.error(e); await pool.end().catch(() => {}); process.exit(1); });
