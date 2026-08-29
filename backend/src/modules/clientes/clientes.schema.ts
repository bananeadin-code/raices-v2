import { z } from 'zod';

// Validación de entrada (reemplaza el "guardar lo que llegue" del sistema viejo)
export const clienteCreate = z.object({
  nombre: z.string().min(1).max(160),
  telefono: z.string().max(50).nullish(),
  email: z.string().max(150).nullish(),
  rfc: z.string().max(20).nullish(),
  calle: z.string().max(150).nullish(),
  numero: z.string().max(30).nullish(),
  colonia: z.string().max(120).nullish(),
  cp: z.string().max(10).nullish(),
  ciudad: z.string().max(100).nullish(),
  limite_credito: z.number().nonnegative().default(0),
  // Datos fiscales (opcionales, para agilizar facturación externa)
  razon_social: z.string().max(200).nullish(),
  regimen_fiscal: z.string().max(10).nullish(),
  uso_cfdi: z.string().max(10).nullish(),
  cp_fiscal: z.string().max(10).nullish(),
  email_fiscal: z.string().max(150).nullish(),
});

export const clienteUpdate = clienteCreate.partial();

export type ClienteCreate = z.infer<typeof clienteCreate>;
export type ClienteUpdate = z.infer<typeof clienteUpdate>;
