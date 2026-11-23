import { useMemo, useRef, useState } from 'react';
import { EncabezadoVista } from '../../componentes/EncabezadoVista/EncabezadoVista';
import { CampoBusqueda } from '../../componentes/CampoBusqueda/CampoBusqueda';
import { EstadoVacio } from '../../componentes/EstadoVacio/EstadoVacio';
import { Icono } from '../../componentes/Icono/Icono';
import { Tabla, type Columna } from '../../componentes/Tabla/Tabla';
import { LOCALE } from '../../config';
import { useAccionConAviso } from '../../hooks/useAccionConAviso';
import { useFormateadorMoneda } from '../../hooks/useFormateadorMoneda';
import { useNegocio } from '../../estado/Negocio';
import { usePaneles } from '../../estado/Paneles';
import type { Cliente } from '../../tipos/negocio';
import { estaEnMes, inicioDeMes, redondear } from '../../utilidades/calculos';
import { formatearFecha, normalizar } from '../../utilidades/formato';
import { plural } from '../../utilidades/negocio';
import estilos from './Clientes.module.css';

interface ResumenCliente {
  compras: number;
  total: number;
  ultima: string | null;
}

const SIN_COMPRAS: ResumenCliente = { compras: 0, total: 0, ultima: null };

// Lista de clientes con su resumen de compras
export function Clientes() {
  const { datos, puedeEditar, borrarCliente } = useNegocio();
  const { abrirPanel } = usePaneles();
  const ejecutar = useAccionConAviso();
  const tarjetaRef = useRef<HTMLElement>(null);
  const [busqueda, setBusqueda] = useState('');

  const editable = puedeEditar('clientes');
  const formatearMonto = useFormateadorMoneda();

  // Compras, total y última compra por cliente
  const resumenes = useMemo(() => {
    const mapa = new Map<string, ResumenCliente>();
    for (const venta of datos.ventas) {
      if (!venta.clienteId) continue;
      const previo = mapa.get(venta.clienteId) ?? { ...SIN_COMPRAS };
      previo.compras += 1;
      previo.total = redondear(previo.total + venta.total);
      if (!previo.ultima || venta.fecha > previo.ultima) previo.ultima = venta.fecha;
      mapa.set(venta.clienteId, previo);
    }
    return mapa;
  }, [datos.ventas]);

  const nuevosEsteMes = useMemo(() => {
    const mes = inicioDeMes(new Date());
    return datos.clientes.filter((c) => estaEnMes(c.creadoEn, mes)).length;
  }, [datos.clientes]);

  const filas = useMemo(() => {
    const texto = normalizar(busqueda);
    return datos.clientes
      .filter((c) => !texto || [c.nombre, c.correo, c.telefono].some((campo) => normalizar(campo).includes(texto)))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, LOCALE));
  }, [datos.clientes, busqueda]);

  // Tras borrar la fila desaparece: el foco pasa a la tarjeta
  async function borrar(cliente: Cliente) {
    const hecho = await ejecutar(
      () => borrarCliente(cliente.id),
      'Cliente borrado',
      `¿Borrar a «${cliente.nombre}»? Sus ventas se conservarán sin cliente.`,
    );
    if (hecho) tarjetaRef.current?.focus();
  }

  const botonNuevo = (
    <button type="button" className="boton boton-primario" onClick={() => abrirPanel('cliente')}>
      <Icono nombre="mas" tamano="pequeno" />
      Nuevo cliente
    </button>
  );

  const columnas: Columna<Cliente>[] = [
    {
      clave: 'nombre',
      titulo: 'Nombre',
      celda: (c) => (
        <div className={estilos.nombre}>
          <span className={estilos.textoNombre}>{c.nombre}</span>
          {c.correo && <span className="texto-secundario">{c.correo}</span>}
        </div>
      ),
    },
    { clave: 'telefono', titulo: 'Teléfono', secundaria: true, celda: (c) => <span className="texto-secundario">{c.telefono || '—'}</span> },
    { clave: 'compras', titulo: 'Compras', alinear: 'fin', celda: (c) => <span className="monto">{(resumenes.get(c.id) ?? SIN_COMPRAS).compras}</span> },
    {
      clave: 'total',
      titulo: 'Total comprado',
      alinear: 'fin',
      celda: (c) => <span className="monto">{formatearMonto((resumenes.get(c.id) ?? SIN_COMPRAS).total)}</span>,
    },
    {
      clave: 'ultima',
      titulo: 'Última compra',
      secundaria: true,
      celda: (c) => {
        const ultima = (resumenes.get(c.id) ?? SIN_COMPRAS).ultima;
        return <span className="texto-secundario">{ultima ? formatearFecha(ultima) : '—'}</span>;
      },
    },
  ];

  const vacio =
    datos.clientes.length === 0 ? (
      <EstadoVacio
        icono="usuario"
        titulo="Aún no tienes clientes"
        texto="Guarda a tus clientes para asociarlos a sus compras."
        accion={editable ? botonNuevo : undefined}
      />
    ) : (
      <EstadoVacio icono="buscar" titulo="Sin resultados" texto="Prueba con otro nombre, correo o teléfono." />
    );

  return (
    <>
      <EncabezadoVista
        titulo="Clientes"
        descripcion={`${datos.clientes.length} clientes · ${nuevosEsteMes} nuevos este mes`}
        acciones={editable ? botonNuevo : undefined}
      />

      {datos.clientes.length > 0 && (
        <div className={`${estilos.barra} animable`}>
          <CampoBusqueda valor={busqueda} onCambiar={setBusqueda} etiqueta="Buscar cliente por nombre, correo o teléfono" placeholder="Nombre, correo o teléfono…" />
        </div>
      )}

      <p className="solo-lector" role="status" aria-live="polite">{plural(filas.length, 'resultado', 'resultados')}</p>
      <section ref={tarjetaRef} tabIndex={-1} aria-label="Clientes" className={`${estilos.tarjeta} animable`}>
        <Tabla
          filas={filas}
          columnas={columnas}
          obtenerId={(c) => c.id}
          titulo="Lista de clientes"
          vacio={vacio}
          acciones={
            editable
              ? (c) => (
                  <>
                    <button type="button" className="boton-icono boton-mini" aria-label={`Editar ${c.nombre}`} onClick={() => abrirPanel('cliente', c.id)}>
                      <Icono nombre="lapiz" tamano="pequeno" />
                    </button>
                    <button type="button" className="boton-icono boton-mini" aria-label={`Borrar ${c.nombre}`} onClick={() => borrar(c)}>
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
