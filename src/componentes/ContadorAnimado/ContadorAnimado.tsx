import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { DURACION_CONTADOR, debeAnimar } from '../../utilidades/movimiento';

interface PropiedadesContador {
  valor: number;
  formatear: (valor: number) => string;
}

// Cuenta desde 0 hasta el valor; el texto lo escribe el efecto para no chocar con React
export function ContadorAnimado({ valor, formatear }: PropiedadesContador) {
  const referencia = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const elemento = referencia.current;
      if (!elemento) return;
      if (!debeAnimar()) {
        elemento.textContent = formatear(valor);
        return;
      }
      const estado = { actual: 0 };
      elemento.textContent = formatear(0);
      gsap.to(estado, {
        actual: valor,
        duration: DURACION_CONTADOR,
        ease: 'power3.out',
        onUpdate: () => {
          elemento.textContent = formatear(estado.actual);
        },
      });
    },
    { dependencies: [valor, formatear] },
  );

  return <span ref={referencia} className="cifra" />;
}
