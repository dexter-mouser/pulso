import { useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { debeAnimar } from '../../utilidades/movimiento';
import estilos from './Tabla.module.css';

const FILAS_ANIMADAS = 20;

export interface Columna<T> {
  clave: string;
  titulo: string;
  celda: (fila: T) => ReactNode;
  alinear?: 'inicio' | 'fin';
  // Se oculta por debajo de 768px
  secundaria?: boolean;
}

interface PropiedadesTabla<T> {
  filas: T[];
  columnas: Columna<T>[];
  obtenerId: (fila: T) => string;
  // Título accesible de la tabla (no visible)
  titulo: string;
  vacio: ReactNode;
  acciones?: (fila: T) => ReactNode;
}

// Tabla de datos con entrada escalonada de filas al cambiar el contenido
export function Tabla<T>({ filas, columnas, obtenerId, titulo, vacio, acciones }: PropiedadesTabla<T>) {
  const cuerpoRef = useRef<HTMLTableSectionElement>(null);
  const firma = filas.map(obtenerId).join('|');

  useGSAP(
    () => {
      const cuerpo = cuerpoRef.current;
      if (!cuerpo || !debeAnimar()) return;
      const nuevas = [...cuerpo.rows].slice(0, FILAS_ANIMADAS);
      gsap.fromTo(nuevas, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.025, ease: 'power2.out', clearProps: 'transform,opacity' });
    },
    { dependencies: [firma] },
  );

  if (filas.length === 0) return <>{vacio}</>;

  return (
    <div className={estilos.marco} tabIndex={0} role="region" aria-label={titulo}>
      <table className={estilos.tabla}>
        <caption className="solo-lector">{titulo}</caption>
        <thead>
          <tr>
            {columnas.map((columna) => (
              <th
                key={columna.clave}
                scope="col"
                className={`${columna.alinear === 'fin' ? estilos.fin : ''} ${columna.secundaria ? estilos.secundaria : ''}`}
              >
                {columna.titulo}
              </th>
            ))}
            {acciones && <th scope="col" className={estilos.fin}><span className="solo-lector">Acciones</span></th>}
          </tr>
        </thead>
        <tbody ref={cuerpoRef}>
          {filas.map((fila) => (
            <tr key={obtenerId(fila)}>
              {columnas.map((columna) => (
                <td
                  key={columna.clave}
                  className={`${columna.alinear === 'fin' ? estilos.fin : ''} ${columna.secundaria ? estilos.secundaria : ''}`}
                >
                  {columna.celda(fila)}
                </td>
              ))}
              {acciones && (
                <td className={estilos.fin}>
                  <div className={estilos.acciones}>{acciones(fila)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
