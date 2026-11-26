/**
 * Fase R10: «Otros sistemas» con las citas, los literales, las ubicaciones y los rótulos de la fuente
 * solo en «Fuentes», las definiciones del módulo, las fórmulas de los cálculos propios coherentes con
 * los datos y los criterios actuariales de la tanda B (19-11-2026) comprobados contra los datos.
 */
import { render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { definicionPorId } from '../../contenido/definiciones';
import { anclaDefinicion } from '../../engine/definiciones';
import type { ExprFormula } from '../../engine/esquema-datos';
import { formatearDuracion, formatearNumero } from '../../engine/formato';
import { abrirFuente, cerrarFuente, leerFuentes } from '../../test/fuentes';
import altasCsv from '../../../data/sistema/altas-bajas-anual-clase-sexo.csv?raw';
import vigorJson from '../../../data/sistema/pensiones-vigor-pension-media.json';
import salariosJson from '../../../data/macro/salario-medio-definiciones.json';
import { filasCsv } from '../../engine/series-historicas';
import { datosFinanciacion } from '../historico/datos-financiacion';
import { serieOcde } from './consultas';
import { cifraSuelta, datosSistemas, FICHEROS_OTROS_SISTEMAS } from './datos-sistemas';
import {
  DEFINICIONES_DE_ESTA_PAGINA,
  DEFINICIONES_REUTILIZADAS,
  fuentesDefinicionSistemas,
} from './fuentes-sistemas';
import { CONTRASTE, MEDIDA, RASGOS_EXCLUIDOS, SUPUESTO_DEFINICION } from './ids-datos';
import OtrosSistemas from './Pagina';
import { quitarUbicacionDeTabla } from './rasgos';

const pintar = () =>
  render(
    <MemoryRouter>
      <OtrosSistemas />
    </MemoryRouter>,
  );

const plano = (t: string): string => t.replace(/\s+/g, ' ');

/** Artículo, ubicación en el informe, código de la base de datos, fichero o rótulo de la fuente. */
const UBICACION_VISIBLE =
  /\barts?\.\s*\d|artículos?\s+\d|\bTRLGSS\b|\bDT\s*\d|\.xlsx|\.json|\.csv|\bpág\.|\bp\.\s*\d+ del informe|tabla \d+\.\d+|capítulo \d|panel [A-Z]\b|spr_exp_func|DSD_PAG|DF_PAG|ficha por país|Overview of the pension system|Ageing Report 2024/;

function figura(contenedor: HTMLElement, titulo: string): HTMLElement {
  const f = [...contenedor.querySelectorAll('figure.grafico')].find((x) =>
    x.querySelector('.grafico-titulo')?.textContent.includes(titulo),
  );
  if (!(f instanceof HTMLElement)) throw new Error(`Sin figura «${titulo}»`);
  return f;
}

const IDS_REUTILIZADAS = DEFINICIONES_REUTILIZADAS;

describe('citas, literales y ubicaciones fuera del cuerpo', () => {
  it('ninguna ubicación, código ni nombre de fichero en el cuerpo (desplegables cerrados)', () => {
    const { container } = pintar();
    expect(container.querySelectorAll('dialog')).toHaveLength(0);
    expect(container.textContent).not.toMatch(UBICACION_VISIBLE);
  });

  it('ninguna cita literal (tampoco las inglesas) ni literal de medida aparece en el cuerpo', () => {
    const { container } = pintar();
    const d = datosSistemas();
    const cuerpo = plano(container.textContent);
    const literales = [
      ...[MEDIDA.gasto, MEDIDA.edadActual, MEDIDA.edadFutura, MEDIDA.edadSalida].map((m) =>
        d.ocde.literalMedida(m),
      ),
      ...d.rasgos.map((r) => r.cita),
      ...Object.values(SUPUESTO_DEFINICION).map((id) => d.supuesto(id).dato.quote ?? ''),
    ].filter((c) => c.length > 10);
    expect(literales.length).toBeGreaterThan(30);
    for (const l of literales) expect(cuerpo, l).not.toContain(plano(l));
  });

  it('el literal de ELMEA ya no está en el cuerpo y sí en «Fuentes» del gráfico', () => {
    const { container } = pintar();
    const d = datosSistemas();
    const literal = d.ocde.literalMedida(MEDIDA.edadSalida);
    const f = figura(container, 'Edad efectiva de salida del mercado laboral');
    expect(plano(f.textContent)).not.toContain(literal);
    const texto = leerFuentes(f).texto;
    expect(texto).toContain(literal);
    expect(texto).toContain(MEDIDA.edadSalida);
    expect(texto).toContain('Se refiere a');
  });

  it('«Fuentes» de los gráficos de países trae el literal de la medida y su ubicación', () => {
    const { container } = pintar();
    const d = datosSistemas();
    const casos: readonly [string, string][] = [
      ['según la OCDE, ', MEDIDA.gasto],
      ['Edad normal de jubilación actual', MEDIDA.edadActual],
      ['Edad de jubilación futura', MEDIDA.edadFutura],
      ['Tasa de reposición bruta teórica', 'GPRR100'],
      ['Tasa de reposición neta teórica', 'NPRR100'],
    ];
    for (const [titulo, codigo] of casos) {
      const f = figura(container, titulo);
      expect(plano(f.textContent), titulo).not.toContain(d.ocde.literalMedida(codigo));
      const texto = leerFuentes(f).texto;
      expect(texto, titulo).toContain(d.ocde.literalMedida(codigo));
      expect(texto, titulo).toContain(`medida ${codigo}`);
    }
    const eurostat = leerFuentes(figura(container, 'según Eurostat, ')).texto;
    expect(eurostat).toContain('spr_exp_func');
    expect(eurostat).toContain('Se refiere a');
  });

  it('«Fuentes» de cada país en la estructura trae su etiqueta en español, la cita y la ubicación', () => {
    const { container } = pintar();
    const d = datosSistemas();
    for (const pais of container.querySelectorAll('.sistemas-pais')) {
      const nombre = pais.getAttribute('aria-label') ?? '';
      const cuerpo = plano(pais.textContent);
      const fuentes = plano(leerFuentes(pais).texto);
      const rasgos = d.rasgos.filter(
        (r) => !RASGOS_EXCLUIDOS.includes(r.id) && pais.querySelectorAll('li').length > 0,
      );
      expect(rasgos.length, nombre).toBeGreaterThan(0);
      const delPais = pais.querySelectorAll('.sistemas-rasgo').length;
      expect(delPais, nombre).toBeGreaterThan(0);
      for (const r of rasgos.filter((x) => cuerpo.includes(quitarUbicacionDeTabla(x.etiqueta)))) {
        expect(fuentes, r.id).toContain(plano(r.cita));
        expect(fuentes, r.id).toContain(plano(r.ubicacion));
        expect(fuentes, r.id).toContain(plano(r.etiqueta));
        expect(cuerpo, r.id).not.toContain(plano(r.cita));
        expect(cuerpo, r.id).not.toContain(plano(r.ubicacion));
      }
    }
  });

  it('la ubicación en una tabla del informe se quita de la frase que se ve y se conserva el contenido', () => {
    expect(quitarUbicacionDeTabla('tabla 3.1: un único componente obligatorio')).toBe(
      'Un único componente obligatorio',
    );
    expect(
      quitarUbicacionDeTabla('tabla 3.1, panel A (legislación más reciente, otra cosa): algo'),
    ).toBe('Legislación más reciente, otra cosa: algo');
    expect(
      quitarUbicacionDeTabla(
        'tabla 3.1, panel B (legislación vigente, donde difiere del panel A): algo',
      ),
    ).toBe('Legislación vigente, donde difiere de la legislación más reciente: algo');
    expect(quitarUbicacionDeTabla('sistema obligatorio de reparto')).toBe(
      'sistema obligatorio de reparto',
    );
    // Ninguna etiqueta que se ve lleva ya la ubicación.
    for (const r of datosSistemas().rasgos)
      expect(quitarUbicacionDeTabla(r.etiqueta), r.id).not.toMatch(UBICACION_VISIBLE);
  });
});

describe('definiciones del módulo en la página', () => {
  it('cada definición nueva y cada reutilizada están una vez, con su ancla, término y texto', () => {
    const { container } = pintar();
    for (const id of [...DEFINICIONES_DE_ESTA_PAGINA, ...IDS_REUTILIZADAS]) {
      const bloques = container.querySelectorAll(`#${anclaDefinicion(id)}`);
      expect(bloques, id).toHaveLength(1);
      const def = definicionPorId(id);
      expect(bloques[0]?.querySelector('dfn')?.textContent).toBe(def.termino);
      for (const p of def.texto) expect(plano(bloques[0]?.textContent ?? '')).toContain(plano(p));
    }
  });

  it('el desplegable de cada definición nueva se abre y muestra su fuente, sin fecha ni confianza', () => {
    const { container } = pintar();
    for (const id of DEFINICIONES_DE_ESTA_PAGINA) {
      const bloque = container.querySelector(`#${anclaDefinicion(id)}`);
      const boton = within(bloque as HTMLElement).getByRole('button', {
        name: new RegExp(
          `Fuentes?: Definición: ${definicionPorId(id).termino.replace(/[()]/g, '.')}`,
        ),
      });
      const linea = abrirFuente(boton.closest('.linea-fuente'));
      expect(linea.textContent, id).toMatch(/Organismo/);
      expect(linea.textContent, id).not.toMatch(/descargad|confianza/i);
      cerrarFuente(linea);
    }
  });

  it('cada referencia de las definiciones que usa la página tiene su fuente', () => {
    for (const id of [...DEFINICIONES_DE_ESTA_PAGINA, ...IDS_REUTILIZADAS]) {
      for (const ref of definicionPorId(id).datos)
        expect(fuentesDefinicionSistemas(ref, id), `${id} → ${ref}`).toBeDefined();
    }
  });

  it('los textos que definían las medidas en el cuerpo ya no están', () => {
    const { container } = pintar();
    const t = plano(container.textContent);
    expect(t).not.toMatch(/Definición de la OCDE:/);
    expect(t).not.toMatch(/Literal de la medida en la fuente/);
    expect(t).not.toMatch(/Medida «/);
    expect(t).not.toMatch(/no procede de una fuente consultada/);
    expect(t).not.toMatch(/Glosario/);
  });

  it('la sensibilidad no atribuye a la OCDE lo que solo recogen los datos de la web', () => {
    const { container } = pintar();
    const t = plano(container.textContent);
    expect(t).toMatch(
      /Los datos de esta web recogen la tasa bruta con el escenario alternativo solo para tres/,
    );
    expect(t).not.toMatch(/La OCDE publica la tasa bruta con el escenario alternativo solo/);
  });
});

describe('criterio de la tanda B: ESSPROS, OCDE y Ageing Report son medidas distintas y no se mezclan', () => {
  it('los gráficos del gasto toman cada serie de una sola fuente', () => {
    const { container } = pintar();
    const seccion = container.querySelector('#gasto')?.closest('section') as HTMLElement;
    const figuras = [...seccion.querySelectorAll('figure.grafico')] as HTMLElement[];
    expect(figuras.length).toBe(4);
    for (const f of figuras) {
      const titulo = f.querySelector('.grafico-titulo')?.textContent ?? '';
      const fuentes = leerFuentes(f).texto;
      const esOcde = /OECD|OCDE/.test(fuentes);
      const esEurostat = /Eurostat/.test(fuentes);
      expect(esOcde !== esEurostat, `una sola fuente en «${titulo}»`).toBe(true);
      expect(fuentes, titulo).not.toMatch(/Ageing Report|Comisión Europea/);
      expect(titulo, titulo).toMatch(esOcde ? /según la OCDE/ : /según Eurostat/);
    }
  });

  it('la página no usa ninguna serie del Ageing Report ni la mezcla con las de ESSPROS y la OCDE', () => {
    expect(FICHEROS_OTROS_SISTEMAS.some((f) => /ageing/i.test(f))).toBe(false);
    const { container } = pintar();
    const seccion = container.querySelector('#gasto')?.closest('section') as HTMLElement;
    // Las fichas del Ageing Report solo describen la estructura de los sistemas, no el gasto.
    expect(seccion.textContent).not.toMatch(/Ageing Report/);
    const ids = [
      'gasto-pensiones-ocde',
      'gasto-pensiones-esspros-vejez-supervivientes',
      'gasto-pensiones-contributivas-sin-complemento',
    ];
    for (const id of ids)
      expect(seccion.querySelectorAll(`#${anclaDefinicion(id)}`)).toHaveLength(1);
    expect(
      seccion.querySelector(`#${anclaDefinicion('gasto-pensiones-ageing-report')}`),
    ).toBeNull();
    expect(plano(seccion.textContent)).toMatch(
      /no son dos estimaciones de la misma cifra y el perímetro de cada una no consta/,
    );
  });

  it('el gasto en pensiones y la financiación se definen como cosas distintas (módulo)', () => {
    const { container } = pintar();
    const def = container.querySelector(`#${anclaDefinicion('gasto-frente-a-financiacion')}`);
    expect(def).not.toBeNull();
    expect(plano(def?.textContent ?? '')).toMatch(
      /El gasto en pensiones responde a cuánto se paga/,
    );
    expect(plano(def?.textContent ?? '')).toMatch(/La financiación responde a otra pregunta/);
  });

  it('las definiciones de las tres medidas no afirman un perímetro que no consta en las fuentes', () => {
    for (const id of ['gasto-pensiones-ocde', 'gasto-pensiones-esspros-vejez-supervivientes']) {
      const p = definicionPorId(id).perimetro;
      expect(p?.sinDetalle, id).toMatch(/no (?:lo )?afirma/);
    }
    expect(definicionPorId('gasto-pensiones-ocde').perimetro?.incluye).toEqual([]);
    expect(definicionPorId('gasto-pensiones-ageing-report').perimetro?.sinDetalle).toMatch(
      /no afirma/,
    );
  });
});

// ---------------------------------------------------------------------------
// Coherencia de las fórmulas con los datos
// ---------------------------------------------------------------------------

type Entorno = Readonly<Record<string, number>>;

/** Evalúa una expresión de símbolos con suma, resta, producto, cociente y grupo. */
function evaluar(e: ExprFormula, env: Entorno): number {
  switch (e.tipo) {
    case 'simbolo': {
      const v = env[e.id];
      if (v === undefined) throw new Error(`Sin valor para ${e.id}`);
      return v;
    }
    case 'suma':
      return e.terminos.reduce((a, t) => a + evaluar(t, env), 0);
    case 'resta':
      return evaluar(e.minuendo, env) - evaluar(e.sustraendo, env);
    case 'producto':
      return e.factores.reduce((a, f) => a * evaluar(f, env), 1);
    case 'cociente':
      return evaluar(e.numerador, env) / evaluar(e.denominador, env);
    case 'grupo':
      return evaluar(e.cuerpo, env);
    default:
      throw new Error(`Nodo no previsto en estas fórmulas: ${e.tipo}`);
  }
}

function resolver(id: string, env: Entorno, resultado: string): number {
  const f = definicionPorId(id).formula;
  if (f === undefined) throw new Error(`${id} sin fórmula`);
  const ec = f.ecuaciones.find(
    (x) => x.izquierda.tipo === 'simbolo' && x.izquierda.id === resultado,
  );
  if (ec === undefined) throw new Error(`${id}: sin ecuación para ${resultado}`);
  return evaluar(ec.derecha, env);
}

const num = (v: string | undefined): number => Number(v);

describe('fórmulas de los cálculos propios coherentes con los datos', () => {
  it('Diferencia con España = valor del país − valor de España (lo que muestra la tabla)', () => {
    const { container } = pintar();
    const d = datosSistemas();
    const f = figura(container, 'según la OCDE, ');
    const anio = Number(
      /(\d{4})$/.exec(f.querySelector('.grafico-titulo')?.textContent ?? '')?.[1],
    );
    const esp = serieOcde(d.ocde.observaciones, { medida: MEDIDA.gasto }, 'ESP').find(
      (p) => p.anio === anio,
    )?.valor;
    expect(esp).toBeDefined();
    let comprobadas = 0;
    for (const fila of f.querySelectorAll('tbody tr')) {
      const celdas = [...fila.querySelectorAll('th, td')].map((c) => c.textContent);
      const codigo = ['FRA', 'DEU', 'ITA', 'PRT', 'SWE'].find(
        (c) =>
          celdas[0] ===
          { FRA: 'Francia', DEU: 'Alemania', ITA: 'Italia', PRT: 'Portugal', SWE: 'Suecia' }[c],
      );
      if (codigo === undefined) continue;
      const v = serieOcde(d.ocde.observaciones, { medida: MEDIDA.gasto }, codigo).find(
        (p) => p.anio === anio,
      )?.valor;
      if (v === undefined) continue;
      const dif = resolver(
        'diferencia-con-espana',
        { 'v-pais': v, 'v-esp': esp ?? Number.NaN },
        'd',
      );
      expect(celdas[2], codigo).toBe(formatearNumero(dif, { decimales: 1 }));
      comprobadas += 1;
    }
    expect(comprobadas).toBeGreaterThan(2);
  });

  it('Gasto sobre el PIB = gasto ÷ PIB (en tanto por cien) reproduce el cálculo propio del contraste', () => {
    const d = datosSistemas();
    const f = datosFinanciacion();
    const propio = d.contraste.serie(CONTRASTE.gastoPropio).puntos;
    const gasto = new Map(f.ejecucion.sumaPensiones.puntos.map((p) => [p.anio, p.valor]));
    const pib = new Map(f.pib.puntos.map((p) => [p.anio, p.valor]));
    expect(propio.length).toBeGreaterThan(5);
    for (const p of propio) {
      const g = resolver(
        'gasto-sobre-pib',
        { gasto: gasto.get(p.anio) ?? Number.NaN, pib: pib.get(p.anio) ?? Number.NaN },
        'g',
      );
      expect(100 * g, String(p.anio)).toBeCloseTo(p.valor, 2);
    }
  });

  it('Cociente entre pensión media y salario medio = pensión × pagas ÷ salario (altas y en vigor, EAES)', () => {
    const d = datosSistemas();
    const eaes = salariosJson.series.find((s) => s.id === 'eaes-ambos');
    const salario = new Map((eaes?.points ?? []).map((p) => [p.period, p.value]));
    const altas = new Map(
      filasCsv(altasCsv)
        .filter(
          (r) =>
            r['movimiento'] === 'alta-inicial' &&
            r['clase'] === 'jubilacion' &&
            r['sexo'] === 'ambos',
        )
        .map((r) => [r['anio'] ?? '', num(r['pension_media_eur_mes'])]),
    );
    const vigor = new Map(
      (vigorJson.series.find((s) => s.id === 'jubilacion-ambos')?.points ?? []).map((p) => [
        p.period,
        p.value,
      ]),
    );
    // El número de pagas de la serie consta en su propio título («× … pagas»).
    const serieAltas = d.contraste.serie('pension-altas-sobre-salario-eaes');
    const pagas = Number(/× (\d+) pagas/.exec(serieAltas.serie.title)?.[1]);
    expect(pagas).toBeGreaterThan(0);
    for (const [id, pensiones] of [
      ['pension-altas-sobre-salario-eaes', altas],
      ['pension-vigor-sobre-salario-eaes', vigor],
    ] as const) {
      const serie = d.contraste.serie(id);
      expect(serie.puntos.length).toBeGreaterThan(3);
      for (const p of serie.puntos) {
        const r = resolver(
          'cociente-pension-media-salario-medio',
          {
            p: pensiones.get(String(p.anio)) ?? Number.NaN,
            n: pagas,
            s: salario.get(String(p.anio)) ?? Number.NaN,
          },
          'r',
        );
        expect(r, `${id} ${String(p.anio)}`).toBeCloseTo(p.valor, 3);
      }
    }
  });

  it('Carrera ininterrumpida = (edad menor − edad de entrada) × meses por año reproduce el dato', () => {
    const d = datosSistemas();
    const edadMenor = cifraSuelta(CONTRASTE.edadOcde).valor;
    const entrada = Number(
      /(\d+) años/.exec(String(d.supuesto('ocde-pag-entrada-mercado-laboral-22').valor))?.[1],
    );
    expect(entrada).toBeGreaterThan(0);
    const c = resolver(
      'carrera-ininterrumpida-hasta-la-edad-menor',
      { e: edadMenor, a: entrada, m: 12 },
      'c',
    );
    const dato = cifraSuelta(CONTRASTE.carreraCompleta);
    expect(c).toBe(dato.valor);
    expect(dato.unidad).toBe('meses');
    // La edad menor de la normativa es la de la OCDE para España y la carrera cotizada exigida es menor.
    expect(cifraSuelta(CONTRASTE.carrera65).valor).toBeLessThan(c);
    const { container } = pintar();
    expect(container.textContent).toContain(formatearDuracion(c));
  });

  it('cada fórmula nueva se ve con su leyenda y sin cifras en el cuerpo', () => {
    const { container } = pintar();
    for (const id of [
      'diferencia-con-espana',
      'cociente-pension-media-salario-medio',
      'carrera-ininterrumpida-hasta-la-edad-menor',
      'gasto-sobre-pib',
    ]) {
      const bloque = container.querySelector(`#${anclaDefinicion(id)}`);
      const formula = bloque?.querySelector('figure.formula, figure[class*="formula"]');
      expect(formula, id).not.toBeNull();
      expect(formula?.querySelector('math'), id).not.toBeNull();
      const f = definicionPorId(id).formula;
      for (const s of f?.simbolos ?? []) {
        expect(plano(formula?.textContent ?? ''), `${id}: ${s.nombre}`).toContain(s.nombre);
        expect(plano(formula?.textContent ?? ''), `${id}: ${s.nombre}`).toContain(
          plano(s.significado),
        );
      }
    }
  });
});
