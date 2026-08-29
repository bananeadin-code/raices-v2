import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';

// Maneja una lista paginada + búsqueda contra un endpoint que devuelve { data, total }.
export function usePagedList<T>(path: string, pageSize = 20) {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const sep = path.includes('?') ? '&' : '?';
      const r = await api.get<{ data: T[]; total: number }>(
        `${path}${sep}q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`);
      setData(r.data); setTotal(r.total);
    } finally {
      setCargando(false);
    }
  }, [path, q, page, pageSize]);

  useEffect(() => { cargar(); }, [cargar]);
  // Reinicia a la primera página si cambia el filtro base del path (ej. sucursal)
  useEffect(() => { setPage(1); }, [path]);

  function buscar(nuevo: string) { setQ(nuevo); setPage(1); }

  return { data, total, page, setPage, q, buscar, cargando, reload: cargar, pageSize };
}
