import { ReactNode, useState } from 'react';
import { createPortal } from 'react-dom';
import { getAllRows } from '../api/client';
import { useToast } from './Toast';

export interface ColReporte<T> {
  header: string;
  get: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  ancho?: string; // ej. '90px' para columnas angostas
}

// Hoja de reporte imprimible: tabla estructurada, encabezados que se repiten en
// cada página y sin cortar textos. Se imprime o se guarda como PDF (Ctrl+P).
export function ReportePrint<T>({
  titulo, columnas, rows, onClose, orientacion = 'landscape',
}: {
  titulo: string;
  columnas: ColReporte<T>[];
  rows: T[];
  onClose: () => void;
  orientacion?: 'portrait' | 'landscape';
}) {
  const generado = new Date().toLocaleString('es-MX');
  return createPortal(
    <div className="reporte-overlay">
      {/* @page controla la orientación solo mientras este reporte está montado */}
      <style>{`@media print { @page { size: A4 ${orientacion}; margin: 12mm; } }`}</style>
      <div className="reporte-actions">
        <button className="primario" onClick={() => window.print()}>Imprimir / Guardar PDF</button>
        <button onClick={onClose}>Cerrar</button>
      </div>

      <div className="reporte-hoja">
        <div className="reporte-head">
          <div>
            <div className="reporte-empresa">Raíces Duranguenses</div>
            <div className="reporte-titulo">{titulo}</div>
          </div>
          <div className="reporte-meta">
            <div>Generado: {generado}</div>
            <div>Registros: {rows.length}</div>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="reporte-vacio">Sin registros para mostrar.</p>
        ) : (
          <table className="reporte-tabla">
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: 'right' }}>#</th>
                {columnas.map((c) => (
                  <th key={c.header} style={{ textAlign: c.align ?? 'left', width: c.ancho }}>{c.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ textAlign: 'right', color: '#888' }}>{i + 1}</td>
                  {columnas.map((c) => (
                    <td key={c.header} style={{ textAlign: c.align ?? 'left' }}>{c.get(r)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>,
    document.body
  );
}

// Botón autónomo: trae todos los registros del endpoint y abre el reporte.
export function BotonReporte<T>({
  titulo, path, columnas, orientacion,
}: {
  titulo: string;
  path: string;
  columnas: ColReporte<T>[];
  orientacion?: 'portrait' | 'landscape';
}) {
  const toast = useToast();
  const [rows, setRows] = useState<T[] | null>(null);
  const [cargando, setCargando] = useState(false);
  async function abrir() {
    setCargando(true);
    try { setRows(await getAllRows<T>(path)); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo generar el reporte'); }
    finally { setCargando(false); }
  }
  return (
    <>
      <button onClick={abrir} disabled={cargando}>{cargando ? 'Generando…' : 'Exportar PDF'}</button>
      {rows && <ReportePrint titulo={titulo} columnas={columnas} rows={rows} orientacion={orientacion} onClose={() => setRows(null)} />}
    </>
  );
}
