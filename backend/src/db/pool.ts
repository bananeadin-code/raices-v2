import mysql from 'mysql2/promise';
import { env } from '../config/env';

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  charset: 'utf8mb4', // acentos y ñ correctos (evita textos como "Liquidaci�n")
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
  decimalNumbers: true,
});

// Consulta parametrizada. Ejemplo:
//   query('SELECT * FROM clientes WHERE id = ?', [id])
export async function query<T = any>(sql: string, params?: any): Promise<T[]> {
  const [rows] = await pool.query(sql, params);
  return rows as T[];
}

// Ejecuta un bloque dentro de una transacción: commit si todo va bien,
// rollback si algo lanza. Úsalo para ventas, producción y movimientos de inventario.
//   await withTransaction(async (cx) => {
//     await cx.query('INSERT ...');
//     await cx.query('UPDATE existencias ...');
//   });
export async function withTransaction<T>(
  fn: (cx: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const cx = await pool.getConnection();
  try {
    await cx.beginTransaction();
    const result = await fn(cx);
    await cx.commit();
    return result;
  } catch (err) {
    await cx.rollback();
    throw err;
  } finally {
    cx.release();
  }
}
