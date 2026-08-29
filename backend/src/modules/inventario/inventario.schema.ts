import { z } from 'zod';

export const movimientoInput = z.object({
  tipo: z.enum(['entrada', 'salida', 'ajuste']),
  item_tipo: z.enum(['articulo', 'materia']),
  item_id: z.number().int().positive(),
  sucursal_id: z.number().int().positive(),
  cantidad: z.number(), // magnitud en entrada/salida; total nuevo en ajuste
  motivo: z.string().max(200).nullish(),
});

export const traspasoInput = z.object({
  item_tipo: z.enum(['articulo', 'materia']),
  item_id: z.number().int().positive(),
  sucursal_origen: z.number().int().positive(),
  sucursal_destino: z.number().int().positive(),
  cantidad: z.number().positive(),
  motivo: z.string().max(200).nullish(),
});

export type MovimientoInput = z.infer<typeof movimientoInput>;
export type TraspasoInput = z.infer<typeof traspasoInput>;
