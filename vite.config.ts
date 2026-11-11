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
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
