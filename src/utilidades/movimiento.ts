// Duraciones compartidas (segundos)
export const DURACION_CONTADOR = 1.2;
export const DURACION_SALIDA = 0.18;
export const DURACION_ENTRADA = 0.4;

// Respeta prefers-reduced-motion en cada llamada
export function debeAnimar(): boolean {
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
