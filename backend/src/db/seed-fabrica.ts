/**
 * SEED — Sucursal "Fábrica" + su inventario (2ª tanda, nov 2026).
 * Aditivo e idempotente: NO borra ni altera lo existente.
 *   - Crea la sucursal "Fábrica".
 *   - Materias (químicos + accesorios de fábrica; el sistema viejo los maneja como
 *     materias). Costo en blanco (el viejo no tenía). Pijas ya existe: solo suma stock.
 *   - Existencias de artículos del catálogo (tinacos/cisternas) en Fábrica.
 *   - Artículos "(dañado)" en una categoría nueva "Dañados" + su stock.
 *
 *   npm run seed:fabrica
 */
import 'dotenv/config';
import { pool } from './pool';

const SUCURSAL = 'Fábrica';

// Materias (nombre, unidad, stock). Costo 0 (no había dato real).
const MATERIAS: Array<{ nombre: string; unidad: string; stock: number }> = [
  { nombre: 'Pigmento azul', unidad: 'kg', stock: 17.6 },
  { nombre: 'Pigmento rosa', unidad: 'kg', stock: 1 },
  { nombre: 'Pigmento rojo', unidad: 'kg', stock: 5.15 },
  { nombre: 'Talco zing', unidad: 'kg', stock: 21.2 },
  { nombre: 'Celogen', unidad: 'kg', stock: 40 },
  { nombre: 'Desmoldante', unidad: 'L', stock: 23 },
  { nombre: 'Tapas', unidad: 'pza', stock: 15 },
  { nombre: 'Pijas', unidad: 'pza', stock: 2200 },            // ya existe: solo stock
  { nombre: 'Calcas RaiDur', unidad: 'pza', stock: 49 },
  { nombre: 'Calcas de garantía', unidad: 'pza', stock: 60 },
  { nombre: 'Bridas', unidad: 'pza', stock: 506 },
];

// Artículos del catálogo ya existentes -> stock en Fábrica (nombre EXACTO).
// 450/750 = tinacos; 1,100+ = cisternas (azul/grado solo existen en cisterna).
const ARTICULOS: Array<{ nombre: string; stock: number }> = [
  { nombre: 'TINACO BICAPA NEGRO 450 LTS', stock: 0 },
  { nombre: 'TINACO TRICAPA BEIGE 450 LTS', stock: 0 },
  { nombre: 'TINACO BICAPA NEGRO 750 LTS', stock: 0 },
  { nombre: 'TINACO TRICAPA BEIGE 750 LTS', stock: 0 },
  { nombre: 'CISTERNA NEGRA 1,100 LTS', stock: 22 },
  { nombre: 'CISTERNA BEIGE 1,100 LTS', stock: 0 },
  { nombre: 'CISTERNA AZUL 1,100 LTS', stock: 2 },
  { nombre: 'CISTERNA GRADO ALIMENTICIO 1,100 LTS', stock: 0 },
  { nombre: 'CISTERNA NEGRA 2,700 LTS', stock: 0 },
  { nombre: 'CISTERNA AZUL 2,700 LTS', stock: 4 },
  { nombre: 'CISTERNA BEIGE 2,700 LTS', stock: 0 },   // crema + blanco (ambos beige, 0)
  { nombre: 'CISTERNA NEGRA 5,000 LTS', stock: 4 },
  { nombre: 'CISTERNA BEIGE 5,000 LTS', stock: 0 },
  { nombre: 'CISTERNA AZUL 5,000 LTS', stock: 0 },
  { nombre: 'CISTERNA NEGRA 10,000 LTS', stock: 0 },
  { nombre: 'CISTERNA BEIGE 10,000 LTS', stock: 0 },
  { nombre: 'CISTERNA BALA BEIGE 800 LTS', stock: 0 },
  { nombre: 'CISTERNA BALA NEGRA 800 LTS', stock: 1 },
  { nombre: 'CISTERNA BALA AZUL 800 LTS', stock: 0 },
  { nombre: 'CISTERNA BALA GRADO ALIMENTICIO 800 LTS', stock: 0 },
  { nombre: 'ABREVADERO 1,500 LTS', stock: 0 },
  { nombre: 'CISTERNA NODRIZA 3,000 LTS', stock: 2 },
];

