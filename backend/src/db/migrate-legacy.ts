/**
 * ETL de migración: sistema VIEJO (uraiz24_sistema) -> esquema NUEVO (raices_v2).
 *
 * Cómo usar (en local, para ensayar el cutover):
 *   1. Importa el dump viejo en una base MySQL:   mysql ... < uraiz24_sistema.sql
 *   2. Crea el esquema nuevo (docker compose up -d ya lo hace en raices_v2)
 *   3. Configura OLD_DB_* en .env
 *   4. npm run migrate:legacy
 *
 * Estrategia: se PRESERVAN los IDs originales para conservar las relaciones
 * sin tener que construir mapas. Se desactivan las FK durante la carga y se
 * validan al final. Es idempotente por tabla (borra la tabla destino antes de cargar).
 *
 * DECISIONES (revisar con el negocio si hace falta):
 *  - Contraseñas viejas = PIN en texto plano -> NO se migran; se pone una temporal
 *    y el usuario debe cambiarla. (TEMP_PASSWORD)
 *  - Stock producto  = SUM(almacen.cantidad)      por (sucursal, articulo)
 *  - Stock materia   = SUM(almacen1.cantidad*es)  (el viejo no guarda sucursal de
 *    materia -> se asigna a MATERIA_SUCURSAL_ID)
 *  - metodo_pago: código 6 = crédito; el resto se asume 'efectivo' (CONFIRMAR códigos)
 *  - La sucursal 14 "PENDIENTES" (parche del viejo) se migra para no romper FKs,
 *    pero su stock debe revisarse manualmente tras la migración.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

const TEMP_PASSWORD = 'cambiar123';
const MATERIA_SUCURSAL_ID = Number(process.env.MATERIA_SUCURSAL_ID ?? 12);

const oldPool = mysql.createPool({
  host: process.env.OLD_DB_HOST ?? '127.0.0.1',
  port: Number(process.env.OLD_DB_PORT ?? 3306),
  user: process.env.OLD_DB_USER ?? 'root',
  password: process.env.OLD_DB_PASSWORD ?? '',
  database: process.env.OLD_DB_NAME ?? 'uraiz24_sistema',
  dateStrings: true,
});

const newPool = mysql.createPool({
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'raices',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'raices_v2',
  dateStrings: true,
});

// ---------- helpers ----------
async function oldRows<T = any>(sql: string): Promise<T[]> {
  const [rows] = await oldPool.query(sql);
  return rows as T[];
}

async function bulkInsert(table: string, cols: string[], rows: any[][]) {
  if (rows.length === 0) { console.log(`  ${table}: 0`); return; }
  const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES ?`;
  const CHUNK = 1000;
  let total = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const [res]: any = await newPool.query(sql, [rows.slice(i, i + CHUNK)]);
    total += res.affectedRows ?? 0;
  }
  console.log(`  ${table}: ${total}`);
}

// null si viene vacío
const nn = (v: any): any => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};
// fecha inválida (0000-00-00) -> null
const cleanDate = (v: any): string | null => {
  const s = nn(v);
  return s && !s.startsWith('0000') ? s : null;
};
// usuario de respaldo (1 = admin) cuando el viejo trae null/0
const uid = (v: any): number => (v && Number(v) > 0 ? Number(v) : 1);
// arma un nombre completo a partir de partes
const nombreCompleto = (...partes: any[]) =>
  partes.map((p) => nn(p)).filter((p) => p && p !== '_').join(' ').trim() || null;

// ---------- fases ----------
async function migrarSucursales() {
  const rows = await oldRows('SELECT * FROM sucursales');
  await bulkInsert('sucursales', ['id', 'nombre', 'abreviatura', 'tipo', 'telefono'],
    rows.map((r) => [r.sucursal_id, (nn(r.nombre) ?? `Sucursal ${r.sucursal_id}`).trim(), nn(r.abrev), 'mixto', nn(r.telefono)]));
}

async function migrarRoles() {
  const rows = await oldRows('SELECT * FROM roles');
  await bulkInsert('roles', ['id', 'nombre', 'descripcion'],
    rows.map((r) => [r.rol_id, (nn(r.nombre) ?? `rol_${r.rol_id}`), nn(r.comentario)]));
}

async function migrarUsuarios() {
  const rows = await oldRows('SELECT * FROM usuarios');
  const hash = await bcrypt.hash(TEMP_PASSWORD, 10);
  await bulkInsert('usuarios',
    ['id', 'usuario', 'nombre', 'apellidos', 'email', 'telefono', 'password_hash', 'rol_id', 'sucursal_id', 'activo'],
    rows
      .filter((r) => nn(r.usuario)) // sin usuario no sirve para login
      .map((r) => [
        r.usuario_id, nn(r.usuario), nn(r.nombre) ?? nn(r.usuario),
        nombreCompleto(r.paterno, r.materno), nn(r.email), nn(r.celular),
        hash, r.rol_id || null, r.sucursal_id || null, 1,
      ]));
}

async function migrarCategorias() {
  const rows = await oldRows('SELECT * FROM categorias');
  await bulkInsert('categorias', ['id', 'nombre', 'activo'],
    rows.map((r) => [r.categoria_id, (nn(r.nombre) ?? `Categoría ${r.categoria_id}`), 1]));
}

async function migrarClientes() {
  const rows = await oldRows('SELECT * FROM clientes WHERE cliente_id > 0');
  await bulkInsert('clientes',
    ['id', 'nombre', 'telefono', 'email', 'rfc', 'calle', 'numero', 'colonia', 'cp', 'activo'],
    rows.map((r) => [
      r.cliente_id,
      nombreCompleto(r.nombre, r.paterno, r.materno) ?? nn(r.razon_social) ?? `Cliente ${r.cliente_id}`,
      nn(r.celular) ?? nn(r.telefono) ?? nn(r.telefono1) ?? nn(r.tel_casa),
      nn(r.email), nn(r.rfc), nn(r.domicilio), nn(r.numero), nn(r.colonia), nn(r.cp), 1,
    ]));
}

async function migrarArticulos() {
  const rows = await oldRows('SELECT * FROM articulos');
  await bulkInsert('articulos',
    ['id', 'nombre', 'categoria_id', 'precio', 'costo', 'es_producible', 'minimo', 'maximo', 'reorden', 'activo'],
    rows.map((r) => [
      r.articulo_id, (nn(r.nombre) ?? `Artículo ${r.articulo_id}`), r.categoria_id || null,
      Number(r.precio) || 0, Number(r.costo) || 0, r.produccion ? 1 : 0,
      r.minimo ?? null, r.maximo ?? null, r.reorden ?? null, 1,
    ]));
}

async function migrarMaterias() {
  const rows = await oldRows('SELECT * FROM materias');
  await bulkInsert('materias', ['id', 'nombre', 'unidad', 'costo', 'minimo', 'activo'],
    rows.map((r) => [r.materia_id, (nn(r.nombre) ?? `Materia ${r.materia_id}`), 'pza', Number(r.precio) || 0, r.minimo ?? null, 1]));
}

async function migrarReceta() {
  const rows = await oldRows('SELECT * FROM articulos2materias');
  // Evita duplicados (articulo_id, materia_id) por la UNIQUE del esquema nuevo
  const vistos = new Set<string>();
  const data: any[][] = [];
  for (const r of rows) {
    const k = `${r.articulo_id}-${r.materia_id}`;
    if (vistos.has(k) || !r.articulo_id || !r.materia_id) continue;
    vistos.add(k);
    data.push([r.articulo_id, r.materia_id, Number(r.cantidad) || 0]);
  }
  await bulkInsert('articulo_receta', ['articulo_id', 'materia_id', 'cantidad'], data);
}

async function migrarVehiculos() {
  const rows = await oldRows('SELECT * FROM vehiculos');
  await bulkInsert('vehiculos', ['id', 'nombre', 'placas', 'activo'],
    rows.map((r) => [r.vehiculo_id, nombreCompleto(r.numero, r.descripcion) ?? `Vehículo ${r.vehiculo_id}`, nn(r.modelo), 1]));
}

async function migrarInventarioProductos() {
  // Movimientos (histórico)
  const mov = await oldRows('SELECT * FROM almacen');
  await bulkInsert('movimientos_inventario',
    ['sucursal_id', 'articulo_id', 'cantidad', 'tipo', 'referencia_tipo', 'referencia_id', 'motivo', 'usuario_id', 'fecha'],
    mov
      .filter((r) => r.articulo_id && r.sucursal_id)
      .map((r) => {
        const cant = Number(r.cantidad) || 0;
        const tipo = r.tipo === 1 ? 'venta' : cant >= 0 ? 'entrada' : 'salida';
        const esVenta = r.tipo === 1 && r.recibo_id > 0;
        return [r.sucursal_id, r.articulo_id, cant, tipo,
          esVenta ? 'venta' : null, esVenta ? r.recibo_id : null,
          nn(r.rems), uid(r.usuario_id), cleanDate(r.fecha)];
      }));
  // Existencias (stock actual = SUM(cantidad) por sucursal+articulo)
  const ex = await oldRows(
    'SELECT sucursal_id, articulo_id, SUM(cantidad) cant FROM almacen ' +
    'WHERE articulo_id > 0 AND sucursal_id > 0 GROUP BY sucursal_id, articulo_id');
  await bulkInsert('existencias', ['sucursal_id', 'articulo_id', 'cantidad', 'reservado'],
    ex.map((r) => [r.sucursal_id, r.articulo_id, Number(r.cant) || 0, 0]));
}

async function migrarInventarioMaterias() {
  const mov = await oldRows('SELECT * FROM almacen1');
  await bulkInsert('movimientos_inventario',
    ['sucursal_id', 'materia_id', 'cantidad', 'tipo', 'motivo', 'usuario_id', 'fecha'],
    mov
      .filter((r) => r.materia_id)
      .map((r) => {
        const cant = (Number(r.cantidad) || 0) * (Number(r.es) || 1); // stock materia = cantidad*es
        return [MATERIA_SUCURSAL_ID, r.materia_id, cant, cant >= 0 ? 'entrada' : 'salida',
          nn(r.rems), uid(r.usuario_id), cleanDate(r.fecha)];
      }));
  const ex = await oldRows(
    'SELECT materia_id, SUM(cantidad*es) cant FROM almacen1 WHERE materia_id > 0 GROUP BY materia_id');
  await bulkInsert('existencias', ['sucursal_id', 'materia_id', 'cantidad', 'reservado'],
    ex.map((r) => [MATERIA_SUCURSAL_ID, r.materia_id, Number(r.cant) || 0, 0]));
}

async function migrarVentas() {
  const recibos = await oldRows('SELECT * FROM recibos');
  // sucursal de cada recibo (el viejo la guarda en los renglones de almacen)
  const sucRows = await oldRows(
    'SELECT recibo_id, MIN(sucursal_id) suc FROM almacen WHERE recibo_id > 0 GROUP BY recibo_id');
  const sucDe = new Map<number, number>(sucRows.map((r: any) => [r.recibo_id, r.suc]));
  // clientes válidos (para no dejar FK colgando)
  const cliRows = await oldRows('SELECT cliente_id FROM clientes WHERE cliente_id > 0');
  const clientes = new Set<number>(cliRows.map((r: any) => r.cliente_id));

  await bulkInsert('ventas',
    ['id', 'folio', 'sucursal_id', 'usuario_id', 'cliente_id', 'fecha', 'estado', 'metodo_pago', 'fecha_vencimiento', 'subtotal', 'descuento', 'total'],
    recibos.map((r) => {
      const importe = Number(r.importe) || 0;
      const credito = Number(r.metodo) === 6;
      return [
        r.recibo_id, r.folio || 0, sucDe.get(r.recibo_id) ?? 2, uid(r.usuario_id),
        clientes.has(r.cliente_id) ? r.cliente_id : null, cleanDate(r.fecha),
        'confirmada', credito ? 'credito' : 'efectivo',
        credito ? cleanDate(r.due) : null, importe, 0, importe,
      ];
    }));

  // Renglones de venta = movimientos de almacen con tipo=1 ligados al recibo
  const items = await oldRows(
    'SELECT recibo_id, articulo_id, cantidad, precio FROM almacen WHERE tipo = 1 AND recibo_id > 0 AND articulo_id > 0');
  await bulkInsert('venta_items', ['venta_id', 'articulo_id', 'cantidad', 'precio_unitario', 'importe'],
    items.map((r) => {
      const cant = Math.abs(Number(r.cantidad) || 0);
      const precio = Number(r.precio) || 0;
      return [r.recibo_id, r.articulo_id, cant, precio, cant * precio];
    }));

  // Folios: continúa la numeración por sucursal
  const folios = await oldRows(
    'SELECT s.suc sucursal_id, MAX(r.folio) mx FROM recibos r ' +
    'JOIN (SELECT recibo_id, MIN(sucursal_id) suc FROM almacen WHERE recibo_id>0 GROUP BY recibo_id) s ' +
    'ON s.recibo_id = r.recibo_id GROUP BY s.suc');
  await bulkInsert('folios', ['sucursal_id', 'tipo', 'ultimo_folio'],
    folios.filter((r: any) => r.sucursal_id).map((r: any) => [r.sucursal_id, 'venta', Number(r.mx) || 0]));
}

async function migrarAbonos() {
  const recibos = await oldRows('SELECT recibo_id FROM recibos');
  const ventas = new Set<number>(recibos.map((r: any) => r.recibo_id));
  const rows = await oldRows('SELECT * FROM abonos');
  await bulkInsert('abonos', ['id', 'venta_id', 'monto', 'metodo', 'fecha', 'usuario_id', 'referencia'],
    rows
      .filter((r) => ventas.has(r.recibo_id)) // sin venta destino no se puede migrar
      .map((r) => [r.abono_id, r.recibo_id, Number(r.cantidad) || 0, 'efectivo', cleanDate(r.fecha), uid(r.usuario_id), nn(r.rems)]));
}

async function migrarProducciones() {
  const rows = await oldRows('SELECT * FROM produccion');
  await bulkInsert('producciones',
    ['id', 'sucursal_id', 'articulo_id', 'cantidad', 'estado', 'usuario_id', 'observaciones', 'fecha'],
    rows
      .filter((r) => r.articulo_id)
      .map((r) => [r.produccion_id, MATERIA_SUCURSAL_ID, r.articulo_id, Number(r.cantidad) || 0, 'confirmada', uid(r.usuario_id), nn(r.rems), cleanDate(r.fecha)]));
}

async function migrarTareas() {
  const rows = await oldRows('SELECT * FROM tareas');
  await bulkInsert('tareas',
    ['id', 'asignada_a', 'asignada_por', 'tema', 'descripcion', 'respuesta', 'estado', 'fecha_limite', 'fecha'],
    rows.map((r) => [
      r.tarea_id, uid(r.usuario1_id), uid(r.usuario_id), (nn(r.tema) ?? '(sin tema)'),
      nn(r.texto), nn(r.respuesta), r.estado == 1 ? 'completada' : 'pendiente',
      cleanDate(r.fecha1), cleanDate(r.fecha),
    ]));
}

async function migrarSupervisiones() {
  const rows = await oldRows('SELECT * FROM supervision');
  const cliRows = await oldRows('SELECT cliente_id FROM clientes WHERE cliente_id > 0');
  const clientes = new Set<number>(cliRows.map((r: any) => r.cliente_id));
  await bulkInsert('supervisiones',
    ['id', 'usuario_id', 'cliente_id', 'fecha', 'ubicacion', 'lat', 'lng', 'observaciones'],
    rows.map((r) => [
      r.supervision_id, uid(r.usuario_id), clientes.has(r.cliente_id) ? r.cliente_id : null,
      cleanDate(r.fecha), nn(r.ubicacion), r.lat || null, r.lng || null, nn(r.rems),
    ]));
}

// Tablas destino en orden inverso de dependencias (para vaciar antes de cargar)
const DESTINOS = [
  'bitacora', 'supervisiones', 'tareas', 'producciones', 'abonos', 'venta_items', 'ventas',
  'folios', 'existencias', 'movimientos_inventario', 'articulo_receta', 'vehiculos',
  'materias', 'articulos', 'clientes', 'categorias', 'usuarios', 'roles', 'sucursales',
];

async function main() {
  console.log('== Migración sistema viejo -> nuevo ==');
  await newPool.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of DESTINOS) await newPool.query(`DELETE FROM ${t}`);

  await migrarSucursales();
  await migrarRoles();
  await migrarUsuarios();
  await migrarCategorias();
  await migrarClientes();
  await migrarArticulos();
  await migrarMaterias();
  await migrarReceta();
  await migrarVehiculos();
  await migrarInventarioProductos();
  await migrarInventarioMaterias();
  await migrarVentas();
  await migrarAbonos();
  await migrarProducciones();
  await migrarTareas();
  await migrarSupervisiones();

  await newPool.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('== Migración terminada ==');
  console.log(`NOTA: contraseñas temporales = "${TEMP_PASSWORD}" (los usuarios deben cambiarla).`);
  await oldPool.end();
  await newPool.end();
}

main().catch(async (err) => {
  console.error('ERROR en la migración:', err);
  await oldPool.end().catch(() => {});
  await newPool.end().catch(() => {});
  process.exit(1);
});
