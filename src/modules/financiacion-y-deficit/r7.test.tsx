/**
 * Fase R7: «Financiación y déficit» con las definiciones del módulo, las citas y los rótulos de la
 * fuente solo en «Fuentes», los literales de la OCDE (ELMEA, OAIP y gasto público) en «Fuentes» y
 * las fórmulas de los cálculos propios coherentes con los datos.
 */
import { render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { DatoRotulado } from '../../components/fuentes';
import { definicionPorId } from '../../contenido/definiciones';
import { anclaDefinicion } from '../../engine/definiciones';
import type { ExprFormula } from '../../engine/esquema-datos';
import {
  diferencia,
  literalDelTitulo,
  porcentajeDelPib,
  suma,
  type PuntoAnual,
} from '../../engine/series-historicas';
import { abrirFuente, cerrarFuente, leerFuentes } from '../../test/fuentes';
import {
  datosFinanciacion,
  datosFilasEjecucion,
  fuentesDefinicionFinanciacion,
} from '../historico/datos-financiacion';
import { datosMitos } from '../mitos-y-realidades/datos-mitos';
import Mitos from '../mitos-y-realidades/Pagina';
import Financiacion from './Pagina';
import {
  DEFINICIONES_GASTO,
  DEFINICIONES_SALDO,
  ROTULO_SALDO_SIN_TRANSFERENCIAS,
} from './definiciones-pagina';

const pintar = () =>
  render(
    <MemoryRouter>
      <Financiacion />
    </MemoryRouter>,
  );

/** Definiciones del módulo que muestra la página. */
const EN_LA_PAGINA = [
  'derechos-reconocidos-netos',
  'gasto-frente-a-financiacion',
  ...DEFINICIONES_SALDO,
  'saldo-no-financiero-menos-transferencias',
  ...DEFINICIONES_GASTO,
];

/** Artículo, norma, hoja de Excel, fichero o ubicación: lo que no debe verse en el cuerpo. */
const CITA_VISIBLE =
  /\barts?\.\s*\d|artículos?\s+\d|\bDT\s*\d|TRLGSS|\bNormas?:|ResumenP[IG]|\bhojas?\b|\.xlsx|\.json|\.csv|ResSISTEMA/;

/** Todas las citas que la página manda a «Fuentes» (definiciones y filas de la ejecución). */
function citasDeLaPagina(): string[] {
  const citas: string[] = [];
  for (const id of EN_LA_PAGINA) {
    for (const ref of definicionPorId(id).datos) {
      const r = fuentesDefinicionFinanciacion(ref, id);
      const lista: readonly DatoRotulado[] =
        r === undefined
          ? []
          : Array.isArray(r)
            ? (r as readonly DatoRotulado[])
            : [r as DatoRotulado];
      for (const d of lista) if (d.quote !== undefined) citas.push(d.quote);
    }
  }
  const filas = datosFilasEjecucion();
  citas.push(filas.sumaPensiones.quote ?? '', filas.complementoMinimos.quote ?? '');
  return citas.filter((c) => c.length > 8);
}

describe('citas y rótulos de la fuente fuera del cuerpo', () => {
  it('ningún artículo, norma, hoja de Excel ni nombre de fichero en el cuerpo (desplegables cerrados)', () => {
    const { container } = pintar();
    expect(container.querySelectorAll('dialog')).toHaveLength(0);
    expect(container.textContent).not.toMatch(CITA_VISIBLE);
  });

  it('ninguna cita literal de la fuente aparece en el cuerpo ni en las tablas', () => {
    const { container } = pintar();
    const cuerpo = container.textContent;
    for (const c of citasDeLaPagina()) expect(cuerpo, c).not.toContain(c);
    // La nota de la sanidad de Eurostat ya no está en inglés en la nota al margen.
    expect(cuerpo).not.toMatch(/Health competencies|State government|Social security funds/);
  });

  it('la nota del cambio de perímetro dice el año de los datos y lleva la cita en «Fuentes»', () => {
    const { container } = pintar();
    const nota = datosFinanciacion().definiciones.find((d) => d.id === 'nota-espana-sanidad-2002');
    const anio = /(\d{4})\.?$/.exec(nota?.literal ?? '')?.[1];
    expect(anio).toBeDefined();
    const margen = [...container.querySelectorAll('.nota-margen')].find((n) =>
      n.textContent.includes('Ruptura de serie'),
    );
    expect(margen?.textContent).toContain(`Hasta ${anio ?? ''}, las competencias de sanidad`);
    const linea = abrirFuente(margen?.querySelector('.linea-fuente') ?? null);
    expect(linea.textContent).toContain(nota?.literal ?? '—');
  });
});

describe('definiciones del módulo en la página', () => {
  it('cada definición está una vez, con su ancla, su término y su texto', () => {
    const { container } = pintar();
    for (const id of EN_LA_PAGINA) {
      const bloques = container.querySelectorAll(`#${anclaDefinicion(id)}`);
      expect(bloques, id).toHaveLength(1);
      const d = definicionPorId(id);
      expect(bloques[0]?.querySelector('dfn')?.textContent).toBe(d.termino);
      for (const p of d.texto) expect(bloques[0]?.textContent).toContain(p);
    }
    // El antiguo texto escrito en el componente ya no está.
    expect(container.querySelector('.hist-literal')).toBeNull();
  });

  it('el rótulo del saldo menos transferencias es el término de su definición', () => {
    expect(ROTULO_SALDO_SIN_TRANSFERENCIAS).toBe(
      definicionPorId('saldo-no-financiero-menos-transferencias').termino,
    );
  });

  it('«Fuentes» de cada definición del saldo muestra el literal completo de la fuente', () => {
    const { container } = pintar();
    const definiciones = datosFinanciacion().definiciones;
    const literal = (id: string) => definiciones.find((d) => d.id === id)?.literal ?? '—';
    const esperado: Record<string, string[]> = {
      'saldo-presupuestario-no-financiero': [literal('saldo-presupuestario-no-financiero')],
      // El par completo «TOTAL INGRESOS / TOTAL GASTOS» (antes solo se veía el primero).
      'saldo-presupuestario-total': [literal('saldo-presupuestario-total')],
      'capacidad-necesidad-financiacion-sec': [
        literal('necesidad-financiacion-sec-s1314'),
        literal('nota-espana-sanidad-2002'),
      ],
    };
    expect(literal('saldo-presupuestario-total')).toMatch(/TOTAL INGRESOS \/ TOTAL GASTOS/);
    for (const [id, literales] of Object.entries(esperado)) {
      const bloque = container.querySelector(`#${anclaDefinicion(id)}`);
      const botonFuentes = bloque?.querySelector('.linea-fuente-boton')?.textContent ?? '';
      expect(['Fuente', 'Fuentes']).toContain(botonFuentes);
      const boton = within(bloque as HTMLElement).getByRole('button', {
        name: `${botonFuentes}: Definición: ${definicionPorId(id).termino}`,
      });
      const linea = abrirFuente(boton.closest('.linea-fuente'));
      for (const l of literales) expect(linea.textContent, id).toContain(l);
      expect(linea.textContent).toContain('Se refiere a');
      cerrarFuente(linea);
    }
  });

  it('los literales de la OCDE del gasto público y de las filas de la ejecución están en «Fuentes»', () => {
    const { container } = pintar();
    const ocde = datosFinanciacion().gastoSobrePib.ocde;
    const literal = literalDelTitulo(ocde.serie.title);
    expect(literal).toBe('Public expenditure on pensions');
    expect(container.textContent).not.toContain(literal);
    const bloque = container.querySelector(`#${anclaDefinicion('gasto-pensiones-ocde')}`);
    expect(leerFuentes(bloque).texto).toContain(literal);
    const conComplemento = container.querySelector(
      `#${anclaDefinicion('gasto-pensiones-contributivas-con-complemento')}`,
    );
    const texto = leerFuentes(conComplemento).texto;
    expect(texto).toContain('SUMA DE PENSIONES');
    expect(texto).toContain('COMPL. A MÍNIMOS PENSIONES CONTRIBUTIVAS');
  });
});

describe('«Mitos y realidades»: literales ELMEA y OAIP en «Fuentes»', () => {
  it('el título literal de cada serie es la cita de su dato y no se ve en el cuerpo', () => {
    const m = datosMitos();
    const series = [
      m.edad.salidaHombres,
      m.edad.salidaMujeres,
      m.pobreza.oaip,
      m.pobreza.oaipHombres,
      m.pobreza.oaipMujeres,
    ];
    for (const s of series) {
      expect(s.dato.quote).toBe(literalDelTitulo(s.serie.title));
      expect(s.serie.title.startsWith(s.dato.quote ?? '—')).toBe(true);
    }
    expect(m.edad.salidaHombres.dato.quote).toBe('Effective labour market exit age');
    expect(m.pobreza.oaip.dato.quote).toBe(
      'Old age income poverty rate below 50% of median income',
    );
    const { container } = render(
      <MemoryRouter>
        <Mitos />
      </MemoryRouter>,
    );
    expect(container.textContent).not.toContain('Effective labour market exit age');
    expect(container.textContent).not.toContain('Old age income poverty rate');
    const fuentes = leerFuentes(container).texto;
    expect(fuentes).toContain('Effective labour market exit age');
    expect(fuentes).toContain('Old age income poverty rate below 50% of median income');
  });
});

// ---------------------------------------------------------------------------
// Coherencia de las fórmulas con los datos
// ---------------------------------------------------------------------------

/** Evalúa una expresión de símbolos (resta y cociente) con un valor por símbolo. */
function evaluar(e: ExprFormula, valores: Readonly<Record<string, number>>): number {
  switch (e.tipo) {
    case 'simbolo': {
      const v = valores[e.id];
      if (v === undefined) throw new Error(`Sin valor para ${e.id}`);
      return v;
    }
    case 'resta':
      return evaluar(e.minuendo, valores) - evaluar(e.sustraendo, valores);
    case 'cociente':
      return evaluar(e.numerador, valores) / evaluar(e.denominador, valores);
    default:
      throw new Error(`Nodo no previsto en las fórmulas de las definiciones: ${e.tipo}`);
  }
}

/** Aplica la ecuación de una definición año a año con las series de cada símbolo. */
function aplicar(id: string, series: Readonly<Record<string, readonly PuntoAnual[]>>) {
  const ecuacion = definicionPorId(id).formula?.ecuaciones[0];
  if (!ecuacion) throw new Error(`${id} sin fórmula`);
  const simbolos = Object.keys(series);
  const anios = (series[simbolos[0] ?? ''] ?? []).map((p) => p.anio);
  return anios.flatMap((anio) => {
    const valores: Record<string, number> = {};
    for (const s of simbolos) {
      const v = series[s]?.find((p) => p.anio === anio)?.valor;
      if (v === undefined) return [];
      valores[s] = v;
    }
    return [{ anio, valor: evaluar(ecuacion.derecha, valores) }];
  });
}

describe('fórmulas de los cálculos propios', () => {
  const d = datosFinanciacion();
  const p = d.presupuesto;

  it('saldo no financiero = ingresos no financieros − gastos no financieros (serie publicada)', () => {
    const calculado = aplicar('saldo-presupuestario-no-financiero', {
      'i-nf': p.derechosNoFinancieros.puntos,
      'g-nf': p.obligacionesNoFinancieras.puntos,
    });
    expect(calculado.length).toBe(p.saldoNoFinanciero.puntos.length);
    for (const c of calculado) {
      const dato = p.saldoNoFinanciero.puntos.find((x) => x.anio === c.anio)?.valor;
      expect(c.valor, String(c.anio)).toBeCloseTo(dato ?? Number.NaN, 1);
    }
  });

  it('saldo total = ingresos totales − gastos totales (serie publicada)', () => {
    const calculado = aplicar('saldo-presupuestario-total', {
      'i-total': p.derechosTotales.puntos,
      'g-total': p.obligacionesTotales.puntos,
    });
    expect(calculado.length).toBe(p.saldoTotal.puntos.length);
    for (const c of calculado) {
      const dato = p.saldoTotal.puntos.find((x) => x.anio === c.anio)?.valor;
      expect(c.valor, String(c.anio)).toBeCloseTo(dato ?? Number.NaN, 1);
    }
  });

  it('saldo menos transferencias = saldo no financiero − transferencias (lo que dibuja el gráfico)', () => {
    const calculado = aplicar('saldo-no-financiero-menos-transferencias', {
      's-nf': p.saldoNoFinanciero.puntos,
      t: p.transferenciasEstado.puntos,
    });
    const grafico = diferencia(p.saldoNoFinanciero.puntos, p.transferenciasEstado.puntos);
    expect(calculado).toEqual(grafico);
  });

  it('gasto sobre el PIB = gasto ÷ PIB, en tanto por cien (lo que dibuja el gráfico)', () => {
    const e = d.ejecucion;
    for (const gasto of [
      e.sumaPensiones.puntos,
      suma(e.sumaPensiones.puntos, e.complementoMinimos.puntos),
    ]) {
      const calculado = aplicar('gasto-sobre-pib', { gasto, pib: d.pib.puntos });
      const grafico = porcentajeDelPib(gasto, d.pib.puntos);
      expect(calculado.length).toBe(grafico.length);
      for (const c of calculado) {
        const g = grafico.find((x) => x.anio === c.anio)?.valor;
        expect(c.valor * 100, String(c.anio)).toBeCloseTo(g ?? Number.NaN, 8);
      }
    }
  });

  it('la página muestra las cuatro fórmulas con su leyenda y sin cifras', () => {
    const { container } = pintar();
    const formulas = [...container.querySelectorAll('figure.formula')];
    expect(formulas).toHaveLength(4);
    for (const f of formulas) {
      expect(f.textContent).toContain('Qué significa cada símbolo');
      expect(f.querySelectorAll('math[role="math"][aria-label]').length).toBeGreaterThan(0);
      expect(f.textContent).not.toMatch(/\d/);
    }
  });
});
