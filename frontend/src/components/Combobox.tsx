import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

// Select con buscador integrado. El panel se renderiza con un portal en document.body
// y se posiciona con coordenadas fijas, para que NUNCA lo recorte el overflow de un modal.
export function Combobox({ opciones, value, onChange, placeholder = 'Selecciona...', vacioLabel, disabled }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState('');
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number }>({ left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const actual = String(value ?? '');
  const seleccionada = opciones.find((o) => String(o.value) === actual);
  const filtradas = q
    ? opciones.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()))
    : opciones;

  function calcular() {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const maxH = 300; // altura aproximada del panel
    const espacioAbajo = window.innerHeight - r.bottom;
    const arriba = espacioAbajo < maxH && r.top > espacioAbajo;
    setPos({
      left: r.left,
      width: r.width,
      top: arriba ? undefined : r.bottom + 4,
      bottom: arriba ? window.innerHeight - r.top + 4 : undefined,
    });
  }

  function abrir() { if (disabled) return; calcular(); setAbierto(true); }

  useEffect(() => {
    if (!abierto) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setAbierto(false);
    }
    function reposicionar() { calcular(); }
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('resize', reposicionar);
    window.addEventListener('scroll', reposicionar, true); // captura el scroll del modal también
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('resize', reposicionar);
      window.removeEventListener('scroll', reposicionar, true);
    };
  }, [abierto]);

  function seleccionar(v: string) { onChange(v); setAbierto(false); setQ(''); }

  return (
    <div className="combobox">
      <button type="button" ref={triggerRef} className="combobox-trigger" disabled={disabled}
        onClick={() => (abierto ? setAbierto(false) : abrir())}>
        <span className={seleccionada ? '' : 'combobox-placeholder'}>
          {seleccionada ? seleccionada.label : placeholder}
        </span>
        <Icon name="chevronDown" size={16} />
      </button>

      {abierto && createPortal(
        <div ref={panelRef} className="combobox-panel"
          style={{ position: 'fixed', left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom }}>
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
        </div>,
        document.body
      )}
    </div>
  );
}
