import { Request, Response } from 'express';
import * as service from './remisiones.service';
import { remisionCreate, estadoUpdate } from './remisiones.schema';
import { readPageParams } from '../../utils/pagination';
import * as bitacora from '../bitacora/bitacora.service';

export async function listar(req: Request, res: Response) {
  const estado = typeof req.query.estado === 'string' ? req.query.estado : undefined;
  res.json(await service.listar(readPageParams(req.query), estado));
}
export async function obtener(req: Request, res: Response) {
  res.json(await service.obtener(Number(req.params.id)));
}
export async function crear(req: Request, res: Response) {
  const data = remisionCreate.parse(req.body);
  const r = await service.crear(data, req.user!.id);
  await bitacora.registrar(req.user!.id, 'remision.crear', 'remision', r.id, { folio: r.folio, venta_id: data.venta_id ?? null });
  res.status(201).json(r);
}
export async function cambiarEstado(req: Request, res: Response) {
  const { estado } = estadoUpdate.parse(req.body);
  const id = Number(req.params.id);
  const r = await service.cambiarEstado(id, estado);
  await bitacora.registrar(req.user!.id, `remision.${estado}`, 'remision', id);
  res.json(r);
}
