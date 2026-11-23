import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

// Paneles deslizantes que se abren desde el menú lateral o desde las vistas
export type TipoPanel =
  | 'venta'
  | 'articulo'
  | 'cliente'
  | 'gasto'
  | 'buscar'
  | 'roles'
  | 'registro'
  | 'ajustes';

export interface PanelAbierto {
  tipo: TipoPanel;
  // Id del registro a editar; sin id el panel crea uno nuevo
  id?: string;
}

// Propiedades que recibe cada panel desde el gestor de paneles
export interface PropiedadesPanel {
  abierto: boolean;
  id?: string;
  onCerrado: () => void;
}

interface ValorPaneles {
  panel: PanelAbierto | null;
  abrirPanel: (tipo: TipoPanel, id?: string) => void;
  cerrarPanel: () => void;
}

const ContextoPaneles = createContext<ValorPaneles | null>(null);

export function ProveedorPaneles({ children }: { children: ReactNode }) {
  const [panel, setPanel] = useState<PanelAbierto | null>(null);
  const abrirPanel = useCallback((tipo: TipoPanel, id?: string) => setPanel({ tipo, id }), []);
  const cerrarPanel = useCallback(() => setPanel(null), []);
  const valor = useMemo(() => ({ panel, abrirPanel, cerrarPanel }), [panel, abrirPanel, cerrarPanel]);
  return <ContextoPaneles.Provider value={valor}>{children}</ContextoPaneles.Provider>;
}

export function usePaneles(): ValorPaneles {
  const valor = useContext(ContextoPaneles);
  if (!valor) throw new Error('usePaneles debe usarse dentro de ProveedorPaneles');
  return valor;
}
