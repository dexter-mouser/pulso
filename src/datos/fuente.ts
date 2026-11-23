import type { Ajustes, Colecciones, DatosNegocio, Miembro, NombreColeccion, Venta } from '../tipos/negocio';

// Puerto: cualquier origen de datos (local o Supabase) cumple este contrato
export interface FuenteDatos {
  modo: 'local' | 'supabase';
  // true si el servidor guarda el registro de cambios (triggers): el cliente no debe escribirlo
  registraCambiosEnServidor: boolean;
  cargar(): Promise<DatosNegocio>;
  guardar<C extends NombreColeccion>(coleccion: C, registro: Colecciones[C]): Promise<void>;
  borrar(coleccion: NombreColeccion, id: string): Promise<void>;
  guardarAjustes(ajustes: Ajustes): Promise<void>;
  // Asigna el número, ajusta el stock y guarda la venta en una sola operación; devuelve la venta final
  registrarVenta(venta: Omit<Venta, 'numero'>): Promise<Venta>;
  // Borra la venta y devuelve el stock de sus productos en una sola operación
  borrarVenta(venta: Venta): Promise<void>;
}

export function crearId(): string {
  return crypto.randomUUID();
}

export function crearAdministradorInicial(): Miembro {
  return { id: crearId(), nombre: 'Administrador', correo: '', rol: 'administrador', creadoEn: new Date().toISOString() };
}

// Supabase se activa solo si existen las dos claves en .env
export function hayConfiguracionSupabase(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}
