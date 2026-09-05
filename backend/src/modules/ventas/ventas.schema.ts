import { z } from 'zod';

const ventaItem = z.object({
  articulo_id: z.number().int().positive(),
  cantidad: z.number().positive(),
  precio_unitario: z.number().min(0),
});

export const ventaCreate = z.object({
  sucursal_id: z.number().int().positive(),
  cliente_id: z.number().int().positive().nullish(),
  // 'confirmada' = venta directa (descuenta stock ya). 'pendiente' = aparta (reserva) stock.
  estado: z.enum(['pendiente', 'confirmada']).default('confirmada'),
  metodo_pago: z.enum(['efectivo', 'tarjeta', 'transferencia', 'credito']).default('efectivo'),
  fecha_vencimiento: z.string().max(10).nullish(), // 'YYYY-MM-DD', solo crédito
  descuento: z.number().min(0).default(0),
  observaciones: z.string().max(200).nullish(),
  items: z.array(ventaItem).min(1, 'Agrega al menos un artículo.'),
});

export const abonoCreate = z.object({
  monto: z.number().positive(),
  metodo: z.enum(['efectivo', 'tarjeta', 'transferencia']).default('efectivo'),
  referencia: z.string().max(100).nullish(),
});

export type VentaCreate = z.infer<typeof ventaCreate>;
export type AbonoCreate = z.infer<typeof abonoCreate>;
