import { ResultSetHeader } from 'mysql2';
import { pool, query } from '../../db/pool';
import { ApiError } from '../../utils/http';
import { ClienteCreate, ClienteUpdate } from './clientes.schema';
import { paged, PageParams } from '../../utils/pagination';

// Lista blanca de columnas: los nombres NUNCA vienen del usuario (evita inyección),
// solo los valores van parametrizados.
const CAMPOS = [
  'nombre', 'telefono', 'email', 'rfc', 'calle', 'numero', 'colonia', 'cp', 'ciudad', 'limite_credito',
  'razon_social', 'regimen_fiscal', 'uso_cfdi', 'cp_fiscal', 'email_fiscal',
] as const;

export async function listar(p: PageParams) {
  return paged({ select: '*', from: 'clientes', where: 'activo = 1', search: { col: 'nombre', q: p.q }, order: 'nombre', page: p.page, pageSize: p.pageSize });
}

export async function obtener(id: number) {
  const rows = await query('SELECT * FROM clientes WHERE id = ?', [id]);
  if (!rows[0]) throw new ApiError(404, 'Cliente no encontrado');
  return rows[0];
}

export async function crear(data: ClienteCreate) {
  const campos = CAMPOS.filter((c) => (data as any)[c] !== undefined);
  const valores = campos.map((c) => (data as any)[c]);
  const [res] = await pool.query(
    `INSERT INTO clientes (${campos.join(', ')}) VALUES (${campos.map(() => '?').join(', ')})`,
    valores
  );
  return obtener((res as ResultSetHeader).insertId);
}

export async function actualizar(id: number, data: ClienteUpdate) {
  const campos = CAMPOS.filter((c) => (data as any)[c] !== undefined);
  if (campos.length === 0) return obtener(id);
  const valores = campos.map((c) => (data as any)[c]);
  await pool.query(
    `UPDATE clientes SET ${campos.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
    [...valores, id]
  );
  return obtener(id);
}

// Baja lógica: no se borra para preservar el historial de ventas.
export async function eliminar(id: number) {
  await pool.query('UPDATE clientes SET activo = 0 WHERE id = ?', [id]);
}
