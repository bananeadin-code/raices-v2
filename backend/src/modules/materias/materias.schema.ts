import { z } from 'zod';

export const materiaCreate = z.object({
  codigo: z.string().max(40).nullish(),
  nombre: z.string().min(1).max(160),
  unidad: z.string().max(20).default('pza'),
  costo: z.number().nonnegative().default(0),
  minimo: z.number().nonnegative().nullish(),
});
export const materiaUpdate = materiaCreate.partial();

export type MateriaCreate = z.infer<typeof materiaCreate>;
export type MateriaUpdate = z.infer<typeof materiaUpdate>;
