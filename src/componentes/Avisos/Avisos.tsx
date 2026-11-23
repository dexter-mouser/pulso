import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useAvisos, type Aviso } from '../../estado/Avisos';
import { debeAnimar } from '../../utilidades/movimiento';
import { Icono } from '../Icono/Icono';
import estilos from './Avisos.module.css';

const DURACION_VISIBLE_MS = 4500;
const SEPARACION_PX = 64;
const MARGEN_PX = 16;

// Región fija de avisos; cada aviso es un popover manual para quedar sobre los paneles
export function Avisos() {
  const { avisos, descartar } = useAvisos();
  const ultimo = avisos.at(-1);

  return (
    <div role="region" aria-label="Avisos" className={estilos.region}>
      {avisos.map((aviso, indice) => (
        <ElementoAviso key={aviso.id} aviso={aviso} posicion={avisos.length - 1 - indice} onDescartar={descartar} />
      ))}
      <p className="solo-lector" aria-live="polite">{ultimo?.texto ?? ''}</p>
    </div>
  );
}

interface PropiedadesElemento {
  aviso: Aviso;
  posicion: number;
  onDescartar: (id: string) => void;
}

function ElementoAviso({ aviso, posicion, onDescartar }: PropiedadesElemento) {
  const referencia = useRef<HTMLDivElement>(null);

  // Sale animado y luego se quita del estado
  function cerrar() {
    const elemento = referencia.current;
    if (!elemento || !debeAnimar()) {
      onDescartar(aviso.id);
      return;
    }
    gsap.to(elemento, { opacity: 0, x: 24, duration: 0.2, ease: 'power2.in', onComplete: () => onDescartar(aviso.id) });
  }

  // Muestra el popover y lo cierra solo, salvo con foco o cursor encima; los errores no se cierran solos
  useEffect(() => {
    const elemento = referencia.current;
    if (!elemento) return;
    elemento.setAttribute('popover', 'manual');
    if (typeof elemento.showPopover === 'function') elemento.showPopover();

    if (aviso.tipo === 'error') return;

    let temporizador = 0;
    const programar = () => {
      temporizador = window.setTimeout(() => {
        if (elemento.matches(':focus-within, :hover')) programar();
        else cerrar();
      }, DURACION_VISIBLE_MS);
    };
    programar();
    return () => window.clearTimeout(temporizador);
  }, []);

  return (
    <div
      ref={referencia}
      className={`${estilos.aviso} ${aviso.tipo === 'error' ? estilos.error : ''}`}
      style={{ bottom: MARGEN_PX + posicion * SEPARACION_PX }}
    >
      <Icono nombre={aviso.tipo === 'error' ? 'alerta' : 'check'} tamano="pequeno" />
      <p className={estilos.texto}>{aviso.texto}</p>
      <button type="button" className="boton-icono boton-mini" aria-label="Cerrar aviso" onClick={cerrar}>
        <Icono nombre="cerrar" tamano="pequeno" />
      </button>
    </div>
  );
}
