import type { Articulo, CategoriaGasto, Gasto, LineaVenta, Venta } from '../tipos/negocio';

// Redondeo a 2 decimales para dinero
export function redondear(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function calcularTotales(lineas: LineaVenta[], impuestoPorcentaje: number) {
  const subtotal = redondear(lineas.reduce((suma, linea) => suma + linea.cantidad * linea.precio, 0));
  const impuesto = redondear((subtotal * impuestoPorcentaje) / 100);
  return { subtotal, impuesto, total: redondear(subtotal + impuesto) };
}

// Meses
export function inicioDeMes(fecha: Date, desplazamiento = 0): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth() + desplazamiento, 1);
}

export function estaEnMes(iso: string, mes: Date): boolean {
  const fecha = new Date(iso);
  return fecha.getFullYear() === mes.getFullYear() && fecha.getMonth() === mes.getMonth();
}

export function diasDelMes(mes: Date): number {
  return new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
}

// Inventario
export function tieneStockBajo(articulo: Articulo): boolean {
  return articulo.tipo === 'producto' && articulo.stock <= articulo.stockMinimo;
}

function sumarTotales(ventas: Venta[]): number {
  return redondear(ventas.reduce((suma, venta) => suma + venta.total, 0));
}

// Resumen de un mes
export function resumirMes(ventas: Venta[], gastos: Gasto[], mes: Date) {
  const ventasMes = ventas.filter((venta) => estaEnMes(venta.fecha, mes));
  const gastosMes = gastos.filter((gasto) => estaEnMes(gasto.fecha, mes));
  // Ingresos: solo lo cobrado; lo pendiente va aparte
  const cobradas = ventasMes.filter((venta) => venta.estado === 'pagada');
  const ingresos = sumarTotales(cobradas);
  const porCobrar = sumarTotales(ventasMes.filter((venta) => venta.estado === 'pendiente'));
  const egresos = redondear(gastosMes.reduce((suma, gasto) => suma + gasto.monto, 0));
  return {
    ventas: ventasMes,
    ingresos,
    porCobrar,
    egresos,
    utilidad: redondear(ingresos - egresos),
    ticketPromedio: cobradas.length ? redondear(ingresos / cobradas.length) : 0,
  };
}

// Variación porcentual; null si no hay base para comparar
export function variacion(actual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return Math.round(((actual - anterior) / Math.abs(anterior)) * 100);
}

export function ventasPorDia(ventas: Venta[], mes: Date): number[] {
  const dias = Array.from({ length: diasDelMes(mes) }, () => 0);
  for (const venta of ventas) {
    if (!estaEnMes(venta.fecha, mes)) continue;
    const dia = new Date(venta.fecha).getDate() - 1;
    dias[dia] = redondear(dias[dia] + venta.total);
  }
  return dias;
}

export function articulosMasVendidos(ventas: Venta[], limite: number) {
  const totales = new Map<string, { articuloId: string; nombre: string; cantidad: number; total: number }>();
  for (const venta of ventas) {
    for (const linea of venta.lineas) {
      const previo = totales.get(linea.articuloId) ?? { articuloId: linea.articuloId, nombre: linea.nombre, cantidad: 0, total: 0 };
      previo.cantidad += linea.cantidad;
      previo.total = redondear(previo.total + linea.cantidad * linea.precio);
      totales.set(linea.articuloId, previo);
    }
  }
  return [...totales.values()].sort((a, b) => b.total - a.total).slice(0, limite);
}

export function gastosPorCategoria(gastos: Gasto[]) {
  const totales = new Map<CategoriaGasto, number>();
  for (const gasto of gastos) {
    totales.set(gasto.categoria, redondear((totales.get(gasto.categoria) ?? 0) + gasto.monto));
  }
  return [...totales.entries()].map(([categoria, total]) => ({ categoria, total })).sort((a, b) => b.total - a.total);
}
