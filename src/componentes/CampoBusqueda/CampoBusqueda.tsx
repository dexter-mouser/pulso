import type { Ref } from 'react';
import { Icono } from '../Icono/Icono';
import estilos from './CampoBusqueda.module.css';

interface PropiedadesBusqueda {
  valor: string;
  onCambiar: (valor: string) => void;
  etiqueta: string;
  placeholder?: string;
  autoFocus?: boolean;
  // Referencia al campo, p. ej. para enfocarlo al abrir un panel
  referencia?: Ref<HTMLInputElement>;
}

// Campo de búsqueda con icono; la etiqueta es accesible aunque no se vea
export function CampoBusqueda({ valor, onCambiar, etiqueta, placeholder = 'Buscar…', autoFocus = false, referencia }: PropiedadesBusqueda) {
  return (
    <label className={estilos.busqueda}>
      <span className="solo-lector">{etiqueta}</span>
      <Icono nombre="buscar" tamano="pequeno" />
      <input
        ref={referencia}
        type="search"
        className={estilos.entrada}
        value={valor}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(evento) => onCambiar(evento.target.value)}
      />
    </label>
  );
}
