import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { Articulo, Cliente, Sucursal, VentaRow, VentaDetalle } from '../types';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Combobox } from '../components/Combobox';
import { SearchBar } from '../components/SearchBar';
import { Pager } from '../components/Pager';
import { usePagedList } from '../hooks/usePagedList';
import { BotonReporte, ColReporte } from '../components/ReportePrint';
import { NotaPrint } from '../components/NotaPrint';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';

const money = (n: number) => Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

interface Linea { articulo_id: number | ''; cantidad: number | ''; precio_unitario: number | ''; }
const LINEA_VACIA: Linea = { articulo_id: '', cantidad: 1, precio_unitario: '' };

const ESTADOS: Record<string, { label: string; cls: string }> = {
  pendiente: { label: 'Pendiente', cls: 'badge-warn' },
  entregada: { label: 'Entregada', cls: 'badge-ok' },
  cancelada: { label: 'Cancelada', cls: 'badge-danger' },
};

const REPORTE: ColReporte<VentaRow>[] = [
  { header: 'Folio', align: 'right', get: (v) => v.folio },
  { header: 'Fecha', get: (v) => new Date(v.fecha).toLocaleDateString('es-MX') },
  { header: 'Cliente', get: (v) => v.cliente },
  { header: 'Sucursal', get: (v) => v.sucursal },
  { header: 'Pago', get: (v) => v.metodo_pago },
  { header: 'Estado', get: (v) => ESTADOS[v.estado]?.label ?? v.estado },
  { header: 'Total', align: 'right', get: (v) => money(v.total) },
  { header: 'Saldo', align: 'right', get: (v) => (v.metodo_pago === 'credito' && v.estado !== 'cancelada' ? money(v.saldo) : '—') },
];

