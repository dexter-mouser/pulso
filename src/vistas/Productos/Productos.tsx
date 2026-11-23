import { useMemo, useRef, useState } from 'react';
import { EncabezadoVista } from '../../componentes/EncabezadoVista/EncabezadoVista';
import { CampoBusqueda } from '../../componentes/CampoBusqueda/CampoBusqueda';
import { EstadoVacio } from '../../componentes/EstadoVacio/EstadoVacio';
import { Icono } from '../../componentes/Icono/Icono';
import { Tabla, type Columna } from '../../componentes/Tabla/Tabla';
import { ETIQUETAS_TIPO, LOCALE } from '../../config';
import { useAccionConAviso } from '../../hooks/useAccionConAviso';
import { useFormateadorMoneda } from '../../hooks/useFormateadorMoneda';
import { useNegocio } from '../../estado/Negocio';
import { usePaneles } from '../../estado/Paneles';
import type { Articulo, TipoArticulo } from '../../tipos/negocio';
import { tieneStockBajo } from '../../utilidades/calculos';
import { articulosConPocoStock, plural } from '../../utilidades/negocio';
import { crearFormateador, normalizar } from '../../utilidades/formato';
import estilos from './Productos.module.css';

type FiltroTipo = 'todos' | TipoArticulo;

const FILTROS: { valor: FiltroTipo; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'producto', etiqueta: 'Productos' },
  { valor: 'servicio', etiqueta: 'Servicios' },
];

const formatearPorcentaje = crearFormateador(0, '%');

// Margen = (precio - costo) / precio; null si no hay precio
function calcularMargen(articulo: Articulo): number | null {
  if (articulo.precio <= 0) return null;
  return ((articulo.precio - articulo.costo) / articulo.precio) * 100;
}

