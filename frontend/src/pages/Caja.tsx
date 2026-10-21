import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { CajaCategoria, CajaMovimiento } from '../types';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Combobox } from '../components/Combobox';
import { SearchBar } from '../components/SearchBar';
import { Pager } from '../components/Pager';
import { BotonReporte, ColReporte } from '../components/ReportePrint';
import { usePagedList } from '../hooks/usePagedList';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';

const money = (n: number) => Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const REPORTE: ColReporte<CajaMovimiento>[] = [
  { header: 'Fecha', get: (m) => new Date(m.fecha).toLocaleString('es-MX') },
  { header: 'Tipo', get: (m) => (m.tipo === 'entrada' ? 'Entrada' : 'Salida') },
  { header: 'Categoría', get: (m) => m.categoria ?? '' },
  { header: 'Concepto', get: (m) => m.concepto },
  { header: 'Registró', get: (m) => m.usuario ?? '' },
  { header: 'Monto', align: 'right', get: (m) => money(m.monto) },
];

export function Caja() {
  const { puede } = useAuth();
  const toast = useToast();
  const [filtro, setFiltro] = useState('');
  const path = '/caja/movimientos' + (filtro ? `?tipo=${filtro}` : '');
  const { data: rows, total, page, setPage, buscar, pageSize, reload } = usePagedList<CajaMovimiento>(path);

  const [totales, setTotales] = useState({ entradas: 0, salidas: 0, saldo: 0 });
  const [categorias, setCategorias] = useState<CajaCategoria[]>([]);
  const [modal, setModal] = useState(false);
  const [mov, setMov] = useState<any>({ tipo: 'salida', categoria_id: '', concepto: '', monto: '', fecha: '' });
  const [error, setError] = useState('');
  // categorías
  const [modalCat, setModalCat] = useState(false);
  const [nuevaCat, setNuevaCat] = useState('');

  async function cargarTotales() {
    try { const r = await api.get<{ totales: any }>('/caja/movimientos?pageSize=1'); setTotales(r.totales); } catch { /* */ }
  }
  function cargarCategorias() { api.getAll<CajaCategoria>('/caja/categorias').then(setCategorias).catch(() => {}); }
  useEffect(() => { cargarTotales(); cargarCategorias(); }, []); // eslint-disable-line
  useEffect(() => { cargarTotales(); }, [rows]); // eslint-disable-line

  function nuevo() { setError(''); setMov({ tipo: 'salida', categoria_id: '', concepto: '', monto: '', fecha: '' }); setModal(true); }
  async function guardar() {
    setError('');
    if (!mov.concepto.trim()) { setError('Escribe el concepto.'); return; }
    if (!(Number(mov.monto) > 0)) { setError('Ingresa un monto válido.'); return; }
    try {
      await api.post('/caja/movimientos', {
        tipo: mov.tipo,
        categoria_id: mov.categoria_id === '' ? null : Number(mov.categoria_id),
        concepto: mov.concepto, monto: Number(mov.monto), fecha: mov.fecha || null,
      });
      setModal(false); await reload(); toast.exito('Movimiento registrado');
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al guardar'); }
  }
  async function eliminar(m: CajaMovimiento) {
    if (!confirm(`¿Eliminar este movimiento de ${money(m.monto)}?`)) return;
    try { await api.del(`/caja/movimientos/${m.id}`); await reload(); toast.exito('Eliminado'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo eliminar'); }
  }
  async function agregarCat() {
    if (!nuevaCat.trim()) return;
    try { await api.post('/caja/categorias', { nombre: nuevaCat }); setNuevaCat(''); cargarCategorias(); toast.exito('Categoría agregada'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo agregar'); }
  }
  async function quitarCat(c: CajaCategoria) {
    if (!confirm(`¿Eliminar la categoría "${c.nombre}"?`)) return;
    try { await api.del(`/caja/categorias/${c.id}`); cargarCategorias(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo eliminar'); }
  }

  const columns: Column<CajaMovimiento>[] = [
    { header: 'Fecha', render: (m) => new Date(m.fecha).toLocaleDateString('es-MX') },
    { header: 'Tipo', render: (m) => <span className={`badge ${m.tipo === 'entrada' ? 'badge-ok' : 'badge-danger'}`}>{m.tipo === 'entrada' ? 'Entrada' : 'Salida'}</span> },
    { header: 'Categoría', render: (m) => m.categoria ?? '—' },
    { header: 'Concepto', render: (m) => m.concepto },
    { header: 'Registró', render: (m) => m.usuario ?? '' },
    { header: 'Monto', align: 'right', render: (m) => <strong style={{ color: m.tipo === 'entrada' ? 'var(--brand-700)' : 'var(--danger)' }}>{m.tipo === 'entrada' ? '' : '-'}{money(m.monto)}</strong> },
    { header: '', render: (m) => (puede('caja:eliminar') ? <button className="btn-sm btn-danger" onClick={() => eliminar(m)}>Eliminar</button> : null) },
  ];

  return (
    <section>
      <div className="page-head">
        <h1>Caja</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <BotonReporte titulo="Reporte de Caja" path={path} columnas={REPORTE} />
          {puede('caja:crear') && <button onClick={() => setModalCat(true)}>Categorías</button>}
          {puede('caja:crear') && <button className="primario" onClick={nuevo}>Registrar movimiento</button>}
        </div>
      </div>
      <p style={{ marginTop: -8, color: 'var(--ink-500)', fontSize: 13, maxWidth: 680 }}>
        Bitácora de dinero: entradas y salidas de efectivo fuera del sistema (gastos, aportaciones, etc.).
        Es solo un registro; no afecta inventario ni ventas.
      </p>

      <div className="stat-tiles">
        <div className="stat-tile"><span className="stat-label">Entradas</span><span className="stat-value" style={{ color: 'var(--brand-700)' }}>{money(totales.entradas)}</span></div>
        <div className="stat-tile"><span className="stat-label">Salidas</span><span className="stat-value" style={{ color: 'var(--danger)' }}>{money(totales.salidas)}</span></div>
        <div className="stat-tile"><span className="stat-label">Saldo</span><span className="stat-value">{money(totales.saldo)}</span></div>
      </div>

      <div className="list-toolbar">
        <SearchBar onBuscar={buscar} placeholder="Buscar por concepto..." />
        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          Tipo:
          <div style={{ width: 160 }}>
            <Combobox opciones={[{ value: 'entrada', label: 'Entradas' }, { value: 'salida', label: 'Salidas' }]}
              value={filtro} onChange={setFiltro} vacioLabel="Todos" placeholder="Todos" />
          </div>
        </label>
      </div>

      <DataTable columns={columns} rows={rows} vacio="Sin movimientos de caja" />
      <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} />

      <Modal abierto={modal} titulo="Registrar movimiento" onCerrar={() => setModal(false)} onGuardar={guardar}>
        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{ flex: 1 }}>Tipo
            <select value={mov.tipo} onChange={(e) => setMov({ ...mov, tipo: e.target.value })}>
              <option value="salida">Salida (gasto)</option>
              <option value="entrada">Entrada (ingreso)</option>
            </select>
          </label>
          <label style={{ flex: 1 }}>Monto
            <input type="number" value={mov.monto} onChange={(e) => setMov({ ...mov, monto: e.target.value })} />
          </label>
        </div>
        <label>Categoría
          <Combobox opciones={categorias.map((c) => ({ value: c.id, label: c.nombre }))}
            value={mov.categoria_id} onChange={(v) => setMov({ ...mov, categoria_id: v })}
            vacioLabel="— Sin categoría —" placeholder="Selecciona categoría" />
        </label>
        <label>Concepto
          <input value={mov.concepto} onChange={(e) => setMov({ ...mov, concepto: e.target.value })}
            placeholder="Pago de luz, compra de material, aportación..." />
        </label>
        <label>Fecha (opcional)
          <input type="date" value={mov.fecha} onChange={(e) => setMov({ ...mov, fecha: e.target.value })} />
        </label>
        {error && <p className="error">{error}</p>}
      </Modal>

      <Modal abierto={modalCat} titulo="Categorías de caja" onCerrar={() => setModalCat(false)}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={{ flex: 1 }} value={nuevaCat} onChange={(e) => setNuevaCat(e.target.value)} placeholder="Nueva categoría" />
          <button className="btn-sm primario" onClick={agregarCat}>Agregar</button>
        </div>
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {categorias.map((c) => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
              <span>{c.nombre}</span>
              {puede('caja:eliminar') && <button className="btn-sm btn-danger" onClick={() => quitarCat(c)}>Quitar</button>}
            </div>
          ))}
          {categorias.length === 0 && <p className="vacio">Sin categorías.</p>}
        </div>
      </Modal>
    </section>
  );
}
