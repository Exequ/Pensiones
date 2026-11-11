// @vitest-environment node
/**
 * Tests de coherencia de los datos reales de /data.
 * Cargan los ficheros y comprueban reglas que el esquema no puede expresar.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ArchivoCronologia,
  ArchivoDatos,
  ArchivoPrestaciones,
  type DatoConId,
} from '../src/engine/esquema-datos.ts';
import { aEurosConstantes, serieIPCDesdeArchivo } from '../src/engine/euros-constantes.ts';

const DATA = path.resolve(import.meta.dirname, '../data');

function leer(relativo: string): unknown {
  return JSON.parse(readFileSync(path.join(DATA, relativo), 'utf8')) as unknown;
}

const PARAMETROS = readdirSync(path.join(DATA, 'parametros'))
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => ({ fichero: f, archivo: ArchivoDatos.parse(leer(`parametros/${f}`)) }));

const porId = new Map(PARAMETROS.map(({ archivo }) => [archivo.id, archivo]));

function valoresPorAnio(id: string): Map<string, DatoConId> {
  const archivo = porId.get(id);
  return new Map((archivo?.data ?? []).map((d) => [d.period, d]));
}

function numero(dato: DatoConId): number {
  if (typeof dato.value !== 'number') throw new Error(`${dato.id}: valor no numérico`);
  return dato.value;
}

describe('series anuales de /data/parametros', () => {
  it('hay series de parámetros', () => {
    expect(PARAMETROS.length).toBeGreaterThan(0);
  });

  for (const { fichero, archivo } of PARAMETROS) {
    it(`${fichero}: un dato por año, ordenados y sin huecos`, () => {
      const anios = (archivo.data ?? []).map((d) => d.period);
      expect(anios.length).toBeGreaterThan(0);
      for (const anio of anios) expect(anio).toMatch(/^\d{4}$/);
      const numeros = anios.map(Number);
      for (let i = 1; i < numeros.length; i++) {
        expect(numeros[i], `${fichero}: hueco o desorden tras ${numeros[i - 1]}`).toBe(
          (numeros[i - 1] ?? 0) + 1,
        );
      }
    });

    it(`${fichero}: todos los datos numéricos tienen fuente con URL y fecha de descarga`, () => {
      for (const dato of archivo.data ?? []) {
        expect(dato.source.url).toMatch(/^https?:\/\//);
        expect(dato.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
      }
    });

    it(`${fichero}: una sola unidad en toda la serie`, () => {
      expect(new Set((archivo.data ?? []).map((d) => d.unit)).size).toBe(1);
    });

    it(`${fichero}: los porcentajes están en rango`, () => {
      const esVariacion = archivo.id.includes('variacion');
      for (const dato of archivo.data ?? []) {
        if (dato.unit !== '%' || typeof dato.value !== 'number') continue;
        expect(dato.value, `${fichero} ${dato.period}`).toBeLessThanOrEqual(100);
        expect(dato.value, `${fichero} ${dato.period}`).toBeGreaterThanOrEqual(
          esVariacion ? -100 : 0,
        );
      }
    });
  }

  it('la pensión máxima supera a todas las pensiones mínimas cada año', () => {
    const maxima = valoresPorAnio('pension-maxima');
    const minimas = PARAMETROS.filter(({ archivo }) => archivo.id.startsWith('pension-minima-'));
    let comparaciones = 0;
    for (const { archivo } of minimas) {
      for (const minima of archivo.data ?? []) {
        const max = maxima.get(minima.period);
        if (!max) continue;
        expect(max.unit).toBe(minima.unit);
        expect(numero(max), `${archivo.id} ${minima.period}`).toBeGreaterThan(numero(minima));
        comparaciones++;
      }
    }
    if (porId.has('pension-maxima') && minimas.length > 0) {
      expect(comparaciones).toBeGreaterThan(0);
    }
  });

  it('la base máxima de cotización supera a la mínima cada año', () => {
    const maxima = valoresPorAnio('base-maxima-rg');
    const minima = valoresPorAnio('base-minima-rg');
    for (const [anio, min] of minima) {
      const max = maxima.get(anio);
      if (!max) continue;
      expect(numero(max), anio).toBeGreaterThan(numero(min));
    }
  });

  it('la edad ordinaria nunca es inferior a 65 años ni a la de la serie anterior', () => {
    const edades = [...valoresPorAnio('edad-ordinaria-jubilacion').values()].map(numero);
    for (const [i, edad] of edades.entries()) {
      expect(edad).toBeGreaterThanOrEqual(65 * 12);
      if (i > 0) expect(edad).toBeGreaterThanOrEqual(edades[i - 1] ?? 0);
    }
  });

  it('la serie de IPC alimenta la conversión a euros constantes', () => {
    const ipc = porId.get('ipc-indice-medio-anual');
    expect(ipc).toBeDefined();
    const serie = serieIPCDesdeArchivo(ipc!);
    const primero = serie.puntos[0]!;
    const ultimo = serie.puntos[serie.puntos.length - 1]!;
    const convertido = aEurosConstantes(100, primero.anio, ultimo.anio, serie);
    expect(convertido).toBeCloseTo((100 * ultimo.indice) / primero.indice, 9);
    expect(convertido).toBeGreaterThan(100);
  });
});

describe('normativa', () => {
  const ficheros = readdirSync(path.join(DATA, 'normativa')).filter((f) => f.endsWith('.json'));

  it('cada norma de la cronología tiene ID BOE y URL del BOE coherentes', () => {
    if (!ficheros.includes('cronologia.json')) return;
    const cronologia = ArchivoCronologia.parse(leer('normativa/cronologia.json'));
    for (const norma of cronologia.normas) {
      expect(norma.boeId, norma.id).toMatch(/^BOE-A-\d{4}-\d+$/);
      expect(norma.source.url, norma.id).toMatch(/^https:\/\/www\.boe\.es\//);
      expect(norma.source.url, norma.id).toContain(norma.boeId);
      expect(norma.fechaPublicacion >= norma.fecha, norma.id).toBe(true);
    }
    const fechas = cronologia.normas.map((n) => n.fecha);
    expect([...fechas].sort()).toEqual(fechas);
  });

  it('cada prestación cita artículos y fuente', () => {
    if (!ficheros.includes('prestaciones.json')) return;
    const prestaciones = ArchivoPrestaciones.parse(leer('normativa/prestaciones.json'));
    const ids = prestaciones.prestaciones.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const prestacion of prestaciones.prestaciones) {
      expect(prestacion.articulos.length, prestacion.id).toBeGreaterThan(0);
      expect(prestacion.source.url, prestacion.id).toMatch(/^https?:\/\//);
    }
  });
});
