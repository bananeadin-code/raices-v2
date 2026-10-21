import { PoolConnection, ResultSetHeader } from 'mysql2/promise';
import { pool, query, withTransaction } from '../../db/pool';
import { ApiError } from '../../utils/http';
import { paged, PageParams } from '../../utils/pagination';
import { aplicarMovimiento, ajustarReservado, siguienteFolio } from '../inventario/inventario.service';
import { VentaCreate, AbonoCreate } from './ventas.schema';

// ---- helpers de dinero (2 decimales, sin errores de coma flotante) ----
const r2 = (n: number) => Math.round(n * 100) / 100;

// Disponible = físico - reservado, dentro de la transacción.
async function disponible(cx: PoolConnection, sucursalId: number, articuloId: number): Promise<number> {
  const [rows]: any = await cx.query(
    'SELECT cantidad, reservado FROM existencias WHERE sucursal_id = ? AND articulo_id = ?', [sucursalId, articuloId]);
  return rows.length ? Number(rows[0].cantidad) - Number(rows[0].reservado) : 0;
}

// Stock físico (sin restar reservado), dentro de la transacción.
async function fisico(cx: PoolConnection, sucursalId: number, articuloId: number): Promise<number> {
  const [rows]: any = await cx.query(
    'SELECT cantidad FROM existencias WHERE sucursal_id = ? AND articulo_id = ?', [sucursalId, articuloId]);
  return rows.length ? Number(rows[0].cantidad) : 0;
}

// Deuda viva del cliente = suma de (total - abonos) de sus ventas a crédito no canceladas.
async function saldoCliente(clienteId: number): Promise<number> {
  const rows = await query<any>(
    `SELECT COALESCE(SUM(v.total - IFNULL(a.pagado, 0)), 0) AS deuda
       FROM ventas v
       LEFT JOIN (SELECT venta_id, SUM(monto) AS pagado FROM abonos GROUP BY venta_id) a ON a.venta_id = v.id
      WHERE v.cliente_id = ? AND v.metodo_pago = 'credito' AND v.estado <> 'cancelada'`, [clienteId]);
  return Number(rows[0].deuda);
}

export async function listar(p: PageParams, estado?: string) {
  const clauses = ["v.estado <> ''"]; // placeholder para poder concatenar
  const whereParams: any[] = [];
  if (estado) { clauses.push('v.estado = ?'); whereParams.push(estado); }
  return paged({
    select: `v.id, v.folio, v.fecha, v.estado, v.metodo_pago, v.total, v.fecha_vencimiento,
             s.nombre AS sucursal, u.nombre AS usuario,
             COALESCE(c.nombre, 'Público en general') AS cliente,
             IFNULL(ab.pagado, 0) AS pagado,
             (v.total - IFNULL(ab.pagado, 0)) AS saldo`,
    from: `ventas v
           JOIN sucursales s ON s.id = v.sucursal_id
           JOIN usuarios u ON u.id = v.usuario_id
           LEFT JOIN clientes c ON c.id = v.cliente_id
           LEFT JOIN (SELECT venta_id, SUM(monto) AS pagado FROM abonos GROUP BY venta_id) ab ON ab.venta_id = v.id`,
    where: clauses.join(' AND '), whereParams,
    search: { col: 'c.nombre', q: p.q },
    order: 'v.fecha DESC, v.id DESC', page: p.page, pageSize: p.pageSize,
  });
}

// Cartera de cobranza: crédito confirmado con saldo pendiente.
export async function cobranza(p: PageParams) {
  return paged({
    select: `v.id, v.folio, v.fecha, v.fecha_vencimiento, v.total,
             s.nombre AS sucursal, COALESCE(c.nombre, 'Público en general') AS cliente,
             IFNULL(ab.pagado, 0) AS pagado, (v.total - IFNULL(ab.pagado, 0)) AS saldo,
             (v.fecha_vencimiento IS NOT NULL AND v.fecha_vencimiento < CURDATE()) AS vencida`,
    from: `ventas v
           JOIN sucursales s ON s.id = v.sucursal_id
           LEFT JOIN clientes c ON c.id = v.cliente_id
           LEFT JOIN (SELECT venta_id, SUM(monto) AS pagado FROM abonos GROUP BY venta_id) ab ON ab.venta_id = v.id`,
    where: "v.metodo_pago = 'credito' AND v.estado <> 'cancelada' AND (v.total - IFNULL(ab.pagado, 0)) > 0.009",
    search: { col: 'c.nombre', q: p.q },
    order: 'vencida DESC, v.fecha_vencimiento IS NULL, v.fecha_vencimiento ASC, v.id DESC',
    page: p.page, pageSize: p.pageSize,
  });
}

