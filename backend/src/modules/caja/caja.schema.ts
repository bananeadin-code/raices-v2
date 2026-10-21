import { z } from 'zod';

// Movimiento de dinero (entrada o salida) fuera del sistema de ventas/inventario.
export const movimientoCreate = z.object({
  tipo: z.enum(['entrada', 'salida']),
  categoria_id: z.number().int().positive().nullish(),
  concepto: z.string().trim().min(1).max(200),
  monto: z.number().positive(),
  fecha: z.string().max(10).nullish(), // 'YYYY-MM-DD'; si se omite, hoy
});

export const categoriaCreate = z.object({
  nombre: z.string().trim().min(1).max(120),
});

export type MovimientoCreate = z.infer<typeof movimientoCreate>;
export type CategoriaCreate = z.infer<typeof categoriaCreate>;
