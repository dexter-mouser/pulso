import { useRef, useState } from 'react';
import { EncabezadoVista } from '../../componentes/EncabezadoVista/EncabezadoVista';
import { EstadoVacio } from '../../componentes/EstadoVacio/EstadoVacio';
import { Icono } from '../../componentes/Icono/Icono';
import { TarjetaKpi } from '../../componentes/TarjetaKpi/TarjetaKpi';
import { ChipEstadoVenta } from '../../componentes/ChipEstadoVenta/ChipEstadoVenta';
import { useAccionConAviso } from '../../hooks/useAccionConAviso';
import { useFormateadorMoneda } from '../../hooks/useFormateadorMoneda';
import { useNegocio } from '../../estado/Negocio';
import { usePaneles } from '../../estado/Paneles';
import type { Venta } from '../../tipos/negocio';
import { estaEnMes, inicioDeMes, resumirMes, variacion } from '../../utilidades/calculos';
import { crearFormateador, formatearFechaHora, formatearMes, saludoSegunHora } from '../../utilidades/formato';
import { articulosConPocoStock, cobrosPendientes, nombreCliente } from '../../utilidades/negocio';
import estilos from './Resumen.module.css';

const ULTIMAS_VENTAS = 5;
const MAXIMO_AVISOS = 6;
const formatearEntero = crearFormateador(0);

