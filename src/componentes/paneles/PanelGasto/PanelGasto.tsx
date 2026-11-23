import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { PanelDeslizante } from '../../PanelDeslizante/PanelDeslizante';
import { ETIQUETAS_CATEGORIA, ETIQUETAS_METODO } from '../../../config';
import { crearId } from '../../../datos/fuente';
import { mensajeDeError, useAvisos } from '../../../estado/Avisos';
import { useNegocio } from '../../../estado/Negocio';
import { usePaneles, type PropiedadesPanel } from '../../../estado/Paneles';
import type { CategoriaGasto, Gasto, MetodoPago } from '../../../tipos/negocio';
import { fechaParaCampo } from '../../../utilidades/formato';
import estilos from './PanelGasto.module.css';

const MAXIMO_CONCEPTO = 80;
const MONTO_MINIMO = 0.01;
const CAMPOS_VALIDADOS = ['concepto', 'monto', 'fecha'] as const;

type CampoGasto = (typeof CAMPOS_VALIDADOS)[number];
type Errores = Partial<Record<CampoGasto, string>>;

// Fecha del campo (AAAA-MM-DD) a ISO del día local a las 12:00; null si no es válida
function fechaAIso(valor: string): string | null {
  const [anio, mes, dia] = valor.split('-').map(Number);
  if (!anio || !mes || !dia) return null;
  // setFullYear evita que los años de dos dígitos se lean como 19xx
  const fecha = new Date(2000, mes - 1, dia, 12);
  fecha.setFullYear(anio);
  if (fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) return null;
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
}

