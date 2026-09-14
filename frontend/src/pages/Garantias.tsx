import { useState } from 'react';
import { api } from '../api/client';
import { GarantiaPlantilla, GarantiaDetalle } from '../types';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { SearchBar } from '../components/SearchBar';
import { Pager } from '../components/Pager';
import { usePagedList } from '../hooks/usePagedList';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';

interface Form {
  id?: number;
  nombre: string;
  meses_garantia: number | '';
  permanente: boolean;
  descripcion: string;
  puntos: string[];
}
const VACIO: Form = { nombre: '', meses_garantia: 12, permanente: false, descripcion: '', puntos: [''] };

export function Garantias() {
  const { puede } = useAuth();
  const toast = useToast();
  const { data: rows, total, page, setPage, buscar, pageSize, reload } = usePagedList<GarantiaPlantilla>('/garantias');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Form>(VACIO);
  const [error, setError] = useState('');

  function nuevo() { setError(''); setForm(VACIO); setModal(true); }
  async function editar(g: GarantiaPlantilla) {
    setError('');
    const det = await api.get<GarantiaDetalle>(`/garantias/${g.id}`);
    setForm({
      id: det.id, nombre: det.nombre, meses_garantia: det.meses_garantia,
      permanente: !!det.permanente,
      descripcion: det.descripcion ?? '',
      puntos: det.puntos.length ? det.puntos.map((p) => p.texto) : [''],
    });
    setModal(true);
  }
  async function guardar() {
    setError('');
    const payload = {
      nombre: form.nombre,
      meses_garantia: form.permanente ? 0 : (Number(form.meses_garantia) || 0),
      permanente: form.permanente,
      descripcion: form.descripcion || null,
      puntos: form.puntos.map((p) => p.trim()).filter(Boolean),
    };
    if (!payload.nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    try {
      if (form.id) await api.put(`/garantias/${form.id}`, payload);
      else await api.post('/garantias', payload);
      setModal(false); await reload(); toast.exito('Garantía guardada');
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al guardar'); }
  }
  async function eliminar(g: GarantiaPlantilla) {
    if (!confirm(`¿Eliminar la plantilla "${g.nombre}"?`)) return;
    try { await api.del(`/garantias/${g.id}`); await reload(); toast.exito('Eliminada'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo eliminar'); }
  }

  function setPunto(i: number, val: string) { setForm({ ...form, puntos: form.puntos.map((p, idx) => idx === i ? val : p) }); }
  function addPunto() { setForm({ ...form, puntos: [...form.puntos, ''] }); }
  function quitarPunto(i: number) { setForm({ ...form, puntos: form.puntos.filter((_, idx) => idx !== i) }); }

  const columns: Column<GarantiaPlantilla>[] = [
    { header: 'Plantilla', render: (g) => g.nombre },
    { header: 'Garantía', render: (g) => (g.permanente ? <span className="badge badge-ok">Permanente</span> : `${g.meses_garantia} meses`) },
    { header: 'Puntos de entrega', align: 'right', render: (g) => String(g.puntos ?? 0) },
    { header: 'Leyenda', render: (g) => <span style={{ color: 'var(--ink-500)' }}>{g.descripcion ?? ''}</span> },
  ];

  return (
    <section>
      <div className="page-head">
        <h1>Garantías de entrega</h1>
        {puede('garantias:crear') && <button className="primario" onClick={nuevo}>Nueva plantilla</button>}
      </div>
      <p style={{ marginTop: -8, color: 'var(--ink-500)', fontSize: 13, maxWidth: 680 }}>
        Cada plantilla define los <strong>puntos de verificación de entrega</strong> que el cliente revisa y firma en la nota.
        Enlaza una plantilla a un artículo (en Catálogos → Artículos) y aparecerá automáticamente en su nota.
      </p>
      <div className="list-toolbar">
        <SearchBar onBuscar={buscar} placeholder="Buscar plantilla..." />
      </div>
      <DataTable columns={columns} rows={rows} vacio="Sin plantillas de garantía"
        onEdit={puede('garantias:editar') ? editar : undefined}
        onDelete={puede('garantias:eliminar') ? eliminar : undefined} />
      <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} />

      <Modal abierto={modal} titulo={form.id ? 'Editar garantía' : 'Nueva garantía'} ancho={560}
        onCerrar={() => setModal(false)} onGuardar={guardar}>
        <div style={{ display: 'flex', gap: 12 }}>
          <label style={{ flex: 2 }}>Nombre (tipo de producto)
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Cisterna, Tinaco, Panel Solar..." />
          </label>
          <label style={{ flex: 1 }}>Garantía (meses)
            <input type="number" value={form.permanente ? '' : form.meses_garantia} disabled={form.permanente}
              onChange={(e) => setForm({ ...form, meses_garantia: e.target.value === '' ? '' : Number(e.target.value) })} />
          </label>
        </div>
        <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={form.permanente}
            onChange={(e) => setForm({ ...form, permanente: e.target.checked })} style={{ width: 'auto' }} />
          Garantía permanente (salvo causas naturales, mal uso o negligencia)
        </label>
        <label>Leyenda de la garantía (opcional)
          <input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            placeholder="Instalación correcta y entrega verificada." />
        </label>

        <div style={{ marginTop: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Puntos de verificación de entrega</span>
          <p style={{ margin: '2px 0 8px', fontSize: 12, color: 'var(--ink-500)' }}>
            El cliente revisa y firma cada punto. Ej.: "Ubicación nivelada y firme", "Conexiones seguras y sin fugas".
          </p>
          {form.puntos.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <span style={{ color: 'var(--ink-400)', fontSize: 13, width: 18, textAlign: 'right' }}>{i + 1}.</span>
              <input style={{ flex: 1 }} value={p} onChange={(e) => setPunto(i, e.target.value)}
                placeholder="Describe el punto de entrega" />
              <button className="btn-sm" onClick={() => quitarPunto(i)} disabled={form.puntos.length === 1}>Quitar</button>
            </div>
          ))}
          <button className="btn-sm" onClick={addPunto}>+ Agregar punto</button>
        </div>
        {error && <p className="error">{error}</p>}
      </Modal>
    </section>
  );
}
