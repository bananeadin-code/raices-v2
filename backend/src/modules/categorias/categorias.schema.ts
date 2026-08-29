import { z } from 'zod';

export const categoriaCreate = z.object({
  nombre: z.string().min(1).max(100),
});
export const categoriaUpdate = categoriaCreate.partial();

export type CategoriaCreate = z.infer<typeof categoriaCreate>;
export type CategoriaUpdate = z.infer<typeof categoriaUpdate>;