export function POS() {
  const { puede } = useAuth();
  const toast = useToast();
  const [filtro, setFiltro] = useState('');
  const path = '/ventas' + (filtro ? `?estado=${filtro}` : '');
  const { data: rows, total, page, setPage, buscar, pageSize, reload } = usePagedList<VentaRow>(path);

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [articulos, setArticulos] = useState<Articulo[]>([]);

  const [modal, setModal] = useState(false);
  const [error, setError] = useState('');
  const [cab, setCab] = useState<any>({ sucursal_id: '', cliente_id: '', metodo_pago: 'efectivo', estado: 'confirmada', descuento: 0, fecha_vencimiento: '', observaciones: '' });
  const [lineas, setLineas] = useState<Linea[]>([{ ...LINEA_VACIA }]);

  const [nota, setNota] = useState<VentaDetalle | null>(null);
  const [abonoVenta, setAbonoVenta] = useState<VentaRow | null>(null);
  const [abono, setAbono] = useState<any>({ monto: '', metodo: 'efectivo', referencia: '' });
  const [errorAbono, setErrorAbono] = useState('');

  useEffect(() => {
    api.getAll<Sucursal>('/sucursales').then(setSucursales).catch(() => {});
    api.getAll<Cliente>('/clientes').then(setClientes).catch(() => {});
    api.getAll<Articulo>('/articulos').then(setArticulos).catch(() => {});
  }, []);

  const artById = useMemo(() => new Map(articulos.map((a) => [a.id, a])), [articulos]);
  const subtotal = lineas.reduce((s, l) => s + (Number(l.cantidad) || 0) * (Number(l.precio_unitario) || 0), 0);
  const totalVenta = Math.max(0, subtotal - (Number(cab.descuento) || 0));

  function nuevo() {
    setError('');
    setCab({ sucursal_id: sucursales[0]?.id ?? '', cliente_id: '', metodo_pago: 'efectivo', estado: 'entregada', descuento: 0, fecha_vencimiento: '', observaciones: '' });
    setLineas([{ ...LINEA_VACIA }]);
    setModal(true);
  }
  function setLinea(i: number, campo: keyof Linea, val: any) {
    setLineas(lineas.map((l, idx) => {
      if (idx !== i) return l;
      const nl = { ...l, [campo]: val };
      if (campo === 'articulo_id' && val !== '') {
        const a = artById.get(Number(val));
        if (a && (nl.precio_unitario === '' || nl.precio_unitario === 0)) nl.precio_unitario = Number(a.precio);
      }
      return nl;
    }));
  }
  function addLinea() { setLineas([...lineas, { ...LINEA_VACIA }]); }
  function quitarLinea(i: number) { setLineas(lineas.filter((_, idx) => idx !== i)); }

  async function guardar() {
    setError('');
    const items = lineas
      .filter((l) => l.articulo_id !== '' && Number(l.cantidad) > 0)
      .map((l) => ({ articulo_id: Number(l.articulo_id), cantidad: Number(l.cantidad), precio_unitario: Number(l.precio_unitario) || 0 }));
    if (items.length === 0) { setError('Agrega al menos un artículo con cantidad.'); return; }
    if (!cab.sucursal_id) { setError('Selecciona la sucursal.'); return; }
    if (cab.metodo_pago === 'credito' && !cab.cliente_id) { setError('Una venta a crédito requiere cliente.'); return; }
    try {
      const r = await api.post<{ id: number }>('/ventas', {
        sucursal_id: Number(cab.sucursal_id),
        cliente_id: cab.cliente_id === '' ? null : Number(cab.cliente_id),
        metodo_pago: cab.metodo_pago,
        estado: cab.estado,
        descuento: Number(cab.descuento) || 0,
        fecha_vencimiento: cab.metodo_pago === 'credito' && cab.fecha_vencimiento ? cab.fecha_vencimiento : null,
        observaciones: cab.observaciones || null,
        items,
      });
      setModal(false);
      await reload();
      toast.exito(cab.estado === 'pendiente' ? 'Venta pendiente (stock apartado)' : 'Venta registrada y entregada');
      verNota(r.id); // abre la nota lista para imprimir
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al registrar la venta'); }
  }

  async function verNota(id: number) {
    try { setNota(await api.get<VentaDetalle>(`/ventas/${id}`)); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo abrir la nota'); }
  }
  async function entregar(v: VentaRow) {
    if (!confirm(`¿Entregar la venta #${v.folio}? Se validará y descontará el stock.`)) return;
    try { await api.put(`/ventas/${v.id}/entregar`, {}); await reload(); toast.exito('Venta entregada'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo entregar'); }
  }
  async function cancelar(v: VentaRow) {
    if (!confirm(`¿Cancelar la venta #${v.folio}? Se revertirá el stock.`)) return;
    try { await api.put(`/ventas/${v.id}/cancelar`, {}); await reload(); toast.exito('Venta cancelada'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo cancelar'); }
  }
  function abrirAbono(v: VentaRow) { setErrorAbono(''); setAbono({ monto: '', metodo: 'efectivo', referencia: '' }); setAbonoVenta(v); }
  async function guardarAbono() {
    if (!abonoVenta) return;
    setErrorAbono('');
    if (!(Number(abono.monto) > 0)) { setErrorAbono('Ingresa un monto válido.'); return; }
    try {
      await api.post(`/ventas/${abonoVenta.id}/abonos`, { monto: Number(abono.monto), metodo: abono.metodo, referencia: abono.referencia || null });
      setAbonoVenta(null); await reload(); toast.exito('Abono registrado');
    } catch (e) { setErrorAbono(e instanceof Error ? e.message : 'No se pudo registrar el abono'); }
  }

  const columns: Column<VentaRow>[] = [
    { header: 'Folio', render: (v) => v.folio },
    { header: 'Fecha', render: (v) => new Date(v.fecha).toLocaleDateString('es-MX') },
    { header: 'Cliente', render: (v) => v.cliente },
    { header: 'Sucursal', render: (v) => v.sucursal },
    { header: 'Pago', render: (v) => v.metodo_pago },
    { header: 'Estado', render: (v) => { const e = ESTADOS[v.estado]; return <span className={`badge ${e.cls}`}>{e.label}</span>; } },
    { header: 'Total', align: 'right', render: (v) => money(v.total) },
    { header: 'Saldo', align: 'right', render: (v) => (v.metodo_pago === 'credito' && v.estado !== 'cancelada' ? money(v.saldo) : '—') },
    {
      header: 'Acciones',
      render: (v) => (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button className="btn-sm" onClick={() => verNota(v.id)}>Nota</button>
          {v.estado === 'pendiente' && puede('pos:editar') && (
            <button className="btn-sm btn-primary" onClick={() => entregar(v)}>Entregar</button>
          )}
          {v.metodo_pago === 'credito' && v.estado !== 'cancelada' && v.saldo > 0.009 && puede('abonos:crear') && (
            <button className="btn-sm" onClick={() => abrirAbono(v)}>Abonar</button>
          )}
          {v.estado !== 'cancelada' && puede('pos:editar') && (
            <button className="btn-sm btn-danger" onClick={() => cancelar(v)}>Cancelar</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <section>
      <div className="page-head">
        <h1>Punto de Venta</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <BotonReporte titulo="Reporte de Ventas" path={path} columnas={REPORTE} />
          {puede('pos:crear') && <button className="primario" onClick={nuevo}>Nueva venta</button>}
        </div>
      </div>

      <div className="list-toolbar">
        <SearchBar onBuscar={buscar} placeholder="Buscar por cliente..." />
        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          Estado:
          <div style={{ width: 180 }}>
            <Combobox
              opciones={[{ value: 'pendiente', label: 'Pendientes' }, { value: 'entregada', label: 'Entregadas' }, { value: 'cancelada', label: 'Canceladas' }]}
              value={filtro} onChange={setFiltro} vacioLabel="Todas" placeholder="Todas" />
          </div>
        </label>
      </div>

      <DataTable columns={columns} rows={rows} vacio="Sin ventas registradas" />
      <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} />

      {/* Constructor de venta */}
      <Modal abierto={modal} titulo="Nueva venta" ancho={760} onCerrar={() => setModal(false)} onGuardar={guardar}>
        <div style={{ display: 'flex', gap: 12 }}>
          <label style={{ flex: 1 }}>Sucursal
            <Combobox opciones={sucursales.map((s) => ({ value: s.id, label: s.nombre }))}
              value={cab.sucursal_id} onChange={(v) => setCab({ ...cab, sucursal_id: v })} placeholder="Selecciona sucursal" />
          </label>
          <label style={{ flex: 1 }}>Cliente
            <Combobox opciones={clientes.map((c) => ({ value: c.id, label: c.nombre }))}
              value={cab.cliente_id} onChange={(v) => setCab({ ...cab, cliente_id: v })}
              vacioLabel="Público en general" placeholder="Público en general" />
          </label>
        </div>

        {/* Renglones */}
        <div style={{ marginTop: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Artículos</span>
          <div className="pos-lineas-head">
            <span style={{ flex: 1 }}>Artículo</span>
            <span style={{ width: 70 }}>Cant.</span>
            <span style={{ width: 110 }}>Precio</span>
            <span style={{ width: 100, textAlign: 'right' }}>Importe</span>
            <span style={{ width: 60 }} />
          </div>
          {lineas.map((l, i) => {
            const importe = (Number(l.cantidad) || 0) * (Number(l.precio_unitario) || 0);
            return (
              <div key={i} className="pos-linea">
                <div style={{ flex: 1 }}>
                  <Combobox opciones={articulos.map((a) => ({ value: a.id, label: a.nombre }))}
                    value={l.articulo_id} onChange={(v) => setLinea(i, 'articulo_id', v === '' ? '' : Number(v))} placeholder="Artículo" />
                </div>
                <input type="number" style={{ width: 70 }} value={l.cantidad}
                  onChange={(e) => setLinea(i, 'cantidad', e.target.value === '' ? '' : Number(e.target.value))} />
                <input type="number" style={{ width: 110 }} value={l.precio_unitario}
                  onChange={(e) => setLinea(i, 'precio_unitario', e.target.value === '' ? '' : Number(e.target.value))} />
                <span style={{ width: 100, textAlign: 'right', fontSize: 13 }}>{money(importe)}</span>
                <button className="btn-sm" style={{ width: 60 }} onClick={() => quitarLinea(i)} disabled={lineas.length === 1}>Quitar</button>
              </div>
            );
          })}
          <button className="btn-sm" onClick={addLinea}>+ Agregar artículo</button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <label style={{ flex: 1 }}>Forma de pago
            <select value={cab.metodo_pago} onChange={(e) => setCab({ ...cab, metodo_pago: e.target.value })}>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
              <option value="credito">Crédito</option>
              <option value="cortesia">Cortesía (sin pago, solo firma)</option>
            </select>
          </label>
          <label style={{ flex: 1 }}>Tipo
            <select value={cab.estado} onChange={(e) => setCab({ ...cab, estado: e.target.value })}>
              <option value="entregada">Venta directa (valida y descuenta stock)</option>
              <option value="pendiente">Pendiente (aparta/reserva stock; se entrega después)</option>
            </select>
          </label>
          <label style={{ width: 120 }}>Descuento
            <input type="number" value={cab.descuento} onChange={(e) => setCab({ ...cab, descuento: e.target.value })} />
          </label>
        </div>

        {cab.metodo_pago === 'credito' && (
          <label>Fecha de vencimiento
            <input type="date" value={cab.fecha_vencimiento} onChange={(e) => setCab({ ...cab, fecha_vencimiento: e.target.value })} />
          </label>
        )}
        <label>Observaciones
          <input value={cab.observaciones} onChange={(e) => setCab({ ...cab, observaciones: e.target.value })} />
        </label>

        <div className="pos-totales">
          <span>Subtotal: <strong>{money(subtotal)}</strong></span>
          <span>Descuento: <strong>{money(Number(cab.descuento) || 0)}</strong></span>
          <span className="pos-total-grande">Total: <strong>{money(totalVenta)}</strong></span>
        </div>
        {error && <p className="error">{error}</p>}
      </Modal>

      {/* Abono */}
      <Modal abierto={!!abonoVenta} titulo={`Abono · venta #${abonoVenta?.folio ?? ''}`} ancho={420}
        onCerrar={() => setAbonoVenta(null)} onGuardar={guardarAbono}>
        {abonoVenta && <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-500)' }}>Saldo actual: <strong>{money(abonoVenta.saldo)}</strong></p>}
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
        {errorAbono && <p className="error">{errorAbono}</p>}
      </Modal>

      {nota && <NotaPrint venta={nota} onClose={() => setNota(null)} />}
    </section>
  );
}
