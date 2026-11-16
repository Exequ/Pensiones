// @vitest-environment node
/**
 * Fase 5-A3: extracción de los PDF (liquidaciones de 2010 a 2016 y extracto de la Declaración del
 * Tribunal de Cuentas sobre la Cuenta General de 2023).
 *  - Pruebas unitarias de las validaciones del ETL con casos hechos a mano (Python).
 *  - Comprobaciones, independientes del ETL, sobre los ficheros generados: huellas, sumas,
 *    continuidad, procedencia y contraste con otras fuentes ya cargadas.
 *  - Idempotencia: dos ejecuciones dan la misma salida y la salida es la que está versionada.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ArchivoDatos, ArchivoExtraccionPdf } from '../src/engine/esquema-datos.ts';
import { celdasCsv, validarCsvExtraccion } from './lib/validar-datos.ts';

const RAIZ = path.resolve(import.meta.dirname, '..');
const leer = (ruta: string) => readFileSync(path.join(RAIZ, ruta), 'utf8');
const json = (ruta: string): unknown => JSON.parse(leer(ruta));
const sha = (ruta: string) =>
  createHash('sha256')
    .update(readFileSync(path.join(RAIZ, ruta)))
    .digest('hex');
const hayPdftotext = spawnSync('pdftotext', ['-v']).error === undefined;

const RUTA_LIQ_JSON = 'data/sistema/liquidacion-ss-extraccion.json';
const RUTA_LIQ_CSV = 'data/sistema/liquidacion-ss-extraccion.csv';
const RUTA_LIQ_SERIES = 'data/sistema/liquidacion-ss-series.json';
const RUTA_TC = 'data/sistema/tribunal-cuentas-cge2023-ss.json';
const RUTA_TC_PRESTAMOS_JSON = 'data/sistema/tribunal-cuentas-cge2023-prestamos.json';
const RUTA_TC_PRESTAMOS_CSV = 'data/sistema/tribunal-cuentas-cge2023-prestamos.csv';

const liqMeta = ArchivoExtraccionPdf.parse(json(RUTA_LIQ_JSON));
const liqSeries = ArchivoDatos.parse(json(RUTA_LIQ_SERIES));
const tc = ArchivoDatos.parse(json(RUTA_TC));
const tcAnexoMeta = ArchivoExtraccionPdf.parse(json(RUTA_TC_PRESTAMOS_JSON));

function filasCsv(ruta: string): Record<string, string>[] {
  const lineas = leer(ruta)
    .split('\n')
    .filter((l) => l.trim() !== '');
  const cab = celdasCsv(lineas[0] ?? '');
  return lineas
    .slice(1)
    .map((l) => Object.fromEntries(celdasCsv(l).map((c, i) => [cab[i] ?? '', c])));
}
const filasLiq = filasCsv(RUTA_LIQ_CSV);
const filasAnexo = filasCsv(RUTA_TC_PRESTAMOS_CSV);

const serie = (a: ArchivoDatos, id: string) => {
  const s = a.series?.find((x) => x.id === id);
  if (!s) throw new Error(`Sin serie ${id}`);
  return s;
};
const porAnio = (id: string): Map<number, number> =>
  new Map(serie(liqSeries, id).points.map((p) => [Number(p.period), p.value]));
const datoTc = (id: string): number => {
  const d = tc.data?.find((x) => x.id === id);
  if (!d || typeof d.value !== 'number') throw new Error(`Sin dato numérico ${id}`);
  return d.value;
};
const cerca = (a: number, b: number, tolerancia: number) => Math.abs(a - b) <= tolerancia;

describe('validaciones del ETL con casos hechos a mano (Python)', () => {
  it('las pruebas unitarias de scripts/etl/test_etl_5a3.py pasan', () => {
    const r = spawnSync('python3', ['-I', path.join(RAIZ, 'scripts/etl/test_etl_5a3.py')], {
      encoding: 'utf8',
      timeout: 60_000,
    });
    expect(r.stderr + r.stdout).toMatch(/OK/);
    expect(r.status).toBe(0);
  });
});

describe('el validador de datos exige referencia, huella y marca de verificación (esquema extraccion-pdf)', () => {
  const lineas = leer(RUTA_LIQ_CSV)
    .split('\n')
    .filter((l) => l.trim() !== '');

  it('los ficheros generados pasan la validación', () => {
    expect(validarCsvExtraccion(liqMeta, lineas, RUTA_LIQ_JSON)).toEqual([]);
    const lineasTc = leer(RUTA_TC_PRESTAMOS_CSV)
      .split('\n')
      .filter((l) => l.trim() !== '');
    expect(validarCsvExtraccion(tcAnexoMeta, lineasTc, RUTA_TC_PRESTAMOS_JSON)).toEqual([]);
  });

  it('una huella que no coincide con la del origen es un error', () => {
    const cab = lineas[0] ?? '';
    const columnas = celdasCsv(cab);
    const i = columnas.indexOf('sha256');
    const fila = celdasCsv(lineas[1] ?? '');
    fila[i] = '0'.repeat(64);
    const mala = [
      cab,
      fila.map((c) => (/[,"]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(','),
      ...lineas.slice(2),
    ];
    const errores = validarCsvExtraccion(liqMeta, mala, RUTA_LIQ_JSON);
    expect(errores.map((e) => e.mensaje)).toContain(
      'La huella SHA-256 de la fila no coincide con la de «origenes»',
    );
  });

  it('una cifra de una tabla cuya validación falla debe ir marcada «no» y fuera de las series', () => {
    const falsa = {
      ...liqMeta,
      validacionesPorTabla: liqMeta.validacionesPorTabla.map((v, k) =>
        k === 0 ? { ...v, incorrectas: 1 } : v,
      ),
    };
    const errores = validarCsvExtraccion(falsa, lineas, RUTA_LIQ_JSON);
    expect(
      errores.some((e) => /validaciones fallidas y sus cifras no están marcadas/.test(e.mensaje)),
    ).toBe(true);
  });

  it('una página fuera del documento o un fichero desconocido son errores', () => {
    const cab = lineas[0] ?? '';
    const columnas = celdasCsv(cab);
    const fila = celdasCsv(lineas[1] ?? '');
    fila[columnas.indexOf('pagina')] = '99';
    fila[columnas.indexOf('fichero')] = 'data-raw/otro.pdf';
    const quoted = fila.map((c) => (/[,"]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',');
    const errores = validarCsvExtraccion(liqMeta, [cab, quoted, ...lineas.slice(2)], RUTA_LIQ_JSON);
    expect(errores.some((e) => /no figura en «origenes»/.test(e.mensaje))).toBe(true);
  });
});

describe('liquidaciones de 2010 a 2016: procedencia, huellas y continuidad', () => {
  it('cada PDF de origen tiene su huella SHA-256 real, diez páginas y un ejercicio distinto', () => {
    expect(liqMeta.origenes.map((o) => o.ejercicio)).toEqual([
      2010, 2011, 2012, 2013, 2014, 2015, 2016,
    ]);
    for (const o of liqMeta.origenes) {
      expect(o.paginas, o.fichero).toBe(10);
      expect(sha(o.fichero), o.fichero).toBe(o.sha256);
    }
  });

  it('el fichero declara fuente, fecha de descarga, confianza, naturaleza observada y unidad', () => {
    expect(liqMeta.source.url).toMatch(/^https:\/\//);
    expect(liqMeta.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(['alta', 'media', 'baja']).toContain(liqMeta.confidence);
    expect(liqMeta.naturaleza).toBe('observado');
    expect(liqMeta.unidad).toBe('millones de euros');
    expect(liqMeta.tolerancia).toMatch(/0,005/);
  });

  it('todas las filas están verificadas, citan su PDF y la huella coincide con la de «origenes»', () => {
    expect(filasLiq.length).toBe(liqMeta.filas);
    const huella = new Map(liqMeta.origenes.map((o) => [o.fichero, o.sha256]));
    for (const f of filasLiq) {
      expect(f['verificado'], f['id']).toBe('si');
      expect(huella.get(f['fichero'] ?? ''), f['id']).toBe(f['sha256']);
      expect(Number(f['pagina']), f['id']).toBeGreaterThanOrEqual(1);
      expect(Number(f['pagina']), f['id']).toBeLessThanOrEqual(10);
      expect(Number.isFinite(Number(f['valor'])), f['id']).toBe(true);
    }
  });

  it('el resumen de validaciones no tiene sumas incorrectas y cada tabla de cada PDF se comprobó', () => {
    expect(liqMeta.resumenValidaciones['sumas_incorrectas']).toBe(0);
    expect(liqMeta.resumenValidaciones['coherencia_incorrecta']).toBe(0);
    // cuatro tablas por PDF, en dos tipos de página (liquidación y comparación), siete PDF
    const claves = new Set(
      liqMeta.validacionesPorTabla.map((v) => `${v.ejercicio_pdf}|${v.tabla}|${v.tipo_pagina}`),
    );
    expect(claves.size).toBe(7 * 4 * 2);
    for (const v of liqMeta.validacionesPorTabla) {
      expect(v.comprobaciones, `${v.ejercicio_pdf} ${v.tabla}`).toBeGreaterThan(0);
      expect(v.incorrectas).toBe(0);
    }
  });

  it('la reclasificación del complemento a mínimos entre los PDF de 2014 y 2015 cuadra', () => {
    const c = liqMeta.comprobacionesEspecificas?.find(
      (x) => x.id === 'reclasificacion-complemento-a-minimos-2014',
    );
    expect(c?.ok).toBe(true);
    expect(Math.abs(c?.diferencia ?? 1)).toBeLessThanOrEqual(c?.tolerancia ?? 0);
  });

  it('cada serie publicada es continua, anual, en millones de euros y con referencia en cada punto', () => {
    for (const s of liqSeries.series ?? []) {
      expect(s.unit, s.id).toBe('millones de euros');
      expect(s.source.url, s.id).toMatch(/^https:\/\//);
      expect(s.confidence, s.id).toBeTruthy();
      expect(s.naturaleza, s.id).toBeTruthy();
      const anios = s.points.map((p) => Number(p.period));
      for (let i = 1; i < anios.length; i++) expect(anios[i], s.id).toBe((anios[i - 1] ?? 0) + 1);
      for (const p of s.points) expect(p.notes, `${s.id} ${p.period}`).toBeTruthy();
    }
    // las series de las tablas completas cubren los siete ejercicios
    for (const id of [
      'ingresos-transferencias-corrientes-del-estado',
      'ingresos-transferencias-corrientes-total',
      'ingresos-pasivos-financieros',
      'gastos-suma-pensiones-contributivas',
      'gastos-pensiones-con-complemento-a-minimos',
    ]) {
      expect(
        serie(liqSeries, id).points.map((p) => p.period),
        id,
      ).toEqual(['2010', '2011', '2012', '2013', '2014', '2015', '2016']);
    }
  });

  it('el complemento a mínimos aparece aparte solo desde el PDF de 2015, y por eso la serie derivada lo suma desde ese año', () => {
    const aparte = porAnio('gastos-complemento-a-minimos');
    expect([...aparte.keys()]).toEqual([2015, 2016]);
    const pensiones = porAnio('gastos-suma-pensiones-contributivas');
    const derivada = porAnio('gastos-pensiones-con-complemento-a-minimos');
    for (const a of [2010, 2011, 2012, 2013, 2014]) expect(derivada.get(a)).toBe(pensiones.get(a));
    for (const a of [2015, 2016]) {
      expect(
        cerca(derivada.get(a) ?? 0, (pensiones.get(a) ?? 0) + (aparte.get(a) ?? 0), 0.005),
      ).toBe(true);
    }
    expect(serie(liqSeries, 'gastos-pensiones-con-complemento-a-minimos').naturaleza).toBe(
      'derivado',
    );
  });
});

describe('liquidaciones: sumas recalculadas desde el CSV, sin pasar por el ETL', () => {
  const valor = (
    pdf: string,
    tabla: string,
    tipo: string,
    columna: string,
    patron: RegExp,
    seccion?: RegExp,
  ): number => {
    const c = filasLiq.filter(
      (f) =>
        f['ejercicio_pdf'] === pdf &&
        f['tabla'] === tabla &&
        f['tipo_pagina'] === tipo &&
        f['columna'] === columna &&
        patron.test(f['partida'] ?? '') &&
        (seccion === undefined || seccion.test(f['seccion'] ?? '')),
    );
    if (c.length !== 1) throw new Error(`${pdf} ${tabla} ${patron.source}: ${c.length} filas`);
    return Number(c[0]?.['valor']);
  };

  it.each(['2010', '2011', '2012', '2013', '2014', '2015', '2016'])(
    'ejercicio %s: las transferencias corrientes por origen suman el total y coinciden con el capítulo 4 de la tabla de ingresos',
    (pdf) => {
      const col = 'derechos_reconocidos_netos';
      const t = 'ingresos-cap1-cap4';
      const origenes = [
        /^Del Estado$/,
        /^De Organismos Aut/i,
        /^De la Seguridad Social$/,
        /^De Comunidades Aut/,
        /^De Empresas privadas$/,
        /^De Familias/,
        /^Del Exterior$/,
      ].map((p) => valor(pdf, t, 'liquidacion', col, p, /TRANSFERENCIAS/));
      const total = valor(pdf, t, 'liquidacion', col, /^TOTAL TRANSFERENCIAS CORRIENTES/);
      expect(
        cerca(
          origenes.reduce((a, b) => a + b, 0),
          total,
          0.05,
        ),
      ).toBe(true);
      expect(
        cerca(
          valor(pdf, 'ingresos', 'liquidacion', col, /^4\. Transferencias corrientes/),
          total,
          0.01,
        ),
      ).toBe(true);
    },
  );

  it.each(['2010', '2011', '2012', '2013', '2014', '2015', '2016'])(
    'ejercicio %s: ingresos y gastos totales son la suma de sus operaciones financieras y no financieras',
    (pdf) => {
      for (const [tabla, col, total] of [
        ['ingresos', 'derechos_reconocidos_netos', /^TOTAL INGRESOS/],
        ['gastos', 'obligaciones_reconocidas', /^TOTAL GASTOS/],
      ] as const) {
        const noFin = valor(pdf, tabla, 'liquidacion', col, /^SUMA OPERACIONES NO FINANCIERAS/);
        const fin = valor(pdf, tabla, 'liquidacion', col, /^SUMA OPERACIONES FINANCIERAS/);
        expect(
          cerca(noFin + fin, valor(pdf, tabla, 'liquidacion', col, total), 0.02),
          `${pdf} ${tabla}`,
        ).toBe(true);
      }
    },
  );

  it('el capítulo 4 de gastos de la tabla de transferencias coincide con el de la tabla de gastos', () => {
    for (const pdf of ['2010', '2013', '2016']) {
      const a = valor(
        pdf,
        'gastos-cap4',
        'liquidacion',
        'obligaciones_reconocidas',
        /^TOTAL TRANSFERENCIAS CORRIENTES/,
      );
      const b = valor(
        pdf,
        'gastos',
        'liquidacion',
        'obligaciones_reconocidas',
        /^4\. Transferencias corrientes/,
      );
      expect(cerca(a, b, 0.01), pdf).toBe(true);
    }
  });
});

describe('liquidaciones: contraste con la comparativa del PDF siguiente (validación c)', () => {
  it('se contrastaron cifras y las únicas diferencias son las registradas', () => {
    const r = liqMeta.resumenContrasteEntrePdf ?? {};
    expect(r['cifras_contrastadas']).toBeGreaterThan(400);
    expect(r['difieren']).toBe(liqMeta.diferenciasEntrePdf?.length);
  });

  it('las diferencias son de 2014 (PDF de 2014 frente a la comparativa del PDF de 2015) y se compensan dentro de cada tabla', () => {
    const difs = liqMeta.diferenciasEntrePdf ?? [];
    expect(difs.length).toBeGreaterThan(0);
    for (const d of difs) {
      expect(d.ejercicio).toBe(2014);
      expect(d.pdf_siguiente).toBe(2015);
      expect(Math.abs(d.valor_pdf_siguiente - d.valor_pdf_propio - d.diferencia)).toBeLessThan(
        0.011,
      );
    }
    // El importe pasa de «pensiones» a «prestaciones no contributivas» (complemento a mínimos) y de «Comunidades
    // Autónomas» a «De la Seguridad Social»: las diferencias se compensan dentro de cada tabla y el total no cambia.
    const dif = (partida: RegExp, tabla: string) => {
      const c = difs.filter((d) => d.tabla === tabla && partida.test(d.partida));
      expect(c.length, `${tabla} ${partida.source}`).toBe(1);
      return c[0]?.diferencia ?? Number.NaN;
    };
    expect(
      Math.abs(
        dif(/^SUMA PENSIONES$/, 'gastos-cap4') +
          dif(/^SUMA PREST\. NO CONTRIBUTIVAS$/, 'gastos-cap4'),
      ),
    ).toBeLessThan(0.02);
    expect(dif(/^SUMA PENSIONES$/, 'gastos-cap4')).toBeCloseTo(
      dif(/^TOTAL PRESTACIONES CONTRIBUTIVAS$/, 'gastos-cap4'),
      2,
    );
    expect(
      Math.abs(
        dif(/^De la Seguridad Social$/, 'ingresos-cap1-cap4') +
          dif(/^De Comunidades Aut/, 'ingresos-cap1-cap4'),
      ),
    ).toBeLessThan(0.02);
    // El total de transferencias corrientes de ingresos no cambia: no hay diferencia en esa partida.
    expect(
      difs.some(
        (d) =>
          d.tabla === 'ingresos-cap1-cap4' && /^TOTAL TRANSFERENCIAS CORRIENTES/.test(d.partida),
      ),
    ).toBe(false);
  });

  it('el valor publicado de cada año es el de su propio PDF, no el de la comparativa', () => {
    const publicado = porAnio('gastos-suma-pensiones-contributivas').get(2014);
    const dif = liqMeta.diferenciasEntrePdf?.find((d) => d.partida === 'SUMA PENSIONES');
    expect(publicado).toBe(dif?.valor_pdf_propio);
  });
});

describe('Tribunal de Cuentas (CGE 2023): procedencia, citas y validaciones', () => {
  it('cada dato lleva fuente, fecha de descarga, confianza, cita literal y localización en el original', () => {
    for (const d of tc.data ?? []) {
      expect(d.source.url, d.id).toBe('https://www.congreso.es/docu/inf_fiscTC/LegXV/250-6.pdf');
      expect(d.fetchedAt, d.id).toBe('2026-11-14');
      expect(d.confidence, d.id).toBe('alta');
      expect(d.naturaleza, d.id).toBe('observado');
      expect(d.quote?.length, d.id).toBeGreaterThan(20);
      expect(d.location, d.id).toMatch(/p(p)?\. \d+/);
      expect(d.notes, d.id).toMatch(/SHA-256 del extracto: [0-9a-f]{64}/);
    }
  });

  it('la huella del extracto es la del PDF real y el LEEME da la del original', () => {
    const huella = sha('data-raw/tribunal-cuentas/declaracion-cge-2023-extracto.pdf');
    expect(tcAnexoMeta.origenes[0]?.sha256).toBe(huella);
    expect(tcAnexoMeta.origenes[0]?.paginas).toBe(42);
    expect(leer('data-raw/tribunal-cuentas/LEEME.txt')).toMatch(
      /c32a639cd9f39539bdc752b70fae18f0b64535b19d6c400ec27159e1548648cb/,
    );
  });

  it('las cifras del texto aparecen en su cita con el formato del documento', () => {
    const formato = (v: number, decimales: number) =>
      v
        .toFixed(decimales)
        .replace('.', ',')
        .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    for (const d of tc.data ?? []) {
      if (typeof d.value !== 'number' || d.unit === '% del PIB') continue;
      const conDecimal = formato(d.value, 1);
      const sinDecimal = formato(d.value, 0);
      expect(d.quote?.includes(conDecimal) || d.quote?.includes(sinDecimal), d.id).toBe(true);
    }
  });

  it('el Anexo 10 suma por bloques y en total (recalculado desde el CSV)', () => {
    const prestamos = filasAnexo.filter((f) => f['tipo_linea'] === 'prestamo');
    expect(prestamos.length).toBe(20);
    const sub = (b: string) =>
      Number(filasAnexo.find((f) => f['id'] === `subtotal-${b}`)?.['importe']);
    const bloque = (b: string) =>
      prestamos.filter((f) => f['bloque'] === b).reduce((a, f) => a + Number(f['importe']), 0);
    for (const [b, k] of [
      ['I', '1'],
      ['II', '2'],
      ['III', '3'],
      ['IV', '4'],
    ] as const) {
      expect(cerca(bloque(b), sub(k), 0.1), b).toBe(true);
    }
    const total = Number(filasAnexo.find((f) => f['id'] === 'total')?.['importe']);
    expect(cerca(sub('1') + sub('2') + sub('3') + sub('4'), total, 0.1)).toBe(true);
    for (const f of filasAnexo) expect(f['sha256']).toBe(tcAnexoMeta.origenes[0]?.sha256);
  });

  it('las cifras del texto coinciden con el anexo: préstamos antiguos, recientes, saldo y transferencias', () => {
    const importes = (b: string) =>
      filasAnexo.filter((f) => f['tipo_linea'] === 'prestamo' && f['bloque'] === b);
    const suma = (fs: Record<string, string>[]) => fs.reduce((a, f) => a + Number(f['importe']), 0);
    const antiguos = suma(importes('I')) + suma(importes('II')) + suma(importes('III'));
    expect(cerca(antiguos, datoTc('prestamos-1992-1999'), 0.1)).toBe(true);
    const hasta2023 = suma(importes('IV').filter((f) => Number(f['anio_concesion']) <= 2023));
    expect(cerca(hasta2023, datoTc('prestamos-concedidos-2017-2023'), 0.1)).toBe(true);
    const total = Number(filasAnexo.find((f) => f['id'] === 'total')?.['importe']);
    expect(
      cerca(total - datoTc('prestamo-concedido-2024'), datoTc('deuda-ss-con-estado-2023'), 0.1),
    ).toBe(true);
    expect(
      cerca(
        datoTc('transferencias-equilibrio-2018-2021') +
          datoTc('transferencias-base-normativa-2021-2023'),
        datoTc('transferencias-corrientes-2018-2023'),
        0.1,
      ),
    ).toBe(true);
    expect(
      cerca(
        (datoTc('deuda-ss-con-estado-2023') / datoTc('pib-2023-segun-tribunal')) * 100,
        datoTc('deuda-ss-con-estado-2023-pib'),
        0.005,
      ),
    ).toBe(true);
  });

  it('la serie de préstamos por año suma lo mismo que el anexo y está marcada como derivada', () => {
    const s = serie(tc, 'prestamos-concedidos-por-anio');
    expect(s.naturaleza).toBe('derivado');
    expect(s.points.map((p) => p.period)).toEqual([
      '2017',
      '2018',
      '2019',
      '2020',
      '2021',
      '2022',
      '2023',
      '2024',
    ]);
    const total = s.points.reduce((a, p) => a + p.value, 0);
    const bloqueIV = filasAnexo
      .filter((f) => f['tipo_linea'] === 'prestamo' && f['bloque'] === 'IV')
      .reduce((a, f) => a + Number(f['importe']), 0);
    expect(cerca(total, bloqueIV, 0.1)).toBe(true);
  });
});

describe('contraste con otras fuentes ya cargadas (validación c)', () => {
  const tc22 = ArchivoDatos.parse(
    json('data/sistema/prestamos-transferencias-tribunal-cuentas.json'),
  );
  const d22 = (id: string): number => {
    const d = tc22.data?.find((x) => x.id === id);
    if (!d || typeof d.value !== 'number') throw new Error(id);
    return d.value;
  };

  it('Tribunal de Cuentas 2023 frente a 2022: mismas cifras donde se repiten y diferencias explicables con la propia declaración', () => {
    // Cifras que se repiten en las dos declaraciones.
    expect(datoTc('prestamos-1992-1999')).toBe(d22('prestamos-1992-1999'));
    expect(datoTc('prestamos-insalud')).toBe(d22('prestamos-insalud-1991'));
    expect(datoTc('transferencias-equilibrio-2018-2021')).toBe(
      d22('transferencias-equilibrio-2018-2021'),
    );
    expect(datoTc('transferencias-covid-2020-2021')).toBeCloseTo(
      d22('transferencias-covid-2020') + d22('transferencias-covid-2021'),
      1,
    );
    // Saldo: lo que sube entre 2022 y 2023 es el préstamo de 2023.
    const prestamo2023 = Number(filasAnexo.find((f) => f['id'] === 'prestamo-19')?.['importe']);
    expect(
      cerca(
        datoTc('deuda-ss-con-estado-2023') - d22('deuda-ss-con-estado-2022'),
        prestamo2023,
        0.1,
      ),
    ).toBe(true);
    // Préstamos 2017-2022 de la declaración de 2022 = líneas del anexo concedidas hasta 2022.
    const hasta2022 = filasAnexo
      .filter(
        (f) =>
          f['tipo_linea'] === 'prestamo' &&
          f['bloque'] === 'IV' &&
          Number(f['anio_concesion']) <= 2022,
      )
      .reduce((a, f) => a + Number(f['importe']), 0);
    expect(cerca(hasta2022, d22('prestamos-concedidos-2017-2022'), 0.1)).toBe(true);
    // Transferencias: lo que añade 2023 a la suma de 2018-2022 es la cifra que la ley de 2023 preveía.
    expect(
      cerca(
        datoTc('transferencias-corrientes-2018-2023') - d22('transferencias-corrientes-2018-2022'),
        d22('transferencias-previstas-lpge-2023'),
        0.1,
      ),
    ).toBe(true);
    // Diferencia de redondeo registrada: tres préstamos de desfases de tesorería, 0,1 millones entre declaraciones.
    const desfases =
      filasAnexo.filter((f) => f['id'] === 'subtotal-3').map((f) => Number(f['importe']))[0] ?? 0;
    expect(Math.abs(desfases - d22('prestamos-desfases-tesoreria-90'))).toBeCloseTo(0.1, 5);
  });

  it('préstamos por año del Tribunal frente a pasivos financieros de la ejecución (2017-2024): coinciden salvo el redondeo y 2017', () => {
    const deficit = ArchivoDatos.parse(
      json('data/sistema/deficit-presupuestario-seguridad-social.json'),
    );
    const pasivos = new Map(
      serie(deficit, 'pasivos-financieros').points.map((p) => [Number(p.period), p.value]),
    );
    const prestamos = new Map(
      serie(tc, 'prestamos-concedidos-por-anio').points.map((p) => [Number(p.period), p.value]),
    );
    for (const [anio, importe] of prestamos) {
      const p = pasivos.get(anio);
      expect(p, String(anio)).toBeDefined();
      // 2017 es la única diferencia por encima del redondeo: unos pocos millones de pasivos financieros distintos de los préstamos.
      expect(Math.abs((p ?? 0) - importe), String(anio)).toBeLessThan(anio === 2017 ? 3 : 0.1);
    }
  });

  it('deuda PDE del Banco de España frente al saldo del Tribunal de Cuentas (2022 y 2023): la diferencia es inferior al 0,02 %', () => {
    const bde = ArchivoDatos.parse(json('data/sistema/deuda-pde-seguridad-social.json'));
    const finAno = new Map(
      serie(bde, 'deuda-pde-fin-ano').points.map((p) => [Number(p.period), p.value]),
    );
    for (const [anio, valorTc] of [
      [2022, d22('deuda-ss-con-estado-2022')],
      [2023, datoTc('deuda-ss-con-estado-2023')],
    ] as const) {
      const b = finAno.get(anio) ?? 0;
      expect(Math.abs(b - valorTc) / valorTc, String(anio)).toBeLessThan(0.0002);
    }
  });

  it('el PIB de 2023 que cita el Tribunal difiere del de la serie del INE descargada en menos de un 0,2 % (diferencia registrada)', () => {
    const pib = ArchivoDatos.parse(json('data/macro/pib-ine.json'));
    const ine = serie(pib, 'pib-corriente').points.find((p) => p.period === '2023')?.value ?? 0;
    const diferencia = Math.abs(ine - datoTc('pib-2023-segun-tribunal')) / ine;
    expect(diferencia).toBeGreaterThan(0);
    expect(diferencia).toBeLessThan(0.002);
  });

  it('el Fondo de Reserva de 2023: la reserva patrimonial del Tribunal difiere de la serie a precio de adquisición (diferencia registrada)', () => {
    const fondo = ArchivoDatos.parse(json('data/sistema/fondo-reserva-series.json'));
    const v2023 = serie(fondo, 'valor-fin-ano').points.find((p) => p.period === '2023')?.value ?? 0;
    const dif = datoTc('frss-reserva-patrimonial-2023') - v2023;
    expect(dif).toBeGreaterThan(0);
    expect(dif).toBeCloseTo(548.4, 1);
  });

  it('el último ejercicio de la liquidación y el primero de la ejecución son consecutivos: no hay ejercicio común para contrastar', () => {
    const ejecucion = leer('data/sistema/presupuesto-ss-ejecucion.csv').split('\n').slice(1);
    const ejercicios = new Set(ejecucion.map((l) => l.split(',')[0]).filter(Boolean));
    const minimo = Math.min(...[...ejercicios].map(Number));
    const ultimaLiquidacion = Math.max(...liqMeta.origenes.map((o) => o.ejercicio));
    expect(minimo).toBe(ultimaLiquidacion + 1);
  });
});

describe.skipIf(!hayPdftotext)(
  'idempotencia y reproducibilidad de los ETL (necesita pdftotext)',
  () => {
    const ejecutar = (script: string, salida: string) =>
      spawnSync('python3', ['-I', path.join(RAIZ, script)], {
        encoding: 'utf8',
        env: { ...process.env, SALIDA: salida },
        timeout: 120_000,
      });
    const ficheros = [
      'liquidacion-ss-extraccion.csv',
      'liquidacion-ss-extraccion.json',
      'liquidacion-ss-series.json',
      'tribunal-cuentas-cge2023-ss.json',
      'tribunal-cuentas-cge2023-prestamos.csv',
      'tribunal-cuentas-cge2023-prestamos.json',
    ];

    it('dos ejecuciones dan la misma salida y esa salida es la versionada', () => {
      const a = mkdtempSync(path.join(tmpdir(), 'etl5a3-a-'));
      const b = mkdtempSync(path.join(tmpdir(), 'etl5a3-b-'));
      try {
        for (const dir of [a, b]) {
          for (const script of [
            'scripts/etl/ssf_liquidacion_pdf.py',
            'scripts/etl/tc_cge2023_seguridad_social.py',
          ]) {
            const r = ejecutar(script, dir);
            expect(r.status, `${script}: ${r.stderr}`).toBe(0);
          }
        }
        for (const f of ficheros) {
          const x = readFileSync(path.join(a, f), 'utf8');
          const y = readFileSync(path.join(b, f), 'utf8');
          expect(x, `${f}: dos ejecuciones difieren`).toBe(y);
          const versionado = leer(`data/sistema/${f}`);
          if (f.endsWith('.csv'))
            expect(x, `${f}: el CSV versionado no es la salida del ETL`).toBe(versionado);
          else
            expect(
              JSON.parse(x) as unknown,
              `${f}: el JSON versionado no es la salida del ETL`,
            ).toEqual(JSON.parse(versionado));
        }
      } finally {
        rmSync(a, { recursive: true, force: true });
        rmSync(b, { recursive: true, force: true });
      }
    }, 240_000);
  },
);
