import { useNegocio } from '../../estado/Negocio';
import { usePaneles, type TipoPanel } from '../../estado/Paneles';
import { useTema } from '../../hooks/useTema';
import type { Modulo } from '../../tipos/negocio';
import { Icono, type NombreIcono } from '../Icono/Icono';
import estilos from './BarraLateral.module.css';

interface Accion {
  etiqueta: string;
  icono: NombreIcono;
  panel: TipoPanel;
  modulo?: Modulo;
  // 'editar' para crear registros; 'ver' para consultar
  requiere?: 'ver' | 'editar';
  esPrincipal?: boolean;
}

// Acciones rápidas del menú
const ACCIONES: Accion[] = [
  { etiqueta: 'Buscar', icono: 'buscar', panel: 'buscar' },
  { etiqueta: 'Nueva venta', icono: 'carrito', panel: 'venta', modulo: 'ventas', requiere: 'editar', esPrincipal: true },
  { etiqueta: 'Nuevo producto', icono: 'caja', panel: 'articulo', modulo: 'productos', requiere: 'editar' },
  { etiqueta: 'Nuevo cliente', icono: 'usuario', panel: 'cliente', modulo: 'clientes', requiere: 'editar' },
  { etiqueta: 'Registrar gasto', icono: 'billete', panel: 'gasto', modulo: 'gastos', requiere: 'editar' },
  { etiqueta: 'Roles y equipo', icono: 'escudo', panel: 'roles', modulo: 'roles', requiere: 'ver' },
  { etiqueta: 'Registro de cambios', icono: 'lista', panel: 'registro', modulo: 'registro', requiere: 'ver' },
  { etiqueta: 'Ajustes del negocio', icono: 'ajustes', panel: 'ajustes', modulo: 'ajustes', requiere: 'ver' },
];

// Se despliega sobre el contenido al pasar el cursor o al enfocar con teclado
export function BarraLateral() {
  const { alternarTema } = useTema();
  const { abrirPanel } = usePaneles();
  const { puedeVer, puedeEditar } = useNegocio();

  const visibles = ACCIONES.filter(({ modulo, requiere }) => {
    if (!modulo) return true;
    return requiere === 'editar' ? puedeEditar(modulo) : puedeVer(modulo);
  });

  return (
    <nav className={estilos.barra} aria-label="Acciones rápidas">
      {visibles.map(({ etiqueta, icono, panel, esPrincipal }) => (
        <button
          key={etiqueta}
          type="button"
          className={esPrincipal ? `${estilos.boton} ${estilos.crear}` : estilos.boton}
          aria-label={etiqueta}
          onClick={() => abrirPanel(panel)}
        >
          <Icono nombre={icono} />
          <span className={estilos.etiqueta}>{etiqueta}</span>
        </button>
      ))}
      <span className={estilos.separador} aria-hidden="true" />
      <button type="button" className={`${estilos.boton} boton-tema`} onClick={alternarTema}>
        <Icono nombre="luna" className="icono-luna" />
        <Icono nombre="sol" className="icono-sol" />
        <span className={`${estilos.etiqueta} texto-a-oscuro`}>Cambiar a tema oscuro</span>
        <span className={`${estilos.etiqueta} texto-a-claro`}>Cambiar a tema claro</span>
      </button>
    </nav>
  );
}
