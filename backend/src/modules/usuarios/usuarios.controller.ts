import { Request, Response } from 'express';
import * as service from './usuarios.service';
import { usuarioCreate, usuarioUpdate } from './usuarios.schema';
import { ApiError } from '../../utils/http';
import { readPageParams } from '../../utils/pagination';

export async function listar(req: Request, res: Response) {
  const soloInactivos = req.query.inactivos === '1' || req.query.inactivos === 'true';
  res.json(await service.listar(readPageParams(req.query), soloInactivos));
}
export async function reactivar(req: Request, res: Response) {
  await service.reactivar(Number(req.params.id));
  res.status(204).send();
}
export async function obtener(req: Request, res: Response) {
  res.json(await service.obtener(Number(req.params.id)));
}
export async function crear(req: Request, res: Response) {
  res.status(201).json(await service.crear(usuarioCreate.parse(req.body)));
}
export async function actualizar(req: Request, res: Response) {
  res.json(await service.actualizar(Number(req.params.id), usuarioUpdate.parse(req.body)));
}
export async function eliminar(req: Request, res: Response) {
  const id = Number(req.params.id);
  // No te puedes desactivar a ti mismo (evita quedarte fuera del sistema).
  if (req.user!.id === id) throw new ApiError(409, 'No puedes desactivar tu propio usuario.');
  await service.eliminar(id);
  res.status(204).send();
}
