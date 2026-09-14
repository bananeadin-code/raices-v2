import { z } from 'zod';

export const vehiculoCreate = z.object({
  nombre: z.string().trim().min(1).max(120),
  placas: z.string().trim().max(20).nullish(),
});
export const vehiculoUpdate = vehiculoCreate.partial();

// Bitácora por vehículo: reparaciones, gastos u observaciones.
export const notaCreate = z.object({
  tipo: z.enum(['reparacion', 'gasto', 'observacion']).default('observacion'),
  descripcion: z.string().trim().min(1).max(500),
  monto: z.number().min(0).nullish(),   // costo (reparación/gasto)
  fecha: z.string().max(10).nullish(),  // 'YYYY-MM-DD'; si se omite, hoy
});

export type VehiculoCreate = z.infer<typeof vehiculoCreate>;
export type VehiculoUpdate = z.infer<typeof vehiculoUpdate>;
export type NotaCreate = z.infer<typeof notaCreate>;
