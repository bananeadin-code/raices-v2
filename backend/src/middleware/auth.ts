import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/http';

export interface AuthUser {
  id: number;
  usuario: string;
  rol: string;
  permisos: string[]; // ej. ['pos:ver','pos:crear','inventario:ver']
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Verifica el JWT y coloca req.user. Protege las rutas privadas.
export function auth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new ApiError(401, 'No autenticado');
  try {
    req.user = jwt.verify(header.slice(7), env.jwt.secret) as AuthUser;
    next();
  } catch {
    throw new ApiError(401, 'Sesión inválida o expirada');
  }
}

// Exige un permiso 'modulo:accion'. Se usa después de auth().
export const requirePermiso =
  (permiso: string) => (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new ApiError(401, 'No autenticado');
    if (!req.user.permisos.includes(permiso))
      throw new ApiError(403, 'No tienes permiso para esta acción');
    next();
  };
