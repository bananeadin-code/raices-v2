import { Request, Response, NextFunction, RequestHandler } from 'express';

// Error con código HTTP. Lánzalo desde services/controllers.
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Envuelve un handler async para que sus errores lleguen al middleware de error.
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler =>
  (req, res, next) =>
    fn(req, res, next).catch(next);
