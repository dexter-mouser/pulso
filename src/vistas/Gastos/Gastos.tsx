import { useMemo, useRef, useState } from 'react';
import { CampoBusqueda } from '../../componentes/CampoBusqueda/CampoBusqueda';
import { EncabezadoVista } from '../../componentes/EncabezadoVista/EncabezadoVista';
import { EstadoVacio } from '../../componentes/EstadoVacio/EstadoVacio';
import { Icono } from '../../componentes/Icono/Icono';
import { Tabla, type Columna } from '../../componentes/Tabla/Tabla';
import { ETIQUETAS_CATEGORIA, ETIQUETAS_METODO } from '../../config';
import { useAccionConAviso } from '../../hooks/useAccionConAviso';
import { useFormateadorMoneda } from '../../hooks/useFormateadorMoneda';
import { useNegocio } from '../../estado/Negocio';
import { usePaneles } from '../../estado/Paneles';
import type { CategoriaGasto, Gasto } from '../../tipos/negocio';
import { estaEnMes, inicioDeMes, redondear } from '../../utilidades/calculos';
import { formatearFecha, normalizar } from '../../utilidades/formato';
import { plural } from '../../utilidades/negocio';
import estilos from './Gastos.module.css';

type Periodo = 'mes' | 'anterior' | 'todo';

const ETIQUETAS_PERIODO: Record<Periodo, string> = {
  mes: 'Este mes',
  anterior: 'Mes anterior',
  todo: 'Todo',
};

