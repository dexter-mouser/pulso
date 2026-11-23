import type { ReactNode } from 'react';

// Trazos de 24x24 con línea de 1.5px
const trazos = {
  logo: <path d="M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0" />,
  buscar: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  mas: <path d="M12 5v14M5 12h14" />,
  menos: <path d="M5 12h14" />,
  cerrar: <path d="M6 6l12 12M18 6 6 18" />,
  reloj: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  lapiz: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  basura: <><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
  escudo: <><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z" /><path d="m9 12 2 2 4-4" /></>,
  ajustes: <><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>,
  luna: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
  sol: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  campana: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></>,
  abajo: <path d="m6 9 6 6 6-6" />,
  arriba: <path d="m6 15 6-6 6 6" />,
  izquierda: <path d="m15 6-6 6 6 6" />,
  derecha: <path d="m9 6 6 6-6 6" />,
  expandir: <path d="M7 17 17 7M7 7h10v10" />,
  personas: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" /></>,
  usuario: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  calendario: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  check: <path d="m5 12 5 5 9-10" />,
  alerta: <><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  carrito: <><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h3l2.5 12h11.5l2-8H6.2" /></>,
  caja: <><path d="m3 7 9-4 9 4-9 4-9-4Z" /><path d="M3 7v10l9 4 9-4V7M12 11v10" /></>,
  billete: <><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 10v4M18 10v4" /></>,
  grafico: <><path d="M3 20h18" /><path d="M6 16v-5M11 16V7M16 16v-8M20 16v-3" /></>,
  tendencia: <path d="m3 17 6-6 4 4 8-8M15 7h6v6" />,
  inicio: <><path d="m3 11 9-7 9 7" /><path d="M5 10v10h14V10" /></>,
  lista: <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></>,
  tienda: <><path d="M4 9h16l-1-5H5L4 9Z" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
  etiqueta: <><path d="M3 12V4h8l10 10-8 8L3 12Z" /><circle cx="7.5" cy="8.5" r="1.5" /></>,
} satisfies Record<string, ReactNode>;

export type NombreIcono = keyof typeof trazos;

interface PropiedadesIcono {
  nombre: NombreIcono;
  tamano?: 'normal' | 'pequeno';
  className?: string;
}

// Decorativo: el texto accesible va en el botón que lo contiene
export function Icono({ nombre, tamano = 'normal', className = '' }: PropiedadesIcono) {
  const clases = ['icono', tamano === 'pequeno' ? 'icono-pequeno' : '', className].filter(Boolean).join(' ');
  return (
    <svg className={clases} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {trazos[nombre]}
    </svg>
  );
}
