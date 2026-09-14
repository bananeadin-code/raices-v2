import { z } from 'zod';

export const supervisionCreate = z.object({
  cliente_id: z.number().int().positive().nullish(),
  ubicacion: z.string().trim().max(200).nullish(),
  observaciones: z.string().trim().min(1, 'Describe la visita.').max(500),
  lat: z.number().nullish(),
  lng: z.number().nullish(),
});

export type SupervisionCreate = z.infer<typeof supervisionCreate>;
