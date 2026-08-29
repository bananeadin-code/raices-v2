import { Request, Response } from 'express';
import { readPageParams } from '../../utils/pagination';
import * as service from './categorias.service';
import { categoriaCreate, categoriaUpdate } from './categorias.schema';

export async function listar(req: Request, res: Response) {
  res.json(await service.listar(readPageParams(req.query)));
}
export async function obtener(req: Request, res: Response) {
  res.json(await service.obtener(Number(req.params.id)));
}
export async function crear(req: Request, res: Response) {
  res.status(201).json(await service.crear(categoriaCreate.parse(req.body)));
}
export async function actualizar(req: Request, res: Response) {
  res.json(await service.actualizar(Number(req.params.id), categoriaUpdate.parse(req.body)));
}
export async function eliminar(req: Request, res: Response) {
  await service.eliminar(Number(req.params.id));
  res.status(204).send();
}
