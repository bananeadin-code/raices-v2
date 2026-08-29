import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Articulo, Sucursal } from '../types';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { SearchBar } from '../components/SearchBar';
import { Pager } from '../components/Pager';
import { usePagedList } from '../hooks/usePagedList';
import { useAuth } from '../auth/AuthContext';

interface ProduccionRow {
  id: number; folio: number; fecha: string; cantidad: number; estado: string;
  articulo: string; sucursal: string; usuario?: string | null; observaciones?: string | null;
}

const ESTADOS: Record<string, { label: string; cls: string }> = {
  en_espera: { label: 'En espera', cls: 'badge-muted' },
  en_progreso: { label: 'En progreso', cls: 'badge-warn' },
  terminado: { label: 'Terminado', cls: 'badge-ok' },
  cancelado: { label: 'Cancelado', cls: 'badge-danger' },
};

export function Produccion() {
  const { puede } = useAuth();
  const { data: rows, total, page, setPage, buscar, pageSize, reload } = usePagedList<ProduccionRow>('/produccion');
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({ articulo_id: '', sucursal_id: '', cantidad: '', observaciones: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    api.getAll<Articulo>('/articulos').then((d) => setArticulos(d.filter((a) => a.es_producible))).catch(() => {});
    api.getAll<Sucursal>('/sucursales').then(setSucursales).catch(() => {});
  }, []);

  function nuevo() { setError(''); setForm({ articulo_id: '', sucursal_id: '', cantidad: '', observaciones: '' }); setModal(true); }
  async function guardar() {
    setError('');
    try {
      await api.post('/produccion', {
        articulo_id: Number(form.articulo_id), sucursal_id: Number(form.sucursal_id),
        cantidad: Number(form.cantidad), observaciones: form.observaciones || null,
      });
      setModal(false); await reload();
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al registrar'); }
  }
  async function cambiar(id: number, estado: string) {
    if (estado === 'cancelado' && !confirm('¿Cancelar esta producción? Se liberará la materia reservada.')) return;
    try { await api.put(`/produccion/${id}/estado`, { estado }); await reload(); }
    catch (e) { alert(e instanceof Error ? e.message : 'No se pudo cambiar el estado'); }
  }
  const puedeEditar = puede('produccion:editar');

  const columns: Column<ProduccionRow>[] = [
    { header: 'Folio', render: (p) => p.folio },
    { header: 'Fecha', render: (p) => new Date(p.fecha).toLocaleDateString() },
    { header: 'Artículo', render: (p) => p.articulo },
    { header: 'Cantidad', render: (p) => Number(p.cantidad).toLocaleString() },
    { header: 'Sucursal', render: (p) => p.sucursal },
    {
      header: 'Estado',
      render: (p) => {
        const e = ESTADOS[p.estado] ?? { label: p.estado, cls: 'badge-muted' };
        return <span className={`badge ${e.cls}`}>{e.label}</span>;
      },
    },
    {
      header: 'Acciones',
      render: (p) => {
        if (!puedeEditar) return null;
        if (p.estado === 'en_espera') return (
          <>
            <button className="btn-sm" onClick={() => cambiar(p.id, 'en_progreso')}>Iniciar</button>
            <button className="btn-sm btn-primary" onClick={() => cambiar(p.id, 'terminado')}>Terminar</button>
            <button className="btn-sm btn-danger" onClick={() => cambiar(p.id, 'cancelado')}>Cancelar</button>
          </>
        );
        if (p.estado === 'en_progreso') return (
          <>
            <button className="btn-sm btn-primary" onClick={() => cambiar(p.id, 'terminado')}>Terminar</button>
            <button className="btn-sm btn-danger" onClick={() => cambiar(p.id, 'cancelado')}>Cancelar</button>
          </>
        );
        return <span style={{ color: 'var(--ink-400)' }}>—</span>;
      },
    },
  ];

  return (
    <section>
      <div className="page-head">
        <h1>Producción</h1>
        {puede('produccion:crear') && <button className="primario" onClick={nuevo}>Nueva producción</button>}
      </div>
      <div className="list-toolbar">
        <SearchBar onBuscar={buscar} placeholder="Buscar por artículo..." />
      </div>
      <DataTable columns={columns} rows={rows} vacio="Sin producciones registradas" />
      <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} />

      <Modal abierto={modal} titulo="Nueva producción" onCerrar={() => setModal(false)} onGuardar={guardar}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-500)' }}>
          Al crear la orden queda <strong>en espera</strong> y se <strong>reserva</strong> la materia prima.
          El descuento real ocurre al marcarla como <strong>terminada</strong>.
        </p>
        <label>Artículo a producir
          <select value={form.articulo_id} onChange={(e) => setForm({ ...form, articulo_id: e.target.value })}>
            <option value="">— Selecciona —</option>
            {articulos.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </label>
        <label>Sucursal (dónde se produce)
          <select value={form.sucursal_id} onChange={(e) => setForm({ ...form, sucursal_id: e.target.value })}>
            <option value="">— Selecciona —</option>
            {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </label>
        <label>Cantidad a producir
          <input type="number" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
        </label>
        <label>Observaciones
          <input value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
        </label>
        {error && <p className="error">{error}</p>}
      </Modal>
    </section>
  );
}
