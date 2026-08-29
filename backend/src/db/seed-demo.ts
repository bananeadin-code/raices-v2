/**
 * Datos de prueba para los catálogos ya construidos.
 * Usa los servicios reales (misma validación y transacciones que la app),
 * así el inventario y la producción quedan consistentes.
 * Ejecutar una vez:  npm run seed:demo
 */
import 'dotenv/config';
import { pool, query } from './pool';
import * as sucursales from '../modules/sucursales/sucursales.service';
import * as categorias from '../modules/categorias/categorias.service';
import * as clientes from '../modules/clientes/clientes.service';
import * as materias from '../modules/materias/materias.service';
import * as articulos from '../modules/articulos/articulos.service';
import * as inventario from '../modules/inventario/inventario.service';
import * as produccion from '../modules/produccion/produccion.service';

const U = 1; // usuario admin (creado por el seed base)

async function main() {
  const yaExiste = await query('SELECT id FROM articulos WHERE nombre = ? LIMIT 1', ['Tinaco 450 L']);
  if (yaExiste.length) {
    console.log('Los datos de prueba ya existen. Nada que hacer.');
    await pool.end();
    return;
  }

  console.log('== Sembrando datos de prueba (Raíces Duranguenses) ==');

  // --- Sucursales ---
  const fab: any = await sucursales.crear({ nombre: 'Fábrica Guadiana', abreviatura: 'FAB', tipo: 'fabrica' } as any);
  const alm: any = await sucursales.crear({ nombre: 'Almacén General', abreviatura: 'ALM', tipo: 'almacen' } as any);
  const tienda: any = await sucursales.crear({ nombre: 'Tienda Centro', abreviatura: 'CEN', tipo: 'tienda' } as any);
  console.log('Sucursales: 3');

  // --- Categorías ---
  const cat: Record<string, number> = {};
  for (const n of ['Tinacos', 'Cisternas', 'Tubería y conexiones', 'Válvulas', 'Bombas']) {
    const c: any = await categorias.crear({ nombre: n });
    cat[n] = c.id;
  }
  console.log('Categorías: 5');

  // --- Clientes ---
  for (const c of [
    { nombre: 'Ferretería El Tornillo', telefono: '618 812 4501', ciudad: 'Durango' },
    { nombre: 'Constructora del Valle S.A.', telefono: '618 130 7788', rfc: 'CVA120315AB1', ciudad: 'Durango' },
    { nombre: 'Plomería Hernández', telefono: '618 145 9032' },
    { nombre: 'Público en general' },
  ]) await clientes.crear(c as any);
  console.log('Clientes: 4');

  // --- Materias primas ---
  const mat: Record<string, number> = {};
  for (const m of [
    { nombre: 'Polietileno negro', unidad: 'kg', costo: 38 },
    { nombre: 'Pigmento negro', unidad: 'kg', costo: 55 },
    { nombre: 'Tapa roscada', unidad: 'pza', costo: 45 },
    { nombre: 'Empaque de hule', unidad: 'pza', costo: 12 },
    { nombre: 'Válvula de flotador', unidad: 'pza', costo: 90 },
  ]) { const r: any = await materias.crear(m as any); mat[m.nombre] = r.id; }
  console.log('Materias primas: 5');

  // --- Artículos ---
  const art: Record<string, number> = {};
  async function nuevoArt(nombre: string, categoria: string, precio: number, costo: number, prod: boolean) {
    const r: any = await articulos.crear({ nombre, categoria_id: cat[categoria], precio, costo, es_producible: prod } as any);
    art[nombre] = r.id;
  }
  // Producibles (se fabrican)
  await nuevoArt('Tinaco 450 L', 'Tinacos', 1290, 780, true);
  await nuevoArt('Tinaco 750 L', 'Tinacos', 1690, 1050, true);
  await nuevoArt('Tinaco 1100 L', 'Tinacos', 2290, 1450, true);
  await nuevoArt('Cisterna 2800 L', 'Cisternas', 6490, 4200, true);
  // Reventa (no se fabrican)
  await nuevoArt('Tubo PVC 4" x 6m', 'Tubería y conexiones', 320, 210, false);
  await nuevoArt('Codo PVC 90° 4"', 'Tubería y conexiones', 45, 28, false);
  await nuevoArt('Válvula de esfera 1"', 'Válvulas', 120, 78, false);
  await nuevoArt('Bomba periférica 1/2 HP', 'Bombas', 1450, 990, false);
  await nuevoArt('Pegamento PVC 250 ml', 'Tubería y conexiones', 85, 52, false);
  console.log('Artículos: 9');

  // --- Recetas (BOM) ---
  await articulos.setReceta(art['Tinaco 450 L'], [
    { materia_id: mat['Polietileno negro'], cantidad: 9 }, { materia_id: mat['Pigmento negro'], cantidad: 0.4 },
    { materia_id: mat['Tapa roscada'], cantidad: 1 }, { materia_id: mat['Empaque de hule'], cantidad: 1 },
  ]);
  await articulos.setReceta(art['Tinaco 750 L'], [
    { materia_id: mat['Polietileno negro'], cantidad: 14 }, { materia_id: mat['Pigmento negro'], cantidad: 0.6 },
    { materia_id: mat['Tapa roscada'], cantidad: 1 }, { materia_id: mat['Empaque de hule'], cantidad: 1 },
  ]);
  await articulos.setReceta(art['Tinaco 1100 L'], [
    { materia_id: mat['Polietileno negro'], cantidad: 20 }, { materia_id: mat['Pigmento negro'], cantidad: 0.9 },
    { materia_id: mat['Tapa roscada'], cantidad: 1 }, { materia_id: mat['Empaque de hule'], cantidad: 1 },
  ]);
  await articulos.setReceta(art['Cisterna 2800 L'], [
    { materia_id: mat['Polietileno negro'], cantidad: 55 }, { materia_id: mat['Pigmento negro'], cantidad: 2 },
    { materia_id: mat['Tapa roscada'], cantidad: 1 }, { materia_id: mat['Empaque de hule'], cantidad: 2 },
    { materia_id: mat['Válvula de flotador'], cantidad: 1 },
  ]);
  console.log('Recetas: 4');

  // --- Inventario: entradas ---
  const ent = (tipoItem: 'materia' | 'articulo', item_id: number, sucursal_id: number, cantidad: number, motivo: string) =>
    inventario.registrarMovimiento({ tipo: 'entrada', item_tipo: tipoItem, item_id, sucursal_id, cantidad, motivo } as any, U);
  // Materia prima en la fábrica
  await ent('materia', mat['Polietileno negro'], fab.id, 2000, 'Compra inicial');
  await ent('materia', mat['Pigmento negro'], fab.id, 100, 'Compra inicial');
  await ent('materia', mat['Tapa roscada'], fab.id, 300, 'Compra inicial');
  await ent('materia', mat['Empaque de hule'], fab.id, 400, 'Compra inicial');
  await ent('materia', mat['Válvula de flotador'], fab.id, 60, 'Compra inicial');
  // Mercancía de reventa en la tienda
  await ent('articulo', art['Tubo PVC 4" x 6m'], tienda.id, 120, 'Inventario inicial');
  await ent('articulo', art['Codo PVC 90° 4"'], tienda.id, 300, 'Inventario inicial');
  await ent('articulo', art['Válvula de esfera 1"'], tienda.id, 80, 'Inventario inicial');
  await ent('articulo', art['Bomba periférica 1/2 HP'], tienda.id, 15, 'Inventario inicial');
  await ent('articulo', art['Pegamento PVC 250 ml'], tienda.id, 60, 'Inventario inicial');
  console.log('Entradas de inventario: 10');

  // --- Producción (consume materia y da alta producto en la fábrica) ---
  await produccion.crear({ sucursal_id: fab.id, articulo_id: art['Tinaco 450 L'], cantidad: 8, observaciones: 'Lote demo' } as any, U);
  await produccion.crear({ sucursal_id: fab.id, articulo_id: art['Tinaco 750 L'], cantidad: 5, observaciones: 'Lote demo' } as any, U);
  await produccion.crear({ sucursal_id: fab.id, articulo_id: art['Tinaco 1100 L'], cantidad: 3, observaciones: 'Lote demo' } as any, U);
  await produccion.crear({ sucursal_id: fab.id, articulo_id: art['Cisterna 2800 L'], cantidad: 2, observaciones: 'Lote demo' } as any, U);
  console.log('Producciones: 4 (materia consumida, producto dado de alta)');

  // Evita variable sin uso
  void alm;

  console.log('== Datos de prueba sembrados correctamente ==');
  await pool.end();
}

main().catch(async (e) => {
  console.error('Error sembrando datos:', e);
  await pool.end().catch(() => {});
  process.exit(1);
});
