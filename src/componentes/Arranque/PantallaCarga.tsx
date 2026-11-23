import { NOMBRE_APP } from '../../config';
import { Icono } from '../Icono/Icono';
import estilos from './PantallaCarga.module.css';

interface PropiedadesCarga {
  mensaje?: string;
  onReintentar?: () => void;
}

// Pantalla mientras se cargan los datos (o si fallan)
export function PantallaCarga({ mensaje, onReintentar }: PropiedadesCarga) {
  return (
    <div className={estilos.pantalla} role={mensaje ? 'alert' : 'status'}>
      <span className={`${estilos.logo} ${mensaje ? '' : estilos.latiendo}`}><Icono nombre="logo" /></span>
      <p className={estilos.nombre}>{NOMBRE_APP}</p>
      <p className="texto-secundario">{mensaje ?? 'Cargando tu negocio…'}</p>
      {onReintentar && (
        <button type="button" className="boton boton-primario" onClick={onReintentar}>Reintentar</button>
      )}
    </div>
  );
}
