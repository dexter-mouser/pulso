import { useCallback, useEffect, useId, useRef, type MouseEvent, type ReactNode, type RefObject } from 'react';
import { Icono } from '../Icono/Icono';
import estilos from './PanelDeslizante.module.css';

interface PropiedadesPanel {
  abierto: boolean;
  titulo: string;
  descripcion?: string;
  // Se llama cuando el panel terminó de cerrarse (por Esc, clic fuera, la X o porque `abierto` pasó a false)
  onCerrado: () => void;
  pie?: ReactNode;
  // Elemento que recibe el foco al abrir (autoFocus no funciona en un diálogo cerrado)
  enfoqueInicial?: RefObject<HTMLElement>;
  children: ReactNode;
}

// Panel que entra desde la izquierda: <dialog> modal con desplazamiento y puntos de anclaje (guía navigation-drawer)
export function PanelDeslizante({ abierto, titulo, descripcion, onCerrado, pie, enfoqueInicial, children }: PropiedadesPanel) {
  const dialogoRef = useRef<HTMLDialogElement>(null);
  const desplazadorRef = useRef<HTMLDivElement>(null);
  const hojaRef = useRef<HTMLDivElement>(null);
  const onCerradoRef = useRef(onCerrado);
  // La hoja ya llegó a verse abierta: hasta entonces el observador no debe cerrar el diálogo
  const yaSeVioAbiertoRef = useRef(false);
  const idTitulo = useId();

  useEffect(() => {
    onCerradoRef.current = onCerrado;
  }, [onCerrado]);

  // Cerrar = desplazar al punto vacío; el observador cierra el diálogo al salir la hoja.
  // Si aún no terminó de entrar, se cierra directamente.
  const cerrarAnimado = useCallback(() => {
    const dialogo = dialogoRef.current;
    const desplazador = desplazadorRef.current;
    if (!yaSeVioAbiertoRef.current) {
      if (dialogo?.open) dialogo.close();
      return;
    }
    desplazador?.scrollTo({ left: desplazador.offsetWidth, behavior: 'auto' });
  }, []);

  // Abrir y cerrar según la propiedad
  useEffect(() => {
    const dialogo = dialogoRef.current;
    const desplazador = desplazadorRef.current;
    if (!dialogo || !desplazador) return;

    if (abierto && !dialogo.open) {
      yaSeVioAbiertoRef.current = false;
      dialogo.showModal();
      enfoqueInicial?.current?.focus();
      desplazador.scrollTo({ left: desplazador.offsetWidth, behavior: 'instant' });
      requestAnimationFrame(() => requestAnimationFrame(() => desplazador.scrollTo({ left: 0, behavior: 'auto' })));
    } else if (abierto) {
      // Reabierto mientras se animaba el cierre: vuelve a la posición abierta
      desplazador.scrollTo({ left: 0, behavior: 'auto' });
    } else if (!abierto && dialogo.open) {
      cerrarAnimado();
    }
    // enfoqueInicial solo se usa al abrir, por eso no es dependencia
  }, [abierto, cerrarAnimado]);

  // Detecta cuándo la hoja salió del todo; también atenúa el fondo si no hay animaciones por desplazamiento
  useEffect(() => {
    const dialogo = dialogoRef.current;
    const desplazador = desplazadorRef.current;
    const hoja = hojaRef.current;
    if (!dialogo || !desplazador || !hoja) return;

    const umbral = 1 / window.innerWidth;
    const casiCompleto = 0.98;
    const observador = new IntersectionObserver(
      (entradas) => {
        const entrada = entradas.at(-1);
        if (!entrada || !dialogo.open) return;
        // La primera lectura llega con la hoja aún fuera: no es un cierre
        if (entrada.intersectionRatio >= casiCompleto) yaSeVioAbiertoRef.current = true;
        if (entrada.intersectionRatio < umbral && yaSeVioAbiertoRef.current) {
          yaSeVioAbiertoRef.current = false;
          dialogo.close();
        }
      },
      { root: dialogo, threshold: [umbral, casiCompleto, 1] },
    );
    observador.observe(hoja);

    const alCerrar = () => onCerradoRef.current();
    const alCancelar = (evento: Event) => {
      if (!evento.cancelable) return;
      evento.preventDefault();
      cerrarAnimado();
    };
    const alDesplazar = () => {
      const proporcion = 1 - desplazador.scrollLeft / Math.max(hoja.offsetWidth, 1);
      dialogo.style.setProperty('--panel-fondo', String(Math.min(Math.max(proporcion, 0), 1)));
    };
    const usaRespaldo = !CSS.supports('animation-timeline: scroll()');

    dialogo.addEventListener('close', alCerrar);
    dialogo.addEventListener('cancel', alCancelar);
    if (usaRespaldo) desplazador.addEventListener('scroll', alDesplazar);
    return () => {
      observador.disconnect();
      dialogo.removeEventListener('close', alCerrar);
      dialogo.removeEventListener('cancel', alCancelar);
      if (usaRespaldo) desplazador.removeEventListener('scroll', alDesplazar);
    };
  }, [cerrarAnimado]);

  // Clic en el área atenuada (fuera de la hoja)
  function alHacerClic(evento: MouseEvent<HTMLDialogElement>) {
    if (!hojaRef.current?.contains(evento.target as Node)) cerrarAnimado();
  }

  return (
    <dialog ref={dialogoRef} className={estilos.panel} aria-labelledby={idTitulo} onClick={alHacerClic}>
      <div ref={desplazadorRef} className={estilos.desplazador}>
        <div ref={hojaRef} className={estilos.hoja}>
          <header className={estilos.cabecera}>
            <div>
              <h2 id={idTitulo} className={estilos.titulo}>{titulo}</h2>
              {descripcion && <p className={estilos.descripcion}>{descripcion}</p>}
            </div>
            <button type="button" className="boton-icono" aria-label="Cerrar panel" autoFocus onClick={cerrarAnimado}>
              <Icono nombre="cerrar" />
            </button>
          </header>
          <div className={estilos.contenido}>{children}</div>
          {pie && <footer className={estilos.pie}>{pie}</footer>}
        </div>
      </div>
    </dialog>
  );
}
