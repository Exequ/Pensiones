/**
 * Ajustes de M4: salida de los cinco escenarios en data/proyecciones/m4-escenarios.json.
 *  1. Procedencia: fuente, fecha, confianza, naturaleza, huella SHA-256 del CSV y commit del script.
 *  2. El JSON reproduce el CSV (las filas calculadas y la fila observada de 2025, que no se repite).
 *  3. El escenario base coincide con m4-financiero.json; los escenarios son los del LEEME.
 *  4. La fila observada de 2025 es la de los datos descargados (ejecución del presupuesto, Fondo, PIB).
 *  5. Coherencias de cada escenario (saldos, porcentajes) y que cambian solo g o el IPC.
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

const RUTA = 'data/proyecciones/m4-escenarios.json';
const CSV = 'data-raw/modelos-salidas/m4/m4_escenarios.csv';
const LEEME = 'data-raw/modelos-salidas/m4/LEEME_m4_escenarios.txt';
const bruto: unknown = JSON.parse(leer(RUTA));
const esc = ArchivoProyeccion.parse(bruto);
const filasDe = (a: ArchivoProyeccion): Fila[] =>
  a.filas.map((fila) => {
    const o: Fila = {};
    a.columnas.forEach((c, j) => {
      o[c.id] = fila[j]!;
    });
    return o;
  });
const filas = filasDe(esc);
const base = filasDe(
  ArchivoProyeccion.parse(JSON.parse(leer('data/proyecciones/m4-financiero.json'))),
);
const n = (f: Fila, k: string): number => f[k] as number;
const cerca = (a: number, b: number, tolerancia = 1e-9): void => {
  expect(Math.abs(a - b)).toBeLessThanOrEqual(tolerancia * Math.max(1, Math.abs(a), Math.abs(b)));
};

describe('procedencia de data/proyecciones/m4-escenarios.json', () => {
  it('esquema de /data, fuente en GitHub, fecha, confianza y naturaleza', () => {
    expect(validarContenido(bruto, RUTA)).toEqual([]);
    expect(esc.id).toBe('m4-escenarios');
    expect(esc.naturaleza).toBe('proyeccion-de-modelo');
    expect(esc.source.url).toMatch(
      /^https:\/\/github\.com\/Exequ\/Pensiones\/blob\/[0-9a-f]{40}\/modelos\/m4\/m4_escenarios\.py$/,
    );
    expect(esc.source.url).toContain(esc.origen.commitModelos);
    expect(esc.fetchedAt).toBe(esc.origen.ejecutadoEl);
    expect(['alta', 'media', 'baja']).toContain(esc.confidence);
    expect(esc.origen.leeme).toBe(LEEME);
  });

  it('la fecha de ejecución es la del LEEME de los escenarios', () => {
    const fecha = /^Fecha: (\d{4}-\d{2}-\d{2})/m.exec(leer(LEEME))![1]!;
    expect(esc.origen.ejecutadoEl).toBe(fecha);
  });

  it('la huella SHA-256 es la del CSV', () => {
    expect(esc.origen.sha256).toBe(
      createHash('sha256')
        .update(readFileSync(path.join(RAIZ, CSV)))
        .digest('hex'),
    );
  });

  it('el escenario base de los metadatos es el del LEEME (g e IPC)', () => {
    expect(esc.escenario.g).toBe(0.01);
    expect(esc.escenario.ipc).toBe(0.02);
  });
});

describe('el JSON reproduce el CSV de los escenarios', () => {
  const csv = filasCsv(leer(CSV));
  const calculadas = csv.filter((r) => r['anio'] !== '2025');

  it('las filas calculadas son las del CSV, en el orden de los escenarios del LEEME y por año', () => {
    expect(filas).toHaveLength(calculadas.length);
    const orden = esc.escenarios!.map((e) => e.id);
    const esperado = [...calculadas].sort(
      (a, b) =>
        orden.indexOf(a['escenario']!) - orden.indexOf(b['escenario']!) ||
        Number(a['anio']) - Number(b['anio']),
    );
    esperado.forEach((r, i) => {
      expect(filas[i]!['escenario']).toBe(r['escenario']);
      for (const c of esc.columnas) {
        if (c.tipo === 'numero') expect(n(filas[i]!, c.id)).toBe(Number(r[c.id]));
      }
    });
  });

  it('la cabecera del CSV son las columnas del JSON y los escenarios del CSV son los del JSON', () => {
    expect(leer(CSV).split('\n')[0]!.split(',')).toEqual(esc.columnas.map((c) => c.id));
    expect(new Set(csv.map((r) => r['escenario']))).toEqual(
      new Set(esc.escenarios!.map((e) => e.id)),
    );
  });

  it('la fila de 2025 se guarda una vez y es igual en los cinco escenarios del CSV', () => {
    const de2025 = csv.filter((r) => r['anio'] === '2025');
    expect(de2025).toHaveLength(esc.escenarios!.length);
    for (const r of de2025) {
      for (const c of esc.columnas) {
        if (c.id === 'escenario') continue;
        expect(r[c.id]).toBe(de2025[0]![c.id]);
      }
    }
    expect(esc.filaObservada!.anio).toBe(2025);
    for (const [col, valor] of Object.entries(esc.filaObservada!.valores)) {
      expect(valor).toBe(Number(de2025[0]![col]));
    }
    // La columna vacía del CSV en 2025 no consta, no se rellena.
    expect(de2025[0]!['financiacion_adicional']).toBe('');
    expect(esc.filaObservada!.valores).not.toHaveProperty('financiacion_adicional');
    expect(esc.filas.every((f) => f[1] !== 2025)).toBe(true);
  });
});

describe('escenarios', () => {
  const ids = esc.escenarios!.map((e) => e.id);

  it('son los cinco del LEEME, con sus valores de g y de IPC', () => {
    const leeme = leer(LEEME);
    const tabla = [
      ...leeme.matchAll(/^(base|g\d|ipc\d)\s*\|\s*([\d,]+) %\s*\|\s*([\d,]+) %\s*$/gm),
    ].map((m) => ({
      id: m[1]!,
      g: Number(m[2]!.replace(',', '.')) / 100,
      ipc: Number(m[3]!.replace(',', '.')) / 100,
    }));
    expect(esc.escenarios).toEqual(tabla);
    expect(ids).toEqual(['base', 'g0', 'g2', 'ipc1', 'ipc3']);
  });

  it('cada uno cambia solo g o el IPC respecto al base', () => {
    const b = esc.escenarios![0]!;
    for (const e of esc.escenarios!.slice(1)) {
      expect((e.g !== b.g ? 1 : 0) + (e.ipc !== b.ipc ? 1 : 0)).toBe(1);
    }
  });

  it('cada escenario tiene todos los años de 2026 al último, sin repeticiones', () => {
    const anios = filas.filter((f) => f['escenario'] === 'base').map((f) => n(f, 'anio'));
    expect(anios[0]).toBe(2026);
    anios.forEach((a, i) => {
      expect(a).toBe(2026 + i);
    });
    for (const id of ids) {
      expect(filas.filter((f) => f['escenario'] === id).map((f) => n(f, 'anio'))).toEqual(anios);
    }
  });

  it('el escenario base de 2026 en adelante coincide con m4-financiero.json (salvo el último bit de la coma flotante)', () => {
    const delBase = filas.filter((f) => f['escenario'] === 'base');
    expect(delBase).toHaveLength(base.length);
    delBase.forEach((f, i) => {
      for (const c of esc.columnas) {
        if (c.tipo === 'numero') cerca(n(f, c.id), n(base[i]!, c.id), 1e-12);
      }
    });
  });

  it('los parámetros comunes del LEEME constan, incluida la rentabilidad nominal del Fondo', () => {
    expect(
      esc.parametrosComunes!.some(
        (l) => /Fondo de Reserva/.test(l) && /rentabilidad nominal/.test(l),
      ),
    ).toBe(true);
  });

  it('en cada escenario, los saldos son aritmética entre columnas', () => {
    for (const f of filas) {
      cerca(
        n(f, 'saldo_cotizaciones_menos_pensiones'),
        n(f, 'cotizaciones') - n(f, 'gasto_pensiones'),
        1e-9,
      );
      cerca(
        n(f, 'saldo_sin_transferencias'),
        n(f, 'saldo_cotizaciones_menos_pensiones') - n(f, 'otros_gastos'),
        1e-9,
      );
      cerca(
        n(f, 'saldo_no_financiero'),
        n(f, 'saldo_sin_transferencias') + n(f, 'transferencias_y_otros'),
        1e-9,
      );
      cerca(
        n(f, 'gasto_pensiones_pct_pib'),
        (n(f, 'gasto_pensiones') / n(f, 'pib_proxy')) * 100,
        1e-9,
      );
    }
  });

  it('el MEI forma parte de las cotizaciones en todos los escenarios', () => {
    for (const f of filas) expect(n(f, 'cotizaciones')).toBeGreaterThanOrEqual(n(f, 'mei'));
  });

  it('la rentabilidad nominal implícita del Fondo es la misma en los cinco escenarios', () => {
    const inicial = esc.filaObservada!.valores['fondo_reserva']!;
    const tasas = ids.map((id) => {
      const del = filas.filter((f) => f['escenario'] === id);
      return del.map((f, i) => {
        const previo = i === 0 ? inicial : n(del[i - 1]!, 'fondo_reserva');
        return (
          (n(f, 'fondo_reserva') - previo - n(f, 'dotacion_fondo') + n(f, 'disposicion_fondo')) /
          previo
        );
      });
    });
    for (const t of tasas.flat()) cerca(t, tasas[0]![0]!, 1e-9);
    // El LEEME dice que es del dos por ciento nominal.
    const nominal = /rentabilidad nominal del ([\d,]+) %/.exec(esc.parametrosComunes!.join(' '));
    cerca(tasas[0]![0]!, Number(nominal![1]!.replace(',', '.')) / 100, 1e-9);
  });
});

describe('la fila observada de 2025 es la de los datos descargados', () => {
  const v = esc.filaObservada!.valores;
  const ejec = filasCsv(leer('data/sistema/presupuesto-ss-ejecucion.csv')).filter(
    (r) => r['periodo'] === '2025-T4' && r['columna'] === 'principal',
  );
  const importe = (tabla: string, concepto: string) =>
    Number(
      ejec.find((r) => r['tabla'] === tabla && r['concepto'] === concepto)![
        'derechos_u_obligaciones_meur'
      ],
    );

  it('gasto en pensiones, cotizaciones y MEI son los de la ejecución del presupuesto', () => {
    cerca(v['gasto_pensiones']!, importe('gastos-cap4', 'SUMA DE PENSIONES'), 1e-9);
    cerca(v['cotizaciones']!, importe('ingresos', '1. COTIZACIONES SOCIALES'), 1e-9);
    cerca(v['mei']!, importe('ingresos-cap1-cap4', 'MECANISMO DE EQUIDAD INTERGENERACIONAL'), 1e-9);
  });

  it('resto de gastos y transferencias son total no financiero menos pensiones y menos cotizaciones', () => {
    const gastos = importe('gastos', 'SUMA DE OPERACIONES NO FINANCIERAS');
    const ingresos = importe('ingresos', 'SUMA DE OPERACIONES NO FINANCIERAS');
    cerca(v['otros_gastos']!, gastos - v['gasto_pensiones']!, 1e-9);
    cerca(v['transferencias_y_otros']!, ingresos - v['cotizaciones']!, 1e-9);
    cerca(v['saldo_no_financiero']!, ingresos - gastos, 1e-9);
  });

  it('el Fondo, la dotación del MEI y el PIB son los de los ficheros de /data', () => {
    const fondo = filasCsv(leer('data/sistema/fondo-reserva-anual.csv')).find(
      (r) => r['anio'] === '2025',
    )!;
    expect(v['fondo_reserva']).toBe(Number(fondo['valor_fondo_meur']));
    expect(v['dotacion_fondo']).toBe(Number(fondo['dotaciones_mei_anuales_meur']));
    expect(v['disposicion_fondo']).toBe(0);
    const pib = JSON.parse(leer('data/macro/pib-ine.json')) as {
      series: { id: string; points: { period: string; value: number }[] }[];
    };
    const p2025 = pib.series
      .find((s) => s.id === 'pib-corriente')!
      .points.find((p) => p.period === '2025')!;
    cerca(v['pib_proxy']!, p2025.value, 1e-9);
  });

  it('el número de pensiones y la pensión media son los de primero de diciembre de 2025', () => {
    const num = JSON.parse(leer('data/sistema/pensiones-vigor-numero.json')) as {
      series: { id: string; points: { period: string; value: number }[] }[];
    };
    const media = JSON.parse(leer('data/sistema/pensiones-vigor-pension-media.json')) as typeof num;
    const dato = (a: typeof num, id: string) =>
      a.series.find((s) => s.id === id)!.points.find((p) => p.period === '2025')!.value;
    expect(v['pensiones_oct']).toBe(dato(num, 'total-ambos'));
    cerca(v['pension_media_total']!, dato(media, 'total-ambos'), 1e-5);
  });
});
