import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { formatearEuros, formatearNumero } from '../../engine/formato';
import { buscarSeccion } from '../secciones';
import { datosTipos } from './datos-tipos';
import { FICHAS } from './ids-datos';
import TiposDePension from './Pagina';

function pintar() {
  return render(
    <MemoryRouter>
      <TiposDePension />
    </MemoryRouter>,
  );
}

const euros2 = (v: number) => formatearEuros(v, { decimales: 2 });
const entero = (v: number) => formatearNumero(v, { decimales: 0 });

function ficha(contenedor: HTMLElement, ancla: string): HTMLElement {
  const f = contenedor.querySelector(`#ficha-${ancla}`);
  if (!(f instanceof HTMLElement)) throw new Error(`Sin ficha «${ancla}»`);
  return f;
}

function tabla(f: HTMLElement, titulo: RegExp): HTMLElement {
  const t = within(f)
    .getAllByRole('table', { hidden: true })
    .find((x) => titulo.test(x.querySelector('caption')?.textContent ?? ''));
  if (!t) throw new Error(`Sin tabla ${titulo}`);
  return t;
}

const filas = (t: HTMLElement) =>
  [...t.querySelectorAll('tbody tr')].map((tr) =>
    [...tr.querySelectorAll('th, td')].map((c) => c.textContent),
  );

