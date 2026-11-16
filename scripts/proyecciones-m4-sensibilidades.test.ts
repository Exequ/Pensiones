/**
 * Ajustes de M4 (sensibilidades): salida de los diez casos en data/proyecciones/m4-sensibilidades.json.
 *  1. Procedencia: fuente, fecha, confianza, naturaleza, huella SHA-256 del CSV, commit del script y
 *     el campo `reproduccionLocalPorAutor` (falso: el autor no ha reproducido los casos en local).
 *  2. El JSON reproduce el CSV (filas calculadas y fila observada de 2025, que no se repite).
 *  3. Los casos y sus parámetros son los del LEEME, en su orden, sin escribirlos a mano.
 *  4. La fila de 2025 es igual en los diez casos y a la del escenario base de m4-escenarios.
 *  5. Aritmética entre columnas de cada caso.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ArchivoProyeccion } from '../src/engine/esquema-datos.ts';
import { filasCsv } from '../src/engine/series-historicas.ts';
import { validarContenido } from './lib/validar-datos.ts';
import { valoracionesEn } from './lib/valoraciones.ts';
import { casosDelLeeme } from './verificacion-m4-sensibilidades.ts';

const RAIZ = path.resolve(import.meta.dirname, '..');
const leer = (ruta: string) => readFileSync(path.join(RAIZ, ruta), 'utf8');
type Fila = Record<string, string | number>;

const RUTA = 'data/proyecciones/m4-sensibilidades.json';
const CSV = 'data-raw/modelos-salidas/m4/m4_sensibilidades.csv';
const LEEME = 'data-raw/modelos-salidas/m4/LEEME_m4_sensibilidades.txt';
const bruto: unknown = JSON.parse(leer(RUTA));
const sens = ArchivoProyeccion.parse(bruto);
const filasDe = (a: ArchivoProyeccion): Fila[] =>
  a.filas.map((fila) => {
    const o: Fila = {};
    a.columnas.forEach((c, j) => {
      o[c.id] = fila[j]!;
    });
    return o;
  });
const filas = filasDe(sens);
const n = (f: Fila, k: string): number => f[k] as number;
const cerca = (a: number, b: number, tolerancia = 1e-9): void => {
  expect(Math.abs(a - b)).toBeLessThanOrEqual(tolerancia * Math.max(1, Math.abs(a), Math.abs(b)));
};

describe('procedencia de data/proyecciones/m4-sensibilidades.json', () => {
  it('esquema de /data, fuente en GitHub, fecha, confianza y naturaleza', () => {
    expect(validarContenido(bruto, RUTA)).toEqual([]);
    expect(sens.id).toBe('m4-sensibilidades');
    expect(sens.naturaleza).toBe('proyeccion-de-modelo');
    expect(sens.source.url).toMatch(
      /^https:\/\/github\.com\/Exequ\/Pensiones\/blob\/[0-9a-f]{40}\/modelos\/m4\/m4_sensibilidades\.py$/,
    );
    expect(sens.source.url).toContain(sens.origen.commitModelos);
    expect(sens.fetchedAt).toBe(sens.origen.ejecutadoEl);
    expect(['alta', 'media', 'baja']).toContain(sens.confidence);
    expect(sens.origen.leeme).toBe(LEEME);
    expect(sens.origen.csv).toBe(CSV);
  });

  it('la fecha de ejecución es la del LEEME de las sensibilidades', () => {
    const fecha = /^Fecha: (\d{4}-\d{2}-\d{2})/m.exec(leer(LEEME))![1]!;
    expect(sens.origen.ejecutadoEl).toBe(fecha);
  });

  it('la huella SHA-256 es la del CSV', () => {
    expect(sens.origen.sha256).toBe(
      createHash('sha256')
        .update(readFileSync(path.join(RAIZ, CSV)))
        .digest('hex'),
    );
  });

  it('la huella SHA-256 del LEEME es la del fichero', () => {
    expect(sens.origen.leemeSha256).toBe(
      createHash('sha256')
        .update(readFileSync(path.join(RAIZ, LEEME)))
        .digest('hex'),
    );
  });

  it('la reproducción local por el autor consta como falsa', () => {
    expect(sens.reproduccionLocalPorAutor).toBe(false);
  });

  it('las notas dicen que no las ejecutó el autor en local', () => {
    expect(sens.notes).toMatch(/no Sergio en local/);
    expect(sens.notes).toMatch(/reproduccionLocalPorAutor/);
  });

  it('el escenario de los metadatos es el base (g e IPC) y no es una previsión', () => {
    expect(sens.escenario.g).toBe(0.01);
    expect(sens.escenario.ipc).toBe(0.02);
    expect(sens.description).toMatch(/no es una previsión/);
  });
});

describe('el JSON reproduce el CSV de las sensibilidades', () => {
  const csv = filasCsv(leer(CSV));
  const calculadas = csv.filter((r) => r['anio'] !== '2025');

  it('la cabecera del CSV son las columnas del JSON', () => {
    expect(leer(CSV).split('\n')[0]!.split(',')).toEqual(sens.columnas.map((c) => c.id));
  });

  it('las filas calculadas son las del CSV, en el orden de los casos del LEEME y por año', () => {
    expect(filas).toHaveLength(calculadas.length);
    const orden = sens.sensibilidades!.map((e) => e.id);
    const esperado = [...calculadas].sort(
      (a, b) =>
        orden.indexOf(a['escenario']!) - orden.indexOf(b['escenario']!) ||
        Number(a['anio']) - Number(b['anio']),
    );
    esperado.forEach((r, i) => {
      expect(filas[i]!['escenario']).toBe(r['escenario']);
      for (const c of sens.columnas) {
        if (c.tipo === 'numero') expect(n(filas[i]!, c.id)).toBe(Number(r[c.id]));
      }
    });
  });

  it('la fila de 2025 se guarda una vez y es igual en los diez casos del CSV', () => {
    const de2025 = csv.filter((r) => r['anio'] === '2025');
    expect(de2025).toHaveLength(sens.sensibilidades!.length);
    for (const r of de2025) {
      for (const c of sens.columnas) {
        if (c.id === 'escenario') continue;
        expect(r[c.id]).toBe(de2025[0]![c.id]);
      }
    }
    expect(sens.filaObservada!.anio).toBe(2025);
    for (const [col, valor] of Object.entries(sens.filaObservada!.valores)) {
      expect(valor).toBe(Number(de2025[0]![col]));
    }
    expect(sens.filaObservada!.valores).not.toHaveProperty('financiacion_adicional');
    expect(sens.filas.every((f) => f[1] !== 2025)).toBe(true);
  });

  it('la fila de 2025 es la del escenario base de m4-escenarios.json', () => {
    const esc = ArchivoProyeccion.parse(JSON.parse(leer('data/proyecciones/m4-escenarios.json')));
    expect(sens.filaObservada!.valores).toEqual(esc.filaObservada!.valores);
  });
});

describe('casos de sensibilidad', () => {
  const ids = sens.sensibilidades!.map((e) => e.id);

  it('son los del LEEME, en su orden y con su parámetro literal', () => {
    expect(sens.sensibilidades).toEqual(casosDelLeeme(leer(LEEME)));
    expect(ids).toHaveLength(10);
  });

  it('los casos del CSV son los del JSON', () => {
    expect(new Set(filas.map((f) => f['escenario']))).toEqual(new Set(ids));
  });

  it('cada caso tiene todos los años de 2026 al último, sin repeticiones', () => {
    const anios = filas.filter((f) => f['escenario'] === ids[0]).map((f) => n(f, 'anio'));
    expect(anios[0]).toBe(2026);
    anios.forEach((a, i) => {
      expect(a).toBe(2026 + i);
    });
    for (const id of ids) {
      expect(filas.filter((f) => f['escenario'] === id).map((f) => n(f, 'anio'))).toEqual(anios);
    }
  });

  it('el escenario base común consta con el texto del LEEME', () => {
    expect(sens.parametrosComunes).toHaveLength(1);
    expect(sens.parametrosComunes![0]).toMatch(
      /^Cada caso cambia UNA palanca respecto al escenario base/,
    );
  });

  it('en cada caso, los saldos y los porcentajes son aritmética entre columnas', () => {
    for (const f of filas) {
      cerca(
        n(f, 'saldo_cotizaciones_menos_pensiones'),
        n(f, 'cotizaciones') - n(f, 'gasto_pensiones'),
      );
      cerca(
        n(f, 'saldo_sin_transferencias'),
        n(f, 'saldo_cotizaciones_menos_pensiones') - n(f, 'otros_gastos'),
      );
      cerca(
        n(f, 'saldo_no_financiero'),
        n(f, 'saldo_sin_transferencias') + n(f, 'transferencias_y_otros'),
      );
      cerca(n(f, 'gasto_pensiones_pct_pib'), (n(f, 'gasto_pensiones') / n(f, 'pib_proxy')) * 100);
      cerca(
        n(f, 'saldo_no_financiero_pct_pib'),
        (n(f, 'saldo_no_financiero') / n(f, 'pib_proxy')) * 100,
      );
      expect(n(f, 'cotizaciones')).toBeGreaterThanOrEqual(n(f, 'mei'));
    }
  });
});

describe('esquema y neutralidad de los metadatos', () => {
  const copia = (): Record<string, unknown> =>
    JSON.parse(JSON.stringify(bruto)) as Record<string, unknown>;

  it('el esquema rechaza una fila de un caso que no figura en «sensibilidades»', () => {
    const roto = copia();
    (roto['filas'] as (string | number)[][])[0]![0] = 'inventado';
    expect(ArchivoProyeccion.safeParse(roto).success).toBe(false);
  });

  it('el esquema rechaza casos repetidos y un fichero con escenarios y sensibilidades a la vez', () => {
    const repetido = copia();
    const lista = repetido['sensibilidades'] as { id: string; parametro: string }[];
    lista[1] = { ...lista[1]!, id: lista[0]!.id };
    expect(ArchivoProyeccion.safeParse(repetido).success).toBe(false);

    const ambos = copia();
    ambos['escenarios'] = [
      { id: 'a', g: 0, ipc: 0 },
      { id: 'b', g: 0, ipc: 0 },
    ];
    expect(ArchivoProyeccion.safeParse(ambos).success).toBe(false);
  });

  it('el campo de reproducción local debe ser un booleano', () => {
    const roto = copia();
    roto['reproduccionLocalPorAutor'] = 'no';
    expect(ArchivoProyeccion.safeParse(roto).success).toBe(false);
  });

  it('los textos que añade el ETL no llevan palabras de valoración', () => {
    const textos = [
      sens.title,
      sens.description,
      sens.notes ?? '',
      sens.escenario.aplicacion,
      ...sens.sensibilidades!.map((c) => c.parametro),
      ...sens.parametrosComunes!,
      ...sens.filaObservada!.descripcion,
    ].join(' ');
    expect(valoracionesEn(textos)).toEqual([]);
  });
});
