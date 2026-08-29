import { Request, Response } from 'express';
import { z } from 'zod';
import * as service from './auth.service';

const loginSchema = z.object({
  usuario: z.string().min(1),
  password: z.string().min(1),
});

export async function login(req: Request, res: Response) {
  const { usuario, password } = loginSchema.parse(req.body);
  res.json(await service.login(usuario, password));
}

export async function me(req: Request, res: Response) {
  res.json({ usuario: req.user });
}
