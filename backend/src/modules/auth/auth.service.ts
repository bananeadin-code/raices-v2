import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../../db/pool';
import { env } from '../../config/env';
import { ApiError } from '../../utils/http';

interface UsuarioRow {
  id: number;
  usuario: string;
  password_hash: string;
  activo: number;
  rol_id: number;
  rol: string;
}

export async function login(usuario: string, password: string) {
  const rows = await query<UsuarioRow>(
    `SELECT u.id, u.usuario, u.password_hash, u.activo, u.rol_id, r.nombre AS rol
       FROM usuarios u JOIN roles r ON r.id = u.rol_id
      WHERE u.usuario = ? LIMIT 1`,
    [usuario]
  );
  const u = rows[0];
  if (!u || !u.activo) throw new ApiError(401, 'Usuario o contraseña incorrectos');

  const ok = await bcrypt.compare(password, u.password_hash);
  if (!ok) throw new ApiError(401, 'Usuario o contraseña incorrectos');

  // Arma los permisos como 'modulo:accion' a partir de rol_permisos
  const permisosRows = await query<{
    modulo: string; ver: number; crear: number; editar: number; eliminar: number;
  }>(`SELECT modulo, ver, crear, editar, eliminar FROM rol_permisos WHERE rol_id = ?`, [u.rol_id]);

  const permisos: string[] = [];
  for (const p of permisosRows) {
    if (p.ver) permisos.push(`${p.modulo}:ver`);
    if (p.crear) permisos.push(`${p.modulo}:crear`);
    if (p.editar) permisos.push(`${p.modulo}:editar`);
    if (p.eliminar) permisos.push(`${p.modulo}:eliminar`);
  }

  const payload = { id: u.id, usuario: u.usuario, rol: u.rol, permisos };
  const token = jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expires } as jwt.SignOptions);
  return { token, usuario: payload };
}

// Cambio de la PROPIA contraseña: se exige la contraseña actual para confirmar.
export async function cambiarMiPassword(userId: number, actual: string, nueva: string) {
  const rows = await query<any>('SELECT password_hash FROM usuarios WHERE id = ?', [userId]);
  if (!rows[0]) throw new ApiError(404, 'Usuario no encontrado.');
  const ok = await bcrypt.compare(actual, rows[0].password_hash);
  if (!ok) throw new ApiError(401, 'La contraseña actual no es correcta.');
  const hash = await bcrypt.hash(nueva, 10);
  await query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hash, userId]);
  return { ok: true };
}
