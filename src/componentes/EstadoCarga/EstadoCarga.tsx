import estilos from './EstadoCarga.module.css';

// Barras grises con la forma del contenido mientras carga
export function Esqueleto({ filas = 3 }: { filas?: number }) {
  return (
    <div className={estilos.esqueleto} aria-hidden="true">
      {Array.from({ length: filas }, (_, indice) => (
        <span key={indice} className={estilos.barra} />
      ))}
    </div>
  );
}

interface PropiedadesError {
  mensaje?: string;
  onReintentar: () => void;
}

export function ErrorCarga({ mensaje = 'No se pudo cargar esta sección.', onReintentar }: PropiedadesError) {
  return (
    <div className={estilos.error} role="alert">
      <p>{mensaje}</p>
      <button type="button" className={estilos.reintentar} onClick={onReintentar}>
        Reintentar
      </button>
    </div>
  );
}
