/**
 * SEED DE MIGRACIÓN INICIAL — Raíces Duranguenses (nov 2026)
 * ============================================================
 * Deja el sistema con SOLO los datos reales con los que el negocio arranca:
 *   - Limpia TODO lo de prueba/demo (ventas, producción, remisiones, inventario,
 *     artículos/materias demo, clientes demo, usuarios/roles demo, sucursales demo).
 *   - CONSERVA: los 8 clientes migrados, el árbol de categorías, los 10 vehículos
 *     reales, las categorías de caja, y SOLO el usuario admin + rol administrador.
 *   - Crea una única sucursal "Tienda, Nazas".
 *   - Carga el catálogo de ARTÍCULOS (del PDF del cliente, con precios), los
 *     MATERIALES PPR, y el INVENTARIO (cantidades) en esa sucursal.
 *
 * ⚠️  Es un script de PUESTA EN MARCHA: borra datos transaccionales. Correr UNA vez,
 *     antes del go-live (o en la BD de producción recién creada, donde no borra nada).
 *
 *   npm run seed:migracion
 *
 * Idempotente en la carga (find-or-create por nombre; existencias upsert).
 */
import 'dotenv/config';
import { pool } from './pool';
import { CATEGORIAS_NUEVAS, ARTICULOS, MATERIAS } from './data-migracion';

const SUCURSAL = 'Tienda, Nazas';

async function main() {
  const cx = await pool.getConnection();
  try {
    console.log('== Limpieza de datos de prueba ==');
    await cx.query('SET FOREIGN_KEY_CHECKS = 0');
    // Transaccional / demo: se vacía por completo.
    const vaciar = [
      'venta_garantia_puntos', 'venta_garantias', 'venta_items', 'abonos', 'ventas',
      'produccion_materias', 'producciones', 'remision_items', 'remisiones',
      'movimientos_inventario', 'existencias', 'articulo_receta', 'folios',
      'tareas', 'supervisiones', 'vehiculo_notas', 'caja_movimientos', 'bitacora',
      'articulos', 'materias',
    ];
    for (const t of vaciar) { await cx.query(`DELETE FROM ${t}`); }
    // Clientes: conservar solo los migrados (activos con nombre real); borrar demo (ids 1-5 originales).
    await cx.query("DELETE FROM clientes WHERE nombre IN ('Damián','Ferretería El Tornillo','Constructora del Valle S.A.','Plomería Hernández','Público en general')");
    // Usuarios/roles: dejar SOLO admin (id 1) y rol administrador (id 1).
    await cx.query('DELETE FROM usuarios WHERE id <> 1');
    await cx.query('DELETE FROM rol_permisos WHERE rol_id <> 1');
    await cx.query('DELETE FROM roles WHERE id <> 1');
    // Vehículos demo.
    await cx.query("DELETE FROM vehiculos WHERE nombre IN ('Camioneta Nissan','camioneta')");
    // Categorías demo sueltas (no son del árbol real).
    await cx.query("DELETE FROM categorias WHERE padre_id IS NULL AND nombre IN ('Categoría de prueba','Tinacos','Cisternas','Tubería y conexiones','Válvulas')");
    // Sucursales demo (se reemplazan por una sola).
    await cx.query('DELETE FROM sucursales');
    await cx.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('  limpieza lista');

    // ---- Sucursal única ----
    let [sr]: any = await cx.query('SELECT id FROM sucursales WHERE nombre = ? LIMIT 1', [SUCURSAL]);
    let sucursalId: number;
    if (sr[0]) sucursalId = sr[0].id;
    else { const [r]: any = await cx.query('INSERT INTO sucursales (nombre, activo) VALUES (?, 1)', [SUCURSAL]); sucursalId = r.insertId; }
    console.log(`  sucursal "${SUCURSAL}" = id ${sucursalId}`);

    // ---- Categorías: asegurar raíces/subcategorías ----
    async function catId(raiz: string, sub: string | null): Promise<number> {
      const [rr]: any = await cx.query('SELECT id FROM categorias WHERE nombre = ? AND padre_id IS NULL LIMIT 1', [raiz]);
      let rootId: number;
      if (rr[0]) { rootId = rr[0].id; await cx.query('UPDATE categorias SET activo = 1 WHERE id = ?', [rootId]); }
      else { const [r]: any = await cx.query('INSERT INTO categorias (nombre, padre_id, activo) VALUES (?, NULL, 1)', [raiz]); rootId = r.insertId; }
      if (!sub) return rootId;
      const [cc]: any = await cx.query('SELECT id FROM categorias WHERE nombre = ? AND padre_id = ? LIMIT 1', [sub, rootId]);
      if (cc[0]) { await cx.query('UPDATE categorias SET activo = 1 WHERE id = ?', [cc[0].id]); return cc[0].id; }
      const [r]: any = await cx.query('INSERT INTO categorias (nombre, padre_id, activo) VALUES (?, ?, 1)', [sub, rootId]);
      return r.insertId;
    }
    for (const [padre, nombre] of CATEGORIAS_NUEVAS) await catId(padre ?? nombre, padre ? nombre : null);

    // ---- Artículos (catálogo + inventario) ----
    let nArt = 0, nExistArt = 0;
    for (const a of ARTICULOS) {
      const cid = await catId(a.raiz, a.sub);
      let [er]: any = await cx.query('SELECT id FROM articulos WHERE nombre = ? LIMIT 1', [a.nombre]);
      let artId: number;
      if (er[0]) { artId = er[0].id; await cx.query('UPDATE articulos SET categoria_id = ?, precio = ?, activo = 1 WHERE id = ?', [cid, a.precio, artId]); }
      else { const [r]: any = await cx.query('INSERT INTO articulos (nombre, categoria_id, precio, costo, activo) VALUES (?, ?, ?, 0, 1)', [a.nombre, cid, a.precio]); artId = r.insertId; nArt++; }
      await cx.query(
        'INSERT INTO existencias (sucursal_id, articulo_id, cantidad, reservado) VALUES (?, ?, ?, 0) ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad)',
        [sucursalId, artId, a.stock]);
      if (a.stock > 0) nExistArt++;
    }

    // ---- Materiales (PPR + componentes) ----
    let nMat = 0, nExistMat = 0;
    for (const m of MATERIAS) {
      let [er]: any = await cx.query('SELECT id FROM materias WHERE nombre = ? LIMIT 1', [m.nombre]);
      let matId: number;
      if (er[0]) { matId = er[0].id; await cx.query('UPDATE materias SET unidad = ?, costo = ?, activo = 1 WHERE id = ?', [m.unidad, m.costo, matId]); }
      else { const [r]: any = await cx.query('INSERT INTO materias (nombre, unidad, costo, activo) VALUES (?, ?, ?, 1)', [m.nombre, m.unidad, m.costo]); matId = r.insertId; nMat++; }
      await cx.query(
        'INSERT INTO existencias (sucursal_id, materia_id, cantidad, reservado) VALUES (?, ?, ?, 0) ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad)',
        [sucursalId, matId, m.stock]);
      if (m.stock > 0) nExistMat++;
    }

    console.log(`== Carga lista ==`);
    console.log(`  artículos: ${ARTICULOS.length} (nuevos ${nArt}), con stock ${nExistArt}`);
    console.log(`  materiales: ${MATERIAS.length} (nuevos ${nMat}), con stock ${nExistMat}`);
    console.log('Listo.');
  } finally {
    cx.release();
    await pool.end();
  }
}

main().catch(async (e) => { console.error(e); await pool.end().catch(() => {}); process.exit(1); });
