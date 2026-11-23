import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { Avisos } from './componentes/Avisos/Avisos';
import { BarraLateral } from './componentes/BarraLateral/BarraLateral';
import { BarraSuperior } from './componentes/BarraSuperior/BarraSuperior';
import { GestorPaneles } from './componentes/GestorPaneles/GestorPaneles';
import { VISTA_INICIAL } from './config';
import { useNegocio } from './estado/Negocio';
import type { IdVista, Pestana } from './tipos/negocio';
import { articulosConPocoStock, cobrosPendientes } from './utilidades/negocio';
import { DURACION_ENTRADA, DURACION_SALIDA, debeAnimar } from './utilidades/movimiento';
import { vistas } from './vistas/registro';
import estilos from './App.module.css';

const SELECTOR_ANIMABLE = '.animable';
const DESPLAZAMIENTO_ENTRADA = 12;
const DESPLAZAMIENTO_SALIDA = -8;
const ESCALONADO = 0.04;
const PROPIEDADES_ANIMADAS = 'transform,opacity';

export function App({ onCerrarSesion }: { onCerrarSesion?: () => void }) {
  const { datos, puedeVer } = useNegocio();
  const [idActiva, setIdActiva] = useState<IdVista>(VISTA_INICIAL);
  const [idMostrada, setIdMostrada] = useState<IdVista>(VISTA_INICIAL);
  const contenidoRef = useRef<HTMLElement>(null);

  // Insignias: cobros pendientes en Ventas y poco stock en Productos; con 0 no se muestran
  const pendientes = cobrosPendientes(datos.ventas).length;
  const conPocoStock = articulosConPocoStock(datos.articulos).length;
  const conteos: Partial<Record<IdVista, number>> = { ventas: pendientes, productos: conPocoStock };

  const permitidas = vistas.filter((vista) => puedeVer(vista.id));
  const pestanas: Pestana[] = permitidas.map((vista) => ({
    id: vista.id,
    etiqueta: vista.etiqueta,
    conteo: conteos[vista.id] ?? 0,
    tono: vista.id === 'ventas' ? 'amarillo' : undefined,
  }));

  // Si el rol activo ya no puede ver la vista, vuelve al resumen
  useEffect(() => {
    if (puedeVer(idActiva)) return;
    setIdActiva(VISTA_INICIAL);
    setIdMostrada(VISTA_INICIAL);
  }, [idActiva, puedeVer]);

  const vistaMostrada = permitidas.find((vista) => vista.id === idMostrada) ?? vistas[0];
  const Vista = vistaMostrada.componente;

  // Entrada escalonada de la vista nueva
  useGSAP(
    () => {
      if (!debeAnimar()) return;
      gsap.fromTo(
        SELECTOR_ANIMABLE,
        { opacity: 0, y: DESPLAZAMIENTO_ENTRADA },
        { opacity: 1, y: 0, duration: DURACION_ENTRADA, stagger: ESCALONADO, ease: 'power3.out', clearProps: PROPIEDADES_ANIMADAS },
      );
    },
    { scope: contenidoRef, dependencies: [idMostrada] },
  );

  // Salida de la vista actual y luego cambio
  const { contextSafe } = useGSAP({ scope: contenidoRef });
  const cambiarVista = contextSafe((id: IdVista) => {
    if (id === idActiva) return;
    setIdActiva(id);

    const elementos = contenidoRef.current?.querySelectorAll(SELECTOR_ANIMABLE);
    if (!debeAnimar() || !elementos?.length) {
      setIdMostrada(id);
      return;
    }

    gsap.killTweensOf(elementos);

    // Volvió a la vista que aún se ve: se cancela la salida
    if (id === idMostrada) {
      gsap.to(elementos, { opacity: 1, y: 0, duration: DURACION_SALIDA, clearProps: PROPIEDADES_ANIMADAS });
      return;
    }

    gsap.to(elementos, {
      opacity: 0,
      y: DESPLAZAMIENTO_SALIDA,
      duration: DURACION_SALIDA,
      ease: 'power2.in',
      onComplete: () => setIdMostrada(id),
    });
  });

  return (
    <div className={estilos.contenedor}>
      <BarraSuperior
        pestanas={pestanas}
        idActiva={idActiva}
        onCambiar={cambiarVista}
        totalAvisos={pendientes + conPocoStock}
        onCerrarSesion={onCerrarSesion}
      />
      <div className={estilos.cuerpo}>
        <BarraLateral />
        <main ref={contenidoRef} className={estilos.contenido}>
          <div
            id="panel-vista"
            className={estilos.panel}
            role="tabpanel"
            aria-labelledby={`pestana-${vistaMostrada.id}`}
            tabIndex={0}
          >
            <Vista key={vistaMostrada.id} />
          </div>
        </main>
      </div>
      <GestorPaneles />
      <Avisos />
    </div>
  );
}
