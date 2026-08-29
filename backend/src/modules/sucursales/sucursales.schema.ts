import { z } from 'zod';

export const sucursalCreate = z.object({
  nombre: z.string().min(1).max(100),
  abreviatura: z.string().max(10).nullish(),
  tipo: z.enum(['tienda', 'almacen', 'fabrica', 'mixto']).default('mixto'),
  calle: z.string().max(150).nullish(),
  numero: z.string().max(30).nullish(),
  colonia: z.string().max(120).nullish(),
  cp: z.string().max(10).nullish(),
  ciudad: z.string().max(100).nullish(),
  telefono: z.string().max(50).nullish(),
});
export const sucursalUpdate = sucursalCreate.partial();

export type SucursalCreate = z.infer<typeof sucursalCreate>;
export type SucursalUpdate = z.infer<typeof sucursalUpdate>;
