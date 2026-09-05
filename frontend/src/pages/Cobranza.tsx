import { useState } from 'react';
import { api } from '../api/client';
import { CobranzaRow, VentaDetalle } from '../types';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { SearchBar } from '../components/SearchBar';
import { Pager } from '../components/Pager';
import { usePagedList } from '../hooks/usePagedList';
import { NotaPrint } from '../components/NotaPrint';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';

const money = (n: number) => Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
const fecha = (s?: string | null) => (s ? new Date(s).toLocaleDateString('es-MX') : '—');

export function Cobranza() {
  const { puede } = useAuth();
  const toast = useToast();
  const { data: rows, total, page, setPage, buscar, pageSize, reload } = usePagedList<CobranzaRow>('/ventas/cobranza');
  const [nota, setNota] = useState<VentaDetalle | null>(null);
  const [venta, setVenta] = useState<CobranzaRow | null>(null);
  const [abono, setAbono] = useState<any>({ monto: '', metodo: 'efectivo', referencia: '' });
  const [error, setError] = useState('');

  async function verNota(id: number) {
    try { setNota(await api.get<VentaDetalle>(`/ventas/${id}`)); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo abrir la nota'); }
  }
  function abrir(v: CobranzaRow) { setError(''); setAbono({ monto: '', metodo: 'efectivo', referencia: '' }); setVenta(v); }
  async function guardar() {
    if (!venta) return;
    setError('');
    if (!(Number(abono.monto) > 0)) { setError('Ingresa un monto válido.'); return; }
    try {
      await api.post(`/ventas/${venta.id}/abonos`, { monto: Number(abono.monto), metodo: abono.metodo, referencia: abono.referencia || null });
      setVenta(null); await reload(); toast.exito('Abono registrado');
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo registrar el abono'); }
  }

  const columns: Column<CobranzaRow>[] = [
    { header: 'Folio', render: (v) => v.folio },
    { header: 'Cliente', render: (v) => v.cliente },
    { header: 'Sucursal', render: (v) => v.sucursal },
    { header: 'Vence', render: (v) => (
        <span className={v.vencida ? 'badge badge-danger' : ''}>{fecha(v.fecha_vencimiento)}</span>
      ) },
    { header: 'Total', align: 'right', render: (v) => money(v.total) },
    { header: 'Pagado', align: 'right', render: (v) => money(v.pagado) },
    { header: 'Saldo', align: 'right', render: (v) => <strong>{money(v.saldo)}</strong> },
    {
      header: 'Acciones',
      render: (v) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn-sm" onClick={() => verNota(v.id)}>Nota</button>
          {puede('abonos:crear') && <button className="btn-sm btn-primary" onClick={() => abrir(v)}>Abonar</button>}
        </div>
      ),
    },
  ];

  return (
    <section>
      <div className="page-head"><h1>Cobranza</h1></div>
      <p style={{ marginTop: -8, color: 'var(--ink-500)', fontSize: 13 }}>
        Ventas a crédito con saldo pendiente. Las <span className="badge badge-danger">vencidas</span> aparecen primero.
      </p>
      <div className="list-toolbar">
        <SearchBar onBuscar={buscar} placeholder="Buscar por cliente..." />
      </div>
      <DataTable columns={columns} rows={rows} vacio="Sin saldos pendientes" />
      <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} />

      <Modal abierto={!!venta} titulo={`Abono · venta #${venta?.folio ?? ''}`} ancho={420}
        onCerrar={() => setVenta(null)} onGuardar={guardar}>
        {venta && <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-500)' }}>Saldo actual: <strong>{money(venta.saldo)}</strong></p>}
        <label>Monto
          <input type="number" value={abono.monto} onChange={(e) => setAbono({ ...abono, monto: e.target.value })} />
        </label>
        <label>Método
          <select value={abono.metodo} onChange={(e) => setAbono({ ...abono, metodo: e.target.value })}>
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="transferencia">Transferencia</option>
          </select>
        </label>
        <label>Referencia (opcional)
          <input value={abono.referencia} onChange={(e) => setAbono({ ...abono, referencia: e.target.value })} />
        </label>
        {error && <p className="error">{error}</p>}
      </Modal>

      {nota && <NotaPrint venta={nota} onClose={() => setNota(null)} />}
    </section>
  );
}
