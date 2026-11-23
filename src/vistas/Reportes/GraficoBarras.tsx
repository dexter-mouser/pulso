import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { LOCALE } from '../../config';
import { debeAnimar } from '../../utilidades/movimiento';
import estilos from './GraficoBarras.module.css';

const MARCAS_EJE = 4;
const STAGGER_BARRAS = 0.015;

interface PropiedadesGrafico {
  // Ventas de cada día del mes (índice 0 = día 1)
  valores: number[];
  mes: Date;
  formatear: (valor: number) => string;
  // Formato corto para las marcas del eje
  formatearEje: (valor: number) => string;
  // Día resaltado (1 a N); null si ninguno
  diaDestacado: number | null;
}

// Valor máximo del eje redondeado hacia arriba para que las marcas queden limpias
function calcularMaximoEje(maximo: number): number {
  if (maximo <= 0) return 1;
  const magnitud = 10 ** Math.floor(Math.log10(maximo));
  const unidad = (magnitud / 2) * MARCAS_EJE;
  return Math.ceil(maximo / unidad) * unidad;
}

// Barras verticales de ventas por día con eje, tooltip y entrada animada
export function GraficoBarras({ valores, mes, formatear, formatearEje, diaDestacado }: PropiedadesGrafico) {
  const listaRef = useRef<HTMLUListElement>(null);
  const idAyuda = useId();
  // Día activo con teclado (índice); null si el gráfico no tiene el foco
  const [activo, setActivo] = useState<number | null>(null);
  const nombreMes = useMemo(() => new Intl.DateTimeFormat(LOCALE, { month: 'long' }).format(mes), [mes]);
  const maximoEje = calcularMaximoEje(Math.max(...valores, 0));
  const marcas = Array.from({ length: MARCAS_EJE + 1 }, (_, i) => (maximoEje / MARCAS_EJE) * i);
  const firma = `${mes.getFullYear()}-${mes.getMonth()}-${valores.join(',')}`;

  // Las barras crecen desde la base
  useGSAP(
    () => {
      const lista = listaRef.current;
      if (!lista || !debeAnimar()) return;
      gsap.fromTo(
        lista.querySelectorAll('[data-barra]'),
        { scaleY: 0 },
        { scaleY: 1, duration: 0.5, stagger: STAGGER_BARRAS, ease: 'power3.out', transformOrigin: 'bottom', clearProps: 'transform' },
      );
    },
    { dependencies: [firma] },
  );

  // Flechas, inicio y fin recorren los días (un solo punto de tabulación)
  function alPulsarTecla(evento: KeyboardEvent<HTMLUListElement>) {
    const ultimo = valores.length - 1;
    const actual = activo ?? 0;
    const destinos: Record<string, number> = {
      ArrowRight: Math.min(actual + 1, ultimo),
      ArrowLeft: Math.max(actual - 1, 0),
      Home: 0,
      End: ultimo,
    };
    if (!(evento.key in destinos)) return;
    evento.preventDefault();
    setActivo(destinos[evento.key]);
  }

  return (
    <>
    <div className={estilos.grafico}>
      <div className={estilos.eje} aria-hidden="true">
        {marcas.map((marca) => (
          <span key={marca} className={estilos.marca} style={{ bottom: `${(marca / maximoEje) * 100}%` }}>
            {formatearEje(marca)}
          </span>
        ))}
      </div>
      <div className={estilos.area}>
        <div className={estilos.lineas} aria-hidden="true">
          {marcas.map((marca) => (
            <span key={marca} className={estilos.linea} style={{ bottom: `${(marca / maximoEje) * 100}%` }} />
          ))}
        </div>
        <ul
          ref={listaRef}
          className={estilos.barras}
          tabIndex={0}
          aria-label={`Ventas por día de ${nombreMes}`}
          aria-describedby={idAyuda}
          onFocus={() => setActivo((previo) => previo ?? (diaDestacado ? diaDestacado - 1 : 0))}
          onBlur={() => setActivo(null)}
          onKeyDown={alPulsarTecla}
        >
          {valores.map((valor, indice) => {
            const dia = indice + 1;
            const etiqueta = `${dia} de ${nombreMes}: ${formatear(valor)}`;
            const posicion = indice < valores.length / 3 ? estilos.izquierda : indice > (valores.length * 2) / 3 ? estilos.derecha : '';
            return (
              <li key={dia} className={`${estilos.columna} ${posicion} ${indice === activo ? estilos.activa : ''}`}>
                <span className="solo-lector">{etiqueta}{dia === diaDestacado ? ' (día destacado)' : ''}</span>
                <span className={estilos.pista}>
                  <span
                    data-barra
                    className={`${estilos.barra} ${dia === diaDestacado ? estilos.destacada : ''}`}
                    style={{ height: `${(valor / maximoEje) * 100}%` }}
                  />
                </span>
                <span className={estilos.tooltip} aria-hidden="true">{etiqueta}</span>
              </li>
            );
          })}
        </ul>
        <div className={estilos.dias} aria-hidden="true">
          {[1, Math.ceil(valores.length / 2), valores.length].map((dia) => (
            <span key={dia}>{dia}</span>
          ))}
        </div>
        <p id={idAyuda} className="solo-lector">Usa las flechas izquierda y derecha para recorrer los días.</p>
        <p className="solo-lector" aria-live="polite">{activo !== null ? `${activo + 1} de ${nombreMes}: ${formatear(valores[activo] ?? 0)}` : ''}</p>
      </div>
    </div>
    {diaDestacado !== null && (
      <p className={estilos.leyenda}>
        <span className={estilos.muestra} aria-hidden="true" />
        Día destacado: {diaDestacado}
      </p>
    )}
    </>
  );
}
