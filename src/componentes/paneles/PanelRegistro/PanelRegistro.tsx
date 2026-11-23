import { useMemo, useState } from 'react';
import { useNegocio } from '../../../estado/Negocio';
import type { PropiedadesPanel } from '../../../estado/Paneles';
import type { AccionCambio, Cambio, Modulo } from '../../../tipos/negocio';
import { LOCALE } from '../../../config';
import { fechaParaCampo, formatearFecha } from '../../../utilidades/formato';
import { EstadoVacio } from '../../EstadoVacio/EstadoVacio';
import { PanelDeslizante } from '../../PanelDeslizante/PanelDeslizante';
import estilos from './PanelRegistro.module.css';

const TAMANO_PAGINA = 30;
const MAXIMO_VALOR = 80;

const MODULOS: { valor: Modulo; etiqueta: string }[] = [
  { valor: 'ventas', etiqueta: 'Ventas' },
  { valor: 'productos', etiqueta: 'Productos' },
  { valor: 'clientes', etiqueta: 'Clientes' },
  { valor: 'gastos', etiqueta: 'Gastos' },
  { valor: 'roles', etiqueta: 'Roles' },
  { valor: 'ajustes', etiqueta: 'Ajustes' },
];

const ACCIONES: Record<AccionCambio, { clase: string; etiqueta: string }> = {
  crear: { clase: 'chip-verde', etiqueta: 'Creó' },
  editar: { clase: 'chip-amarillo', etiqueta: 'Editó' },
  borrar: { clase: 'chip-rojo', etiqueta: 'Borró' },
};

const NOMBRES_CAMPO: Record<string, string> = {
  nombre: 'Nombre', correo: 'Correo', telefono: 'Teléfono', notas: 'Notas', rol: 'Rol', moneda: 'Moneda',
  impuesto: 'Impuesto', precio: 'Precio', costo: 'Costo', stock: 'Stock', stockMinimo: 'Stock mínimo',
  tipo: 'Tipo', concepto: 'Concepto', categoria: 'Categoría', monto: 'Monto', fecha: 'Fecha',
  metodoPago: 'Método de pago', estado: 'Estado', total: 'Total', subtotal: 'Subtotal', lineas: 'Líneas',
  clienteId: 'Cliente', numero: 'Número', creadoEn: 'Creado', impuestoPorcentaje: 'Impuesto (%)', vendedorId: 'Vendedor',
};

function formatearValor(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  const texto = typeof valor === 'object' ? JSON.stringify(valor) : String(valor);
  return texto.length > MAXIMO_VALOR ? `${texto.slice(0, MAXIMO_VALOR)}…` : texto;
}

interface FilaDiferencia {
  campo: string;
  antes: string;
  despues: string;
}

// Solo los campos que cambiaron; en creaciones y borrados, los valores existentes
function calcularDiferencias(cambio: Cambio): FilaDiferencia[] {
  const antes = cambio.antes ?? {};
  const despues = cambio.despues ?? {};
  const claves = Array.from(new Set([...Object.keys(antes), ...Object.keys(despues)]));
  return claves
    .filter((clave) => cambio.accion !== 'editar' || JSON.stringify(antes[clave]) !== JSON.stringify(despues[clave]))
    .map((clave) => ({
      campo: NOMBRES_CAMPO[clave] ?? clave,
      antes: cambio.accion === 'crear' ? '' : formatearValor(antes[clave]),
      despues: cambio.accion === 'borrar' ? '' : formatearValor(despues[clave]),
    }));
}

function formatearHora(iso: string): string {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? '' : fecha.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
}

// Día local del cambio (no el día UTC del texto ISO)
function claveDia(iso: string): string {
  return fechaParaCampo(new Date(iso));
}

