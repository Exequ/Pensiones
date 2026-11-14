/**
 * Fase 5-B2: salida del modelo financiero M4 en data/proyecciones/m4-financiero.json.
 *  1. Procedencia: fuente, fecha de descarga, confianza, naturaleza «proyección de modelo», escenario,
 *     commit del código y huella SHA-256 del CSV de origen.
 *  2. El JSON reproduce exactamente el CSV de data-raw/modelos-salidas/m4/ y su LEEME.
 *  3. Coherencias internas: solo las que declara docs/modelos/M4_descripcion.md o las que son
 *     aritmética evidente entre columnas. Las que no se cumplen se anotan en docs/DISCREPANCIAS.md y
 *     no se imponen (ver el último bloque, que describe sin imponer).
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ArchivoProyeccion } from '../src/engine/esquema-datos.ts';
import { filasCsv } from '../src/engine/series-historicas.ts';
import { validarContenido } from './lib/validar-datos.ts';

const RAIZ = path.resolve(import.meta.dirname, '..');
const leer = (ruta: string) => readFileSync(path.join(RAIZ, ruta), 'utf8');
type Fila = Record<string, string | number>;
const num = (f: Fila, k: string): number => f[k] as number;

const RUTA = 'data/proyecciones/m4-financiero.json';
const bruto: unknown = JSON.parse(leer(RUTA));
const m4 = ArchivoProyeccion.parse(bruto);
const filasDe = (a: ArchivoProyeccion): Fila[] =>
  a.filas.map((fila) => {
    const o: Fila = {};
    a.columnas.forEach((c, j) => {
      o[c.id] = fila[j]!;
    });
    return o;
  });
const f4 = filasDe(m4);
const cargar = (ruta: string) => filasDe(ArchivoProyeccion.parse(JSON.parse(leer(ruta))));
const m2 = cargar('data/proyecciones/m2-cotizantes.json');
const m2Relacion = cargar('data/proyecciones/m2-relacion-pensiones.json');
const m3 = cargar('data/proyecciones/m3-resumen.json');

const leeme = leer('data-raw/modelos-salidas/LEEME.txt');
const fechaLeeme = /el (\d{4}-\d{2}-\d{2})/.exec(leeme)![1]!;
const commitLeeme = /commit que modifica modelos\/: ([0-9a-f]{7,40})/.exec(leeme)![1]!;

const ANIOS = Array.from({ length: 25 }, (_, i) => 2026 + i);

/** Todos los valores iguales entre sí con una tolerancia relativa. */
function constante(valores: number[], tolerancia = 1e-9): void {
  const base = valores[0]!;
  for (const v of valores)
    expect(Math.abs(v - base)).toBeLessThanOrEqual(Math.abs(base) * tolerancia);
}

const datosJson = (ruta: string) =>
  JSON.parse(leer(ruta)) as {
    data?: { period: string; value: number }[];
    series?: { id: string; points: { period: string; value: number }[] }[];
  };
const porAnio = (datos: { period: string; value: number }[]) =>
  new Map(datos.map((d) => [Number(d.period), d.value]));

describe('procedencia de data/proyecciones/m4-financiero.json', () => {
  it('esquema, fuente, fecha, confianza y naturaleza', () => {
    expect(validarContenido(bruto, RUTA)).toEqual([]);
    expect(m4.id).toBe('m4-financiero');
    expect(m4.naturaleza).toBe('proyeccion-de-modelo');
    expect(m4.source.publisher).toBe('Elaboración propia: modelo de proyección');
    expect(m4.source.url).toMatch(
      /^https:\/\/github\.com\/Exequ\/Pensiones\/blob\/[0-9a-f]{40}\/modelos\/m4\/m4_financiero\.py$/,
    );
    expect(m4.fetchedAt).toBe(fechaLeeme);
    expect(['alta', 'media', 'baja']).toContain(m4.confidence);
    expect(m4.modelo.id).toBe('m4');
    expect(m4.modelo.descripcion).toBe('docs/modelos/M4_descripcion.md');
  });

  it('escenario y commit del LEEME', () => {
    expect(m4.origen.commitModelos.startsWith(commitLeeme)).toBe(true);
    expect(m4.source.url).toContain(m4.origen.commitModelos);
    expect(m4.origen.ejecutadoEl).toBe(fechaLeeme);
    expect(m4.escenario.g).toBeCloseTo(0.01, 12);
    expect(m4.escenario.ipc).toBeCloseTo(0.02, 12);
    expect(m4.escenario.legislacion).toBe('congelada');
    expect(leeme).toContain(m4.escenario.literal);
  });

  it('la huella SHA-256 es la del CSV y las filas lo reproducen', () => {
    const bytes = readFileSync(path.join(RAIZ, m4.origen.csv));
    expect(m4.origen.csv).toBe('data-raw/modelos-salidas/m4/m4_financiero.csv');
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(m4.origen.sha256);
    const lineas = bytes
      .toString('utf8')
      .split('\n')
      .filter((l) => l.trim() !== '');
    expect(lineas[0]!.split(',')).toEqual(m4.columnas.map((c) => c.id));
    expect(lineas.length - 1).toBe(m4.filas.length);
    lineas.slice(1).forEach((linea, i) => {
      const celdas = linea.split(',');
      m4.columnas.forEach((c, j) => {
        expect(m4.filas[i]![j], `fila ${i} ${c.id}`).toBe(Number(celdas[j]));
      });
    });
  });

  it('cada columna lleva descripción y, salvo el año, unidad; ninguna descripción copia cifras', () => {
    for (const c of m4.columnas) {
      expect(c.descripcion.length, c.id).toBeGreaterThan(2);
      if (c.id !== 'anio') expect(c.unidad, c.id).toBeTruthy();
      // Solo pueden llevar dígitos los nombres de los modelos («M3»), no cifras de datos.
      expect(c.descripcion.replace(/\bM\d\b/g, ''), c.id).not.toMatch(/\d/);
    }
  });
});

