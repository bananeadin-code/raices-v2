import { Request, Response } from 'express';
import { readPageParams } from '../../utils/pagination';
import * as service from './articulos.service';
import { articuloCreate, articuloUpdate, recetaSet } from './articulos.schema';
import * as bitacora from '../bitacora/bitacora.service';

export async function listar(req: Request, res: Response) {
  const categoriaId = req.query.categoria_id ? Number(req.query.categoria_id) : undefined;
  res.json(await service.listar(readPageParams(req.query), categoriaId));
}
export async function obtener(req: Request, res: Response) {
  res.json(await service.obtener(Number(req.params.id)));
}
export async function crear(req: Request, res: Response) {
  const creado: any = await service.crear(articuloCreate.parse(req.body));
  await bitacora.registrar(req.user!.id, 'articulo.crear', 'articulo', creado.id, { nombre: creado.nombre });
  res.status(201).json(creado);
}
export async function actualizar(req: Request, res: Response) {
  const act = await service.actualizar(Number(req.params.id), articuloUpdate.parse(req.body));
  await bitacora.registrar(req.user!.id, 'articulo.editar', 'articulo', Number(req.params.id));
  res.json(act);
}
export async function eliminar(req: Request, res: Response) {
  await service.eliminar(Number(req.params.id));
  await bitacora.registrar(req.user!.id, 'articulo.eliminar', 'articulo', Number(req.params.id));
  res.status(204).send();
}

export async function getReceta(req: Request, res: Response) {
  res.json(await service.getReceta(Number(req.params.id)));
}
export async function setReceta(req: Request, res: Response) {
  res.json(await service.setReceta(Number(req.params.id), recetaSet.parse(req.body)));
}
