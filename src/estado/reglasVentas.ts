import { crearId } from '../datos/fuente';
import type { Ajustes, Articulo, LineaVenta, Venta } from '../tipos/negocio';
import { calcularTotales } from '../utilidades/calculos';

// Reglas de ventas y stock sin React ni acceso a datos

export type NuevaVenta = Pick<Venta, 'clienteId' | 'estado' | 'metodoPago' | 'notas'> & { lineas: LineaVenta[] };

// Junta las líneas del mismo artículo sumando cantidades (conserva el primer precio)
export function agruparLineas(lineas: LineaVenta[]): LineaVenta[] {
  const porArticulo = new Map<string, LineaVenta>();
  for (const linea of lineas) {
    const previa = porArticulo.get(linea.articuloId);
    porArticulo.set(linea.articuloId, previa ? { ...previa, cantidad: previa.cantidad + linea.cantidad } : { ...linea });
  }
  return [...porArticulo.values()];
}

// Devuelve el motivo por el que las líneas no se pueden vender, o null si todo está bien
export function buscarErrorEnLineas(lineas: LineaVenta[], articulos: Articulo[]): string | null {
  if (lineas.length === 0) return 'Agrega al menos un artículo.';
  for (const linea of lineas) {
    if (!Number.isInteger(linea.cantidad) || linea.cantidad <= 0) return 'La cantidad debe ser un número entero mayor que cero.';
    if (!Number.isFinite(linea.precio) || linea.precio < 0) return 'El precio no puede ser negativo.';
  }
  for (const linea of agruparLineas(lineas)) {
    const articulo = articulos.find((item) => item.id === linea.articuloId);
    if (!articulo) return 'Uno de los artículos ya no existe.';
    if (articulo.tipo === 'producto' && articulo.stock < linea.cantidad) return `No hay stock suficiente de «${articulo.nombre}».`;
  }
  return null;
}

// Venta lista para guardar: líneas agrupadas, importes con el impuesto del negocio y sin número
export function prepararVenta(nueva: NuevaVenta, ajustes: Ajustes, vendedorId: string): Omit<Venta, 'numero'> {
  const lineas = agruparLineas(nueva.lineas);
  return {
    ...nueva,
    ...calcularTotales(lineas, ajustes.impuesto),
    lineas,
    id: crearId(),
    impuestoPorcentaje: ajustes.impuesto,
    fecha: new Date().toISOString(),
    vendedorId,
  };
}

// Descuenta (signo -1) o devuelve (signo 1) el stock de los productos de las líneas
export function moverStock(articulos: Articulo[], lineas: LineaVenta[], signo: 1 | -1): Articulo[] {
  return articulos.map((articulo) => {
    if (articulo.tipo !== 'producto') return articulo;
    const cantidad = lineas
      .filter((linea) => linea.articuloId === articulo.id)
      .reduce((suma, linea) => suma + linea.cantidad, 0);
    return cantidad ? { ...articulo, stock: articulo.stock + signo * cantidad } : articulo;
  });
}
