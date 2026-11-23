import { useId, useRef, useState } from 'react';
import { ETIQUETAS_TIPO } from '../../../config';
import { useFormateadorMoneda } from '../../../hooks/useFormateadorMoneda';
import type { Articulo, LineaVenta } from '../../../tipos/negocio';
import { Icono } from '../../Icono/Icono';
import estilos from './PanelVenta.module.css';

const CANTIDAD_INICIAL = '1';

type CampoLinea = 'articulo' | 'cantidad';

interface PropiedadesAgregarLinea {
  articulos: Articulo[];
  lineas: LineaVenta[];
  // Stock máximo vendible de un artículo (sin límite para servicios)
  limiteDe: (idArticulo: string) => number;
  onAgregar: (articulo: Articulo, cantidad: number) => void;
}

// Selector de artículo y cantidad para añadir una línea a la venta
export function AgregarLinea({ articulos, lineas, limiteDe, onAgregar }: PropiedadesAgregarLinea) {
  const formatearMoneda = useFormateadorMoneda();
  const idBase = useId();
  const refs = { articulo: useRef<HTMLSelectElement>(null), cantidad: useRef<HTMLInputElement>(null) };
  const [articuloId, setArticuloId] = useState('');
  const [cantidadNueva, setCantidadNueva] = useState(CANTIDAD_INICIAL);
  const [error, setError] = useState<{ campo: CampoLinea; texto: string } | null>(null);

  function textoArticulo(articulo: Articulo): string {
    const stock = articulo.tipo === 'producto' ? ` · Stock ${articulo.stock}` : '';
    return `${articulo.nombre} (${ETIQUETAS_TIPO[articulo.tipo]}) · ${formatearMoneda(articulo.precio)}${stock}`;
  }

  function fallar(campo: CampoLinea, texto: string) {
    setError({ campo, texto });
    refs[campo].current?.focus();
  }

  function agregar() {
    const articulo = articulos.find((item) => item.id === articuloId);
    const cantidad = Math.floor(Number(cantidadNueva));
    if (!articulo) return fallar('articulo', 'Elige un artículo para agregar.');
    if (!Number.isFinite(cantidad) || cantidad < 1) return fallar('cantidad', 'La cantidad debe ser al menos 1.');
    const existente = lineas.find((linea) => linea.articuloId === articulo.id);
    if (cantidad + (existente?.cantidad ?? 0) > limiteDe(articulo.id)) {
      return fallar('cantidad', `Solo quedan ${articulo.stock} unidades de «${articulo.nombre}».`);
    }

    setError(null);
    onAgregar(articulo, cantidad);
    setArticuloId('');
    setCantidadNueva(CANTIDAD_INICIAL);
  }

  const atributos = (campo: CampoLinea) => ({
    id: `${idBase}-${campo}`,
    'aria-invalid': error?.campo === campo ? true : undefined,
    'aria-describedby': error?.campo === campo ? `${idBase}-${campo}-error` : undefined,
  });
  const mensaje = (campo: CampoLinea) =>
    error?.campo === campo ? <p id={`${idBase}-${campo}-error`} className="campo-error">{error.texto}</p> : null;

  return (
    <div className={estilos.agregar}>
      <div className="campo">
        <label className="campo-etiqueta" htmlFor={`${idBase}-articulo`}>Artículo</label>
        <select ref={refs.articulo} {...atributos('articulo')} className="control" value={articuloId} onChange={(e) => setArticuloId(e.target.value)}>
          <option value="">Elige un artículo…</option>
          {articulos.map((articulo) => (
            <option key={articulo.id} value={articulo.id} disabled={articulo.tipo === 'producto' && articulo.stock <= 0}>
              {textoArticulo(articulo)}
            </option>
          ))}
        </select>
        {mensaje('articulo')}
      </div>
      <div className={`campo ${estilos.cantidadNueva}`}>
        <label className="campo-etiqueta" htmlFor={`${idBase}-cantidad`}>Cantidad</label>
        <input ref={refs.cantidad} {...atributos('cantidad')} type="number" min={1} step={1} className="control" value={cantidadNueva} onChange={(e) => setCantidadNueva(e.target.value)} />
        {mensaje('cantidad')}
      </div>
      <button type="button" className="boton boton-secundario" onClick={agregar}>
        <Icono nombre="mas" tamano="pequeno" />
        Agregar
      </button>
    </div>
  );
}
