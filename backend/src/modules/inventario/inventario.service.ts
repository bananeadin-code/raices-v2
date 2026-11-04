import { PoolConnection } from 'mysql2/promise';
import { query, withTransaction } from '../../db/pool';
import { ApiError } from '../../utils/http';
import { MovimientoInput, TraspasoInput } from './inventario.schema';
import { paged, PageParams } from '../../utils/pagination';

interface Mov {
  sucursal_id: number;
  articulo_id?: number | null;
  materia_id?: number | null;
  cantidad: number; // con signo: (+) entra, (-) sale
  tipo: string;
  referencia_tipo?: string | null;
  referencia_id?: number | null;
  motivo?: string | null;
  usuario_id: number;
}

// Registra un movimiento y ajusta existencias EN LA MISMA transacción (cx).
// Es el motor central de inventario: lo usan inventario, producción y (luego) el POS.
export async function aplicarMovimiento(cx: PoolConnection, m: Mov) {
  await cx.query(
    `INSERT INTO movimientos_inventario
       (sucursal_id, articulo_id, materia_id, cantidad, tipo, referencia_tipo, referencia_id, motivo, usuario_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [m.sucursal_id, m.articulo_id ?? null, m.materia_id ?? null, m.cantidad, m.tipo,
      m.referencia_tipo ?? null, m.referencia_id ?? null, m.motivo ?? null, m.usuario_id]
  );
  const col = m.articulo_id ? 'articulo_id' : 'materia_id'; // string controlado (no viene del usuario)
  const itemId = m.articulo_id ?? m.materia_id;
  const [ex]: any = await cx.query(
    `SELECT id FROM existencias WHERE sucursal_id = ? AND ${col} = ?`, [m.sucursal_id, itemId]);
  if (ex.length) {
    await cx.query('UPDATE existencias SET cantidad = cantidad + ? WHERE id = ?', [m.cantidad, ex[0].id]);
  } else {
    await cx.query(`INSERT INTO existencias (sucursal_id, ${col}, cantidad, reservado) VALUES (?, ?, ?, 0)`,
      [m.sucursal_id, itemId, m.cantidad]);
  }
}

// Ajusta la cantidad RESERVADA de un item (no toca el stock físico). En transacción.
// delta positivo = reservar; negativo = liberar. Lo usa la producción (y luego el POS).
export async function ajustarReservado(
  cx: PoolConnection, sucursalId: number, itemTipo: 'articulo' | 'materia', itemId: number, delta: number
) {
  const col = itemTipo === 'articulo' ? 'articulo_id' : 'materia_id';
  const [ex]: any = await cx.query(`SELECT id FROM existencias WHERE sucursal_id = ? AND ${col} = ?`, [sucursalId, itemId]);
  if (ex.length) {
    await cx.query('UPDATE existencias SET reservado = reservado + ? WHERE id = ?', [delta, ex[0].id]);
  } else {
    await cx.query(`INSERT INTO existencias (sucursal_id, ${col}, cantidad, reservado) VALUES (?, ?, 0, ?)`, [sucursalId, itemId, delta]);
  }
}

// Folio atómico GLOBAL por tipo (venta/remision/produccion). Decisión del negocio:
// una sola secuencia por tipo para TODAS las sucursales (ya no por sucursal).
// Se conserva el parámetro sucursalId por compatibilidad con los llamadores; no se usa.
export async function siguienteFolio(cx: PoolConnection, _sucursalId: number, tipo: string): Promise<number> {
  await cx.query(
    `INSERT INTO folios_seq (tipo, ultimo_folio) VALUES (?, 1)
     ON DUPLICATE KEY UPDATE ultimo_folio = ultimo_folio + 1`,
    [tipo]);
  const [rows]: any = await cx.query('SELECT ultimo_folio FROM folios_seq WHERE tipo = ?', [tipo]);
  return rows[0].ultimo_folio;
}

async function stockActual(cx: PoolConnection, itemTipo: string, itemId: number, sucursalId: number): Promise<number> {
  const col = itemTipo === 'articulo' ? 'articulo_id' : 'materia_id';
  const [rows]: any = await cx.query(`SELECT cantidad FROM existencias WHERE sucursal_id = ? AND ${col} = ?`, [sucursalId, itemId]);
  return rows.length ? Number(rows[0].cantidad) : 0;
}

// Disponible = cantidad física - reservado. Se usa para no permitir salidas/traspasos sin stock.
async function disponibleActual(cx: PoolConnection, itemTipo: string, itemId: number, sucursalId: number): Promise<number> {
  const col = itemTipo === 'articulo' ? 'articulo_id' : 'materia_id';
  const [rows]: any = await cx.query(`SELECT cantidad, reservado FROM existencias WHERE sucursal_id = ? AND ${col} = ?`, [sucursalId, itemId]);
  return rows.length ? Number(rows[0].cantidad) - Number(rows[0].reservado) : 0;
}

export async function existencias(itemTipo: 'articulo' | 'materia', p: PageParams, sucursalId?: number, categoriaId?: number, bajoMinimo?: boolean) {
  const isArt = itemTipo === 'articulo';
  const from = isArt
    ? 'existencias e JOIN sucursales s ON s.id = e.sucursal_id JOIN articulos a ON a.id = e.articulo_id LEFT JOIN categorias c ON c.id = a.categoria_id'
    : 'existencias e JOIN sucursales s ON s.id = e.sucursal_id JOIN materias m ON m.id = e.materia_id';
  const select = isArt
    ? 'e.id, e.sucursal_id, s.nombre AS sucursal, e.articulo_id AS item_id, a.nombre AS item, c.nombre AS categoria, a.minimo, e.cantidad, e.reservado, (e.cantidad - e.reservado) AS disponible'
    : 'e.id, e.sucursal_id, s.nombre AS sucursal, e.materia_id AS item_id, m.nombre AS item, m.unidad, m.minimo, e.cantidad, e.reservado, (e.cantidad - e.reservado) AS disponible';
  const clauses = [isArt ? 'e.articulo_id IS NOT NULL' : 'e.materia_id IS NOT NULL'];
  const whereParams: any[] = [];
  if (sucursalId) { clauses.push('e.sucursal_id = ?'); whereParams.push(sucursalId); }
  // Filtro por categoría: si es padre, incluye también sus subcategorías.
  if (isArt && categoriaId) {
    clauses.push('(a.categoria_id = ? OR a.categoria_id IN (SELECT id FROM categorias WHERE padre_id = ?))');
    whereParams.push(categoriaId, categoriaId);
  }
  // Solo lo que está por agotarse: disponible por debajo del mínimo (si tiene mínimo definido).
  if (bajoMinimo) {
    const minCol = isArt ? 'a.minimo' : 'm.minimo';
    clauses.push(`(${minCol} IS NOT NULL AND ${minCol} > 0 AND (e.cantidad - e.reservado) < ${minCol})`);
  }
  return paged({
    select, from, where: clauses.join(' AND '), whereParams,
    search: { col: isArt ? 'a.nombre' : 'm.nombre', q: p.q },
    order: 'item, sucursal', page: p.page, pageSize: p.pageSize,
  });
}

// Kardex: historial de movimientos de un item (opcionalmente por sucursal).
export async function kardex(itemTipo: 'articulo' | 'materia', itemId: number, p: PageParams, sucursalId?: number) {
  const col = itemTipo === 'articulo' ? 'articulo_id' : 'materia_id';
  const clauses = [`m.${col} = ?`];
  const whereParams: any[] = [itemId];
  if (sucursalId) { clauses.push('m.sucursal_id = ?'); whereParams.push(sucursalId); }
  return paged({
    select: 'm.id, m.fecha, m.tipo, m.cantidad, m.motivo, m.referencia_tipo, m.referencia_id, s.nombre AS sucursal, u.nombre AS usuario',
    from: 'movimientos_inventario m JOIN sucursales s ON s.id = m.sucursal_id LEFT JOIN usuarios u ON u.id = m.usuario_id',
    where: clauses.join(' AND '), whereParams,
    order: 'm.fecha DESC, m.id DESC', page: p.page, pageSize: p.pageSize,
  });
}

export async function registrarMovimiento(input: MovimientoInput, usuarioId: number) {
  return withTransaction(async (cx) => {
    let delta: number;
    if (input.tipo === 'entrada') {
      if (input.cantidad <= 0) throw new ApiError(422, 'La cantidad debe ser mayor a cero.');
      delta = input.cantidad;
    } else if (input.tipo === 'salida') {
      if (input.cantidad <= 0) throw new ApiError(422, 'La cantidad debe ser mayor a cero.');
      const disp = await disponibleActual(cx, input.item_tipo, input.item_id, input.sucursal_id);
      if (disp < input.cantidad) {
        throw new ApiError(422, `Stock insuficiente. Disponible en la sucursal: ${disp}`);
      }
      delta = -input.cantidad;
    } else {
      // ajuste: fija el total; no puede quedar negativo
      if (input.cantidad < 0) throw new ApiError(422, 'El total no puede ser negativo.');
      const actual = await stockActual(cx, input.item_tipo, input.item_id, input.sucursal_id);
      delta = input.cantidad - actual;
    }
    await aplicarMovimiento(cx, {
      sucursal_id: input.sucursal_id,
      articulo_id: input.item_tipo === 'articulo' ? input.item_id : null,
      materia_id: input.item_tipo === 'materia' ? input.item_id : null,
      cantidad: delta,
      tipo: input.tipo,
      motivo: input.motivo,
      usuario_id: usuarioId,
    });
    return { ok: true };
  });
}

export async function traspasar(input: TraspasoInput, usuarioId: number) {
  if (input.sucursal_origen === input.sucursal_destino) {
    throw new ApiError(422, 'La sucursal de origen y destino deben ser distintas');
  }
  const artId = input.item_tipo === 'articulo' ? input.item_id : null;
  const matId = input.item_tipo === 'materia' ? input.item_id : null;
  return withTransaction(async (cx) => {
    const cant = Math.abs(input.cantidad);
    const disp = await disponibleActual(cx, input.item_tipo, input.item_id, input.sucursal_origen);
    if (disp < cant) {
      throw new ApiError(422, `Stock insuficiente en la sucursal de origen. Disponible: ${disp}`);
    }
    await aplicarMovimiento(cx, { sucursal_id: input.sucursal_origen, articulo_id: artId, materia_id: matId, cantidad: -cant, tipo: 'traspaso', motivo: input.motivo, usuario_id: usuarioId });
    await aplicarMovimiento(cx, { sucursal_id: input.sucursal_destino, articulo_id: artId, materia_id: matId, cantidad: cant, tipo: 'traspaso', motivo: input.motivo, usuario_id: usuarioId });
    return { ok: true };
  });
}
