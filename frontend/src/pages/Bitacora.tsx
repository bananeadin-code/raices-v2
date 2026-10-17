import { DataTable, Column } from '../components/DataTable';
import { SearchBar } from '../components/SearchBar';
import { Pager } from '../components/Pager';
import { BotonReporte, ColReporte } from '../components/ReportePrint';
import { usePagedList } from '../hooks/usePagedList';

interface BitacoraRow {
  id: number; fecha: string; accion: string;
  entidad?: string | null; entidad_id?: number | null; detalle?: any;
  usuario?: string | null; login?: string | null;
}

// Traducción de cada código de acción a una frase legible + color del badge.
const ACCIONES: Record<string, { texto: string; tono: string }> = {
  'login': { texto: 'Inició sesión', tono: 'muted' },
  'password.cambiar': { texto: 'Cambió su contraseña', tono: 'info' },
  'venta.entregar': { texto: 'Registró una venta', tono: 'ok' },
  'venta.pendiente': { texto: 'Dejó una venta pendiente', tono: 'warn' },
  'venta.cancelar': { texto: 'Canceló una venta', tono: 'danger' },
  'venta.abono': { texto: 'Registró un abono', tono: 'info' },
  'remision.crear': { texto: 'Creó una remisión', tono: 'ok' },
  'remision.entregada': { texto: 'Entregó una remisión', tono: 'ok' },
  'remision.cancelada': { texto: 'Canceló una remisión', tono: 'danger' },
  'produccion.crear': { texto: 'Creó una producción', tono: 'ok' },
  'produccion.en_progreso': { texto: 'Inició una producción', tono: 'warn' },
  'produccion.terminado': { texto: 'Terminó una producción', tono: 'ok' },
  'produccion.cancelado': { texto: 'Canceló una producción', tono: 'danger' },
  'inventario.entrada': { texto: 'Entrada de inventario', tono: 'ok' },
  'inventario.salida': { texto: 'Salida de inventario', tono: 'warn' },
  'inventario.ajuste': { texto: 'Ajuste de inventario', tono: 'warn' },
  'inventario.traspaso': { texto: 'Traspaso de inventario', tono: 'info' },
};

const ENTIDADES: Record<string, string> = {
  venta: 'Venta', remision: 'Remisión', produccion: 'Producción', inventario: 'Inventario',
  articulo: 'Artículo', materia: 'Materia', usuario: 'Usuario', tarea: 'Tarea',
};

// Etiquetas legibles para las llaves del detalle (y qué campos ocultar).
const CAMPOS: Record<string, string> = {
  folio: 'Folio', total: 'Total', monto: 'Monto', metodo_pago: 'Pago',
  cantidad: 'Cantidad', venta_id: 'Venta', articulo_id: 'Artículo', materia_id: 'Materia',
  sucursal_id: 'Sucursal', item_id: 'Artículo/Materia', tipo: 'Tipo', motivo: 'Motivo',
};
const money = (n: number) => Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function accionLegible(a: string) {
  return ACCIONES[a] ?? { texto: a.replace(/[._]/g, ' '), tono: 'muted' };
}

function parseDetalle(detalle: any): { label: string; valor: string }[] {
  if (!detalle) return [];
  let obj = detalle;
  if (typeof detalle === 'string') { try { obj = JSON.parse(detalle); } catch { return [{ label: 'Detalle', valor: detalle }]; } }
  if (typeof obj !== 'object' || obj === null) return [];
  const chips: { label: string; valor: string }[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined || v === '') continue; // oculta lo vacío
    const label = CAMPOS[k] ?? k.replace(/_/g, ' ');
    let valor: string;
    if (k === 'total' || k === 'monto') valor = money(Number(v));
    else if (k.endsWith('_id')) valor = `#${v}`;               // referencias a otro registro
    else if (k === 'metodo_pago' || k === 'tipo') valor = cap(String(v));
    else valor = String(v);
    chips.push({ label, valor });
  }
  return chips;
}

const REPORTE: ColReporte<BitacoraRow>[] = [
  { header: 'Fecha', get: (b) => new Date(b.fecha).toLocaleString('es-MX') },
  { header: 'Usuario', get: (b) => b.usuario ?? b.login ?? '—' },
  { header: 'Acción', get: (b) => accionLegible(b.accion).texto },
  { header: 'Referencia', get: (b) => (b.entidad ? `${ENTIDADES[b.entidad] ?? b.entidad}${b.entidad_id ? ' #' + b.entidad_id : ''}` : '') },
  { header: 'Detalle', get: (b) => parseDetalle(b.detalle).map((c) => `${c.label}: ${c.valor}`).join(' · ') },
];

export function Bitacora() {
  const { data, total, page, setPage, buscar, pageSize } = usePagedList<BitacoraRow>('/bitacora');

  const cols: Column<BitacoraRow>[] = [
    { header: 'Fecha', render: (b) => new Date(b.fecha).toLocaleString('es-MX') },
    { header: 'Usuario', render: (b) => b.usuario ?? b.login ?? '—' },
    {
      header: 'Acción',
      render: (b) => {
        const a = accionLegible(b.accion);
        return <span className={`badge badge-${a.tono}`}>{a.texto}</span>;
      },
    },
    {
      header: 'Referencia',
      render: (b) => (b.entidad ? `${ENTIDADES[b.entidad] ?? b.entidad}${b.entidad_id ? ' #' + b.entidad_id : ''}` : '—'),
    },
    {
      header: 'Detalle',
      render: (b) => {
        const chips = parseDetalle(b.detalle);
        if (chips.length === 0) return <span style={{ color: 'var(--ink-400)' }}>—</span>;
        return (
          <div className="bita-chips">
            {chips.map((c, i) => (
              <span key={i} className="bita-chip"><span className="bita-chip-k">{c.label}</span> {c.valor}</span>
            ))}
          </div>
        );
      },
    },
  ];

  return (
    <section>
      <div className="page-head">
        <h1>Bitácora</h1>
        <BotonReporte titulo="Reporte de Bitácora" path="/bitacora" columnas={REPORTE} />
      </div>
      <p style={{ marginTop: -8, color: 'var(--ink-500)', fontSize: 13 }}>
        Registro de quién hizo qué y cuándo, para auditoría.
      </p>
      <div className="list-toolbar">
        <SearchBar onBuscar={buscar} placeholder="Buscar (ej. venta, remision, abono)..." />
      </div>
      <div style={{ overflowX: 'auto' }}>
        <DataTable columns={cols} rows={data} vacio="Sin registros de actividad" />
      </div>
      <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} />
    </section>
  );
}
