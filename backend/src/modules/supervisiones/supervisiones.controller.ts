import { Request, Response } from 'express';
import * as service from './supervisiones.service';
import { supervisionCreate } from './supervisiones.schema';
import { readPageParams } from '../../utils/pagination';

export async function listar(req: Request, res: Response) {
  res.json(await service.listar(readPageParams(req.query)));
}
export async function crear(req: Request, res: Response) {
  const data = supervisionCreate.parse(req.body);
  res.status(201).json(await service.crear(data, req.user!.id));
}
