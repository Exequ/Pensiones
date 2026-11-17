/**
 * Página «Cómo se calcula»: estructura de cada sección, navegación, coincidencia de los números
 * mostrados con los del motor (por una entrada distinta de la fachada que usa la página),
 * neutralidad (lista de valoraciones y de veredictos) y cobertura del esquema.
 */
import { render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { valoracionesEn, veredictosEn } from '../../../scripts/lib/valoraciones.ts';
import { lecturasOfrecidas } from '../../engine/comparar-lecturas';
import { LECTURAS_ABIERTAS } from '../../engine/lecturas';
import { formatearEuros } from '../../engine/formato';
import { calcularIncapacidadPermanente } from '../../engine/incapacidad/repositorio';
import type { OpcionesIncapacidad } from '../../engine/incapacidad/tipos';
import type { OpcionesJubilacion } from '../../engine/jubilacion/tipos';
import type { BeneficiarioViudedad, OpcionesSupervivencia } from '../../engine/supervivencia/tipos';
import { calcularJubilacion } from '../../engine/jubilacion/repositorio';
import { calcularSupervivencia } from '../../engine/supervivencia/repositorio';
import { buscarSeccion } from '../secciones';
import { ejemplosCalculo } from './datos-como';
import { ejemplosCalculados, ejemplosDe, type IdSeccion } from './ejemplos';
import { ESQUEMAS } from './esquemas';
import ComoSeCalcula from './Pagina';

const seccion = buscarSeccion('como-se-calcula');
const IDS: readonly IdSeccion[] = ['jubilacion', 'incapacidad', 'viudedad', 'orfandad'];

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const pintar = () =>
  render(
    <MemoryRouter>
      <ComoSeCalcula />
    </MemoryRouter>,
  );

const euros2 = (v: number) => formatearEuros(v, { decimales: 2 });

describe('estructura de la página', () => {
  it('hay una sección por prestación, en el orden previsto', () => {
    const { container } = pintar();
    const secciones = [...container.querySelectorAll<HTMLElement>('section.como-seccion')];
    expect(secciones.map((s) => s.id)).toEqual(IDS.map((i) => `como-${i}`));
  });

  it.each(IDS)('la sección %s tiene todos sus bloques', (id) => {
    const { container } = pintar();
    const s = container.querySelector<HTMLElement>(`#como-${id}`)!;
    const titulos = [...s.querySelectorAll('h3')].map((h) => h.textContent);
    for (const t of [
      'Quién la cobra',
      'Cómo se calcula, paso a paso',
      'Parámetros vigentes',
      'Ejemplos calculados con el motor',
      'Lecturas que influyen',
      'Qué no calcula esta web',
    ])
      expect(titulos, `${id}: ${t}`).toContain(t);
    // Fuente de los parámetros, ejemplos con tabla de pasos, lecturas con estado y límites.
    expect(s.querySelector('.como-parametros .linea-fuente'), `${id}: fuente`).not.toBeNull();
    expect(s.querySelectorAll('.como-ejemplo').length, `${id}: ejemplos`).toBe(
      ejemplosDe(id).length,
    );
    expect(s.querySelectorAll('.como-ejemplo table').length).toBeGreaterThanOrEqual(
      3 * ejemplosDe(id).length,
    );
    expect(s.querySelectorAll('.como-lectura').length, `${id}: lecturas`).toBe(
      lecturasOfrecidas(id).length,
    );
    for (const l of s.querySelectorAll('.como-lectura')) {
      expect(l.textContent).toMatch(/Decidida|Provisional|Pendiente de decidir/);
    }
    expect(s.querySelectorAll('.como-no-calcula li').length, `${id}: no calcula`).toBeGreaterThan(
      2,
    );
    expect(s.querySelector('.como-no-calcula')?.textContent).toMatch(/no calculadas aquí todavía/);
    // Remite a «Tipos de pensión» y a «Tu pensión» sin duplicarlos.
    const enlaces = [...s.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(enlaces).toContain('/tipos-de-pension');
    expect(enlaces).toContain('/tu-pension');
  });

  it('el esquema de cada sección lista sus pasos en orden con su norma', () => {
    const { container } = pintar();
    for (const e of ESQUEMAS) {
      const s = container.querySelector<HTMLElement>(`#como-${e.ancla}`)!;
      const pasos = s.querySelectorAll('ol.como-pasos > li');
      expect(pasos).toHaveLength(e.pasos.length);
      for (const p of pasos) expect(p.textContent).toMatch(/Norma:/);
    }
  });

  it('el gráfico y sus tablas están solo en la sección de jubilación, con fuente y «Cómo leerlo»', () => {
    const { container } = pintar();
    const figuras = container.querySelectorAll('figure.grafico');
    expect(figuras.length).toBeGreaterThanOrEqual(3);
    for (const f of figuras) {
      expect(f.closest('#como-jubilacion')).not.toBeNull();
      expect(f.querySelector('figcaption')).not.toBeNull();
      expect(f.querySelector('table')).not.toBeNull();
      expect(f.querySelector('.linea-fuente')).not.toBeNull();
      expect(f.closest('.bloque-grafico')?.querySelector('.como-leerlo')).not.toBeNull();
    }
  });

  it('el motor cubre los pasos de todos los ejemplos con el esquema', () => {
    for (const e of ejemplosCalculados()) {
      const esquema = ESQUEMAS.find((x) => x.id === e.prestacion)!;
      const cubiertos = new Set(esquema.pasos.flatMap((p) => p.pasosMotor));
      for (const p of e.pasos) expect(cubiertos.has(p.id), `${e.id}: ${p.id}`).toBe(true);
    }
  });

  it('todas las tablas son <table> con cabeceras de columna', () => {
    const { container } = pintar();
    for (const t of container.querySelectorAll('table')) {
      expect(t.querySelector('caption'), 'caption').not.toBeNull();
      expect(t.querySelectorAll('thead th[scope="col"]').length).toBeGreaterThan(0);
    }
  });
});

describe('efecto de las lecturas', () => {
  it('se mide con el motor después de pintar la sección y se muestra en cada lectura', async () => {
    const { container } = pintar();
    expect(container.textContent).toContain('Calculando el efecto');
    await waitFor(() => {
      expect(container.textContent).not.toContain('Calculando el efecto');
    });
    const textos = [...container.querySelectorAll('#como-jubilacion .como-lectura')].map(
      (n) => n.textContent,
    );
    expect(textos).toHaveLength(lecturasOfrecidas('jubilacion').length);
    // Alguna lectura cambia algún ejemplo y otra no cambia ninguno.
    expect(
      textos.some((t) =>
        /con «[^»]+» (la pensión mensual sería|la base reguladora cambiaría)/.test(t),
      ),
    ).toBe(true);
    expect(
      textos.some((t) => t.includes('No cambia el resultado de ninguno de los ejemplos')),
    ).toBe(true);
  });
});

describe('navegación', () => {
  it('el índice lleva el foco al encabezado de cada sección', async () => {
    const { container } = pintar();
    const usuario = userEvent.setup();
    const indice = within(container.querySelector<HTMLElement>('nav.como-indice')!);
    const enlaces = indice.getAllByRole('link');
    expect(enlaces).toHaveLength(IDS.length + 1);
    for (const e of ESQUEMAS) {
      await usuario.click(indice.getByRole('link', { name: e.titulo }));
      expect(document.activeElement?.id).toBe(`como-${e.ancla}-titulo`);
    }
    await usuario.click(indice.getByRole('link', { name: 'Los términos de esta página' }));
    expect(document.activeElement?.id).toBe('como-terminos-titulo');
  });

  it('el índice es una navegación con nombre accesible y lista ordenada', () => {
    const { container } = pintar();
    const nav = container.querySelector('nav.como-indice')!;
    expect(nav.getAttribute('aria-labelledby')).toBeTruthy();
    expect(nav.querySelector('ol')).not.toBeNull();
  });
});

describe('los números mostrados son los del motor', () => {
  const base = ejemplosCalculo().ejemplos;

  it.each(base.map((e) => e.id))(
    '%s: pensión mensual y anual coinciden con la llamada directa',
    (id) => {
      const { container } = pintar();
      const e = ejemplosCalculados().find((x) => x.id === id)!;
      const d = base.find((x) => x.id === id)!;
      const escenario = d.escenarioIpc === undefined ? {} : { escenario: { ipc: d.escenarioIpc } };
      let mensual: number;
      let anual: number;
      switch (d.prestacion) {
        case 'jubilacion': {
          const o = d.entrada.opciones ?? {};
          const r = calcularJubilacion(
            d.entrada.carrera,
            d.entrada.nacimiento,
            d.entrada.fechaJubilacion,
            d.entrada.modalidad,
            { ...escenario, ...o } as OpcionesJubilacion,
          );
          [mensual, anual] = [r.pensionMensual, r.pensionAnual];
          break;
        }
        case 'incapacidad': {
          const r = calcularIncapacidadPermanente(
            d.entrada.carrera,
            d.entrada.nacimiento,
            d.entrada.fechaHechoCausante,
            d.entrada.grado,
            d.entrada.origen,
            { ...escenario, ...(d.entrada.opciones ?? {}) } as OpcionesIncapacidad,
          );
          [mensual, anual] = [r.pensionMensual, r.pensionAnual];
          break;
        }
        case 'viudedad': {
          const r = calcularSupervivencia(d.entrada.causante, {
            viudos: [d.entrada.viudo as BeneficiarioViudedad],
          });
          const p = r.viudedad[0]!;
          [mensual, anual] = [p.pensionMensual, p.pensionAnual];
          break;
        }
        case 'orfandad': {
          const r = calcularSupervivencia(
            d.entrada.causante,
            { huerfanos: d.entrada.huerfanos },
            (d.entrada.opciones ?? {}) as OpcionesSupervivencia,
          );
          const p = r.orfandad[0]!;
          [mensual, anual] = [p.pensionMensual, p.pensionAnual];
          break;
        }
      }
      expect(e.pensionMensual).toBeCloseTo(mensual, 6);
      expect(e.pensionAnual).toBeCloseTo(anual, 6);
      const texto = container.querySelector(`#ejemplo-${id}`)!.textContent;
      expect(texto).toContain(`${euros2(mensual)} por paga`);
      expect(texto).toContain(`${euros2(anual)} al año`);
    },
  );

  it('cada paso en euros al mes se muestra con el valor que devuelve el motor', () => {
    const { container } = pintar();
    for (const e of ejemplosCalculados()) {
      const filas = container.querySelectorAll(`#ejemplo-${e.id} table`);
      const tablaPasos = [...filas].find((t) =>
        t.querySelector('caption')?.textContent.startsWith('Pasos del cálculo'),
      )!;
      for (const p of e.pasos) {
        if (typeof p.valorMotor !== 'number' || !p.valor.endsWith('al mes')) continue;
        expect(tablaPasos.textContent, `${e.id}: ${p.id}`).toContain(
          `${euros2(p.valorMotor)} al mes`,
        );
      }
    }
  });

  it('cada ejemplo lleva la nota de supuestos ilustrativos y su caso de oro', () => {
    const { container } = pintar();
    for (const e of ejemplosCalculados()) {
      const nodo = container.querySelector(`#ejemplo-${e.id}`)!;
      expect(nodo.textContent).toContain('Supuestos ilustrativos, no son datos observados');
      expect(nodo.textContent).toContain(e.casoOro.id);
    }
  });
});

describe('neutralidad de la página', () => {
  it('el texto renderizado no contiene términos de veredicto ni palabras de valoración', async () => {
    const { container } = pintar();
    await waitFor(() => {
      expect(container.textContent).not.toContain('Calculando el efecto');
    });
    let texto = container.textContent;
    expect(texto.length).toBeGreaterThan(20000);
    // Los motivos de las lecturas se muestran tal como están en el registro (no son texto de esta
    // página): se comprueban aparte, porque describen el proceso de revisión («confirmada»).
    for (const l of LECTURAS_ABIERTAS)
      if (l.motivo !== null) texto = texto.replaceAll(l.motivo, '');
    expect(veredictosEn(texto)).toEqual([]);
    expect(valoracionesEn(texto)).toEqual([]);
  });

  it('los motivos de las lecturas solo usan «confirmada» para la revisión actuarial y no valoran', () => {
    for (const l of LECTURAS_ABIERTAS) {
      if (l.motivo === null) continue;
      expect(
        veredictosEn(l.motivo).filter((v) => v !== 'confirmad'),
        l.id,
      ).toEqual([]);
      if (veredictosEn(l.motivo).includes('confirmad'))
        expect(l.motivo, l.id).toMatch(/revisión actuarial/);
      expect(
        valoracionesEn(l.motivo).filter((v) => v !== 'confirmad'),
        l.id,
      ).toEqual([]);
    }
  });

  it('los textos del esquema, los ejemplos y la entrada de la sección tampoco', () => {
    const textos = [
      ...ESQUEMAS.flatMap((e) => [e.titulo, e.resumen, e.quien, ...e.noCalcula]),
      ...ESQUEMAS.flatMap((e) => e.pasos.flatMap((p) => [p.titulo, ...p.texto])),
      ...ejemplosCalculo().ejemplos.flatMap((e) => [e.titulo, e.descripcion]),
      ejemplosCalculo().nota,
      seccion.resumen,
      ...seccion.previsto,
    ].join(' ');
    expect(veredictosEn(textos)).toEqual([]);
    expect(valoracionesEn(textos)).toEqual([]);
  });

  it('las lecturas y los gráficos no se presentan como mejores, peores ni aconsejables', async () => {
    const { container } = pintar();
    await waitFor(() => {
      expect(container.textContent).not.toContain('Calculando el efecto');
    });
    const zonas = [
      ...container.querySelectorAll('.como-lecturas, figure.grafico, .como-leerlo'),
    ].map((n) => n.textContent.toLowerCase());
    const texto = zonas.join(' ');
    expect(texto.length).toBeGreaterThan(2000);
    for (const p of [
      'aconsej',
      'preferible',
      'la mejor',
      'la peor',
      'más ventajos',
      'hay que elegir',
    ])
      expect(texto, p).not.toContain(p);
  });
});
