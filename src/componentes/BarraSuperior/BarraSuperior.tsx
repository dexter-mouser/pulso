import { useEffect, useRef, useState } from 'react';
import { ETIQUETAS_ROL, NOMBRE_APP } from '../../config';
import { useNegocio } from '../../estado/Negocio';
import type { IdVista, Pestana } from '../../tipos/negocio';
import { Icono } from '../Icono/Icono';
import { NavegacionPestanas } from '../NavegacionPestanas/NavegacionPestanas';
import estilos from './BarraSuperior.module.css';

interface PropiedadesBarraSuperior {
  pestanas: Pestana[];
  idActiva: IdVista;
  onCambiar: (id: IdVista) => void;
  totalAvisos: number;
  onCerrarSesion?: () => void;
}

function inicial(nombre: string): string {
  return nombre.trim().charAt(0).toUpperCase() || '?';
}

export function BarraSuperior({ pestanas, idActiva, onCambiar, totalAvisos, onCerrarSesion }: PropiedadesBarraSuperior) {
  const { datos, modo, miembroActivo, cambiarMiembroActivo } = useNegocio();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const zonaMenuRef = useRef<HTMLDivElement>(null);
  const botonPerfilRef = useRef<HTMLButtonElement>(null);
  const hayAvisos = totalAvisos > 0;

  // Cierra el menú y devuelve el foco al avatar
  function cerrarMenu() {
    setMenuAbierto(false);
    botonPerfilRef.current?.focus();
  }

  // Cierra el menú del perfil con Esc, clic fuera o al salir con Tab
  useEffect(() => {
    if (!menuAbierto) return;
    const zona = zonaMenuRef.current;
    const alPulsar = (evento: PointerEvent) => {
      if (!zona?.contains(evento.target as Node)) setMenuAbierto(false);
    };
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      setMenuAbierto(false);
      botonPerfilRef.current?.focus();
    };
    const alSalirFoco = (evento: FocusEvent) => {
      if (evento.relatedTarget && !zona?.contains(evento.relatedTarget as Node)) setMenuAbierto(false);
    };
    document.addEventListener('pointerdown', alPulsar);
    document.addEventListener('keydown', alTeclear);
    zona?.addEventListener('focusout', alSalirFoco);
    return () => {
      document.removeEventListener('pointerdown', alPulsar);
      document.removeEventListener('keydown', alTeclear);
      zona?.removeEventListener('focusout', alSalirFoco);
    };
  }, [menuAbierto]);

  return (
    <header className={estilos.barra}>
      <a className="saltar" href="#panel-vista">Saltar al contenido</a>
      <a className={estilos.logo} href={import.meta.env.BASE_URL}>
        <span className={estilos.marca}><Icono nombre="logo" /></span>
        {NOMBRE_APP}
      </a>

      <NavegacionPestanas pestanas={pestanas} idActiva={idActiva} onCambiar={onCambiar} />

      <div className={estilos.acciones}>
        <span className={estilos.negocio} title={datos.ajustes.nombre}>
          <Icono nombre="tienda" tamano="pequeno" />
          {datos.ajustes.nombre}
        </span>
        <button
          type="button"
          className={hayAvisos ? `boton-icono ${estilos.campana}` : 'boton-icono'}
          aria-label={hayAvisos ? `Avisos: ${totalAvisos} pendientes. Ir al resumen` : 'Sin avisos. Ir al resumen'}
          onClick={() => onCambiar('resumen')}
        >
          <Icono nombre="campana" />
        </button>

        <div className={estilos.zonaPerfil} ref={zonaMenuRef}>
          <button
            ref={botonPerfilRef}
            type="button"
            className={estilos.avatar}
            aria-expanded={menuAbierto}
            aria-controls={menuAbierto ? 'menu-perfil' : undefined}
            aria-label={`Perfil de ${miembroActivo.nombre}, ${ETIQUETAS_ROL[miembroActivo.rol]}`}
            onClick={() => setMenuAbierto((valor) => !valor)}
          >
            {inicial(miembroActivo.nombre)}
          </button>

          {menuAbierto && (
            <div id="menu-perfil" className={estilos.menu}>
              <p className={estilos.menuNombre}>{miembroActivo.nombre}</p>
              <p className={estilos.menuRol}>{ETIQUETAS_ROL[miembroActivo.rol]}</p>

              {modo === 'local' && datos.miembros.length > 1 && (
                <fieldset className={estilos.menuGrupo}>
                  <legend className={estilos.menuLeyenda}>Actuar como</legend>
                  {datos.miembros.map((miembro) => (
                    <label key={miembro.id} className={estilos.menuOpcion}>
                      <input
                        type="radio"
                        name="miembro-activo"
                        checked={miembro.id === miembroActivo.id}
                        onChange={() => {
                          cambiarMiembroActivo(miembro.id);
                          cerrarMenu();
                        }}
                      />
                      <span>{miembro.nombre}</span>
                      <span className="texto-secundario">{ETIQUETAS_ROL[miembro.rol]}</span>
                    </label>
                  ))}
                </fieldset>
              )}

              {onCerrarSesion && (
                <button type="button" className="boton boton-secundario boton-pequeno" onClick={onCerrarSesion}>
                  Cerrar sesión
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
