import { Request, Response } from 'express';
import { readPageParams } from '../../utils/pagination';
import * as service from './clientes.service';
import { clienteCreate, clienteUpdate } from './clientes.schema';
import * as bitacora from '../bitacora/bitacora.service';

export async function listar(req: Request, res: Response) {
  res.json(await service.listar(readPageParams(req.query)));
}

export async function obtener(req: Request, res: Response) {
  res.json(await service.obtener(Number(req.params.id)));
}

export async function crear(req: Request, res: Response) {
  const data = clienteCreate.parse(req.body);
  const creado: any = await service.crear(data);
  await bitacora.registrar(req.user!.id, 'cliente.crear', 'cliente', creado.id, { nombre: creado.nombre });
  res.status(201).json(creado);
}

export async function actualizar(req: Request, res: Response) {
  const data = clienteUpdate.parse(req.body);
  const act = await service.actualizar(Number(req.params.id), data);
  await bitacora.registrar(req.user!.id, 'cliente.editar', 'cliente', Number(req.params.id));
  res.json(act);
}

export async function eliminar(req: Request, res: Response) {
  await service.eliminar(Number(req.params.id));
  await bitacora.registrar(req.user!.id, 'cliente.eliminar', 'cliente', Number(req.params.id));
  res.status(204).send();
}
