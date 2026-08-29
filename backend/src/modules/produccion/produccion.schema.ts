import { z } from 'zod';

export const produccionCreate = z.object({
  sucursal_id: z.number().int().positive(),
  articulo_id: z.number().int().positive(),
  cantidad: z.number().positive(),
  observaciones: z.string().max(200).nullish(),
});

// Cambios de estado permitidos como acción del usuario.
export const estadoUpdate = z.object({
  estado: z.enum(['en_progreso', 'terminado', 'cancelado']),
});

export type ProduccionCreate = z.infer<typeof produccionCreate>;
export type EstadoDestino = z.infer<typeof estadoUpdate>['estado'];