// Historial de creaciones, ediciones y borrados
export function PanelRegistro({ abierto, onCerrado }: PropiedadesPanel) {
  const { datos } = useNegocio();
  const [modulo, setModulo] = useState('');
  const [persona, setPersona] = useState('');
  const [visibles, setVisibles] = useState(TAMANO_PAGINA);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const personas = useMemo(() => Array.from(new Set(datos.cambios.map((c) => c.miembroNombre))).sort((a, b) => a.localeCompare(b)), [datos.cambios]);

  const filtrados = useMemo(
    () =>
      datos.cambios
        .filter((c) => (!modulo || c.modulo === modulo) && (!persona || c.miembroNombre === persona))
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [datos.cambios, modulo, persona],
  );

  const mostrados = filtrados.slice(0, visibles);
  const dias = useMemo(() => {
    const mapa = new Map<string, Cambio[]>();
    for (const cambio of mostrados) {
      const clave = claveDia(cambio.fecha);
      mapa.set(clave, [...(mapa.get(clave) ?? []), cambio]);
    }
    return Array.from(mapa.entries());
  }, [mostrados]);

  function alternar(id: string) {
    setExpandidos((actual) => {
      const nuevo = new Set(actual);
      if (!nuevo.delete(id)) nuevo.add(id);
      return nuevo;
    });
  }

  function cambiarFiltro(poner: (valor: string) => void, valor: string) {
    poner(valor);
    setVisibles(TAMANO_PAGINA);
  }

  return (
    <PanelDeslizante abierto={abierto} titulo="Registro de cambios" descripcion="Quién cambió qué y cuándo." onCerrado={onCerrado}>
      {datos.cambios.length === 0 ? (
        <EstadoVacio icono="lista" titulo="Sin cambios registrados" texto="Aquí aparecerá cada creación, edición y borrado." />
      ) : (
        <div className={estilos.contenedor}>
          <div className="fila-campos">
            <div className="campo">
              <label className="campo-etiqueta" htmlFor="registro-modulo">Módulo</label>
              <select id="registro-modulo" className="control" value={modulo} onChange={(e) => cambiarFiltro(setModulo, e.target.value)}>
                <option value="">Todos</option>
                {MODULOS.map((m) => <option key={m.valor} value={m.valor}>{m.etiqueta}</option>)}
              </select>
            </div>
            <div className="campo">
              <label className="campo-etiqueta" htmlFor="registro-persona">Persona</label>
              <select id="registro-persona" className="control" value={persona} onChange={(e) => cambiarFiltro(setPersona, e.target.value)}>
                <option value="">Todas</option>
                {personas.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {filtrados.length === 0 && <p className="texto-secundario">Ningún cambio coincide con los filtros.</p>}

          {dias.map(([dia, cambios]) => (
            <section key={dia} className={estilos.dia}>
              <h3 className={estilos.encabezado}>{formatearFecha(cambios[0].fecha)}</h3>
              <ul className={estilos.lista}>
                {cambios.map((cambio) => {
                  const abierta = expandidos.has(cambio.id);
                  const idDetalle = `detalle-${cambio.id}`;
                  const accion = ACCIONES[cambio.accion];
                  return (
                    <li key={cambio.id} className={estilos.entrada}>
                      <div className={estilos.resumen}>
                        <span className={`chip ${accion.clase}`}>{accion.etiqueta}</span>
                        <div className={estilos.texto}>
                          <p className={estilos.descripcion}>{cambio.descripcion}</p>
                          <p className="texto-secundario">{cambio.miembroNombre} · {formatearHora(cambio.fecha)}</p>
                        </div>
                        <button type="button" className="boton boton-fantasma boton-pequeno" aria-expanded={abierta} aria-controls={idDetalle} onClick={() => alternar(cambio.id)}>
                          Ver detalle
                        </button>
                      </div>
                      {abierta && (
                        <div id={idDetalle} className={estilos.detalle}>
                          <table className={estilos.tabla}>
                            <thead>
                              <tr><th scope="col">Campo</th><th scope="col">Antes</th><th scope="col">Después</th></tr>
                            </thead>
                            <tbody>
                              {calcularDiferencias(cambio).map((fila) => (
                                <tr key={fila.campo}>
                                  <th scope="row">{fila.campo}</th>
                                  <td>{fila.antes}</td>
                                  <td>{fila.despues}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {filtrados.length > visibles && (
            <button type="button" className="boton boton-secundario" onClick={() => setVisibles((v) => v + TAMANO_PAGINA)}>
              Ver más
            </button>
          )}
        </div>
      )}
    </PanelDeslizante>
  );
}
