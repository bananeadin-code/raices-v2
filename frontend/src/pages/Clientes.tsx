import { useState } from 'react';
import { api } from '../api/client';
import { Cliente } from '../types';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { SearchBar } from '../components/SearchBar';
import { Pager } from '../components/Pager';
import { BotonReporte, ColReporte } from '../components/ReportePrint';
import { usePagedList } from '../hooks/usePagedList';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { ClienteFormFields, VACIO_CLIENTE } from '../components/ClienteFormFields';

const REPORTE: ColReporte<Cliente>[] = [
  { header: 'Nombre', get: (c) => c.nombre },
  { header: 'Teléfono', get: (c) => c.telefono ?? '' },
  { header: 'Correo', get: (c) => c.email ?? '' },
  { header: 'RFC', get: (c) => c.rfc ?? '' },
  { header: 'Domicilio', get: (c) => c.calle ?? '' },
  { header: 'Ciudad', get: (c) => c.ciudad ?? '' },
  { header: 'Límite crédito', align: 'right', get: (c) => `$${Number(c.limite_credito).toFixed(2)}` },
];

export function Clientes() {
  const { puede } = useAuth();
  const toast = useToast();
  const { data: rows, total, page, setPage, buscar, pageSize, reload } = usePagedList<Cliente>('/clientes');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<Cliente>>(VACIO_CLIENTE);
  const [error, setError] = useState('');

  function nuevo() { setError(''); setForm(VACIO_CLIENTE); setModal(true); }
  function editar(c: Cliente) { setError(''); setForm(c); setModal(true); }

  async function guardar() {
    setError('');
    try {
      if (form.id) await api.put(`/clientes/${form.id}`, form);
      else await api.post('/clientes', form);
      setModal(false); await reload(); toast.exito('Guardado');
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al guardar'); }
  }
  async function eliminar(c: Cliente) {
    if (!confirm(`¿Eliminar a ${c.nombre}?`)) return;
    try { await api.del(`/clientes/${c.id}`); await reload(); toast.exito('Eliminado'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo eliminar'); }
  }

  const columns: Column<Cliente>[] = [
    { header: 'Nombre', render: (c) => c.nombre },
    { header: 'Teléfono', render: (c) => c.telefono ?? '' },
    { header: 'Domicilio', render: (c) => c.calle || '—' },
    { header: 'Ciudad', render: (c) => c.ciudad ?? '' },
    { header: 'RFC', render: (c) => c.rfc ?? '' },
    { header: 'Límite crédito', align: 'right', render: (c) => `$${Number(c.limite_credito).toFixed(2)}` },
  ];

  return (
    <section>
      <div className="page-head">
        <h1>Clientes</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <BotonReporte titulo="Reporte de Clientes" path="/clientes" columnas={REPORTE} />
          {puede('clientes:crear') && <button className="primario" onClick={nuevo}>Agregar</button>}
        </div>
      </div>
      <div className="list-toolbar">
        <SearchBar onBuscar={buscar} placeholder="Buscar cliente..." />
      </div>
      <DataTable columns={columns} rows={rows}
        onEdit={puede('clientes:editar') ? editar : undefined}
        onDelete={puede('clientes:eliminar') ? eliminar : undefined} />
      <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} />

      <Modal abierto={modal} titulo={form.id ? 'Editar cliente' : 'Nuevo cliente'}
        onCerrar={() => setModal(false)} onGuardar={guardar}>
        <ClienteFormFields form={form} onChange={setForm} />
        {error && <p className="error">{error}</p>}
      </Modal>
    </section>
  );
}
