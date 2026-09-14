/**
 * Migración: acceso del PANEL DEL JEFE (reportes).
 *
 * El panel de reportes/resumen general NO es un módulo operativo ni depende de
 * los roles del sistema. Tiene su propio acceso fijo (una sola credencial de
 * "jefe"), separado de la tabla usuarios, que el propio jefe puede cambiar.
 *
 * Tabla de una sola fila (id=1). Ejecutar una vez:  npm run migrate:jefe
 * Idempotente. Credencial inicial:  jefe / jefe123  (cámbiala desde el panel).
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from './pool';

async function main() {
  console.log('Migración del panel del jefe...');
  try {
    await pool.query(`
      CREATE TABLE jefe_acceso (
        id             TINYINT UNSIGNED PRIMARY KEY DEFAULT 1,
        usuario        VARCHAR(60) NOT NULL,
        password_hash  VARCHAR(255) NOT NULL,
        actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT chk_jefe_unica CHECK (id = 1)
      ) ENGINE=InnoDB`);
    console.log('  + tabla jefe_acceso');
  } catch (e: any) {
    if (e.code === 'ER_TABLE_EXISTS_ERROR') console.log('  = tabla jefe_acceso (ya existía)');
    else throw e;
  }

  const [rows]: any = await pool.query('SELECT COUNT(*) AS n FROM jefe_acceso');
  if (rows[0].n === 0) {
    const hash = await bcrypt.hash('jefe123', 10);
    await pool.query('INSERT INTO jefe_acceso (id, usuario, password_hash) VALUES (1, ?, ?)', ['jefe', hash]);
    console.log('  + credencial inicial -> usuario: jefe  /  contraseña: jefe123  (cámbiala en el panel)');
  } else {
    console.log('  = credencial del jefe ya existe (no se toca)');
  }

  console.log('Listo.');
  await pool.end();
}

main().catch(async (e) => { console.error(e); await pool.end().catch(() => {}); process.exit(1); });