// Vista de gastos con filtros y tabla
export function Gastos() {
  const { datos, puedeEditar, borrarGasto } = useNegocio();
  const { abrirPanel } = usePaneles();
  const ejecutar = useAccionConAviso();
  const tarjetaRef = useRef<HTMLElement>(null);
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState<CategoriaGasto | 'todas'>('todas');
  const [periodo, setPeriodo] = useState<Periodo>('mes');

  const editable = puedeEditar('gastos');
  const formatearMonto = useFormateadorMoneda();

  // Total del mes actual para la descripción
  const totalMes = useMemo(() => {
    const hoy = inicioDeMes(new Date());
    const delMes = datos.gastos.filter((gasto) => estaEnMes(gasto.fecha, hoy));
    return { cantidad: delMes.length, total: redondear(delMes.reduce((suma, gasto) => suma + gasto.monto, 0)) };
  }, [datos.gastos]);

  // Filas filtradas, de la fecha más reciente a la más antigua
  const filas = useMemo(() => {
    const termino = normalizar(busqueda);
    const hoy = new Date();
    const mesFiltro = periodo === 'mes' ? inicioDeMes(hoy) : periodo === 'anterior' ? inicioDeMes(hoy, -1) : null;
    return datos.gastos
      .filter((gasto) => {
        if (mesFiltro && !estaEnMes(gasto.fecha, mesFiltro)) return false;
        if (categoria !== 'todas' && gasto.categoria !== categoria) return false;
        if (!termino) return true;
        return normalizar(`${gasto.concepto} ${gasto.notas}`).includes(termino);
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [datos.gastos, busqueda, categoria, periodo]);

  const totalFiltrado = redondear(filas.reduce((suma, gasto) => suma + gasto.monto, 0));

  // Tras borrar la fila desaparece: el foco pasa a la tarjeta
  async function borrar(gasto: Gasto) {
    const hecho = await ejecutar(() => borrarGasto(gasto.id), 'Gasto borrado', `¿Borrar el gasto «${gasto.concepto}»?`);
    if (hecho) tarjetaRef.current?.focus();
  }

  const columnas: Columna<Gasto>[] = [
    { clave: 'fecha', titulo: 'Fecha', celda: (gasto) => formatearFecha(gasto.fecha) },
    {
      clave: 'concepto',
      titulo: 'Concepto',
      celda: (gasto) => (
        <>
          <span className={estilos.concepto}>{gasto.concepto}</span>
          {gasto.notas && <span className={`${estilos.notas} texto-secundario`}>{gasto.notas}</span>}
        </>
      ),
    },
    { clave: 'categoria', titulo: 'Categoría', celda: (gasto) => <span className="chip chip-gris">{ETIQUETAS_CATEGORIA[gasto.categoria]}</span> },
    { clave: 'metodo', titulo: 'Método', secundaria: true, celda: (gasto) => ETIQUETAS_METODO[gasto.metodoPago] },
    { clave: 'monto', titulo: 'Monto', alinear: 'fin', celda: (gasto) => <span className="monto">{formatearMonto(gasto.monto)}</span> },
  ];

  const botonRegistrar = editable ? (
    <button type="button" className="boton boton-primario" onClick={() => abrirPanel('gasto')}>
      <Icono nombre="mas" tamano="pequeno" /> Registrar gasto
    </button>
  ) : null;

  const vacio = datos.gastos.length === 0 ? (
    <EstadoVacio
      icono="billete"
      titulo="Aún no hay gastos"
      texto="Registra compras, pagos y servicios para conocer tu utilidad real."
      accion={botonRegistrar}
    />
  ) : (
    <EstadoVacio icono="buscar" titulo="Sin resultados" texto="Ningún gasto coincide con los filtros actuales." />
  );

  return (
    <>
      <EncabezadoVista
        titulo="Gastos"
        descripcion={`Este mes: ${formatearMonto(totalMes.total)} en ${plural(totalMes.cantidad, 'gasto', 'gastos')}`}
        acciones={botonRegistrar}
      />

      <div className={`${estilos.barra} animable`}>
        <CampoBusqueda valor={busqueda} onCambiar={setBusqueda} etiqueta="Buscar por concepto o notas" />
        <label className={estilos.filtro}>
          <span className="solo-lector">Categoría</span>
          <select className="control" value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaGasto | 'todas')}>
            <option value="todas">Todas</option>
            {(Object.keys(ETIQUETAS_CATEGORIA) as CategoriaGasto[]).map((clave) => (
              <option key={clave} value={clave}>{ETIQUETAS_CATEGORIA[clave]}</option>
            ))}
          </select>
        </label>
        <label className={estilos.filtro}>
          <span className="solo-lector">Periodo</span>
          <select className="control" value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)}>
            {(Object.keys(ETIQUETAS_PERIODO) as Periodo[]).map((clave) => (
              <option key={clave} value={clave}>{ETIQUETAS_PERIODO[clave]}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="solo-lector" role="status" aria-live="polite">{plural(filas.length, 'resultado', 'resultados')}</p>
      <section ref={tarjetaRef} tabIndex={-1} aria-label="Lista de gastos" className={`${estilos.tarjeta} animable`}>
        <Tabla
          filas={filas}
          columnas={columnas}
          obtenerId={(gasto) => gasto.id}
          titulo="Gastos"
          vacio={vacio}
          acciones={
            editable
              ? (gasto) => (
                  <>
                    <button type="button" className="boton-icono boton-mini" aria-label={`Editar ${gasto.concepto}`} onClick={() => abrirPanel('gasto', gasto.id)}>
                      <Icono nombre="lapiz" tamano="pequeno" />
                    </button>
                    <button type="button" className="boton-icono boton-mini" aria-label={`Borrar ${gasto.concepto}`} onClick={() => borrar(gasto)}>
                      <Icono nombre="basura" tamano="pequeno" />
                    </button>
                  </>
                )
              : undefined
          }
        />
        {filas.length > 0 && (
          <p className={estilos.total}>
            <span className="texto-secundario">Total filtrado · {plural(filas.length, 'gasto', 'gastos')}</span>
            <span className="monto">{formatearMonto(totalFiltrado)}</span>
          </p>
        )}
      </section>
    </>
  );
}
