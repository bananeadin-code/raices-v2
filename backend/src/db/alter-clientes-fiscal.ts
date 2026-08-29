/**
 * Migración: datos fiscales opcionales del cliente (para agilizar facturación externa).
 * Ejecutar una vez. Idempotente (ignora columnas que ya existan).
 */
import 'dotenv/config';
import { pool } from './pool';

const COLUMNAS: [string, string][] = [
  ['razon_social', 'VARCHAR(200) NULL'],
  ['regimen_fiscal', 'VARCHAR(10) NULL'],
  ['uso_cfdi', 'VARCHAR(10) NULL'],
  ['cp_fiscal', 'VARCHAR(10) NULL'],
  ['email_fiscal', 'VARCHAR(150) NULL'],
];

async function main() {
  console.log('Agregando datos fiscales a clientes...');
  for (const [nombre, def] of COLUMNAS) {
    try {
      await pool.query(`ALTER TABLE clientes ADD COLUMN ${nombre} ${def}`);
      console.log('  + ' + nombre);
    } catch (e: any) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('  = ' + nombre + ' (ya existía)');
      else throw e;
    }
  }
  console.log('Listo.');
  await pool.end();
}

main().catch(async (e) => { console.error(e); await pool.end().catch(() => {}); process.exit(1); });
