import { ResultSetHeader } from 'mysql2';
import { pool, query, withTransaction } from '../../db/pool';
import { ApiError } from '../../utils/http';
import { RolCreate, RolUpdate, PermisoItem } from './roles.schema';

export async function listar() {
  return query('SELECT * FROM roles ORDER BY nombre');
}

export async function obtener(id: number) {
  const rows = await query('SELECT * FROM roles WHERE id = ?', [id]);
  if (!rows[0]) throw new ApiError(404, 'Rol no encontrado');
  return rows[0];
}

export async function crear(data: RolCreate) {
  const [res] = await pool.query('INSERT INTO roles (nombre, descripcion) VALUES (?, ?)', [data.nombre, data.descripcion ?? null]);
  return obtener((res as ResultSetHeader).insertId);
}

export async function actualizar(id: number, data: RolUpdate) {
  const sets: string[] = [];
  const vals: any[] = [];
  if (data.nombre !== undefined) { sets.push('nombre = ?'); vals.push(data.nombre); }
  if (data.descripcion !== undefined) { sets.push('descripcion = ?'); vals.push(data.descripcion); }
  if (sets.length) await pool.query(`UPDATE roles SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
  return obtener(id);
}

export async function eliminar(id: number) {
  const enUso = await query<{ n: number }>('SELECT COUNT(*) AS n FROM usuarios WHERE rol_id = ?', [id]);
  if (enUso[0].n > 0) throw new ApiError(409, 'No se puede eliminar: hay usuarios con este rol');
  await pool.query('DELETE FROM rol_permisos WHERE rol_id = ?', [id]);
  await pool.query('DELETE FROM roles WHERE id = ?', [id]);
}

export async function getPermisos(rolId: number) {
  return query('SELECT modulo, ver, crear, editar, eliminar FROM rol_permisos WHERE rol_id = ?', [rolId]);
}

// Reemplaza todos los permisos del rol (borra y reinserta) en una transacción.
export async function setPermisos(rolId: number, permisos: PermisoItem[]) {
  await obtener(rolId); // valida que el rol exista
  await withTransaction(async (cx) => {
    await cx.query('DELETE FROM rol_permisos WHERE rol_id = ?', [rolId]);
    const rows = permisos
      .filter((p) => p.ver || p.crear || p.editar || p.eliminar)
      .map((p) => [rolId, p.modulo, p.ver ? 1 : 0, p.crear ? 1 : 0, p.editar ? 1 : 0, p.eliminar ? 1 : 0]);
    if (rows.length) {
      await cx.query('INSERT INTO rol_permisos (rol_id, modulo, ver, crear, editar, eliminar) VALUES ?', [rows]);
    }
  });
  return getPermisos(rolId);
}
