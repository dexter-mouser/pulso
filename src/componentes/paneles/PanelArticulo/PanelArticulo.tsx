import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { PanelDeslizante } from '../../PanelDeslizante/PanelDeslizante';
import { useNegocio } from '../../../estado/Negocio';
import { usePaneles, type PropiedadesPanel } from '../../../estado/Paneles';
import { mensajeDeError, useAvisos } from '../../../estado/Avisos';
import { crearId } from '../../../datos/fuente';
import type { TipoArticulo } from '../../../tipos/negocio';
import estilos from './PanelArticulo.module.css';

const MAX_NOMBRE = 80;

interface Borrador {
  tipo: TipoArticulo;
  nombre: string;
  precio: string;
  costo: string;
  stock: string;
  stockMinimo: string;
}

type Errores = Partial<Record<keyof Borrador, string>>;

const BORRADOR_VACIO: Borrador = { tipo: 'producto', nombre: '', precio: '', costo: '', stock: '0', stockMinimo: '0' };

const OPCIONES_TIPO: { valor: TipoArticulo; titulo: string; descripcion: string }[] = [
  { valor: 'producto', titulo: 'Producto', descripcion: 'Se vende por unidades y lleva control de stock.' },
  { valor: 'servicio', titulo: 'Servicio', descripcion: 'No tiene stock; se vende por cantidad o por hora.' },
];

// Validación de números: vacío permitido solo si no es obligatorio
function validarNumero(texto: string, obligatorio: boolean, entero: boolean, nombre: string): string | undefined {
  if (texto.trim() === '') return obligatorio ? `Ingresa ${nombre}.` : undefined;
  const numero = Number(texto);
  if (!Number.isFinite(numero) || numero < 0) return 'Debe ser un número mayor o igual a 0.';
  if (entero && !Number.isInteger(numero)) return 'Debe ser un número entero.';
  return undefined;
}

function validar(b: Borrador): Errores {
  const candidatos: Errores = {
    nombre: b.nombre.trim() ? undefined : 'Escribe el nombre del artículo.',
    precio: validarNumero(b.precio, true, false, 'el precio de venta'),
    costo: validarNumero(b.costo, false, false, 'el costo'),
  };
  if (b.tipo === 'producto') {
    candidatos.stock = validarNumero(b.stock, true, true, 'el stock actual');
    candidatos.stockMinimo = validarNumero(b.stockMinimo, true, true, 'el stock mínimo');
  }
  const errores: Errores = {};
  for (const clave of Object.keys(candidatos) as (keyof Borrador)[]) {
    const texto = candidatos[clave];
    if (texto) errores[clave] = texto;
  }
  return errores;
}

