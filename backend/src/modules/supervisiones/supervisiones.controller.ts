import { Request, Response } from 'express';
import * as service from './supervisiones.service';
import { supervisionCreate } from './supervisiones.schema';
import { readPageParams } from '../../utils/pagination';
import * as bitacora from '../bitacora/bitacora.service';

export async function listar(req: Request, res: Response) {
  res.json(await service.listar(readPageParams(req.query)));
}
export async function crear(req: Request, res: Response) {
  const data = supervisionCreate.parse(req.body);
  const creado: any = await service.crear(data, req.user!.id);
  await bitacora.registrar(req.user!.id, 'supervision.crear', 'supervision', creado?.id);
  res.status(201).json(creado);
}
