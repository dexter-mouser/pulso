// Escala del panel en pantallas grandes: hasta ANCHO_BASE se ve igual;
// por encima crece en proporción hasta llegar a ANCHO_MAXIMO
const ANCHO_BASE = 1200;
const ANCHO_MAXIMO = 1600;
const VARIABLE_ESCALA = '--escala';

function calcularEscala(anchoVentana: number): number {
  return Math.min(Math.max(anchoVentana / ANCHO_BASE, 1), ANCHO_MAXIMO / ANCHO_BASE);
}

function aplicarEscala(): void {
  const raiz = document.documentElement;
  raiz.style.setProperty(VARIABLE_ESCALA, String(calcularEscala(raiz.clientWidth)));
}

export function iniciarEscalaPantalla(): void {
  aplicarEscala();
  window.addEventListener('resize', aplicarEscala);
}
