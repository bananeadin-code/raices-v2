import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { UsuarioRow } from '../types';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Combobox } from '../components/Combobox';
import { SearchBar } from '../components/SearchBar';
import { Pager } from '../components/Pager';
import { usePagedList } from '../hooks/usePagedList';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';

interface Tarea {
  id: number; tema: string; descripcion?: string | null; respuesta?: string | null;
  estado: 'pendiente' | 'completada' | 'cancelada';
  fecha_limite?: string | null; fecha: string; responsable: string; asignador: string;
}
const ESTADOS: Record<string, { label: string; cls: string }> = {
  pendiente: { label: 'Pendiente', cls: 'badge-warn' },
  completada: { label: 'Completada', cls: 'badge-ok' },
  cancelada: { label: 'Cancelada', cls: 'badge-danger' },
};
const fecha = (s?: string | null) => (s ? new Date(s).toLocaleDateString('es-MX') : '—');

export function Tareas() {
  const { puede } = useAuth();
  const toast = useToast();
  const [filtro, setFiltro] = useState('');
  const [mias, setMias] = useState(false);
  const qs = [filtro && `estado=${filtro}`, mias && 'mias=1'].filter(Boolean).join('&');
  const path = '/tareas' + (qs ? `?${qs}` : '');
  const { data: rows, total, page, setPage, buscar, pageSize, reload } = usePagedList<Tarea>(path);

  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({ asignada_a: '', tema: '', descripcion: '', fecha_limite: '' });
  const [error, setError] = useState('');
  // cierre de tarea (completar) con respuesta
  const [cierre, setCierre] = useState<Tarea | null>(null);
  const [respuesta, setRespuesta] = useState('');

  useEffect(() => { api.getAll<UsuarioRow>('/usuarios').then(setUsuarios).catch(() => {}); }, []);

  function nueva() { setError(''); setForm({ asignada_a: '', tema: '', descripcion: '', fecha_limite: '' }); setModal(true); }
  async function guardar() {
    setError('');
    if (!form.asignada_a) { setError('Selecciona el responsable.'); return; }
    if (!form.tema.trim()) { setError('El tema es obligatorio.'); return; }
    try {
      await api.post('/tareas', {
        asignada_a: Number(form.asignada_a), tema: form.tema,
        descripcion: form.descripcion || null, fecha_limite: form.fecha_limite || null,
      });
      setModal(false); await reload(); toast.exito('Tarea asignada');
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al asignar'); }
  }
  function abrirCierre(t: Tarea) { setRespuesta(''); setCierre(t); }
  async function completar() {
    if (!cierre) return;
    try {
      await api.put(`/tareas/${cierre.id}/accion`, { estado: 'completada', respuesta: respuesta || null });
      setCierre(null); await reload(); toast.exito('Tarea completada');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo completar'); }
  }
  async function cancelar(t: Tarea) {
    if (!confirm(`¿Cancelar la tarea "${t.tema}"?`)) return;
    try { await api.put(`/tareas/${t.id}/accion`, { estado: 'cancelada' }); await reload(); toast.exito('Tarea cancelada'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo cancelar'); }
  }

  const columns: Column<Tarea>[] = [
    { header: 'Tema', render: (t) => t.tema },
    { header: 'Responsable', render: (t) => t.responsable },
    { header: 'Asignó', render: (t) => t.asignador },
    { header: 'Límite', render: (t) => {
        const vencida = t.estado === 'pendiente' && t.fecha_limite && new Date(t.fecha_limite) < new Date();
        return <span className={vencida ? 'badge badge-danger' : ''}>{fecha(t.fecha_limite)}</span>;
      } },
    { header: 'Estado', render: (t) => { const e = ESTADOS[t.estado]; return <span className={`badge ${e.cls}`}>{e.label}</span>; } },
    { header: 'Respuesta', render: (t) => <span style={{ color: 'var(--ink-500)' }}>{t.respuesta || '—'}</span> },
    {
      header: 'Acciones',
      render: (t) => (t.estado === 'pendiente' && puede('tareas:editar') ? (
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn-sm btn-primary" onClick={() => abrirCierre(t)}>Completar</button>
          <button className="btn-sm btn-danger" onClick={() => cancelar(t)}>Cancelar</button>
        </div>
      ) : <span style={{ color: 'var(--ink-400)' }}>—</span>),
    },
  ];

  return (
    <section>
      <div className="page-head">
        <h1>Tareas</h1>
        {puede('tareas:crear') && <button className="primario" onClick={nueva}>Asignar tarea</button>}
      </div>
      <div className="list-toolbar">
        <SearchBar onBuscar={buscar} placeholder="Buscar por tema..." />
        <div style={{ width: 180 }}>
          <Combobox
            opciones={[{ value: 'pendiente', label: 'Pendientes' }, { value: 'completada', label: 'Completadas' }, { value: 'cancelada', label: 'Canceladas' }]}
            value={filtro} onChange={setFiltro} vacioLabel="Todas" placeholder="Todas" />
        </div>
        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={mias} onChange={(e) => setMias(e.target.checked)} style={{ width: 'auto' }} />
          Solo las mías
        </label>
      </div>
      <DataTable columns={columns} rows={rows} vacio="Sin tareas" />
      <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} />

      <Modal abierto={modal} titulo="Asignar tarea" ancho={520} onCerrar={() => setModal(false)} onGuardar={guardar}>
        <label>Responsable
          <Combobox opciones={usuarios.map((u) => ({ value: u.id, label: u.nombre }))}
            value={form.asignada_a} onChange={(v) => setForm({ ...form, asignada_a: v })} placeholder="Selecciona usuario" />
        </label>
        <label>Tema
          <input value={form.tema} onChange={(e) => setForm({ ...form, tema: e.target.value })} />
        </label>
        <label>Descripción
          <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={3} />
        </label>
        <label>Fecha límite
          <input type="date" value={form.fecha_limite} onChange={(e) => setForm({ ...form, fecha_limite: e.target.value })} />
        </label>
        {error && <p className="error">{error}</p>}
      </Modal>

      <Modal abierto={!!cierre} titulo={`Completar · ${cierre?.tema ?? ''}`} onCerrar={() => setCierre(null)} onGuardar={completar}>
        <label>Respuesta / resultado (opcional)
          <textarea value={respuesta} onChange={(e) => setRespuesta(e.target.value)} rows={3}
            placeholder="Qué se hizo, quién recibió, etc." />
        </label>
      </Modal>
    </section>
  );
}
