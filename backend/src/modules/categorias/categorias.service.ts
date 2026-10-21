import { ResultSetHeader } from 'mysql2';
import { pool, query } from '../../db/pool';
import { ApiError } from '../../utils/http';
import { CategoriaCreate, CategoriaUpdate } from './categorias.schema';
import { paged, PageParams } from '../../utils/pagination';

const CAMPOS = ['nombre', 'padre_id'] as const;

export async function listar(p: PageParams) {
  // Árbol de 2 niveles: cada fila trae su padre (si lo tiene). Se ordena por familia
  // (nombre del padre o propio) y el padre antes que sus hijos.
  return paged({
    select: 'c.id, c.nombre, c.padre_id, p.nombre AS padre',
    from: 'categorias c LEFT JOIN categorias p ON p.id = c.padre_id',
    where: 'c.activo = 1',
    search: { col: 'c.nombre', q: p.q },
    order: 'COALESCE(p.nombre, c.nombre), (c.padre_id IS NOT NULL), c.nombre',
    page: p.page, pageSize: p.pageSize,
  });
}

export async function obtener(id: number) {
  const rows = await query('SELECT * FROM categorias WHERE id = ?', [id]);
  if (!rows[0]) throw new ApiError(404, 'Categoría no encontrada');
  return rows[0];
}

// Solo se permiten 2 niveles: el padre debe ser una categoría raíz.
async function validarPadre(padreId: number, propioId?: number) {
  if (propioId && padreId === propioId) throw new ApiError(422, 'Una categoría no puede ser su propio padre.');
  const p = await query<any>('SELECT id, padre_id FROM categorias WHERE id = ? AND activo = 1', [padreId]);
  if (!p[0]) throw new ApiError(404, 'La categoría padre no existe.');
  if (p[0].padre_id) throw new ApiError(422, 'Solo se permiten 2 niveles: el padre debe ser una categoría principal.');
}

export async function crear(data: CategoriaCreate) {
  if (data.padre_id) await validarPadre(data.padre_id);
  const campos = CAMPOS.filter((c) => (data as any)[c] !== undefined);
  const valores = campos.map((c) => (data as any)[c]);
  const [res] = await pool.query(
    `INSERT INTO categorias (${campos.join(', ')}) VALUES (${campos.map(() => '?').join(', ')})`, valores);
  return obtener((res as ResultSetHeader).insertId);
}

export async function actualizar(id: number, data: CategoriaUpdate) {
  if (data.padre_id) await validarPadre(data.padre_id, id);
  const campos = CAMPOS.filter((c) => (data as any)[c] !== undefined);
  if (campos.length === 0) return obtener(id);
  const valores = campos.map((c) => (data as any)[c]);
  await pool.query(`UPDATE categorias SET ${campos.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, [...valores, id]);
  return obtener(id);
}

export async function eliminar(id: number) {
  await pool.query('UPDATE categorias SET activo = 0 WHERE id = ?', [id]);
}
