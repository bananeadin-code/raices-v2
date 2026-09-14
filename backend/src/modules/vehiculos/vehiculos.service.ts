import { ResultSetHeader } from 'mysql2';
import { pool, query } from '../../db/pool';
import { ApiError } from '../../utils/http';
import { paged, PageParams } from '../../utils/pagination';
import { VehiculoCreate, VehiculoUpdate, NotaCreate } from './vehiculos.schema';

const CAMPOS = ['nombre', 'placas'] as const;

export async function listar(p: PageParams) {
  return paged({ select: '*', from: 'vehiculos', where: 'activo = 1', search: { col: 'nombre', q: p.q }, order: 'nombre', page: p.page, pageSize: p.pageSize });
}

export async function obtener(id: number) {
  const rows = await query('SELECT * FROM vehiculos WHERE id = ?', [id]);
  if (!rows[0]) throw new ApiError(404, 'Vehículo no encontrado');
  return rows[0];
}

export async function crear(data: VehiculoCreate) {
  const campos = CAMPOS.filter((c) => (data as any)[c] !== undefined);
  const [res] = await pool.query(
    `INSERT INTO vehiculos (${campos.join(', ')}) VALUES (${campos.map(() => '?').join(', ')})`,
    campos.map((c) => (data as any)[c]));
  return obtener((res as ResultSetHeader).insertId);
}

export async function actualizar(id: number, data: VehiculoUpdate) {
  const campos = CAMPOS.filter((c) => (data as any)[c] !== undefined);
  if (campos.length === 0) return obtener(id);
  await pool.query(`UPDATE vehiculos SET ${campos.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
    [...campos.map((c) => (data as any)[c]), id]);
  return obtener(id);
}

export async function eliminar(id: number) {
  await pool.query('UPDATE vehiculos SET activo = 0 WHERE id = ?', [id]);
}

// ---- Bitácora del vehículo ----
export async function listarNotas(vehiculoId: number) {
  await obtener(vehiculoId); // valida que exista
  return query(
    `SELECT n.id, n.tipo, n.descripcion, n.monto, n.fecha, u.nombre AS usuario
       FROM vehiculo_notas n LEFT JOIN usuarios u ON u.id = n.usuario_id
      WHERE n.vehiculo_id = ? ORDER BY n.fecha DESC, n.id DESC`, [vehiculoId]);
}

export async function agregarNota(vehiculoId: number, data: NotaCreate, usuarioId: number) {
  await obtener(vehiculoId);
  const monto = data.tipo === 'observacion' ? null : (data.monto ?? null);
  if (data.fecha) {
    await pool.query(
      'INSERT INTO vehiculo_notas (vehiculo_id, tipo, descripcion, monto, fecha, usuario_id) VALUES (?, ?, ?, ?, ?, ?)',
      [vehiculoId, data.tipo, data.descripcion, monto, data.fecha, usuarioId]);
  } else {
    await pool.query(
      'INSERT INTO vehiculo_notas (vehiculo_id, tipo, descripcion, monto, usuario_id) VALUES (?, ?, ?, ?, ?)',
      [vehiculoId, data.tipo, data.descripcion, monto, usuarioId]);
  }
  return { ok: true };
}
