import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../../db/pool';
import { env } from '../../config/env';
import { ApiError } from '../../utils/http';

// ---------------- Acceso del jefe (fuera de usuarios/roles) ----------------
export async function login(usuario: string, password: string) {
  const rows = await query<any>('SELECT usuario, password_hash FROM jefe_acceso WHERE id = 1 LIMIT 1');
  const j = rows[0];
  if (!j || j.usuario !== usuario) throw new ApiError(401, 'Credenciales incorrectas');
  const ok = await bcrypt.compare(password, j.password_hash);
  if (!ok) throw new ApiError(401, 'Credenciales incorrectas');
  const token = jwt.sign({ jefe: true, usuario }, env.jwt.secret, { expiresIn: env.jwt.expires } as jwt.SignOptions);
  return { token, usuario };
}

export async function cambiarCredenciales(passwordActual: string, nuevoUsuario?: string, nuevaPassword?: string) {
  const rows = await query<any>('SELECT usuario, password_hash FROM jefe_acceso WHERE id = 1 LIMIT 1');
  const j = rows[0];
  if (!j) throw new ApiError(404, 'Acceso del jefe no configurado.');
  const ok = await bcrypt.compare(passwordActual, j.password_hash);
  if (!ok) throw new ApiError(401, 'La contraseña actual no es correcta.');

  const usuario = nuevoUsuario?.trim() || j.usuario;
  const hash = nuevaPassword ? await bcrypt.hash(nuevaPassword, 10) : j.password_hash;
  await query('UPDATE jefe_acceso SET usuario = ?, password_hash = ? WHERE id = 1', [usuario, hash]);
  return { usuario };
}

// ---------------- Reportes (resumen general del sistema) ----------------
const num = (v: any) => Number(v ?? 0);

async function resumen() {
  const hoy = await query<any>(
    "SELECT COUNT(*) n, IFNULL(SUM(total),0) monto FROM ventas WHERE estado <> 'cancelada' AND metodo_pago <> 'cortesia' AND DATE(fecha) = CURDATE()");
  const mes = await query<any>(
    "SELECT COUNT(*) n, IFNULL(SUM(total),0) monto FROM ventas WHERE estado <> 'cancelada' AND metodo_pago <> 'cortesia' AND YEAR(fecha)=YEAR(CURDATE()) AND MONTH(fecha)=MONTH(CURDATE())");
  const cartera = await query<any>(
    `SELECT IFNULL(SUM(v.total - IFNULL(a.pagado,0)),0) saldo
       FROM ventas v LEFT JOIN (SELECT venta_id, SUM(monto) pagado FROM abonos GROUP BY venta_id) a ON a.venta_id=v.id
      WHERE v.metodo_pago='credito' AND v.estado<>'cancelada' AND (v.total - IFNULL(a.pagado,0)) > 0.009`);
  const pendientes = await query<any>("SELECT COUNT(*) n FROM ventas WHERE estado='pendiente'");
  const invArt = await query<any>(
    'SELECT IFNULL(SUM(e.cantidad * a.costo),0) v FROM existencias e JOIN articulos a ON a.id=e.articulo_id WHERE e.articulo_id IS NOT NULL');
  const invMat = await query<any>(
    'SELECT IFNULL(SUM(e.cantidad * m.costo),0) v FROM existencias e JOIN materias m ON m.id=e.materia_id WHERE e.materia_id IS NOT NULL');
  const prod = await query<any>("SELECT COUNT(*) n FROM producciones WHERE estado IN ('en_espera','en_progreso')");
  const clientes = await query<any>('SELECT COUNT(*) n FROM clientes WHERE activo=1');
  const bajoMin = await query<any>(
    `SELECT COUNT(*) n FROM existencias e JOIN articulos a ON a.id=e.articulo_id
      WHERE e.articulo_id IS NOT NULL AND a.minimo IS NOT NULL AND a.minimo > 0 AND (e.cantidad - e.reservado) < a.minimo`);
  return {
    ventasHoy: { n: num(hoy[0].n), monto: num(hoy[0].monto) },
    ventasMes: { n: num(mes[0].n), monto: num(mes[0].monto) },
    carteraPorCobrar: num(cartera[0].saldo),
    ventasPendientes: num(pendientes[0].n),
    valorInventario: num(invArt[0].v) + num(invMat[0].v),
    produccionActiva: num(prod[0].n),
    clientesActivos: num(clientes[0].n),
    articulosBajoMinimo: num(bajoMin[0].n),
  };
}

