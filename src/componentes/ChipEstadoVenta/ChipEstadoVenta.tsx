import type { EstadoVenta } from '../../tipos/negocio';

const TEXTOS: Record<EstadoVenta, string> = { pagada: 'Pagada', pendiente: 'Pendiente' };
const CLASES: Record<EstadoVenta, string> = { pagada: 'chip chip-verde', pendiente: 'chip chip-amarillo' };

// Etiqueta de estado de una venta
export function ChipEstadoVenta({ estado }: { estado: EstadoVenta }) {
  return <span className={CLASES[estado]}>{TEXTOS[estado]}</span>;
}
