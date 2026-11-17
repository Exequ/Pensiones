/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { calcularRecuentos } from './src/engine/metodologia.ts';
import {
  FICHEROS_DE_ENTRADA,
  leerEntradasMetodologia,
} from './scripts/lib/entradas-metodologia.ts';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const MODULO_RECUENTOS = 'virtual:recuentos-metodologia';

/**
 * Módulo virtual con los recuentos de la página «Metodología»: se calculan al compilar, con la
 * función pura `calcularRecuentos`, desde los ficheros del repositorio (nada se escribe a mano y la
 * página no arrastra los ficheros enteros).
 */
function recuentosMetodologia(): Plugin {
  const resuelto = `\0${MODULO_RECUENTOS}`;
  return {
    name: 'recuentos-metodologia',
    resolveId(origen) {
      return origen === MODULO_RECUENTOS ? resuelto : undefined;
    },
    load(id) {
      if (id !== resuelto) return undefined;
      for (const f of FICHEROS_DE_ENTRADA) this.addWatchFile(path.join(RAIZ, f));
      const recuentos = calcularRecuentos(leerEntradasMetodologia(RAIZ));
      return `export default ${JSON.stringify(recuentos)};`;
    },
  };
}

// La web se publica en https://exequ.github.io/Pensiones/, de ahí la ruta base.
export default defineConfig({
  base: '/Pensiones/',
  plugins: [react(), recuentosMetodologia()],
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
