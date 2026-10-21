import { z } from 'zod';

export const categoriaCreate = z.object({
  nombre: z.string().min(1).max(100),
  padre_id: z.number().int().positive().nullish(), // NULL = categoría raíz
});
export const categoriaUpdate = categoriaCreate.partial();

export type CategoriaCreate = z.infer<typeof categoriaCreate>;
export type CategoriaUpdate = z.infer<typeof categoriaUpdate>;
