import { z } from 'zod';

const remisionItem = z.object({
  articulo_id: z.number().int().positive(),
  cantidad: z.number().positive(),
});

// Si se manda venta_id y no se mandan items, se copian los de la venta.
export const remisionCreate = z.object({
  sucursal_id: z.number().int().positive(),
  cliente_id: z.number().int().positive().nullish(),
  venta_id: z.number().int().positive().nullish(),
  observaciones: z.string().max(200).nullish(),
  items: z.array(remisionItem).default([]),
});

export const estadoUpdate = z.object({
  estado: z.enum(['entregada', 'cancelada']),
});

export type RemisionCreate = z.infer<typeof remisionCreate>;
