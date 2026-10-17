import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/http';

// Limitador de intentos en memoria (por IP). Suficiente para un solo servidor
// (pm2 / un proceso). Protege el login de fuerza bruta sin dependencias extra.
export function rateLimit(opts: { windowMs: number; max: number; msg?: string }) {
  const hits = new Map<string, { count: number; reset: number }>();
  return (req: Request, _res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const rec = hits.get(key);
    if (!rec || now > rec.reset) {
      hits.set(key, { count: 1, reset: now + opts.windowMs });
    } else {
      rec.count++;
      if (rec.count > opts.max) {
        throw new ApiError(429, opts.msg ?? 'Demasiados intentos. Espera un momento e inténtalo de nuevo.');
      }
    }
    // Limpieza ocasional para no crecer sin límite.
    if (hits.size > 5000) for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
    next();
  };
}
