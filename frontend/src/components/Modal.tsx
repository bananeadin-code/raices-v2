import { ReactNode, useState } from 'react';

interface Props {
  abierto: boolean;
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
  onGuardar?: () => void | Promise<void>;
  ancho?: number; // ancho opcional en px (por defecto 420)
}

// Modal reutilizable para altas/ediciones.
// No se cierra al hacer clic fuera (para evitar cierres por error de dedo):
// solo se cierra con el botón "Cancelar" o la "×".
// Protección anti doble-registro: mientras "Guardar" está en curso, el botón
// queda deshabilitado y se ignoran clics repetidos (evita duplicados por doble clic).
export function Modal({ abierto, titulo, onCerrar, children, onGuardar, ancho }: Props) {
  const [guardando, setGuardando] = useState(false);
  if (!abierto) return null;

  async function handleGuardar() {
    if (guardando || !onGuardar) return; // ya se está guardando: ignora el clic repetido
    setGuardando(true);
    try {
      await onGuardar();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal" style={ancho ? { width: ancho } : undefined}>
        <div className="modal-header">
          <h3>{titulo}</h3>
          <button onClick={onCerrar} disabled={guardando}>×</button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          <button onClick={onCerrar} disabled={guardando}>Cancelar</button>
          {onGuardar && (
            <button className="primario" onClick={handleGuardar} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
