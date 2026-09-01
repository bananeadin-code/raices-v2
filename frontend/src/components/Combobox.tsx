import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

export interface Opcion { value: string | number; label: string; }

interface Props {
  opciones: Opcion[];
  value: string | number | null | undefined;
  onChange: (value: string) => void; // devuelve el value como texto ('' = limpiado)
  placeholder?: string;
  vacioLabel?: string; // si se define, muestra una opción para limpiar la selección
  disabled?: boolean;
}

// Select con buscador integrado: filtra al teclear, scroll propio, cierra al hacer clic fuera.
export function Combobox({ opciones, value, onChange, placeholder = 'Selecciona...', vacioLabel, disabled }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const actual = String(value ?? '');
  const seleccionada = opciones.find((o) => String(o.value) === actual);
  const filtradas = q
    ? opciones.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()))
    : opciones;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function seleccionar(v: string) { onChange(v); setAbierto(false); setQ(''); }

  return (
    <div className="combobox" ref={ref}>
      <button type="button" className="combobox-trigger" disabled={disabled}
        onClick={() => setAbierto((a) => !a)}>
        <span className={seleccionada ? '' : 'combobox-placeholder'}>
          {seleccionada ? seleccionada.label : placeholder}
        </span>
        <Icon name="chevronDown" size={16} />
      </button>

      {abierto && (
        <div className="combobox-panel">
          <div className="combobox-search">
            <Icon name="search" size={14} />
            <input autoFocus placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="combobox-list">
            {vacioLabel && (
              <div className="combobox-opt" onClick={() => seleccionar('')}>{vacioLabel}</div>
            )}
            {filtradas.map((o) => (
              <div key={o.value}
                className={`combobox-opt ${String(o.value) === actual ? 'activa' : ''}`}
                onClick={() => seleccionar(String(o.value))}>
                {o.label}
              </div>
            ))}
            {filtradas.length === 0 && <div className="combobox-vacio">Sin resultados</div>}
          </div>
        </div>
      )}
    </div>
  );
}