export function Resumen() {
  const { datos, miembroActivo, puedeEditar, actualizarVenta } = useNegocio();
  const { abrirPanel } = usePaneles();
  const ejecutar = useAccionConAviso();
  const tituloAtencionRef = useRef<HTMLHeadingElement>(null);
  const [saludo] = useState(() => saludoSegunHora(new Date().getHours()));
  const formatearMoneda = useFormateadorMoneda();

  // Indicadores del mes frente al anterior
  const mes = inicioDeMes(new Date());
  const mesAnterior = inicioDeMes(new Date(), -1);
  const actual = resumirMes(datos.ventas, datos.gastos, mes);
  const anterior = resumirMes(datos.ventas, datos.gastos, mesAnterior);
  const clientesNuevos = datos.clientes.filter((cliente) => estaEnMes(cliente.creadoEn, mes)).length;
  const clientesAnteriores = datos.clientes.filter((cliente) => estaEnMes(cliente.creadoEn, mesAnterior)).length;
  const stockBajo = articulosConPocoStock(datos.articulos);
  const pendientes = cobrosPendientes(datos.ventas);
  const ultimas = [...datos.ventas].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, ULTIMAS_VENTAS);
  const puedeVender = puedeEditar('ventas');

  // La fila desaparece de la lista: el foco pasa al título de la tarjeta
  async function marcarPagada(venta: Venta) {
    const hecho = await ejecutar(() => actualizarVenta({ ...venta, estado: 'pagada' }), `Venta #${venta.numero} marcada como pagada`);
    if (hecho) tituloAtencionRef.current?.focus();
  }

  return (
    <>
      <EncabezadoVista
        titulo={`${saludo}, ${miembroActivo.nombre}`}
        descripcion={`Así va ${datos.ajustes.nombre} en ${formatearMes(mes).toLowerCase()}.`}
        acciones={
          puedeVender && (
            <button type="button" className="boton boton-primario" onClick={() => abrirPanel('venta')}>
              <Icono nombre="mas" tamano="pequeno" />
              Nueva venta
            </button>
          )
        }
      />

      <ul className={estilos.kpis}>
        <TarjetaKpi
          icono="tendencia"
          etiqueta="Cobrado este mes"
          valor={actual.ingresos}
          formatear={formatearMoneda}
          variacion={variacion(actual.ingresos, anterior.ingresos)}
          detalle={actual.porCobrar > 0 ? `${formatearMoneda(actual.porCobrar)} por cobrar` : undefined}
        />
        <TarjetaKpi icono="carrito" etiqueta="Ticket promedio" valor={actual.ticketPromedio} formatear={formatearMoneda} variacion={variacion(actual.ticketPromedio, anterior.ticketPromedio)} />
        <TarjetaKpi icono="usuario" etiqueta="Clientes nuevos" valor={clientesNuevos} formatear={formatearEntero} variacion={variacion(clientesNuevos, clientesAnteriores)} />
        <TarjetaKpi icono="caja" etiqueta="Con poco stock" valor={stockBajo.length} formatear={formatearEntero} />
      </ul>

      <div className={estilos.tarjetas}>
        <section className={`${estilos.tarjeta} animable`} aria-labelledby="titulo-ultimas">
          <header className={estilos.cabecera}>
            <h2 id="titulo-ultimas" className={estilos.titulo}>Últimas ventas</h2>
          </header>
          {ultimas.length === 0 ? (
            <EstadoVacio
              icono="carrito"
              titulo="Aún no hay ventas"
              texto="Cuando registres ventas, las verás aquí."
              accion={puedeVender && (
                <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => abrirPanel('venta')}>
                  Registrar la primera
                </button>
              )}
            />
          ) : (
            <ul className={estilos.lista}>
              {ultimas.map((venta) => (
                <li key={venta.id}>
                  <button type="button" className={estilos.fila} onClick={() => abrirPanel('venta', venta.id)}>
                    <span className={estilos.numero}>#{venta.numero}</span>
                    <span className={estilos.detalle}>
                      <span className={estilos.principal}>{nombreCliente(venta, datos.clientes)}</span>
                      <span className="texto-secundario">{formatearFechaHora(venta.fecha)}</span>
                    </span>
                    <span className="monto">{formatearMoneda(venta.total)}</span>
                    <ChipEstadoVenta estado={venta.estado} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${estilos.tarjeta} animable`} aria-labelledby="titulo-atencion">
          <header className={estilos.cabecera}>
            <h2 id="titulo-atencion" ref={tituloAtencionRef} tabIndex={-1} className={estilos.titulo}>Requiere tu atención</h2>
            {stockBajo.length + pendientes.length > 0 && (
              <span className={estilos.contador}>
                {stockBajo.length + pendientes.length}
                <span className="solo-lector"> avisos</span>
              </span>
            )}
          </header>

          {stockBajo.length + pendientes.length === 0 ? (
            <EstadoVacio icono="check" titulo="Todo al día" texto="No hay cobros pendientes ni productos con poco stock." />
          ) : (
            <ul className={estilos.lista}>
              {pendientes.slice(0, MAXIMO_AVISOS).map((venta) => (
                <li key={venta.id} className={estilos.aviso}>
                  <span className={`${estilos.icono} ${estilos.iconoCobro}`}><Icono nombre="billete" tamano="pequeno" /></span>
                  <span className={estilos.detalle}>
                    <span className={estilos.principal}>Cobro pendiente · #{venta.numero}</span>
                    <span className="texto-secundario">{nombreCliente(venta, datos.clientes)} · {formatearMoneda(venta.total)}</span>
                  </span>
                  {puedeVender && (
                    <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => marcarPagada(venta)}>
                      <Icono nombre="check" tamano="pequeno" />
                      <span>Marcar pagada<span className="solo-lector"> la venta #{venta.numero}</span></span>
                    </button>
                  )}
                </li>
              ))}
              {stockBajo.slice(0, MAXIMO_AVISOS).map((articulo) => (
                <li key={articulo.id} className={estilos.aviso}>
                  <span className={`${estilos.icono} ${estilos.iconoStock}`}><Icono nombre="alerta" tamano="pequeno" /></span>
                  <span className={estilos.detalle}>
                    <span className={estilos.principal}>{articulo.nombre}</span>
                    <span className="texto-secundario">Quedan {articulo.stock} · mínimo {articulo.stockMinimo}</span>
                  </span>
                  {puedeEditar('productos') && (
                    <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => abrirPanel('articulo', articulo.id)}>
                      Reponer<span className="solo-lector"> {articulo.nombre}</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
