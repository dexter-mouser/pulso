import { useMemo, useRef, useState } from 'react';
import { useNegocio } from '../../estado/Negocio';
import { usePaneles } from '../../estado/Paneles';
import { EncabezadoVista } from '../../componentes/EncabezadoVista/EncabezadoVista';
import { CampoBusqueda } from '../../componentes/CampoBusqueda/CampoBusqueda';
import { Tabla, type Columna } from '../../componentes/Tabla/Tabla';
import { EstadoVacio } from '../../componentes/EstadoVacio/EstadoVacio';
import { Icono } from '../../componentes/Icono/Icono';
import { ChipEstadoVenta } from '../../componentes/ChipEstadoVenta/ChipEstadoVenta';
import { useAccionConAviso } from '../../hooks/useAccionConAviso';
import { useFormateadorMoneda } from '../../hooks/useFormateadorMoneda';
import { cobrosPendientes, nombreCliente, plural } from '../../utilidades/negocio';
import { ETIQUETAS_METODO } from '../../config';
import { formatearFechaHora, normalizar } from '../../utilidades/formato';
import { estaEnMes, inicioDeMes, redondear } from '../../utilidades/calculos';
import type { Venta } from '../../tipos/negocio';
import estilos from './Ventas.module.css';

type FiltroEstado = 'todas' | 'pagada' | 'pendiente';
type FiltroPeriodo = 'este' | 'anterior' | 'todo';

// Resumen de artículos de una venta: «Café ×2, Corte ×1»
function resumirArticulos(venta: Venta): string {
  return venta.lineas.map((linea) => `${linea.nombre} ×${linea.cantidad}`).join(', ');
}

