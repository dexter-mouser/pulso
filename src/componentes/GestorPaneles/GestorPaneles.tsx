import { useEffect, useRef, useState, type ComponentType } from 'react';
import { usePaneles, type PanelAbierto, type PropiedadesPanel, type TipoPanel } from '../../estado/Paneles';
import { PanelAjustes } from '../paneles/PanelAjustes/PanelAjustes';
import { PanelArticulo } from '../paneles/PanelArticulo/PanelArticulo';
import { PanelBuscar } from '../paneles/PanelBuscar/PanelBuscar';
import { PanelCliente } from '../paneles/PanelCliente/PanelCliente';
import { PanelGasto } from '../paneles/PanelGasto/PanelGasto';
import { PanelRegistro } from '../paneles/PanelRegistro/PanelRegistro';
import { PanelRoles } from '../paneles/PanelRoles/PanelRoles';
import { PanelVenta } from '../paneles/PanelVenta/PanelVenta';

const PANELES: Record<TipoPanel, ComponentType<PropiedadesPanel>> = {
  venta: PanelVenta,
  articulo: PanelArticulo,
  cliente: PanelCliente,
  gasto: PanelGasto,
  buscar: PanelBuscar,
  roles: PanelRoles,
  registro: PanelRegistro,
  ajustes: PanelAjustes,
};

function mismoPanel(a: PanelAbierto | null, b: PanelAbierto | null): boolean {
  return Boolean(a && b && a.tipo === b.tipo && a.id === b.id);
}

// Mantiene montado el panel mientras se anima su cierre
export function GestorPaneles() {
  const { panel, cerrarPanel } = usePaneles();
  const [mostrado, setMostrado] = useState<PanelAbierto | null>(null);
  // Panel actual del contexto, para saber si un cierre animado ya quedó obsoleto
  const panelActualRef = useRef(panel);
  panelActualRef.current = panel;

  useEffect(() => {
    if (panel) setMostrado(panel);
  }, [panel]);

  if (!mostrado) return null;
  const Panel = PANELES[mostrado.tipo];

  return (
    <Panel
      key={`${mostrado.tipo}-${mostrado.id ?? 'nuevo'}`}
      abierto={mismoPanel(panel, mostrado)}
      id={mostrado.id}
      onCerrado={() => {
        // Si durante la animación de cierre se abrió otro panel distinto, ese ya lo muestra el efecto
        if (panelActualRef.current && !mismoPanel(panelActualRef.current, mostrado)) return;
        cerrarPanel();
        setMostrado(null);
      }}
    />
  );
}