describe('página «Tipos de pensión»', () => {
  it('renderiza el título y sustituye el marcador en construcción', () => {
    pintar();
    expect(
      screen.getByRole('heading', { level: 1, name: buscarSeccion('tipos-de-pension').titulo }),
    ).toBeInTheDocument();
    expect(screen.queryByText('En construcción')).not.toBeInTheDocument();
  });

  it('hay una ficha por prestación, con su título', () => {
    const { container } = pintar();
    for (const c of FICHAS) {
      const f = ficha(container, c.ancla);
      expect(within(f).getByRole('heading', { level: 3, name: c.titulo })).toBeInTheDocument();
    }
    expect(container.querySelectorAll('.tipos-ficha').length).toBe(FICHAS.length);
  });

  it('cada ficha trae requisitos con artículo, cuantías, número de pensiones y fuente con enlace', () => {
    const { container } = pintar();
    for (const c of FICHAS) {
      const f = ficha(container, c.ancla);
      const requisitos = tabla(f, /Requisitos principales/);
      expect(filas(requisitos).length).toBeGreaterThan(0);
      for (const fila of filas(requisitos)) {
        expect(fila[2], `norma de un requisito de ${c.titulo}`).toMatch(/art|DT|disposición/i);
      }
      expect(filas(tabla(f, /Número y pensión media/)).length).toBeGreaterThan(0);
      const fuente = [...f.querySelectorAll('.linea-fuente')].map((x) => x.textContent).join(' ');
      expect(fuente).toMatch(/descargado el \d{4}-\d{2}-\d{2}/);
      expect(fuente).toMatch(/confianza: (alta|media|baja)/);
      expect(f.querySelector('.linea-fuente a[href^="https://www.boe.es/"]')).not.toBeNull();
    }
  });

  it('las cuantías mínimas coinciden con /data y la máxima, con la pensión máxima vigente', () => {
    const { container } = pintar();
    const d = datosTipos();
    const jub = d.fichas.find((x) => x.config.ancla === 'jubilacion');
    if (!jub?.maxima) throw new Error('sin máxima');
    const f = ficha(container, 'jubilacion');
    const t = tabla(f, /Cuantías mínimas de jubilación/);
    const primera = jub.cuantias[0];
    if (!primera) throw new Error('sin cuantías');
    const fila = filas(t)[0];
    expect(fila?.[2]).toBe(euros2(primera.anual));
    // Cálculo derivado: importe por paga con catorce pagas.
    expect(fila?.[3]).toBe(euros2(primera.anual / 14));
    expect(f.textContent).toContain(euros2(jub.maxima.mensual));
    expect(f.textContent).toContain(euros2(jub.maxima.anual));
  });

  it('las cuantías de cada ficha contributiva son del año de la pensión máxima', () => {
    const d = datosTipos();
    for (const x of d.fichas.filter((y) => y.config.modalidad === 'contributiva')) {
      expect(x.cuantias.length, x.config.titulo).toBeGreaterThan(0);
      for (const dato of x.datosCuantias) expect(dato.period).toBe(String(d.anioCuantias));
    }
  });

  it('el número de pensiones y la pensión media vienen de las series de /data', () => {
    const { container } = pintar();
    const d = datosTipos();
    const vi = d.fichas.find((x) => x.config.ancla === 'viudedad');
    const ambos = vi?.enVigor[0];
    if (!ambos) throw new Error('sin datos');
    const fila = filas(tabla(ficha(container, 'viudedad'), /Número y pensión media: Viudedad/))[0];
    expect(fila?.[0]).toBe('Ambos sexos');
    expect(fila?.[1]).toBe(entero(ambos.numero));
    expect(fila?.[2]).toBe(euros2(ambos.media ?? 0));
  });

  it('las pensiones no contributivas muestran la cuantía íntegra y la mínima derivada', () => {
    const { container } = pintar();
    const d = datosTipos();
    const p = d.fichas.find((x) => x.config.ancla === 'pnc-jubilacion')?.pnc;
    if (!p) throw new Error('sin PNC');
    const f = ficha(container, 'pnc-jubilacion');
    const t = filas(tabla(f, /Importe de la pensión no contributiva/));
    expect(t[0]?.[1]).toBe(euros2(p.anual));
    expect(t[1]?.[1]).toBe(euros2(p.anual * (p.minimaPorcentaje / 100)));
    expect(t[1]?.[0]).toMatch(/cálculo derivado/);
    // Sin pensión máxima ni cuantías mínimas del Anexo I.
    expect(
      within(f).queryByRole('table', { name: /Cuantías mínimas de/, hidden: true }),
    ).toBeNull();
  });

  it('la viudedad y la orfandad muestran el porcentaje del reglamento con su cita literal', () => {
    const { container } = pintar();
    for (const ancla of ['viudedad', 'orfandad']) {
      const f = ficha(container, ancla);
      const citas = f.querySelectorAll('.tipos-citas blockquote');
      expect(citas.length).toBeGreaterThan(0);
      expect(f.textContent).toMatch(/% de la base reguladora/);
      expect(f.querySelector('.linea-fuente a[href*="BOE-A-1966"]')).not.toBeNull();
    }
  });

  it('enlaza a «Tu pensión» solo en jubilación e incapacidad permanente', () => {
    const { container } = pintar();
    const enlaces = [...container.querySelectorAll('a[href="/tu-pension"]')];
    expect(enlaces.length).toBe(2);
    for (const a of enlaces) {
      expect(['ficha-jubilacion', 'ficha-incapacidad']).toContain(a.closest('article')?.id);
    }
  });

  it('la ficha de jubilación nombra las demás modalidades y la confianza de cada una', () => {
    const { container } = pintar();
    const f = ficha(container, 'jubilacion');
    expect(f.querySelectorAll('li').length).toBeGreaterThanOrEqual(6);
    expect(f.textContent).toMatch(/Jubilación parcial[\s\S]*confianza: media/);
  });

  it('el cuadro resumen lista todas las prestaciones con su número y su pensión media', () => {
    const { container } = pintar();
    const t = within(container).getByRole('table', {
      name: /Pensiones en vigor y pensión media de cada prestación/,
      hidden: true,
    });
    expect(filas(t).length).toBe(FICHAS.length);
  });

  it('no muestra valores vacíos ni no numéricos', () => {
    const { container } = pintar();
    expect(container.textContent).not.toMatch(/NaN|undefined|Infinity|\[object/);
  });

  it('lista al final lo que cubre y lo que queda fuera', () => {
    pintar();
    for (const punto of buscarSeccion('tipos-de-pension').previsto) {
      expect(screen.getByText(punto)).toBeInTheDocument();
    }
  });
});
