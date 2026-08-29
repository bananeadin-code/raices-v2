import { Request, Response } from 'express';
import * as service from './roles.service';
import { rolCreate, rolUpdate, permisosSet } from './roles.schema';

export async function listar(_req: Request, res: Response) {
  res.json(await service.listar());
}
export async function obtener(req: Request, res: Response) {
  res.json(await service.obtener(Number(req.params.id)));
}
export async function crear(req: Request, res: Response) {
  res.status(201).json(await service.crear(rolCreate.parse(req.body)));
}
export async function actualizar(req: Request, res: Response) {
  res.json(await service.actualizar(Number(req.params.id), rolUpdate.parse(req.body)));
}
export async function eliminar(req: Request, res: Response) {
  await service.eliminar(Number(req.params.id));
  res.status(204).send();
}
export async function getPermisos(req: Request, res: Response) {
  res.json(await service.getPermisos(Number(req.params.id)));
}
export async function setPermisos(req: Request, res: Response) {
  res.json(await service.setPermisos(Number(req.params.id), permisosSet.parse(req.body)));
}