// Dañados -> artículos nuevos en categoría "Dañados" (precio 0).
const DANADOS: Array<{ nombre: string; stock: number }> = [
  { nombre: 'CISTERNA 10,000 LTS (DAÑADA)', stock: 2 },
  { nombre: 'TINACO BICAPA 750 LTS (DAÑADO)', stock: 1 },
  { nombre: 'TINACO TRICAPA 750 LTS (DAÑADO)', stock: 1 },
  { nombre: 'TINACO BICAPA 1,100 LTS (DAÑADO)', stock: 1 },
  { nombre: 'TINACO BICAPA 450 LTS (DAÑADO)', stock: 1 },
  { nombre: 'CISTERNA BALA BEIGE 800 LTS (DAÑADA)', stock: 1 },
  { nombre: 'CISTERNA BALA AZUL 800 LTS (DAÑADA)', stock: 2 },
  { nombre: 'CISTERNA NODRIZA 3,000 LTS (DAÑADA)', stock: 1 },
];

async function main() {
  console.log('Seed Fábrica...');

  // Sucursal
  let [sr]: any = await pool.query('SELECT id FROM sucursales WHERE nombre = ? LIMIT 1', [SUCURSAL]);
  let sucursalId: number;
  if (sr[0]) sucursalId = sr[0].id;
  else { const [r]: any = await pool.query('INSERT INTO sucursales (nombre, activo) VALUES (?, 1)', [SUCURSAL]); sucursalId = r.insertId; }
  console.log(`  sucursal "${SUCURSAL}" = id ${sucursalId}`);

  // Categoría "Dañados"
  let [cr]: any = await pool.query('SELECT id FROM categorias WHERE nombre = ? AND padre_id IS NULL LIMIT 1', ['Dañados']);
  let danadosCat: number;
  if (cr[0]) { danadosCat = cr[0].id; await pool.query('UPDATE categorias SET activo = 1 WHERE id = ?', [danadosCat]); }
  else { const [r]: any = await pool.query('INSERT INTO categorias (nombre, padre_id, activo) VALUES (?, NULL, 1)', ['Dañados']); danadosCat = r.insertId; }

  // Materias (find-or-create) + existencias
  let nMat = 0;
  for (const m of MATERIAS) {
    let [er]: any = await pool.query('SELECT id FROM materias WHERE nombre = ? LIMIT 1', [m.nombre]);
    let matId: number;
    if (er[0]) { matId = er[0].id; await pool.query('UPDATE materias SET unidad = ?, activo = 1 WHERE id = ?', [m.unidad, matId]); }
    else { const [r]: any = await pool.query('INSERT INTO materias (nombre, unidad, costo, activo) VALUES (?, ?, 0, 1)', [m.nombre, m.unidad]); matId = r.insertId; nMat++; }
    await pool.query(
      'INSERT INTO existencias (sucursal_id, materia_id, cantidad, reservado) VALUES (?, ?, ?, 0) ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad)',
      [sucursalId, matId, m.stock]);
  }

  // Artículos del catálogo -> existencias (deben existir ya)
  let nArt = 0; const faltantes: string[] = [];
  for (const a of ARTICULOS) {
    const [er]: any = await pool.query('SELECT id FROM articulos WHERE nombre = ? LIMIT 1', [a.nombre]);
    if (!er[0]) { faltantes.push(a.nombre); continue; }
    await pool.query(
      'INSERT INTO existencias (sucursal_id, articulo_id, cantidad, reservado) VALUES (?, ?, ?, 0) ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad)',
      [sucursalId, er[0].id, a.stock]);
    nArt++;
  }

  // Dañados -> artículos nuevos + existencias
  let nDan = 0;
  for (const d of DANADOS) {
    let [er]: any = await pool.query('SELECT id FROM articulos WHERE nombre = ? LIMIT 1', [d.nombre]);
    let artId: number;
    if (er[0]) { artId = er[0].id; await pool.query('UPDATE articulos SET categoria_id = ?, activo = 1 WHERE id = ?', [danadosCat, artId]); }
    else { const [r]: any = await pool.query('INSERT INTO articulos (nombre, categoria_id, precio, costo, activo) VALUES (?, ?, 0, 0, 1)', [d.nombre, danadosCat]); artId = r.insertId; nDan++; }
    await pool.query(
      'INSERT INTO existencias (sucursal_id, articulo_id, cantidad, reservado) VALUES (?, ?, ?, 0) ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad)',
      [sucursalId, artId, d.stock]);
  }

  console.log(`  materias: ${MATERIAS.length} (nuevas ${nMat})`);
  console.log(`  articulos catalogo con stock en Fábrica: ${nArt}` + (faltantes.length ? ` | NO encontrados: ${faltantes.join(', ')}` : ''));
  console.log(`  dañados: ${DANADOS.length} (nuevos ${nDan}) en categoría "Dañados"`);
  console.log('Listo.');
  await pool.end();
}

main().catch(async (e) => { console.error(e); await pool.end().catch(() => {}); process.exit(1); });
