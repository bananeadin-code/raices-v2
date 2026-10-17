import { createPortal } from 'react-dom';
import { VentaDetalle } from '../types';

const money = (n: number) =>
  Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
const fecha = (s?: string | null) => (s ? new Date(s).toLocaleDateString('es-MX') : '');

function direccionCliente(v: VentaDetalle) {
  return [v.cliente_calle, v.cliente_numero, v.cliente_colonia, v.cliente_ciudad].filter(Boolean).join(' ');
}
function direccionSucursal(v: VentaDetalle) {
  const l1 = [v.calle, v.numero].filter(Boolean).join(' ');
  return [l1, v.colonia, v.cp && `C.P. ${v.cp}`, v.ciudad].filter(Boolean).join(', ');
}

// Un ejemplar de la nota (compacto, a media hoja). Se imprimen dos por hoja:
// Original (empresa) y Copia (cliente), en una sola impresión.
function NotaCuerpo({ venta, etiqueta }: { venta: VentaDetalle; etiqueta: string }) {
  const esCredito = venta.metodo_pago === 'credito';
  return (
    <div className="nota-copia">
      <span className="nota-copia-tag">{etiqueta}</span>

      {/* Encabezado */}
      <div className="nota-head">
        <div><div className="nota-recibo">Recibo # {venta.folio}</div></div>
        <div className="nota-empresa">
          <div className="nota-empresa-nombre">Raíces Duranguenses</div>
          <div className="nota-empresa-dir">{direccionSucursal(venta)}</div>
          {venta.sucursal_telefono && <div className="nota-empresa-dir">Tel. {venta.sucursal_telefono}</div>}
        </div>
        <div className="nota-fecha">Fecha: {fecha(venta.fecha)}</div>
      </div>

      {/* Datos del cliente */}
      <div className="nota-cliente">
        <div className="nota-cliente-titulo">Datos del Cliente</div>
        <div className="nota-cliente-grid">
          <div><span>Nombre:</span> {venta.cliente_nombre ?? 'Público en general'}</div>
          <div><span>Teléfono:</span> {venta.cliente_telefono ?? ''}</div>
          <div className="col2"><span>Dirección:</span> {direccionCliente(venta)}</div>
          {venta.cliente_rfc && <div><span>RFC:</span> {venta.cliente_rfc}</div>}
        </div>
      </div>

      {/* Artículos */}
      <table className="nota-tabla">
        <thead>
          <tr>
            <th style={{ width: 44 }}>Cant.</th>
            <th>Artículo</th>
            <th style={{ width: 90, textAlign: 'right' }}>Precio</th>
            <th style={{ width: 90, textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {venta.items.map((it) => (
            <tr key={it.id}>
              <td>{Number(it.cantidad).toLocaleString('es-MX')}</td>
              <td>{it.articulo}</td>
              <td style={{ textAlign: 'right' }}>{money(it.precio_unitario)}</td>
              <td style={{ textAlign: 'right' }}>{money(it.importe)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {Number(venta.descuento) > 0 && (
            <>
              <tr><td colSpan={3} style={{ textAlign: 'right' }}>Subtotal</td><td style={{ textAlign: 'right' }}>{money(venta.subtotal)}</td></tr>
              <tr><td colSpan={3} style={{ textAlign: 'right' }}>Descuento</td><td style={{ textAlign: 'right' }}>-{money(venta.descuento)}</td></tr>
            </>
          )}
          <tr className="nota-total-row">
            <td colSpan={3} style={{ textAlign: 'right' }}>Total</td>
            <td style={{ textAlign: 'right' }}>{money(venta.total)}</td>
          </tr>
          {esCredito && (
            <>
              <tr><td colSpan={3} style={{ textAlign: 'right' }}>Pagado</td><td style={{ textAlign: 'right' }}>{money(venta.pagado)}</td></tr>
              <tr className="nota-total-row"><td colSpan={3} style={{ textAlign: 'right' }}>Saldo</td><td style={{ textAlign: 'right' }}>{money(venta.saldo)}</td></tr>
            </>
          )}
        </tfoot>
      </table>

      <div className="nota-pago">
        Forma de pago: <strong>{venta.metodo_pago}</strong>
        {esCredito && venta.fecha_vencimiento && <> · Vence: <strong>{fecha(venta.fecha_vencimiento)}</strong></>}
      </div>

      {/* Garantía / verificación de entrega */}
      {venta.garantias.length > 0 && (
        <div className="nota-garantia">
          {venta.garantias.map((g) => (
            <div key={g.id} className="nota-garantia-bloque">
              <div className="nota-garantia-titulo">
                Garantía — {g.nombre}
                {g.permanente
                  ? <span className="nota-garantia-meses"> · De por vida</span>
                  : g.meses_garantia > 0 && <span className="nota-garantia-meses"> · {g.meses_garantia} meses</span>}
              </div>
              {g.articulos_txt && <div className="nota-garantia-aplica">Aplica a: {g.articulos_txt}</div>}
              {g.descripcion && <div className="nota-garantia-leyenda">{g.descripcion}</div>}
              <ul className="nota-garantia-puntos">
                {g.puntos.map((p, i) => (
                  <li key={i}><span className="chk">☐</span> {p}</li>
                ))}
              </ul>
            </div>
          ))}
          <div className="nota-garantia-cond">
            Garantía válida únicamente por <strong>defecto de fábrica</strong>. No es válida por: mala manipulación,
            desastres naturales o instalación incorrecta.
          </div>
        </div>
      )}

      {/* Consentimiento + firma */}
      <div className="nota-consentimiento">
        Declaro que revisé el producto y confirmo que se recibió <strong>completo y en buen estado</strong>.
        Por ello firmo de <strong>recibido y conforme</strong>.
      </div>
      <div className="nota-firmas">
        <div><div className="linea"></div>Nombre</div>
        <div><div className="linea"></div>Fecha</div>
        <div><div className="linea"></div>Firma</div>
      </div>

      <div className="nota-pie">Atendió: {venta.usuario} · {venta.sucursal_nombre}</div>
    </div>
  );
}

// Nota / recibo imprimible. Sale Original + Copia en una sola hoja (media hoja c/u).
// Se imprime o se guarda como PDF desde el navegador (Ctrl+P → "Guardar como PDF").
export function NotaPrint({ venta, onClose }: { venta: VentaDetalle; onClose: () => void }) {
  return createPortal(
    <div className="nota-overlay">
      <style>{`@media print { @page { size: A4 portrait; margin: 8mm; } }`}</style>
      <div className="nota-actions">
        <button className="primario" onClick={() => window.print()}>Imprimir / Guardar PDF</button>
        <button onClick={onClose}>Cerrar</button>
      </div>

      <div className="nota-doble">
        <NotaCuerpo venta={venta} etiqueta="Original" />
        <div className="nota-corte"><span>— — — — — — — — — — — corte — — — — — — — — — — —</span></div>
        <NotaCuerpo venta={venta} etiqueta="Copia" />
      </div>
    </div>,
    document.body
  );
}
