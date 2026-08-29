import { useState } from 'react';
import { api } from '../api/client';
import { Sucursal } from '../types';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { SearchBar } from '../components/SearchBar';
import { Pager } from '../components/Pager';
import { usePagedList } from '../hooks/usePagedList';
import { useAuth } from '../auth/AuthContext';

const VACIO: Partial<Sucursal> = { nombre: '', tipo: 'mixto' };
const TIPOS: Sucursal['tipo'][] = ['tienda', 'almacen', 'fabrica', 'mixto'];

export function Sucursales() {
  const { puede } = useAuth();
  const { data: rows, total, page, setPage, buscar, pageSize, reload } = usePagedList<Sucursal>('/sucursales');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<Sucursal>>(VACIO);
  const [error, setError] = useState('');

  function nuevo() { setError(''); setForm(VACIO); setModal(true); }
  function editar(s: Sucursal) { setError(''); setForm(s); setModal(true); }
  async function guardar() {
    setError('');
    try {
      if (form.id) await api.put(`/sucursales/${form.id}`, form);
      else await api.post('/sucursales', form);
      setModal(false); await reload();
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al guardar'); }
  }
  async function eliminar(s: Sucursal) {
    if (!confirm(`¿Eliminar "${s.nombre}"?`)) return;
    try { await api.del(`/sucursales/${s.id}`); await reload(); }
    catch (e) { alert(e instanceof Error ? e.message : 'No se pudo eliminar'); }
  }

  const columns: Column<Sucursal>[] = [
    { header: 'Nombre', render: (s) => s.nombre },
    { header: 'Abrev.', render: (s) => s.abreviatura ?? '' },
    { header: 'Tipo', render: (s) => s.tipo },
    { header: 'Ciudad', render: (s) => s.ciudad ?? '' },
    { header: 'Teléfono', render: (s) => s.telefono ?? '' },
  ];

  return (
    <section>
      <div className="page-head">
        <h1>Sucursales</h1>
        {puede('sucursales:crear') && <button className="primario" onClick={nuevo}>Agregar</button>}
      </div>
      <div className="list-toolbar">
        <SearchBar onBuscar={buscar} placeholder="Buscar sucursal..." />
      </div>
      <DataTable columns={columns} rows={rows}
        onEdit={puede('sucursales:editar') ? editar : undefined}
        onDelete={puede('sucursales:eliminar') ? eliminar : undefined} />
      <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} />

      <Modal abierto={modal} titulo={form.id ? 'Editar sucursal' : 'Nueva sucursal'}
        onCerrar={() => setModal(false)} onGuardar={guardar}>
        <label>Nombre
          <input value={form.nombre ?? ''} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </label>
        <label>Abreviatura
          <input value={form.abreviatura ?? ''} onChange={(e) => setForm({ ...form, abreviatura: e.target.value })} />
        </label>
        <label>Tipo
          <select value={form.tipo ?? 'mixto'} onChange={(e) => setForm({ ...form, tipo: e.target.value as Sucursal['tipo'] })}>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label>Ciudad
          <input value={form.ciudad ?? ''} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />
        </label>
        <label>Teléfono
          <input value={form.telefono ?? ''} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
        </label>
        {error && <p className="error">{error}</p>}
      </Modal>
    </section>
  );
}
