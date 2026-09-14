import { z } from 'zod';

// Plantilla de garantía con sus puntos de verificación de entrega.
// Los puntos se envían completos en cada guardado (se reemplazan en bloque).
export const garantiaUpsert = z.object({
  nombre: z.string().trim().min(1).max(120),
  meses_garantia: z.coerce.number().int().min(0).max(600).default(0),
  permanente: z.coerce.boolean().default(false), // garantía permanente (salvo causas naturales, mal uso)
  descripcion: z.string().trim().max(300).nullish(),
  activo: z.coerce.boolean().default(true),
  puntos: z.array(z.string().trim().min(1).max(300)).default([]),
});

export type GarantiaUpsert = z.infer<typeof garantiaUpsert>;
