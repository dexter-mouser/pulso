import { LOCALE } from '../config';

const formatoFecha = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
const formatoFechaHora = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const formatoMes = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' });

// Números: 1.234,5 · 12 %
export function crearFormateador(decimales: number, sufijo = ''): (valor: number) => string {
  const formato = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
  return (valor) => (sufijo ? `${formato.format(valor)} ${sufijo}` : formato.format(valor));
}

// Dinero con la moneda del negocio; si el código no es válido, usa número simple
export function crearFormateadorMoneda(moneda: string): (valor: number) => string {
  try {
    const formato = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: moneda });
    return (valor) => formato.format(valor);
  } catch {
    return crearFormateador(2);
  }
}

function aFecha(iso: string): Date | null {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

export function formatearFecha(iso: string): string {
  const fecha = aFecha(iso);
  return fecha ? formatoFecha.format(fecha) : '';
}

export function formatearFechaHora(iso: string): string {
  const fecha = aFecha(iso);
  return fecha ? formatoFechaHora.format(fecha) : '';
}

export function formatearMes(fecha: Date): string {
  const texto = formatoMes.format(fecha);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Fecha local en formato AAAA-MM-DD para <input type="date">
export function fechaParaCampo(fecha = new Date()): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

export function saludoSegunHora(hora: number): string {
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

// Búsqueda sin tildes ni mayúsculas
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
