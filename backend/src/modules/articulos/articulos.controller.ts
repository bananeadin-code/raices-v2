import { Request, Response } from 'express';
import { readPageParams } from '../../utils/pagination';
import * as service from './articulos.service';
import { articuloCreate, articuloUpdate, recetaSet } from './articulos.schema';

export async function listar(req: Request, res: Response) {
  const categoriaId = req.query.categoria_id ? Number(req.query.categoria_id) : undefined;
  res.json(await service.listar(readPageParams(req.query), categoriaId));
}
export async function obtener(req: Request, res: Response) {
  res.json(await service.obtener(Number(req.params.id)));
}
export async function crear(req: Request, res: Response) {
  res.status(201).json(await service.crear(articuloCreate.parse(req.body)));
}
export async function actualizar(req: Request, res: Response) {
  res.json(await service.actualizar(Number(req.params.id), articuloUpdate.parse(req.body)));
}
export async function eliminar(req: Request, res: Response) {
  await service.eliminar(Number(req.params.id));
  res.status(204).send();
}

export async function getReceta(req: Request, res: Response) {
  res.json(await service.getReceta(Number(req.params.id)));
}
export async function setReceta(req: Request, res: Response) {
  res.json(await service.setReceta(Number(req.params.id), recetaSet.parse(req.body)));
}
