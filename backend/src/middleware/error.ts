import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/http';

// Middleware central de errores. Debe registrarse al final, después de las rutas.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(422).json({ error: 'Datos inválidos', detalles: err.flatten() });
  }
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message });
  }

  // Errores de integridad de MySQL -> respuesta limpia (blinda todos los módulos)
  const e = err as any;
  if (e && typeof e.code === 'string') {
    switch (e.code) {
      case 'ER_DUP_ENTRY':
        return res.status(409).json({ error: 'Ya existe un registro con ese valor.' });
      case 'ER_NO_REFERENCED_ROW':
      case 'ER_NO_REFERENCED_ROW_2':
        return res.status(422).json({ error: 'Referencia inválida: el registro relacionado no existe.' });
      case 'ER_ROW_IS_REFERENCED':
      case 'ER_ROW_IS_REFERENCED_2':
        return res.status(409).json({ error: 'No se puede completar: el registro está siendo usado por otros.' });
      case 'ER_DATA_TOO_LONG':
        return res.status(422).json({ error: 'Uno de los valores excede el tamaño permitido.' });
    }
  }

  console.error(err);
  return res.status(500).json({ error: 'Error interno del servidor' });
}
