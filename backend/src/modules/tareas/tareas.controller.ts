import { Request, Response } from 'express';
import * as service from './tareas.service';
import { tareaCreate, tareaAccion } from './tareas.schema';
import { readPageParams } from '../../utils/pagination';
import * as bitacora from '../bitacora/bitacora.service';

export async function listar(req: Request, res: Response) {
  const estado = typeof req.query.estado === 'string' ? req.query.estado : undefined;
  const asignadaA = req.query.mias === '1' ? req.user!.id : undefined;
  res.json(await service.listar(readPageParams(req.query), { estado, asignadaA }));
}
export async function crear(req: Request, res: Response) {
  const data = tareaCreate.parse(req.body);
  const r = await service.crear(data, req.user!.id);
  await bitacora.registrar(req.user!.id, 'tarea.crear', 'tarea', r.id, { tema: data.tema, asignada_a: data.asignada_a });
  res.status(201).json(r);
}
export async function accion(req: Request, res: Response) {
  const { estado, respuesta } = tareaAccion.parse(req.body);
  const id = Number(req.params.id);
  const r = await service.accion(id, estado, respuesta);
  await bitacora.registrar(req.user!.id, `tarea.${estado}`, 'tarea', id);
  res.json(r);
}
