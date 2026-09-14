/**
 * Migración de extras (Fase 4):
 *  - garantia_plantillas.permanente + venta_garantias.permanente:
 *      garantía permanente (salvo causas naturales, mal uso, etc.) como
 *      alternativa a los meses.
 *  - vehiculo_notas: bitácora por vehículo (reparaciones, gastos, observaciones).
 *
 * Ejecutar una vez:  npm run migrate:extras
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

async function main() {
  console.log('Migración de extras...');

  await tryExec('garantia_plantillas.permanente',
    'ALTER TABLE garantia_plantillas ADD COLUMN permanente TINYINT(1) NOT NULL DEFAULT 0');
  await tryExec('venta_garantias.permanente',
    'ALTER TABLE venta_garantias ADD COLUMN permanente TINYINT(1) NOT NULL DEFAULT 0');

  await tryExec('tabla vehiculo_notas', `
    CREATE TABLE vehiculo_notas (
      id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      vehiculo_id INT UNSIGNED NOT NULL,
      tipo        ENUM('reparacion','gasto','observacion') NOT NULL DEFAULT 'observacion',
      descripcion VARCHAR(500) NOT NULL,
      monto       DECIMAL(12,2) NULL,           -- costo (reparación/gasto); NULL en observaciones
      fecha       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      usuario_id  INT UNSIGNED NULL,
      CONSTRAINT fk_vnota_vehiculo FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id) ON DELETE CASCADE,
      CONSTRAINT fk_vnota_usuario  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id),
      INDEX idx_vnota_vehiculo (vehiculo_id, fecha)
    ) ENGINE=InnoDB`);

  console.log('Listo.');
  await pool.end();
}

main().catch(async (e) => { console.error(e); await pool.end().catch(() => {}); process.exit(1); });
