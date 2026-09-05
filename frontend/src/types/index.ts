export interface Usuario {
  id: number;
  usuario: string;
  rol: string;
  permisos: string[];
}

export interface Cliente {
  id: number;
  nombre: string;
  telefono?: string | null;
  email?: string | null;
  rfc?: string | null;
  ciudad?: string | null;
  limite_credito: number;
  activo: number;
  // Datos fiscales (opcionales)
  razon_social?: string | null;
  regimen_fiscal?: string | null;
  uso_cfdi?: string | null;
  cp_fiscal?: string | null;
  email_fiscal?: string | null;
}

export interface Categoria {
  id: number;
  nombre: string;
  activo: number;
}

export interface Materia {
  id: number;
  codigo?: string | null;
  nombre: string;
  unidad: string;
  costo: number;
  minimo?: number | null;
  activo: number;
}

export interface Articulo {
  id: number;
  sku?: string | null;
  nombre: string;
  categoria_id?: number | null;
  categoria?: string | null;
  precio: number;
  costo: number;
  es_producible: number | boolean;
  minimo?: number | null;
  maximo?: number | null;
  reorden?: number | null;
  garantia_plantilla_id?: number | null;
  garantia?: string | null;
  activo: number;
}

// ---- Garantía / consentimiento de entrega ----
export interface GarantiaPlantilla {
  id: number;
  nombre: string;
  meses_garantia: number;
  descripcion?: string | null;
  activo: number;
  puntos?: string | { texto: string }[] | number; // en lista = conteo; en detalle = arreglo
}
export interface GarantiaDetalle {
  id: number;
  nombre: string;
  meses_garantia: number;
  descripcion?: string | null;
  activo: number;
  puntos: { id: number; texto: string; orden: number }[];
}

// ---- Ventas / POS ----
export interface VentaRow {
  id: number;
  folio: number;
  fecha: string;
  estado: 'pendiente' | 'entregada' | 'cancelada';
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia' | 'credito';
  total: number;
  fecha_vencimiento?: string | null;
  sucursal: string;
  usuario: string;
  cliente: string;
  pagado: number;
  saldo: number;
}
export interface CobranzaRow {
  id: number;
  folio: number;
  fecha: string;
  fecha_vencimiento?: string | null;
  total: number;
  sucursal: string;
  cliente: string;
  pagado: number;
  saldo: number;
  vencida: number;
}
export interface VentaItem {
  id: number;
  articulo_id: number;
  articulo: string;
  sku?: string | null;
  cantidad: number;
  precio_unitario: number;
  importe: number;
}
export interface VentaAbono {
  id: number;
  monto: number;
  metodo: string;
  fecha: string;
  referencia?: string | null;
  usuario: string;
}
export interface VentaGarantia {
  id: number;
  articulo_id?: number | null;
  nombre: string;
  meses_garantia: number;
  descripcion?: string | null;
  articulos_txt?: string | null; // artículo(s) de la nota que cubre esta garantía
  puntos: string[];
}
export interface VentaDetalle extends VentaRow {
  subtotal: number;
  descuento: number;
  observaciones?: string | null;
  // encabezado del negocio (sucursal)
  sucursal_nombre: string;
  calle?: string | null;
  numero?: string | null;
  colonia?: string | null;
  cp?: string | null;
  ciudad?: string | null;
  sucursal_telefono?: string | null;
  // datos del cliente
  cliente_nombre?: string | null;
  cliente_telefono?: string | null;
  cliente_rfc?: string | null;
  cliente_calle?: string | null;
  cliente_numero?: string | null;
  cliente_colonia?: string | null;
  cliente_ciudad?: string | null;
  items: VentaItem[];
  abonos: VentaAbono[];
  garantias: VentaGarantia[];
}

export interface Sucursal {
  id: number;
  nombre: string;
  abreviatura?: string | null;
  tipo: 'tienda' | 'almacen' | 'fabrica' | 'mixto';
  calle?: string | null;
  numero?: string | null;
  colonia?: string | null;
  cp?: string | null;
  ciudad?: string | null;
  telefono?: string | null;
  activo: number;
}

export interface Rol {
  id: number;
  nombre: string;
  descripcion?: string | null;
}

export interface UsuarioRow {
  id: number;
  usuario: string;
  nombre: string;
  apellidos?: string | null;
  email?: string | null;
  telefono?: string | null;
  rol_id: number;
  rol?: string;
  sucursal_id?: number | null;
  sucursal?: string | null;
  activo: number;
}
