/**
 * Migración 3 (datos reales + ajustes de capacitación, oct 2026):
 *  - categorias: árbol de 2 niveles (padre_id) + siembra del catálogo real de productos.
 *  - vehiculos: campos marca / anio / serie + alta de la flotilla real (10 unidades).
 *  - caja_categorias: columna 'tipo' (entrada|salida); se reemplazan las genéricas por
 *    las que pidió el cliente (Entradas de programa / Instalación / Compras / Gastos...).
 *  - caja_movimientos: columna 'responsable' (para el recibo de gasto).
 *
 * Ejecutar una vez:  npm run migrate:mig3
 * Idempotente (se puede volver a correr sin duplicar).
 */
import 'dotenv/config';
import { pool } from './pool';

async function tryExec(label: string, sql: string) {
  try {
    await pool.query(sql);
    console.log('  + ' + label);
  } catch (e: any) {
    if (['ER_DUP_FIELDNAME', 'ER_DUP_KEYNAME', 'ER_TABLE_EXISTS_ERROR', 'ER_CANT_CREATE_TABLE'].includes(e.code)
        || /Duplicate|already exists|exists/i.test(e.message)) {
      console.log('  = ' + label + ' (ya existía)');
    } else {
      throw e;
    }
  }
}

// --- Catálogo de productos (padre -> hijos) ---
const CATEGORIAS: Array<[string, string[]]> = [
  ['Calentador solar', ['Baja presión', 'Alta presión']],
  ['Tinaco', ['Tinaco bicapa', 'Tinaco tricapa']],
  ['Cisterna', ['Cisterna bala']],
  ['Accesorios', []],
  ['Minisplit', []],
  ['Bases de herrería', []],
  ['Pintura', []],
  ['Calentador de paso', []],
  ['Bombas', []],
  ['Instalaciones', ['Instalación calentador solar', 'Instalación de calentador de paso', 'Instalación de minisplit']],
];

// --- Categorías de caja por tipo (reemplazan las genéricas) ---
const CAJA_CATS: Array<[string, 'entrada' | 'salida']> = [
  ['Entradas de programa', 'entrada'],
  ['Entradas de notas pasadas', 'entrada'],
  ['Instalación', 'entrada'],
  ['Compras', 'salida'],
  ['Gastos', 'salida'],
];

// --- Flotilla real (Excel Tauro + Word informativo) ---
const VEHICULOS: Array<{ nombre: string; marca: string; anio: number | null; placas: string | null; serie: string | null }> = [
  { nombre: 'Frontier (rotulado AM)', marca: 'Nissan', anio: 2014, placas: 'JX-15-488', serie: null },
  { nombre: 'NP 300 (rotulado AM)', marca: 'Nissan', anio: 2023, placas: 'FN-7789-D', serie: null },
  { nombre: 'Ranger (rotulado AM)', marca: 'Ford', anio: 1989, placas: null, serie: null },
  { nombre: 'Estacas (rotulado AM)', marca: 'Nissan', anio: 1988, placas: null, serie: null },
  { nombre: 'Lobo F150 (rotulado AM)', marca: 'Ford', anio: 1999, placas: 'FN-7788-D', serie: null },
  { nombre: 'Atos (rotulado AM)', marca: 'Hyundai', anio: 2008, placas: 'GEF-705-B', serie: null },
  { nombre: 'Cheyenne Paq H LT Aut', marca: 'Chevrolet', anio: 2023, placas: 'FM-982-8C', serie: '3GCND9ED6PG103004' },
  { nombre: 'Tracker Paq. M Premier', marca: 'Chevrolet', anio: 2023, placas: 'GE-E89-0C', serie: '93CER76C8PB215068' },
  { nombre: 'Suburban 5.3L Premier', marca: 'Chevrolet', anio: 2023, placas: 'WJB-146-B', serie: '1GNSK9KD2PR136022' },
  { nombre: 'International (camión)', marca: 'International', anio: 2000, placas: null, serie: '2HSFMAMROYCO30818' },
];

