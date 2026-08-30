import { Request, Response } from 'express';
import * as service from './produccion.service';
import { produccionCreate, estadoUpdate } from './produccion.schema';
import { readPageParams } from '../../utils/pagination';
import * as bitacora from '../bitacora/bitacora.service';

export async function listar(req: Request, res: Response) {
  res.json(await service.listar(readPageParams(req.query)));
}
export async function crear(req: Request, res: Response) {
  const data = produccionCreate.parse(req.body);
  const r = await service.crear(data, req.user!.id);
  await bitacora.registrar(req.user!.id, 'produccion.crear', 'produccion', (r as any).id,
    { articulo_id: data.articulo_id, cantidad: data.cantidad });
  res.status(201).json(r);
}
export async function cambiarEstado(req: Request, res: Response) {
  const { estado } = estadoUpdate.parse(req.body);
  const id = Number(req.params.id);
  const r = await service.cambiarEstado(id, estado, req.user!.id);
  await bitacora.registrar(req.user!.id, `produccion.${estado}`, 'produccion', id);
  res.json(r);
}