describe('coherencias internas de M4 (las declara la descripción o son aritmética entre columnas)', () => {
  it('un año por fila, de 2026 a 2050, sin repeticiones ni huecos', () => {
    expect(f4.map((r) => r['anio'])).toEqual(ANIOS);
    for (const c of m4.columnas) {
      for (const r of f4) expect(Number.isFinite(num(r, c.id)), `${r['anio']} ${c.id}`).toBe(true);
    }
  });

  it('el número de pensiones es el total de M3 y los afiliados por pensión son los de M2 entre M3', () => {
    f4.forEach((r, i) => {
      expect(num(r, 'pensiones_oct')).toBeCloseTo(num(m3[i]!, 'total'), 3);
      expect(num(r, 'afiliados_por_pension')).toBeCloseTo(
        num(m2Relacion[i]!, 'afiliados_por_pension'),
        9,
      );
      expect(num(r, 'afiliados_por_pension')).toBeCloseTo(
        num(m2[i]!, 'afiliados_dic') / num(r, 'pensiones_oct'),
        9,
      );
    });
  });

  it('los saldos son aritmética entre columnas: cotizaciones menos pensiones, sin transferencias y no financiero', () => {
    for (const r of f4) {
      const gasto = num(r, 'gasto_pensiones');
      expect(num(r, 'saldo_cotizaciones_menos_pensiones')).toBeCloseTo(
        num(r, 'cotizaciones') - gasto,
        6,
      );
      // «Saldo = ingresos − gasto en pensiones − resto de gastos»; sin transferencias: sin esos ingresos.
      expect(num(r, 'saldo_sin_transferencias')).toBeCloseTo(
        num(r, 'cotizaciones') - gasto - num(r, 'otros_gastos'),
        6,
      );
      expect(num(r, 'saldo_no_financiero')).toBeCloseTo(
        num(r, 'saldo_sin_transferencias') + num(r, 'transferencias_y_otros'),
        6,
      );
    }
  });

  it('las columnas en porcentaje del PIB son el importe entre el PIB aproximado', () => {
    for (const r of f4) {
      const pib = num(r, 'pib_proxy');
      expect(num(r, 'gasto_pensiones_pct_pib')).toBeCloseTo(
        (100 * num(r, 'gasto_pensiones')) / pib,
        9,
      );
      expect(num(r, 'saldo_cot_pens_pct_pib')).toBeCloseTo(
        (100 * num(r, 'saldo_cotizaciones_menos_pensiones')) / pib,
        9,
      );
      expect(num(r, 'saldo_no_financiero_pct_pib')).toBeCloseTo(
        (100 * num(r, 'saldo_no_financiero')) / pib,
        9,
      );
      expect(num(r, 'fondo_pct_pib')).toBeCloseTo((100 * num(r, 'fondo_reserva')) / pib, 9);
    }
  });

  it('el PIB aproximado crece como los afiliados de M2 por el salario nominal (1+g)(1+IPC) del escenario', () => {
    const w = (1 + m4.escenario.g) * (1 + m4.escenario.ipc);
    for (let i = 1; i < f4.length; i++) {
      const crecimientoPib = num(f4[i]!, 'pib_proxy') / num(f4[i - 1]!, 'pib_proxy');
      const crecimientoAfiliados = num(m2[i]!, 'afiliados_dic') / num(m2[i - 1]!, 'afiliados_dic');
      expect(crecimientoPib).toBeCloseTo(crecimientoAfiliados * w, 9);
    }
  });

  it('las cotizaciones sin el MEI evolucionan como la base total de M2 (el MEI está incluido en «cotizaciones»)', () => {
    constante(
      f4.map(
        (r, i) => (num(r, 'cotizaciones') - num(r, 'mei')) / num(m2[i]!, 'base_total_rg_meur'),
      ),
    );
  });

  it('el MEI sigue el tipo legal de data/parametros (mantenido en su último valor hasta 2050) sobre la base de M2', () => {
    const tipo = porAnio(datosJson('data/parametros/mei-tipo-total.json').data!);
    const ultimo = Math.max(...tipo.keys());
    constante(
      f4.map(
        (r, i) =>
          num(r, 'mei') /
          (num(m2[i]!, 'base_total_rg_meur') * tipo.get(Math.min(Number(r['anio']), ultimo))!),
      ),
    );
  });

  it('la dotación al Fondo es una proporción constante del MEI, la que hubo en 2025', () => {
    const razones = f4.map((r) => num(r, 'dotacion_fondo') / num(r, 'mei'));
    constante(razones);
    // Proporción observada en 2025: dotaciones del MEI al Fondo entre MEI de la ejecución del presupuesto.
    const filasFondo = leer('data/sistema/fondo-reserva-anual.csv').split('\n');
    const cabecera = filasFondo[0]!.split(',');
    const f2025 = filasFondo.find((l) => l.startsWith('2025,'))!.split(',');
    const dotacionMei2025 = Number(f2025[cabecera.indexOf('dotaciones_mei_anuales_meur')]);
    const ejecucion = leer('data/sistema/presupuesto-ss-ejecucion.csv').split('\n');
    const h = ejecucion[0]!.split(',');
    const mei2025 = ejecucion
      .map((l) => l.split(','))
      .find(
        (c) =>
          c[h.indexOf('ejercicio')] === '2025' &&
          c[h.indexOf('periodo')] === '2025-T4' &&
          c[h.indexOf('columna')] === 'principal' &&
          c[h.indexOf('concepto')] === 'MECANISMO DE EQUIDAD INTERGENERACIONAL',
      )!;
    const meiEjecutado = Number(mei2025[h.indexOf('derechos_u_obligaciones_meur')]);
    expect(razones[0]!).toBeCloseTo(dotacionMei2025 / meiEjecutado, 6);
  });

  it('el valor del Fondo evoluciona con dotación y disposición y una rentabilidad implícita constante', () => {
    const serie = datosJson('data/sistema/fondo-reserva-series.json').series!.find(
      (s) => s.id === 'valor-fin-ano',
    )!;
    const inicial = porAnio(serie.points).get(2025)!;
    const rentabilidades = f4.map((r, i) => {
      const previo = i === 0 ? inicial : num(f4[i - 1]!, 'fondo_reserva');
      return (
        (num(r, 'fondo_reserva') -
          previo -
          num(r, 'dotacion_fondo') +
          num(r, 'disposicion_fondo')) /
        previo
      );
    });
    constante(rentabilidades, 1e-7);
    // La rentabilidad implícita no es una cifra de la descripción: es positiva y razonablemente pequeña.
    expect(rentabilidades[0]!).toBeGreaterThan(0);
    expect(rentabilidades[0]!).toBeLessThan(0.1);
  });

  it('el Fondo no se usa antes del primer año con límite legal ni por encima de ese límite (en % del PIB aproximado)', () => {
    const limite = porAnio(datosJson('data/parametros/fondo-reserva-desembolso-maximo.json').data!);
    const primero = Math.min(...limite.keys());
    for (const r of f4) {
      const anio = Number(r['anio']);
      const disposicion = num(r, 'disposicion_fondo');
      expect(disposicion).toBeGreaterThanOrEqual(0);
      expect(num(r, 'fondo_reserva')).toBeGreaterThanOrEqual(0);
      expect(num(r, 'financiacion_adicional')).toBeGreaterThanOrEqual(0);
      if (anio < primero) expect(disposicion, `${anio}`).toBe(0);
      else {
        const tope = ((limite.get(anio) ?? 0) / 100) * num(r, 'pib_proxy');
        expect(disposicion, `${anio}`).toBeLessThanOrEqual(tope * (1 + 1e-9));
      }
    }
  });
});

