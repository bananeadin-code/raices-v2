import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Articulo, Cliente, Sucursal, VentaRow, VentaDetalle, RemisionRow, RemisionDetalle } from '../types';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Combobox } from '../components/Combobox';
import { SearchBar } from '../components/SearchBar';
import { Pager } from '../components/Pager';
import { RemisionPrint } from '../components/RemisionPrint';
import { BotonReporte, ColReporte } from '../components/ReportePrint';
import { usePagedList } from '../hooks/usePagedList';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';

interface Linea { articulo_id: number | ''; cantidad: number | ''; }
const LINEA_VACIA: Linea = { articulo_id: '', cantidad: 1 };

const ESTADOS: Record<string, { label: string; cls: string }> = {
  pendiente: { label: 'Pendiente', cls: 'badge-warn' },
  entregada: { label: 'Entregada', cls: 'badge-ok' },
  cancelada: { label: 'Cancelada', cls: 'badge-danger' },
};

const REPORTE: ColReporte<RemisionRow>[] = [
  { header: 'Folio', align: 'right', get: (r) => r.folio },
  { header: 'Fecha', get: (r) => new Date(r.fecha).toLocaleDateString('es-MX') },
  { header: 'Cliente', get: (r) => r.cliente },
  { header: 'Sucursal', get: (r) => r.sucursal },
  { header: 'Venta', get: (r) => (r.venta_folio != null ? `#${r.venta_folio}` : '—') },
  { header: 'Artículos', align: 'right', get: (r) => r.renglones },
  { header: 'Estado', get: (r) => ESTADOS[r.estado]?.label ?? r.estado },
];

