import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/http';
// nota: jwt/env se usan tanto en auth() como en authJefe()

export interface AuthUser {
  id: number;
  usuario: string;
  rol: string;
  permisos: string[]; // ej. ['pos:ver','pos:crear','inventario:ver']
}

export interface JefeToken {
  jefe: true;
  usuario: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      jefe?: JefeToken;
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
    // Optional chaining: un token sin permisos (p. ej. el del jefe) da 403, no 500.
    if (!req.user.permisos?.includes(permiso))
      throw new ApiError(403, 'No tienes permiso para esta acción');
    next();
  };

// Acceso EXCLUSIVO del panel del jefe. Verifica un token con la marca { jefe: true },
// emitido solo por /jefe/login. Un token operativo (aunque sea admin) NO pasa:
// el panel vive fuera de los usuarios y de los roles del sistema.
export function authJefe(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new ApiError(401, 'No autenticado');
  try {
    const payload = jwt.verify(header.slice(7), env.jwt.secret) as JefeToken;
    if (!payload?.jefe) throw new ApiError(403, 'Acceso restringido al panel del jefe');
    req.jefe = payload;
    next();
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(401, 'Sesión inválida o expirada');
  }
}
