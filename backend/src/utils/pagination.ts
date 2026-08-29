import { query } from '../db/pool';

export interface PageParams { q?: string; page: number; pageSize: number; }
export interface Paged<T> { data: T[]; total: number; page: number; pageSize: number; }

// Lee ?q=&page=&pageSize= de req.query con topes sanos.
export function readPageParams(reqQuery: any): PageParams {
  const page = Math.max(1, Number(reqQuery.page) || 1);
  const pageSize = Math.min(500, Math.max(1, Number(reqQuery.pageSize) || 20));
  const q = typeof reqQuery.q === 'string' && reqQuery.q.trim() ? reqQuery.q.trim() : undefined;
  return { q, page, pageSize };
}

// Consulta paginada genérica. `from` puede incluir JOINs; `search` filtra por LIKE.
export async function paged<T = any>(opts: {
  select: string;
  from: string;
  where?: string;
  whereParams?: any[];
  search?: { col: string; q?: string };
  order: string;
  page: number;
  pageSize: number;
}): Promise<Paged<T>> {
  const clauses: string[] = [];
  const params: any[] = [];
  if (opts.where) { clauses.push(opts.where); if (opts.whereParams) params.push(...opts.whereParams); }
  if (opts.search?.q) { clauses.push(`${opts.search.col} LIKE ?`); params.push(`%${opts.search.q}%`); }
  const whereSql = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';

  const totalRows = await query<{ n: number }>(`SELECT COUNT(*) AS n FROM ${opts.from} ${whereSql}`, params);
  const total = totalRows[0].n;

  const offset = (opts.page - 1) * opts.pageSize;
  const data = await query<T>(
    `SELECT ${opts.select} FROM ${opts.from} ${whereSql} ORDER BY ${opts.order} LIMIT ? OFFSET ?`,
    [...params, opts.pageSize, offset]);

  return { data, total, page: opts.page, pageSize: opts.pageSize };
}
