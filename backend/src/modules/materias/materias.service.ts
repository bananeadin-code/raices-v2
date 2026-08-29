import { ResultSetHeader } from 'mysql2';
import { pool, query } from '../../db/pool';
import { ApiError } from '../../utils/http';
import { MateriaCreate, MateriaUpdate } from './materias.schema';
import { paged, PageParams } from '../../utils/pagination';

const CAMPOS = ['codigo', 'nombre', 'unidad', 'costo', 'minimo'] as const;

export async function listar(p: PageParams) {
  return paged({ select: '*', from: 'materias', where: 'activo = 1', search: { col: 'nombre', q: p.q }, order: 'nombre', page: p.page, pageSize: p.pageSize });
}

export async function obtener(id: number) {
  const rows = await query('SELECT * FROM materias WHERE id = ?', [id]);
  if (!rows[0]) throw new ApiError(404, 'Materia prima no encontrada');
  return rows[0];
}

export async function crear(data: MateriaCreate) {
  const campos = CAMPOS.filter((c) => (data as any)[c] !== undefined);
  const valores = campos.map((c) => (data as any)[c]);
  const [res] = await pool.query(
    `INSERT INTO materias (${campos.join(', ')}) VALUES (${campos.map(() => '?').join(', ')})`, valores);
  return obtener((res as ResultSetHeader).insertId);
}

export async function actualizar(id: number, data: MateriaUpdate) {
  const campos = CAMPOS.filter((c) => (data as any)[c] !== undefined);
  if (campos.length === 0) return obtener(id);
  const valores = campos.map((c) => (data as any)[c]);
  await pool.query(`UPDATE materias SET ${campos.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, [...valores, id]);
  return obtener(id);
}

export async function eliminar(id: number) {
  await pool.query('UPDATE materias SET activo = 0 WHERE id = ?', [id]);
}
