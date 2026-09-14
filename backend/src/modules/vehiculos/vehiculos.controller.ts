import { Request, Response } from 'express';
import * as service from './vehiculos.service';
import { vehiculoCreate, vehiculoUpdate, notaCreate } from './vehiculos.schema';
import { readPageParams } from '../../utils/pagination';

export async function listar(req: Request, res: Response) {
  res.json(await service.listar(readPageParams(req.query)));
}
export async function crear(req: Request, res: Response) {
  res.status(201).json(await service.crear(vehiculoCreate.parse(req.body)));
}
export async function actualizar(req: Request, res: Response) {
  res.json(await service.actualizar(Number(req.params.id), vehiculoUpdate.parse(req.body)));
}
export async function eliminar(req: Request, res: Response) {
  await service.eliminar(Number(req.params.id));
  res.status(204).end();
}
export async function listarNotas(req: Request, res: Response) {
  res.json(await service.listarNotas(Number(req.params.id)));
}
export async function agregarNota(req: Request, res: Response) {
  const data = notaCreate.parse(req.body);
  res.status(201).json(await service.agregarNota(Number(req.params.id), data, req.user!.id));
}