// Historial de abonos (pagos recibidos), con el total cobrado del filtro actual.
export async function historialAbonos(p: PageParams) {
  const like = p.q ? 'AND c.nombre LIKE ?' : '';
  const likeParam = p.q ? [`%${p.q}%`] : [];
  const base = `FROM abonos ab
                JOIN ventas v ON v.id = ab.venta_id
                LEFT JOIN clientes c ON c.id = v.cliente_id
                JOIN usuarios u ON u.id = ab.usuario_id
                WHERE 1 = 1 ${like}`;
  const totales = await query<any>(`SELECT COUNT(*) AS n, IFNULL(SUM(ab.monto), 0) AS suma ${base}`, likeParam);
  const total = Number(totales[0].n);
  const suma = Number(totales[0].suma);
  const offset = (p.page - 1) * p.pageSize;
  const data = await query<any>(
    `SELECT ab.id, ab.fecha, ab.monto, ab.metodo, ab.referencia,
            v.folio AS venta_folio, v.id AS venta_id,
            COALESCE(c.nombre, 'Público en general') AS cliente, u.nombre AS usuario
     ${base} ORDER BY ab.fecha DESC, ab.id DESC LIMIT ? OFFSET ?`,
    [...likeParam, p.pageSize, offset]);
  return { data, total, page: p.page, pageSize: p.pageSize, suma };
}

// Aggregate completo para la nota / detalle.
export async function obtener(id: number) {
  const rows = await query<any>(
    `SELECT v.*, s.nombre AS sucursal_nombre, s.calle, s.numero, s.colonia, s.cp, s.ciudad, s.telefono AS sucursal_telefono,
            u.nombre AS usuario,
            c.nombre AS cliente_nombre, c.telefono AS cliente_telefono, c.rfc AS cliente_rfc,
            c.calle AS cliente_calle, c.numero AS cliente_numero, c.colonia AS cliente_colonia, c.ciudad AS cliente_ciudad
       FROM ventas v
       JOIN sucursales s ON s.id = v.sucursal_id
       JOIN usuarios u ON u.id = v.usuario_id
       LEFT JOIN clientes c ON c.id = v.cliente_id
      WHERE v.id = ?`, [id]);
  const venta = rows[0];
  if (!venta) throw new ApiError(404, 'Venta no encontrada.');

  const items = await query<any>(
    `SELECT vi.id, vi.articulo_id, vi.cantidad, vi.precio_unitario, vi.importe, a.nombre AS articulo, a.sku
       FROM venta_items vi JOIN articulos a ON a.id = vi.articulo_id
      WHERE vi.venta_id = ? ORDER BY vi.id`, [id]);

  const abonos = await query<any>(
    `SELECT ab.id, ab.monto, ab.metodo, ab.fecha, ab.referencia, u.nombre AS usuario
       FROM abonos ab JOIN usuarios u ON u.id = ab.usuario_id
      WHERE ab.venta_id = ? ORDER BY ab.fecha, ab.id`, [id]);

  const garantiasHead = await query<any>(
    'SELECT id, articulo_id, nombre, meses_garantia, permanente, descripcion, articulos_txt FROM venta_garantias WHERE venta_id = ? ORDER BY id', [id]);
  const garantias = [];
  for (const g of garantiasHead) {
    const puntos = await query<any>(
      'SELECT texto FROM venta_garantia_puntos WHERE venta_garantia_id = ? ORDER BY orden, id', [g.id]);
    garantias.push({ ...g, puntos: puntos.map((p) => p.texto) });
  }

  const pagado = r2(abonos.reduce((s, a) => s + Number(a.monto), 0));
  return { ...venta, items, abonos, garantias, pagado, saldo: r2(Number(venta.total) - pagado) };
}

