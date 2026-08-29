import { z } from 'zod';

export const usuarioCreate = z.object({
  usuario: z.string().min(1).max(60),
  nombre: z.string().min(1).max(120),
  apellidos: z.string().max(120).nullish(),
  email: z.string().max(150).nullish(),
  telefono: z.string().max(50).nullish(),
  password: z.string().min(4).max(100),
  rol_id: z.number().int().positive(),
  sucursal_id: z.number().int().positive().nullish(),
  activo: z.coerce.boolean().default(true),
});
// En edición la contraseña es opcional (si viene vacía, no se cambia).
export const usuarioUpdate = usuarioCreate.partial();

export type UsuarioCreate = z.infer<typeof usuarioCreate>;
export type UsuarioUpdate = z.infer<typeof usuarioUpdate>;
