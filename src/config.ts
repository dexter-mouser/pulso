import type { Ajustes, CategoriaGasto, IdVista, MetodoPago, Rol, TipoArticulo } from './tipos/negocio';

// Valores generales de la aplicación
export const NOMBRE_APP = 'pulso';
export const VISTA_INICIAL: IdVista = 'resumen';
export const LOCALE = 'es-ES';
export const PREFIJO_ALMACEN = 'pulso:';

export const AJUSTES_INICIALES: Ajustes = {
  nombre: 'Mi negocio',
  moneda: 'USD',
  impuesto: 0,
};

export const MONEDAS = ['USD', 'EUR', 'COP', 'MXN', 'ARS', 'CLP', 'PEN'] as const;

// Etiquetas visibles
export const ETIQUETAS_ROL: Record<Rol, string> = {
  administrador: 'Administrador',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
  contador: 'Contador',
};

export const DESCRIPCION_ROL: Record<Rol, string> = {
  administrador: 'Acceso total, incluidos roles y ajustes.',
  gerente: 'Todo excepto roles y ajustes del negocio.',
  vendedor: 'Ventas y clientes. Consulta el catálogo.',
  contador: 'Gastos y reportes. Consulta el resto.',
};

export const ETIQUETAS_TIPO: Record<TipoArticulo, string> = {
  producto: 'Producto',
  servicio: 'Servicio',
};

export const ETIQUETAS_METODO: Record<MetodoPago, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  otro: 'Otro',
};

export const ETIQUETAS_CATEGORIA: Record<CategoriaGasto, string> = {
  insumos: 'Insumos',
  servicios: 'Servicios',
  nomina: 'Nómina',
  alquiler: 'Alquiler',
  marketing: 'Marketing',
  otros: 'Otros',
};
