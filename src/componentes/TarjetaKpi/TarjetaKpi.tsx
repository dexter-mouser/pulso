import { ContadorAnimado } from '../ContadorAnimado/ContadorAnimado';
import { Icono, type NombreIcono } from '../Icono/Icono';
import estilos from './TarjetaKpi.module.css';

interface PropiedadesKpi {
  icono: NombreIcono;
  etiqueta: string;
  valor: number;
  formatear: (valor: number) => string;
  // Variación en % frente al periodo anterior; null si no hay base
  variacion?: number | null;
  // Si true, subir es malo (por ejemplo, gastos o stock bajo)
  invertirTono?: boolean;
  // Dato secundario bajo el valor, p. ej. lo pendiente de cobro
  detalle?: string;
}

const VARIACION_MAXIMA = 999;

// Variación acotada para que no rompa el diseño: «+999 %»
function textoVariacion(variacion: number): string {
  const acotada = Math.max(-VARIACION_MAXIMA, Math.min(VARIACION_MAXIMA, variacion));
  return `${acotada > 0 ? '+' : ''}${acotada} %`;
}

// Frase para lectores de pantalla: sube, baja o igual
function descripcionVariacion(variacion: number): string {
  if (variacion === 0) return 'Sin cambios respecto al mes anterior';
  const cantidad = Math.min(Math.abs(variacion), VARIACION_MAXIMA);
  return `${variacion > 0 ? 'Sube' : 'Baja'} ${cantidad} % respecto al mes anterior`;
}

// Indicador con contador animado y variación
export function TarjetaKpi({ icono, etiqueta, valor, formatear, variacion = null, invertirTono = false, detalle }: PropiedadesKpi) {
  const esPositiva = variacion !== null && (invertirTono ? variacion <= 0 : variacion >= 0);

  return (
    <li className={`${estilos.kpi} animable`}>
      <span className={estilos.icono}><Icono nombre={icono} /></span>
      <p className={estilos.etiqueta}>{etiqueta}</p>
      <p className={estilos.valor}><ContadorAnimado valor={valor} formatear={formatear} /></p>
      {detalle && <p className={estilos.detalle}>{detalle}</p>}
      {variacion !== null && (
        <p className={`${estilos.variacion} ${esPositiva ? estilos.buena : estilos.mala}`}>
          <span aria-hidden="true">{textoVariacion(variacion)} vs. mes anterior</span>
          <span className="solo-lector">{descripcionVariacion(variacion)}</span>
        </p>
      )}
    </li>
  );
}
