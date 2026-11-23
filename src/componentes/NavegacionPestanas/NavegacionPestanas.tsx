import { useEffect, useRef, type KeyboardEvent } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import type { IdVista, Pestana } from '../../tipos/negocio';
import { debeAnimar } from '../../utilidades/movimiento';
import estilos from './NavegacionPestanas.module.css';

// Duraciones del borde que avanza y del que lo sigue (segundos)
const DURACION_CORTA = 0.36;
const DURACION_LARGA = 0.55;

interface PropiedadesNavegacion {
  pestanas: Pestana[];
  idActiva: IdVista;
  onCambiar: (id: IdVista) => void;
}

interface Recorte { l: number; r: number; t: number; b: number }

export function NavegacionPestanas({ pestanas, idActiva, onCambiar }: PropiedadesNavegacion) {
  const listaRef = useRef<HTMLDivElement>(null);
  const pildoraRef = useRef<HTMLSpanElement>(null);
  const recorteRef = useRef<Recorte>({ l: 0, r: 0, t: 0, b: 0 });
  const iniciadaRef = useRef(false);
  const ultimaClaveRef = useRef('');

  // Cambia cuando varían los conteos (y con ello el ancho de las pestañas)
  const claveConteos = pestanas.map((pestana) => pestana.conteo).join(',');

  function dibujarPildora() {
    const { l, r, t, b } = recorteRef.current;
    if (pildoraRef.current) {
      pildoraRef.current.style.clipPath = `inset(${t}px ${r}px ${b}px ${l}px round 999px)`;
    }
  }

  function calcularDestino(): Recorte | null {
    const lista = listaRef.current;
    const pestana = lista?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!lista || !pestana) return null;
    return {
      l: pestana.offsetLeft,
      r: lista.offsetWidth - (pestana.offsetLeft + pestana.offsetWidth),
      t: pestana.offsetTop,
      b: lista.offsetHeight - (pestana.offsetTop + pestana.offsetHeight),
    };
  }

  // Recoloca la píldora sin animar
  function colocarPildora() {
    const destino = calcularDestino();
    if (!destino) return;
    gsap.killTweensOf(recorteRef.current);
    Object.assign(recorteRef.current, destino);
    iniciadaRef.current = true;
    dibujarPildora();
  }

  // Al ir a la derecha avanza primero el borde derecho; a la izquierda, el izquierdo
  function animarPildora() {
    const destino = calcularDestino();
    if (!destino) return;
    const recorte = recorteRef.current;
    const haciaDerecha = destino.l > recorte.l;
    gsap.killTweensOf(recorte);
    recorte.t = destino.t;
    recorte.b = destino.b;
    gsap.to(recorte, {
      r: destino.r,
      duration: haciaDerecha ? DURACION_CORTA : DURACION_LARGA,
      ease: haciaDerecha ? 'power3.inOut' : 'power3.out',
      onUpdate: dibujarPildora,
    });
    gsap.to(recorte, {
      l: destino.l,
      duration: haciaDerecha ? DURACION_LARGA : DURACION_CORTA,
      ease: haciaDerecha ? 'power3.out' : 'power3.inOut',
      onUpdate: dibujarPildora,
    });
  }

  // Primera vez, cambio de pestaña o de conteos
  useGSAP(() => {
    const cambioSoloLaPestana = ultimaClaveRef.current === claveConteos;
    ultimaClaveRef.current = claveConteos;
    if (iniciadaRef.current && cambioSoloLaPestana && debeAnimar()) animarPildora();
    else colocarPildora();
    listaRef.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest', container: 'nearest' } as ScrollIntoViewOptions);
    return () => gsap.killTweensOf(recorteRef.current);
  }, { dependencies: [idActiva, claveConteos], scope: listaRef });

  // Tamaño de ventana y carga de fuentes
  useEffect(() => {
    let sigueMontado = true;
    window.addEventListener('resize', colocarPildora);
    document.fonts.ready.then(() => { if (sigueMontado) colocarPildora(); });
    return () => {
      sigueMontado = false;
      window.removeEventListener('resize', colocarPildora);
    };
  }, []);

  // Teclado: la selección sigue al foco
  function alPulsarTecla(evento: KeyboardEvent<HTMLDivElement>) {
    const indiceActual = pestanas.findIndex((pestana) => pestana.id === idActiva);
    const ultimo = pestanas.length - 1;
    const destinos: Record<string, number> = {
      ArrowRight: indiceActual >= ultimo ? 0 : indiceActual + 1,
      ArrowLeft: indiceActual <= 0 ? ultimo : indiceActual - 1,
      Home: 0,
      End: ultimo,
    };
    const indice = destinos[evento.key];
    if (indice === undefined || pestanas.length === 0) return;
    evento.preventDefault();
    const destino = pestanas[indice];
    if (destino.id !== idActiva) onCambiar(destino.id);
    document.getElementById(`pestana-${destino.id}`)?.focus();
  }

  return (
    <div className={estilos.navegacion}>
      <div
        ref={listaRef}
        className={estilos.lista}
        role="tablist"
        aria-label="Secciones del panel"
        onKeyDown={alPulsarTecla}
      >
        <span ref={pildoraRef} className={estilos.pildora} aria-hidden="true" />
        {pestanas.map((pestana) => {
          const estaActiva = pestana.id === idActiva;
          return (
            <button
              key={pestana.id}
              type="button"
              role="tab"
              id={`pestana-${pestana.id}`}
              className={estilos.pestana}
              aria-selected={estaActiva}
              aria-controls={estaActiva ? 'panel-vista' : undefined}
              tabIndex={estaActiva ? 0 : -1}
              onClick={() => { if (!estaActiva) onCambiar(pestana.id); }}
            >
              {pestana.etiqueta}
              {pestana.conteo > 0 && (
                <span className={pestana.tono === 'amarillo' ? `${estilos.insignia} ${estilos.amarilla}` : estilos.insignia}>
                  <span className="solo-lector">, </span>{pestana.conteo}<span className="solo-lector"> {pestana.conteo === 1 ? 'aviso' : 'avisos'}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