export async function reporteGeneral() {
  const ventasPorDiaRaw = await query<any>(
    `SELECT DATE(fecha) dia, IFNULL(SUM(total),0) monto, COUNT(*) n
       FROM ventas WHERE estado<>'cancelada' AND metodo_pago<>'cortesia' AND fecha >= (CURDATE() - INTERVAL 29 DAY)
      GROUP BY DATE(fecha) ORDER BY dia`);
  // Serie continua de los últimos 30 días (los días sin ventas van en 0) para que la
  // gráfica de barras siempre muestre 30 columnas y no una sola barra gigante.
  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const porDia = new Map<string, { monto: number; n: number }>();
  for (const r of ventasPorDiaRaw) {
    const k = r.dia instanceof Date ? ymd(r.dia) : String(r.dia).slice(0, 10);
    porDia.set(k, { monto: num(r.monto), n: num(r.n) });
  }
  const ventasPorDia: { dia: string; monto: number; n: number }[] = [];
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  for (let i = 29; i >= 0; i--) {
    const d = new Date(hoy); d.setDate(d.getDate() - i);
    const k = ymd(d); const v = porDia.get(k);
    ventasPorDia.push({ dia: k, monto: v ? v.monto : 0, n: v ? v.n : 0 });
  }
  const topArticulos = await query<any>(
    `SELECT a.nombre, IFNULL(SUM(vi.cantidad),0) unidades, IFNULL(SUM(vi.importe),0) monto
       FROM venta_items vi JOIN ventas v ON v.id=vi.venta_id JOIN articulos a ON a.id=vi.articulo_id
      WHERE v.estado<>'cancelada' GROUP BY a.id ORDER BY monto DESC LIMIT 10`);
  const ventasPorSucursal = await query<any>(
    `SELECT s.nombre, IFNULL(SUM(v.total),0) monto, COUNT(*) n
       FROM ventas v JOIN sucursales s ON s.id=v.sucursal_id
      WHERE v.estado<>'cancelada' AND v.metodo_pago<>'cortesia' GROUP BY s.id ORDER BY monto DESC`);
  const ventasPorMetodo = await query<any>(
    `SELECT metodo_pago metodo, IFNULL(SUM(total),0) monto, COUNT(*) n
       FROM ventas WHERE estado<>'cancelada' GROUP BY metodo_pago ORDER BY monto DESC`);
  const cobranzaRows = await query<any>(
    `SELECT
        IFNULL(SUM(v.total - IFNULL(a.pagado,0)),0) total,
        IFNULL(SUM(CASE WHEN v.fecha_vencimiento IS NOT NULL AND v.fecha_vencimiento < CURDATE()
                        THEN v.total - IFNULL(a.pagado,0) ELSE 0 END),0) vencido
       FROM ventas v LEFT JOIN (SELECT venta_id, SUM(monto) pagado FROM abonos GROUP BY venta_id) a ON a.venta_id=v.id
      WHERE v.metodo_pago='credito' AND v.estado<>'cancelada' AND (v.total - IFNULL(a.pagado,0)) > 0.009`);
  const cobranza = {
    total: num(cobranzaRows[0].total),
    vencido: num(cobranzaRows[0].vencido),
    porVencer: num(cobranzaRows[0].total) - num(cobranzaRows[0].vencido),
  };
  // Quién debe: clientes con saldo de crédito pendiente (mayor saldo primero).
  const deudoresRows = await query<any>(
    `SELECT COALESCE(c.nombre,'Público en general') cliente,
            IFNULL(SUM(v.total - IFNULL(a.pagado,0)),0) saldo,
            IFNULL(SUM(CASE WHEN v.fecha_vencimiento IS NOT NULL AND v.fecha_vencimiento < CURDATE()
                            THEN v.total - IFNULL(a.pagado,0) ELSE 0 END),0) vencido,
            COUNT(*) ventas
       FROM ventas v
       LEFT JOIN clientes c ON c.id=v.cliente_id
       LEFT JOIN (SELECT venta_id, SUM(monto) pagado FROM abonos GROUP BY venta_id) a ON a.venta_id=v.id
      WHERE v.metodo_pago='credito' AND v.estado<>'cancelada' AND (v.total - IFNULL(a.pagado,0)) > 0.009
      GROUP BY v.cliente_id, c.nombre
      ORDER BY saldo DESC LIMIT 50`);
  const deudores = deudoresRows.map((d) => ({ cliente: d.cliente, saldo: num(d.saldo), vencido: num(d.vencido), ventas: num(d.ventas) }));
  const bajoMinimo = await query<any>(
    `SELECT a.nombre articulo, s.nombre sucursal, a.minimo, (e.cantidad - e.reservado) disponible
       FROM existencias e JOIN articulos a ON a.id=e.articulo_id JOIN sucursales s ON s.id=e.sucursal_id
      WHERE e.articulo_id IS NOT NULL AND a.minimo IS NOT NULL AND a.minimo > 0 AND (e.cantidad - e.reservado) < a.minimo
      ORDER BY (e.cantidad - e.reservado) ASC LIMIT 50`);
  const produccionPorEstado = await query<any>(
    'SELECT estado, COUNT(*) n FROM producciones GROUP BY estado');

  const ultimasVentas = await query<any>(
    `SELECT v.folio, COALESCE(c.nombre,'Público en general') cliente, v.total importe, v.fecha, s.nombre sucursal
       FROM ventas v LEFT JOIN clientes c ON c.id=v.cliente_id JOIN sucursales s ON s.id=v.sucursal_id
      WHERE v.estado<>'cancelada' ORDER BY v.id DESC LIMIT 10`);

  const tareasPendientes = await query<any>(
    `SELECT t.tema, ua.nombre responsable, t.fecha_limite
       FROM tareas t JOIN usuarios ua ON ua.id=t.asignada_a
      WHERE t.estado='pendiente' ORDER BY t.fecha_limite IS NULL, t.fecha_limite ASC, t.id DESC LIMIT 20`);

  // ---- Por sucursal: qué producen y qué tienen pendiente ----
  const sucursales = await query<any>('SELECT id, nombre, abreviatura FROM sucursales WHERE activo=1 ORDER BY nombre');
  const prodPend = await query<any>(
    `SELECT s.id sucursal_id, p.folio, a.nombre articulo, p.cantidad, p.estado
       FROM producciones p JOIN sucursales s ON s.id=p.sucursal_id JOIN articulos a ON a.id=p.articulo_id
      WHERE p.estado IN ('en_espera','en_progreso') ORDER BY p.id DESC`);
  const prodMes = await query<any>(
    `SELECT s.id sucursal_id, a.nombre articulo, SUM(p.cantidad) cantidad
       FROM producciones p JOIN sucursales s ON s.id=p.sucursal_id JOIN articulos a ON a.id=p.articulo_id
      WHERE p.estado='terminado' AND YEAR(p.fecha)=YEAR(CURDATE()) AND MONTH(p.fecha)=MONTH(CURDATE())
      GROUP BY s.id, a.id ORDER BY cantidad DESC`);
  const produccionPorSucursal = sucursales.map((s: any) => ({
    sucursal: s.nombre,
    pendientes: prodPend.filter((p) => p.sucursal_id === s.id)
      .map((p) => ({ folio: p.folio, articulo: p.articulo, cantidad: num(p.cantidad), estado: p.estado })),
    producidoMes: prodMes.filter((p) => p.sucursal_id === s.id)
      .map((p) => ({ articulo: p.articulo, cantidad: num(p.cantidad) })),
  }));

  // ---- Matriz de existencias por sucursal (artículo × sucursal) ----
  const matriz = async (tabla: 'articulos' | 'materias') => {
    const col = tabla === 'articulos' ? 'articulo_id' : 'materia_id';
    const rows = await query<any>(
      `SELECT x.nombre item, e.sucursal_id, (e.cantidad - e.reservado) disponible
         FROM existencias e JOIN ${tabla} x ON x.id = e.${col}
        WHERE e.${col} IS NOT NULL AND x.activo = 1`);
    type Fila = { item: string; celdas: Record<number, number>; total: number };
    const porItem = new Map<string, Fila>();
    for (const r of rows) {
      const f: Fila = porItem.get(r.item) ?? { item: r.item, celdas: {}, total: 0 };
      f.celdas[r.sucursal_id] = num(r.disponible);
      f.total += num(r.disponible);
      porItem.set(r.item, f);
    }
    const filas = [...porItem.values()].filter((f) => f.total !== 0).sort((a, b) => a.item.localeCompare(b.item));
    return { sucursales: sucursales.map((s: any) => ({ id: s.id, nombre: s.nombre, abreviatura: s.abreviatura })), filas };
  };

  return {
    resumen: await resumen(),
    ventasPorDia,
    topArticulos: topArticulos.map((r) => ({ nombre: r.nombre, unidades: num(r.unidades), monto: num(r.monto) })),
    ventasPorSucursal: ventasPorSucursal.map((r) => ({ nombre: r.nombre, monto: num(r.monto), n: num(r.n) })),
    ventasPorMetodo: ventasPorMetodo.map((r) => ({ metodo: r.metodo, monto: num(r.monto), n: num(r.n) })),
    ultimasVentas: ultimasVentas.map((r) => ({ folio: r.folio, cliente: r.cliente, importe: num(r.importe), fecha: r.fecha, sucursal: r.sucursal })),
    cobranza,
    deudores,
    bajoMinimo: bajoMinimo.map((r) => ({ ...r, minimo: num(r.minimo), disponible: num(r.disponible) })),
    produccionPorEstado: produccionPorEstado.map((r) => ({ estado: r.estado, n: num(r.n) })),
    produccionPorSucursal,
    tareasPendientes: tareasPendientes.map((r) => ({ tema: r.tema, responsable: r.responsable, fecha_limite: r.fecha_limite })),
    inventario: await matriz('articulos'),
    materias: await matriz('materias'),
  };
}
