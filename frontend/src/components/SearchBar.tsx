import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

// Buscador con debounce. Llama onBuscar 300ms después de dejar de teclear.
export function SearchBar({ onBuscar, placeholder = 'Buscar...' }: { onBuscar: (q: string) => void; placeholder?: string }) {
  const [v, setV] = useState('');
  const t = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    clearTimeout(t.current);
    t.current = setTimeout(() => onBuscar(v.trim()), 300);
    return () => clearTimeout(t.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);
  return (
    <div className="searchbar">
      <Icon name="search" size={16} />
      <input placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)} />
    </div>
  );
}
