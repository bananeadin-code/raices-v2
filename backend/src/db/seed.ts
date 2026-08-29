import bcrypt from 'bcryptjs';
import { pool } from './pool';

// Crea el rol administrador (con todos los permisos) y un usuario inicial.
// Ejecutar una sola vez, después de crear el esquema:  npm run seed
async function seed() {
  await pool.query(
    `INSERT IGNORE INTO roles (id, nombre, descripcion) VALUES (1, 'administrador', 'Acceso total')`
  );

  const modulos = [
    'pos', 'remisiones', 'cobranza', 'abonos', 'produccion', 'inventario',
    'clientes', 'articulos', 'materias', 'categorias', 'vehiculos', 'sucursales',
    'usuarios', 'roles', 'reportes', 'tareas', 'supervision',
  ];
  for (const m of modulos) {
    await pool.query(
      `INSERT IGNORE INTO rol_permisos (rol_id, modulo, ver, crear, editar, eliminar)
       VALUES (1, ?, 1, 1, 1, 1)`,
      [m]
    );
  }

  const hash = await bcrypt.hash('admin123', 10);
  await pool.query(
    `INSERT IGNORE INTO usuarios (id, usuario, nombre, password_hash, rol_id, activo)
     VALUES (1, 'admin', 'Administrador', ?, 1, 1)`,
    [hash]
  );

  console.log('Seed listo -> usuario: admin  /  contraseña: admin123');
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
