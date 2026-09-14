import { z } from 'zod';

export const tareaCreate = z.object({
  asignada_a: z.number().int().positive(),
  tema: z.string().trim().min(1).max(160),
  descripcion: z.string().max(2000).nullish(),
  fecha_limite: z.string().max(10).nullish(), // 'YYYY-MM-DD'
});

export const tareaAccion = z.object({
  estado: z.enum(['completada', 'cancelada']),
  respuesta: z.string().max(2000).nullish(),
});

export type TareaCreate = z.infer<typeof tareaCreate>;
