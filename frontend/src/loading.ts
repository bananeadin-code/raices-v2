// Bus simple para saber si hay peticiones en curso (barra de carga global).
let inflight = 0;
const listeners = new Set<(n: number) => void>();

function emit() { listeners.forEach((l) => l(inflight)); }

export const loading = {
  inc() { inflight++; emit(); },
  dec() { inflight = Math.max(0, inflight - 1); emit(); },
  sub(fn: (n: number) => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
};
