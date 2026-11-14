/**
 * Fase 5-B1: garantías sobre la página «Proyecciones».
 *  1. Los ficheros de /data que usa tienen fuente, fecha de descarga y confianza (y, las salidas de los
 *     modelos, naturaleza «proyección de modelo»).
 *  2. Solo `datos-proyecciones.ts` importa /data y lo hace con exactamente la lista declarada.
 *  3. Ningún texto visible lleva cifras escritas a mano (regla a de CLAUDE.md).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ArchivoDatos, ArchivoProyeccion, ArchivoTabla } from '../src/engine/esquema-datos.ts';
import {
  FICHEROS_CONTRASTE,
  FICHEROS_MODELOS,
  FICHEROS_PROYECCIONES,
} from '../src/modules/proyecciones/ficheros.ts';
import { textosConCifras } from './lib/textos-con-cifras.ts';

const RAIZ = path.resolve(import.meta.dirname, '..');
const leer = (ruta: string) => readFileSync(path.join(RAIZ, ruta), 'utf8');
const DIR = 'src/modules/proyecciones';
const confianzas = ['alta', 'media', 'baja'];

describe('procedencia de los ficheros que usa la página «Proyecciones»', () => {
  it.each(FICHEROS_MODELOS)('%s es una proyección de modelo con su procedencia', (ruta) => {
    const a = ArchivoProyeccion.parse(JSON.parse(leer(ruta)));
    expect(a.source.url).toMatch(/^https:\/\/github\.com\//);
    expect(a.fetchedAt).toBeTruthy();
    expect(confianzas).toContain(a.confidence);
    expect(a.naturaleza).toBe('proyeccion-de-modelo');
    expect(a.origen.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it.each(FICHEROS_CONTRASTE)('%s tiene fuente, fecha de descarga y confianza', (ruta) => {
    const json: unknown = JSON.parse(leer(ruta));
    if ((json as { tipo?: string }).tipo === 'tabla') {
      const t = ArchivoTabla.parse(json);
      expect(t.source.url).toMatch(/^https?:\/\//);
      expect(t.fetchedAt).toBeTruthy();
      expect(confianzas).toContain(t.confidence);
      expect(existsSync(path.join(RAIZ, ruta.replace(/\.json$/, '.csv')))).toBe(true);
    } else {
      const a = ArchivoDatos.parse(json);
      const elementos = [...(a.series ?? []), ...(a.data ?? [])];
      expect(elementos.length).toBeGreaterThan(0);
      for (const e of elementos) {
        expect(e.source.url, e.id).toMatch(/^https?:\/\//);
        expect(e.fetchedAt, e.id).toBeTruthy();
        expect(confianzas, e.id).toContain(e.confidence);
      }
    }
  });
});

const fuentesDe = (dir: string): string[] =>
  readdirSync(path.join(RAIZ, dir))
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
    .map((f) => `${dir}/${f}`);

describe('la página lee /data solo a través de datos-proyecciones.ts', () => {
  const importesDeData = (ruta: string) =>
    [...leer(ruta).matchAll(/from\s+'([^']*\/data\/[^']+)'/g)].map((m) => m[1]!);

  it('ningún otro módulo de la página importa /data directamente', () => {
    for (const ruta of fuentesDe(DIR)) {
      // El bloque financiero (fase 5-B2) tiene su propio módulo de datos, comprobado en proyecciones-modulo-5b2.test.ts.
      if (ruta.endsWith('/datos-proyecciones.ts') || ruta.endsWith('/datos-financiero.ts'))
        continue;
      expect(importesDeData(ruta), ruta).toEqual([]);
    }
  });

  it('datos-proyecciones.ts importa exactamente los ficheros que declara', () => {
    const importados = importesDeData(`${DIR}/datos-proyecciones.ts`)
      .map((r) =>
        r
          .replace(/^(\.\.\/)+/, '')
          .replace(/\?raw$/, '')
          .replace(/\.csv$/, '.json'),
      )
      .sort();
    expect([...new Set(importados)]).toEqual([...FICHEROS_PROYECCIONES].sort());
  });

  it('los bloques de M1 a M3 siguen sin leer M4 ni nada del Fondo de Reserva (son de la fase 5-B1)', () => {
    for (const nombre of [
      'Demografia.tsx',
      'Pensiones.tsx',
      'Cotizantes.tsx',
      'Introduccion.tsx',
      'datos-proyecciones.ts',
    ]) {
      expect(leer(`${DIR}/${nombre}`), nombre).not.toMatch(/m4-|fondo-reserva|datos-financiero/);
    }
  });
});

describe('sin cifras escritas a mano en los textos de la página «Proyecciones»', () => {
  // Identificadores de /data, rutas y patrones de dibujo: sin textos visibles.
  const EXCLUIDOS = [
    'datos-proyecciones.ts',
    'datos-financiero.ts',
    'ficheros.ts',
    'ids-datos.ts',
    'ids-financiero.ts',
    'grafico-trazos.ts',
  ];
  const ficheros = fuentesDe(DIR).filter((r) => !EXCLUIDOS.some((e) => r.endsWith(`/${e}`)));

  it('hay ficheros que revisar', () => {
    expect(ficheros.length).toBeGreaterThanOrEqual(9);
  });

  it.each(ficheros)('%s', (ruta) => {
    expect(textosConCifras(ruta)).toEqual([]);
  });

  it('los textos de secciones.ts no llevan dígitos (también el de la sección nueva)', () => {
    expect(textosConCifras('src/modules/secciones.ts')).toEqual([]);
  });
});
