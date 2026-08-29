import { Request, Response } from 'express';
import * as service from './inventario.service';
import { movimientoInput, traspasoInput } from './inventario.schema';
import { readPageParams } from '../../utils/pagination';

export async function existencias(req: Request, res: Response) {
  const itemTipo = req.query.item_tipo === 'materia' ? 'materia' : 'articulo';
  const sucursalId = req.query.sucursal_id ? Number(req.query.sucursal_id) : undefined;
  res.json(await service.existencias(itemTipo, readPageParams(req.query), sucursalId));
}

export async function kardex(req: Request, res: Response) {
  const itemTipo = req.query.item_tipo === 'materia' ? 'materia' : 'articulo';
  const itemId = Number(req.query.item_id);
  const sucursalId = req.query.sucursal_id ? Number(req.query.sucursal_id) : undefined;
  res.json(await service.kardex(itemTipo, itemId, readPageParams(req.query), sucursalId));
}

export async function movimiento(req: Request, res: Response) {
  const data = movimientoInput.parse(req.body);
  res.json(await service.registrarMovimiento(data, req.user!.id));
}

export async function traspaso(req: Request, res: Response) {
  const data = traspasoInput.parse(req.body);
  res.json(await service.traspasar(data, req.user!.id));
}
