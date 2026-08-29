import { ResultSetHeader } from 'mysql2';
import { pool, query } from '../../db/pool';
import { ApiError } from '../../utils/http';
import { CategoriaCreate, CategoriaUpdate } from './categorias.schema';
import { paged, PageParams } from '../../utils/pagination';

const CAMPOS = ['nombre'] as const;

export async function listar(p: PageParams) {
  return paged({ select: '*', from: 'categorias', where: 'activo = 1', search: { col: 'nombre', q: p.q }, order: 'nombre', page: p.page, pageSize: p.pageSize });
}

export async function obtener(id: number) {
  const rows = await query('SELECT * FROM categorias WHERE id = ?', [id]);
  if (!rows[0]) throw new ApiError(404, 'Categoría no encontrada');
  return rows[0];
}

export async function crear(data: CategoriaCreate) {
  const campos = CAMPOS.filter((c) => (data as any)[c] !== undefined);
  const valores = campos.map((c) => (data as any)[c]);
  const [res] = await pool.query(
    `INSERT INTO categorias (${campos.join(', ')}) VALUES (${campos.map(() => '?').join(', ')})`, valores);
  return obtener((res as ResultSetHeader).insertId);
}

export async function actualizar(id: number, data: CategoriaUpdate) {
  const campos = CAMPOS.filter((c) => (data as any)[c] !== undefined);
  if (campos.length === 0) return obtener(id);
  const valores = campos.map((c) => (data as any)[c]);
  await pool.query(`UPDATE categorias SET ${campos.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, [...valores, id]);
  return obtener(id);
}

export async function eliminar(id: number) {
  await pool.query('UPDATE categorias SET activo = 0 WHERE id = ?', [id]);
}
