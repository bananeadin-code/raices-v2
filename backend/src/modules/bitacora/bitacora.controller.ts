import { Request, Response } from 'express';
import { readPageParams } from '../../utils/pagination';
import * as service from './bitacora.service';

export async function listar(req: Request, res: Response) {
  res.json(await service.listar(readPageParams(req.query)));
}
