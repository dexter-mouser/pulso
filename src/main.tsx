// Estilos globales primero, para que los módulos de cada componente puedan sobrescribirlos
import './estilos/tokens.css';
import './estilos/base.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { Arranque } from './componentes/Arranque/Arranque';
import { iniciarEscalaPantalla } from './utilidades/escalaPantalla';

gsap.registerPlugin(useGSAP);
iniciarEscalaPantalla();

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('No existe el elemento #raiz');

createRoot(raiz).render(
  <StrictMode>
    <Arranque />
  </StrictMode>,
);