// Panel para crear o editar un artículo del catálogo
export function PanelArticulo({ abierto, id, onCerrado }: PropiedadesPanel) {
  const { datos, puedeEditar, guardarArticulo } = useNegocio();
  const { cerrarPanel } = usePaneles();
  const { avisar } = useAvisos();
  const idFormulario = useId();
  const formularioRef = useRef<HTMLFormElement>(null);
  const [borrador, setBorrador] = useState<Borrador>(BORRADOR_VACIO);
  const [errores, setErrores] = useState<Errores>({});
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState('');

  const articulo = id ? datos.articulos.find((a) => a.id === id) : undefined;
  const noExiste = Boolean(id) && !articulo;
  const editable = puedeEditar('productos');

  // Carga el borrador cada vez que se abre el panel
  useEffect(() => {
    if (!abierto) return;
    setErrores({});
    setErrorGuardado('');
    setBorrador(
      articulo
        ? {
            tipo: articulo.tipo,
            nombre: articulo.nombre,
            precio: String(articulo.precio),
            costo: articulo.costo ? String(articulo.costo) : '',
            stock: String(articulo.stock),
            stockMinimo: String(articulo.stockMinimo),
          }
        : BORRADOR_VACIO,
    );
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
    const esProducto = borrador.tipo === 'producto';
    setErrorGuardado('');
    setGuardando(true);
    try {
      await guardarArticulo({
        id: id ?? crearId(),
        tipo: borrador.tipo,
        nombre: borrador.nombre.trim(),
        precio: Number(borrador.precio),
        costo: borrador.costo.trim() === '' ? 0 : Number(borrador.costo),
        stock: esProducto ? Number(borrador.stock) : 0,
        stockMinimo: esProducto ? Number(borrador.stockMinimo) : 0,
        creadoEn: articulo?.creadoEn ?? new Date().toISOString(),
      });
      avisar('Artículo guardado');
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

  // Atributos comunes de accesibilidad por campo
  const atributos = (campo: keyof Borrador) => ({
    id: `${idFormulario}-${campo}`,
    name: campo,
    'aria-invalid': errores[campo] ? true : undefined,
    'aria-describedby': errores[campo] ? `${idFormulario}-${campo}-error` : undefined,
  });
  const mensaje = (campo: keyof Borrador) =>
    errores[campo] ? <p id={`${idFormulario}-${campo}-error`} className="campo-error">{errores[campo]}</p> : null;

  return (
    <PanelDeslizante abierto={abierto} titulo={id ? 'Editar artículo' : 'Nuevo artículo'} onCerrado={onCerrado} pie={pie}>
      {noExiste ? (
        <p className="texto-secundario">Este artículo ya no existe.</p>
      ) : (
        <form id={idFormulario} ref={formularioRef} className="formulario" noValidate onSubmit={enviar}>
          <fieldset className={estilos.grupo} disabled={!editable}>
            <legend className="campo-etiqueta">Tipo</legend>
            <div className={estilos.opciones}>
              {OPCIONES_TIPO.map((opcion) => (
                <label key={opcion.valor} className={estilos.opcion}>
                  <input
                    type="radio"
                    name="tipo"
                    value={opcion.valor}
                    checked={borrador.tipo === opcion.valor}
                    onChange={() => cambiar('tipo', opcion.valor)}
                  />
                  <span>
                    <span className={estilos.opcionTitulo}>{opcion.titulo}</span>
                    <span className="campo-ayuda">{opcion.descripcion}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className={estilos.campos} disabled={!editable}>
            <div className="campo">
              <label className="campo-etiqueta" htmlFor={`${idFormulario}-nombre`}>Nombre</label>
              <input
                {...atributos('nombre')}
                className="control"
                type="text"
                maxLength={MAX_NOMBRE}
                autoComplete="off"
                value={borrador.nombre}
                onChange={(e) => cambiar('nombre', e.target.value)}
              />
              {mensaje('nombre')}
            </div>

            <div className="fila-campos">
              <div className="campo">
                <label className="campo-etiqueta" htmlFor={`${idFormulario}-precio`}>Precio de venta</label>
                <input
                  {...atributos('precio')}
                  className="control"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.01}
                  value={borrador.precio}
                  onChange={(e) => cambiar('precio', e.target.value)}
                />
                {mensaje('precio')}
              </div>
              <div className="campo">
                <label className="campo-etiqueta" htmlFor={`${idFormulario}-costo`}>Costo (opcional)</label>
                <input
                  {...atributos('costo')}
                  className="control"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.01}
                  value={borrador.costo}
                  onChange={(e) => cambiar('costo', e.target.value)}
                />
                {errores.costo ? mensaje('costo') : <p className="campo-ayuda">Para calcular el margen</p>}
              </div>
            </div>

            {borrador.tipo === 'producto' && (
              <div className="fila-campos">
                <div className="campo">
                  <label className="campo-etiqueta" htmlFor={`${idFormulario}-stock`}>Stock actual</label>
                  <input
                    {...atributos('stock')}
                    className="control"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={borrador.stock}
                    onChange={(e) => cambiar('stock', e.target.value)}
                  />
                  {mensaje('stock')}
                </div>
                <div className="campo">
                  <label className="campo-etiqueta" htmlFor={`${idFormulario}-stockMinimo`}>Stock mínimo</label>
                  <input
                    {...atributos('stockMinimo')}
                    className="control"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={borrador.stockMinimo}
                    onChange={(e) => cambiar('stockMinimo', e.target.value)}
                  />
                  {errores.stockMinimo ? mensaje('stockMinimo') : <p className="campo-ayuda">Avisa cuando el stock llega a este número</p>}
                </div>
              </div>
            )}
          </fieldset>
          {errorGuardado && <p className="campo-error" role="alert">{errorGuardado}</p>}
        </form>
      )}
    </PanelDeslizante>
  );
}