// Panel para crear o editar un gasto
export function PanelGasto({ abierto, id, onCerrado }: PropiedadesPanel) {
  const { datos, puedeEditar, guardarGasto } = useNegocio();
  const { cerrarPanel } = usePaneles();
  const { avisar } = useAvisos();
  const idFormulario = useId();
  const refs = {
    concepto: useRef<HTMLInputElement>(null),
    monto: useRef<HTMLInputElement>(null),
    fecha: useRef<HTMLInputElement>(null),
  };

  const gasto = id ? datos.gastos.find((g) => g.id === id) : undefined;
  const noExiste = Boolean(id) && !gasto;
  const editable = puedeEditar('gastos');

  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(fechaParaCampo());
  const [categoria, setCategoria] = useState<CategoriaGasto>('otros');
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo');
  const [notas, setNotas] = useState('');
  const [errores, setErrores] = useState<Errores>({});
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState('');

  // Carga los valores cada vez que se abre el panel o cambia el registro
  useEffect(() => {
    if (!abierto) return;
    setConcepto(gasto?.concepto ?? '');
    setMonto(gasto ? String(gasto.monto) : '');
    setFecha(fechaParaCampo(gasto ? new Date(gasto.fecha) : new Date()));
    setCategoria(gasto?.categoria ?? 'otros');
    setMetodo(gasto?.metodoPago ?? 'efectivo');
    setNotas(gasto?.notas ?? '');
    setErrores({});
    setErrorGuardado('');
    setGuardando(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, id]);

  // Monto con dos decimales, como se guarda
  function montoRedondeado(): number {
    return Math.round(Number(monto) * 100) / 100;
  }

  function validar(): Errores {
    const nuevos: Errores = {};
    if (!concepto.trim()) nuevos.concepto = 'Escribe el concepto del gasto.';
    else if (concepto.trim().length > MAXIMO_CONCEPTO) nuevos.concepto = `Máximo ${MAXIMO_CONCEPTO} caracteres.`;
    const numero = montoRedondeado();
    if (monto === '' || !Number.isFinite(numero) || numero < MONTO_MINIMO) nuevos.monto = 'Ingresa un monto de al menos 0,01.';
    if (!fechaAIso(fecha)) nuevos.fecha = 'Selecciona una fecha válida.';
    return nuevos;
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (!editable || guardando) return;
    const nuevos = validar();
    setErrores(nuevos);
    const primero = CAMPOS_VALIDADOS.find((campo) => nuevos[campo]);
    if (primero) {
      refs[primero].current?.focus();
      return;
    }
    const registro: Gasto = {
      id: id ?? crearId(),
      concepto: concepto.trim(),
      monto: montoRedondeado(),
      fecha: fechaAIso(fecha) as string,
      categoria,
      metodoPago: metodo,
      notas: notas.trim(),
      creadoEn: gasto?.creadoEn ?? new Date().toISOString(),
    };
    setErrorGuardado('');
    setGuardando(true);
    try {
      await guardarGasto(registro);
      avisar('Gasto guardado');
      cerrarPanel();
    } catch (error) {
      setErrorGuardado(mensajeDeError(error));
      setGuardando(false);
    }
  }

  const idError = (campo: CampoGasto) => `${idFormulario}-${campo}-error`;
  const propiedadesError = (campo: CampoGasto) => ({
    'aria-invalid': errores[campo] ? true : undefined,
    'aria-describedby': errores[campo] ? idError(campo) : undefined,
  });

  const pie = !noExiste && editable ? (
    <>
      <button type="button" className="boton boton-secundario" onClick={cerrarPanel}>Cancelar</button>
      <button type="submit" form={idFormulario} className="boton boton-primario" disabled={guardando}>Guardar</button>
    </>
  ) : undefined;

  return (
    <PanelDeslizante
      abierto={abierto}
      titulo={id ? 'Editar gasto' : 'Registrar gasto'}
      descripcion={editable ? undefined : 'Solo lectura: tu rol no permite editar gastos.'}
      onCerrado={onCerrado}
      pie={pie}
    >
      {noExiste ? (
        <p className="texto-secundario">Este gasto ya no existe.</p>
      ) : (
        <form id={idFormulario} className="formulario" onSubmit={guardar} noValidate>
          <fieldset className={estilos.grupo} disabled={!editable || guardando}>
            <div className="campo">
              <label className="campo-etiqueta" htmlFor={`${idFormulario}-concepto`}>Concepto</label>
              <input
                ref={refs.concepto}
                id={`${idFormulario}-concepto`}
                className="control"
                value={concepto}
                maxLength={MAXIMO_CONCEPTO}
                onChange={(e) => setConcepto(e.target.value)}
                {...propiedadesError('concepto')}
              />
              {errores.concepto && <p id={idError('concepto')} className="campo-error">{errores.concepto}</p>}
            </div>
            <div className="fila-campos">
              <div className="campo">
                <label className="campo-etiqueta" htmlFor={`${idFormulario}-monto`}>Monto</label>
                <input
                  ref={refs.monto}
                  id={`${idFormulario}-monto`}
                  className="control"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  {...propiedadesError('monto')}
                />
                {errores.monto && <p id={idError('monto')} className="campo-error">{errores.monto}</p>}
              </div>
              <div className="campo">
                <label className="campo-etiqueta" htmlFor={`${idFormulario}-fecha`}>Fecha</label>
                <input
                  ref={refs.fecha}
                  id={`${idFormulario}-fecha`}
                  className="control"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  {...propiedadesError('fecha')}
                />
                {errores.fecha && <p id={idError('fecha')} className="campo-error">{errores.fecha}</p>}
              </div>
            </div>
            <div className="fila-campos">
              <div className="campo">
                <label className="campo-etiqueta" htmlFor={`${idFormulario}-categoria`}>Categoría</label>
                <select id={`${idFormulario}-categoria`} className="control" value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaGasto)}>
                  {(Object.keys(ETIQUETAS_CATEGORIA) as CategoriaGasto[]).map((clave) => (
                    <option key={clave} value={clave}>{ETIQUETAS_CATEGORIA[clave]}</option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label className="campo-etiqueta" htmlFor={`${idFormulario}-metodo`}>Método de pago</label>
                <select id={`${idFormulario}-metodo`} className="control" value={metodo} onChange={(e) => setMetodo(e.target.value as MetodoPago)}>
                  {(Object.keys(ETIQUETAS_METODO) as MetodoPago[]).map((clave) => (
                    <option key={clave} value={clave}>{ETIQUETAS_METODO[clave]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="campo">
              <label className="campo-etiqueta" htmlFor={`${idFormulario}-notas`}>Notas</label>
              <textarea id={`${idFormulario}-notas`} className="control" value={notas} onChange={(e) => setNotas(e.target.value)} />
            </div>
          </fieldset>
          {errorGuardado && <p className="campo-error" role="alert">{errorGuardado}</p>}
        </form>
      )}
    </PanelDeslizante>
  );
}
