import type { ReactNode } from 'react';
import estilos from './EncabezadoVista.module.css';

interface PropiedadesEncabezado {
  titulo: string;
  descripcion?: string;
  acciones?: ReactNode;
}

// Título de una vista con su descripción y botones; lleva la clase `animable`
export function EncabezadoVista({ titulo, descripcion, acciones }: PropiedadesEncabezado) {
  return (
    <header className={`${estilos.encabezado} animable`}>
      <div>
        <h1 className={estilos.titulo}>{titulo}</h1>
        {descripcion && <p className={estilos.descripcion}>{descripcion}</p>}
      </div>
      {acciones && <div className={estilos.acciones}>{acciones}</div>}
    </header>
  );
}
