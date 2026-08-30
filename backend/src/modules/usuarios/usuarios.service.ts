import bcrypt from 'bcryptjs';
import { ResultSetHeader } from 'mysql2';
import { pool, query } from '../../db/pool';
import { ApiError } from '../../utils/http';
import { UsuarioCreate, UsuarioUpdate } from './usuarios.schema';
import { paged, PageParams } from '../../utils/pagination';

// Nunca se selecciona password_hash.
const SELECT =
  'SELECT u.id, u.usuario, u.nombre, u.apellidos, u.email, u.telefono, ' +
  'u.rol_id, r.nombre AS rol, u.sucursal_id, s.nombre AS sucursal, u.activo ' +
  'FROM usuarios u JOIN roles r ON r.id = u.rol_id ' +
  'LEFT JOIN sucursales s ON s.id = u.sucursal_id';

export async function listar(p: PageParams, soloInactivos = false) {
  return paged({
    select: 'u.id, u.usuario, u.nombre, u.apellidos, u.email, u.telefono, u.rol_id, r.nombre AS rol, u.sucursal_id, s.nombre AS sucursal, u.activo',
    from: 'usuarios u JOIN roles r ON r.id = u.rol_id LEFT JOIN sucursales s ON s.id = u.sucursal_id',
    where: soloInactivos ? 'u.activo = 0' : 'u.activo = 1', search: { col: 'u.nombre', q: p.q }, order: 'u.nombre',
    page: p.page, pageSize: p.pageSize,
  });
}

export async function reactivar(id: number) {
  await pool.query('UPDATE usuarios SET activo = 1 WHERE id = ?', [id]);
}

export async function obtener(id: number) {
  const rows = await query(`${SELECT} WHERE u.id = ?`, [id]);
  if (!rows[0]) throw new ApiError(404, 'Usuario no encontrado');
  return rows[0];
}

export async function crear(data: UsuarioCreate) {
  const hash = await bcrypt.hash(data.password, 10);
  try {
    const [res] = await pool.query(
      `INSERT INTO usuarios (usuario, nombre, apellidos, email, telefono, password_hash, rol_id, sucursal_id, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.usuario, data.nombre, data.apellidos ?? null, data.email ?? null, data.telefono ?? null,
        hash, data.rol_id, data.sucursal_id ?? null, data.activo ?? true]
    );
    return obtener((res as ResultSetHeader).insertId);
  } catch (e: any) {
    if (e.code === 'ER_DUP_ENTRY') throw new ApiError(409, 'El nombre de usuario ya existe');
    throw e;
  }
}

export async function actualizar(id: number, data: UsuarioUpdate) {
  const sets: string[] = [];
  const vals: any[] = [];
  const campos: (keyof UsuarioUpdate)[] = ['usuario', 'nombre', 'apellidos', 'email', 'telefono', 'rol_id', 'sucursal_id', 'activo'];
  for (const c of campos) {
    if (data[c] !== undefined) { sets.push(`${c} = ?`); vals.push(data[c]); }
  }
  // La contraseña solo se toca si viene (y no vacía).
  if (data.password) { sets.push('password_hash = ?'); vals.push(await bcrypt.hash(data.password, 10)); }

  if (sets.length) {
    try {
      await pool.query(`UPDATE usuarios SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') throw new ApiError(409, 'El nombre de usuario ya existe');
      throw e;
    }
  }
  return obtener(id);
}

export async function eliminar(id: number) {
  await pool.query('UPDATE usuarios SET activo = 0 WHERE id = ?', [id]);
}
