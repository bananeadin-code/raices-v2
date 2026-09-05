import { createPortal } from 'react-dom';
import { RemisionDetalle } from '../types';

const fecha = (s?: string | null) => (s ? new Date(s).toLocaleDateString('es-MX') : '');

function direccionCliente(r: RemisionDetalle) {
  return [r.cliente_calle, r.cliente_numero, r.cliente_colonia, r.cliente_ciudad].filter(Boolean).join(' ');
}
function direccionSucursal(r: RemisionDetalle) {
  const l1 = [r.calle, r.numero].filter(Boolean).join(' ');
  return [l1, r.colonia, r.cp && `C.P. ${r.cp}`, r.ciudad].filter(Boolean).join(', ');
}

// Remisión / nota de entrega imprimible. Documento de entrega SIN precios; el cliente
// firma de recibido. Se imprime o guarda como PDF desde el navegador (Ctrl+P).
export function RemisionPrint({ remision, onClose }: { remision: RemisionDetalle; onClose: () => void }) {
  return createPortal(
    <div className="nota-overlay">
      <div className="nota-actions">
        <button className="primario" onClick={() => window.print()}>Imprimir / Guardar PDF</button>
        <button onClick={onClose}>Cerrar</button>
      </div>

      <div className="nota-print">
        <div className="nota-head">
          <div><div className="nota-recibo">Remisión # {remision.folio}</div></div>
          <div className="nota-empresa">
            <div className="nota-empresa-nombre">Raíces Duranguenses</div>
            <div className="nota-empresa-dir">{direccionSucursal(remision)}</div>
            {remision.sucursal_telefono && <div className="nota-empresa-dir">Tel. {remision.sucursal_telefono}</div>}
            <div className="nota-empresa-dir"><strong>NOTA DE ENTREGA</strong></div>
          </div>
          <div className="nota-fecha">
            Fecha: {fecha(remision.fecha)}
            {remision.venta_folio != null && <div>Ref. venta # {remision.venta_folio}</div>}
          </div>
        </div>

        <div className="nota-cliente">
          <div className="nota-cliente-titulo">Datos del Cliente</div>
          <div className="nota-cliente-grid">
            <div><span>Nombre:</span> {remision.cliente_nombre ?? 'Público en general'}</div>
            <div><span>Teléfono:</span> {remision.cliente_telefono ?? ''}</div>
            <div className="col2"><span>Dirección:</span> {direccionCliente(remision)}</div>
          </div>
        </div>

        <table className="nota-tabla">
          <thead>
            <tr>
              <th style={{ width: 80 }}>Cant.</th>
              <th>Artículo</th>
            </tr>
          </thead>
          <tbody>
            {remision.items.map((it) => (
              <tr key={it.id}>
                <td>{Number(it.cantidad).toLocaleString('es-MX')}</td>
                <td>{it.articulo}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {remision.observaciones && <div className="nota-pago">Observaciones: {remision.observaciones}</div>}

        <div className="nota-consentimiento">
          Recibí de conformidad los artículos aquí descritos, <strong>revisados y en buen estado</strong>.
        </div>
        <div className="nota-firmas">
          <div><div className="linea"></div>Nombre de quien recibe</div>
          <div><div className="linea"></div>Fecha</div>
          <div><div className="linea"></div>Firma</div>
        </div>

        <div className="nota-pie">Entregó: {remision.usuario} · {remision.sucursal_nombre}</div>
      </div>
    </div>,
    document.body
  );
}
