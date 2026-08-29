import { ReactNode } from 'react';

interface Props {
  abierto: boolean;
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
  onGuardar?: () => void;
  ancho?: number; // ancho opcional en px (por defecto 420)
}

// Modal reutilizable para altas/ediciones.
// No se cierra al hacer clic fuera (para evitar cierres por error de dedo):
// solo se cierra con el botón "Cancelar" o la "×".
export function Modal({ abierto, titulo, onCerrar, children, onGuardar, ancho }: Props) {
  if (!abierto) return null;
  return (
    <div className="modal-overlay">
      <div className="modal" style={ancho ? { width: ancho } : undefined}>
        <div className="modal-header">
          <h3>{titulo}</h3>
          <button onClick={onCerrar}>×</button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          <button onClick={onCerrar}>Cancelar</button>
          {onGuardar && <button className="primario" onClick={onGuardar}>Guardar</button>}
        </div>
      </div>
    </div>
  );
}
