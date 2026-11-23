import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { debeAnimar } from '../../utilidades/movimiento';
import estilos from './BarrasHorizontales.module.css';

export interface ElementoBarra {
  clave: string;
  etiqueta: string;
  valor: number;
  // Texto a la derecha de la etiqueta (por ejemplo, el total formateado)
  detalle: string;
  // Texto secundario opcional bajo la etiqueta
  nota?: string;
}

interface PropiedadesBarras {
  elementos: ElementoBarra[];
  // Nombre accesible de la lista
  titulo: string;
}

// Lista de barras horizontales proporcionales al mayor valor, con entrada animada
export function BarrasHorizontales({ elementos, titulo }: PropiedadesBarras) {
  const listaRef = useRef<HTMLUListElement>(null);
  const maximo = Math.max(...elementos.map((elemento) => elemento.valor), 0);
  const firma = elementos.map((elemento) => `${elemento.clave}:${elemento.valor}`).join('|');

  useGSAP(
    () => {
      const lista = listaRef.current;
      if (!lista || !debeAnimar()) return;
      gsap.fromTo(
        lista.querySelectorAll('[data-barra]'),
        { scaleX: 0 },
        { scaleX: 1, duration: 0.6, stagger: 0.06, ease: 'power3.out', transformOrigin: 'left', clearProps: 'transform' },
      );
    },
    { dependencies: [firma] },
  );

  return (
    <ul ref={listaRef} className={estilos.lista} aria-label={titulo}>
      {elementos.map((elemento) => (
        <li key={elemento.clave} className={estilos.elemento}>
          <div className={estilos.texto}>
            <span className={estilos.etiqueta}>{elemento.etiqueta}</span>
            <span className={`${estilos.detalle} cifra`}>{elemento.detalle}</span>
          </div>
          {elemento.nota && <p className={`${estilos.nota} texto-secundario`}>{elemento.nota}</p>}
          <span className={estilos.pista} aria-hidden="true">
            <span data-barra className={estilos.barra} style={{ width: `${maximo > 0 ? (elemento.valor / maximo) * 100 : 0}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}