describe('lo que la salida cumple pero la descripción no declara (se describe, no se impone)', () => {
  it('financiación adicional = máx(0, dotación − saldo no financiero − disposición)', () => {
    for (const r of f4) {
      const esperado = Math.max(
        0,
        num(r, 'dotacion_fondo') - num(r, 'saldo_no_financiero') - num(r, 'disposicion_fondo'),
      );
      expect(num(r, 'financiacion_adicional')).toBeCloseTo(esperado, 6);
    }
  });

  it('el gasto no es exactamente pensiones × pensión media × catorce pagas: lo escala un factor casi constante (docs/DISCREPANCIAS.md)', () => {
    const cocientes = f4.map(
      (r) =>
        (num(r, 'gasto_pensiones') * 1e6) /
        (num(r, 'pensiones_oct') * num(r, 'pension_media_total') * 14),
    );
    // La descripción da la fórmula sin factor y dice que el modelo se calibra con 2025: el factor de
    // devengo de cada clase (código del modelo) hace que el cociente sea menor que uno y casi constante.
    for (const c of cocientes) {
      expect(c).toBeLessThan(1);
      expect(c).toBeGreaterThan(0.9);
    }
    expect(Math.max(...cocientes) - Math.min(...cocientes)).toBeLessThan(0.001);
  });

  it('la disposición del modelo coincide con el límite legal en cada año con disposición', () => {
    const limite = porAnio(datosJson('data/parametros/fondo-reserva-desembolso-maximo.json').data!);
    const con = f4.filter((r) => num(r, 'disposicion_fondo') > 0);
    expect(con.length).toBeGreaterThan(0);
    for (const r of con) {
      const tope = ((limite.get(Number(r['anio'])) ?? 0) / 100) * num(r, 'pib_proxy');
      expect(num(r, 'disposicion_fondo')).toBeCloseTo(tope, 3);
    }
  });
});

