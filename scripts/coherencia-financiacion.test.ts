// @vitest-environment node
/**
 * Tests de coherencia de los datos de financiación (Fase 1B-2): presupuesto de la Seguridad
 * Social, Fondo de Reserva, MEI, préstamos y saldos.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ArchivoDatos, ArchivoTabla } from '../src/engine/esquema-datos.ts';
import { celdasCsv } from './lib/validar-datos.ts';

const SISTEMA = path.resolve(import.meta.dirname, '../data/sistema');
const PARAMETROS = path.resolve(import.meta.dirname, '../data/parametros');

type Fila = Record<string, string>;
function csv(nombre: string): Fila[] {
  const [cab = '', ...resto] = readFileSync(path.join(SISTEMA, `${nombre}.csv`), 'utf8')
    .split('\n')
    .filter((l) => l !== '');
  const columnas = celdasCsv(cab);
  return resto.map((l) => Object.fromEntries(celdasCsv(l).map((v, i) => [columnas[i] ?? '', v])));
}
function archivo(dir: string, nombre: string) {
  return ArchivoDatos.parse(JSON.parse(readFileSync(path.join(dir, `${nombre}.json`), 'utf8')));
}
function serie(nombre: string, id: string): Map<string, number> {
  const s = archivo(SISTEMA, nombre).series?.find((x) => x.id === id);
  if (!s) throw new Error(`No existe la serie ${id}`);
  return new Map(s.points.map((p) => [p.period, p.value]));
}
function v(m: Map<string, number>, k: string): number {
  const x = m.get(k);
  if (x === undefined) throw new Error(`Falta ${k}`);
  return x;
}
const rango = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => String(a + i));

describe('tablas de financiación: cabecera y filas', () => {
  for (const nombre of ['presupuesto-ss-ejecucion', 'fondo-reserva-anual']) {
    it(`${nombre}: el JSON hermano describe el CSV`, () => {
      const t = ArchivoTabla.parse(
        JSON.parse(readFileSync(path.join(SISTEMA, `${nombre}.json`), 'utf8')),
      );
      expect(t.filas).toBe(csv(nombre).length);
      expect(Object.keys(csv(nombre)[0] ?? {})).toEqual(t.columnas.map((c) => c.id));
    });
  }
});

describe('ejecución del presupuesto de la Seguridad Social', () => {
  const filas = csv('presupuesto-ss-ejecucion');
  const t4 = (a: number, tabla: string, concepto: string): number => {
    const f = filas.find(
      (x) =>
        x.ejercicio === String(a) &&
        x.periodo === `${a}-T4` &&
        x.tabla === tabla &&
        x.concepto === concepto,
    );
    if (!f) throw new Error(`Falta ${a} ${tabla} ${concepto}`);
    return Number(f.derechos_u_obligaciones_meur);
  };

  it('hay cierre de diciembre de 2018 a 2025 y los cuatro trimestres de 2019 a 2025', () => {
    const periodos = new Set(filas.filter((x) => x.columna === 'principal').map((x) => x.periodo));
    for (const a of rango(2019, 2025))
      for (const t of ['T1', 'T2', 'T3', 'T4'])
        expect(periodos.has(`${a}-${t}`), `${a}-${t}`).toBe(true);
    expect(periodos.has('2018-T4')).toBe(true);
  });

  it('el total de ingresos es la suma de operaciones corrientes, de capital y financieras', () => {
    for (const a of rango(2018, 2025).map(Number)) {
      const suma = [
        'SUMA DE OPERACIONES CORRIENTES',
        'SUMA DE OPERACIONES DE CAPITAL',
        'SUMA DE OPERACIONES FINANCIERAS',
      ].reduce((s, c) => s + t4(a, 'ingresos', c), 0);
      expect(Math.abs(suma - t4(a, 'ingresos', 'TOTAL INGRESOS')), String(a)).toBeLessThan(1);
    }
  });

  it('el total de gastos es la suma de operaciones corrientes, de capital y financieras', () => {
    for (const a of rango(2018, 2025).map(Number)) {
      const suma = [
        'SUMA DE OPERACIONES CORRIENTES',
        'SUMA DE OPERACIONES DE CAPITAL',
        'SUMA DE OPERACIONES FINANCIERAS',
      ].reduce((s, c) => s + t4(a, 'gastos', c), 0);
      expect(Math.abs(suma - t4(a, 'gastos', 'TOTAL GASTOS')), String(a)).toBeLessThan(1);
    }
  });

  it('las cotizaciones por régimen suman el total de cotizaciones sociales', () => {
    for (const a of rango(2019, 2025).map(Number)) {
      const lineas = filas.filter(
        (x) =>
          x.ejercicio === String(a) &&
          x.periodo === `${a}-T4` &&
          x.tabla === 'ingresos-cap1-cap4' &&
          !x.concepto.startsWith('TOTAL') &&
          !/^(DEL ESTADO|DE LA SEGURIDAD|DE COMUNIDADES|DE EMPRESAS)/.test(x.concepto),
      );
      const suma = lineas.reduce((s, x) => s + Number(x.derechos_u_obligaciones_meur || 0), 0);
      expect(
        Math.abs(suma - t4(a, 'ingresos-cap1-cap4', 'TOTAL COTIZACIONES SOCIALES')),
        String(a),
      ).toBeLessThan(1.5);
    }
  });

  it('las clases de pensión suman «SUMA DE PENSIONES»', () => {
    for (const a of rango(2019, 2025).map(Number)) {
      const clases = filas.filter(
        (x) =>
          x.ejercicio === String(a) &&
          x.periodo === `${a}-T4` &&
          x.tabla === 'gastos-cap4' &&
          [
            'INCAPACIDAD PERMANENTE',
            'INVALIDEZ',
            'JUBILACIÓN',
            'VIUDEDAD',
            'ORFANDAD',
            'A FAVOR DE FAMILIARES',
            'FAVOR DE FAMILIARES',
            'PENSIONES DERIVADAS DANA',
          ].includes(x.concepto),
      );
      const suma = clases.reduce((s, x) => s + Number(x.derechos_u_obligaciones_meur || 0), 0);
      expect(Math.abs(suma - t4(a, 'gastos-cap4', 'SUMA DE PENSIONES')), String(a)).toBeLessThan(
        1.5,
      );
    }
  });

  it('el acumulado de ingresos y gastos no decrece de un trimestre a otro', () => {
    for (const a of rango(2019, 2025)) {
      for (const [tabla, concepto] of [
        ['ingresos', 'TOTAL INGRESOS'],
        ['gastos', 'TOTAL GASTOS'],
      ] as const) {
        const valores = ['T1', 'T2', 'T3', 'T4'].map((t) => {
          const f = filas.find(
            (x) =>
              x.periodo === `${a}-${t}` &&
              x.tabla === tabla &&
              x.concepto === concepto &&
              x.columna === 'principal',
          );
          return Number(f?.derechos_u_obligaciones_meur);
        });
        for (let i = 1; i < 4; i++)
          expect(valores[i], `${a} ${concepto}`).toBeGreaterThanOrEqual(valores[i - 1] ?? 0);
      }
    }
  });

  it('el gasto en pensiones es coherente con número × pensión media × 14 de la Fase 1B-1 (razón entre 0,8 y 1,05)', () => {
    const reg = csv('pensiones-vigor-regimen-clase-sexo');
    const nombres: Record<string, string[]> = {
      incapacidad: ['INCAPACIDAD PERMANENTE', 'INVALIDEZ'],
      jubilacion: ['JUBILACIÓN'],
      viudedad: ['VIUDEDAD'],
      orfandad: ['ORFANDAD'],
      'favor-familiares': ['A FAVOR DE FAMILIARES', 'FAVOR DE FAMILIARES'],
    };
    for (const a of rango(2019, 2025).map(Number)) {
      for (const [clase, ns] of Object.entries(nombres)) {
        const f = filas.find(
          (x) =>
            x.ejercicio === String(a) &&
            x.periodo === `${a}-T4` &&
            x.tabla === 'gastos-cap4' &&
            ns.includes(x.concepto),
        );
        const r = reg.find(
          (x) =>
            x.anio === String(a) &&
            x.regimen === 'total-sistema' &&
            x.clase === clase &&
            x.sexo === 'ambos',
        );
        const estimado = (Number(r?.numero) * Number(r?.pension_media_eur_mes) * 14) / 1e6;
        const razon = Number(f?.derechos_u_obligaciones_meur) / estimado;
        expect(razon, `${a} ${clase}`).toBeGreaterThan(0.8);
        expect(razon, `${a} ${clase}`).toBeLessThan(1.05);
      }
    }
  });
});

describe('Fondo de Reserva y MEI', () => {
  const filas = csv('fondo-reserva-anual');
  const num = (a: number, c: string) => Number(filas.find((x) => x.anio === String(a))?.[c]);

  it('2009-2025 sin huecos', () => {
    expect(filas.map((x) => x.anio)).toEqual(rango(2009, 2025));
  });

  it('el valor es dotaciones + rendimientos netos + disposiciones (redondeo de ±2)', () => {
    for (const a of rango(2009, 2025).map(Number)) {
      const calculado =
        num(a, 'dotaciones_acumuladas_meur') +
        num(a, 'rendimientos_netos_acum_meur') +
        num(a, 'disposiciones_acum_meur');
      expect(Math.abs(calculado - num(a, 'valor_fondo_meur')), String(a)).toBeLessThanOrEqual(2);
    }
  });

  it('las dotaciones acumuladas son excedentes de entidades + de mutuas + MEI (±2)', () => {
    for (const a of rango(2009, 2025).map(Number)) {
      const s =
        num(a, 'dotaciones_excedentes_entidades_acum_meur') +
        num(a, 'dotaciones_excedentes_mutuas_acum_meur') +
        num(a, 'dotaciones_mei_acum_meur');
      expect(Math.abs(s - num(a, 'dotaciones_acumuladas_meur')), String(a)).toBeLessThanOrEqual(2);
    }
  });

  it('solo hay disposiciones de 2012 a 2019 y suman 80.337 millones', () => {
    for (const a of rango(2010, 2025).map(Number)) {
      const d = num(a, 'disposiciones_anuales_meur');
      if (a >= 2012 && a <= 2019) expect(d, String(a)).toBeLessThan(0);
      else expect(d, String(a)).toBe(0);
    }
    expect(num(2025, 'disposiciones_acum_meur')).toBe(-80337);
  });

  it('las dotaciones anuales suman la variación de las acumuladas', () => {
    let suma = 0;
    for (const a of rango(2010, 2025).map(Number)) suma += num(a, 'dotaciones_anuales_meur');
    expect(suma).toBe(
      num(2025, 'dotaciones_acumuladas_meur') - num(2009, 'dotaciones_acumuladas_meur'),
    );
  });

  it('la dotación anual del MEI al Fondo no supera los derechos reconocidos del MEI (razón entre 0,7 y 1)', () => {
    const e = csv('presupuesto-ss-ejecucion');
    for (const a of [2023, 2024, 2025]) {
      const drn = Number(
        e.find(
          (x) =>
            x.ejercicio === String(a) &&
            x.periodo === `${a}-T4` &&
            x.tabla === 'ingresos-cap1-cap4' &&
            x.concepto === 'MECANISMO DE EQUIDAD INTERGENERACIONAL',
        )?.derechos_u_obligaciones_meur,
      );
      const razon = num(a, 'dotaciones_mei_anuales_meur') / drn;
      expect(razon, String(a)).toBeGreaterThan(0.7);
      expect(razon, String(a)).toBeLessThanOrEqual(1);
    }
  });

  it('el límite de desembolso del Fondo cubre de 2033 a 2053', () => {
    const d = archivo(PARAMETROS, 'fondo-reserva-desembolso-maximo').data ?? [];
    expect(d.map((x) => x.period)).toEqual(rango(2033, 2053));
  });
});

describe('préstamos del Estado y saldos', () => {
  it('los pasivos financieros de 2021-2023 igualan el importe máximo autorizado por la ley de PGE', () => {
    const pasivos = serie('deficit-presupuestario-seguridad-social', 'pasivos-financieros');
    const autorizado = new Map(
      (archivo(PARAMETROS, 'prestamos-estado-seguridad-social').data ?? [])
        .filter((d) => d.id.endsWith('-importe-maximo'))
        .map((d) => [d.period, Number(d.value)]),
    );
    for (const a of ['2021', '2022', '2023'])
      expect(Math.abs(v(pasivos, a) - v(autorizado, a)), a).toBeLessThan(0.02);
  });

  it('el saldo derivado es la diferencia de derechos y obligaciones', () => {
    const di = serie('deficit-presupuestario-seguridad-social', 'derechos-no-financieros');
    const ob = serie('deficit-presupuestario-seguridad-social', 'obligaciones-no-financieras');
    const sa = serie(
      'deficit-presupuestario-seguridad-social',
      'saldo-presupuestario-no-financiero',
    );
    for (const a of sa.keys())
      expect(Math.abs(v(di, a) - v(ob, a) - v(sa, a)), a).toBeLessThan(0.02);
  });

  it('SEC 2010 de Eurostat: B.9 = ingresos − gastos, 2000-2025 sin huecos y % del PIB coherente', () => {
    const b9 = serie('deficit-sec-fondos-seguridad-social', 'b9-mio-eur');
    const tr = serie('deficit-sec-fondos-seguridad-social', 'tr-mio-eur');
    const te = serie('deficit-sec-fondos-seguridad-social', 'te-mio-eur');
    const pc = serie('deficit-sec-fondos-seguridad-social', 'b9-pc-gdp');
    expect([...b9.keys()]).toEqual(rango(2000, 2025));
    for (const a of b9.keys()) {
      expect(Math.abs(v(tr, a) - v(te, a) - v(b9, a)), a).toBeLessThanOrEqual(1);
      expect(Math.abs(v(pc, a)), a).toBeLessThan(5);
      expect(Math.sign(v(pc, a)) === Math.sign(v(b9, a)) || Math.abs(v(pc, a)) < 0.1, a).toBe(true);
    }
  });

  it('el saldo no financiero presupuestario y el SEC tienen el mismo signo desde 2017 (necesidad de financiación)', () => {
    const pres = serie(
      'deficit-presupuestario-seguridad-social',
      'saldo-presupuestario-no-financiero',
    );
    const sec = serie('deficit-sec-fondos-seguridad-social', 'b9-mio-eur');
    for (const a of pres.keys()) {
      expect(v(pres, a), a).toBeLessThan(0);
      expect(v(sec, a), a).toBeLessThan(0);
    }
  });
});
