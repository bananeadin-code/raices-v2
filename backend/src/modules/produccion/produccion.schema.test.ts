import { describe, it, expect } from 'vitest';
import { produccionCreate } from './produccion.schema';

describe('produccionCreate', () => {
  it('acepta una producción válida', () => {
    const r = produccionCreate.safeParse({ sucursal_id: 1, articulo_id: 2, cantidad: 5 });
    expect(r.success).toBe(true);
  });

  it('rechaza cantidad no positiva', () => {
    expect(produccionCreate.safeParse({ sucursal_id: 1, articulo_id: 2, cantidad: 0 }).success).toBe(false);
    expect(produccionCreate.safeParse({ sucursal_id: 1, articulo_id: 2, cantidad: -3 }).success).toBe(false);
  });

  it('rechaza ids inválidos', () => {
    expect(produccionCreate.safeParse({ sucursal_id: 0, articulo_id: 2, cantidad: 1 }).success).toBe(false);
  });
});
