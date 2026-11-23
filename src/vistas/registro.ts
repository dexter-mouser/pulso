import type { ComponentType } from 'react';
import type { IdVista } from '../tipos/negocio';
import { Clientes } from './Clientes/Clientes';
import { Gastos } from './Gastos/Gastos';
import { Productos } from './Productos/Productos';
import { Reportes } from './Reportes/Reportes';
import { Resumen } from './Resumen/Resumen';
import { Ventas } from './Ventas/Ventas';

export interface DefinicionVista {
  id: IdVista;
  etiqueta: string;
  componente: ComponentType;
}

// Para agregar una vista: añade su id a IdVista (src/tipos/negocio.ts), sus permisos en src/permisos.ts y regístrala aquí
export const vistas: DefinicionVista[] = [
  { id: 'resumen', etiqueta: 'Resumen', componente: Resumen },
  { id: 'ventas', etiqueta: 'Ventas', componente: Ventas },
  { id: 'productos', etiqueta: 'Productos', componente: Productos },
  { id: 'clientes', etiqueta: 'Clientes', componente: Clientes },
  { id: 'gastos', etiqueta: 'Gastos', componente: Gastos },
  { id: 'reportes', etiqueta: 'Reportes', componente: Reportes },
];
