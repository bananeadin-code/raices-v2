import { z } from 'zod';

export const articuloCreate = z.object({
  sku: z.string().max(40).nullish(),
  nombre: z.string().min(1).max(160),
  categoria_id: z.number().int().positive().nullish(),
  precio: z.number().nonnegative().default(0),
  costo: z.number().nonnegative().default(0),
  es_producible: z.boolean().default(false),
  minimo: z.number().int().nullish(),
  maximo: z.number().int().nullish(),
  reorden: z.number().int().nullish(),
});
export const articuloUpdate = articuloCreate.partial();

// Receta / BOM: materias que consume el artículo (por unidad producida)
export const recetaItem = z.object({
  materia_id: z.number().int().positive(),
  cantidad: z.number().positive(),
});
export const recetaSet = z.array(recetaItem);

export type ArticuloCreate = z.infer<typeof articuloCreate>;
export type ArticuloUpdate = z.infer<typeof articuloUpdate>;
export type RecetaItem = z.infer<typeof recetaItem>;
