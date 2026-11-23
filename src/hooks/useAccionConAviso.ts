import { useCallback } from 'react';
import { mensajeDeError, useAvisos } from '../estado/Avisos';

// Ejecuta una acción, avisa del resultado y devuelve si salió bien.
// Con `pregunta`, pide confirmación antes (para borrar).
export function useAccionConAviso() {
  const { avisar } = useAvisos();

  return useCallback(
    async (accion: () => Promise<unknown>, textoExito: string, pregunta?: string): Promise<boolean> => {
      if (pregunta && !window.confirm(pregunta)) return false;
      try {
        await accion();
        avisar(textoExito);
        return true;
      } catch (error) {
        avisar(mensajeDeError(error), 'error');
        return false;
      }
    },
    [avisar],
  );
}
