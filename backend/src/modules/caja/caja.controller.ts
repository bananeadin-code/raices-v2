import { Request, Response } from 'express';
import * as service from './caja.service';
import { movimientoCreate, categoriaCreate } from './caja.schema';
import { readPageParams } from '../../utils/pagination';
import * as bitacora from '../bitacora/bitacora.service';

// Categorías
export async function listarCategorias(req: Request, res: Response) {
  const tipo = req.query.tipo === 'entrada' || req.query.tipo === 'salida' ? req.query.tipo : undefined;
  res.json(await service.listarCategorias(readPageParams(req.query), tipo));
}
export async function crearCategoria(req: Request, res: Response) {
  res.status(201).json(await service.crearCategoria(categoriaCreate.parse(req.body)));
}
export async function actualizarCategoria(req: Request, res: Response) {
  res.json(await service.actualizarCategoria(Number(req.params.id), categoriaCreate.parse(req.body)));
}
export async function eliminarCategoria(req: Request, res: Response) {
  await service.eliminarCategoria(Number(req.params.id));
  res.status(204).end();
}

// Movimientos
export async function listarMovimientos(req: Request, res: Response) {
  const tipo = req.query.tipo === 'entrada' || req.query.tipo === 'salida' ? req.query.tipo : undefined;
  res.json(await service.listarMovimientos(readPageParams(req.query), tipo));
}
export async function crearMovimiento(req: Request, res: Response) {
  const data = movimientoCreate.parse(req.body);
  const r = await service.crearMovimiento(data, req.user!.id);
  await bitacora.registrar(req.user!.id, `caja.${data.tipo}`, 'caja', r.id, { concepto: data.concepto, monto: data.monto });
  res.status(201).json(r);
}
export async function eliminarMovimiento(req: Request, res: Response) {
  await service.eliminarMovimiento(Number(req.params.id));
  await bitacora.registrar(req.user!.id, 'caja.eliminar', 'caja', Number(req.params.id));
  res.status(204).end();
}