describe('la ejecución del presupuesto respalda la lectura de las cotizaciones de M4', () => {
  const filas = filasCsv(leer('data/sistema/presupuesto-ss-ejecucion.csv')).filter(
    (f) => f['periodo'] === '2025-T4' && f['columna'] === 'principal',
  );
  const importe = (tabla: string, concepto: string): number =>
    Number(
      filas.find((f) => f['tabla'] === tabla && f['concepto'] === concepto)![
        'derechos_u_obligaciones_meur'
      ],
    );

  it('el MEI es una partida de las cotizaciones sociales: la suma de partidas coincide con el total', () => {
    const delCapitulo = filas.filter((f) => f['tabla'] === 'ingresos-cap1-cap4');
    const total = importe('ingresos-cap1-cap4', 'TOTAL COTIZACIONES SOCIALES');
    const partidas = delCapitulo.slice(
      0,
      delCapitulo.findIndex((f) => f['concepto'] === 'TOTAL COTIZACIONES SOCIALES'),
    );
    expect(partidas.map((f) => f['concepto'])).toContain('MECANISMO DE EQUIDAD INTERGENERACIONAL');
    expect(partidas.reduce((a, f) => a + Number(f['derechos_u_obligaciones_meur']), 0)).toBeCloseTo(
      total,
      1,
    );
    expect(importe('ingresos', '1. COTIZACIONES SOCIALES')).toBeCloseTo(total, 6);
  });

  it('los ingresos y gastos no financieros de la ejecución son los de la serie de saldo presupuestario', () => {
    const saldo = JSON.parse(leer('data/sistema/deficit-presupuestario-seguridad-social.json')) as {
      series: { id: string; points: { period: string; value: number }[] }[];
    };
    const ultimo = (id: string) => saldo.series.find((s) => s.id === id)!.points.at(-1)!;
    expect(ultimo('derechos-no-financieros').period).toBe('2025');
    expect(importe('ingresos', 'SUMA DE OPERACIONES NO FINANCIERAS')).toBeCloseTo(
      ultimo('derechos-no-financieros').value,
      2,
    );
    expect(importe('gastos', 'SUMA DE OPERACIONES NO FINANCIERAS')).toBeCloseTo(
      ultimo('obligaciones-no-financieras').value,
      2,
    );
  });
});

describe('validate:data exige el esquema también para M4', () => {
  it('rechaza el fichero sin naturaleza o con otra naturaleza', () => {
    const { naturaleza: _n, ...sin } = bruto as Record<string, unknown>;
    expect(validarContenido(sin, RUTA).some((e) => e.ruta === 'naturaleza')).toBe(true);
    expect(
      validarContenido({ ...(bruto as object), naturaleza: 'observado' }, RUTA).some(
        (e) => e.ruta === 'naturaleza',
      ),
    ).toBe(true);
  });
});
