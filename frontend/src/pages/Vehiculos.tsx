import { useState } from 'react';
import { api } from '../api/client';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { SearchBar } from '../components/SearchBar';
import { Pager } from '../components/Pager';
import { usePagedList } from '../hooks/usePagedList';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';

interface Vehiculo { id: number; nombre: string; placas?: string | null; activo: number; }
const VACIO: Partial<Vehiculo> = { nombre: '', placas: '' };

export function Vehiculos() {
  const { puede } = useAuth();
  const toast = useToast();
  const { data: rows, total, page, setPage, buscar, pageSize, reload } = usePagedList<Vehiculo>('/vehiculos');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<Vehiculo>>(VACIO);
  const [error, setError] = useState('');

  function nuevo() { setError(''); setForm(VACIO); setModal(true); }
  function editar(v: Vehiculo) { setError(''); setForm({ ...v }); setModal(true); }
  async function guardar() {
    setError('');
    if (!form.nombre?.trim()) { setError('El nombre es obligatorio.'); return; }
    const payload = { nombre: form.nombre, placas: form.placas || null };
    try {
      if (form.id) await api.put(`/vehiculos/${form.id}`, payload);
      else await api.post('/vehiculos', payload);
      setModal(false); await reload(); toast.exito('Guardado');
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al guardar'); }
  }
  async function eliminar(v: Vehiculo) {
    if (!confirm(`¿Eliminar "${v.nombre}"?`)) return;
    try { await api.del(`/vehiculos/${v.id}`); await reload(); toast.exito('Eliminado'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo eliminar'); }
  }

  const columns: Column<Vehiculo>[] = [
    { header: 'Vehículo', render: (v) => v.nombre },
    { header: 'Placas', render: (v) => v.placas || '—' },
  ];

  return (
    <section>
      <div className="page-head">
        <h1>Vehículos</h1>
        {puede('vehiculos:crear') && <button className="primario" onClick={nuevo}>Agregar</button>}
      </div>
      <div className="list-toolbar">
        <SearchBar onBuscar={buscar} placeholder="Buscar vehículo..." />
      </div>
      <DataTable columns={columns} rows={rows} vacio="Sin vehículos registrados"
        onEdit={puede('vehiculos:editar') ? editar : undefined}
        onDelete={puede('vehiculos:eliminar') ? eliminar : undefined} />
      <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} />

      <Modal abierto={modal} titulo={form.id ? 'Editar vehículo' : 'Nuevo vehículo'}
        onCerrar={() => setModal(false)} onGuardar={guardar}>
        <label>Nombre / descripción
          <input value={form.nombre ?? ''} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Camioneta Nissan, Camión de reparto..." />
        </label>
        <label>Placas
          <input value={form.placas ?? ''} onChange={(e) => setForm({ ...form, placas: e.target.value })} />
        </label>
        {error && <p className="error">{error}</p>}
      </Modal>
    </section>
  );
}