// Fotografía la garantía en la venta (snapshot). Agrupa por plantilla: si dos
// artículos comparten la misma garantía sale un solo bloque; el campo articulos_txt
// dice a qué artículo(s) de la nota cubre cada bloque (para etiquetarlo al imprimir).
async function snapshotGarantias(cx: PoolConnection, ventaId: number, nombrePorArticulo: Map<number, string>) {
  const porPlantilla = new Map<number, { info: any; articulos: string[] }>();
  for (const [artId, nombre] of nombrePorArticulo) {
    const [arts]: any = await cx.query(
      `SELECT a.garantia_plantilla_id AS pid, g.nombre, g.meses_garantia, g.permanente, g.descripcion, g.activo
         FROM articulos a JOIN garantia_plantillas g ON g.id = a.garantia_plantilla_id
        WHERE a.id = ?`, [artId]);
    const g = arts[0];
    if (!g || !g.activo) continue; // sin plantilla o inactiva
    const grupo = porPlantilla.get(g.pid) ?? { info: g, articulos: [] };
    if (!grupo.articulos.includes(nombre)) grupo.articulos.push(nombre);
    porPlantilla.set(g.pid, grupo);
  }
  for (const [pid, { info, articulos }] of porPlantilla) {
    const [res]: any = await cx.query(
      'INSERT INTO venta_garantias (venta_id, articulo_id, nombre, meses_garantia, permanente, descripcion, articulos_txt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [ventaId, null, info.nombre, info.meses_garantia, info.permanente ? 1 : 0, info.descripcion ?? null, articulos.join(', ')]);
    const [puntos]: any = await cx.query(
      'SELECT texto, orden FROM garantia_puntos WHERE plantilla_id = ? ORDER BY orden, id', [pid]);
    for (const p of puntos) {
      await cx.query('INSERT INTO venta_garantia_puntos (venta_garantia_id, texto, orden) VALUES (?, ?, ?)',
        [res.insertId, p.texto, p.orden]);
    }
  }
}

export async function crear(data: VentaCreate, usuarioId: number) {
  // Validaciones de artículos (existen y están activos) + cálculo de importes.
  const ids = data.items.map((i) => i.articulo_id);
  const arts = await query<any>(
    `SELECT id, nombre, activo FROM articulos WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
  const porId = new Map(arts.map((a) => [a.id, a]));
  for (const it of data.items) {
    const a = porId.get(it.articulo_id);
    if (!a) throw new ApiError(404, `Artículo ${it.articulo_id} no encontrado.`);
    if (!a.activo) throw new ApiError(422, `El artículo "${a.nombre}" está inactivo.`);
  }

  // Cortesía = venta a pura firma, sin costo: se anulan precios e importes para que
  // subtotal/total queden en 0 (coherente con la nota sin precios y con los reportes,
  // que ya excluyen cortesía de los ingresos). El inventario se mueve por cantidad, no por precio.
  const esCortesia = data.metodo_pago === 'cortesia';
  const lineas = data.items.map((it) => {
    const precio = esCortesia ? 0 : it.precio_unitario;
    return { ...it, precio_unitario: precio, importe: r2(it.cantidad * precio) };
  });
  const subtotal = r2(lineas.reduce((s, l) => s + l.importe, 0));
  const descuento = esCortesia ? 0 : r2(data.descuento);
  if (descuento > subtotal) throw new ApiError(422, 'El descuento no puede ser mayor al subtotal.');
  const total = r2(subtotal - descuento);

  // Reglas de crédito
  if (data.metodo_pago === 'credito') {
    if (!data.cliente_id) throw new ApiError(422, 'Una venta a crédito requiere un cliente registrado.');
    const cli = await query<any>('SELECT nombre, limite_credito FROM clientes WHERE id = ? AND activo = 1', [data.cliente_id]);
    if (!cli[0]) throw new ApiError(404, 'Cliente no encontrado.');
    const limite = Number(cli[0].limite_credito);
    if (limite > 0) {
      const deuda = await saldoCliente(data.cliente_id);
      if (deuda + total > limite + 0.009) {
        throw new ApiError(422,
          `Excede el límite de crédito de "${cli[0].nombre}". Límite ${limite.toFixed(2)}, deuda actual ${deuda.toFixed(2)}, esta venta ${total.toFixed(2)}.`);
      }
    }
  } else if (data.cliente_id) {
    const cli = await query<any>('SELECT id FROM clientes WHERE id = ? AND activo = 1', [data.cliente_id]);
    if (!cli[0]) throw new ApiError(404, 'Cliente no encontrado.');
  }

  const entrega = data.estado === 'entregada'; // venta directa
  const nombrePorArticulo = new Map<number, string>(data.items.map((it) => [it.articulo_id, porId.get(it.articulo_id).nombre]));

  return withTransaction(async (cx) => {
    // Venta directa (entregada): valida disponible y descuenta stock físico.
    // El apartado (pendiente) NO valida ni bloquea (puede ir a producción), pero SÍ
    // reserva el stock (existencias.reservado) para no venderlo doble. Si no hay stock,
    // queda como backorder (disponible negativo) hasta que se surta/produzca.
    if (entrega) {
      for (const l of lineas) {
        const disp = await disponible(cx, data.sucursal_id, l.articulo_id);
        if (disp < l.cantidad) {
          const a = porId.get(l.articulo_id);
          throw new ApiError(422,
            `Stock insuficiente de "${a.nombre}" en la sucursal (disponible ${disp}, se requieren ${l.cantidad}). ` +
            `Puedes registrarla como "Pendiente" y entregarla después.`);
        }
      }
    }

    const folio = await siguienteFolio(cx, data.sucursal_id, 'venta');
    const [res]: any = await cx.query(
      `INSERT INTO ventas (folio, sucursal_id, usuario_id, cliente_id, estado, metodo_pago, fecha_vencimiento, subtotal, descuento, total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [folio, data.sucursal_id, usuarioId, data.cliente_id ?? null, data.estado, data.metodo_pago,
        data.fecha_vencimiento ?? null, subtotal, descuento, total]);
    const ventaId = res.insertId;

    for (const l of lineas) {
      await cx.query(
        'INSERT INTO venta_items (venta_id, articulo_id, cantidad, precio_unitario, importe) VALUES (?, ?, ?, ?, ?)',
        [ventaId, l.articulo_id, l.cantidad, l.precio_unitario, l.importe]);
      if (entrega) {
        // Descuenta stock físico y deja rastro en el kardex.
        await aplicarMovimiento(cx, {
          sucursal_id: data.sucursal_id, articulo_id: l.articulo_id, cantidad: -l.cantidad,
          tipo: 'venta', referencia_tipo: 'venta', referencia_id: ventaId, usuario_id: usuarioId,
        });
      } else {
        // Apartado: reserva el stock (no lo consume).
        await ajustarReservado(cx, data.sucursal_id, 'articulo', l.articulo_id, l.cantidad);
      }
    }

    await snapshotGarantias(cx, ventaId, nombrePorArticulo);
    return { id: ventaId, folio, estado: data.estado, total };
  });
}

