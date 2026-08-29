/**
 * Migración: ciclo de vida de producción con estados y reserva de materia.
 * Ejecutar una vez sobre la base existente.
 */
import 'dotenv/config';
import { pool } from './pool';

async function main() {
  console.log('Migrando estados de producción...');

  // 1) A varchar temporal para poder convertir los valores viejos
  await pool.query("ALTER TABLE producciones MODIFY estado VARCHAR(20) NOT NULL DEFAULT 'en_espera'");
  await pool.query("UPDATE producciones SET estado='terminado' WHERE estado='confirmada'");
  await pool.query("UPDATE producciones SET estado='cancelado' WHERE estado='cancelada'");
  await pool.query("UPDATE producciones SET estado='en_espera' WHERE estado NOT IN ('en_espera','en_progreso','terminado','cancelado')");

  // 2) Al enum final
  await pool.query(
    "ALTER TABLE producciones MODIFY estado ENUM('en_espera','en_progreso','terminado','cancelado') NOT NULL DEFAULT 'en_espera'");

  // 3) Líneas de materia por orden (snapshot de lo reservado/consumido)
  await pool.query(`CREATE TABLE IF NOT EXISTS produccion_materias (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    produccion_id BIGINT UNSIGNED NOT NULL,
    materia_id INT UNSIGNED NOT NULL,
    cantidad DECIMAL(12,3) NOT NULL,
    CONSTRAINT fk_pm_produccion FOREIGN KEY (produccion_id) REFERENCES producciones(id) ON DELETE CASCADE,
    CONSTRAINT fk_pm_materia FOREIGN KEY (materia_id) REFERENCES materias(id)
  ) ENGINE=InnoDB`);

  console.log('Migración lista.');
  await pool.end();
}

main().catch(async (e) => { console.error(e); await pool.end().catch(() => {}); process.exit(1); });
