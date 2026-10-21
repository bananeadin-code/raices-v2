import { ReactNode, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../components/Toast';

const money = (n: number) => Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const ESTADO_VENTA: Record<string, string> = { pendiente: 'Pendiente', entregada: 'Entregada', cancelada: 'Cancelada' };
const ESTADO_PROD: Record<string, string> = { en_espera: 'En espera', en_progreso: 'En progreso', terminado: 'Terminado', cancelado: 'Cancelado' };
const TIPO_MOV: Record<string, string> = {
  entrada: 'Entrada', salida: 'Salida', venta: 'Venta', ajuste: 'Ajuste',
  traspaso: 'Traspaso', prod_consumo: 'Consumo (producción)', prod_alta: 'Alta (producción)',
};

function hoyISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
const fechaLarga = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};
const hora = (s: string) => new Date(s).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

interface Col { h: string; get: (r: any) => ReactNode; align?: 'left' | 'right' | 'center'; }
function Tabla({ cols, rows, vacio }: { cols: Col[]; rows: any[]; vacio: string }) {
  if (!rows.length) return <p className="reporte-mini-vacio">{vacio}</p>;
  return (
    <table className="reporte-tabla">
      <thead><tr>{cols.map((c) => <th key={c.h} style={{ textAlign: c.align ?? 'left' }}>{c.h}</th>)}</tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>{cols.map((c) => <td key={c.h} style={{ textAlign: c.align ?? 'left' }}>{c.get(r)}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}
function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return <div className="reporte-seccion"><div className="reporte-sub">{titulo}</div>{children}</div>;
}

export function ReporteDia() {
  const toast = useToast();
  const [fecha, setFecha] = useState(hoyISO());
  const [rep, setRep] = useState<any>(null);
  const [cargando, setCargando] = useState(false);

  async function cargar(f = fecha) {
    setCargando(true);
    try { setRep(await api.get<any>(`/reportes/dia?fecha=${f}`)); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo generar el reporte'); }
    finally { setCargando(false); }
  }
  useEffect(() => { cargar(hoyISO()); }, []); // eslint-disable-line

  const r = rep;
  return (
    <section>
      <div className="page-head">
        <h1>Reporte del día</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} style={{ width: 'auto' }} />
          <button onClick={() => cargar()} disabled={cargando}>{cargando ? 'Cargando…' : 'Ver'}</button>
          <button className="primario" onClick={() => window.print()} disabled={!r}>Imprimir / Guardar PDF</button>
        </div>
      </div>

      <style>{`@media print { @page { size: A4 landscape; margin: 12mm; } }`}</style>

      {r && (
        <div className="reporte-hoja" style={{ margin: '0 auto' }}>
          <div className="reporte-head">
            <div>
              <div className="marca-raidur" style={{ marginBottom: 4 }}><img src="/logo-raidur.jpeg" alt="RaiDur" /></div>
              <div className="reporte-empresa">Raíces Duranguenses</div>
              <div className="reporte-titulo">Reporte general del día · {fechaLarga(r.fecha)}</div>
            </div>
            <div className="reporte-meta">
              <div>Generado: {new Date().toLocaleString('es-MX')}</div>
            </div>
          </div>

          {/* Resumen / puntos clave */}
          <Seccion titulo="Resumen del día">
            <table className="reporte-tabla">
              <tbody>
                <tr><td><strong>Ventas del día</strong></td><td style={{ textAlign: 'right' }}>{money(r.resumen.ventasTotal)} · {r.resumen.ventasCount} venta(s)</td>
                    <td><strong>Cobrado (abonos)</strong></td><td style={{ textAlign: 'right' }}>{money(r.resumen.cobradoTotal)} · {r.resumen.cobradoCount} abono(s)</td></tr>
                <tr><td><strong>Producciones</strong></td><td style={{ textAlign: 'right' }}>{r.resumen.produccionesCount} ({r.resumen.produccionesTerminadas} terminadas)</td>
                    <td><strong>Movimientos de inventario</strong></td><td style={{ textAlign: 'right' }}>{r.resumen.movimientosCount}</td></tr>
                <tr><td><strong>Remisiones</strong></td><td style={{ textAlign: 'right' }}>{r.resumen.remisionesCount}</td>
                    <td><strong>Caja (otras entradas / salidas)</strong></td><td style={{ textAlign: 'right' }}>{money(r.resumen.cajaEntradas)} / {money(r.resumen.cajaSalidas)}</td></tr>
              </tbody>
            </table>
          </Seccion>

          {/* Ventas */}
          <Seccion titulo="Ventas por método de pago">
            <Tabla vacio="Sin ventas en el día."
              cols={[
                { h: 'Método', get: (x) => cap(x.metodo) },
                { h: 'Ventas', align: 'right', get: (x) => x.n },
                { h: 'Total', align: 'right', get: (x) => money(x.total) },
              ]} rows={r.ventasPorMetodo} />
          </Seccion>
          <Seccion titulo="Ventas por sucursal">
            <Tabla vacio="Sin ventas en el día."
              cols={[
                { h: 'Sucursal', get: (x) => x.sucursal },
                { h: 'Ventas', align: 'right', get: (x) => x.n },
                { h: 'Total', align: 'right', get: (x) => money(x.total) },
              ]} rows={r.ventasPorSucursal} />
          </Seccion>
          <Seccion titulo="Detalle de ventas">
            <Tabla vacio="Sin ventas en el día."
              cols={[
                { h: 'Folio', align: 'right', get: (x) => x.folio },
                { h: 'Cliente', get: (x) => x.cliente },
                { h: 'Sucursal', get: (x) => x.sucursal },
                { h: 'Pago', get: (x) => cap(x.metodo) },
                { h: 'Estado', get: (x) => ESTADO_VENTA[x.estado] ?? x.estado },
                { h: 'Total', align: 'right', get: (x) => money(x.total) },
              ]} rows={r.ventas} />
          </Seccion>

          {/* Cobranza */}
          <Seccion titulo="Cobranza recibida (abonos)">
            <Tabla vacio="Sin abonos en el día."
              cols={[
                { h: 'Venta', align: 'right', get: (x) => `#${x.venta_folio}` },
                { h: 'Cliente', get: (x) => x.cliente },
                { h: 'Método', get: (x) => cap(x.metodo) },
                { h: 'Referencia', get: (x) => x.referencia || '' },
                { h: 'Registró', get: (x) => x.usuario },
                { h: 'Monto', align: 'right', get: (x) => money(x.monto) },
              ]} rows={r.abonos} />
          </Seccion>

          {/* Producciones */}
          <Seccion titulo="Producciones">
            <Tabla vacio="Sin producciones en el día."
              cols={[
                { h: 'Folio', align: 'right', get: (x) => x.folio },
                { h: 'Artículo', get: (x) => x.articulo },
                { h: 'Cantidad', align: 'right', get: (x) => x.cantidad.toLocaleString('es-MX') },
                { h: 'Sucursal', get: (x) => x.sucursal },
                { h: 'Estado', get: (x) => ESTADO_PROD[x.estado] ?? x.estado },
              ]} rows={r.producciones} />
          </Seccion>

          {/* Movimientos de inventario */}
          <Seccion titulo="Movimientos de inventario (por tipo)">
            <Tabla vacio="Sin movimientos en el día."
              cols={[
                { h: 'Tipo', get: (x) => TIPO_MOV[x.tipo] ?? x.tipo },
                { h: 'Cantidad de movimientos', align: 'right', get: (x) => x.n },
              ]} rows={r.movPorTipo} />
          </Seccion>
          <Seccion titulo="Detalle de movimientos de inventario">
            <Tabla vacio="Sin movimientos en el día."
              cols={[
                { h: 'Hora', get: (x) => hora(x.fecha) },
                { h: 'Tipo', get: (x) => TIPO_MOV[x.tipo] ?? x.tipo },
                { h: 'Clase', get: (x) => x.clase },
                { h: 'Ítem', get: (x) => x.item },
                { h: 'Sucursal', get: (x) => x.sucursal },
                { h: 'Cantidad', align: 'right', get: (x) => Number(x.cantidad).toLocaleString('es-MX') },
                { h: 'Motivo', get: (x) => x.motivo || '' },
                { h: 'Usuario', get: (x) => x.usuario || '' },
              ]} rows={r.movimientos} />
          </Seccion>

          {/* Caja: otras entradas y salidas de dinero */}
          <Seccion titulo="Otras entradas (caja)">
            <Tabla vacio="Sin entradas de caja en el día."
              cols={[
                { h: 'Categoría', get: (x) => x.categoria },
                { h: 'Movimientos', align: 'right', get: (x) => x.n },
                { h: 'Total', align: 'right', get: (x) => money(x.total) },
              ]} rows={r.cajaEntradas} />
          </Seccion>
          <Seccion titulo="Salidas (caja)">
            <Tabla vacio="Sin salidas de caja en el día."
              cols={[
                { h: 'Categoría', get: (x) => x.categoria },
                { h: 'Movimientos', align: 'right', get: (x) => x.n },
                { h: 'Total', align: 'right', get: (x) => money(x.total) },
              ]} rows={r.cajaSalidas} />
          </Seccion>

          {/* Remisiones */}
          <Seccion titulo="Remisiones (entregas)">
            <Tabla vacio="Sin remisiones en el día."
              cols={[
                { h: 'Folio', align: 'right', get: (x) => x.folio },
                { h: 'Cliente', get: (x) => x.cliente },
                { h: 'Sucursal', get: (x) => x.sucursal },
                { h: 'Artículos', align: 'right', get: (x) => x.renglones },
                { h: 'Estado', get: (x) => cap(x.estado) },
              ]} rows={r.remisiones} />
          </Seccion>
        </div>
      )}
    </section>
  );
}
