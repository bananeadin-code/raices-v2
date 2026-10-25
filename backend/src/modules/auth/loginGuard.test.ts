import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { assertNotLocked, recordFailure, recordSuccess } from './loginGuard';

// Usuario distinto por prueba para no compartir estado (el Map es a nivel módulo).
describe('loginGuard (bloqueo por usuario)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('no bloquea con pocos intentos fallidos', () => {
    for (let i = 0; i < 4; i++) recordFailure('userA');
    expect(() => assertNotLocked('userA')).not.toThrow();
  });

  it('bloquea al 5º intento fallido', () => {
    for (let i = 0; i < 5; i++) recordFailure('userB');
    expect(() => assertNotLocked('userB')).toThrowError(/bloqueada/i);
  });

  it('un login exitoso limpia el contador', () => {
    for (let i = 0; i < 4; i++) recordFailure('userC');
    recordSuccess('userC');
    for (let i = 0; i < 4; i++) recordFailure('userC'); // vuelve a empezar
    expect(() => assertNotLocked('userC')).not.toThrow();
  });

  it('el bloqueo expira tras 10 minutos', () => {
    for (let i = 0; i < 5; i++) recordFailure('userD');
    expect(() => assertNotLocked('userD')).toThrow();
    vi.advanceTimersByTime(10 * 60 * 1000 + 1000); // pasan 10 min
    expect(() => assertNotLocked('userD')).not.toThrow();
  });

  it('es insensible a mayúsculas/espacios en el usuario', () => {
    for (let i = 0; i < 5; i++) recordFailure('  UserE ');
    expect(() => assertNotLocked('usere')).toThrowError(/bloqueada/i);
  });
});
