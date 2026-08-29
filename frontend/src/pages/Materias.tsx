import { useState } from 'react';
import { api } from '../api/client';
import { Materia } from '../types';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { SearchBar } from '../components/SearchBar';
import { Pager } from '../components/Pager';
import { usePagedList } from '../hooks/usePagedList';
import { useAuth } from '../auth/AuthContext';

const VACIO: Partial<Materia> = { nombre: '', unidad: 'pza', costo: 0 };

export function Materias() {
  const { puede } = useAuth();
  const { data: rows, total, page, setPage, buscar, pageSize, reload } = usePagedList<Materia>('/materias');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<Materia>>(VACIO);
  const [error, setError] = useState('');

  function nuevo() { setError(''); setForm(VACIO); setModal(true); }
  function editar(m: Materia) { setError(''); setForm(m); setModal(true); }
  async function guardar() {
    setError('');
    try {
      if (form.id) await api.put(`/materias/${form.id}`, form);
      else await api.post('/materias', form);
      setModal(false); await reload();
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al guardar'); }
  }
  async function eliminar(m: Materia) {
    if (!confirm(`¿Eliminar "${m.nombre}"?`)) return;
    try { await api.del(`/materias/${m.id}`); await reload(); }
    catch (e) { alert(e instanceof Error ? e.message : 'No se pudo eliminar'); }
  }

  const columns: Column<Materia>[] = [
    { header: 'Código', render: (m) => m.codigo ?? '' },
    { header: 'Nombre', render: (m) => m.nombre },
    { header: 'Unidad', render: (m) => m.unidad },
    { header: 'Costo', render: (m) => `$${Number(m.costo).toFixed(2)}` },
  ];

  return (
    <section>
      <div className="page-head">
        <h1>Materias Primas</h1>
        {puede('materias:crear') && <button className="primario" onClick={nuevo}>Agregar</button>}
      </div>
      <div className="list-toolbar">
        <SearchBar onBuscar={buscar} placeholder="Buscar materia..." />
      </div>
      <DataTable columns={columns} rows={rows}
        onEdit={puede('materias:editar') ? editar : undefined}
        onDelete={puede('materias:eliminar') ? eliminar : undefined} />
      <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} />

      <Modal abierto={modal} titulo={form.id ? 'Editar materia prima' : 'Nueva materia prima'}
        onCerrar={() => setModal(false)} onGuardar={guardar}>
        <label>Código
          <input value={form.codigo ?? ''} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
        </label>
        <label>Nombre
          <input value={form.nombre ?? ''} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </label>
        <label>Unidad
          <input value={form.unidad ?? 'pza'} onChange={(e) => setForm({ ...form, unidad: e.target.value })} />
        </label>
        <label>Costo
          <input type="number" value={form.costo ?? 0} onChange={(e) => setForm({ ...form, costo: Number(e.target.value) })} />
        </label>
        <label>Mínimo
          <input type="number" value={form.minimo ?? ''} onChange={(e) => setForm({ ...form, minimo: e.target.value === '' ? null : Number(e.target.value) })} />
        </label>
        {error && <p className="error">{error}</p>}
      </Modal>
    </section>
  );
}
