/**
 * Siembra de clientes — tanda de migración 1 (oct 2026).
 * Clientes que el negocio pidió pasar del sistema viejo (uraiz24_sistema) al nuevo.
 * Los datos reales (teléfono, localidad, CP) se tomaron del sistema viejo y quedan
 * aquí fijos para que esta siembra sea reproducible en el servidor SIN necesitar la
 * BD vieja. Campos vacíos: el negocio los completa después desde la pantalla de Clientes.
 *
 * Ejecutar:  npm run seed:clientes-mig    (idempotente: no duplica por nombre)
 */
import 'dotenv/config';
import { pool } from './pool';

type Cli = {
  nombre: string; telefono?: string | null; ciudad?: string | null; cp?: string | null;
  rfc?: string | null; colonia?: string | null; calle?: string | null; numero?: string | null;
};

// Datos reales de la 1a tanda de migración.
const CLIENTES: Cli[] = [
  { nombre: 'Jaime Soto', telefono: '674-101-58-45', ciudad: 'Santiago Papasquiaro', cp: '34000' },
  { nombre: 'Jaime (El Salto)', telefono: '618-246-73-54', ciudad: 'El Salto', cp: null },
  { nombre: 'Daniel Nevárez', telefono: '677-101-15-43', ciudad: 'Nuevo Ideal', cp: '34000' },
  { nombre: 'Mario Retana', telefono: null, ciudad: null, cp: '34000' },
  { nombre: 'Presidencia de Santa María', telefono: '649-112-24-18', ciudad: 'Santa María del Oro', cp: '34000' },
  { nombre: 'Municipio de Guadalupe Victoria', telefono: null, ciudad: 'Guadalupe Victoria', cp: '34000' },
  // No estaban en el sistema viejo: se crean SOLO con el nombre de la lista (sin datos
  // inventados); el negocio completa teléfono/ciudad/etc. desde la pantalla de Clientes.
  { nombre: 'Alex Pan', telefono: null, ciudad: null, cp: null },
  { nombre: 'Sara Cuencamé', telefono: null, ciudad: null, cp: null },
];

async function main() {
  console.log('Sembrando clientes (tanda de migración 1)...');
  let nuevos = 0, existentes = 0;
  for (const c of CLIENTES) {
    const [rows]: any = await pool.query('SELECT id FROM clientes WHERE nombre = ? AND activo = 1 LIMIT 1', [c.nombre]);
    if (rows[0]) { existentes++; console.log('  = ' + c.nombre + ' (ya existía)'); continue; }
    await pool.query(
      `INSERT INTO clientes (nombre, telefono, rfc, calle, numero, colonia, cp, ciudad, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [c.nombre, c.telefono ?? null, c.rfc ?? null, c.calle ?? null, c.numero ?? null,
        c.colonia ?? null, c.cp ?? null, c.ciudad ?? null]);
    nuevos++; console.log('  + ' + c.nombre);
  }
  console.log(`Listo. ${nuevos} nuevos, ${existentes} ya existían (de ${CLIENTES.length}).`);
  await pool.end();
}

main().catch(async (e) => { console.error(e); await pool.end().catch(() => {}); process.exit(1); });
