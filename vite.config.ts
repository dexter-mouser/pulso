import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Ruta del sitio en GitHub Pages
  base: '/pulso/',
  plugins: [react()],
});
