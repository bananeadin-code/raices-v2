import { ResultSetHeader } from 'mysql2';
import { pool, query } from '../../db/pool';
import { ApiError } from '../../utils/http';
import { paged, PageParams } from '../../utils/pagination';
import { SupervisionCreate } from './supervisiones.schema';

export async function listar(p: PageParams) {
  return paged({
    select: `s.id, s.fecha, s.ubicacion, s.lat, s.lng, s.observaciones,
             u.nombre AS supervisor, COALESCE(c.nombre, '—') AS cliente`,
    from: `supervisiones s
           JOIN usuarios u ON u.id = s.usuario_id
           LEFT JOIN clientes c ON c.id = s.cliente_id`,
    search: { col: 'c.nombre', q: p.q },
    order: 's.fecha DESC, s.id DESC', page: p.page, pageSize: p.pageSize,
  });
}

export async function crear(data: SupervisionCreate, usuarioId: number) {
  if (data.cliente_id) {
    const c = await query<any>('SELECT id FROM clientes WHERE id = ? AND activo = 1', [data.cliente_id]);
    if (!c[0]) throw new ApiError(404, 'Cliente no encontrado.');
  }
  const [res] = await pool.query(
    `INSERT INTO supervisiones (usuario_id, cliente_id, ubicacion, lat, lng, observaciones) VALUES (?, ?, ?, ?, ?, ?)`,
    [usuarioId, data.cliente_id ?? null, data.ubicacion ?? null, data.lat ?? null, data.lng ?? null, data.observaciones]);
  return { id: (res as ResultSetHeader).insertId };
}
