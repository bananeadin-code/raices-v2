import { Request, Response } from 'express';
import { z } from 'zod';
import * as service from './auth.service';
import * as bitacora from '../bitacora/bitacora.service';

const loginSchema = z.object({
  usuario: z.string().min(1),
  password: z.string().min(1),
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
