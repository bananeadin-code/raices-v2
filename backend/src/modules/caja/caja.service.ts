import { ResultSetHeader } from 'mysql2';
import { pool, query } from '../../db/pool';
import { ApiError } from '../../utils/http';
import { paged, PageParams } from '../../utils/pagination';
import { MovimientoCreate, CategoriaCreate } from './caja.schema';

// ---------------- Catálogo de categorías ----------------
export async function listarCategorias(p: PageParams, tipo?: string) {
  const clauses = ['activo = 1'];
  const whereParams: any[] = [];
  if (tipo) { clauses.push('tipo = ?'); whereParams.push(tipo); }
  return paged({
    select: 'id, nombre, tipo, activo', from: 'caja_categorias', where: clauses.join(' AND '), whereParams,
    search: { col: 'nombre', q: p.q }, order: 'nombre', page: p.page, pageSize: p.pageSize,
  });
}
export async function crearCategoria(data: CategoriaCreate) {
  const [res] = await pool.query('INSERT INTO caja_categorias (nombre, tipo) VALUES (?, ?)', [data.nombre, data.tipo]);
  return { id: (res as ResultSetHeader).insertId, nombre: data.nombre, tipo: data.tipo, activo: 1 };
}
export async function actualizarCategoria(id: number, data: CategoriaCreate) {
  await pool.query('UPDATE caja_categorias SET nombre = ?, tipo = ? WHERE id = ?', [data.nombre, data.tipo, id]);
  return { id, nombre: data.nombre, tipo: data.tipo };
}
export async function eliminarCategoria(id: number) {
  await pool.query('UPDATE caja_categorias SET activo = 0 WHERE id = ?', [id]);
}

// ---------------- Movimientos de dinero ----------------
export async function listarMovimientos(p: PageParams, tipo?: string) {
  const clauses = ['m.id > 0'];
  const whereParams: any[] = [];
  if (tipo) { clauses.push('m.tipo = ?'); whereParams.push(tipo); }

  // Totales globales de la caja (no dependen del filtro de tipo).
  const tot = await query<any>(
    `SELECT IFNULL(SUM(CASE WHEN tipo='entrada' THEN monto END),0) entradas,
            IFNULL(SUM(CASE WHEN tipo='salida'  THEN monto END),0) salidas
       FROM caja_movimientos`);
  const entradas = Number(tot[0].entradas);
  const salidas = Number(tot[0].salidas);

  const pg = await paged({
    select: `m.id, m.tipo, m.concepto, m.responsable, m.monto, m.fecha, m.categoria_id,
             COALESCE(c.nombre,'—') AS categoria, u.nombre AS usuario`,
    from: `caja_movimientos m LEFT JOIN caja_categorias c ON c.id = m.categoria_id
           LEFT JOIN usuarios u ON u.id = m.usuario_id`,
    where: clauses.join(' AND '), whereParams,
    search: { col: 'm.concepto', q: p.q },
    order: 'm.fecha DESC, m.id DESC', page: p.page, pageSize: p.pageSize,
  });
  return { ...pg, totales: { entradas, salidas, saldo: entradas - salidas } };
}

export async function crearMovimiento(data: MovimientoCreate, usuarioId: number) {
  if (data.categoria_id) {
    const c = await query<any>('SELECT id FROM caja_categorias WHERE id = ? AND activo = 1', [data.categoria_id]);
    if (!c[0]) throw new ApiError(404, 'Categoría no encontrada.');
  }
  const resp = data.responsable ?? null;
  if (data.fecha) {
    const [res] = await pool.query(
      'INSERT INTO caja_movimientos (tipo, categoria_id, concepto, responsable, monto, fecha, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [data.tipo, data.categoria_id ?? null, data.concepto, resp, data.monto, data.fecha, usuarioId]);
    return { id: (res as ResultSetHeader).insertId };
  }
  const [res] = await pool.query(
    'INSERT INTO caja_movimientos (tipo, categoria_id, concepto, responsable, monto, usuario_id) VALUES (?, ?, ?, ?, ?, ?)',
    [data.tipo, data.categoria_id ?? null, data.concepto, resp, data.monto, usuarioId]);
  return { id: (res as ResultSetHeader).insertId };
}

export async function eliminarMovimiento(id: number) {
  await pool.query('DELETE FROM caja_movimientos WHERE id = ?', [id]);
}
