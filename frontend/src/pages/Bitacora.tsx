import { DataTable, Column } from '../components/DataTable';
import { SearchBar } from '../components/SearchBar';
import { Pager } from '../components/Pager';
import { usePagedList } from '../hooks/usePagedList';

interface BitacoraRow {
  id: number; fecha: string; accion: string;
  entidad?: string | null; entidad_id?: number | null; detalle?: any;
  usuario?: string | null; login?: string | null;
}

export function Bitacora() {
  const { data, total, page, setPage, buscar, pageSize } = usePagedList<BitacoraRow>('/bitacora');

  const cols: Column<BitacoraRow>[] = [
    { header: 'Fecha', render: (b) => new Date(b.fecha).toLocaleString() },
    { header: 'Usuario', render: (b) => b.usuario ?? b.login ?? '—' },
    { header: 'Acción', render: (b) => b.accion },
    { header: 'Entidad', render: (b) => (b.entidad ? `${b.entidad}${b.entidad_id ? ' #' + b.entidad_id : ''}` : '') },
    { header: 'Detalle', render: (b) => (b.detalle ? (typeof b.detalle === 'string' ? b.detalle : JSON.stringify(b.detalle)) : '') },
  ];

  return (
    <section>
      <div className="page-head"><h1>Bitácora</h1></div>
      <div className="list-toolbar">
        <SearchBar onBuscar={buscar} placeholder="Buscar acción..." />
      </div>
      <div style={{ overflowX: 'auto' }}>
        <DataTable columns={cols} rows={data} vacio="Sin registros de actividad" />
      </div>
      <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} />
    </section>
  );
}
