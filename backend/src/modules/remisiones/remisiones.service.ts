import { query, withTransaction } from '../../db/pool';
import { ApiError } from '../../utils/http';
import { paged, PageParams } from '../../utils/pagination';
import { siguienteFolio } from '../inventario/inventario.service';
import { RemisionCreate } from './remisiones.schema';

type Estado = 'pendiente' | 'entregada' | 'cancelada';

export async function listar(p: PageParams, estado?: string) {
  const clauses = ["r.id > 0"];
  const whereParams: any[] = [];
  if (estado) { clauses.push('r.estado = ?'); whereParams.push(estado); }
  return paged({
    select: `r.id, r.folio, r.fecha, r.estado, r.observaciones, r.venta_id,
             s.nombre AS sucursal, u.nombre AS usuario,
             COALESCE(c.nombre, 'Público en general') AS cliente,
             v.folio AS venta_folio,
             (SELECT COUNT(*) FROM remision_items ri WHERE ri.remision_id = r.id) AS renglones`,
    from: `remisiones r
           JOIN sucursales s ON s.id = r.sucursal_id
           JOIN usuarios u ON u.id = r.usuario_id
           LEFT JOIN clientes c ON c.id = r.cliente_id
           LEFT JOIN ventas v ON v.id = r.venta_id`,
    where: clauses.join(' AND '), whereParams,
    search: { col: 'c.nombre', q: p.q },
    order: 'r.fecha DESC, r.id DESC', page: p.page, pageSize: p.pageSize,
  });
}

// Aggregate para imprimir la remisión (encabezado del negocio + cliente + artículos).
export async function obtener(id: number) {
  const rows = await query<any>(
    `SELECT r.*, s.nombre AS sucursal_nombre, s.calle, s.numero, s.colonia, s.cp, s.ciudad, s.telefono AS sucursal_telefono,
            u.nombre AS usuario, v.folio AS venta_folio,
            c.nombre AS cliente_nombre, c.telefono AS cliente_telefono,
            c.calle AS cliente_calle, c.numero AS cliente_numero, c.colonia AS cliente_colonia, c.ciudad AS cliente_ciudad
       FROM remisiones r
       JOIN sucursales s ON s.id = r.sucursal_id
       JOIN usuarios u ON u.id = r.usuario_id
       LEFT JOIN ventas v ON v.id = r.venta_id
       LEFT JOIN clientes c ON c.id = r.cliente_id
      WHERE r.id = ?`, [id]);
  const remision = rows[0];
  if (!remision) throw new ApiError(404, 'Remisión no encontrada.');
  const items = await query<any>(
    `SELECT ri.id, ri.articulo_id, ri.cantidad, a.nombre AS articulo, a.sku
       FROM remision_items ri JOIN articulos a ON a.id = ri.articulo_id
      WHERE ri.remision_id = ? ORDER BY ri.id`, [id]);
  return { ...remision, items };
}

export async function crear(data: RemisionCreate, usuarioId: number) {
  // Resuelve los artículos: manuales o copiados de la venta ligada.
  let items = data.items;
  let clienteId = data.cliente_id ?? null;

  if (data.venta_id) {
    const venta = await query<any>('SELECT id, cliente_id FROM ventas WHERE id = ?', [data.venta_id]);
    if (!venta[0]) throw new ApiError(404, 'La venta ligada no existe.');
    if (clienteId == null) clienteId = venta[0].cliente_id ?? null; // hereda el cliente de la venta
    if (items.length === 0) {
      const vi = await query<any>('SELECT articulo_id, cantidad FROM venta_items WHERE venta_id = ?', [data.venta_id]);
      items = vi.map((r) => ({ articulo_id: r.articulo_id, cantidad: Number(r.cantidad) }));
    }
  }

  if (items.length === 0) throw new ApiError(422, 'Agrega al menos un artículo a la remisión.');

  // Valida que los artículos existan y estén activos.
  const ids = [...new Set(items.map((i) => i.articulo_id))];
  const arts = await query<any>(
    `SELECT id, nombre, activo FROM articulos WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
  const porId = new Map(arts.map((a) => [a.id, a]));
  for (const it of items) {
    const a = porId.get(it.articulo_id);
    if (!a) throw new ApiError(404, `Artículo ${it.articulo_id} no encontrado.`);
    if (!a.activo) throw new ApiError(422, `El artículo "${a.nombre}" está inactivo.`);
  }

  // La remisión es un documento de entrega: NO mueve inventario (el stock lo rige la venta).
  return withTransaction(async (cx) => {
    const folio = await siguienteFolio(cx, data.sucursal_id, 'remision');
    const [res]: any = await cx.query(
      `INSERT INTO remisiones (folio, sucursal_id, cliente_id, venta_id, estado, usuario_id, observaciones)
       VALUES (?, ?, ?, ?, 'pendiente', ?, ?)`,
      [folio, data.sucursal_id, clienteId, data.venta_id ?? null, usuarioId, data.observaciones ?? null]);
    const remisionId = res.insertId;
    for (const it of items) {
      await cx.query('INSERT INTO remision_items (remision_id, articulo_id, cantidad) VALUES (?, ?, ?)',
        [remisionId, it.articulo_id, it.cantidad]);
    }
    return { id: remisionId, folio, estado: 'pendiente' as Estado };
  });
}

const TRANSICIONES: Record<Estado, Estado[]> = {
  pendiente: ['entregada', 'cancelada'],
  entregada: ['cancelada'],
  cancelada: [],
};

export async function cambiarEstado(id: number, nuevo: Estado) {
  const rows = await query<any>('SELECT estado FROM remisiones WHERE id = ?', [id]);
  if (!rows[0]) throw new ApiError(404, 'Remisión no encontrada.');
  const actual = rows[0].estado as Estado;
  if (!TRANSICIONES[actual].includes(nuevo)) {
    throw new ApiError(422, `No se puede cambiar la remisión de "${actual}" a "${nuevo}".`);
  }
  await query('UPDATE remisiones SET estado = ? WHERE id = ?', [nuevo, id]);
  return { id, estado: nuevo };
}