// Apartado -> entregada: valida stock y lo descuenta (movimiento de venta).
// Es el paso que hacen tras producir/surtir el apartado.
export async function entregar(id: number, usuarioId: number) {
  const rows = await query<any>('SELECT * FROM ventas WHERE id = ?', [id]);
  const venta = rows[0];
  if (!venta) throw new ApiError(404, 'Venta no encontrada.');
  if (venta.estado !== 'pendiente') throw new ApiError(422, `Solo se entrega una venta pendiente (actual: ${venta.estado}).`);
  const items = await query<any>(
    `SELECT vi.articulo_id, vi.cantidad, a.nombre FROM venta_items vi JOIN articulos a ON a.id = vi.articulo_id
      WHERE vi.venta_id = ?`, [id]);

  return withTransaction(async (cx) => {
    // Se valida el stock FÍSICO (no el disponible): esta venta ya tiene su propia
    // reserva, así que restar reservado otra vez sería doble conteo.
    for (const it of items) {
      const fis = await fisico(cx, venta.sucursal_id, it.articulo_id);
      if (fis < Number(it.cantidad)) {
        throw new ApiError(422,
          `No se puede entregar: aún no hay stock físico de "${it.nombre}" (físico ${fis}, se requieren ${it.cantidad}). Surte o produce antes de entregar.`);
      }
    }
    for (const it of items) {
      // Libera la reserva y descuenta el físico (movimiento de venta).
      await ajustarReservado(cx, venta.sucursal_id, 'articulo', it.articulo_id, -Number(it.cantidad));
      await aplicarMovimiento(cx, {
        sucursal_id: venta.sucursal_id, articulo_id: it.articulo_id, cantidad: -Number(it.cantidad),
        tipo: 'venta', referencia_tipo: 'venta', referencia_id: id, usuario_id: usuarioId,
      });
    }
    await cx.query("UPDATE ventas SET estado = 'entregada' WHERE id = ?", [id]);
    return { id, estado: 'entregada' };
  });
}

