/**
 * Voz de la web (fase R1, `docs/GUIA_DE_VOZ.md`): ningún texto visible de ninguna ruta usa lenguaje
 * de proyecto interno («ficheros descargados», «repositorio», rutas `data/…`, «revisión
 * actuarial»…), salvo en la zona permitida (`ZONA_PERMITIDA` en `scripts/lib/voz.ts`).
 * Recorre las rutas del HashRouter con la aplicación completa (cabecera, pie y banner incluidos). La
 * prueba del detector, de la lista y de las cadenas de código está en `scripts/voz-web.test.ts`.
 */
import { cleanup, render, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { ZONA_PERMITIDA, familiasExentasEn, vozEn } from '../../scripts/lib/voz.ts';
import { App } from '../App';
import { SECCIONES } from '../modules/secciones';

afterEach(() => {
  cleanup();
});

/** Rutas de la web, con las tres variantes de «Tu pensión» (p=inc, p=viu, p=orf). */
const RUTAS: readonly string[] = [
  '/',
  ...SECCIONES.map((s) => `/${s.slug}`),
  '/tu-pension?v=1&p=inc',
  '/tu-pension?v=1&p=viu&hc=2026-03',
  '/tu-pension?v=1&p=orf&hc=2026-03',
  '/fuentes',
  '/cambios',
  '/diseno',
  '/ruta-que-no-existe',
];

/** Textos visibles de un contenedor: nodos de texto y atributos que leen los lectores de pantalla. */
function textosVisibles(raiz: HTMLElement): string {
  const partes: string[] = [];
  const caminante = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
  for (let n = caminante.nextNode(); n; n = caminante.nextNode()) partes.push(n.textContent ?? '');
  for (const el of raiz.querySelectorAll('[aria-label],[title],[alt]')) {
    for (const a of ['aria-label', 'title', 'alt']) {
      const v = el.getAttribute(a);
      if (v) partes.push(v);
    }
  }
  partes.push(document.title);
  return partes.join('\n');
}

async function textoDeRuta(ruta: string): Promise<string> {
  window.location.hash = `#${ruta}`;
  const { container } = render(createElement(App));
  await waitFor(
    () => {
      if (container.textContent.includes('Cargando…')) throw new Error('pendiente');
    },
    { timeout: 30000 },
  );
  // Las páginas con tablas y gráficos terminan de pintar tras la carga perezosa.
  await new Promise((r) => setTimeout(r, 150));
  return textosVisibles(container);
}

describe('voz de la web en todas las rutas', () => {
  const textos = new Map<string, string>();

  for (const ruta of RUTAS) {
    it(`${ruta}: sin expresiones de proyecto interno fuera de la zona permitida`, async () => {
      const texto = await textoDeRuta(ruta);
      textos.set(ruta, texto);
      expect(texto.length).toBeGreaterThan(300);
      const rutaSola = ruta.split('?')[0] ?? ruta;
      const hallazgos = vozEn(texto, familiasExentasEn(rutaSola));
      expect(
        hallazgos.map((h) => `${h.nombre}: …${h.contexto}…`),
        ruta,
      ).toEqual([]);
    }, 60000);
  }

  it('la zona permitida es la única exención y sigue renderizándose', async () => {
    const rutas = new Set(ZONA_PERMITIDA.map((e) => e.ruta));
    expect([...rutas]).toEqual(['/metodologia']);
    for (const exencion of ZONA_PERMITIDA) {
      expect(RUTAS, exencion.ruta).toContain(exencion.ruta);
      const texto = textos.get(exencion.ruta) ?? (await textoDeRuta(exencion.ruta));
      for (const familia of exencion.familias) {
        // Una exención sin ninguna aparición sería huérfana: se retira.
        const sin = vozEn(
          texto,
          exencion.familias.filter((f) => f !== familia),
        );
        expect(
          sin.filter((h) => h.familia === familia).length,
          `${exencion.ruta}: la familia «${familia}» ya no aparece; retira la exención`,
        ).toBeGreaterThan(0);
      }
    }
  }, 60000);
});
