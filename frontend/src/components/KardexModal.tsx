import { usePagedList } from '../hooks/usePagedList';
import { Modal } from './Modal';
import { DataTable, Column } from './DataTable';
import { Pager } from './Pager';

interface Mov {
  id: number; fecha: string; tipo: string; cantidad: number;
  motivo?: string | null; sucursal: string; usuario?: string | null;
}

const TIPOS: Record<string, string> = {
  entrada: 'Entrada', salida: 'Salida', venta: 'Venta', ajuste: 'Ajuste',
  traspaso: 'Traspaso', prod_consumo: 'Consumo producción', prod_alta: 'Alta producción',
};

interface Props {
  itemTipo: 'articulo' | 'materia';
  itemId: number;
  itemNombre: string;
  sucursalId?: number;
  onClose: () => void;
}

// Historial de movimientos de un item (kardex). Se monta al abrir, así carga bajo demanda.
export function KardexModal({ itemTipo, itemId, itemNombre, sucursalId, onClose }: Props) {
  const path = `/inventario/kardex?item_tipo=${itemTipo}&item_id=${itemId}` + (sucursalId ? `&sucursal_id=${sucursalId}` : '');
  const { data, total, page, setPage, pageSize } = usePagedList<Mov>(path, 10);

  const cols: Column<Mov>[] = [
    { header: 'Fecha', render: (m) => new Date(m.fecha).toLocaleString() },
    { header: 'Sucursal', render: (m) => m.sucursal },
    { header: 'Tipo', render: (m) => TIPOS[m.tipo] ?? m.tipo },
    { header: 'Cantidad', align: 'right', render: (m) => Number(m.cantidad).toLocaleString() },
    { header: 'Motivo', render: (m) => m.motivo ?? '' },
    { header: 'Usuario', render: (m) => m.usuario ?? '' },
  ];

  return (
    <Modal abierto={true} titulo={`Movimientos · ${itemNombre}`} ancho={760} onCerrar={onClose}>
      <div style={{ overflowX: 'auto' }}>
        <DataTable columns={cols} rows={data} vacio="Sin movimientos registrados" />
      </div>
      <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} />
    </Modal>
  );
}
