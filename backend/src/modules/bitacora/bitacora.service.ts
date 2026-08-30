import { pool, query } from '../../db/pool';
import { paged, PageParams } from '../../utils/pagination';

// Registra una acción en la bitácora. Best-effort: si falla, no rompe la operación principal.
export async function registrar(
  usuarioId: number | null, accion: string, entidad?: string, entidadId?: number, detalle?: any
) {
  try {
    await pool.query(
      'INSERT INTO bitacora (usuario_id, accion, entidad, entidad_id, detalle) VALUES (?, ?, ?, ?, ?)',
      [usuarioId, accion, entidad ?? null, entidadId ?? null, detalle ? JSON.stringify(detalle) : null]);
  } catch (e) {
    console.error('No se pudo registrar en bitácora:', e);
  }
}

export async function listar(p: PageParams) {
  return paged({
    select: 'b.id, b.fecha, b.accion, b.entidad, b.entidad_id, b.detalle, u.nombre AS usuario, u.usuario AS login',
    from: 'bitacora b LEFT JOIN usuarios u ON u.id = b.usuario_id',
    search: { col: 'b.accion', q: p.q },
    order: 'b.fecha DESC, b.id DESC', page: p.page, pageSize: p.pageSize,
  });
}
