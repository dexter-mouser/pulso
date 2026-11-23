import type { Modulo, Nivel, Rol } from './tipos/negocio';

// Permisos fijos por rol (la base de datos de Supabase aplica las mismas reglas)
const PERMISOS: Record<Rol, Record<Modulo, Nivel>> = {
  administrador: {
    resumen: 'ver', ventas: 'editar', productos: 'editar', clientes: 'editar', gastos: 'editar',
    reportes: 'ver', roles: 'editar', registro: 'ver', ajustes: 'editar',
  },
  gerente: {
    resumen: 'ver', ventas: 'editar', productos: 'editar', clientes: 'editar', gastos: 'editar',
    reportes: 'ver', roles: 'ninguno', registro: 'ver', ajustes: 'ninguno',
  },
  vendedor: {
    resumen: 'ver', ventas: 'editar', productos: 'ver', clientes: 'editar', gastos: 'ninguno',
    reportes: 'ninguno', roles: 'ninguno', registro: 'ninguno', ajustes: 'ninguno',
  },
  contador: {
    resumen: 'ver', ventas: 'ver', productos: 'ver', clientes: 'ver', gastos: 'editar',
    reportes: 'ver', roles: 'ninguno', registro: 'ninguno', ajustes: 'ninguno',
  },
};

export function puedeVer(rol: Rol, modulo: Modulo): boolean {
  return PERMISOS[rol][modulo] !== 'ninguno';
}

export function puedeEditar(rol: Rol, modulo: Modulo): boolean {
  return PERMISOS[rol][modulo] === 'editar';
}
