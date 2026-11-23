import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { PanelDeslizante } from '../../PanelDeslizante/PanelDeslizante';
import { useNegocio } from '../../../estado/Negocio';
import { usePaneles, type PropiedadesPanel } from '../../../estado/Paneles';
import { mensajeDeError, useAvisos } from '../../../estado/Avisos';
import { crearId } from '../../../datos/fuente';
import { useFormateadorMoneda } from '../../../hooks/useFormateadorMoneda';
import { ChipEstadoVenta } from '../../ChipEstadoVenta/ChipEstadoVenta';
import { formatearFecha } from '../../../utilidades/formato';
import { redondear } from '../../../utilidades/calculos';
import estilos from './PanelCliente.module.css';

const ULTIMAS_VENTAS = 5;
const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Borrador {
  nombre: string;
  correo: string;
  telefono: string;
  notas: string;
}

type Errores = Partial<Record<keyof Borrador, string>>;

const BORRADOR_VACIO: Borrador = { nombre: '', correo: '', telefono: '', notas: '' };

function validar(b: Borrador): Errores {
  const errores: Errores = {};
  if (!b.nombre.trim()) errores.nombre = 'Escribe el nombre del cliente.';
  if (b.correo.trim() && !FORMATO_CORREO.test(b.correo.trim())) errores.correo = 'Escribe un correo válido, por ejemplo nombre@correo.com.';
  return errores;
}

