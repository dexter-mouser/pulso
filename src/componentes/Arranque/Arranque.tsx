import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { App } from '../../App';
import { hayConfiguracionSupabase, type FuenteDatos } from '../../datos/fuente';
import { crearFuenteLocal } from '../../datos/local/fuenteLocal';
import { ProveedorAvisos } from '../../estado/Avisos';
import { ProveedorNegocio } from '../../estado/Negocio';
import { ProveedorPaneles } from '../../estado/Paneles';
import type { DatosNegocio } from '../../tipos/negocio';
import { PantallaCarga } from './PantallaCarga';

// El código de Supabase solo se descarga si hay claves configuradas
const AccesoSupabase = lazy(() => import('../Acceso/AccesoSupabase'));

interface PropiedadesAplicacion {
  fuente: FuenteDatos;
  datos: DatosNegocio;
  miembroId?: string;
  onCerrarSesion?: () => void;
}

// Proveedores comunes a los dos modos
export function Aplicacion({ fuente, datos, miembroId, onCerrarSesion }: PropiedadesAplicacion) {
  return (
    <ProveedorAvisos>
      <ProveedorNegocio fuente={fuente} datosIniciales={datos} miembroInicialId={miembroId}>
        <ProveedorPaneles>
          <App onCerrarSesion={onCerrarSesion} />
        </ProveedorPaneles>
      </ProveedorNegocio>
    </ProveedorAvisos>
  );
}

// Carga los datos de una fuente y muestra carga o error mientras tanto
export function useCarga(fuente: FuenteDatos | null) {
  const [datos, setDatos] = useState<DatosNegocio | null>(null);
  const [hayError, setHayError] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!fuente) return;
    let sigueMontado = true;
    setHayError(false);
    fuente
      .cargar()
      .then((cargados) => sigueMontado && setDatos(cargados))
      .catch((error: unknown) => {
        console.error('Error al cargar los datos', error);
        if (sigueMontado) setHayError(true);
      });
    return () => {
      sigueMontado = false;
    };
  }, [fuente, intento]);

  const reintentar = useCallback(() => setIntento((numero) => numero + 1), []);
  return { datos, hayError, reintentar };
}

function ArranqueLocal() {
  const [fuente] = useState(crearFuenteLocal);
  const { datos, hayError, reintentar } = useCarga(fuente);
  if (hayError) return <PantallaCarga mensaje="No se pudieron leer los datos guardados." onReintentar={reintentar} />;
  if (!datos) return <PantallaCarga />;
  return <Aplicacion fuente={fuente} datos={datos} />;
}

export function Arranque() {
  if (!hayConfiguracionSupabase()) return <ArranqueLocal />;
  return (
    <Suspense fallback={<PantallaCarga />}>
      <AccesoSupabase />
    </Suspense>
  );
}
