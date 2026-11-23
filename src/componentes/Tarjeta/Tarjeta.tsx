import type { ReactNode } from 'react';
import { ErrorCarga, Esqueleto } from '../EstadoCarga/EstadoCarga';
import estilos from './Tarjeta.module.css';

interface PropiedadesTarjeta {
  titulo: string;
  estado: 'cargando' | 'error' | 'listo';
  onReintentar: () => void;
  extra?: ReactNode;
  className?: string;
  children?: ReactNode;
}

// Tarjeta con cabecera y estados de carga y error; lleva la clase `animable` para el cambio de vista
export function Tarjeta({ titulo, estado, onReintentar, extra, className = '', children }: PropiedadesTarjeta) {
  return (
    <article className={`${estilos.tarjeta} ${className} animable`} aria-busy={estado === 'cargando'}>
      <header className={estilos.cabecera}>
        <h2 className={estilos.titulo}>{titulo}</h2>
        {extra}
      </header>
      <span className="solo-lector" role="status">
        {estado === 'cargando' ? `Cargando ${titulo}…` : ''}
      </span>
      {estado === 'cargando' && <Esqueleto />}
      {estado === 'error' && <ErrorCarga onReintentar={onReintentar} />}
      {estado === 'listo' && children}
    </article>
  );
}
