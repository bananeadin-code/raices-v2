import { createPortal } from 'react-dom';
import { CajaMovimiento } from '../types';

const money = (n: number) => Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
const fecha = (s?: string | null) => (s ? new Date(s).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : '');

// Cantidad con letra (pesos MXN). Suficiente para montos de caja (hasta millones).
function numeroALetras(n: number): string {
  const ent = Math.floor(Math.abs(n));
  const cent = Math.round((Math.abs(n) - ent) * 100);
  const UNI = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE'];
  const DEC = ['', '', 'VEINTI', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const CEN = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
  function hasta999(x: number): string {
    if (x === 0) return '';
    if (x === 100) return 'CIEN';
    let s = '';
    const c = Math.floor(x / 100); const r = x % 100;
    if (c) s += CEN[c] + ' ';
    if (r <= 20) s += UNI[r];
    else { const d = Math.floor(r / 10); const u = r % 10; s += d === 2 ? 'VEINTI' + UNI[u] : DEC[d] + (u ? ' Y ' + UNI[u] : ''); }
    return s.trim();
  }
  function conv(x: number): string {
    if (x === 0) return 'CERO';
    let s = '';
    const millones = Math.floor(x / 1_000_000);
    const miles = Math.floor((x % 1_000_000) / 1000);
    const resto = x % 1000;
    if (millones) s += (millones === 1 ? 'UN MILLÓN' : hasta999(millones) + ' MILLONES') + ' ';
    if (miles) s += (miles === 1 ? 'MIL' : hasta999(miles) + ' MIL') + ' ';
    if (resto) s += hasta999(resto);
    return s.trim();
  }
  return `${conv(ent)} PESOS ${String(cent).padStart(2, '0')}/100 M.N.`;
}

// Recibo de gasto imprimible (automático): Fecha, Responsable, Cantidad, Concepto.
// Se imprime o guarda como PDF con Ctrl+P. Sale a media hoja tamaño Carta.
export function ReciboGasto({ mov, onClose }: { mov: CajaMovimiento; onClose: () => void }) {
  return createPortal(
    <div className="nota-overlay">
      <style>{`@media print { @page { size: letter portrait; margin: 14mm; } }`}</style>
      <div className="nota-actions">
        <button className="primario" onClick={() => window.print()}>Imprimir / Guardar PDF</button>
        <button onClick={onClose}>Cerrar</button>
      </div>

      <div className="recibo-gasto">
        <div className="recibo-head">
          <div className="marca-raidur"><img src="/logo-raidur.jpeg" alt="RaiDur" /></div>
          <div className="recibo-empresa">
            <div className="recibo-empresa-nombre">Raíces Duranguenses</div>
            <div className="recibo-doc">Recibo de gasto</div>
          </div>
          <div className="recibo-folio">No. {mov.id}</div>
        </div>

        <table className="recibo-tabla">
          <tbody>
            <tr><th>Fecha</th><td>{fecha(mov.fecha)}</td></tr>
            <tr><th>Responsable</th><td>{mov.responsable || '________________________________'}</td></tr>
            <tr><th>Concepto</th><td>{mov.concepto}{mov.categoria && mov.categoria !== '—' ? ` (${mov.categoria})` : ''}</td></tr>
            <tr><th>Cantidad</th><td className="recibo-monto">{money(mov.monto)}</td></tr>
          </tbody>
        </table>

        <div className="recibo-letra">Cantidad con letra: <strong>{numeroALetras(mov.monto)}</strong></div>

        <div className="recibo-firmas">
          <div><div className="linea"></div>Entregó</div>
          <div><div className="linea"></div>Recibió (responsable)</div>
          <div><div className="linea"></div>Autorizó</div>
        </div>
      </div>
    </div>,
    document.body
  );
}
