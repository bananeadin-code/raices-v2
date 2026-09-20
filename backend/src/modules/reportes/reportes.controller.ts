import { Request, Response } from 'express';
import * as service from './reportes.service';

// Valida 'YYYY-MM-DD'; si no viene o es inválida, usa hoy.
function fechaValida(v: any): string {
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return new Date().toISOString().slice(0, 10);
}

export async function dia(req: Request, res: Response) {
  const fecha = fechaValida(req.query.fecha);
  res.json(await service.reporteDia(fecha));
}
