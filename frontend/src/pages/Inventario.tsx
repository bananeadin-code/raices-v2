import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Sucursal } from '../types';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Combobox } from '../components/Combobox';
import { SearchBar } from '../components/SearchBar';
import { Pager } from '../components/Pager';
import { usePagedList } from '../hooks/usePagedList';
import { KardexModal } from '../components/KardexModal';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';

interface Existencia {
  id: number;
  sucursal_id: number; sucursal: string; item_id: number; item: string;
  categoria?: string | null; unidad?: string | null; minimo?: number | null;
  cantidad: number; reservado: number; disponible: number;
}
interface Item { id: number; nombre: string; }

export function Inventario({ tipo }: { tipo: 'articulo' | 'materia' }) {
  const { puede } = useAuth();
  const toast = useToast();
  const [filtroSuc, setFiltroSuc] = useState('');
  const path = `/inventario/existencias?item_tipo=${tipo}` + (filtroSuc ? `&sucursal_id=${filtroSuc}` : '');
  const { data: rows, total, page, setPage, buscar, pageSize, reload } = usePagedList<Existencia>(path);

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [modalMov, setModalMov] = useState(false);
  const [modalTras, setModalTras] = useState(false);
  const [mov, setMov] = useState<any>({ tipo: 'entrada', item_id: '', sucursal_id: '', cantidad: '', motivo: '' });
  const [tras, setTras] = useState<any>({ item_id: '', sucursal_origen: '', sucursal_destino: '', cantidad: '', motivo: '' });
  const [error, setError] = useState('');
  const [kardex, setKardex] = useState<Existencia | null>(null);

  const etiqueta = tipo === 'articulo' ? 'Artículo' : 'Materia';
  const titulo = tipo === 'articulo' ? 'Inventario · Artículos' : 'Inventario · Materiales';

  useEffect(() => {
    api.getAll<Sucursal>('/sucursales').then(setSucursales).catch(() => {});
    const itemsPath = tipo === 'articulo' ? '/articulos' : '/materias';
    api.getAll<any>(itemsPath).then((d) => setItems(d.map((x) => ({ id: x.id, nombre: x.nombre })))).catch(() => {});
  }, [tipo]);

  function abrirMov() { setError(''); setMov({ tipo: 'entrada', item_id: '', sucursal_id: '', cantidad: '', motivo: '' }); setModalMov(true); }
  function abrirTras() { setError(''); setTras({ item_id: '', sucursal_origen: '', sucursal_destino: '', cantidad: '', motivo: '' }); setModalTras(true); }

  async function guardarMov() {
    setError('');
    try {
      await api.post('/inventario/movimiento', {
        tipo: mov.tipo, item_tipo: tipo, item_id: Number(mov.item_id),
        sucursal_id: Number(mov.sucursal_id), cantidad: Number(mov.cantidad), motivo: mov.motivo || null,
      });
      setModalMov(false); await reload(); toast.exito('Movimiento registrado');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    }
  }
  async function guardarTras() {
    setError('');
    try {
      await api.post('/inventario/traspaso', {
        item_tipo: tipo, item_id: Number(tras.item_id),
        sucursal_origen: Number(tras.sucursal_origen), sucursal_destino: Number(tras.sucursal_destino),
        cantidad: Number(tras.cantidad), motivo: tras.motivo || null,
      });
      setModalTras(false); await reload(); toast.exito('Traspaso realizado');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    }
  }

  const columns: Column<Existencia>[] = [
    { header: 'Sucursal', render: (e) => e.sucursal },
    { header: etiqueta, render: (e) => e.item },
    tipo === 'articulo'
      ? { header: 'Categoría', render: (e: Existencia) => e.categoria ?? '' }
      : { header: 'Unidad', render: (e: Existencia) => e.unidad ?? '' },
    { header: 'Cantidad', align: 'right', render: (e) => Number(e.cantidad).toLocaleString() },
    { header: 'Reservado', align: 'right', render: (e) => Number(e.reservado).toLocaleString() },
    {
      header: 'Disponible', align: 'right',
      render: (e) => {
        const bajo = e.minimo != null && Number(e.minimo) > 0 && Number(e.disponible) < Number(e.minimo);
        return (
          <span>
            {Number(e.disponible).toLocaleString()}
            {bajo && <span className="badge badge-danger" style={{ marginLeft: 6 }}>Bajo mínimo</span>}
          </span>
        );
      },
    },
    { header: '', render: (e) => <button className="btn-sm" onClick={() => setKardex(e)}>Movimientos</button> },
  ];

  return (
    <section>
      <div className="page-head">
        <h1>{titulo}</h1>
        {puede('inventario:editar') && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="primario" onClick={abrirMov}>Movimiento</button>
            <button onClick={abrirTras}>Traspaso</button>
          </div>
        )}
      </div>

      <div className="list-toolbar">
        <SearchBar onBuscar={buscar} placeholder={`Buscar ${etiqueta.toLowerCase()}...`} />
        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          Sucursal:
          <div style={{ width: 200 }}>
            <Combobox
              opciones={sucursales.map((s) => ({ value: s.id, label: s.nombre }))}
              value={filtroSuc} onChange={(v) => setFiltroSuc(v)}
              vacioLabel="Todas" placeholder="Todas" />
          </div>
        </label>
      </div>

      <DataTable columns={columns} rows={rows} vacio="Sin existencias registradas" />
      <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} />

      {kardex && (
        <KardexModal itemTipo={tipo} itemId={kardex.item_id} itemNombre={kardex.item}
          sucursalId={kardex.sucursal_id} onClose={() => setKardex(null)} />
      )}

      <Modal abierto={modalMov} titulo="Registrar movimiento" onCerrar={() => setModalMov(false)} onGuardar={guardarMov}>
        <label>Tipo
          <select value={mov.tipo} onChange={(e) => setMov({ ...mov, tipo: e.target.value })}>
            <option value="entrada">Entrada</option>
            <option value="salida">Salida</option>
            <option value="ajuste">Ajuste (fijar total)</option>
          </select>
        </label>
        <label>{etiqueta}
          <Combobox opciones={items.map((i) => ({ value: i.id, label: i.nombre }))}
            value={mov.item_id} onChange={(v) => setMov({ ...mov, item_id: v })} placeholder={`Selecciona ${etiqueta.toLowerCase()}`} />
        </label>
        <label>Sucursal
          <Combobox opciones={sucursales.map((s) => ({ value: s.id, label: s.nombre }))}
            value={mov.sucursal_id} onChange={(v) => setMov({ ...mov, sucursal_id: v })} placeholder="Selecciona sucursal" />
        </label>
        <label>{mov.tipo === 'ajuste' ? 'Nuevo total' : 'Cantidad'}
          <input type="number" value={mov.cantidad} onChange={(e) => setMov({ ...mov, cantidad: e.target.value })} />
        </label>
        <label>Motivo
          <input value={mov.motivo} onChange={(e) => setMov({ ...mov, motivo: e.target.value })} />
        </label>
        {error && <p className="error">{error}</p>}
      </Modal>

      <Modal abierto={modalTras} titulo="Traspaso entre sucursales" onCerrar={() => setModalTras(false)} onGuardar={guardarTras}>
        <label>{etiqueta}
          <Combobox opciones={items.map((i) => ({ value: i.id, label: i.nombre }))}
            value={tras.item_id} onChange={(v) => setTras({ ...tras, item_id: v })} placeholder={`Selecciona ${etiqueta.toLowerCase()}`} />
        </label>
        <label>Desde (origen)
          <Combobox opciones={sucursales.map((s) => ({ value: s.id, label: s.nombre }))}
            value={tras.sucursal_origen} onChange={(v) => setTras({ ...tras, sucursal_origen: v })} placeholder="Selecciona origen" />
        </label>
        <label>Hacia (destino)
          <Combobox opciones={sucursales.map((s) => ({ value: s.id, label: s.nombre }))}
            value={tras.sucursal_destino} onChange={(v) => setTras({ ...tras, sucursal_destino: v })} placeholder="Selecciona destino" />
        </label>
        <label>Cantidad
          <input type="number" value={tras.cantidad} onChange={(e) => setTras({ ...tras, cantidad: e.target.value })} />
        </label>
        <label>Motivo
          <input value={tras.motivo} onChange={(e) => setTras({ ...tras, motivo: e.target.value })} />
        </label>
        {error && <p className="error">{error}</p>}
      </Modal>
    </section>
  );
}
