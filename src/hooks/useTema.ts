import { useCallback, useEffect } from 'react';

// Esquema de color: 'light dark' sigue al sistema; 'light' y 'dark' lo fijan
const CLAVE_ESQUEMA = 'esquema-color';
const ESQUEMA_SISTEMA = 'light dark';

function obtenerMeta(): HTMLMetaElement | null {
  return document.querySelector('meta[name="color-scheme"]');
}

function esquemaDelSistema(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function guardar(valor: string | null) {
  try {
    if (valor === null) localStorage.removeItem(CLAVE_ESQUEMA);
    else localStorage.setItem(CLAVE_ESQUEMA, valor);
  } catch (error) {
    console.error('No se pudo guardar el tema', error);
  }
}

function aplicarEsquema(valor: string) {
  const meta = obtenerMeta();
  if (meta) meta.content = valor;
}

// Esquema que se está mostrando ahora mismo
function esquemaMostrado(): 'light' | 'dark' {
  const actual = obtenerMeta()?.content;
  return actual === 'light' || actual === 'dark' ? actual : esquemaDelSistema();
}

export function useTema(): { alternarTema: () => void } {
  // Sincroniza el tema entre pestañas del navegador
  useEffect(() => {
    function alCambiarAlmacenamiento(evento: StorageEvent) {
      if (evento.key !== null && evento.key !== CLAVE_ESQUEMA) return;
      const valor = evento.key === null ? null : evento.newValue;
      aplicarEsquema(valor === 'light' || valor === 'dark' ? valor : ESQUEMA_SISTEMA);
    }
    window.addEventListener('storage', alCambiarAlmacenamiento);
    return () => window.removeEventListener('storage', alCambiarAlmacenamiento);
  }, []);

  // Si el objetivo coincide con el sistema, vuelve a seguirlo
  const alternarTema = useCallback(() => {
    const objetivo = esquemaMostrado() === 'dark' ? 'light' : 'dark';
    if (objetivo === esquemaDelSistema()) {
      guardar(null);
      aplicarEsquema(ESQUEMA_SISTEMA);
    } else {
      guardar(objetivo);
      aplicarEsquema(objetivo);
    }
  }, []);

  return { alternarTema };
}
