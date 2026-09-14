import { z } from 'zod';

export const vehiculoCreate = z.object({
  nombre: z.string().trim().min(1).max(120),
  placas: z.string().trim().max(20).nullish(),
});
export const vehiculoUpdate = vehiculoCreate.partial();

export type VehiculoCreate = z.infer<typeof vehiculoCreate>;
export type VehiculoUpdate = z.infer<typeof vehiculoUpdate>;
