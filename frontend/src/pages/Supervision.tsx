import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Cliente } from '../types';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Combobox } from '../components/Combobox';
import { SearchBar } from '../components/SearchBar';
import { Pager } from '../components/Pager';
import { usePagedList } from '../hooks/usePagedList';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';

interface Supervision {
  id: number; fecha: string; ubicacion?: string | null; observaciones: string;
  supervisor: string; cliente: string;
}

export function Supervision() {
  const { puede } = useAuth();
  const toast = useToast();
  const { data: rows, total, page, setPage, buscar, pageSize, reload } = usePagedList<Supervision>('/supervisiones');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({ cliente_id: '', ubicacion: '', observaciones: '' });
  const [error, setError] = useState('');

  useEffect(() => { api.getAll<Cliente>('/clientes').then(setClientes).catch(() => {}); }, []);

  function nueva() { setError(''); setForm({ cliente_id: '', ubicacion: '', observaciones: '' }); setModal(true); }
  async function guardar() {
    setError('');
    if (!form.observaciones.trim()) { setError('Describe la visita.'); return; }
    try {
      await api.post('/supervisiones', {
        cliente_id: form.cliente_id === '' ? null : Number(form.cliente_id),
        ubicacion: form.ubicacion || null, observaciones: form.observaciones,
      });
      setModal(false); await reload(); toast.exito('Supervisión registrada');
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al registrar'); }
  }

  const columns: Column<Supervision>[] = [
    { header: 'Fecha', render: (s) => new Date(s.fecha).toLocaleString('es-MX') },
    { header: 'Supervisor', render: (s) => s.supervisor },
    { header: 'Cliente', render: (s) => s.cliente },
    { header: 'Ubicación', render: (s) => s.ubicacion || '—' },
    { header: 'Observaciones', render: (s) => s.observaciones },
  ];

  return (
    <section>
      <div className="page-head">
        <h1>Supervisión</h1>
        {puede('supervision:crear') && <button className="primario" onClick={nueva}>Registrar visita</button>}
      </div>
      <p style={{ marginTop: -8, color: 'var(--ink-500)', fontSize: 13 }}>
        Bitácora de visitas y supervisiones a clientes u obras.
      </p>
      <div className="list-toolbar">
        <SearchBar onBuscar={buscar} placeholder="Buscar por cliente..." />
      </div>
      <DataTable columns={columns} rows={rows} vacio="Sin supervisiones registradas" />
      <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} />

      <Modal abierto={modal} titulo="Registrar visita" ancho={520} onCerrar={() => setModal(false)} onGuardar={guardar}>
        <label>Cliente (opcional)
          <Combobox opciones={clientes.map((c) => ({ value: c.id, label: c.nombre }))}
            value={form.cliente_id} onChange={(v) => setForm({ ...form, cliente_id: v })}
            vacioLabel="— Sin cliente —" placeholder="Selecciona cliente" />
        </label>
        <label>Ubicación
          <input value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
            placeholder="Obra El Nayar, domicilio del cliente..." />
        </label>
        <label>Observaciones
          <textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} rows={4} />
        </label>
        {error && <p className="error">{error}</p>}
      </Modal>
    </section>
  );
}
