/**
 * Índices «En esta página» de todas las rutas (fase R3), con la aplicación completa: cada entrada
 * lleva a un `<h2>` con el mismo texto, `id` estable y `tabIndex={-1}`; cada `<h2>` de contenido
 * está en el índice; y las páginas sin índice son las que se decidió (`docs/DECISIONES.md`).
 */
import { cleanup, render, waitFor, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../App';

afterEach(() => {
  cleanup();
});

/** Rutas con índice, su nombre accesible y si va fijo en la columna de notas. */
const CON_INDICE: readonly (readonly [string, string, boolean])[] = [
  ['/tipos-de-pension', 'En esta página', true],
  ['/como-se-calcula', 'En esta página', true],
  ['/reformas', 'En esta página', false],
  ['/financiacion-y-deficit', 'En esta página', true],
  ['/hucha', 'En esta página', true],
  ['/cotizantes-y-pensionistas', 'En esta página', true],
  ['/proyecciones', 'En esta página', true],
  ['/otros-sistemas', 'En esta página', false],
  ['/mitos-y-realidades', 'Afirmaciones', true],
  ['/metodologia', 'En esta página', true],
];

/** Rutas sin índice: menos de tres `<h2>` de contenido, o «Tu pensión» (simulador). */
const SIN_INDICE = ['/', '/tu-pension', '/fuentes', '/cambios', '/diseno'];

/** `<h2>` que no van en el índice: el cierre de cada página y las fichas de «Reformas». */
const fueraDelIndice = (h: Element): boolean =>
  h.closest('section')?.getAttribute('aria-labelledby') === 'contenido-pagina' ||
  h.closest('article.ref-ficha') !== null;

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
  return container;
}

describe('índice «En esta página» en cada ruta', () => {
  for (const [ruta, nombre, fijo] of CON_INDICE) {
    it(`${ruta}: cada entrada lleva a un encabezado con el mismo texto, y cada h2 está en el índice`, async () => {
      const container = await pintarRuta(ruta);
      const principal = container.querySelector('main')!;
      const nav = within(principal).getByRole('navigation', { name: nombre });
      expect(nav.closest('.indice-pagina-marco--fijo') !== null, 'variante fija').toBe(fijo);
      const enlaces = within(nav).getAllByRole('link');
      expect(enlaces.length, 'al menos tres entradas').toBeGreaterThanOrEqual(3);
      const destinos = enlaces.map((a) => a.getAttribute('data-destino') ?? '');
      expect(new Set(destinos).size).toBe(destinos.length);
      for (const [i, a] of enlaces.entries()) {
        const h = document.getElementById(destinos[i]!);
        expect(h?.tagName, destinos[i]).toBe('H2');
        expect(h?.getAttribute('tabindex'), destinos[i]).toBe('-1');
        expect(h?.textContent, destinos[i]).toBe(a.textContent);
      }
      // Las entradas siguen el orden de la página.
      const orden = [...principal.querySelectorAll('h2')].map((h) => h.id);
      const posiciones = destinos.map((d) => orden.indexOf(d));
      expect([...posiciones].sort((x, y) => x - y)).toEqual(posiciones);
      // Ningún h2 de contenido se queda fuera.
      const deContenido = [...principal.querySelectorAll('h2')].filter((h) => !fueraDelIndice(h));
      expect(deContenido.map((h) => h.id)).toEqual(destinos);
      // Los enlaces no apuntan a «#id» (con HashRouter cambiaría de ruta).
      for (const a of enlaces) expect(a.getAttribute('href')).toBe(`#${ruta}`);
    }, 60000);
  }

  for (const ruta of SIN_INDICE) {
    it(`${ruta}: no lleva índice`, async () => {
      const container = await pintarRuta(ruta);
      const principal = container.querySelector('main')!;
      expect(principal.querySelector('.indice-pagina')).toBeNull();
      if (ruta !== '/tu-pension') {
        const h2 = [...principal.querySelectorAll('h2')].filter((h) => !fueraDelIndice(h));
        expect(h2.length).toBeLessThan(3);
      }
    }, 60000);
  }

  it('las fichas de «Reformas» tienen su propio índice: la línea del tiempo', async () => {
    const container = await pintarRuta('/reformas');
    const linea = within(container).getByRole('navigation', { name: 'Línea del tiempo' });
    const destinos = within(linea)
      .getAllByRole('link')
      .map((a) => a.getAttribute('data-destino'));
    const fichas = [...container.querySelectorAll('article.ref-ficha h2')].map((h) => h.id);
    expect(destinos).toEqual(fichas);
  }, 60000);
});
