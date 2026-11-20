/**
 * Cajas «Interpretación» en todas las rutas (fase RI), con la aplicación completa:
 * - cada caja va después del elemento que interpreta (nunca antes ni sola);
 * - los registros de ejemplo solo aparecen en /diseno;
 * - cada caja tiene su nombre accesible «Interpretación: título» y ninguna deja un marcador sin resolver.
 */
import { cleanup, render, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { INTERPRETACIONES } from '../contenido/interpretaciones';
import { SECCIONES } from '../modules/secciones';
import { cajasEn, problemasDeOrden } from '../test/interpretaciones';

afterEach(() => {
  cleanup();
});

const RUTAS: readonly string[] = [
  '/',
  ...SECCIONES.map((s) => `/${s.slug}`),
  '/fuentes',
  '/cambios',
  '/diseno',
];

async function pintarRuta(ruta: string): Promise<HTMLElement> {
  window.location.hash = `#${ruta}`;
  const { container } = render(createElement(App));
  await waitFor(
    () => {
      if (container.textContent.includes('Cargando')) throw new Error('pendiente');
      if (!container.querySelector('h1')) throw new Error('sin h1');
    },
    { timeout: 30000 },
  );
  await new Promise((r) => setTimeout(r, 150));
  return container;
}

describe('cajas «Interpretación» en todas las rutas', () => {
  for (const ruta of RUTAS) {
    it(`${ruta}: orden, ejemplos y nombre accesible`, { timeout: 60000 }, async () => {
      const c = await pintarRuta(ruta);
      const cajas = cajasEn(c);
      expect(problemasDeOrden(c), ruta).toEqual([]);
      for (const caja of cajas) {
        expect(caja.getAttribute('aria-label') ?? '').toMatch(/^Interpretación: \S/);
        expect(caja.textContent).not.toContain('{{');
        const id = caja.getAttribute('data-interpretacion') ?? '';
        const r = INTERPRETACIONES.find((x) => x.id === id);
        expect(r, id).toBeDefined();
        // Cada registro solo se usa en su página.
        expect(r?.pagina, id).toBe(ruta);
        if (ruta !== '/diseno') expect(caja.hasAttribute('data-ejemplo'), id).toBe(false);
      }
      // Cada página muestra exactamente los registros de su página (en /diseno, los ejemplos; esta fase
      // no publica ninguno en las páginas de contenido).
      expect(cajas.map((x) => x.getAttribute('data-interpretacion')).sort(), ruta).toEqual(
        INTERPRETACIONES.filter((x) => x.pagina === ruta)
          .map((x) => x.id)
          .sort(),
      );
    });
  }
});
