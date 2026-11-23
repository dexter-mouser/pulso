import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { PanelDeslizante } from '../../PanelDeslizante/PanelDeslizante';
import { useNegocio } from '../../../estado/Negocio';
import { usePaneles, type PropiedadesPanel } from '../../../estado/Paneles';
import { useAvisos, mensajeDeError } from '../../../estado/Avisos';
import { ETIQUETAS_METODO, LOCALE } from '../../../config';
import { formatearFechaHora } from '../../../utilidades/formato';
import { calcularTotales } from '../../../utilidades/calculos';
import type { Articulo, EstadoVenta, LineaVenta, MetodoPago } from '../../../tipos/negocio';
import { AgregarLinea } from './AgregarLinea';
import { ListaLineas } from './ListaLineas';
import { TotalesVenta } from './TotalesVenta';
import estilos from './PanelVenta.module.css';

const METODO_INICIAL: MetodoPago = 'efectivo';
const ESTADO_INICIAL: EstadoVenta = 'pagada';

// Panel para registrar una venta nueva o ver y editar una existente
export function PanelVenta({ abierto, id, onCerrado }: PropiedadesPanel) {
  const { datos, puedeEditar, registrarVenta, actualizarVenta } = useNegocio();
  const { cerrarPanel } = usePaneles();
  const { avisar } = useAvisos();
  const idFormulario = useId();

  const venta = id ? datos.ventas.find((item) => item.id === id) : undefined;
  const esNueva = !id;
  const soloLectura = !puedeEditar('ventas');
  const lineasBloqueadas = !esNueva || soloLectura;

  const [clienteId, setClienteId] = useState('');
  const [lineas, setLineas] = useState<LineaVenta[]>([]);
  const [estado, setEstado] = useState<EstadoVenta>(ESTADO_INICIAL);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(METODO_INICIAL);
  const [notas, setNotas] = useState('');
  // Cambia al abrir para reiniciar el selector de artículo
  const [version, setVersion] = useState(0);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const impuesto = esNueva ? datos.ajustes.impuesto : (venta?.impuestoPorcentaje ?? 0);
  const totales = calcularTotales(lineas, impuesto);
  const clientes = useMemo(() => [...datos.clientes].sort((a, b) => a.nombre.localeCompare(b.nombre, LOCALE)), [datos.clientes]);
  const articulos = useMemo(() => [...datos.articulos].sort((a, b) => a.nombre.localeCompare(b.nombre, LOCALE)), [datos.articulos]);

  // Carga o reinicia el formulario al abrir el panel
  useEffect(() => {
    if (!abierto) return;
    setClienteId(venta?.clienteId ?? '');
    setLineas(venta ? venta.lineas.map((linea) => ({ ...linea })) : []);
    setEstado(venta?.estado ?? ESTADO_INICIAL);
    setMetodoPago(venta?.metodoPago ?? METODO_INICIAL);
    setNotas(venta?.notas ?? '');
    setVersion((v) => v + 1);
    setError('');
    setGuardando(false);
    // Solo al abrir o cambiar de venta, no cuando cambian los datos
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, id]);

  // Stock máximo vendible de un artículo (sin límite para servicios)
  function limiteDe(idArticulo: string): number {
    const articulo = datos.articulos.find((item) => item.id === idArticulo);
    return articulo?.tipo === 'producto' ? articulo.stock : Infinity;
  }

  // Líneas
  function agregarLinea(articulo: Articulo, cantidad: number) {
    setError('');
    const existente = lineas.find((linea) => linea.articuloId === articulo.id);
    if (existente) {
      setLineas(lineas.map((linea) => (linea.articuloId === articulo.id ? { ...linea, cantidad: linea.cantidad + cantidad } : linea)));
    } else {
      setLineas([...lineas, { articuloId: articulo.id, nombre: articulo.nombre, tipo: articulo.tipo, cantidad, precio: articulo.precio }]);
    }
  }

  function cambiarLinea(idArticulo: string, cambios: Partial<LineaVenta>) {
    setLineas(lineas.map((linea) => (linea.articuloId === idArticulo ? { ...linea, ...cambios } : linea)));
  }

  function quitarLinea(idArticulo: string) {
    setLineas(lineas.filter((linea) => linea.articuloId !== idArticulo));
  }

  function lineaExcedeStock(linea: LineaVenta): boolean {
    return esNueva && linea.cantidad > limiteDe(linea.articuloId);
  }

  // Envío
  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (soloLectura || guardando) return;
    if (lineas.length === 0) return setError('Agrega al menos un artículo.');
    if (lineas.some(lineaExcedeStock)) return setError('Hay artículos que superan el stock disponible.');
    if (lineas.some((linea) => !Number.isFinite(linea.precio) || linea.precio < 0)) return setError('Los precios no pueden ser negativos.');

    setError('');
    setGuardando(true);
    try {
      if (venta) {
        await actualizarVenta({ ...venta, clienteId: clienteId || null, estado, metodoPago, notas: notas.trim() });
        avisar(`Venta #${venta.numero} actualizada`);
      } else {
        const creada = await registrarVenta({ clienteId: clienteId || null, lineas, estado, metodoPago, notas: notas.trim() });
        avisar(`Venta #${creada.numero} registrada`);
      }
      cerrarPanel();
    } catch (fallo) {
      setError(mensajeDeError(fallo));
      setGuardando(false);
    }
  }

  const vendedor = venta ? (datos.miembros.find((miembro) => miembro.id === venta.vendedorId)?.nombre ?? 'Miembro eliminado') : '';
  const titulo = esNueva ? 'Nueva venta' : venta ? `Venta #${venta.numero}` : 'Venta';
  const descripcion = venta ? `${formatearFechaHora(venta.fecha)} · Vendedor: ${vendedor}` : undefined;

  const pie = (esNueva || venta) && (
    <>
      <button type="button" className="boton boton-secundario" onClick={cerrarPanel}>
        {soloLectura ? 'Cerrar' : 'Cancelar'}
      </button>
      {!soloLectura && (
        <button type="submit" form={idFormulario} className="boton boton-primario" disabled={guardando}>
          {guardando ? 'Guardando…' : esNueva ? 'Registrar venta' : 'Guardar cambios'}
        </button>
      )}
    </>
  );

  if (!esNueva && !venta) {
    return (
      <PanelDeslizante abierto={abierto} titulo="Venta" onCerrado={onCerrado}>
        <p className="texto-secundario">Esta venta ya no existe</p>
      </PanelDeslizante>
    );
  }

  return (
    <PanelDeslizante abierto={abierto} titulo={titulo} descripcion={descripcion} onCerrado={onCerrado} pie={pie}>
      <form id={idFormulario} className="formulario" onSubmit={guardar} noValidate>
        <div className="campo">
          <label className="campo-etiqueta" htmlFor={`${idFormulario}-cliente`}>Cliente</label>
          <select id={`${idFormulario}-cliente`} className="control" value={clienteId} disabled={soloLectura} onChange={(e) => setClienteId(e.target.value)}>
            <option value="">Sin cliente</option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>
            ))}
          </select>
        </div>

        <fieldset className={estilos.lineas}>
          <legend className="campo-etiqueta">Artículos</legend>
          {!lineasBloqueadas && (
            <AgregarLinea key={version} articulos={articulos} lineas={lineas} limiteDe={limiteDe} onAgregar={agregarLinea} />
          )}
          <ListaLineas lineas={lineas} bloqueadas={lineasBloqueadas} esNueva={esNueva} limiteDe={limiteDe} onCambiar={cambiarLinea} onQuitar={quitarLinea} />
        </fieldset>

        <div className="fila-campos">
          <div className="campo">
            <label className="campo-etiqueta" htmlFor={`${idFormulario}-metodo`}>Método de pago</label>
            <select id={`${idFormulario}-metodo`} className="control" value={metodoPago} disabled={soloLectura} onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}>
              {(Object.keys(ETIQUETAS_METODO) as MetodoPago[]).map((metodo) => (
                <option key={metodo} value={metodo}>{ETIQUETAS_METODO[metodo]}</option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label className="campo-etiqueta" htmlFor={`${idFormulario}-estado`}>Estado</label>
            <select id={`${idFormulario}-estado`} className="control" value={estado} disabled={soloLectura} onChange={(e) => setEstado(e.target.value as EstadoVenta)}>
              <option value="pagada">Pagada</option>
              <option value="pendiente">Pendiente de cobro</option>
            </select>
          </div>
        </div>

        <div className="campo">
          <label className="campo-etiqueta" htmlFor={`${idFormulario}-notas`}>Notas (opcional)</label>
          <textarea id={`${idFormulario}-notas`} className="control" rows={3} value={notas} readOnly={soloLectura} onChange={(e) => setNotas(e.target.value)} />
        </div>

        <TotalesVenta subtotal={totales.subtotal} impuesto={totales.impuesto} porcentajeImpuesto={impuesto} total={totales.total} />

        {error && <p className="campo-error" role="alert">{error}</p>}
      </form>
    </PanelDeslizante>
  );
}
