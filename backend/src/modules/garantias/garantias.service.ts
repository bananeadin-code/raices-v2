import { query, withTransaction } from '../../db/pool';
import { ApiError } from '../../utils/http';
import { paged, PageParams } from '../../utils/pagination';
import { GarantiaUpsert } from './garantias.schema';

export async function listar(p: PageParams) {
  return paged({
    select: `g.id, g.nombre, g.meses_garantia, g.permanente, g.descripcion, g.activo,
             (SELECT COUNT(*) FROM garantia_puntos gp WHERE gp.plantilla_id = g.id) AS puntos`,
    from: 'garantia_plantillas g',
    where: 'g.activo = 1',
    search: { col: 'g.nombre', q: p.q },
    order: 'g.nombre', page: p.page, pageSize: p.pageSize,
  });
}

export async function obtener(id: number) {
  const rows = await query<any>('SELECT * FROM garantia_plantillas WHERE id = ?', [id]);
  if (!rows[0]) throw new ApiError(404, 'Plantilla de garantía no encontrada.');
  const puntos = await query<any>(
    'SELECT id, texto, orden FROM garantia_puntos WHERE plantilla_id = ? ORDER BY orden, id', [id]);
  return { ...rows[0], puntos };
}

export async function crear(data: GarantiaUpsert) {
  return withTransaction(async (cx) => {
    const [res]: any = await cx.query(
      'INSERT INTO garantia_plantillas (nombre, meses_garantia, permanente, descripcion, activo) VALUES (?, ?, ?, ?, ?)',
      [data.nombre, data.meses_garantia, data.permanente ? 1 : 0, data.descripcion ?? null, data.activo ? 1 : 0]);
    const id = res.insertId;
    await reemplazarPuntos(cx, id, data.puntos);
    return id;
  }).then((id) => obtener(id)); // obtener FUERA de la transacción (ya commiteada)
}

export async function actualizar(id: number, data: GarantiaUpsert) {
  const rows = await query<any>('SELECT id FROM garantia_plantillas WHERE id = ?', [id]);
  if (!rows[0]) throw new ApiError(404, 'Plantilla de garantía no encontrada.');
  await withTransaction(async (cx) => {
    await cx.query(
      'UPDATE garantia_plantillas SET nombre = ?, meses_garantia = ?, permanente = ?, descripcion = ?, activo = ? WHERE id = ?',
      [data.nombre, data.meses_garantia, data.permanente ? 1 : 0, data.descripcion ?? null, data.activo ? 1 : 0, id]);
    await reemplazarPuntos(cx, id, data.puntos);
  });
  return obtener(id); // ya commiteado
}

// Reemplaza en bloque los puntos de una plantilla (más simple y sin drift que diff por punto).
async function reemplazarPuntos(cx: any, plantillaId: number, puntos: string[]) {
  await cx.query('DELETE FROM garantia_puntos WHERE plantilla_id = ?', [plantillaId]);
  let orden = 0;
  for (const texto of puntos) {
    await cx.query('INSERT INTO garantia_puntos (plantilla_id, texto, orden) VALUES (?, ?, ?)',
      [plantillaId, texto, orden++]);
  }
}

// Baja lógica: se conserva para no romper artículos/ventas que la referencian.
export async function eliminar(id: number) {
  await query('UPDATE garantia_plantillas SET activo = 0 WHERE id = ?', [id]);
}
