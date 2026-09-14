import { Request, Response } from 'express';
import { z } from 'zod';
import * as service from './jefe.service';

const loginSchema = z.object({
  usuario: z.string().min(1),
  password: z.string().min(1),
});

const credencialesSchema = z.object({
  password_actual: z.string().min(1),
  nuevo_usuario: z.string().trim().min(3).max(60).optional(),
  nueva_password: z.string().min(6).max(100).optional(),
}).refine((d) => d.nuevo_usuario || d.nueva_password, {
  message: 'Indica un nuevo usuario o una nueva contraseña.',
});

export async function login(req: Request, res: Response) {
  const { usuario, password } = loginSchema.parse(req.body);
  res.json(await service.login(usuario, password));
}

export async function reporte(_req: Request, res: Response) {
  res.json(await service.reporteGeneral());
}

export async function cambiarCredenciales(req: Request, res: Response) {
  const d = credencialesSchema.parse(req.body);
  res.json(await service.cambiarCredenciales(d.password_actual, d.nuevo_usuario, d.nueva_password));
}

// Confirma que el token del jefe sigue siendo válido (para restaurar sesión).
export async function me(req: Request, res: Response) {
  res.json({ usuario: req.jefe!.usuario });
}
