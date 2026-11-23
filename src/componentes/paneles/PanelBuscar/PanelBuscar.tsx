import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNegocio } from '../../../estado/Negocio';
import { usePaneles, type PropiedadesPanel, type TipoPanel } from '../../../estado/Paneles';
import { useFormateadorMoneda } from '../../../hooks/useFormateadorMoneda';
import { formatearFecha, normalizar } from '../../../utilidades/formato';
import { nombreCliente, plural } from '../../../utilidades/negocio';
import { CampoBusqueda } from '../../CampoBusqueda/CampoBusqueda';
import { EstadoVacio } from '../../EstadoVacio/EstadoVacio';
import { Icono, type NombreIcono } from '../../Icono/Icono';
import { PanelDeslizante } from '../../PanelDeslizante/PanelDeslizante';
import estilos from './PanelBuscar.module.css';

const MAXIMO_POR_GRUPO = 6;

interface Resultado {
  id: string;
  titulo: string;
  detalle: string;
}

interface Grupo {
  clave: string;
  titulo: string;
  tipo: TipoPanel;
  icono: NombreIcono;
  resultados: Resultado[];
}

// Búsqueda global en los módulos que el miembro activo puede ver
export function PanelBuscar({ abierto, onCerrado }: PropiedadesPanel) {
  const { datos, puedeVer } = useNegocio();
  const { abrirPanel } = usePaneles();
  const [texto, setTexto] = useState('');
  const formatoMoneda = useFormateadorMoneda();
  const contenedorRef = useRef<HTMLDivElement>(null);
  const buscadorRef = useRef<HTMLInputElement>(null);
  const consulta = normalizar(texto);
  const consultaNumero = consulta.replace(/^#/, '');

  const grupos = useMemo<Grupo[]>(() => {
    if (!consulta) return [];
    const coincide = (...campos: string[]) => campos.some((campo) => normalizar(campo).includes(consulta));
    const lista: Grupo[] = [];

    if (puedeVer('ventas')) {
      const ventas = datos.ventas
        .filter((v) => String(v.numero) === consultaNumero || coincide(`#${v.numero}`, nombreCliente(v, datos.clientes), ...v.lineas.map((l) => l.nombre)))
        .slice(0, MAXIMO_POR_GRUPO)
        .map((v) => ({
          id: v.id,
          titulo: `#${v.numero} · ${nombreCliente(v, datos.clientes)}`,
          detalle: `${formatoMoneda(v.total)} · ${formatearFecha(v.fecha)}`,
        }));
      lista.push({ clave: 'ventas', titulo: 'Ventas', tipo: 'venta', icono: 'carrito', resultados: ventas });
    }
    if (puedeVer('productos')) {
      const articulos = datos.articulos
        .filter((a) => coincide(a.nombre))
        .slice(0, MAXIMO_POR_GRUPO)
        .map((a) => ({
          id: a.id,
          titulo: a.nombre,
          detalle: a.tipo === 'producto' ? `${formatoMoneda(a.precio)} · Stock: ${a.stock}` : `${formatoMoneda(a.precio)} · Servicio`,
        }));
      lista.push({ clave: 'articulos', titulo: 'Productos y servicios', tipo: 'articulo', icono: 'caja', resultados: articulos });
    }
    if (puedeVer('clientes')) {
      const clientes = datos.clientes
        .filter((c) => coincide(c.nombre, c.correo, c.telefono))
        .slice(0, MAXIMO_POR_GRUPO)
        .map((c) => ({ id: c.id, titulo: c.nombre, detalle: c.correo || c.telefono || 'Sin datos de contacto' }));
      lista.push({ clave: 'clientes', titulo: 'Clientes', tipo: 'cliente', icono: 'usuario', resultados: clientes });
    }
    if (puedeVer('gastos')) {
      const gastos = datos.gastos
        .filter((g) => coincide(g.concepto))
        .slice(0, MAXIMO_POR_GRUPO)
        .map((g) => ({ id: g.id, titulo: g.concepto, detalle: `${formatoMoneda(g.monto)} · ${formatearFecha(g.fecha)}` }));
      lista.push({ clave: 'gastos', titulo: 'Gastos', tipo: 'gasto', icono: 'billete', resultados: gastos });
    }
    return lista.filter((grupo) => grupo.resultados.length > 0);
  }, [datos, consulta, consultaNumero, puedeVer, formatoMoneda]);

  const totalResultados = grupos.reduce((suma, grupo) => suma + grupo.resultados.length, 0);
  const anuncio = !consulta ? '' : totalResultados === 0 ? 'Sin resultados' : plural(totalResultados, 'resultado', 'resultados');

  // Flechas arriba y abajo entre resultados
  function alPulsarTecla(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key !== 'ArrowDown' && evento.key !== 'ArrowUp') return;
    const botones = Array.from(evento.currentTarget.querySelectorAll<HTMLButtonElement>('button[data-resultado]'));
    if (botones.length === 0) return;
    const actual = botones.indexOf(document.activeElement as HTMLButtonElement);
    const siguiente = evento.key === 'ArrowDown' ? actual + 1 : actual - 1;
    if (siguiente < 0) return;
    evento.preventDefault();
    botones[Math.min(siguiente, botones.length - 1)]?.focus();
  }

  return (
    <PanelDeslizante abierto={abierto} titulo="Buscar" onCerrado={onCerrado} enfoqueInicial={buscadorRef}>
      <div ref={contenedorRef} className={estilos.contenedor} onKeyDown={alPulsarTecla}>
        <CampoBusqueda valor={texto} onCambiar={setTexto} etiqueta="Buscar en todo el negocio" placeholder="Buscar…" referencia={buscadorRef} />
        <p className="solo-lector" role="status" aria-live="polite">{anuncio}</p>
        <div>
          {!consulta && <p className="texto-secundario">Escribe un número de venta, un producto, un cliente o un gasto</p>}
          {consulta && grupos.length === 0 && (
            <EstadoVacio icono="buscar" titulo={`Sin resultados para «${texto.trim()}»`} texto="Prueba con otra palabra o un número de venta." />
          )}
        </div>
        {grupos.map((grupo) => (
          <section key={grupo.clave} className={estilos.grupo}>
            <h3 className={estilos.encabezado}>{grupo.titulo}</h3>
            <ul className={estilos.lista}>
              {grupo.resultados.map((resultado) => (
                <li key={resultado.id}>
                  <button type="button" className={estilos.fila} data-resultado onClick={() => abrirPanel(grupo.tipo, resultado.id)}>
                    <span className={estilos.icono}><Icono nombre={grupo.icono} tamano="pequeno" /></span>
                    <span className={estilos.textos}>
                      <span className={estilos.titulo}>{resultado.titulo}</span>
                      <span className="texto-secundario">{resultado.detalle}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PanelDeslizante>
  );
}
