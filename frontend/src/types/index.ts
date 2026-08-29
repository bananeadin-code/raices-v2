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
  activo: number;
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
