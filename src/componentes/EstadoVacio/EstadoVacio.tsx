import type { ReactNode } from 'react';
import { Icono, type NombreIcono } from '../Icono/Icono';
import estilos from './EstadoVacio.module.css';

interface PropiedadesVacio {
  icono: NombreIcono;
  titulo: string;
  texto: string;
  accion?: ReactNode;
}

// Mensaje cuando una lista no tiene datos, con la acción para empezar
export function EstadoVacio({ icono, titulo, texto, accion }: PropiedadesVacio) {
  return (
    <div className={estilos.vacio}>
      <span className={estilos.icono}><Icono nombre={icono} /></span>
      <p className={estilos.titulo}>{titulo}</p>
      <p className={estilos.texto}>{texto}</p>
      {accion && <div className={estilos.accion}>{accion}</div>}
    </div>
  );
}
