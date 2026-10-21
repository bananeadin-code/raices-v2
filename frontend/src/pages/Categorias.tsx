import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Categoria } from '../types';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Combobox } from '../components/Combobox';
import { SearchBar } from '../components/SearchBar';
import { Pager } from '../components/Pager';
import { BotonReporte, ColReporte } from '../components/ReportePrint';
import { usePagedList } from '../hooks/usePagedList';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';

const VACIO: Partial<Categoria> = { nombre: '', padre_id: null };
const REPORTE: ColReporte<Categoria>[] = [
  { header: 'Categoría', get: (c) => c.nombre },
  { header: 'Pertenece a', get: (c) => c.padre ?? 'Principal' },
];

export function Categorias() {
  const { puede } = useAuth();
  const toast = useToast();
  const { data: rows, total, page, setPage, buscar, pageSize, reload } = usePagedList<Categoria>('/categorias');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<Categoria>>(VACIO);
  const [error, setError] = useState('');
  const [padres, setPadres] = useState<Categoria[]>([]);

  function cargarPadres() {
    api.getAll<Categoria>('/categorias').then((all) => setPadres(all.filter((c) => !c.padre_id))).catch(() => {});
  }
  useEffect(() => { cargarPadres(); }, [rows]); // eslint-disable-line

  function nuevo() { setError(''); setForm(VACIO); setModal(true); }
  function editar(c: Categoria) { setError(''); setForm({ ...c }); setModal(true); }
  async function guardar() {
    setError('');
    if (!form.nombre?.trim()) { setError('Escribe el nombre.'); return; }
    const payload = { nombre: form.nombre, padre_id: form.padre_id || null };
    try {
      if (form.id) await api.put(`/categorias/${form.id}`, payload);
      else await api.post('/categorias', payload);
      setModal(false); await reload(); cargarPadres(); toast.exito('Guardado');
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al guardar'); }
  }
  async function eliminar(c: Categoria) {
    if (!confirm(`¿Eliminar "${c.nombre}"?`)) return;
    try { await api.del(`/categorias/${c.id}`); await reload(); cargarPadres(); toast.exito('Eliminado'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo eliminar'); }
  }

  const columns: Column<Categoria>[] = [
    { header: 'Categoría', render: (c) => c.padre_id
        ? <span style={{ paddingLeft: 16, color: 'var(--ink-700)' }}>↳ {c.nombre}</span>
        : <strong>{c.nombre}</strong> },
    { header: 'Pertenece a', render: (c) => c.padre ?? <span style={{ color: 'var(--ink-500)' }}>Principal</span> },
  ];

  // En el selector de padre no se ofrece la propia categoría (al editar) ni otras subcategorías.
  const opcionesPadre = padres.filter((p) => p.id !== form.id).map((p) => ({ value: p.id, label: p.nombre }));

  return (
    <section>
      <div className="page-head">
        <h1>Categorías</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <BotonReporte titulo="Reporte de Categorías" path="/categorias" columnas={REPORTE} orientacion="portrait" />
          {puede('categorias:crear') && <button className="primario" onClick={nuevo}>Agregar</button>}
        </div>
      </div>
      <div className="list-toolbar">
        <SearchBar onBuscar={buscar} placeholder="Buscar categoría..." />
      </div>
      <DataTable columns={columns} rows={rows}
        onEdit={puede('categorias:editar') ? editar : undefined}
        onDelete={puede('categorias:eliminar') ? eliminar : undefined} />
      <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} />

      <Modal abierto={modal} titulo={form.id ? 'Editar categoría' : 'Nueva categoría'}
        onCerrar={() => setModal(false)} onGuardar={guardar}>
        <label>Nombre
          <input value={form.nombre ?? ''} onChange={(e) => setForm({ ...form, nombre: e.target.value })} autoFocus />
        </label>
        <label>Categoría padre
          <Combobox opciones={opcionesPadre}
            value={form.padre_id ?? ''} onChange={(v) => setForm({ ...form, padre_id: v === '' ? null : Number(v) })}
            vacioLabel="— Principal (sin padre) —" placeholder="— Principal (sin padre) —" />
        </label>
        <p style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>
          Déjala en "Principal" para una categoría de primer nivel, o elige un padre para hacerla subcategoría.
        </p>
        {error && <p className="error">{error}</p>}
      </Modal>
    </section>
  );
}
