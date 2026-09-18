import { useState } from 'react';
import { api } from '../api/client';
import { VehiculoNota } from '../types';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { SearchBar } from '../components/SearchBar';
import { Pager } from '../components/Pager';
import { BotonReporte, ColReporte } from '../components/ReportePrint';
import { usePagedList } from '../hooks/usePagedList';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';

interface Vehiculo { id: number; nombre: string; placas?: string | null; activo: number; }
const REPORTE: ColReporte<Vehiculo>[] = [
  { header: 'Vehículo', get: (v) => v.nombre },
  { header: 'Placas', get: (v) => v.placas || '' },
];
const VACIO: Partial<Vehiculo> = { nombre: '', placas: '' };

const money = (n: number) => Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
const TIPO: Record<string, { label: string; cls: string }> = {
  reparacion: { label: 'Reparación', cls: 'badge-warn' },
  gasto: { label: 'Gasto', cls: 'badge-danger' },
  observacion: { label: 'Observación', cls: 'badge-muted' },
};

export function Vehiculos() {
  const { puede } = useAuth();
  const toast = useToast();
  const { data: rows, total, page, setPage, buscar, pageSize, reload } = usePagedList<Vehiculo>('/vehiculos');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<Vehiculo>>(VACIO);
  const [error, setError] = useState('');
  // bitácora del vehículo
  const [bitVeh, setBitVeh] = useState<Vehiculo | null>(null);
  const [notas, setNotas] = useState<VehiculoNota[]>([]);
  const [nota, setNota] = useState<any>({ tipo: 'observacion', descripcion: '', monto: '', fecha: '' });
  const [errorNota, setErrorNota] = useState('');

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

  async function abrirBitacora(v: Vehiculo) {
    setBitVeh(v); setErrorNota(''); setNota({ tipo: 'observacion', descripcion: '', monto: '', fecha: '' });
    try { setNotas(await api.get<VehiculoNota[]>(`/vehiculos/${v.id}/notas`)); } catch { setNotas([]); }
  }
  async function guardarNota() {
    if (!bitVeh) return;
    setErrorNota('');
    if (!nota.descripcion.trim()) { setErrorNota('Escribe la descripción.'); return; }
    try {
      await api.post(`/vehiculos/${bitVeh.id}/notas`, {
        tipo: nota.tipo,
        descripcion: nota.descripcion,
        monto: nota.tipo === 'observacion' || nota.monto === '' ? null : Number(nota.monto),
        fecha: nota.fecha || null,
      });
      setNota({ tipo: nota.tipo, descripcion: '', monto: '', fecha: '' });
      setNotas(await api.get<VehiculoNota[]>(`/vehiculos/${bitVeh.id}/notas`));
      toast.exito('Registrado');
    } catch (e) { setErrorNota(e instanceof Error ? e.message : 'No se pudo registrar'); }
  }

  const columns: Column<Vehiculo>[] = [
    { header: 'Vehículo', render: (v) => v.nombre },
    { header: 'Placas', render: (v) => v.placas || '—' },
    { header: 'Bitácora', render: (v) => <button className="btn-sm" onClick={() => abrirBitacora(v)}>Ver / agregar</button> },
  ];

  return (
    <section>
      <div className="page-head">
        <h1>Vehículos</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <BotonReporte titulo="Reporte de Vehículos" path="/vehiculos" columnas={REPORTE} orientacion="portrait" />
          {puede('vehiculos:crear') && <button className="primario" onClick={nuevo}>Agregar</button>}
        </div>
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

      <Modal abierto={!!bitVeh} titulo={`Bitácora · ${bitVeh?.nombre ?? ''}`} ancho={620}
        onCerrar={() => setBitVeh(null)} onGuardar={puede('vehiculos:editar') ? guardarNota : undefined}>
        {/* Alta rápida */}
        {puede('vehiculos:editar') && (
          <div className="veh-nota-form">
            <div style={{ display: 'flex', gap: 8 }}>
              <label style={{ width: 150 }}>Tipo
                <select value={nota.tipo} onChange={(e) => setNota({ ...nota, tipo: e.target.value })}>
                  <option value="observacion">Observación</option>
                  <option value="reparacion">Reparación</option>
                  <option value="gasto">Gasto</option>
                </select>
              </label>
              {nota.tipo !== 'observacion' && (
                <label style={{ width: 130 }}>Monto
                  <input type="number" value={nota.monto} onChange={(e) => setNota({ ...nota, monto: e.target.value })} />
                </label>
              )}
              <label style={{ width: 150 }}>Fecha
                <input type="date" value={nota.fecha} onChange={(e) => setNota({ ...nota, fecha: e.target.value })} />
              </label>
            </div>
            <label>Descripción
              <input value={nota.descripcion} onChange={(e) => setNota({ ...nota, descripcion: e.target.value })}
                placeholder="Cambio de llantas, verificación, fuga de aceite..." />
            </label>
            {errorNota && <p className="error">{errorNota}</p>}
          </div>
        )}

        {/* Historial */}
        <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600 }}>Historial</div>
        {notas.length === 0 ? <p className="vacio">Sin registros todavía.</p> : (
          <table className="data-table">
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th style={{ textAlign: 'right' }}>Monto</th></tr></thead>
            <tbody>
              {notas.map((n) => {
                const t = TIPO[n.tipo] ?? { label: n.tipo, cls: 'badge-muted' };
                return (
                  <tr key={n.id}>
                    <td>{new Date(n.fecha).toLocaleDateString('es-MX')}</td>
                    <td><span className={`badge ${t.cls}`}>{t.label}</span></td>
                    <td>{n.descripcion}</td>
                    <td style={{ textAlign: 'right' }}>{n.monto != null ? money(n.monto) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Modal>
    </section>
  );
}