export function Remisiones() {
  const { puede } = useAuth();
  const toast = useToast();
  const [filtro, setFiltro] = useState('');
  const path = '/remisiones' + (filtro ? `?estado=${filtro}` : '');
  const { data: rows, total, page, setPage, buscar, pageSize, reload } = usePagedList<RemisionRow>(path);

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [ventas, setVentas] = useState<VentaRow[]>([]);

  const [modal, setModal] = useState(false);
  const [error, setError] = useState('');
  const [cab, setCab] = useState<any>({ sucursal_id: '', cliente_id: '', venta_id: '', observaciones: '' });
  const [lineas, setLineas] = useState<Linea[]>([{ ...LINEA_VACIA }]);
  const [remision, setRemision] = useState<RemisionDetalle | null>(null);

  useEffect(() => {
    api.getAll<Sucursal>('/sucursales').then(setSucursales).catch(() => {});
    api.getAll<Cliente>('/clientes').then(setClientes).catch(() => {});
    api.getAll<Articulo>('/articulos').then(setArticulos).catch(() => {});
    api.getAll<VentaRow>('/ventas').then(setVentas).catch(() => {});
  }, []);

  function nuevo() {
    setError('');
    setCab({ sucursal_id: sucursales[0]?.id ?? '', cliente_id: '', venta_id: '', observaciones: '' });
    setLineas([{ ...LINEA_VACIA }]);
    setModal(true);
  }

  // Al ligar una venta, hereda cliente y copia sus artículos.
  async function ligarVenta(v: string) {
    if (v === '') { setCab({ ...cab, venta_id: '' }); return; }
    try {
      const det = await api.get<VentaDetalle>(`/ventas/${Number(v)}`);
      const d = det as any; // sucursal_id / cliente_id llegan por v.* del backend
      setCab((c: any) => ({ ...c, venta_id: v, sucursal_id: d.sucursal_id ?? c.sucursal_id, cliente_id: d.cliente_id ?? c.cliente_id }));
      setLineas(det.items.map((it) => ({ articulo_id: it.articulo_id, cantidad: Number(it.cantidad) })));
    } catch { setCab((c: any) => ({ ...c, venta_id: v })); }
  }

  function setLinea(i: number, campo: keyof Linea, val: any) {
    setLineas(lineas.map((l, idx) => (idx === i ? { ...l, [campo]: val } : l)));
  }
  function addLinea() { setLineas([...lineas, { ...LINEA_VACIA }]); }
  function quitarLinea(i: number) { setLineas(lineas.filter((_, idx) => idx !== i)); }

  async function guardar() {
    setError('');
    if (!cab.sucursal_id) { setError('Selecciona la sucursal.'); return; }
    const items = lineas
      .filter((l) => l.articulo_id !== '' && Number(l.cantidad) > 0)
      .map((l) => ({ articulo_id: Number(l.articulo_id), cantidad: Number(l.cantidad) }));
    if (items.length === 0) { setError('Agrega al menos un artículo.'); return; }
    try {
      const r = await api.post<{ id: number }>('/remisiones', {
        sucursal_id: Number(cab.sucursal_id),
        cliente_id: cab.cliente_id === '' ? null : Number(cab.cliente_id),
        venta_id: cab.venta_id === '' ? null : Number(cab.venta_id),
        observaciones: cab.observaciones || null,
        items,
      });
      setModal(false); await reload(); toast.exito('Remisión creada');
      imprimir(r.id);
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al crear la remisión'); }
  }

  async function imprimir(id: number) {
    try { setRemision(await api.get<RemisionDetalle>(`/remisiones/${id}`)); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo abrir la remisión'); }
  }
  async function cambiar(r: RemisionRow, estado: 'entregada' | 'cancelada') {
    const txt = estado === 'entregada' ? 'marcar como entregada' : 'cancelar';
    if (!confirm(`¿${txt[0].toUpperCase() + txt.slice(1)} la remisión #${r.folio}?`)) return;
    try { await api.put(`/remisiones/${r.id}/estado`, { estado }); await reload(); toast.exito('Remisión actualizada'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo actualizar'); }
  }

  const columns: Column<RemisionRow>[] = [
    { header: 'Folio', render: (r) => r.folio },
    { header: 'Fecha', render: (r) => new Date(r.fecha).toLocaleDateString('es-MX') },
    { header: 'Cliente', render: (r) => r.cliente },
    { header: 'Sucursal', render: (r) => r.sucursal },
    { header: 'Venta', render: (r) => (r.venta_folio != null ? `#${r.venta_folio}` : '—') },
    { header: 'Artículos', align: 'right', render: (r) => r.renglones },
    { header: 'Estado', render: (r) => { const e = ESTADOS[r.estado]; return <span className={`badge ${e.cls}`}>{e.label}</span>; } },
    {
      header: 'Acciones',
      render: (r) => (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button className="btn-sm" onClick={() => imprimir(r.id)}>Imprimir</button>
          {r.estado === 'pendiente' && puede('remisiones:editar') && (
            <button className="btn-sm btn-primary" onClick={() => cambiar(r, 'entregada')}>Entregar</button>
          )}
          {r.estado !== 'cancelada' && puede('remisiones:editar') && (
            <button className="btn-sm btn-danger" onClick={() => cambiar(r, 'cancelada')}>Cancelar</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <section>
      <div className="page-head">
        <h1>Remisiones</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <BotonReporte titulo="Reporte de Remisiones" path={path} columnas={REPORTE} />
          {puede('remisiones:crear') && <button className="primario" onClick={nuevo}>Nueva remisión</button>}
        </div>
      </div>
      <p style={{ marginTop: -8, color: 'var(--ink-500)', fontSize: 13, maxWidth: 680 }}>
        Nota de entrega de artículos. Puedes generarla desde una venta (copia sus artículos) o capturarla a mano.
        Es un documento de entrega: no modifica el inventario.
      </p>

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

      <DataTable columns={columns} rows={rows} vacio="Sin remisiones registradas" />
      <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} />

      <Modal abierto={modal} titulo="Nueva remisión" ancho={720} onCerrar={() => setModal(false)} onGuardar={guardar}>
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
        <label>Generar desde venta (opcional — copia sus artículos)
          <Combobox
            opciones={ventas.map((v) => ({ value: v.id, label: `#${v.folio} · ${v.cliente} · ${Number(v.total).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}` }))}
            value={cab.venta_id} onChange={ligarVenta} vacioLabel="— Sin venta ligada —" placeholder="Selecciona una venta" />
        </label>

        <div style={{ marginTop: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Artículos a entregar</span>
          {lineas.map((l, i) => (
            <div key={i} className="pos-linea">
              <div style={{ flex: 1 }}>
                <Combobox opciones={articulos.map((a) => ({ value: a.id, label: a.nombre }))}
                  value={l.articulo_id} onChange={(v) => setLinea(i, 'articulo_id', v === '' ? '' : Number(v))} placeholder="Artículo" />
              </div>
              <input type="number" style={{ width: 90 }} value={l.cantidad}
                onChange={(e) => setLinea(i, 'cantidad', e.target.value === '' ? '' : Number(e.target.value))} />
              <button className="btn-sm" style={{ width: 60 }} onClick={() => quitarLinea(i)} disabled={lineas.length === 1}>Quitar</button>
            </div>
          ))}
          <button className="btn-sm" onClick={addLinea}>+ Agregar artículo</button>
        </div>

        <label>Observaciones
          <input value={cab.observaciones} onChange={(e) => setCab({ ...cab, observaciones: e.target.value })} />
        </label>
        {error && <p className="error">{error}</p>}
      </Modal>

      {remision && <RemisionPrint remision={remision} onClose={() => setRemision(null)} />}
    </section>
  );
}
