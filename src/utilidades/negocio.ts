import type { Articulo, Cliente, Venta } from '../tipos/negocio';
import { tieneStockBajo } from './calculos';

// Consultas de negocio que usan varias vistas y paneles

export function nombreCliente(venta: Venta, clientes: Cliente[]): string {
  if (!venta.clienteId) return 'Sin cliente';
  return clientes.find((cliente) => cliente.id === venta.clienteId)?.nombre ?? 'Cliente eliminado';
}

export function cobrosPendientes(ventas: Venta[]): Venta[] {
  return ventas.filter((venta) => venta.estado === 'pendiente');
}

export function articulosConPocoStock(articulos: Articulo[]): Articulo[] {
  return articulos.filter(tieneStockBajo);
}

// Texto en singular o plural: plural(1, 'aviso', 'avisos') → «1 aviso»
export function plural(cantidad: number, singular: string, varios: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : varios}`;
}
