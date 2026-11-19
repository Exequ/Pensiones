/**
 * Gráficos ampliables y nombres de las fuentes en todas las rutas (fase R4), con la aplicación
 * completa:
 * - cada gráfico dibujado (todo SVG de Observable Plot con `role="img"`) está en una figura con su
 *   botón «Ampliar gráfico: título»: así no se olvida ningún envoltorio que dibuje por su cuenta;
 * - al ampliar cada gráfico, el diálogo lleva el gráfico redibujado, la tabla de datos, la fuente y,
 *   si la figura lo tiene, su «Cómo leerlo», y el DOM no tiene ningún `id` repetido;
 * - ningún botón «Fuente(s)» se anuncia igual que otro de la misma página.
 */
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { SECCIONES } from '../modules/secciones';

afterEach(() => {
  cleanup();
});

/** Rutas de la web, con las tres variantes de «Tu pensión» (como `voz-rutas.test.tsx`). */
const RUTAS: readonly string[] = [
  '/',
  ...SECCIONES.map((s) => `/${s.slug}`),
  '/tu-pension?v=1&p=inc',
  '/tu-pension?v=1&p=viu&hc=2026-03',
  '/tu-pension?v=1&p=orf&hc=2026-03',
  '/fuentes',
  '/cambios',
  '/diseno',
];

/** Rutas en las que tiene que haber al menos un gráfico. */
const CON_GRAFICOS = new Set([
  '/como-se-calcula',
  '/reformas',
  '/financiacion-y-deficit',
  '/hucha',
  '/cotizantes-y-pensionistas',
  '/proyecciones',
  '/otros-sistemas',
  '/mitos-y-realidades',
  '/diseno',
]);

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
  // Las páginas con tablas y gráficos terminan de pintar tras la carga perezosa.
  await new Promise((r) => setTimeout(r, 150));
  return container;
}

function idsRepetidos(): string[] {
  const vistos = new Map<string, number>();
  for (const el of document.querySelectorAll('[id]'))
    vistos.set(el.id, (vistos.get(el.id) ?? 0) + 1);
  return [...vistos].filter(([, n]) => n > 1).map(([id]) => id);
}

/** Nombre accesible de un botón de fuente: su `aria-label` o, sin él, su texto. */
const nombreFuente = (b: Element): string => b.getAttribute('aria-label') ?? b.textContent;

describe('gráficos ampliables y fuentes con nombre único en todas las rutas', () => {
  for (const ruta of RUTAS) {
    it(`${ruta}: cada gráfico tiene su botón «+», se amplía completo y las fuentes no se repiten de nombre`, async () => {
      const container = await pintarRuta(ruta);
      expect(idsRepetidos(), 'ids repetidos con todo cerrado').toEqual([]);

      // Todo SVG de gráfico está en una figura con su botón de ampliar.
      const svgs = [...container.querySelectorAll('svg[role="img"]')];
      const rutaSola = ruta.split('?')[0] ?? ruta;
      if (CON_GRAFICOS.has(rutaSola)) expect(svgs.length, 'gráficos').toBeGreaterThan(0);
      for (const svg of svgs) {
        const figura = svg.closest('figure.grafico');
        const titulo = svg.getAttribute('aria-label') ?? '';
        expect(figura, `figura del gráfico «${titulo}»`).not.toBeNull();
        const boton = figura?.querySelector(':scope > .grafico-ampliar');
        expect(boton?.getAttribute('aria-label'), titulo).toBe(`Ampliar gráfico: ${titulo}`);
      }

      // Cada gráfico se amplía con su tabla, su fuente y su «Cómo leerlo», sin ids repetidos.
      const botones = [...container.querySelectorAll<HTMLButtonElement>('.grafico-ampliar')];
      expect(botones.length).toBe(svgs.length);
      for (const boton of botones) {
        const figura = boton.closest('figure')!;
        const titulo = figura.querySelector('.grafico-titulo')?.textContent ?? '';
        fireEvent.click(boton);
        const dialogo = container.querySelector<HTMLDialogElement>('dialog.grafico-dialogo');
        expect(dialogo, titulo).not.toBeNull();
        expect(dialogo!.querySelector('.grafico-dialogo-titulo')?.textContent, titulo).toBe(titulo);
        expect(dialogo!.querySelector('svg[role="img"]'), `${titulo}: gráfico`).not.toBeNull();
        expect(dialogo!.querySelector('table caption'), `${titulo}: tabla`).not.toBeNull();
        const conFuente = figura.querySelector('.linea-fuente') !== null;
        expect(dialogo!.querySelector('.linea-fuente') !== null, `${titulo}: fuente`).toBe(
          conFuente,
        );
        const comoLeerlo = figura.nextElementSibling?.classList.contains('como-leerlo') ?? false;
        expect(dialogo!.querySelector('.como-leerlo') !== null, `${titulo}: cómo leerlo`).toBe(
          comoLeerlo,
        );
        expect(idsRepetidos(), `${titulo}: ids repetidos con el gráfico ampliado`).toEqual([]);
        fireEvent.click(dialogo!.querySelector<HTMLButtonElement>('.grafico-dialogo-cerrar')!);
        expect(container.querySelector('dialog.grafico-dialogo'), titulo).toBeNull();
      }

      // Ningún botón «Fuente(s)» se anuncia igual que otro de la misma página.
      const nombres = [...container.querySelectorAll('.linea-fuente-boton')].map(nombreFuente);
      const repetidos = [...new Set(nombres.filter((n, i) => nombres.indexOf(n) !== i))];
      expect(repetidos, 'nombres de «Fuentes» repetidos').toEqual([]);
      // Y todos llevan el título de lo que acompañan.
      expect(
        nombres.filter((n) => n === 'Fuente' || n === 'Fuentes'),
        'botones «Fuente(s)» sin título',
      ).toEqual([]);
    }, 120000);
  }
});
