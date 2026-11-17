// @vitest-environment node
/**
 * Fase 5-A4: extracción de cuatro PDF aportados por el autor (liquidación de 2025, complementos por brecha
 * de género y por maternidad a 1-10-2026, RDL 8/2010 y RD 1794/2010).
 *  - Pruebas unitarias de las validaciones de los ETL con casos hechos a mano (Python).
 *  - Comprobaciones, independientes del ETL, sobre los ficheros generados: huellas, sumas recalculadas desde
 *    el CSV, continuidad, citas literales en los PDF, contraste con datos ya cargados.
 *  - Idempotencia: dos ejecuciones dan la misma salida y la salida es la que está versionada.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ArchivoDatos, ArchivoExtraccionPdf, ArchivoTabla } from '../src/engine/esquema-datos.ts';
import { celdasCsv, validarCsvExtraccion } from './lib/validar-datos.ts';

const RAIZ = path.resolve(import.meta.dirname, '..');
const leer = (ruta: string) => readFileSync(path.join(RAIZ, ruta), 'utf8');
const json = (ruta: string): unknown => JSON.parse(leer(ruta));
const sha = (ruta: string) =>
  createHash('sha256')
    .update(readFileSync(path.join(RAIZ, ruta)))
    .digest('hex');
const hayPdftotext = spawnSync('pdftotext', ['-v']).error === undefined;

type Fila = Record<string, string>;
function filasCsv(ruta: string): Fila[] {
  const lineas = leer(ruta)
    .split('\n')
    .filter((l) => l.trim() !== '');
  const cab = celdasCsv(lineas[0] ?? '');
  return lineas
    .slice(1)
    .map((l) => Object.fromEntries(celdasCsv(l).map((c, i) => [cab[i] ?? '', c])));
}
const num = (f: Fila | undefined, c: string): number => {
  const v = Number(f?.[c]);
  if (!Number.isFinite(v)) throw new Error(`Sin número en ${c}`);
  return v;
};
const cerca = (a: number, b: number, tolerancia = 0.011) => Math.abs(a - b) <= tolerancia;

const PDF_LIQ = 'data-raw/seg-social-fin/liquidacion/2025_SISTEMA.pdf';
const PDF_GEN = 'data-raw/seg-social-fin/Brecha de género.pdf';
const PDF_RDL = 'data-raw/boe/RDL-8-2010.pdf';
const PDF_RD = 'data-raw/boe/RD-1794-2010.pdf';
// Huellas calculadas el 2026-11-17 al incorporar los PDF: no hay LEEME con la que compararlas.
const HUELLAS: Record<string, string> = {
  [PDF_LIQ]: 'ee831fa59e4112329d78fd2745c03296f17627cb8515a3d606dcaa0248896034',
  [PDF_GEN]: '499b1f7ebcb8a6a6e8c6f1b0ca4b83c2a7e414b4b8f7e8335556ca03d207eda3',
  [PDF_RDL]: '25b8e0e9141f2bad41d2de6b0c80026761ed8f39c2c3e2fd5af9226901bed2de',
  [PDF_RD]: '205019a5783deb7b7c0b2fc699d43d6985193a3b9ebebe694f393ffd8128d12e',
};

describe('validaciones de los ETL con casos hechos a mano (Python)', () => {
  it('las pruebas unitarias de scripts/etl/test_etl_5a4.py pasan', () => {
    const r = spawnSync('python3', ['-I', path.join(RAIZ, 'scripts/etl/test_etl_5a4.py')], {
      encoding: 'utf8',
      timeout: 60_000,
    });
    expect(r.stderr + r.stdout).toMatch(/OK/);
    expect(r.status).toBe(0);
  });
});

describe('huellas de los cuatro PDF (calculadas hoy, sin referencia)', () => {
  it.each(Object.entries(HUELLAS))('%s', (ruta, huella) => {
    expect(sha(ruta)).toBe(huella);
  });
});

// ---------------------------------------------------------------------------
// Liquidación de 2025
// ---------------------------------------------------------------------------
describe('liquidación de 2025', () => {
  const meta = ArchivoExtraccionPdf.parse(json('data/sistema/liquidacion-ss-2025-extraccion.json'));
  const filas = filasCsv('data/sistema/liquidacion-ss-2025-extraccion.csv');
  const val = (tabla: string, tipo: string, patron: RegExp, columna: string): number => {
    const c = filas.filter(
      (f) =>
        f['tabla'] === tabla &&
        f['tipo_pagina'] === tipo &&
        f['columna'] === columna &&
        patron.test(f['partida'] ?? ''),
    );
    if (c.length !== 1) throw new Error(`${c.length} filas para ${String(patron)}`);
    return num(c[0], 'valor');
  };
  const seccion = (tabla: string, tipo: string, columna: string, sec: RegExp, excluir: RegExp) =>
    filas
      .filter(
        (f) =>
          f['tabla'] === tabla &&
          f['tipo_pagina'] === tipo &&
          f['columna'] === columna &&
          sec.test(f['seccion'] ?? '') &&
          !excluir.test(f['partida'] ?? ''),
      )
      .map((f) => num(f, 'valor'));
  const suma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

  it('procedencia: un PDF de nueve páginas con la huella de hoy y la fecha indicada por el autor', () => {
    expect(meta.origenes).toHaveLength(1);
    expect(meta.origenes[0]).toMatchObject({ fichero: PDF_LIQ, paginas: 9, ejercicio: 2025 });
    expect(meta.origenes[0]?.sha256).toBe(HUELLAS[PDF_LIQ]);
    expect(meta.fetchedAt).toBe('2026-11-16');
    expect(meta.naturaleza).toBe('observado');
    expect(meta.notes).toMatch(/sin referencia/);
    expect(
      validarCsvExtraccion(
        meta,
        leer('data/sistema/liquidacion-ss-2025-extraccion.csv')
          .split('\n')
          .filter((l) => l.trim() !== ''),
        'x',
      ),
    ).toEqual([]);
  });

  it('todas las cifras citan una página del PDF (1 a 9) y están verificadas', () => {
    expect(filas.length).toBe(meta.filas);
    for (const f of filas) {
      expect(f['fichero']).toBe(PDF_LIQ);
      expect(num(f, 'pagina')).toBeGreaterThanOrEqual(1);
      expect(num(f, 'pagina')).toBeLessThanOrEqual(9);
      expect(f['verificado']).toBe('si');
    }
  });

  it('continuidad: unidad en millones, dos ejercicios (2024 y 2025) y las tablas esperadas', () => {
    expect(meta.unidad).toBe('millones de euros');
    const periodos = new Set(filas.map((f) => f['periodo']));
    expect([...periodos].sort()).toEqual(['2024', '2025']);
    expect(new Set(filas.map((f) => f['tabla']))).toEqual(
      new Set(['gastos', 'gastos-cap4', 'ingresos', 'ingresos-cap1-cap4']),
    );
    // el PDF no trae la página de liquidación del presupuesto de gastos
    expect(filas.some((f) => f['tabla'] === 'gastos' && f['tipo_pagina'] === 'liquidacion')).toBe(
      false,
    );
  });

  it('sumas recalculadas desde el CSV (sin pasar por el ETL)', () => {
    for (const col of ['ejercicio_anterior', 'ejercicio_actual']) {
      // gastos: corrientes + capital + financieras = total
      const gcor = suma(
        [/^1\./, /^2\./, /^3\./, /^4\./].map((p) => val('gastos', 'comparacion', p, col)),
      );
      expect(
        cerca(gcor, val('gastos', 'comparacion', /^SUMA OPERACIONES CORRIENTES/, col), 0.03),
      ).toBe(true);
      const gtot =
        val('gastos', 'comparacion', /^SUMA OPERACIONES NO FINANCIERAS/, col) +
        val('gastos', 'comparacion', /^SUMA OPERACIONES FINANCIERAS/, col);
      expect(cerca(gtot, val('gastos', 'comparacion', /^TOTAL GASTOS/, col), 0.03)).toBe(true);
      // ingresos
      const itot =
        val('ingresos', 'comparacion', /^SUMA OPERACIONES NO FINANCIERAS/, col) +
        val('ingresos', 'comparacion', /^SUMA OPERACIONES FINANCIERAS/, col);
      expect(cerca(itot, val('ingresos', 'comparacion', /^TOTAL INGRESOS/, col), 0.03)).toBe(true);
      // capítulo 4 de gastos = partida «4. Transferencias corrientes»
      const cap4 =
        val('gastos-cap4', 'comparacion', /^TOTAL PRESTACIONES CONTRIBUTIVAS/, col) +
        val('gastos-cap4', 'comparacion', /^TOTAL PREST NO CONTRIBUTIVAS/, col);
      const g4 = val('gastos', 'comparacion', /^4\. Transferencias corrientes/, col);
      if (col === 'ejercicio_actual') expect(cerca(cap4, g4, 0.03)).toBe(true);
      // cotizaciones: partidas = total
      const cot = suma(seccion('ingresos-cap1-cap4', 'comparacion', col, /COTIZACIONES/, /^TOTAL/));
      expect(
        cerca(cot, val('ingresos-cap1-cap4', 'comparacion', /^TOTAL COTIZACIONES/, col), 0.05),
      ).toBe(true);
    }
  });

  it('el PDF no es coherente en una cifra de 2024 y en dos incrementos: queda registrado y no se publica el incremento', () => {
    const malas = (meta.comprobacionesEspecificas ?? []).filter((c) => !c.ok);
    expect(malas.map((c) => c.id).sort()).toEqual([
      'gastos-cap4-total-2024',
      'incremento-gastos-cap4-p4-f17',
      'incremento-gastos-cap4-p4-f7',
    ]);
    // las diferencias de los incrementos son exactamente la partida DANA de 2025 (1,36 millones)
    expect(
      malas
        .filter((c) => c.id.startsWith('incremento'))
        .every((c) => cerca(c.diferencia, 1.36, 0.001)),
    ).toBe(true);
    expect(filas.some((f) => f['columna'] === 'incremento_absoluto')).toBe(false);
  });

  it('las validaciones internas no tienen sumas ni coherencias incorrectas', () => {
    expect(meta.resumenValidaciones['sumas_incorrectas']).toBe(0);
    expect(meta.resumenValidaciones['coherencia_incorrecta']).toBe(0);
    expect(meta.resumenValidaciones['comprobaciones_de_suma']).toBeGreaterThan(100);
    expect(meta.resumenValidaciones['coherencia_liquidacion_comparacion']).toBeGreaterThan(50);
  });

  describe('contraste con la ejecución del presupuesto (presupuesto-ss-ejecucion)', () => {
    const contraste = ArchivoTabla.parse(json('data/sistema/liquidacion-ss-2025-contraste.json'));
    const filasC = filasCsv('data/sistema/liquidacion-ss-2025-contraste.csv');
    const ejec = filasCsv('data/sistema/presupuesto-ss-ejecucion.csv');
    const ej = (tabla: string, concepto: string, anio: string): number => {
      const c = ejec.filter(
        (f) =>
          f['tabla'] === tabla &&
          f['concepto'] === concepto &&
          f['ejercicio'] === anio &&
          f['periodo'] === `${anio}-T4` &&
          f['columna'] === 'principal',
      );
      if (c.length !== 1) throw new Error(`${c.length} filas de ejecución para ${concepto}`);
      return Number(c[0]?.['derechos_u_obligaciones_meur'] || 0);
    };

    it('procedencia y número de filas', () => {
      expect(contraste.filas).toBe(filasC.length);
      expect(contraste.fetchedAt).toBe('2026-11-16');
      expect(contraste.columnas.map((c) => c.id)).toEqual(Object.keys(filasC[0] ?? {}));
    });

    it('todas las cifras de 2025 y la presupuestaria coinciden con la ejecución: la definición es la misma', () => {
      const de2025 = filasC.filter((f) => f['ejercicio'] === '2025');
      expect(de2025.length).toBeGreaterThan(120);
      expect(de2025.every((f) => f['estado'] === 'coincide')).toBe(true);
      expect(
        filasC
          .filter((f) => f['columna'] === 'presupuesto_total' || f['columna'] === 'previsiones')
          .every((f) => f['estado'] === 'coincide'),
      ).toBe(true);
    });

    it('cifras clave recalculadas desde la ejecución', () => {
      const gastos = filas.find(
        (f) =>
          f['tabla'] === 'gastos' &&
          /^TOTAL GASTOS/.test(f['partida'] ?? '') &&
          f['columna'] === 'ejercicio_actual',
      );
      expect(num(gastos, 'valor')).toBe(ej('gastos', 'TOTAL GASTOS', '2025'));
      const ingresos = filas.find(
        (f) =>
          f['tabla'] === 'ingresos' &&
          /^TOTAL INGRESOS/.test(f['partida'] ?? '') &&
          f['columna'] === 'ejercicio_actual',
      );
      expect(num(ingresos, 'valor')).toBe(ej('ingresos', 'TOTAL INGRESOS', '2025'));
      const cap4 =
        ej('gastos-cap4', 'TOTAL TRANSFERENCIAS CORRIENTES', '2025') +
        ej('gastos-cap4-no-contributivas', 'TOTAL', '2025');
      const g4 = filas.find(
        (f) =>
          f['tabla'] === 'gastos' &&
          /^4\. Transferencias corrientes/.test(f['partida'] ?? '') &&
          f['columna'] === 'ejercicio_actual',
      );
      expect(cerca(num(g4, 'valor'), cap4, 0.02)).toBe(true);
    });

    it('2024: solo difieren cinco cifras, todas de las partidas de la DANA, por 0,57 millones en el total contributivo', () => {
      const dif = filasC.filter((f) => f['estado'] === 'difiere');
      expect(dif).toHaveLength(5);
      expect(dif.every((f) => f['ejercicio'] === '2024' && f['tabla'] === 'gastos-cap4')).toBe(
        true,
      );
      const total = dif.find((f) => /^TOTAL PRESTACIONES CONTRIBUTIVAS/.test(f['partida'] ?? ''));
      expect(cerca(num(total, 'diferencia_meur'), 0.57, 0.011)).toBe(true);
      // la diferencia de «Incapacidad temporal» y la de pensiones suman la del total contributivo
      const it = num(
        dif.find((f) => /^Incapacidad temporal/.test(f['partida'] ?? '')),
        'diferencia_meur',
      );
      const pe = num(
        dif.find((f) => /^SUMA PENSIONES/.test(f['partida'] ?? '')),
        'diferencia_meur',
      );
      expect(cerca(it + pe, 0.57, 0.011)).toBe(true);
    });

    it('MEI: derechos reconocidos de 2025 y de 2024 coinciden con la ejecución y no con las dotaciones al Fondo', () => {
      const mei = filas.filter(
        (f) =>
          /^Mecanismo de Equidad/.test(f['partida'] ?? '') && f['tipo_pagina'] === 'comparacion',
      );
      const m25 = num(
        mei.find((f) => f['columna'] === 'ejercicio_actual'),
        'valor',
      );
      const m24 = num(
        mei.find((f) => f['columna'] === 'ejercicio_anterior'),
        'valor',
      );
      expect(m25).toBe(ej('ingresos-cap1-cap4', 'MECANISMO DE EQUIDAD INTERGENERACIONAL', '2025'));
      expect(m24).toBe(ej('ingresos-cap1-cap4', 'MECANISMO DE EQUIDAD INTERGENERACIONAL', '2024'));
      const fondo = ArchivoDatos.parse(json('data/sistema/fondo-reserva-series.json'));
      const dot = fondo.series?.find((s) => s.id === 'dotaciones-mei-anuales');
      const d25 = dot?.points.find((p) => p.period === '2025')?.value;
      const d24 = dot?.points.find((p) => p.period === '2024')?.value;
      if (typeof d25 !== 'number' || typeof d24 !== 'number') throw new Error('sin dotaciones');
      // diferencias registradas en docs/DISCREPANCIAS.md (devengo frente a dotación)
      expect(cerca(m25 - d25, 579.43, 0.011)).toBe(true);
      expect(cerca(m24 - d24, 135.6, 0.011)).toBe(true);
    });
  });

  it('no se une a las liquidaciones de 2010 a 2016: la serie versionada sigue acabando en 2016', () => {
    const series = ArchivoDatos.parse(json('data/sistema/liquidacion-ss-series.json'));
    const periodos = series.series?.flatMap((s) => s.points.map((p) => Number(p.period))) ?? [];
    expect(Math.min(...periodos)).toBe(2010);
    expect(Math.max(...periodos)).toBe(2016);
  });
});

// ---------------------------------------------------------------------------
// Complementos por brecha de género y por maternidad
// ---------------------------------------------------------------------------
describe('complementos por brecha de género y por maternidad (1-10-2026)', () => {
  const meta = ArchivoExtraccionPdf.parse(json('data/sistema/complementos-genero-territorio.json'));
  const ind = ArchivoExtraccionPdf.parse(json('data/sistema/complementos-genero-indicadores.json'));
  const filas = filasCsv('data/sistema/complementos-genero-territorio.csv');
  const filasInd = filasCsv('data/sistema/complementos-genero-indicadores.csv');
  const tabla = (comp: string, sexo: string) =>
    filas.filter((f) => f['complemento'] === comp && f['sexo'] === sexo);
  const cols = (comp: string) =>
    comp === 'brecha'
      ? ['numero', 'hijos_1', 'hijos_2', 'hijos_3', 'hijos_4_o_mas']
      : ['numero', 'hijos_2', 'hijos_3', 'hijos_4_o_mas'];
  const combinaciones = [
    ['brecha', 'ambos'],
    ['brecha', 'hombres'],
    ['brecha', 'mujeres'],
    ['maternidad', 'ambos'],
    ['maternidad', 'hombres'],
    ['maternidad', 'mujeres'],
  ] as const;

  it('procedencia: 14 páginas, huella de hoy, fecha del autor, sin periodo anual', () => {
    expect(meta.origenes[0]).toMatchObject({ fichero: PDF_GEN, paginas: 14 });
    expect(meta.origenes[0]?.sha256).toBe(HUELLAS[PDF_GEN]);
    expect(ind.origenes[0]?.sha256).toBe(HUELLAS[PDF_GEN]);
    expect(meta.fetchedAt).toBe('2026-11-16');
    expect(meta.description).toMatch(/no es la brecha de género de las pensiones de jubilación/);
    // un único corte temporal: no hay columna de año ni de periodo
    expect(meta.columnas.map((c) => c.id)).not.toContain('anio');
    expect(meta.columnas.map((c) => c.id)).not.toContain('periodo');
    for (const [m, ruta] of [
      [meta, 'data/sistema/complementos-genero-territorio.csv'],
      [ind, 'data/sistema/complementos-genero-indicadores.csv'],
    ] as const) {
      expect(
        validarCsvExtraccion(
          m,
          leer(ruta)
            .split('\n')
            .filter((l) => l.trim() !== ''),
          ruta,
        ),
      ).toEqual([]);
    }
  });

  it('seis tablas de 63 filas (total, 19 comunidades y ciudades, 43 provincias) y mismos territorios en todas', () => {
    expect(filas).toHaveLength(6 * 63);
    for (const [c, s] of combinaciones) {
      const t = tabla(c, s);
      expect(t).toHaveLength(63);
      expect(t.filter((f) => f['nivel'] === 'total')).toHaveLength(1);
      expect(t.filter((f) => f['nivel'] === 'comunidad')).toHaveLength(19);
      expect(t.filter((f) => f['nivel'] === 'provincia')).toHaveLength(43);
    }
    const nombres = (c: string, s: string) => tabla(c, s).map((f) => f['territorio']);
    for (const [c, s] of combinaciones) expect(nombres(c, s)).toEqual(nombres('brecha', 'ambos'));
  });

  it('las provincias suman su comunidad y las comunidades el total, en cada columna de recuento', () => {
    for (const [c, s] of combinaciones) {
      const t = tabla(c, s);
      const total = t.find((f) => f['nivel'] === 'total');
      for (const col of cols(c)) {
        const comunidades = t.filter((f) => f['nivel'] === 'comunidad');
        expect(comunidades.reduce((a, f) => a + num(f, col), 0)).toBe(num(total, col));
        for (const com of comunidades) {
          const provs = t.filter(
            (f) => f['nivel'] === 'provincia' && f['comunidad'] === com['territorio'],
          );
          if (provs.length > 0)
            expect(provs.reduce((a, f) => a + num(f, col), 0)).toBe(num(com, col));
        }
      }
    }
  });

  it('número = desglose por hijos + pensiones sin número de hijos (las notas del PDF: 2, 2, 48, 37 y 11)', () => {
    const sinHijos: Record<string, number> = {
      'brecha-ambos': 2,
      'brecha-hombres': 0,
      'brecha-mujeres': 2,
      'maternidad-ambos': 48,
      'maternidad-hombres': 37,
      'maternidad-mujeres': 11,
    };
    for (const [c, s] of combinaciones) {
      const total = tabla(c, s).find((f) => f['nivel'] === 'total');
      const desglose = cols(c)
        .slice(1)
        .reduce((a, col) => a + num(total, col), 0);
      expect(num(total, 'numero') - desglose).toBe(sinHijos[`${c}-${s}`]);
    }
  });

  it('ambos sexos = hombres + mujeres en cada territorio y columna de recuento', () => {
    for (const c of ['brecha', 'maternidad']) {
      const a = tabla(c, 'ambos');
      const h = tabla(c, 'hombres');
      const m = tabla(c, 'mujeres');
      a.forEach((f, i) => {
        for (const col of cols(c)) expect(num(f, col)).toBe(num(h[i], col) + num(m[i], col));
      });
    }
  });

  it('el importe del desglose de la brecha de género es el del año de los datos ya cargados', () => {
    const d = ArchivoDatos.parse(json('data/parametros/complemento-brecha-genero.json'));
    const importe = d.data?.find((x) => x.period === '2026')?.value;
    expect(importe).toBe(36.9);
    const comp = (meta.comprobacionesEspecificas ?? []).filter((x) =>
      x.id.startsWith('importe-por-hijos'),
    );
    expect(comp).toHaveLength(12);
    expect(comp.every((x) => x.ok)).toBe(true);
  });

  it('todas las validaciones del ETL pasan y las cifras de indicadores coinciden con los totales de las tablas', () => {
    expect(meta.resumenValidaciones['incorrectas']).toBe(0);
    expect(ind.resumenValidaciones['incorrectas']).toBe(0);
    expect(meta.resumenValidaciones['comprobaciones']).toBeGreaterThan(300);
    const totalB = tabla('brecha', 'ambos').find((f) => f['nivel'] === 'total');
    const indB = filasInd.find(
      (f) =>
        f['concepto'] === 'Por brecha de género' &&
        f['bloque'] === 'Número de complementos en vigor',
    );
    expect(num(indB, 'ambos')).toBe(num(totalB, 'numero'));
    expect(filasInd.every((f) => f['unidad_cifra'] !== '')).toBe(true);
  });

  it('lo que no cierra: ninguna cifra de la extracción es una brecha anual', () => {
    const descripciones = meta.columnas.map((c) => c.descripcion).join(' ');
    expect(descripciones).not.toMatch(/brecha de las pensiones de jubilaci/i);
  });
});

// ---------------------------------------------------------------------------
// RDL 8/2010 y RD 1794/2010
// ---------------------------------------------------------------------------
describe('revalorización de 2011 (RDL 8/2010 y RD 1794/2010)', () => {
  const archivo = ArchivoDatos.parse(json('data/normativa/revalorizacion-2011-regla.json'));
  const texto = (ruta: string) =>
    hayPdftotext
      ? spawnSync('pdftotext', ['-layout', path.join(RAIZ, ruta), '-'], {
          encoding: 'utf8',
        }).stdout.replace(/\s+/g, ' ')
      : '';
  const dato = (id: string) => {
    const d = archivo.data?.find((x) => x.id === id);
    if (!d) throw new Error(`Sin dato ${id}`);
    return d;
  };

  it('seis datos, cada uno con cita, artículo, página, huella y fecha de descarga', () => {
    expect(archivo.data).toHaveLength(6);
    for (const d of archivo.data ?? []) {
      expect(d.quote).toBeTruthy();
      expect(d.location).toMatch(/página \d+ \(BOE, pág\. \d+\)/);
      expect(d.location).toMatch(/[0-9a-f]{64}/);
      expect(d.fetchedAt).toBe('2026-11-16');
      expect(d.period).toBe('2011');
    }
  });

  it('la regla: suspensión, 1 % para las excluidas, 0 % para el resto y 2,3 % de referencia del pago único', () => {
    expect(dato('suspension-contributivas-2011').value).toBe(1);
    expect(dato('porcentaje-excluidas-2011').value).toBe(1);
    expect(dato('porcentaje-excluidas-2011').unit).toBe('%');
    expect(dato('resto-mantienen-cuantia-2011').value).toBe(0);
    expect(dato('resto-mantienen-cuantia-2011').confidence).toBe('media');
    expect(dato('pago-unico-referencia-2010').value).toBe(2.3);
  });

  it('las huellas de las ubicaciones son las de los PDF', () => {
    for (const d of archivo.data ?? []) {
      const esRdl = d.source.docId === 'BOE-A-2010-8228';
      expect(d.location).toContain(HUELLAS[esRdl ? PDF_RDL : PDF_RD]);
    }
  });

  it.skipIf(!hayPdftotext)(
    'cada cita figura en el texto de su PDF y la página citada es la que la contiene',
    () => {
      const textos = {
        'BOE-A-2010-8228': texto(PDF_RDL),
        'BOE-A-2010-20149': texto(PDF_RD),
      } as Record<string, string>;
      for (const d of archivo.data ?? []) {
        const citaNormal = (d.quote ?? '').replace(/\s+/g, ' ');
        // los pies de página (cve y cabecera) pueden cortar una cita: se comparan sin ellos
        const limpio = (textos[d.source.docId ?? ''] ?? '')
          .replace(/cve: BOE-A-\d{4}-\d+/g, ' ')
          .replace(
            /BOLETÍN OFICIAL DEL ESTADO Núm\. \d+ \S+ \d+ de \S+ de \d+ Sec\. I\. Pág\. \d+/g,
            ' ',
          )
          .replace(/\s+/g, ' ');
        expect(limpio).toContain(citaNormal);
      }
    },
  );

  it('no se declara el acumulado, 2012 ni la paga por desviación de 2001 a 2009: el texto lo dice', () => {
    expect(archivo.description).toMatch(/No cubre 2012/);
    expect(archivo.data?.some((d) => /2012/.test(d.period))).toBe(false);
  });

  it('la serie general de revalorización no cambia (la usa el motor): sigue sin 2011 ni 2012', () => {
    const s = ArchivoDatos.parse(json('data/parametros/revalorizacion-general.json'));
    const anios = s.data?.map((d) => d.period) ?? [];
    expect(anios).not.toContain('2011');
    expect(anios).not.toContain('2012');
  });
});

// ---------------------------------------------------------------------------
// Idempotencia
// ---------------------------------------------------------------------------
describe.skipIf(!hayPdftotext)(
  'idempotencia y reproducibilidad de los ETL (necesita pdftotext)',
  () => {
    const ejecutar = (script: string, salida: string) =>
      spawnSync('python3', ['-I', path.join(RAIZ, script)], {
        encoding: 'utf8',
        env: { ...process.env, SALIDA: salida },
        timeout: 120_000,
      });
    const trabajos: { script: string; salidaEn: string; ficheros: string[] }[] = [
      {
        script: 'scripts/etl/ssf_liquidacion_2025.py',
        salidaEn: 'data/sistema',
        ficheros: [
          'liquidacion-ss-2025-extraccion.csv',
          'liquidacion-ss-2025-extraccion.json',
          'liquidacion-ss-2025-contraste.csv',
          'liquidacion-ss-2025-contraste.json',
        ],
      },
      {
        script: 'scripts/etl/ss_complementos_genero.py',
        salidaEn: 'data/sistema',
        ficheros: [
          'complementos-genero-territorio.csv',
          'complementos-genero-territorio.json',
          'complementos-genero-indicadores.csv',
          'complementos-genero-indicadores.json',
        ],
      },
      {
        script: 'scripts/etl/boe_revalorizacion_2011.py',
        salidaEn: 'data/normativa',
        ficheros: ['revalorizacion-2011-regla.json'],
      },
    ];

    it.each(trabajos)(
      '$script: dos ejecuciones dan la misma salida y es la versionada',
      ({ script, salidaEn, ficheros }) => {
        const a = mkdtempSync(path.join(tmpdir(), 'etl5a4-a-'));
        const b = mkdtempSync(path.join(tmpdir(), 'etl5a4-b-'));
        try {
          for (const dir of [a, b]) {
            const r = ejecutar(script, dir);
            expect(r.status, r.stderr).toBe(0);
          }
          for (const f of ficheros) {
            const ta = readFileSync(path.join(a, f), 'utf8');
            const tb = readFileSync(path.join(b, f), 'utf8');
            expect(ta).toBe(tb);
            // lo versionado pasó por Prettier: se compara sin espacios sobrantes
            const versionado = leer(`${salidaEn}/${f}`);
            const normal = (t: string) => (f.endsWith('.json') ? JSON.stringify(JSON.parse(t)) : t);
            expect(normal(ta)).toBe(normal(versionado));
          }
        } finally {
          rmSync(a, { recursive: true, force: true });
          rmSync(b, { recursive: true, force: true });
        }
      },
      180_000,
    );
  },
);
