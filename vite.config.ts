/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// La web se publica en https://exequ.github.io/Pensiones/, de ahí la ruta base.
export default defineConfig({
  base: '/Pensiones/',
  plugins: [react()],
  build: {
    // Las fuentes se empaquetan como ficheros propios; nada se carga de dominios externos.
    assetsInlineLimit: 0,
    // El chunk de «Tu pensión» (motor + /data/parametros) supera los 500 kB a propósito: no se divide
    // en la Fase 3-B1 (véase docs/DECISIONES.md, «Fase 3-B1»). Se sube el límite para no ocultar
    // avisos nuevos de otros chunks por debajo de este tamaño.
    chunkSizeWarningLimit: 3000,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