async function main() {
  console.log('Migración 3...');

  // ---------- Categorías: árbol ----------
  await tryExec('categorias.padre_id',
    'ALTER TABLE categorias ADD COLUMN padre_id INT UNSIGNED NULL AFTER nombre');
  await tryExec('categorias FK padre',
    'ALTER TABLE categorias ADD CONSTRAINT fk_categoria_padre FOREIGN KEY (padre_id) REFERENCES categorias(id)');

  async function idCategoria(nombre: string, padreId: number | null): Promise<number> {
    const [rows]: any = await pool.query(
      'SELECT id FROM categorias WHERE nombre = ? AND padre_id <=> ? LIMIT 1', [nombre, padreId]);
    if (rows[0]) {
      await pool.query('UPDATE categorias SET activo = 1 WHERE id = ?', [rows[0].id]);
      return rows[0].id;
    }
    const [res]: any = await pool.query(
      'INSERT INTO categorias (nombre, padre_id, activo) VALUES (?, ?, 1)', [nombre, padreId]);
    return res.insertId;
  }
  let nCat = 0;
  for (const [padre, hijos] of CATEGORIAS) {
    const padreId = await idCategoria(padre, null); nCat++;
    for (const hijo of hijos) { await idCategoria(hijo, padreId); nCat++; }
  }
  console.log(`  + catálogo de productos asegurado (${nCat} categorías)`);

  // ---------- Caja: tipo + reemplazo de catálogo ----------
  await tryExec('caja_categorias.tipo',
    "ALTER TABLE caja_categorias ADD COLUMN tipo ENUM('entrada','salida') NOT NULL DEFAULT 'salida' AFTER nombre");
  await tryExec('caja_movimientos.responsable',
    'ALTER TABLE caja_movimientos ADD COLUMN responsable VARCHAR(160) NULL AFTER concepto');

  // Reemplazo: se desactivan las categorías de caja previas y se siembran las nuevas.
  for (const [nombre, tipo] of CAJA_CATS) {
    const [rows]: any = await pool.query('SELECT id FROM caja_categorias WHERE nombre = ? LIMIT 1', [nombre]);
    if (rows[0]) {
      await pool.query('UPDATE caja_categorias SET tipo = ?, activo = 1 WHERE id = ?', [tipo, rows[0].id]);
    } else {
      await pool.query('INSERT INTO caja_categorias (nombre, tipo, activo) VALUES (?, ?, 1)', [nombre, tipo]);
    }
  }
  const nuevos = CAJA_CATS.map(([n]) => n);
  await pool.query(
    `UPDATE caja_categorias SET activo = 0 WHERE nombre NOT IN (${nuevos.map(() => '?').join(',')})`, nuevos);
  console.log(`  + categorías de caja reemplazadas (${CAJA_CATS.length} activas, por tipo)`);

  // ---------- Vehículos: campos + flotilla real ----------
  await tryExec('vehiculos.marca', 'ALTER TABLE vehiculos ADD COLUMN marca VARCHAR(60) NULL AFTER nombre');
  await tryExec('vehiculos.anio', 'ALTER TABLE vehiculos ADD COLUMN anio SMALLINT UNSIGNED NULL AFTER marca');
  await tryExec('vehiculos.serie', 'ALTER TABLE vehiculos ADD COLUMN serie VARCHAR(40) NULL AFTER placas');

  let nVeh = 0;
  for (const v of VEHICULOS) {
    // Dedup por serie (si tiene) o por nombre+placas.
    let existe: any[];
    if (v.serie) {
      [existe] = await pool.query('SELECT id FROM vehiculos WHERE serie = ? LIMIT 1', [v.serie]) as any;
    } else {
      [existe] = await pool.query('SELECT id FROM vehiculos WHERE nombre = ? AND marca <=> ? LIMIT 1', [v.nombre, v.marca]) as any;
    }
    if (existe[0]) continue;
    await pool.query(
      'INSERT INTO vehiculos (nombre, marca, anio, placas, serie, activo) VALUES (?, ?, ?, ?, ?, 1)',
      [v.nombre, v.marca, v.anio, v.placas, v.serie]);
    nVeh++;
  }
  console.log(`  + flotilla real: ${nVeh} vehículos nuevos (de ${VEHICULOS.length})`);

  console.log('Listo.');
  await pool.end();
}

main().catch(async (e) => { console.error(e); await pool.end().catch(() => {}); process.exit(1); });
