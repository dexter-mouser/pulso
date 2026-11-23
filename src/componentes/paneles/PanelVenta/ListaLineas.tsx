import { ETIQUETAS_TIPO } from '../../../config';
import { useFormateadorMoneda } from '../../../hooks/useFormateadorMoneda';
import type { LineaVenta } from '../../../tipos/negocio';
import { Icono } from '../../Icono/Icono';
import estilos from './PanelVenta.module.css';

interface PropiedadesListaLineas {
  lineas: LineaVenta[];
  // Sin botones ni campos: solo lectura de las líneas
  bloqueadas: boolean;
  esNueva: boolean;
  limiteDe: (idArticulo: string) => number;
  onCambiar: (idArticulo: string, cambios: Partial<LineaVenta>) => void;
  onQuitar: (idArticulo: string) => void;
}

// Líneas de la venta, editables mientras la venta es nueva
export function ListaLineas({ lineas, bloqueadas, esNueva, limiteDe, onCambiar, onQuitar }: PropiedadesListaLineas) {
  const formatearMoneda = useFormateadorMoneda();

  function cambiarCantidad(linea: LineaVenta, cantidad: number) {
    if (cantidad < 1) return;
    onCambiar(linea.articuloId, { cantidad: Math.floor(cantidad) });
  }

  if (lineas.length === 0) return <p className="campo-ayuda">Aún no hay artículos en esta venta.</p>;

  return (
    <ul className={estilos.lista}>
      {lineas.map((linea) => (
        <li key={linea.articuloId} className={estilos.linea}>
          <div className={estilos.nombre}>
            <span>{linea.nombre}</span>
            <span className="campo-ayuda">{ETIQUETAS_TIPO[linea.tipo]}</span>
          </div>
          {bloqueadas ? (
            <span className={`${estilos.detalle} texto-secundario`}>{linea.cantidad} × {formatearMoneda(linea.precio)}</span>
          ) : (
            <div className={estilos.edicion}>
              <div className={estilos.cantidad}>
                <button type="button" className="boton-icono boton-mini" aria-label={`Quitar una unidad de ${linea.nombre}`} onClick={() => cambiarCantidad(linea, linea.cantidad - 1)} disabled={linea.cantidad <= 1}>
                  <Icono nombre="menos" tamano="pequeno" />
                </button>
                <output className="monto">
                  {linea.cantidad}
                  <span className="solo-lector"> unidades de {linea.nombre}</span>
                </output>
                <button type="button" className="boton-icono boton-mini" aria-label={`Sumar una unidad de ${linea.nombre}`} onClick={() => cambiarCantidad(linea, linea.cantidad + 1)}>
                  <Icono nombre="mas" tamano="pequeno" />
                </button>
              </div>
              <input
                type="number"
                min={0}
                step="any"
                className={`control ${estilos.precio}`}
                aria-label={`Precio unitario de ${linea.nombre}`}
                value={linea.precio}
                onChange={(e) => onCambiar(linea.articuloId, { precio: Number(e.target.value) })}
              />
            </div>
          )}
          <span className={`monto ${estilos.subtotal}`}>{formatearMoneda(linea.cantidad * linea.precio)}</span>
          {!bloqueadas && (
            <button type="button" className="boton-icono boton-mini" aria-label={`Quitar ${linea.nombre} de la venta`} onClick={() => onQuitar(linea.articuloId)}>
              <Icono nombre="basura" tamano="pequeno" />
            </button>
          )}
          {esNueva && linea.cantidad > limiteDe(linea.articuloId) && (
            <p className={`campo-error ${estilos.aviso}`} role="alert">Supera el stock disponible ({limiteDe(linea.articuloId)}).</p>
          )}
        </li>
      ))}
    </ul>
  );
}
