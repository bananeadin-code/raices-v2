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

// Nota / recibo imprimible. Reproduce el formato del recibo físico + el bloque de
// garantía (puntos que el cliente revisa y firma). Se imprime o se guarda como PDF
// desde el navegador (Ctrl+P → "Guardar como PDF").
export function NotaPrint({ venta, onClose }: { venta: VentaDetalle; onClose: () => void }) {
  const esCredito = venta.metodo_pago === 'credito';
  return createPortal(
    <div className="nota-overlay">
      <div className="nota-actions">
        <button className="primario" onClick={() => window.print()}>Imprimir / Guardar PDF</button>
        <button onClick={onClose}>Cerrar</button>
      </div>

      <div className="nota-print">
        {/* Encabezado */}
        <div className="nota-head">
          <div>
            <div className="nota-recibo">Recibo # {venta.folio}</div>
          </div>
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
              <th style={{ width: 60 }}>Cant.</th>
              <th>Artículo</th>
              <th style={{ width: 110, textAlign: 'right' }}>Precio</th>
              <th style={{ width: 110, textAlign: 'right' }}>Total</th>
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

        {/* Bloque de garantía / verificación de entrega */}
        {venta.garantias.length > 0 && (
          <div className="nota-garantia">
            {venta.garantias.map((g) => (
              <div key={g.id} className="nota-garantia-bloque">
                <div className="nota-garantia-titulo">
                  Garantía de entrega e instalación — {g.nombre}
                  {g.meses_garantia > 0 && <span className="nota-garantia-meses"> ({g.meses_garantia} meses de garantía)</span>}
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
          </div>
        )}

        {/* Consentimiento reforzado + firma */}
        <div className="nota-consentimiento">
          Declaro que <strong>revisé personalmente</strong> el producto y cada uno de los puntos de entrega
          e instalación aquí listados, confirmo que se entregaron <strong>completos y en buen estado</strong>,
          acepto los términos de la garantía y por ello firmo de <strong>recibido y conforme</strong>.
        </div>
        <div className="nota-firmas">
          <div><div className="linea"></div>Nombre</div>
          <div><div className="linea"></div>Fecha</div>
          <div><div className="linea"></div>Firma</div>
        </div>

        <div className="nota-pie">Atendió: {venta.usuario} · {venta.sucursal_nombre}</div>
      </div>
    </div>,
    document.body
  );
}