// Vista de listado de ventas con filtros y acciones por fila
export function Ventas() {
  const { datos, puedeEditar, actualizarVenta, borrarVenta } = useNegocio();
  const { abrirPanel } = usePaneles();
  const ejecutar = useAccionConAviso();
  const tarjetaRef = useRef<HTMLElement>(null);
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState<FiltroEstado>('todas');
  const [periodo, setPeriodo] = useState<FiltroPeriodo>('este');

  const puedeEditarVentas = puedeEditar('ventas');
  const formatearMoneda = useFormateadorMoneda();

  const descripcion = useMemo(() => {
    const mes = inicioDeMes(new Date());
    const delMes = datos.ventas.filter((venta) => estaEnMes(venta.fecha, mes)).length;
    const porCobrar = redondear(
      cobrosPendientes(datos.ventas).reduce((suma, venta) => suma + venta.total, 0),
    );
    return `${plural(delMes, 'venta', 'ventas')} este mes · ${formatearMoneda(porCobrar)} por cobrar`;
  }, [datos.ventas, formatearMoneda]);

  // Filtros y orden (más reciente primero)
  const filas = useMemo(() => {
    const texto = normalizar(busqueda.trim());
    const mesBuscado = inicioDeMes(new Date(), periodo === 'anterior' ? -1 : 0);
    return datos.ventas
      .filter((venta) => estado === 'todas' || venta.estado === estado)
      .filter((venta) => periodo === 'todo' || estaEnMes(venta.fecha, mesBuscado))
      .filter((venta) => {
        if (!texto) return true;
        const campos = [String(venta.numero), nombreCliente(venta, datos.clientes), ...venta.lineas.map((linea) => linea.nombre)];
        return campos.some((campo) => normalizar(campo).includes(texto));
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [datos.ventas, datos.clientes, busqueda, estado, periodo]);

  // Tras la acción la fila desaparece o cambia: el foco pasa a la tarjeta
  async function marcarPagada(venta: Venta) {
    const hecho = await ejecutar(() => actualizarVenta({ ...venta, estado: 'pagada' }), `Venta #${venta.numero} marcada como pagada`);
    if (hecho) tarjetaRef.current?.focus();
  }

  async function borrar(venta: Venta) {
    const hecho = await ejecutar(
      () => borrarVenta(venta.id),
      `Venta #${venta.numero} borrada`,
      `¿Borrar la venta #${venta.numero}? Se devolverá el stock.`,
    );
    if (hecho) tarjetaRef.current?.focus();
  }

  const botonNueva = puedeEditarVentas ? (
    <button type="button" className="boton boton-primario" onClick={() => abrirPanel('venta')}>
      <Icono nombre="mas" tamano="pequeno" />
      Nueva venta
    </button>
  ) : undefined;

  const columnas: Columna<Venta>[] = [
    { clave: 'numero', titulo: 'Nº', celda: (venta) => <span className="monto">#{venta.numero}</span> },
    { clave: 'fecha', titulo: 'Fecha', celda: (venta) => formatearFechaHora(venta.fecha) },
    { clave: 'cliente', titulo: 'Cliente', celda: (venta) => nombreCliente(venta, datos.clientes) },
    {
      clave: 'articulos',
      titulo: 'Artículos',
      secundaria: true,
      celda: (venta) => <span className={`${estilos.articulos} texto-secundario`} title={resumirArticulos(venta)}>{resumirArticulos(venta)}</span>,
    },
    { clave: 'metodo', titulo: 'Método', secundaria: true, celda: (venta) => ETIQUETAS_METODO[venta.metodoPago] },
    { clave: 'total', titulo: 'Total', alinear: 'fin', celda: (venta) => <span className="monto">{formatearMoneda(venta.total)}</span> },
    {
      clave: 'estado',
      titulo: 'Estado',
      celda: (venta) => <ChipEstadoVenta estado={venta.estado} />,
    },
  ];

  function acciones(venta: Venta) {
    const textoVer = puedeEditarVentas ? 'Ver o editar' : 'Ver';
    return (
      <>
        {puedeEditarVentas && venta.estado === 'pendiente' && (
          <button type="button" className="boton-icono boton-mini" aria-label={`Marcar pagada la venta #${venta.numero}`} title="Marcar pagada" onClick={() => marcarPagada(venta)}>
            <Icono nombre="check" tamano="pequeno" />
          </button>
        )}
        <button type="button" className="boton-icono boton-mini" aria-label={`${textoVer} la venta #${venta.numero}`} title={textoVer} onClick={() => abrirPanel('venta', venta.id)}>
          <Icono nombre="lapiz" tamano="pequeno" />
        </button>
        {puedeEditarVentas && (
          <button type="button" className="boton-icono boton-mini" aria-label={`Borrar la venta #${venta.numero}`} title="Borrar" onClick={() => borrar(venta)}>
            <Icono nombre="basura" tamano="pequeno" />
          </button>
        )}
      </>
    );
  }

  const vacio =
    datos.ventas.length === 0 ? (
      <EstadoVacio icono="carrito" titulo="Aún no hay ventas" texto="Registra tu primera venta para verla aquí." accion={botonNueva} />
    ) : (
      <EstadoVacio icono="buscar" titulo="Sin resultados" texto="Prueba con otra búsqueda o cambia los filtros." />
    );

  return (
    <>
      <EncabezadoVista titulo="Ventas" descripcion={descripcion} acciones={botonNueva} />
      <div className={`${estilos.herramientas} animable`}>
        <CampoBusqueda valor={busqueda} onCambiar={setBusqueda} etiqueta="Buscar ventas" placeholder="Número, cliente o artículo" />
        <label>
          <span className="solo-lector">Filtrar por estado</span>
          <select className="control" value={estado} onChange={(evento) => setEstado(evento.target.value as FiltroEstado)}>
            <option value="todas">Todas</option>
            <option value="pagada">Pagadas</option>
            <option value="pendiente">Pendientes</option>
          </select>
        </label>
        <label>
          <span className="solo-lector">Filtrar por periodo</span>
          <select className="control" value={periodo} onChange={(evento) => setPeriodo(evento.target.value as FiltroPeriodo)}>
            <option value="este">Este mes</option>
            <option value="anterior">Mes anterior</option>
            <option value="todo">Todo</option>
          </select>
        </label>
      </div>
      <p className="solo-lector" role="status" aria-live="polite">{plural(filas.length, 'resultado', 'resultados')}</p>
      <section ref={tarjetaRef} tabIndex={-1} aria-label="Ventas" className={`${estilos.tarjeta} animable`}>
        <Tabla filas={filas} columnas={columnas} obtenerId={(venta) => venta.id} titulo="Listado de ventas" vacio={vacio} acciones={acciones} />
      </section>
    </>
  );
}
