import { useMemo, useState } from 'react';
import { EncabezadoVista } from '../../componentes/EncabezadoVista/EncabezadoVista';
import { EstadoVacio } from '../../componentes/EstadoVacio/EstadoVacio';
import { Icono } from '../../componentes/Icono/Icono';
import { TarjetaKpi } from '../../componentes/TarjetaKpi/TarjetaKpi';
import { ETIQUETAS_CATEGORIA, LOCALE } from '../../config';
import { useFormateadorMoneda } from '../../hooks/useFormateadorMoneda';
import { plural } from '../../utilidades/negocio';
import { useNegocio } from '../../estado/Negocio';
import {
  articulosMasVendidos, estaEnMes, gastosPorCategoria, inicioDeMes, resumirMes, variacion, ventasPorDia,
} from '../../utilidades/calculos';
import { formatearMes } from '../../utilidades/formato';
import { BarrasHorizontales, type ElementoBarra } from './BarrasHorizontales';
import { GraficoBarras } from './GraficoBarras';
import estilos from './Reportes.module.css';

const MAS_VENDIDOS = 5;

// Formato corto para el eje del gráfico; si la moneda no es válida usa número simple
function crearFormateadorEje(moneda: string): (valor: number) => string {
  try {
    const formato = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: moneda, notation: 'compact', maximumFractionDigits: 1 });
    return (valor) => formato.format(valor);
  } catch {
    return (valor) => String(Math.round(valor));
  }
}

// Reportes mensuales de solo lectura
export function Reportes() {
  const { datos } = useNegocio();
  const [mes, setMes] = useState(() => inicioDeMes(new Date()));

  const mesActual = inicioDeMes(new Date());
  const esMesActual = mes.getTime() >= mesActual.getTime();
  const nombreMes = formatearMes(mes);
  const moneda = datos.ajustes.moneda;
  const formatear = useFormateadorMoneda();
  const formatearEje = useMemo(() => crearFormateadorEje(moneda), [moneda]);

  const resumen = useMemo(() => resumirMes(datos.ventas, datos.gastos, mes), [datos.ventas, datos.gastos, mes]);
  const previo = useMemo(() => resumirMes(datos.ventas, datos.gastos, inicioDeMes(mes, -1)), [datos.ventas, datos.gastos, mes]);
  const porDia = useMemo(() => ventasPorDia(resumen.ventas, mes), [resumen.ventas, mes]);
  const masVendidos = useMemo(() => articulosMasVendidos(resumen.ventas, MAS_VENDIDOS), [resumen.ventas]);
  const gastosMes = useMemo(
    () => datos.gastos.filter((gasto) => estaEnMes(gasto.fecha, mes)),
    [datos.gastos, mes],
  );
  const categorias = useMemo(() => gastosPorCategoria(gastosMes), [gastosMes]);

  const sinMovimientos = resumen.ventas.length === 0 && gastosMes.length === 0;

  // Día resaltado: hoy si se ve el mes actual; si no, el de mayores ventas
  const maximoDia = Math.max(...porDia, 0);
  const diaDestacado = esMesActual ? new Date().getDate() : maximoDia > 0 ? porDia.indexOf(maximoDia) + 1 : null;

  const elementosVendidos: ElementoBarra[] = masVendidos.map((articulo) => ({
    clave: articulo.articuloId,
    etiqueta: articulo.nombre,
    valor: articulo.total,
    detalle: formatear(articulo.total),
    nota: plural(articulo.cantidad, 'unidad', 'unidades'),
  }));

  const totalGastos = categorias.reduce((suma, categoria) => suma + categoria.total, 0);
  const elementosCategorias: ElementoBarra[] = categorias.map((categoria) => ({
    clave: categoria.categoria,
    etiqueta: ETIQUETAS_CATEGORIA[categoria.categoria],
    valor: categoria.total,
    detalle: `${formatear(categoria.total)} · ${totalGastos > 0 ? Math.round((categoria.total / totalGastos) * 100) : 0} %`,
  }));

  const selectorMes = (
    <div className={estilos.selector}>
      <button type="button" className="boton-icono" aria-label="Mes anterior" onClick={() => setMes((actual) => inicioDeMes(actual, -1))}>
        <Icono nombre="izquierda" />
      </button>
      <span className={estilos.nombreMes} aria-live="polite">{nombreMes}</span>
      <button type="button" className="boton-icono" aria-label="Mes siguiente" disabled={esMesActual} onClick={() => setMes((actual) => inicioDeMes(actual, 1))}>
        <Icono nombre="derecha" />
      </button>
    </div>
  );

  return (
    <>
      <EncabezadoVista titulo="Reportes" descripcion={`Resumen de ${nombreMes}`} acciones={selectorMes} />

      <ul className={estilos.indicadores}>
        <TarjetaKpi
          icono="tendencia"
          etiqueta="Ingresos cobrados"
          valor={resumen.ingresos}
          formatear={formatear}
          variacion={variacion(resumen.ingresos, previo.ingresos)}
          detalle={resumen.porCobrar > 0 ? `${formatear(resumen.porCobrar)} por cobrar` : undefined}
        />
        <TarjetaKpi icono="billete" etiqueta="Gastos" valor={resumen.egresos} formatear={formatear} variacion={variacion(resumen.egresos, previo.egresos)} invertirTono />
        <TarjetaKpi icono="grafico" etiqueta="Utilidad" valor={resumen.utilidad} formatear={formatear} variacion={variacion(resumen.utilidad, previo.utilidad)} />
        <TarjetaKpi icono="carrito" etiqueta="Ticket promedio" valor={resumen.ticketPromedio} formatear={formatear} variacion={variacion(resumen.ticketPromedio, previo.ticketPromedio)} />
      </ul>

      {sinMovimientos ? (
        <section className={`${estilos.tarjeta} animable`} aria-label="Sin movimientos">
          <EstadoVacio icono="grafico" titulo={`Sin movimientos en ${nombreMes}`} texto="Las ventas y los gastos de este mes aparecerán aquí." />
        </section>
      ) : (
        <>
          <section className={`${estilos.tarjeta} animable`} aria-labelledby="titulo-ventas-dia">
            <h2 id="titulo-ventas-dia" className={estilos.titulo}>Ventas por día</h2>
            <GraficoBarras valores={porDia} mes={mes} formatear={formatear} formatearEje={formatearEje} diaDestacado={diaDestacado} />
          </section>

          <div className={estilos.dos}>
            <section className={`${estilos.tarjeta} animable`} aria-labelledby="titulo-vendidos">
              <h2 id="titulo-vendidos" className={estilos.titulo}>Más vendidos</h2>
              {elementosVendidos.length > 0 ? (
                <BarrasHorizontales elementos={elementosVendidos} titulo="Artículos más vendidos" />
              ) : (
                <p className="texto-secundario">Sin ventas en este mes.</p>
              )}
            </section>
            <section className={`${estilos.tarjeta} animable`} aria-labelledby="titulo-categorias">
              <h2 id="titulo-categorias" className={estilos.titulo}>Gastos por categoría</h2>
              {elementosCategorias.length > 0 ? (
                <BarrasHorizontales elementos={elementosCategorias} titulo="Gastos por categoría" />
              ) : (
                <p className="texto-secundario">Sin gastos en este mes.</p>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
