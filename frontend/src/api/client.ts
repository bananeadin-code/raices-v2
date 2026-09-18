import { loading } from '../loading';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  loading.inc();
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });

    if (res.status === 401) localStorage.removeItem('token');

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Error ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  } finally {
    loading.dec();
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  // Trae todos los registros (para llenar selects/dropdowns). Devuelve solo el arreglo.
  getAll: <T>(path: string) =>
    request<{ data: T[] }>(`${path}${path.includes('?') ? '&' : '?'}pageSize=500`).then((r) => r.data),
};

// Trae TODOS los registros de un endpoint paginado (recorre páginas hasta completar `total`).
// Se usa para los reportes en PDF, que deben incluir todos los renglones.
export async function getAllRows<T>(path: string): Promise<T[]> {
  const sep = path.includes('?') ? '&' : '?';
  let page = 1;
  let all: T[] = [];
  let total = Infinity;
  while (all.length < total) {
    const r = await api.get<{ data: T[]; total: number }>(`${path}${sep}page=${page}&pageSize=500`);
    total = r.total;
    if (r.data.length === 0) break;
    all = all.concat(r.data);
    page++;
    if (page > 200) break; // tope de seguridad (100k registros)
  }
  return all;
}
