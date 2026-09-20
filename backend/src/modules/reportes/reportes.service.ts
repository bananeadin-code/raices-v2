import { query } from '../../db/pool';

const num = (v: any) => Number(v ?? 0);

// Reporte general de un día: ventas, cobranza (abonos), producciones,
// movimientos de inventario entre módulos y remisiones — con detalle.
export async function reporteDia(fecha: string) {
  const ventas = await query<any>(
    `SELECT v.folio, COALESCE(c.nombre,'Público en general') cliente, s.nombre sucursal,
            v.metodo_pago metodo, v.estado, v.total
       FROM ventas v JOIN sucursales s ON s.id=v.sucursal_id LEFT JOIN clientes c ON c.id=v.cliente_id
      WHERE DATE(v.fecha)=? ORDER BY v.folio`, [fecha]);
  const ventasTot = await query<any>(
    `SELECT COUNT(*) n, IFNULL(SUM(total),0) total FROM ventas WHERE DATE(fecha)=? AND estado<>'cancelada'`, [fecha]);
  const ventasPorMetodo = await query<any>(
    `SELECT metodo_pago metodo, COUNT(*) n, IFNULL(SUM(total),0) total
       FROM ventas WHERE DATE(fecha)=? AND estado<>'cancelada' GROUP BY metodo_pago ORDER BY total DESC`, [fecha]);
  const ventasPorSucursal = await query<any>(
    `SELECT s.nombre sucursal, COUNT(*) n, IFNULL(SUM(v.total),0) total
       FROM ventas v JOIN sucursales s ON s.id=v.sucursal_id
      WHERE DATE(v.fecha)=? AND v.estado<>'cancelada' GROUP BY s.id ORDER BY total DESC`, [fecha]);

  const abonos = await query<any>(
    `SELECT ab.monto, ab.metodo, ab.referencia, v.folio venta_folio,
            COALESCE(c.nombre,'Público en general') cliente, u.nombre usuario
       FROM abonos ab JOIN ventas v ON v.id=ab.venta_id LEFT JOIN clientes c ON c.id=v.cliente_id
       JOIN usuarios u ON u.id=ab.usuario_id
      WHERE DATE(ab.fecha)=? ORDER BY ab.id`, [fecha]);
  const abonosTot = await query<any>(
    `SELECT COUNT(*) n, IFNULL(SUM(monto),0) total FROM abonos WHERE DATE(fecha)=?`, [fecha]);

  const producciones = await query<any>(
    `SELECT p.folio, a.nombre articulo, p.cantidad, s.nombre sucursal, p.estado
       FROM producciones p JOIN articulos a ON a.id=p.articulo_id JOIN sucursales s ON s.id=p.sucursal_id
      WHERE DATE(p.fecha)=? ORDER BY p.id`, [fecha]);

  const movPorTipo = await query<any>(
    `SELECT tipo, COUNT(*) n FROM movimientos_inventario WHERE DATE(fecha)=? GROUP BY tipo ORDER BY n DESC`, [fecha]);
  const movimientos = await query<any>(
    `SELECT m.fecha, m.tipo, m.cantidad, m.motivo, s.nombre sucursal, u.nombre usuario,
            COALESCE(a.nombre, mt.nombre) item,
            (CASE WHEN m.articulo_id IS NOT NULL THEN 'Artículo' ELSE 'Materia' END) clase
       FROM movimientos_inventario m JOIN sucursales s ON s.id=m.sucursal_id
       LEFT JOIN usuarios u ON u.id=m.usuario_id
       LEFT JOIN articulos a ON a.id=m.articulo_id LEFT JOIN materias mt ON mt.id=m.materia_id
      WHERE DATE(m.fecha)=? ORDER BY m.id DESC LIMIT 400`, [fecha]);

  const remisiones = await query<any>(
    `SELECT r.folio, COALESCE(c.nombre,'Público en general') cliente, s.nombre sucursal, r.estado,
            (SELECT COUNT(*) FROM remision_items ri WHERE ri.remision_id=r.id) renglones
       FROM remisiones r JOIN sucursales s ON s.id=r.sucursal_id LEFT JOIN clientes c ON c.id=r.cliente_id
      WHERE DATE(r.fecha)=? ORDER BY r.id`, [fecha]);

  return {
    fecha,
    resumen: {
      ventasCount: num(ventasTot[0].n), ventasTotal: num(ventasTot[0].total),
      cobradoCount: num(abonosTot[0].n), cobradoTotal: num(abonosTot[0].total),
      produccionesCount: producciones.length,
      produccionesTerminadas: producciones.filter((p) => p.estado === 'terminado').length,
      movimientosCount: movPorTipo.reduce((s, m) => s + num(m.n), 0),
      remisionesCount: remisiones.length,
    },
    ventas: ventas.map((v) => ({ ...v, total: num(v.total) })),
    ventasPorMetodo: ventasPorMetodo.map((m) => ({ ...m, n: num(m.n), total: num(m.total) })),
    ventasPorSucursal: ventasPorSucursal.map((s) => ({ ...s, n: num(s.n), total: num(s.total) })),
    abonos: abonos.map((a) => ({ ...a, monto: num(a.monto) })),
    producciones: producciones.map((p) => ({ ...p, cantidad: num(p.cantidad) })),
    movPorTipo: movPorTipo.map((m) => ({ ...m, n: num(m.n) })),
    movimientos: movimientos.map((m) => ({ ...m, cantidad: num(m.cantidad) })),
    remisiones: remisiones.map((r) => ({ ...r, renglones: num(r.renglones) })),
  };
}
