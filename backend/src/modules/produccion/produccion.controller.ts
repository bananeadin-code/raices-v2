import { Request, Response } from 'express';
import * as service from './produccion.service';
import { produccionCreate, estadoUpdate } from './produccion.schema';
import { readPageParams } from '../../utils/pagination';

export async function listar(req: Request, res: Response) {
  res.json(await service.listar(readPageParams(req.query)));
}
export async function crear(req: Request, res: Response) {
  res.status(201).json(await service.crear(produccionCreate.parse(req.body), req.user!.id));
}
export async function cambiarEstado(req: Request, res: Response) {
  const { estado } = estadoUpdate.parse(req.body);
  res.json(await service.cambiarEstado(Number(req.params.id), estado, req.user!.id));
}
