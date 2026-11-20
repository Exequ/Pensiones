/**
 * Página «Reformas»: todas las fichas tienen la misma estructura y los mismos campos (cita,
 * vigencia, fuente), la navegación mueve el foco, los números mostrados son los de /data y el texto
 * no contiene términos de valoración ni de veredicto.
 */
import { render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { valoracionesReformasEn, veredictosEn } from '../../../scripts/lib/valoraciones.ts';
import { formatearNumero } from '../../engine/formato';
import { expectFuente } from '../../test/fuentes';
import { buscarSeccion } from '../secciones';
import { cronologia, graficosParametros, reformas } from './datos-reformas';
import Reformas from './Pagina';
import { textoSinInterpretaciones } from '../../test/interpretaciones';

const seccion = buscarSeccion('reformas');

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const pintar = () =>
  render(
    <MemoryRouter>
      <Reformas />
    </MemoryRouter>,
  );

const TITULOS_FICHA = [
  'La norma',
  'Qué cambia',
  'Parámetros afectados: valor antes y valor después',
  'Calendario de aplicación',
  'Dónde se explica en esta web',
];

describe('estructura de la página', () => {
  it('tiene el título de la sección, el aviso de neutralidad y la línea del tiempo', () => {
    const { container } = pintar();
    expect(container.querySelector('h1')?.textContent).toBe(seccion.titulo);
    expect(container.querySelector('.hist-aviso')?.textContent).toMatch(/No valora ninguna norma/);
    const items = container.querySelectorAll('.ref-linea-lista li');
    expect(items.length).toBe(cronologia().normas.length);
  });

  it('hay una ficha por norma, en orden cronológico, con el mismo título y enlace en la línea del tiempo', () => {
    const { container } = pintar();
    const fichas = [...container.querySelectorAll<HTMLElement>('article.ref-ficha')];
    expect(fichas.map((f) => f.id)).toEqual(reformas().map((r) => `ref-${r.id}`));
    const enlaces = [...container.querySelectorAll<HTMLAnchorElement>('.ref-linea-lista a')];
    // Cada enlace lleva al encabezado de su ficha sin cambiar de ruta (`InternalLink`).
    expect(enlaces.map((a) => a.dataset.destino)).toEqual(fichas.map((f) => `${f.id}-titulo`));
    // El `href` es la propia página (la ruta del `MemoryRouter` de la prueba), no un «#id».
    for (const a of enlaces) expect(a.getAttribute('href')).toBe('/');
    expect(enlaces.map((a) => a.textContent)).toEqual(
      fichas.map((f) => f.querySelector('h2')?.textContent),
    );
    const fechas = [...container.querySelectorAll('.ref-linea-lista time')].map((t) =>
      t.getAttribute('datetime'),
    );
    expect([...fechas].sort()).toEqual(fechas);
  });

  it('todas las fichas tienen exactamente los mismos apartados, en el mismo orden', () => {
    const { container } = pintar();
    for (const f of container.querySelectorAll<HTMLElement>('article.ref-ficha')) {
      const h3 = [...f.querySelectorAll('h3')].map((h) => h.textContent);
      expect(h3, f.id).toEqual(TITULOS_FICHA);
      expect(f.querySelectorAll('h2').length, f.id).toBe(1);
    }
  });

  it('cada ficha tiene las tres fechas, la base de la vigencia, la cita de cada cambio y la fuente', () => {
    const { container } = pintar();
    const vistas = reformas();
    for (const f of container.querySelectorAll<HTMLElement>('article.ref-ficha')) {
      const r = vistas.find((x) => `ref-${x.id}` === f.id);
      expect(r, f.id).toBeDefined();
      if (r === undefined) continue;
      const dts = [...f.querySelectorAll('.ref-datos dt')].map((d) => d.textContent);
      expect(dts, f.id).toEqual([
        'Rango',
        'Aprobación',
        'Publicación en el BOE',
        'Entrada en vigor',
        'Texto completo de la norma consultado',
      ]);
      const tiempos = [...f.querySelectorAll('.ref-datos time')].map((t) => t.textContent);
      expect(tiempos.slice(0, 2), f.id).toEqual([r.aprobacion, r.publicacion]);
      const vigor = f.querySelectorAll('.ref-datos div')[3]?.textContent ?? '';
      if (r.entradaEnVigor === null)
        expect(vigor, f.id).toMatch(/No consta en las fuentes consultadas/);
      else expect(tiempos[2], f.id).toBe(r.entradaEnVigor);
      expect(vigor, f.id).toContain(r.norma.entradaEnVigor.ubicacion);
      expect(f.querySelectorAll('.ref-cambio').length, f.id).toBe(r.cambios.length);
      for (const cambio of f.querySelectorAll('.ref-cambio')) {
        expect(cambio.querySelector('blockquote')?.textContent.length, f.id).toBeGreaterThan(10);
        expect(cambio.textContent, f.id).toMatch(/Artículo o disposición:/);
        expect(cambio.textContent, f.id).toMatch(/Antes:/);
        expect(cambio.textContent, f.id).toMatch(/Después:/);
      }
      expect(f.querySelector(':scope > .linea-fuente'), f.id).not.toBeNull();
      expectFuente(f, f.id);
      expect(
        within(f).getAllByRole('link', { name: new RegExp(r.norma.titulo.slice(0, 20)) }).length,
      ).toBeGreaterThan(0);
    }
  });

  it('el aviso de que un parámetro no equivale a un efecto está en todas las fichas', () => {
    const { container } = pintar();
    for (const f of container.querySelectorAll<HTMLElement>('article.ref-ficha'))
      expect(f.querySelector('.ref-aviso')?.textContent, f.id).toMatch(
        /no equivale a un efecto sobre la pensión de una persona/,
      );
  });

  it('cada tabla es una <table> con título, cabeceras de columna y de fila, fuente y «Cómo leerlo»', () => {
    const { container } = pintar();
    const tablas = [...container.querySelectorAll<HTMLElement>('.ref-tabla')];
    expect(tablas.length).toBeGreaterThan(8);
    for (const t of tablas) {
      expect(t.querySelector('table caption')?.textContent.length).toBeGreaterThan(5);
      expect(t.querySelectorAll('thead th[scope="col"]').length).toBeGreaterThan(1);
      expect(t.querySelectorAll('tbody th[scope="row"]').length).toBeGreaterThan(0);
      expectFuente(t, t.id);
      expect(t.querySelector('details summary')?.textContent).toBe('Cómo leerlo');
      expect(t.textContent).toMatch(/Definición:/);
    }
  });

  it('las fichas con calendario muestran su tabla y las demás dicen que no la hay', () => {
    const { container } = pintar();
    for (const r of reformas()) {
      const f = container.querySelector<HTMLElement>(`#ref-${r.id}`);
      const calendarios = r.tablas.filter((t) => t.tipo === 'calendario').length;
      const tablas = f?.querySelectorAll('.ref-tabla table').length ?? 0;
      expect(tablas, r.id).toBe(r.tablas.length);
      if (calendarios === 0)
        expect(f?.textContent, r.id).toMatch(/No hay un calendario de esta norma con valores\./);
    }
  });

  it('los enlaces a otras secciones van a las rutas de «Cómo se calcula», «Tipos de pensión» y la hucha', () => {
    const { container } = pintar();
    const ley2011 = container.querySelector<HTMLElement>('#ref-ley-27-2011');
    const hrefs = [...(ley2011?.querySelectorAll<HTMLAnchorElement>('.ref-enlaces a') ?? [])].map(
      (a) => a.getAttribute('href'),
    );
    expect(hrefs).toEqual(['/como-se-calcula', '/tipos-de-pension']);
    const rdl2023 = container.querySelector<HTMLElement>('#ref-rdl-2-2023');
    expect(
      [...(rdl2023?.querySelectorAll<HTMLAnchorElement>('.ref-enlaces a') ?? [])].map((a) =>
        a.getAttribute('href'),
      ),
    ).toEqual(['/como-se-calcula', '/hucha']);
  });
});

describe('navegación', () => {
  it('el enlace de la línea del tiempo lleva el foco al encabezado de la ficha', async () => {
    const { container } = pintar();
    const usuario = userEvent.setup();
    const enlace = container.querySelector<HTMLAnchorElement>(
      '.ref-linea-lista a[data-destino="ref-ley-27-2011-titulo"]',
    );
    expect(enlace).not.toBeNull();
    if (enlace === null) return;
    await usuario.click(enlace);
    expect(document.activeElement?.id).toBe('ref-ley-27-2011-titulo');
  });

  it('el índice se recorre con el teclado: cada enlace es focalizable y activable con Intro', async () => {
    const { container } = pintar();
    const usuario = userEvent.setup();
    const primero = container.querySelector<HTMLAnchorElement>('.ref-linea-lista a');
    primero?.focus();
    expect(document.activeElement).toBe(primero);
    await usuario.keyboard('{Enter}');
    expect(document.activeElement?.id).toMatch(/^ref-.*-titulo$/);
  });
});

describe('números', () => {
  it('el recuento de normas, de textos y de fechas de vigor coincide con la cronología', () => {
    const { container } = pintar();
    const normas = cronologia().normas;
    const texto = container.querySelector('.ref-alcance')?.textContent ?? '';
    expect(texto).toContain(`${formatearNumero(normas.length)} normas`);
    const conTexto = normas.filter((n) => n.textoDescargado !== undefined).length;
    const conVigor = normas.filter((n) => n.entradaEnVigor.fecha !== null).length;
    expect(texto).toContain(`${formatearNumero(conTexto)} tienen su texto completo`);
    expect(texto).toContain(`${formatearNumero(conVigor)} tienen una fecha de entrada en vigor`);
  });

  it('hay un gráfico por parámetro, con tabla de datos y fuente', () => {
    const { container } = pintar();
    const figuras = [...container.querySelectorAll('.ref-graficos figure')];
    expect(figuras.length).toBe(graficosParametros().length);
    for (const f of figuras) {
      expect(f.querySelector('figcaption')).not.toBeNull();
    }
    expect(container.querySelectorAll('.ref-graficos table').length).toBe(figuras.length);
  });
});

describe('neutralidad de la página', () => {
  /** Texto de la página sin los títulos oficiales ni las citas literales de las normas. */
  const textoPropio = (): string => {
    const { container } = pintar();
    const copia = container.cloneNode(true) as HTMLElement;
    for (const e of copia.querySelectorAll(
      'blockquote, .ref-titulo-oficial, .ref-literal, .linea-fuente',
    ))
      e.remove();
    return textoSinInterpretaciones(copia);
  };

  it('el texto propio no contiene términos de valoración ni de veredicto', () => {
    const texto = textoPropio();
    expect(texto.length).toBeGreaterThan(30000);
    expect(valoracionesReformasEn(texto)).toEqual([]);
    expect(veredictosEn(texto)).toEqual([]);
  });

  it('no usa las expresiones que el encargo prohíbe', () => {
    const texto = textoPropio().toLowerCase();
    for (const p of ['recorte', 'blindaje', 'contrarreforma'])
      expect(texto.includes(p), p).toBe(false);
  });
});
