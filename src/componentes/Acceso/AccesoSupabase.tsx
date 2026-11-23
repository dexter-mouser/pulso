import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { NOMBRE_APP } from '../../config';
import type { FuenteDatos } from '../../datos/fuente';
import { crearFuenteSupabase, obtenerCliente, prepararNegocio } from '../../datos/supabase/fuenteSupabase';
import { Aplicacion, useCarga } from '../Arranque/Arranque';
import { PantallaCarga } from '../Arranque/PantallaCarga';
import { Icono } from '../Icono/Icono';
import estilos from './AccesoSupabase.module.css';

const LARGO_MINIMO_CLAVE = 8;
const PATRON_CORREO = /^S+@S+.S+$/;

// Modo Supabase: pide acceso y luego carga el negocio del usuario
export default function AccesoSupabase() {
  const [sesion, setSesion] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const supabase = obtenerCliente();
    supabase.auth.getSession().then(({ data }) => setSesion(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evento, nueva) => setSesion(nueva));
    return () => data.subscription.unsubscribe();
  }, []);

  if (sesion === undefined) return <PantallaCarga />;
  if (!sesion) return <PantallaAcceso />;
  return <NegocioDelUsuario usuario={sesion.user} />;
}

function NegocioDelUsuario({ usuario }: { usuario: User }) {
  const [preparado, setPreparado] = useState<{ fuente: FuenteDatos; miembroId: string } | null>(null);
  const [hayError, setHayError] = useState(false);
  const [intento, setIntento] = useState(0);
  const { datos, hayError: errorCarga, reintentar } = useCarga(preparado?.fuente ?? null);
  const usuarioId = usuario.id;

  // Depende del id (no del objeto) y se cancela si el componente se desmonta o cambia el usuario
  useEffect(() => {
    let sigueMontado = true;
    prepararNegocio(usuario)
      .then(({ negocioId, miembroId }) => {
        if (sigueMontado) setPreparado({ fuente: crearFuenteSupabase(negocioId), miembroId });
      })
      .catch((error: unknown) => {
        console.error('No se pudo preparar el negocio', error);
        if (sigueMontado) setHayError(true);
      });
    return () => {
      sigueMontado = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioId, intento]);

  // Reintentar vuelve a preparar el negocio y, con él, a cargar los datos
  const reintentarTodo = () => {
    setHayError(false);
    setPreparado(null);
    setIntento((numero) => numero + 1);
    reintentar();
  };

  const cerrarSesion = () => {
    obtenerCliente().auth.signOut().catch((error: unknown) => console.error(error));
  };

  const hayFallo = hayError || (errorCarga && preparado !== null);
  if (hayFallo) return <PantallaCarga mensaje="No se pudo conectar con el servidor." onReintentar={reintentarTodo} />;
  if (!preparado || !datos) return <PantallaCarga />;
  return <Aplicacion fuente={preparado.fuente} datos={datos} miembroId={preparado.miembroId} onCerrarSesion={cerrarSesion} />;
}

type CampoAcceso = 'correo' | 'clave';
type ErroresCampos = Partial<Record<CampoAcceso, string>>;

function validarCampos(correo: string, clave: string): ErroresCampos {
  const errores: ErroresCampos = {};
  if (!PATRON_CORREO.test(correo.trim())) errores.correo = 'Escribe un correo válido.';
  if (clave.length < LARGO_MINIMO_CLAVE) errores.clave = `La contraseña debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres.`;
  return errores;
}

// Formulario de acceso y registro con correo y contraseña
function PantallaAcceso() {
  const [modo, setModo] = useState<'entrar' | 'registrar'>('entrar');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [errores, setErrores] = useState<ErroresCampos>({});
  const [falloAcceso, setFalloAcceso] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);
  const refCorreo = useRef<HTMLInputElement>(null);
  const refClave = useRef<HTMLInputElement>(null);
  const idErrorCorreo = useId();
  const idErrorClave = useId();
  const esRegistro = modo === 'registrar';

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const encontrados = validarCampos(correo, clave);
    setErrores(encontrados);
    setFalloAcceso('');
    setAviso('');
    // El foco va al primer campo inválido
    if (encontrados.correo) return refCorreo.current?.focus();
    if (encontrados.clave) return refClave.current?.focus();

    setEnviando(true);
    const auth = obtenerCliente().auth;
    const { data, error } = esRegistro
      ? await auth.signUp({ email: correo.trim(), password: clave })
      : await auth.signInWithPassword({ email: correo.trim(), password: clave });
    setEnviando(false);

    // Mensajes genéricos: el detalle solo va a la consola
    if (error) {
      console.error(error);
      setFalloAcceso(esRegistro ? 'No se pudo crear la cuenta.' : 'Correo o contraseña incorrectos.');
    } else if (esRegistro && !data.session) {
      setAviso('Revisa tu correo para confirmar la cuenta y luego entra.');
    }
  }

  function cambiarModo() {
    setModo(esRegistro ? 'entrar' : 'registrar');
    setErrores({});
    setFalloAcceso('');
    setAviso('');
  }

  return (
    <main className={estilos.pantalla}>
      <form className={`${estilos.tarjeta} formulario`} onSubmit={enviar} noValidate>
        <span className={estilos.logo}><Icono nombre="logo" /></span>
        <h1 className={estilos.titulo}>{esRegistro ? `Crea tu cuenta en ${NOMBRE_APP}` : `Entra a ${NOMBRE_APP}`}</h1>

        <label className="campo">
          <span className="campo-etiqueta">Correo</span>
          <input
            ref={refCorreo}
            className="control"
            type="email"
            autoComplete="email"
            required
            aria-invalid={errores.correo ? true : undefined}
            aria-describedby={errores.correo ? idErrorCorreo : undefined}
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />
          {errores.correo && <span id={idErrorCorreo} className="campo-error">{errores.correo}</span>}
        </label>
        <label className="campo">
          <span className="campo-etiqueta">Contraseña</span>
          <input
            ref={refClave}
            className="control"
            type="password"
            autoComplete={esRegistro ? 'new-password' : 'current-password'}
            required
            minLength={LARGO_MINIMO_CLAVE}
            aria-invalid={errores.clave ? true : undefined}
            aria-describedby={errores.clave ? idErrorClave : undefined}
            value={clave}
            onChange={(e) => setClave(e.target.value)}
          />
          {errores.clave && <span id={idErrorClave} className="campo-error">{errores.clave}</span>}
        </label>

        {falloAcceso && <p className="campo-error" role="alert">{falloAcceso}</p>}
        <p className={estilos.mensaje} role="status">{aviso}</p>

        <button type="submit" className="boton boton-primario" disabled={enviando}>
          {enviando ? 'Un momento…' : esRegistro ? 'Crear cuenta' : 'Entrar'}
        </button>
        <button type="button" className="boton boton-fantasma" onClick={cambiarModo}>
          {esRegistro ? 'Ya tengo cuenta' : 'Crear una cuenta nueva'}
        </button>
      </form>
    </main>
  );
}
