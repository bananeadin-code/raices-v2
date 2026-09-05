import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AbonoHistorial } from '../types';
import { DataTable, Column } from '../components/DataTable';
import { SearchBar } from '../components/SearchBar';
import { Pager } from '../components/Pager';
import { usePagedList } from '../hooks/usePagedList';

const money = (n: number) => Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
const METODOS: Record<string, string> = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };

// Historial de abonos = pagos YA recibidos (a diferencia de Cobranza, que es lo que aún deben).
export function Abonos() {
  const { data, total, page, setPage, q, buscar, pageSize } = usePagedList<AbonoHistorial>('/ventas/abonos');
  const [suma, setSuma] = useState(0);

  useEffect(() => {
    const sep = q ? `&q=${encodeURIComponent(q)}` : '';
    api.get<{ suma: number }>(`/ventas/abonos?pageSize=1${sep}`).then((r) => setSuma(r.suma)).catch(() => {});
  }, [q, total]);

  const cols: Column<AbonoHistorial>[] = [
    { header: 'Fecha', render: (a) => new Date(a.fecha).toLocaleString('es-MX') },
    { header: 'Cliente', render: (a) => a.cliente },
    { header: 'Venta', render: (a) => `#${a.venta_folio}` },
    { header: 'Método', render: (a) => METODOS[a.metodo] ?? a.metodo },
    { header: 'Referencia', render: (a) => a.referencia || '—' },
    { header: 'Registró', render: (a) => a.usuario },
    { header: 'Monto', align: 'right', render: (a) => <strong>{money(a.monto)}</strong> },
  ];

  return (
    <section>
      <div className="page-head"><h1>Abonos</h1></div>
      <p style={{ marginTop: -8, color: 'var(--ink-500)', fontSize: 13, maxWidth: 680 }}>
        Historial de pagos recibidos sobre ventas a crédito. Para registrar un nuevo abono ve a
        <strong> Cobranza</strong> (donde están los saldos por cobrar).
      </p>

      <div className="stat-tiles">
        <div className="stat-tile">
          <span className="stat-label">Total cobrado{q ? ' (filtro actual)' : ' (histórico)'}</span>
          <span className="stat-value">{money(suma)}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Abonos registrados</span>
          <span className="stat-value">{total}</span>
        </div>
      </div>

      <div className="list-toolbar">
        <SearchBar onBuscar={buscar} placeholder="Buscar por cliente..." />
      </div>
      <DataTable columns={cols} rows={data} vacio="Aún no hay abonos registrados" />
      <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} />
    </section>
  );
}
