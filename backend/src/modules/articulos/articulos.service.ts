import { ResultSetHeader } from 'mysql2';
import { pool, query, withTransaction } from '../../db/pool';
import { ApiError } from '../../utils/http';
import { ArticuloCreate, ArticuloUpdate, RecetaItem } from './articulos.schema';
import { paged, PageParams } from '../../utils/pagination';

const CAMPOS = ['sku', 'nombre', 'categoria_id', 'precio', 'costo', 'es_producible', 'minimo', 'maximo', 'reorden', 'garantia_plantilla_id'] as const;

export async function listar(p: PageParams, categoriaId?: number) {
  const clauses = ['a.activo = 1'];
  const whereParams: any[] = [];
  // Filtro por categoría: si es una categoría padre, incluye también sus subcategorías.
  if (categoriaId) {
    clauses.push('(a.categoria_id = ? OR a.categoria_id IN (SELECT id FROM categorias WHERE padre_id = ?))');
    whereParams.push(categoriaId, categoriaId);
  }
  return paged({
    select: 'a.*, c.nombre AS categoria, g.nombre AS garantia',
    from: 'articulos a LEFT JOIN categorias c ON c.id = a.categoria_id LEFT JOIN garantia_plantillas g ON g.id = a.garantia_plantilla_id',
    where: clauses.join(' AND '), whereParams, search: { col: 'a.nombre', q: p.q }, order: 'a.nombre',
    page: p.page, pageSize: p.pageSize,
  });
}

export async function obtener(id: number) {
  const rows = await query('SELECT * FROM articulos WHERE id = ?', [id]);
  if (!rows[0]) throw new ApiError(404, 'Artículo no encontrado');
  return rows[0];
}

export async function crear(data: ArticuloCreate) {
  const campos = CAMPOS.filter((c) => (data as any)[c] !== undefined);
  const valores = campos.map((c) => (data as any)[c]);
  const [res] = await pool.query(
    `INSERT INTO articulos (${campos.join(', ')}) VALUES (${campos.map(() => '?').join(', ')})`, valores);
  return obtener((res as ResultSetHeader).insertId);
}

export async function actualizar(id: number, data: ArticuloUpdate) {
  const campos = CAMPOS.filter((c) => (data as any)[c] !== undefined);
  if (campos.length === 0) return obtener(id);
  const valores = campos.map((c) => (data as any)[c]);
  await pool.query(`UPDATE articulos SET ${campos.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, [...valores, id]);
  return obtener(id);
}

export async function eliminar(id: number) {
  await pool.query('UPDATE articulos SET activo = 0 WHERE id = ?', [id]);
}

// ---- Receta / BOM ----
export async function getReceta(articuloId: number) {
  await obtener(articuloId); // valida que el artículo exista
  return query(
    `SELECT r.materia_id, m.nombre AS materia, m.unidad, r.cantidad
       FROM articulo_receta r JOIN materias m ON m.id = r.materia_id
      WHERE r.articulo_id = ? ORDER BY m.nombre`, [articuloId]);
}

export async function setReceta(articuloId: number, items: RecetaItem[]) {
  await obtener(articuloId);
  // Evita renglones repetidos de la misma materia
  const vistos = new Set<number>();
  const limpios = items.filter((i) => (vistos.has(i.materia_id) ? false : (vistos.add(i.materia_id), true)));
  await withTransaction(async (cx) => {
    await cx.query('DELETE FROM articulo_receta WHERE articulo_id = ?', [articuloId]);
    if (limpios.length) {
      const rows = limpios.map((i) => [articuloId, i.materia_id, i.cantidad]);
      await cx.query('INSERT INTO articulo_receta (articulo_id, materia_id, cantidad) VALUES ?', [rows]);
    }
  });
  return getReceta(articuloId);
}
