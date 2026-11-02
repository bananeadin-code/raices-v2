import { Request, Response } from 'express';
import { readPageParams } from '../../utils/pagination';
import * as service from './sucursales.service';
import { sucursalCreate, sucursalUpdate } from './sucursales.schema';
import * as bitacora from '../bitacora/bitacora.service';

export async function listar(req: Request, res: Response) {
  res.json(await service.listar(readPageParams(req.query)));
}
export async function obtener(req: Request, res: Response) {
  res.json(await service.obtener(Number(req.params.id)));
}
export async function crear(req: Request, res: Response) {
  const creado: any = await service.crear(sucursalCreate.parse(req.body));
  await bitacora.registrar(req.user!.id, 'sucursal.crear', 'sucursal', creado.id, { nombre: creado.nombre });
  res.status(201).json(creado);
}
export async function actualizar(req: Request, res: Response) {
  const act = await service.actualizar(Number(req.params.id), sucursalUpdate.parse(req.body));
  await bitacora.registrar(req.user!.id, 'sucursal.editar', 'sucursal', Number(req.params.id));
  res.json(act);
}
export async function eliminar(req: Request, res: Response) {
  await service.eliminar(Number(req.params.id));
  await bitacora.registrar(req.user!.id, 'sucursal.eliminar', 'sucursal', Number(req.params.id));
  res.status(204).send();
}
