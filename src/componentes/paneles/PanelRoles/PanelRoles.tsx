import { useRef, useState, type FormEvent } from 'react';
import { ETIQUETAS_ROL, DESCRIPCION_ROL } from '../../../config';
import { crearId } from '../../../datos/fuente';
import { mensajeDeError, useAvisos } from '../../../estado/Avisos';
import { useNegocio } from '../../../estado/Negocio';
import type { PropiedadesPanel } from '../../../estado/Paneles';
import type { Miembro, Rol } from '../../../tipos/negocio';
import { Icono } from '../../Icono/Icono';
import { PanelDeslizante } from '../../PanelDeslizante/PanelDeslizante';
import estilos from './PanelRoles.module.css';

const ROLES = Object.keys(ETIQUETAS_ROL) as Rol[];
const ROL_INICIAL: Rol = 'vendedor';

// Equipo y permisos por rol
export function PanelRoles({ abierto, onCerrado }: PropiedadesPanel) {
  const { datos, modo, miembroActivo, puedeEditar, guardarMiembro, borrarMiembro } = useNegocio();
  const { avisar } = useAvisos();
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [rol, setRol] = useState<Rol>(ROL_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [versionSelects, setVersionSelects] = useState(0);
  const [error, setError] = useState('');
  const equipoRef = useRef<HTMLHeadingElement>(null);
  const editable = puedeEditar('roles');

  async function cambiarRol(miembro: Miembro, nuevoRol: Rol) {
    if (nuevoRol === miembro.rol) return;
    setError('');
    try {
      await guardarMiembro({ ...miembro, rol: nuevoRol });
      avisar(`Rol de ${miembro.nombre}: ${ETIQUETAS_ROL[nuevoRol]}`);
    } catch (fallo) {
      setError(mensajeDeError(fallo));
      // Remonta los selects para que muestren el valor real
      setVersionSelects((v) => v + 1);
    }
  }

  async function quitar(miembro: Miembro) {
    setError('');
    try {
      await borrarMiembro(miembro.id);
      avisar(`${miembro.nombre} ya no está en el equipo`);
      // El botón pulsado desaparece: el foco pasa al encabezado del equipo
      equipoRef.current?.focus();
    } catch (fallo) {
      setError(mensajeDeError(fallo));
    }
  }

  async function agregar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio || guardando) return;
    setError('');
    setGuardando(true);
    try {
      await guardarMiembro({ id: crearId(), nombre: nombreLimpio, correo: correo.trim(), rol, creadoEn: new Date().toISOString() });
      avisar(`${nombreLimpio} se agregó al equipo`);
      setNombre('');
      setCorreo('');
      setRol(ROL_INICIAL);
    } catch (fallo) {
      setError(mensajeDeError(fallo));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <PanelDeslizante abierto={abierto} titulo="Roles y equipo" descripcion="Cada rol define qué puede ver y editar cada persona." onCerrado={onCerrado}>
      <div className={estilos.contenedor}>
        <section aria-labelledby="roles-descripcion">
          <h3 id="roles-descripcion" className={estilos.encabezado}>Roles</h3>
          <dl className={estilos.roles}>
            {ROLES.map((clave) => (
              <div key={clave} className={estilos.rolFila}>
                <dt>{ETIQUETAS_ROL[clave]}</dt>
                <dd className="texto-secundario">{DESCRIPCION_ROL[clave]}</dd>
              </div>
            ))}
          </dl>
          {modo === 'local' && (
            <p className="texto-secundario">En modo local, elige quién eres desde tu avatar (arriba a la derecha) para probar los permisos de cada rol.</p>
          )}
        </section>

        <section aria-labelledby="roles-equipo">
          <h3 id="roles-equipo" ref={equipoRef} tabIndex={-1} className={estilos.encabezado}>Equipo</h3>
          {error && <p className="campo-error" role="alert">{error}</p>}
          <ul className={estilos.equipo}>
            {datos.miembros.map((miembro) => (
              <li key={`${miembro.id}-${versionSelects}`} className={estilos.miembro}>
                <span className={estilos.avatar} aria-hidden="true">{miembro.nombre.charAt(0).toUpperCase() || '?'}</span>
                <span className={estilos.datos}>
                  <span className={estilos.nombre}>
                    {miembro.nombre}
                    {miembro.id === miembroActivo.id && <span className="texto-secundario"> (tú)</span>}
                  </span>
                  {miembro.correo && <span className={`texto-secundario ${estilos.correo}`}>{miembro.correo}</span>}
                </span>
                {editable ? (
                  <>
                    <label className={estilos.selector}>
                      <span className="solo-lector">Rol de {miembro.nombre}</span>
                      <select className="control" value={miembro.rol} onChange={(e) => void cambiarRol(miembro, e.target.value as Rol)}>
                        {ROLES.map((clave) => <option key={clave} value={clave}>{ETIQUETAS_ROL[clave]}</option>)}
                      </select>
                    </label>
                    <button type="button" className="boton-icono" aria-label={`Quitar a ${miembro.nombre}`} onClick={() => void quitar(miembro)}>
                      <Icono nombre="basura" />
                    </button>
                  </>
                ) : (
                  <span className="chip chip-gris">{ETIQUETAS_ROL[miembro.rol]}</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        {editable && (
          <section aria-labelledby="roles-agregar">
            <h3 id="roles-agregar" className={estilos.encabezado}>Agregar miembro</h3>
            <form className="formulario" onSubmit={agregar}>
              <div className="campo">
                <label className="campo-etiqueta" htmlFor="miembro-nombre">Nombre</label>
                <input id="miembro-nombre" className="control" required maxLength={60} value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
              <div className="fila-campos">
                <div className="campo">
                  <label className="campo-etiqueta" htmlFor="miembro-correo">Correo (opcional)</label>
                  <input id="miembro-correo" type="email" className="control" value={correo} onChange={(e) => setCorreo(e.target.value)} />
                </div>
                <div className="campo">
                  <label className="campo-etiqueta" htmlFor="miembro-rol">Rol</label>
                  <select id="miembro-rol" className="control" value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
                    {ROLES.map((clave) => <option key={clave} value={clave}>{ETIQUETAS_ROL[clave]}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <button type="submit" className="boton boton-primario" disabled={guardando}>
                  <Icono nombre="mas" tamano="pequeno" /> Agregar miembro
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    </PanelDeslizante>
  );
}
