import { describe, it, expect } from 'vitest';
import { readPageParams } from './pagination';

describe('readPageParams', () => {
  it('usa valores por defecto', () => {
    expect(readPageParams({})).toEqual({ q: undefined, page: 1, pageSize: 20 });
  });

  it('limita página y pageSize a valores sanos', () => {
    expect(readPageParams({ page: '-3', pageSize: '9999' })).toEqual({ q: undefined, page: 1, pageSize: 500 });
    // Valor válido por debajo de 1 se sube a 1
    expect(readPageParams({ pageSize: '0.4' }).pageSize).toBe(1);
    // Valor inválido/cero cae al valor por defecto
    expect(readPageParams({ pageSize: '0' }).pageSize).toBe(20);
  });

  it('recorta la búsqueda y trata el vacío como undefined', () => {
    expect(readPageParams({ q: '  hola  ' }).q).toBe('hola');
    expect(readPageParams({ q: '   ' }).q).toBeUndefined();
  });
});
