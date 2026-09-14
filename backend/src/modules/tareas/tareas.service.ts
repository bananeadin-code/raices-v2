import { ResultSetHeader } from 'mysql2';
import { pool, query } from '../../db/pool';
import { ApiError } from '../../utils/http';
import { paged, PageParams } from '../../utils/pagination';
import { TareaCreate } from './tareas.schema';

export async function listar(p: PageParams, filtros: { estado?: string; asignadaA?: number }) {
  const clauses = ['t.id > 0'];
  const whereParams: any[] = [];
  if (filtros.estado) { clauses.push('t.estado = ?'); whereParams.push(filtros.estado); }
  if (filtros.asignadaA) { clauses.push('t.asignada_a = ?'); whereParams.push(filtros.asignadaA); }
  return paged({
    select: `t.id, t.tema, t.descripcion, t.respuesta, t.estado, t.fecha_limite, t.fecha, t.completada_en,
             t.asignada_a, t.asignada_por,
             ua.nombre AS responsable, up.nombre AS asignador`,
    from: `tareas t
           JOIN usuarios ua ON ua.id = t.asignada_a
           JOIN usuarios up ON up.id = t.asignada_por`,
    where: clauses.join(' AND '), whereParams,
    search: { col: 't.tema', q: p.q },
    order: "t.estado='pendiente' DESC, t.fecha_limite IS NULL, t.fecha_limite ASC, t.id DESC",
    page: p.page, pageSize: p.pageSize,
  });
}

export async function crear(data: TareaCreate, asignadaPor: number) {
  const u = await query<any>('SELECT id FROM usuarios WHERE id = ? AND activo = 1', [data.asignada_a]);
  if (!u[0]) throw new ApiError(404, 'El usuario responsable no existe o está inactivo.');
  const [res] = await pool.query(
    `INSERT INTO tareas (asignada_a, asignada_por, tema, descripcion, fecha_limite) VALUES (?, ?, ?, ?, ?)`,
    [data.asignada_a, asignadaPor, data.tema, data.descripcion ?? null, data.fecha_limite || null]);
  return { id: (res as ResultSetHeader).insertId, estado: 'pendiente' };
}

export async function accion(id: number, estado: 'completada' | 'cancelada', respuesta?: string | null) {
  const rows = await query<any>('SELECT estado FROM tareas WHERE id = ?', [id]);
  if (!rows[0]) throw new ApiError(404, 'Tarea no encontrada.');
  if (rows[0].estado !== 'pendiente') throw new ApiError(422, `La tarea ya está ${rows[0].estado}.`);
  const completadaEn = estado === 'completada' ? new Date() : null;
  await pool.query('UPDATE tareas SET estado = ?, respuesta = ?, completada_en = ? WHERE id = ?',
    [estado, respuesta ?? null, completadaEn, id]);
  return { id, estado };
}
