import { useMemo } from 'react';
import { useNegocio } from '../estado/Negocio';
import { crearFormateadorMoneda } from '../utilidades/formato';

// Formateador de dinero con la moneda del negocio
export function useFormateadorMoneda(): (valor: number) => string {
  const { datos } = useNegocio();
  return useMemo(() => crearFormateadorMoneda(datos.ajustes.moneda), [datos.ajustes.moneda]);
}
