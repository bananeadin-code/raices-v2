/**
 * Migración ronda 2 (sugerencias de capacitación):
 *  - ventas.metodo_pago: agrega 'cortesia' (ventas a pura firma, sin pago ni crédito).
 *  - Caja: registro de entradas/salidas de dinero fuera del sistema (bitácora de
 *    dinero), con un catálogo de categorías (gastos/ingresos). No toca inventario
 *    ni ventas.
 *
 * Ejecutar una vez:  npm run migrate:ronda2
 * Idempotente.
 */
import 'dotenv/config';
import { pool } from './pool';

async function tryExec(label: string, sql: string) {
  try {
    await pool.query(sql);
    console.log('  + ' + label);
  } catch (e: any) {
    if (['ER_DUP_FIELDNAME', 'ER_DUP_KEYNAME', 'ER_TABLE_EXISTS_ERROR'].includes(e.code) || /Duplicate|already exists/i.test(e.message)) {
      console.log('  = ' + label + ' (ya existía)');
    } else {
      throw e;
    }
  }
}

const CATEGORIAS = ['Renta', 'Servicios (luz/agua/tel)', 'Nómina y sueldos', 'Mantenimiento', 'Compras / proveedores', 'Combustible', 'Otros gastos', 'Otros ingresos'];

async function main() {
  console.log('Migración ronda 2...');

  await tryExec('ventas.metodo_pago += cortesia',
    `ALTER TABLE ventas MODIFY COLUMN metodo_pago
       ENUM('efectivo','tarjeta','transferencia','credito','cortesia') NOT NULL DEFAULT 'efectivo'`);

  await tryExec('tabla caja_categorias', `
    CREATE TABLE caja_categorias (
      id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(120) NOT NULL,
      activo TINYINT(1) NOT NULL DEFAULT 1
    ) ENGINE=InnoDB`);

  await tryExec('tabla caja_movimientos', `
    CREATE TABLE caja_movimientos (
      id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      tipo         ENUM('entrada','salida') NOT NULL,
      categoria_id INT UNSIGNED NULL,
      concepto     VARCHAR(200) NOT NULL,
      monto        DECIMAL(12,2) NOT NULL,
      fecha        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      usuario_id   INT UNSIGNED NULL,
      creado_en    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_cajamov_categoria FOREIGN KEY (categoria_id) REFERENCES caja_categorias(id),
      CONSTRAINT fk_cajamov_usuario   FOREIGN KEY (usuario_id)   REFERENCES usuarios(id),
      INDEX idx_cajamov_fecha (fecha)
    ) ENGINE=InnoDB`);

  const [rows]: any = await pool.query('SELECT COUNT(*) AS n FROM caja_categorias');
  if (rows[0].n === 0) {
    for (const nombre of CATEGORIAS) await pool.query('INSERT INTO caja_categorias (nombre) VALUES (?)', [nombre]);
    console.log(`  + ${CATEGORIAS.length} categorías de caja sembradas`);
  } else {
    console.log('  = categorías de caja ya existentes');
  }

  console.log('Listo.');
  await pool.end();
}

main().catch(async (e) => { console.error(e); await pool.end().catch(() => {}); process.exit(1); });
