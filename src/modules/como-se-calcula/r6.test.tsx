/**
 * Fase R6: citas fuera del cuerpo y de las tablas (solo en «Fuentes»), apartado de modalidades con
 * su ancla y su enlace desde «Tipos de pensión», fórmulas con leyenda y tabla del efecto de adelantar
 * o retrasar la jubilación (cada valor coincide con el motor y con las figuras de coeficientes).
 */
import { render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { formatearPorcentaje } from '../../engine/formato';
import { efectoMesesJubilacion } from '../../engine/jubilacion/efecto-meses';
import { parametrosDelRepositorio } from '../../engine/jubilacion/parametros-datos';
import { abrirFuente, cerrarFuente } from '../../test/fuentes';
import TiposDePension from '../tipos-de-pension/Pagina';
import { DESTINO_MODALIDADES, ID_MODALIDADES, TITULO_MODALIDADES } from './anclas-modalidades';
import { anioVigente, datosDeUbicacion, elementosDe, modalidadesJubilacion } from './datos-como';
import { datosEfecto, fraccionDemoraPorDefecto } from './datos-efecto';
import { ejemplosCalculados } from './ejemplos';
import { ESQUEMAS } from './esquemas';
import { datosAnticipo } from './graficos';
import { MODALIDADES_JUBILACION } from './ids-datos';
import { norma } from './normas';
import ComoSeCalcula from './Pagina';
import { partesSinNorma } from './datos-como';
import { ID_LECTURA_SALVAGUARDA } from './pasos-motor';
import { idLectura } from './apartados';

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const pintar = (entrada: Parameters<typeof MemoryRouter>[0]['initialEntries'] = ['/']) =>
  render(
    <MemoryRouter initialEntries={entrada}>
      <ComoSeCalcula />
    </MemoryRouter>,
  );

/** Artículo, abreviatura de norma o ubicación: lo que no debe verse en el cuerpo. */
const CITA_VISIBLE = /\barts?\.\s*\d|artículos?\s+\d|\bDT\s*\d|TRLGSS|\bNorma:|\bNormas:/;

describe('citas fuera del cuerpo y de las tablas', () => {
  it('ningún artículo, DT, TRLGSS ni «Norma:» en el cuerpo de la página (con los desplegables cerrados)', () => {
    const { container } = pintar();
    expect(container.querySelectorAll('dialog')).toHaveLength(0);
    expect(container.textContent).not.toMatch(CITA_VISIBLE);
  });

  it('las tablas no llevan columna de norma ni de ubicación', () => {
    const { container } = pintar();
    const cabeceras = [...container.querySelectorAll('thead th')].map((th) => th.textContent);
    for (const c of cabeceras) expect(c).not.toMatch(/^Norma$|Dónde está en la norma|Ubicación/);
  });

  it('ninguna cita literal de los parámetros mostrados aparece en el cuerpo', () => {
    const { container } = pintar();
    const cuerpo = container.textContent;
    for (const fichero of [
      'jubilacion-coeficientes-voluntaria',
      'jubilacion-coeficientes-involuntaria',
      'jubilacion-demora-reglas',
      'divisor-base-reguladora',
    ]) {
      for (const d of elementosDe(fichero)) {
        if (d.quote !== undefined && d.quote.length > 12) expect(cuerpo).not.toContain(d.quote);
      }
    }
  });

  it('las normas de cada paso del esquema están en «Fuentes», con la descripción del paso como etiqueta', () => {
    const { container } = pintar();
    for (const e of ESQUEMAS) {
      const s = container.querySelector<HTMLElement>(`#como-${e.ancla}`)!;
      const linea = within(s)
        .getByRole('button', { name: `Fuentes: Normas de cada paso: ${e.titulo}` })
        .closest('.linea-fuente')!;
      abrirFuente(linea);
      const texto = linea.textContent;
      for (const p of e.pasos) {
        expect(texto, p.titulo).toContain(p.titulo);
        for (const id of p.normas)
          expect(texto, id).toContain(norma(id).etiqueta.split(' ')[1] ?? '');
      }
      // Una norma concreta con su ubicación completa.
      expect(texto).toContain('Se refiere a');
      expect(texto).toContain('Ubicación en el documento');
      cerrarFuente(linea);
    }
  });

  it('el artículo de cada requisito y de cada paso de un ejemplo está en «Fuentes» de su tabla', () => {
    const { container } = pintar();
    const e = ejemplosCalculados()[0]!;
    const nodo = container.querySelector<HTMLElement>(`#ejemplo-${e.id}`)!;
    for (const [prefijo, filas] of [
      ['Normas de los requisitos', e.requisitos.map((r) => r.articulo)],
      ['Normas de los pasos del cálculo', e.pasos.map((p) => p.articulo)],
    ] as const) {
      const boton = within(nodo).getByRole('button', {
        name: new RegExp(`^Fuentes?: ${prefijo}: ${e.titulo}$`),
      });
      const linea = boton.closest('.linea-fuente')!;
      abrirFuente(linea);
      for (const articulo of filas) {
        for (const parte of articulo.split(';')) {
          const t = parte.trim();
          // Cada ubicación con norma reconocida consta, tal cual, en el desplegable.
          if (t !== '' && partesSinNorma(t).length === 0) expect(linea.textContent, t).toContain(t);
        }
      }
      cerrarFuente(linea);
    }
  });

  it('cada ubicación de los requisitos y de los pasos de todos los ejemplos tiene una norma con fuente', () => {
    for (const e of ejemplosCalculados()) {
      for (const articulo of [
        ...e.requisitos.map((r) => r.articulo),
        ...e.pasos.map((p) => p.articulo),
      ])
        expect(partesSinNorma(articulo), `${e.id}: ${articulo}`).toEqual([]);
    }
  });

  it('los datos de «Fuentes» llevan la fuente, la fecha de descarga y la confianza del dato de origen', () => {
    const datos = datosDeUbicacion('Paso de prueba', 'art. 205 TRLGSS; art. 31 Decreto 3158/1966');
    expect(datos).toHaveLength(2);
    for (const d of datos) {
      expect(d.source.url).toMatch(/^https:\/\/www\.boe\.es\//);
      expect(d.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(['alta', 'media', 'baja']).toContain(d.confidence);
      expect(d.rotulo).toBe('Paso de prueba');
    }
    expect(datos.map((d) => d.location)).toEqual(['art. 205 TRLGSS', 'art. 31 Decreto 3158/1966']);
  });

  it('las lecturas no llevan artículos en el cuerpo y su norma está en «Fuentes»', () => {
    const { container } = pintar();
    const lecturas = container.querySelectorAll('.como-lectura');
    expect(lecturas.length).toBeGreaterThan(10);
    for (const l of lecturas) expect(l.textContent).not.toMatch(CITA_VISIBLE);
    // La lectura de la fracción de demora cita su artículo en «Fuentes».
    const fraccion = container.querySelector<HTMLElement>(
      `#${idLectura('jubilacion', 'jubilacion.fraccionDemora')}`,
    )!;
    const linea = fraccion.closest('li')!.querySelector('.linea-fuente')!;
    abrirFuente(linea);
    expect(linea.textContent).toMatch(/art\. 210\.2/);
  });
});

describe('apartado de modalidades de la jubilación', () => {
  it('tiene ancla estable, título definido en una constante y una entrada en el índice', () => {
    const { container } = pintar();
    const seccion = container.querySelector<HTMLElement>(`#${ID_MODALIDADES}`)!;
    const h2 = seccion.querySelector('h2')!;
    expect(h2.id).toBe(DESTINO_MODALIDADES);
    expect(h2.textContent).toBe(TITULO_MODALIDADES);
    expect(h2.getAttribute('tabindex')).toBe('-1');
    const indice = within(container).getByRole('navigation', { name: 'En esta página' });
    const enlace = within(indice).getByRole('link', { name: TITULO_MODALIDADES });
    expect(enlace.getAttribute('data-destino')).toBe(DESTINO_MODALIDADES);
  });

  it('describe las seis modalidades con requisitos y límites, sin artículos', () => {
    const { container } = pintar();
    const seccion = container.querySelector<HTMLElement>(`#${ID_MODALIDADES}`)!;
    const titulos = [...seccion.querySelectorAll('article.como-modalidad > h3')].map(
      (h) => h.textContent,
    );
    expect(titulos).toEqual(modalidadesJubilacion().map((m) => m.nombre));
    expect(modalidadesJubilacion().map((m) => m.id)).toEqual([...MODALIDADES_JUBILACION]);
    for (const a of seccion.querySelectorAll('article.como-modalidad')) {
      expect(a.querySelector('table'), a.id).not.toBeNull();
      expect(a.textContent).toContain('Límites:');
      expect(a.querySelectorAll('.linea-fuente').length).toBeGreaterThanOrEqual(3);
    }
    expect(seccion.textContent).not.toMatch(CITA_VISIBLE);
  });

  it('la ficha de jubilación de «Tipos de pensión» enlaza a la página con el ancla en el estado, no en la dirección', () => {
    const { container } = render(
      <MemoryRouter>
        <TiposDePension />
      </MemoryRouter>,
    );
    const enlace = within(container).getByRole('link', { name: `«${TITULO_MODALIDADES}»` });
    expect(enlace.getAttribute('href')).toBe('/como-se-calcula');
    expect(enlace.getAttribute('href')).not.toContain('#');
    expect(enlace.getAttribute('href')).not.toContain(DESTINO_MODALIDADES);
  });

  it('al llegar con el ancla en el estado de la navegación, el apartado recibe el foco', () => {
    pintar([{ pathname: '/como-se-calcula', state: { ancla: DESTINO_MODALIDADES } }]);
    expect(document.activeElement?.id).toBe(DESTINO_MODALIDADES);
  });
});

describe('fórmulas de las modalidades con leyenda', () => {
  const conFormula = modalidadesJubilacion().filter((m) => m.formula !== null);

  it('las modalidades con fórmula cerrada y cifras en los parámetros muestran su fórmula', () => {
    expect(conFormula.map((m) => m.id)).toEqual([
      'jubilacion-anticipada-voluntaria',
      'jubilacion-anticipada-involuntaria',
      'jubilacion-demorada',
      'jubilacion-parcial',
    ]);
    const { container } = pintar();
    for (const m of conFormula) {
      const a = container.querySelector<HTMLElement>(`#como-modalidad-${m.id}`)!;
      const figura = a.querySelector('figure.formula')!;
      expect(figura.querySelectorAll('math[display="block"]').length).toBe(
        m.formula?.ecuaciones.length,
      );
      // Leyenda de símbolos con nombre, significado y unidad, y las cifras vienen de los datos.
      const leyenda = figura.querySelectorAll('dl.formula-leyenda');
      expect(leyenda.length).toBeGreaterThanOrEqual(1);
      expect(leyenda[0]?.querySelectorAll('dt').length).toBe(m.formula?.simbolos.length);
      for (const s of m.formula?.simbolos ?? []) expect(figura.textContent).toContain(s.nombre);
    }
  });

  it('las dos modalidades sin parámetros para sus cifras conservan la fórmula en texto', () => {
    const sin = modalidadesJubilacion().filter((m) => m.formula === null);
    expect(sin.map((m) => m.id)).toEqual(['jubilacion-activa', 'jubilacion-flexible']);
    const { container } = pintar();
    for (const m of sin) {
      const a = container.querySelector<HTMLElement>(`#como-modalidad-${m.id}`)!;
      expect(a.querySelector('figure.formula')).toBeNull();
      expect(a.textContent).toContain(m.textos.formula);
    }
  });

  it('la leyenda de la demora muestra el umbral de cotización con su duración, leído de los datos', () => {
    const m = modalidadesJubilacion().find((x) => x.id === 'jubilacion-demorada')!;
    const umbral = elementosDe('jubilacion-demora-reglas').find(
      (d) => d.id === 'tanto-alzado-umbral-cotizacion-meses',
    )!;
    expect(umbral.value).toBe(m.formula?.cifras.find((c) => c.valor === umbral.value)?.valor);
    expect(m.formula?.cifras.some((c) => c.texto === '44 años y 6 meses')).toBe(true);
  });
});

describe('tabla del efecto de adelantar o retrasar la jubilación', () => {
  const TITULO = 'Cambio de la pensión de jubilación según los meses que se adelanta o se retrasa';
  const tabla = (container: HTMLElement) =>
    [...container.querySelectorAll('table')].find(
      (t) => t.querySelector('caption')?.textContent === TITULO,
    )!;
  const pct = (v: number, conSigno = true) =>
    formatearPorcentaje(v / 100, { decimales: 2, conSigno });

  it('es una tabla con título, cabeceras, fuente, nota de definición, «Cómo leerlo» y enlace al simulador', () => {
    const { container } = pintar();
    const t = tabla(container);
    expect(t).toBeDefined();
    expect(t.querySelectorAll('thead th[scope="col"]').length).toBe(11);
    const bloque = t.closest('.como-efecto')!;
    expect(bloque.querySelector('.linea-fuente-boton')?.getAttribute('aria-label')).toMatch(
      new RegExp(`^Fuentes?: ${TITULO}$`),
    );
    expect(bloque.querySelector('.como-leerlo')).not.toBeNull();
    const nota = bloque.querySelector('.tabla-datos-pie')!.textContent;
    expect(nota).toContain('Definición.');
    expect(nota).toContain('Qué no incluye.');
    expect(nota).toMatch(/pensión máxima, el complemento a mínimos ni la salvaguarda/);
    expect(nota).toContain('Vigencia.');
    const enlaces = [...bloque.querySelectorAll('a')].map(
      (a) => a.getAttribute('data-destino') ?? a.getAttribute('href'),
    );
    expect(enlaces).toContain('/tu-pension');
    expect(enlaces).toContain(idLectura('jubilacion', ID_LECTURA_SALVAGUARDA));
    // No dice que el simulador calcule la anticipada.
    expect(bloque.textContent).toMatch(/calcula la jubilación ordinaria/);
    expect(bloque.textContent).not.toMatch(/calcula la (jubilación )?anticipada/i);
  });

  it('cada celda coincide con la función del motor sobre los mismos parámetros', () => {
    const { container } = pintar();
    const e = efectoMesesJubilacion(
      parametrosDelRepositorio(),
      anioVigente(),
      fraccionDemoraPorDefecto(),
    );
    const filas = [...tabla(container).querySelectorAll('tbody tr')];
    expect(filas).toHaveLength(e.filas.length);
    for (const [i, f] of e.filas.entries()) {
      const celdas = [...(filas[i]?.children ?? [])].map((c) => c.textContent);
      const esperado = [
        String(f.meses),
        ...f.voluntaria.map((v) => (v === null ? '—' : pct(v))),
        ...f.involuntaria.map((v) => (v === null ? '—' : pct(v))),
        pct(f.demoraPuntos),
        pct(f.demoraCambio),
      ];
      expect(celdas, `${f.meses} meses`).toEqual(esperado);
    }
  });

  it('cubre los cuatro tramos de cada cuadro y los meses límite de los datos', () => {
    const d = datosEfecto();
    expect(d.efecto.voluntaria.tramos).toHaveLength(4);
    expect(d.efecto.involuntaria.tramos).toHaveLength(4);
    const { container } = pintar();
    const filas = [...tabla(container).querySelectorAll('tbody tr')];
    const ultima = filas.at(-1)!;
    // Última fila: el mayor número de meses; allí la voluntaria ya no cabe (guiones) y la involuntaria sí.
    const celdas = [...ultima.children].map((c) => c.textContent);
    expect(celdas[0]).toBe(String(d.efecto.involuntaria.mesesMaximos));
    expect(celdas.slice(1, 5)).toEqual(['—', '—', '—', '—']);
    expect(celdas.slice(5, 9).every((c) => c !== '—')).toBe(true);
    // El primer mes que la voluntaria no admite es el siguiente a su límite.
    const primeraSinVoluntaria = filas.find((f) => f.children[1]?.textContent === '—')!;
    expect(primeraSinVoluntaria.children[0]?.textContent).toBe(
      String(d.efecto.voluntaria.mesesMaximos + 1),
    );
  });

  it('coincide con las figuras de coeficientes de anticipo que ya existían (la norma manda)', () => {
    const d = datosEfecto();
    for (const [cuadro, tramos, offset] of [
      ['voluntaria', d.efecto.voluntaria.tramos, 0],
      ['involuntaria', d.efecto.involuntaria.tramos, 0],
    ] as const) {
      const figura = datosAnticipo(cuadro);
      for (const [t] of tramos.entries()) {
        const serie = figura.series[t + offset]!;
        for (const p of serie.puntos) {
          const meses = p.anio + 1;
          const fila = d.efecto.filas.find((f) => f.meses === meses)!;
          const celda = (cuadro === 'voluntaria' ? fila.voluntaria : fila.involuntaria)[t];
          // La figura muestra la reducción en positivo; la tabla, el cambio de la pensión en negativo.
          expect(celda, `${cuadro} tramo ${t + 1}, ${meses} meses`).toBe(-p.valor);
        }
      }
    }
  });
});
