/**
 * Migración: Garantía / consentimiento de entrega en la nota.
 *
 *  - garantia_plantillas : plantilla por tipo de producto (Cisterna, Tinaco, ...)
 *                          con meses de garantía y una leyenda.
 *  - garantia_puntos     : puntos de verificación/entrega que el cliente revisa y firma.
 *  - articulos.garantia_plantilla_id : enlaza un producto a su plantilla.
 *  - venta_garantias / venta_garantia_puntos : SNAPSHOT de la garantía tomado al emitir
 *                          la venta, para que la nota sea reproducible aunque la
 *                          plantilla cambie después (queda "blindado").
 *
 * Ejecutar una vez:  npm run migrate:garantias
 * Idempotente: ignora lo que ya exista.
 */
import 'dotenv/config';
import { pool } from './pool';

async function tryExec(label: string, sql: string) {
  try {
    await pool.query(sql);
    console.log('  + ' + label);
  } catch (e: any) {
    const dup = ['ER_DUP_FIELDNAME', 'ER_DUP_KEYNAME', 'ER_FK_DUP_NAME', 'ER_TABLE_EXISTS_ERROR'];
    if (dup.includes(e.code) || /Duplicate|already exists/i.test(e.message)) {
      console.log('  = ' + label + ' (ya existía)');
    } else {
      throw e;
    }
  }
}

// Puntos de arranque tomados de la hoja real de la empresa (el cliente los puede editar).
const SEMILLA: { nombre: string; meses: number; descripcion: string; puntos: string[] }[] = [
  {
    nombre: 'Cisterna',
    meses: 12,
    descripcion: 'Instalación correcta para el almacenamiento de agua. Tranquilidad asegurada.',
    puntos: [
      'Ubicación nivelada y firme',
      'Base de concreto que brinda estabilidad y evita deformaciones',
      'Conexiones seguras y funcionales',
      'Bomba de agua instalada a la altura correcta para un óptimo rendimiento',
      'Producto entregado sin fugas, golpes ni daños visibles',
      'Protección para su inversión y su familia',
    ],
  },
  {
    nombre: 'Tinaco',
    meses: 12,
    descripcion: 'Instalación correcta y entrega verificada del tinaco.',
    puntos: [
      'Base nivelada y firme que soporta el peso lleno',
      'Conexiones de entrada y salida seguras y sin fugas',
      'Flotador y tapa colocados correctamente',
      'Producto entregado sin golpes ni daños visibles',
    ],
  },
  {
    nombre: 'Panel Solar',
    meses: 12,
    descripcion: 'Instalación y puesta en marcha del calentador/panel solar.',
    puntos: [
      'Estructura fijada y orientada correctamente',
      'Conexiones hidráulicas y eléctricas seguras',
      'Sistema probado y funcionando al momento de la entrega',
      'Producto entregado sin daños visibles',
    ],
  },
  {
    nombre: 'Splits',
    meses: 12,
    descripcion: 'Instalación del equipo de aire acondicionado (minisplit).',
    puntos: [
      'Unidades interior y exterior fijadas de forma segura',
      'Tuberías, drenaje y conexiones eléctricas correctas',
      'Equipo probado (enfría/calienta) al momento de la entrega',
      'Producto entregado sin golpes ni daños visibles',
    ],
  },
];

async function main() {
  console.log('Migración de Garantías...');

  await tryExec('tabla garantia_plantillas', `
    CREATE TABLE garantia_plantillas (
      id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      nombre         VARCHAR(120) NOT NULL,
      meses_garantia INT UNSIGNED NOT NULL DEFAULT 0,
      descripcion    VARCHAR(300) NULL,
      activo         TINYINT(1) NOT NULL DEFAULT 1,
      creado_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`);

  await tryExec('tabla garantia_puntos', `
    CREATE TABLE garantia_puntos (
      id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      plantilla_id INT UNSIGNED NOT NULL,
      texto        VARCHAR(300) NOT NULL,
      orden        INT UNSIGNED NOT NULL DEFAULT 0,
      CONSTRAINT fk_gpunto_plantilla FOREIGN KEY (plantilla_id) REFERENCES garantia_plantillas(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);

  await tryExec('columna articulos.garantia_plantilla_id',
    `ALTER TABLE articulos ADD COLUMN garantia_plantilla_id INT UNSIGNED NULL`);
  await tryExec('fk articulos -> garantia_plantillas',
    `ALTER TABLE articulos ADD CONSTRAINT fk_articulo_garantia
       FOREIGN KEY (garantia_plantilla_id) REFERENCES garantia_plantillas(id)`);

  await tryExec('tabla venta_garantias', `
    CREATE TABLE venta_garantias (
      id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      venta_id       BIGINT UNSIGNED NOT NULL,
      articulo_id    INT UNSIGNED NULL,
      nombre         VARCHAR(120) NOT NULL,
      meses_garantia INT UNSIGNED NOT NULL DEFAULT 0,
      descripcion    VARCHAR(300) NULL,
      CONSTRAINT fk_vg_venta FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);

  await tryExec('tabla venta_garantia_puntos', `
    CREATE TABLE venta_garantia_puntos (
      id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      venta_garantia_id BIGINT UNSIGNED NOT NULL,
      texto             VARCHAR(300) NOT NULL,
      orden             INT UNSIGNED NOT NULL DEFAULT 0,
      CONSTRAINT fk_vgp_vg FOREIGN KEY (venta_garantia_id) REFERENCES venta_garantias(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);

  // Semilla de plantillas (solo si aún no hay ninguna)
  const [rows]: any = await pool.query('SELECT COUNT(*) AS n FROM garantia_plantillas');
  if (rows[0].n === 0) {
    console.log('Sembrando plantillas de garantía de arranque...');
    for (const p of SEMILLA) {
      const [res]: any = await pool.query(
        'INSERT INTO garantia_plantillas (nombre, meses_garantia, descripcion) VALUES (?, ?, ?)',
        [p.nombre, p.meses, p.descripcion]);
      const pid = res.insertId;
      let orden = 0;
      for (const texto of p.puntos) {
        await pool.query('INSERT INTO garantia_puntos (plantilla_id, texto, orden) VALUES (?, ?, ?)',
          [pid, texto, orden++]);
      }
      console.log(`  + ${p.nombre} (${p.puntos.length} puntos)`);
    }
  } else {
    console.log('  = plantillas ya existentes (no se siembra)');
  }

  console.log('Listo.');
  await pool.end();
}

main().catch(async (e) => { console.error(e); await pool.end().catch(() => {}); process.exit(1); });
