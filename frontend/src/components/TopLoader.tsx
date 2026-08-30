import { useEffect, useState } from 'react';
import { loading } from '../loading';

// Barra de carga fina en la parte superior mientras hay peticiones en curso.
export function TopLoader() {
  const [activo, setActivo] = useState(false);
  useEffect(() => loading.sub((n) => setActivo(n > 0)), []);
  return <div className={`top-loader ${activo ? 'activo' : ''}`} />;
}
