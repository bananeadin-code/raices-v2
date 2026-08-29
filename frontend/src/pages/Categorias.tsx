import { useState } from 'react';
import { api } from '../api/client';
import { Categoria } from '../types';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { SearchBar } from '../components/SearchBar';
import { Pager } from '../components/Pager';
import { usePagedList } from '../hooks/usePagedList';
import { useAuth } from '../auth/AuthContext';

const VACIO: Partial<Categoria> = { nombre: '' };

export function Categorias() {
  const { puede } = useAuth();
  const { data: rows, total, page, setPage, buscar, pageSize, reload } = usePagedList<Categoria>('/categorias');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<Categoria>>(VACIO);
  const [error, setError] = useState('');

  function nuevo() { setError(''); setForm(VACIO); setModal(true); }
  function editar(c: Categoria) { setError(''); setForm(c); setModal(true); }
  async function guardar() {
    setError('');
    try {
      if (form.id) await api.put(`/categorias/${form.id}`, form);
      else await api.post('/categorias', form);
      setModal(false); await reload();
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al guardar'); }
  }
  async function eliminar(c: Categoria) {
    if (!confirm(`¿Eliminar "${c.nombre}"?`)) return;
    try { await api.del(`/categorias/${c.id}`); await reload(); }
    catch (e) { alert(e instanceof Error ? e.message : 'No se pudo eliminar'); }
  }

  const columns: Column<Categoria>[] = [{ header: 'Nombre', render: (c) => c.nombre }];

  return (
    <section>
      <div className="page-head">
        <h1>Categorías</h1>
        {puede('categorias:crear') && <button className="primario" onClick={nuevo}>Agregar</button>}
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
          <input value={form.nombre ?? ''} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </label>
        {error && <p className="error">{error}</p>}
      </Modal>
    </section>
  );
}
