import { Request, Response } from 'express';
import { z } from 'zod';
import * as service from './auth.service';
import * as bitacora from '../bitacora/bitacora.service';

const loginSchema = z.object({
  usuario: z.string().min(1),
  password: z.string().min(1),
});

const cambioPasswordSchema = z.object({
  password_actual: z.string().min(1, 'Escribe tu contraseña actual.'),
  password: z.string().min(4, 'La nueva contraseña debe tener al menos 4 caracteres.').max(100),
});

export async function login(req: Request, res: Response) {
  const { usuario, password } = loginSchema.parse(req.body);
  const result = await service.login(usuario, password);
  await bitacora.registrar(result.usuario.id, 'login');
  res.json(result);
}

export async function me(req: Request, res: Response) {
  res.json({ usuario: req.user });
}

export async function cambiarPassword(req: Request, res: Response) {
  const d = cambioPasswordSchema.parse(req.body);
  await service.cambiarMiPassword(req.user!.id, d.password_actual, d.password);
  await bitacora.registrar(req.user!.id, 'password.cambiar', 'usuario', req.user!.id);
  res.json({ ok: true });
}
