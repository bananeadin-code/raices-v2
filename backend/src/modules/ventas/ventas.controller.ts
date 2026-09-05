import { Request, Response } from 'express';
import * as service from './ventas.service';
import { ventaCreate, abonoCreate } from './ventas.schema';
import { readPageParams } from '../../utils/pagination';
import * as bitacora from '../bitacora/bitacora.service';

export async function listar(req: Request, res: Response) {
  const estado = typeof req.query.estado === 'string' ? req.query.estado : undefined;
  res.json(await service.listar(readPageParams(req.query), estado));
}
export async function cobranza(req: Request, res: Response) {
  res.json(await service.cobranza(readPageParams(req.query)));
}
export async function obtener(req: Request, res: Response) {
  res.json(await service.obtener(Number(req.params.id)));
}
export async function crear(req: Request, res: Response) {
  const data = ventaCreate.parse(req.body);
  const r = await service.crear(data, req.user!.id);
  await bitacora.registrar(req.user!.id, `venta.${data.estado === 'pendiente' ? 'pendiente' : 'entregar'}`, 'venta', r.id,
    { folio: r.folio, total: r.total, metodo_pago: data.metodo_pago });
  res.status(201).json(r);
}
export async function entregar(req: Request, res: Response) {
  const id = Number(req.params.id);
  const r = await service.entregar(id, req.user!.id);
  await bitacora.registrar(req.user!.id, 'venta.entregar', 'venta', id);
  res.json(r);
}
export async function cancelar(req: Request, res: Response) {
  const id = Number(req.params.id);
  const r = await service.cancelar(id, req.user!.id);
  await bitacora.registrar(req.user!.id, 'venta.cancelar', 'venta', id);
  res.json(r);
}
export async function abonar(req: Request, res: Response) {
  const id = Number(req.params.id);
  const data = abonoCreate.parse(req.body);
  const r = await service.registrarAbono(id, data, req.user!.id);
  await bitacora.registrar(req.user!.id, 'venta.abono', 'venta', id, { monto: data.monto });
  res.status(201).json(r);
}
