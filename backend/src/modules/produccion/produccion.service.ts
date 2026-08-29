import { query, withTransaction } from '../../db/pool';
import { ApiError } from '../../utils/http';
import { aplicarMovimiento, siguienteFolio, ajustarReservado } from '../inventario/inventario.service';
import { ProduccionCreate } from './produccion.schema';
import { paged, PageParams } from '../../utils/pagination';

type Estado = 'en_espera' | 'en_progreso' | 'terminado' | 'cancelado';

export async function listar(p: PageParams) {
  return paged({
    select: `p.id, p.folio, p.fecha, p.cantidad, p.estado, p.observaciones, p.articulo_id, p.sucursal_id,
             a.nombre AS articulo, s.nombre AS sucursal, u.nombre AS usuario`,
    from: `producciones p JOIN articulos a ON a.id = p.articulo_id JOIN sucursales s ON s.id = p.sucursal_id LEFT JOIN usuarios u ON u.id = p.usuario_id`,
    search: { col: 'a.nombre', q: p.q },
    order: 'p.fecha DESC, p.id DESC',
    page: p.page, pageSize: p.pageSize,
  });
}

// Consumo por materia = cantidad de receta * cantidad a producir
async function lineasReceta(articuloId: number, cantidadProd: number) {
  const receta = await query<any>('SELECT materia_id, cantidad FROM articulo_receta WHERE articulo_id = ?', [articuloId]);
  return receta.map((r: any) => ({ materia_id: r.materia_id as number, cantidad: Number(r.cantidad) * cantidadProd }));
}

// Crea la orden en 'en_espera' y RESERVA la materia (no la consume todavía).
export async function crear(data: ProduccionCreate, usuarioId: number) {
  const arts = await query<any>('SELECT id, es_producible FROM articulos WHERE id = ? AND activo = 1', [data.articulo_id]);
  if (!arts[0]) throw new ApiError(404, 'Artículo no encontrado.');
  if (!arts[0].es_producible) throw new ApiError(422, 'El artículo no está marcado como producible.');

  const lineas = await lineasReceta(data.articulo_id, data.cantidad);
  if (lineas.length === 0) throw new ApiError(422, 'El artículo no tiene receta definida. Agrégala antes de producir.');

  return withTransaction(async (cx) => {
    // Valida disponible (cantidad - reservado) de cada materia antes de reservar
    for (const l of lineas) {
      const [ex]: any = await cx.query(
        'SELECT cantidad, reservado FROM existencias WHERE sucursal_id = ? AND materia_id = ?', [data.sucursal_id, l.materia_id]);
      const disp = ex.length ? Number(ex[0].cantidad) - Number(ex[0].reservado) : 0;
      if (disp < l.cantidad) {
        const m = await query<any>('SELECT nombre FROM materias WHERE id = ?', [l.materia_id]);
        throw new ApiError(422, `Materia insuficiente: "${m[0]?.nombre ?? l.materia_id}" (disponible ${disp}, se requieren ${l.cantidad}).`);
      }
    }

    const folio = await siguienteFolio(cx, data.sucursal_id, 'produccion');
    const [res]: any = await cx.query(
      `INSERT INTO producciones (folio, sucursal_id, articulo_id, cantidad, estado, usuario_id, observaciones)
       VALUES (?, ?, ?, ?, 'en_espera', ?, ?)`,
      [folio, data.sucursal_id, data.articulo_id, data.cantidad, usuarioId, data.observaciones ?? null]);
    const id = res.insertId;

    // Guarda las líneas (snapshot) y reserva la materia
    for (const l of lineas) {
      await cx.query('INSERT INTO produccion_materias (produccion_id, materia_id, cantidad) VALUES (?, ?, ?)', [id, l.materia_id, l.cantidad]);
      await ajustarReservado(cx, data.sucursal_id, 'materia', l.materia_id, l.cantidad);
    }
    return { id, folio, estado: 'en_espera' as Estado };
  });
}

const TRANSICIONES: Record<Estado, Estado[]> = {
  en_espera: ['en_progreso', 'terminado', 'cancelado'],
  en_progreso: ['terminado', 'cancelado'],
  terminado: [],
  cancelado: [],
};

export async function cambiarEstado(id: number, nuevo: Estado, usuarioId: number) {
  const rows = await query<any>('SELECT * FROM producciones WHERE id = ?', [id]);
  const p = rows[0];
  if (!p) throw new ApiError(404, 'Producción no encontrada.');
  const actual = p.estado as Estado;
  if (!TRANSICIONES[actual].includes(nuevo)) {
    throw new ApiError(422, `No se puede cambiar de "${actual}" a "${nuevo}".`);
  }
  const lineas = await query<any>('SELECT materia_id, cantidad FROM produccion_materias WHERE produccion_id = ?', [id]);

  return withTransaction(async (cx) => {
    if (nuevo === 'en_progreso') {
      // La materia sigue reservada; solo cambia el estado.
    } else if (nuevo === 'cancelado') {
      // Libera la reserva de materia (no se consume nada).
      for (const l of lineas) {
        await ajustarReservado(cx, p.sucursal_id, 'materia', l.materia_id, -Number(l.cantidad));
      }
    } else if (nuevo === 'terminado') {
      // Libera reserva, consume materia física y da de alta el producto.
      for (const l of lineas) {
        await ajustarReservado(cx, p.sucursal_id, 'materia', l.materia_id, -Number(l.cantidad));
        await aplicarMovimiento(cx, {
          sucursal_id: p.sucursal_id, materia_id: l.materia_id, cantidad: -Number(l.cantidad),
          tipo: 'prod_consumo', referencia_tipo: 'produccion', referencia_id: id, usuario_id: usuarioId,
        });
      }
      await aplicarMovimiento(cx, {
        sucursal_id: p.sucursal_id, articulo_id: p.articulo_id, cantidad: Number(p.cantidad),
        tipo: 'prod_alta', referencia_tipo: 'produccion', referencia_id: id, usuario_id: usuarioId,
      });
    }
    await cx.query('UPDATE producciones SET estado = ? WHERE id = ?', [nuevo, id]);
    return { id, estado: nuevo };
  });
}
