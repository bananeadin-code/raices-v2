import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Articulo, Categoria, Materia } from '../types';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Combobox } from '../components/Combobox';
import { SearchBar } from '../components/SearchBar';
import { Pager } from '../components/Pager';
import { usePagedList } from '../hooks/usePagedList';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';

const VACIO: Partial<Articulo> = { nombre: '', precio: 0, costo: 0, es_producible: false };

interface RecetaRow { materia_id: number | ''; cantidad: number | ''; }

export function Articulos() {
  const { puede } = useAuth();
  const toast = useToast();
  const { data: rows, total, page, setPage, buscar, pageSize, reload } = usePagedList<Articulo>('/articulos');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<Articulo>>(VACIO);
  const [error, setError] = useState('');
  // receta / BOM
  const [modalReceta, setModalReceta] = useState(false);
  const [recetaArt, setRecetaArt] = useState<Articulo | null>(null);
  const [recetaRows, setRecetaRows] = useState<RecetaRow[]>([]);
  const [errorReceta, setErrorReceta] = useState('');

  useEffect(() => {
    api.getAll<Categoria>('/categorias').then(setCategorias).catch(() => {});
    api.getAll<Materia>('/materias').then(setMaterias).catch(() => {});
  }, []);

  function nuevo() { setError(''); setForm(VACIO); setModal(true); }
  function editar(a: Articulo) { setError(''); setForm({ ...a, es_producible: !!a.es_producible }); setModal(true); }
  async function guardar() {
    setError('');
    try {
      if (form.id) await api.put(`/articulos/${form.id}`, form);
      else await api.post('/articulos', form);
      setModal(false); await reload(); toast.exito('Guardado');
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al guardar'); }
  }
  async function eliminar(a: Articulo) {
    if (!confirm(`¿Eliminar "${a.nombre}"?`)) return;
    try { await api.del(`/articulos/${a.id}`); await reload(); toast.exito('Eliminado'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo eliminar'); }
  }

  // ---- Receta ----
  async function abrirReceta(a: Articulo) {
    setErrorReceta(''); setRecetaArt(a);
    const data = await api.get<any[]>(`/articulos/${a.id}/receta`);
    setRecetaRows(data.map((r) => ({ materia_id: r.materia_id, cantidad: Number(r.cantidad) })));
    setModalReceta(true);
  }
  function addFila() { setRecetaRows([...recetaRows, { materia_id: '', cantidad: '' }]); }
  function quitarFila(i: number) { setRecetaRows(recetaRows.filter((_, idx) => idx !== i)); }
  function editarFila(i: number, campo: keyof RecetaRow, val: any) {
    setRecetaRows(recetaRows.map((r, idx) => (idx === i ? { ...r, [campo]: val } : r)));
  }
  async function guardarReceta() {
    if (!recetaArt) return;
    setErrorReceta('');
    const payload = recetaRows
      .filter((r) => r.materia_id !== '' && Number(r.cantidad) > 0)
      .map((r) => ({ materia_id: Number(r.materia_id), cantidad: Number(r.cantidad) }));
    try {
      await api.put(`/articulos/${recetaArt.id}/receta`, payload);
      setModalReceta(false); toast.exito('Receta guardada');
    } catch (e) { setErrorReceta(e instanceof Error ? e.message : 'No se pudo guardar la receta'); }
  }

  const columns: Column<Articulo>[] = [
    { header: 'Nombre', render: (a) => a.nombre },
    { header: 'Categoría', render: (a) => a.categoria ?? '' },
    { header: 'Precio', align: 'right', render: (a) => `$${Number(a.precio).toFixed(2)}` },
    { header: 'Costo', align: 'right', render: (a) => `$${Number(a.costo).toFixed(2)}` },
    { header: 'Se produce', render: (a) => (a.es_producible ? 'Sí' : 'No') },
    { header: 'Receta', render: (a) => (a.es_producible && puede('articulos:ver')
        ? <button className="btn-sm" onClick={() => abrirReceta(a)}>Receta</button> : null) },
  ];

  return (
    <section>
      <div className="page-head">
        <h1>Artículos</h1>
        {puede('articulos:crear') && <button className="primario" onClick={nuevo}>Agregar</button>}
      </div>
      <div className="list-toolbar">
        <SearchBar onBuscar={buscar} placeholder="Buscar artículo..." />
      </div>
      <DataTable columns={columns} rows={rows}
        onEdit={puede('articulos:editar') ? editar : undefined}
        onDelete={puede('articulos:eliminar') ? eliminar : undefined} />
      <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} />

      <Modal abierto={modal} titulo={form.id ? 'Editar artículo' : 'Nuevo artículo'}
        onCerrar={() => setModal(false)} onGuardar={guardar}>
        <label>Nombre
          <input value={form.nombre ?? ''} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </label>
        <label>Categoría
          <Combobox
            opciones={categorias.map((c) => ({ value: c.id, label: c.nombre }))}
            value={form.categoria_id ?? ''}
            onChange={(v) => setForm({ ...form, categoria_id: v === '' ? null : Number(v) })}
            vacioLabel="— Sin categoría —" placeholder="Selecciona categoría" />
        </label>
        <label>Precio
          <input type="number" value={form.precio ?? 0} onChange={(e) => setForm({ ...form, precio: Number(e.target.value) })} />
        </label>
        <label>Costo
          <input type="number" value={form.costo ?? 0} onChange={(e) => setForm({ ...form, costo: Number(e.target.value) })} />
        </label>
        <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={!!form.es_producible}
            onChange={(e) => setForm({ ...form, es_producible: e.target.checked })} style={{ width: 'auto' }} />
          Se produce (tiene receta)
        </label>
        {error && <p className="error">{error}</p>}
      </Modal>

      <Modal abierto={modalReceta} titulo={`Receta · ${recetaArt?.nombre ?? ''}`} ancho={520}
        onCerrar={() => setModalReceta(false)} onGuardar={guardarReceta}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-500)' }}>Materias que consume por cada unidad producida.</p>
        {recetaRows.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <Combobox
                opciones={materias.map((m) => ({ value: m.id, label: m.nombre }))}
                value={r.materia_id}
                onChange={(v) => editarFila(i, 'materia_id', v === '' ? '' : Number(v))}
                placeholder="Materia" />
            </div>
            <input type="number" placeholder="Cant." style={{ width: 90 }}
              value={r.cantidad}
              onChange={(e) => editarFila(i, 'cantidad', e.target.value === '' ? '' : Number(e.target.value))} />
            <button className="btn-sm" onClick={() => quitarFila(i)}>Quitar</button>
          </div>
        ))}
        <button className="btn-sm" onClick={addFila}>+ Agregar materia</button>
        {errorReceta && <p className="error">{errorReceta}</p>}
      </Modal>
    </section>
  );
}
