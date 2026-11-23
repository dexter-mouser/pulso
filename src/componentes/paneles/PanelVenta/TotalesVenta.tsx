import { useFormateadorMoneda } from '../../../hooks/useFormateadorMoneda';
import estilos from './PanelVenta.module.css';

interface PropiedadesTotales {
  subtotal: number;
  impuesto: number;
  porcentajeImpuesto: number;
  total: number;
}

// Subtotal, impuesto y total de la venta
export function TotalesVenta({ subtotal, impuesto, porcentajeImpuesto, total }: PropiedadesTotales) {
  const formatearMoneda = useFormateadorMoneda();

  return (
    <dl className={estilos.resumen}>
      <div className={estilos.filaResumen}>
        <dt>Subtotal</dt>
        <dd className="monto">{formatearMoneda(subtotal)}</dd>
      </div>
      {porcentajeImpuesto > 0 && (
        <div className={estilos.filaResumen}>
          <dt>Impuesto ({porcentajeImpuesto} %)</dt>
          <dd className="monto">{formatearMoneda(impuesto)}</dd>
        </div>
      )}
      <div className={`${estilos.filaResumen} ${estilos.total}`}>
        <dt>Total</dt>
        <dd className="monto"><output>{formatearMoneda(total)}</output></dd>
      </div>
    </dl>
  );
}
