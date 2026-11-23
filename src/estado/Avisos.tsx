import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { crearId } from '../datos/fuente';

export type TipoAviso = 'exito' | 'error';

export interface Aviso {
  id: string;
  texto: string;
  tipo: TipoAviso;
}

interface ValorAvisos {
  avisos: Aviso[];
  avisar: (texto: string, tipo?: TipoAviso) => void;
  descartar: (id: string) => void;
}

const ContextoAvisos = createContext<ValorAvisos | null>(null);

// Mensajes breves tras una acción (los muestra el componente Avisos)
export function ProveedorAvisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  const descartar = useCallback((id: string) => setAvisos((lista) => lista.filter((aviso) => aviso.id !== id)), []);
  const avisar = useCallback((texto: string, tipo: TipoAviso = 'exito') => {
    setAvisos((lista) => [...lista, { id: crearId(), texto, tipo }]);
  }, []);

  const valor = useMemo(() => ({ avisos, avisar, descartar }), [avisos, avisar, descartar]);
  return <ContextoAvisos.Provider value={valor}>{children}</ContextoAvisos.Provider>;
}

export function useAvisos(): ValorAvisos {
  const valor = useContext(ContextoAvisos);
  if (!valor) throw new Error('useAvisos debe usarse dentro de ProveedorAvisos');
  return valor;
}

// Error con un mensaje pensado para el usuario (permisos, stock, último administrador)
export class ErrorNegocio extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorNegocio';
  }
}

const MENSAJE_GENERICO = 'No se pudo completar la acción.';

// Solo se muestra el texto de los ErrorNegocio; cualquier otro error es genérico
export function mensajeDeError(error: unknown): string {
  return error instanceof ErrorNegocio ? error.message : MENSAJE_GENERICO;
}
