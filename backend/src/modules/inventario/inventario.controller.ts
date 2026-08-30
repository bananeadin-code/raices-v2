import { Request, Response } from 'express';
import * as service from './inventario.service';
import { movimientoInput, traspasoInput } from './inventario.schema';
import { readPageParams } from '../../utils/pagination';
import * as bitacora from '../bitacora/bitacora.service';

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
  const r = await service.registrarMovimiento(data, req.user!.id);
  await bitacora.registrar(req.user!.id, `inventario.${data.tipo}`, data.item_tipo, data.item_id,
    { sucursal_id: data.sucursal_id, cantidad: data.cantidad });
  res.json(r);
}

export async function traspaso(req: Request, res: Response) {
  const data = traspasoInput.parse(req.body);
  const r = await service.traspasar(data, req.user!.id);
  await bitacora.registrar(req.user!.id, 'inventario.traspaso', data.item_tipo, data.item_id,
    { origen: data.sucursal_origen, destino: data.sucursal_destino, cantidad: data.cantidad });
  res.json(r);
}