// Cancela: el apartado no tocó stock (nada que revertir); la entregada reingresa el stock.
export async function cancelar(id: number, usuarioId: number) {
  const rows = await query<any>('SELECT * FROM ventas WHERE id = ?', [id]);
  const venta = rows[0];
  if (!venta) throw new ApiError(404, 'Venta no encontrada.');
  if (venta.estado === 'cancelada') throw new ApiError(422, 'La venta ya está cancelada.');

  const pagos = await query<any>('SELECT COUNT(*) AS n FROM abonos WHERE venta_id = ?', [id]);
  if (pagos[0].n > 0) throw new ApiError(409, 'La venta tiene abonos registrados; no se puede cancelar.');

  const items = await query<any>('SELECT articulo_id, cantidad FROM venta_items WHERE venta_id = ?', [id]);

  return withTransaction(async (cx) => {
    if (venta.estado === 'pendiente') {
      // Libera la reserva que tomó el apartado (no había stock consumido).
      for (const it of items) {
        await ajustarReservado(cx, venta.sucursal_id, 'articulo', it.articulo_id, -Number(it.cantidad));
      }
    } else if (venta.estado === 'entregada') {
      // Reingresa el stock que se había descontado al entregar.
      for (const it of items) {
        await aplicarMovimiento(cx, {
          sucursal_id: venta.sucursal_id, articulo_id: it.articulo_id, cantidad: Number(it.cantidad),
          tipo: 'ajuste', referencia_tipo: 'venta', referencia_id: id, usuario_id: usuarioId,
          motivo: `Cancelación de venta #${venta.folio}`,
        });
      }
    }
    await cx.query("UPDATE ventas SET estado = 'cancelada' WHERE id = ?", [id]);
    return { id, estado: 'cancelada' };
  });
}

export async function registrarAbono(ventaId: number, data: AbonoCreate, usuarioId: number) {
  const rows = await query<any>('SELECT * FROM ventas WHERE id = ?', [ventaId]);
  const venta = rows[0];
  if (!venta) throw new ApiError(404, 'Venta no encontrada.');
  if (venta.estado === 'cancelada') throw new ApiError(422, 'La venta está cancelada.');
  if (venta.metodo_pago !== 'credito') throw new ApiError(422, 'Solo las ventas a crédito reciben abonos.');

  const pag = await query<any>('SELECT IFNULL(SUM(monto), 0) AS pagado FROM abonos WHERE venta_id = ?', [ventaId]);
  const saldo = r2(Number(venta.total) - Number(pag[0].pagado));
  if (saldo <= 0.009) throw new ApiError(422, 'La venta ya está saldada.');
  if (data.monto > saldo + 0.009) throw new ApiError(422, `El abono (${data.monto.toFixed(2)}) excede el saldo (${saldo.toFixed(2)}).`);

  const [res] = await pool.query(
    'INSERT INTO abonos (venta_id, monto, metodo, usuario_id, referencia) VALUES (?, ?, ?, ?, ?)',
    [ventaId, r2(data.monto), data.metodo, usuarioId, data.referencia ?? null]);
  return { id: (res as ResultSetHeader).insertId, saldo: r2(saldo - data.monto) };
}