// Catálogo de productos y servicios
export function Productos() {
  const { datos, puedeEditar, borrarArticulo } = useNegocio();
  const { abrirPanel } = usePaneles();
  const ejecutar = useAccionConAviso();
  const tarjetaRef = useRef<HTMLElement>(null);
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState<FiltroTipo>('todos');
  const [soloPocoStock, setSoloPocoStock] = useState(false);

  const editable = puedeEditar('productos');
  const formatearMonto = useFormateadorMoneda();

  const totales = useMemo(() => {
    const productos = datos.articulos.filter((a) => a.tipo === 'producto').length;
    return { productos, servicios: datos.articulos.length - productos, pocoStock: articulosConPocoStock(datos.articulos).length };
  }, [datos.articulos]);

  const filas = useMemo(() => {
    const texto = normalizar(busqueda);
    return datos.articulos
      .filter((a) => tipo === 'todos' || a.tipo === tipo)
      .filter((a) => !soloPocoStock || tieneStockBajo(a))
      .filter((a) => !texto || normalizar(a.nombre).includes(texto))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, LOCALE));
  }, [datos.articulos, busqueda, tipo, soloPocoStock]);

  // Tras borrar la fila desaparece: el foco pasa a la tarjeta
  async function borrar(articulo: Articulo) {
    const hecho = await ejecutar(
      () => borrarArticulo(articulo.id),
      'Artículo borrado',
      `¿Borrar «${articulo.nombre}»? Las ventas anteriores lo conservan.`,
    );
    if (hecho) tarjetaRef.current?.focus();
  }

  const botonNuevo = (
    <button type="button" className="boton boton-primario" onClick={() => abrirPanel('articulo')}>
      <Icono nombre="mas" tamano="pequeno" />
      Nuevo artículo
    </button>
  );

  const columnas: Columna<Articulo>[] = [
    {
      clave: 'nombre',
      titulo: 'Nombre',
      celda: (a) => (
        <div className={estilos.nombre}>
          <span className={estilos.textoNombre}>{a.nombre}</span>
          <span className="chip chip-gris">{ETIQUETAS_TIPO[a.tipo]}</span>
        </div>
      ),
    },
    { clave: 'precio', titulo: 'Precio', alinear: 'fin', celda: (a) => <span className="monto">{formatearMonto(a.precio)}</span> },
    {
      clave: 'costo',
      titulo: 'Costo',
      alinear: 'fin',
      secundaria: true,
      celda: (a) => <span className="monto texto-secundario">{formatearMonto(a.costo)}</span>,
    },
    {
      clave: 'margen',
      titulo: 'Margen',
      alinear: 'fin',
      secundaria: true,
      celda: (a) => {
        const margen = calcularMargen(a);
        return <span className="texto-secundario">{margen === null ? '—' : formatearPorcentaje(margen)}</span>;
      },
    },
    {
      clave: 'stock',
      titulo: 'Stock',
      alinear: 'fin',
      celda: (a) =>
        a.tipo === 'servicio' ? (
          <span className="texto-secundario">—</span>
        ) : (
          <span className={estilos.stock}>
            <span className="monto">{a.stock}</span>
            {tieneStockBajo(a) && <span className="chip chip-rojo">Poco stock</span>}
          </span>
        ),
    },
  ];

  const hayFiltros = busqueda.trim() !== '' || tipo !== 'todos' || soloPocoStock;
  const vacio =
    datos.articulos.length === 0 ? (
      <EstadoVacio
        icono="caja"
        titulo="Tu catálogo está vacío"
        texto="Agrega productos con stock o servicios para empezar a vender."
        accion={editable ? botonNuevo : undefined}
      />
    ) : (
      <EstadoVacio icono="buscar" titulo="Sin resultados" texto="Prueba con otro nombre o quita los filtros." />
    );

  return (
    <>
      <EncabezadoVista
        titulo="Productos"
        descripcion={`${totales.productos} productos · ${totales.servicios} servicios · ${totales.pocoStock} con poco stock`}
        acciones={editable ? botonNuevo : undefined}
      />

      {(datos.articulos.length > 0 || hayFiltros) && (
        <div className={`${estilos.barra} animable`}>
          <CampoBusqueda valor={busqueda} onCambiar={setBusqueda} etiqueta="Buscar artículo por nombre" placeholder="Buscar por nombre…" />
          <div className={estilos.segmentado} role="group" aria-label="Filtrar por tipo">
            {FILTROS.map((filtro) => (
              <button
                key={filtro.valor}
                type="button"
                className={estilos.opcion}
                aria-pressed={tipo === filtro.valor}
                onClick={() => setTipo(filtro.valor)}
              >
                {filtro.etiqueta}
              </button>
            ))}
          </div>
          <label className={estilos.casilla}>
            <input type="checkbox" checked={soloPocoStock} onChange={(e) => setSoloPocoStock(e.target.checked)} />
            Solo poco stock
          </label>
        </div>
      )}

      <p className="solo-lector" role="status" aria-live="polite">{plural(filas.length, 'resultado', 'resultados')}</p>
      <section ref={tarjetaRef} tabIndex={-1} aria-label="Catálogo" className={`${estilos.tarjeta} animable`}>
        <Tabla
          filas={filas}
          columnas={columnas}
          obtenerId={(a) => a.id}
          titulo="Catálogo de productos y servicios"
          vacio={vacio}
          acciones={
            editable
              ? (a) => (
                  <>
                    <button type="button" className="boton-icono boton-mini" aria-label={`Editar ${a.nombre}`} onClick={() => abrirPanel('articulo', a.id)}>
                      <Icono nombre="lapiz" tamano="pequeno" />
                    </button>
                    <button type="button" className="boton-icono boton-mini" aria-label={`Borrar ${a.nombre}`} onClick={() => borrar(a)}>
                      <Icono nombre="basura" tamano="pequeno" />
                    </button>
                  </>
                )
              : undefined
          }
        />
      </section>
    </>
  );
}
