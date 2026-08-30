import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

interface ToastItem { id: number; tipo: 'exito' | 'error'; msg: string; }
interface ToastApi { exito: (m: string) => void; error: (m: string) => void; }

const Ctx = createContext<ToastApi | undefined>(undefined);
let seq = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((tipo: 'exito' | 'error', msg: string) => {
    const id = seq++;
    setItems((x) => [...x, { id, tipo, msg }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 3500);
  }, []);

  const api: ToastApi = {
    exito: (m) => push('exito', m),
    error: (m) => push('error', m),
  };

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="toast-wrap">
        {items.map((t) => <div key={t.id} className={`toast toast-${t.tipo}`}>{t.msg}</div>)}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useToast debe usarse dentro de ToastProvider');
  return c;
}
