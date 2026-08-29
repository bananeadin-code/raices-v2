import { z } from 'zod';

export const rolCreate = z.object({
  nombre: z.string().min(1).max(50),
  descripcion: z.string().max(200).nullish(),
});
export const rolUpdate = rolCreate.partial();

// Un renglón de la matriz de permisos: un módulo con sus 4 acciones.
export const permisoItem = z.object({
  modulo: z.string().min(1).max(50),
  ver: z.boolean().default(false),
  crear: z.boolean().default(false),
  editar: z.boolean().default(false),
  eliminar: z.boolean().default(false),
});
export const permisosSet = z.array(permisoItem);

export type RolCreate = z.infer<typeof rolCreate>;
export type RolUpdate = z.infer<typeof rolUpdate>;
export type PermisoItem = z.infer<typeof permisoItem>;