// Panel para crear o editar un cliente, con el resumen de sus compras
export function PanelCliente({ abierto, id, onCerrado }: PropiedadesPanel) {
  const { datos, puedeEditar, guardarCliente } = useNegocio();
  const { cerrarPanel, abrirPanel } = usePaneles();
  const { avisar } = useAvisos();
  const idFormulario = useId();
  const formularioRef = useRef<HTMLFormElement>(null);
  const [borrador, setBorrador] = useState<Borrador>(BORRADOR_VACIO);
  const [errores, setErrores] = useState<Errores>({});
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState('');

  const cliente = id ? datos.clientes.find((c) => c.id === id) : undefined;
  const noExiste = Boolean(id) && !cliente;
  const editable = puedeEditar('clientes');
  const formatearMonto = useFormateadorMoneda();

  // Ventas del cliente, de la más reciente a la más antigua
  const ventas = useMemo(
    () => (id ? datos.ventas.filter((v) => v.clienteId === id).sort((a, b) => b.fecha.localeCompare(a.fecha)) : []),
    [datos.ventas, id],
  );
  const totalComprado = redondear(ventas.reduce((suma, v) => suma + v.total, 0));

  // Carga el borrador cada vez que se abre el panel
  useEffect(() => {
    if (!abierto) return;
    setErrores({});
    setErrorGuardado('');
    setBorrador(cliente ? { nombre: cliente.nombre, correo: cliente.correo, telefono: cliente.telefono, notas: cliente.notas } : BORRADOR_VACIO);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, id]);

  function cambiar(campo: keyof Borrador, valor: string) {
    setBorrador((previo) => ({ ...previo, [campo]: valor }));
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const encontrados = validar(borrador);
    setErrores(encontrados);
    const primero = Object.keys(encontrados)[0];
    if (primero) {
      (formularioRef.current?.elements.namedItem(primero) as HTMLElement | null)?.focus();
      return;
    }
    setErrorGuardado('');
    setGuardando(true);
    try {
      await guardarCliente({
        id: id ?? crearId(),
        nombre: borrador.nombre.trim(),
        correo: borrador.correo.trim(),
        telefono: borrador.telefono.trim(),
        notas: borrador.notas.trim(),
        creadoEn: cliente?.creadoEn ?? new Date().toISOString(),
      });
      avisar('Cliente guardado');
      cerrarPanel();
    } catch (error) {
      setErrorGuardado(mensajeDeError(error));
    } finally {
      setGuardando(false);
    }
  }

  const pie = noExiste ? (
    <button type="button" className="boton boton-secundario" onClick={cerrarPanel}>Cerrar</button>
  ) : (
    <>
      <button type="button" className="boton boton-secundario" onClick={cerrarPanel}>Cancelar</button>
      {editable && (
        <button type="submit" form={idFormulario} className="boton boton-primario" disabled={guardando}>Guardar</button>
      )}
    </>
  );

  const atributos = (campo: keyof Borrador) => ({
    id: `${idFormulario}-${campo}`,
    name: campo,
    'aria-invalid': errores[campo] ? true : undefined,
    'aria-describedby': errores[campo] ? `${idFormulario}-${campo}-error` : undefined,
  });
  const mensaje = (campo: keyof Borrador) =>
    errores[campo] ? <p id={`${idFormulario}-${campo}-error`} className="campo-error">{errores[campo]}</p> : null;

  return (
    <PanelDeslizante abierto={abierto} titulo={id ? 'Editar cliente' : 'Nuevo cliente'} onCerrado={onCerrado} pie={pie}>
      {noExiste ? (
        <p className="texto-secundario">Este cliente ya no existe.</p>
      ) : (
        <>
          <form id={idFormulario} ref={formularioRef} className="formulario" noValidate onSubmit={enviar}>
            <fieldset className={estilos.campos} disabled={!editable}>
              <div className="campo">
                <label className="campo-etiqueta" htmlFor={`${idFormulario}-nombre`}>Nombre</label>
                <input {...atributos('nombre')} className="control" type="text" autoComplete="off" value={borrador.nombre} onChange={(e) => cambiar('nombre', e.target.value)} />
                {mensaje('nombre')}
              </div>
              <div className="fila-campos">
                <div className="campo">
                  <label className="campo-etiqueta" htmlFor={`${idFormulario}-correo`}>Correo</label>
                  <input {...atributos('correo')} className="control" type="email" autoComplete="off" value={borrador.correo} onChange={(e) => cambiar('correo', e.target.value)} />
                  {mensaje('correo')}
                </div>
                <div className="campo">
                  <label className="campo-etiqueta" htmlFor={`${idFormulario}-telefono`}>Teléfono</label>
                  <input {...atributos('telefono')} className="control" type="tel" autoComplete="off" value={borrador.telefono} onChange={(e) => cambiar('telefono', e.target.value)} />
                </div>
              </div>
              <div className="campo">
                <label className="campo-etiqueta" htmlFor={`${idFormulario}-notas`}>Notas</label>
                <textarea {...atributos('notas')} className="control" value={borrador.notas} onChange={(e) => cambiar('notas', e.target.value)} />
              </div>
            </fieldset>
            {errorGuardado && <p className="campo-error" role="alert">{errorGuardado}</p>}
          </form>

          {id && (
            <section className={estilos.resumen} aria-labelledby={`${idFormulario}-compras`}>
              <h3 id={`${idFormulario}-compras`} className={estilos.subtitulo}>Compras</h3>
              <dl className={estilos.cifras}>
                <div>
                  <dt className="texto-secundario">Ventas</dt>
                  <dd className="monto">{ventas.length}</dd>
                </div>
                <div>
                  <dt className="texto-secundario">Total comprado</dt>
                  <dd className="monto">{formatearMonto(totalComprado)}</dd>
                </div>
              </dl>
              {ventas.length === 0 ? (
                <p className="texto-secundario">Este cliente aún no tiene compras.</p>
              ) : (
                <ul className={estilos.lista}>
                  {ventas.slice(0, ULTIMAS_VENTAS).map((venta) => (
                    <li key={venta.id} className={estilos.venta}>
                      <button type="button" className={`boton boton-fantasma boton-pequeno ${estilos.enlace}`} onClick={() => abrirPanel('venta', venta.id)}>
                        #{venta.numero}
                      </button>
                      <span className="texto-secundario">{formatearFecha(venta.fecha)}</span>
                      <span className={`monto ${estilos.total}`}>{formatearMonto(venta.total)}</span>
                      <ChipEstadoVenta estado={venta.estado} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </PanelDeslizante>
  );
}
