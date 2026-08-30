import { useState } from 'react';
import { api } from '../api/client';
import { Cliente } from '../types';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { SearchBar } from '../components/SearchBar';
import { Pager } from '../components/Pager';
import { usePagedList } from '../hooks/usePagedList';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';

const VACIO: Partial<Cliente> = { nombre: '', telefono: '', ciudad: '', limite_credito: 0 };

// Catálogos SAT (subconjunto común) para agilizar el llenado.
const REGIMENES: [string, string][] = [
  ['601', '601 - General de Ley Personas Morales'],
  ['603', '603 - Personas Morales con Fines no Lucrativos'],
  ['605', '605 - Sueldos y Salarios'],
  ['606', '606 - Arrendamiento'],
  ['612', '612 - Personas Físicas con Actividad Empresarial'],
  ['616', '616 - Sin obligaciones fiscales'],
  ['621', '621 - Incorporación Fiscal'],
  ['626', '626 - Régimen Simplificado de Confianza (RESICO)'],
];
const USOS_CFDI: [string, string][] = [
  ['G01', 'G01 - Adquisición de mercancías'],
  ['G03', 'G03 - Gastos en general'],
  ['I01', 'I01 - Construcciones'],
  ['P01', 'P01 - Por definir'],
  ['S01', 'S01 - Sin efectos fiscales'],
];

export function Clientes() {
  const { puede } = useAuth();
  const toast = useToast();
  const { data: rows, total, page, setPage, buscar, pageSize, reload } = usePagedList<Cliente>('/clientes');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<Cliente>>(VACIO);
  const [error, setError] = useState('');

  function nuevo() { setError(''); setForm(VACIO); setModal(true); }
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

  const set = (campo: keyof Cliente, val: any) => setForm({ ...form, [campo]: val });

  const columns: Column<Cliente>[] = [
    { header: 'Nombre', render: (c) => c.nombre },
    { header: 'Teléfono', render: (c) => c.telefono ?? '' },
    { header: 'RFC', render: (c) => c.rfc ?? '' },
    { header: 'Ciudad', render: (c) => c.ciudad ?? '' },
    { header: 'Límite crédito', align: 'right', render: (c) => `$${Number(c.limite_credito).toFixed(2)}` },
  ];

  return (
    <section>
      <div className="page-head">
        <h1>Clientes</h1>
        {puede('clientes:crear') && <button className="primario" onClick={nuevo}>Agregar</button>}
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
        <label>Nombre
          <input value={form.nombre ?? ''} onChange={(e) => set('nombre', e.target.value)} />
        </label>
        <label>Teléfono
          <input value={form.telefono ?? ''} onChange={(e) => set('telefono', e.target.value)} />
        </label>
        <label>Correo
          <input value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
        </label>
        <label>Ciudad
          <input value={form.ciudad ?? ''} onChange={(e) => set('ciudad', e.target.value)} />
        </label>
        <label>Límite de crédito
          <input type="number" value={form.limite_credito ?? 0} onChange={(e) => set('limite_credito', Number(e.target.value))} />
        </label>

        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12, marginTop: 2 }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--ink-500)' }}>
            Datos fiscales (opcional)
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 2 }}>
            Solo para agilizar la factura si el cliente la solicita por fuera.
          </div>
        </div>
        <label>RFC
          <input value={form.rfc ?? ''} onChange={(e) => set('rfc', e.target.value.toUpperCase())} />
        </label>
        <label>Razón social
          <input value={form.razon_social ?? ''} onChange={(e) => set('razon_social', e.target.value)} />
        </label>
        <label>Régimen fiscal
          <select value={form.regimen_fiscal ?? ''} onChange={(e) => set('regimen_fiscal', e.target.value || null)}>
            <option value="">— Sin especificar —</option>
            {REGIMENES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </label>
        <label>Uso de CFDI
          <select value={form.uso_cfdi ?? ''} onChange={(e) => set('uso_cfdi', e.target.value || null)}>
            <option value="">— Sin especificar —</option>
            {USOS_CFDI.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </label>
        <label>Código postal fiscal
          <input value={form.cp_fiscal ?? ''} onChange={(e) => set('cp_fiscal', e.target.value)} />
        </label>
        <label>Correo para facturas
          <input value={form.email_fiscal ?? ''} onChange={(e) => set('email_fiscal', e.target.value)} />
        </label>

        {error && <p className="error">{error}</p>}
      </Modal>
    </section>
  );
}
