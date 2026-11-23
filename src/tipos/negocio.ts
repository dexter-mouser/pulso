// Vistas (pestañas)
export type IdVista = 'resumen' | 'ventas' | 'productos' | 'clientes' | 'gastos' | 'reportes';

export interface Pestana {
  id: IdVista;
  etiqueta: string;
  conteo: number;
  tono?: 'amarillo';
}

// Roles y permisos
export type Rol = 'administrador' | 'gerente' | 'vendedor' | 'contador';
export type Modulo = IdVista | 'roles' | 'registro' | 'ajustes';
export type Nivel = 'ninguno' | 'ver' | 'editar';

// Ajustes del negocio
export interface Ajustes {
  nombre: string;
  moneda: string;
  impuesto: number;
}

// Equipo
export interface Miembro {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  creadoEn: string;
}

// Catálogo: productos con stock y servicios sin stock
export type TipoArticulo = 'producto' | 'servicio';

export interface Articulo {
  id: string;
  tipo: TipoArticulo;
  nombre: string;
  precio: number;
  costo: number;
  stock: number;
  stockMinimo: number;
  creadoEn: string;
}

// Clientes
export interface Cliente {
  id: string;
  nombre: string;
  correo: string;
  telefono: string;
  notas: string;
  creadoEn: string;
}

// Ventas
export type EstadoVenta = 'pagada' | 'pendiente';
export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia' | 'otro';

export interface LineaVenta {
  articuloId: string;
  nombre: string;
  tipo: TipoArticulo;
  cantidad: number;
  precio: number;
}

export interface Venta {
  id: string;
  numero: number;
  clienteId: string | null;
  lineas: LineaVenta[];
  impuestoPorcentaje: number;
  subtotal: number;
  impuesto: number;
  total: number;
  estado: EstadoVenta;
  metodoPago: MetodoPago;
  notas: string;
  fecha: string;
  vendedorId: string;
}

// Gastos
export type CategoriaGasto = 'insumos' | 'servicios' | 'nomina' | 'alquiler' | 'marketing' | 'otros';

export interface Gasto {
  id: string;
  concepto: string;
  categoria: CategoriaGasto;
  monto: number;
  fecha: string;
  metodoPago: MetodoPago;
  notas: string;
  creadoEn: string;
}

// Registro de cambios
export type AccionCambio = 'crear' | 'editar' | 'borrar';

export interface Cambio {
  id: string;
  fecha: string;
  miembroId: string;
  miembroNombre: string;
  modulo: Modulo;
  accion: AccionCambio;
  entidadId: string;
  descripcion: string;
  antes: Record<string, unknown> | null;
  despues: Record<string, unknown> | null;
}

// Conjunto de datos del negocio
export interface Colecciones {
  articulos: Articulo;
  clientes: Cliente;
  ventas: Venta;
  gastos: Gasto;
  miembros: Miembro;
  cambios: Cambio;
}

export type NombreColeccion = keyof Colecciones;

export type DatosNegocio = { ajustes: Ajustes } & { [C in NombreColeccion]: Colecciones[C][] };
