import { Request, Response } from 'express';
import * as service from './garantias.service';
import { garantiaUpsert } from './garantias.schema';
import { readPageParams } from '../../utils/pagination';

export async function listar(req: Request, res: Response) {
  res.json(await service.listar(readPageParams(req.query)));
}
export async function obtener(req: Request, res: Response) {
  res.json(await service.obtener(Number(req.params.id)));
}
export async function crear(req: Request, res: Response) {
  const data = garantiaUpsert.parse(req.body);
  res.status(201).json(await service.crear(data));
}
export async function actualizar(req: Request, res: Response) {
  const data = garantiaUpsert.parse(req.body);
  res.json(await service.actualizar(Number(req.params.id), data));
}
export async function eliminar(req: Request, res: Response) {
  await service.eliminar(Number(req.params.id));
  res.status(204).end();
}
