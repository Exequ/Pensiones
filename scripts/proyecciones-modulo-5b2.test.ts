/**
 * Fase 5-B2: garantías sobre el bloque «Sistema financiero (M4)» de la página «Proyecciones».
 *  1. Los ficheros de /data que lee tienen fuente, fecha de descarga y confianza; la salida de M4
 *     lleva además la naturaleza «proyección de modelo».
 *  2. Solo `datos-financiero.ts` los importa y lo hace con exactamente la lista declarada.
 *  3. El bloque se carga bajo demanda: ningún módulo de la página lo importa de forma estática.
 *  4. Ningún texto visible lleva cifras escritas a mano (regla a de CLAUDE.md).
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ArchivoDatos, ArchivoProyeccion, ArchivoTabla } from '../src/engine/esquema-datos.ts';
import {
  FICHEROS_FINANCIERO,
  FICHEROS_FINANCIERO_CONTRASTE,
  FICHEROS_FINANCIERO_MODELO,
} from '../src/modules/proyecciones/ficheros.ts';
import { textosConCifras } from './lib/textos-con-cifras.ts';

const RAIZ = path.resolve(import.meta.dirname, '..');
const leer = (ruta: string) => readFileSync(path.join(RAIZ, ruta), 'utf8');
const DIR = 'src/modules/proyecciones';
const confianzas = ['alta', 'media', 'baja'];

describe('procedencia de los ficheros del bloque financiero', () => {
  it.each(FICHEROS_FINANCIERO_MODELO)(
    '%s es una proyección de modelo con su procedencia',
    (ruta) => {
      const a = ArchivoProyeccion.parse(JSON.parse(leer(ruta)));
      expect(a.source.url).toMatch(/^https:\/\/github\.com\//);
      expect(a.fetchedAt).toBeTruthy();
      expect(confianzas).toContain(a.confidence);
      expect(a.naturaleza).toBe('proyeccion-de-modelo');
      expect(a.origen.sha256).toMatch(/^[0-9a-f]{64}$/);
    },
  );

  it.each(FICHEROS_FINANCIERO_CONTRASTE)(
    '%s tiene fuente, fecha de descarga y confianza',
    (ruta) => {
      const json: unknown = JSON.parse(leer(ruta));
      if ((json as { tipo?: string }).tipo === 'tabla') {
        const t = ArchivoTabla.parse(json);
        expect(t.source.url).toMatch(/^https?:\/\//);
        expect(t.fetchedAt).toBeTruthy();
        expect(confianzas).toContain(t.confidence);
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
    },
  );
});

const fuentesDe = (dir: string): string[] =>
  readdirSync(path.join(RAIZ, dir))
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
    .map((f) => `${dir}/${f}`);

describe('el bloque financiero lee /data solo a través de datos-financiero.ts', () => {
  const importesDeData = (ruta: string) =>
    [...leer(ruta).matchAll(/from\s+'([^']*\/data\/[^']+)'/g)].map((m) => m[1]!);

  it('datos-financiero.ts importa exactamente los ficheros que declara', () => {
    const importados = importesDeData(`${DIR}/datos-financiero.ts`)
      .map((r) =>
        r
          .replace(/^(\.\.\/)+/, '')
          .replace(/\?raw$/, '')
          .replace(/\.csv$/, '.json'),
      )
      .sort();
    expect([...new Set(importados)]).toEqual([...FICHEROS_FINANCIERO].sort());
  });

  it('ningún otro módulo de la página importa /data salvo datos-proyecciones.ts', () => {
    for (const ruta of fuentesDe(DIR)) {
      if (ruta.endsWith('/datos-proyecciones.ts') || ruta.endsWith('/datos-financiero.ts'))
        continue;
      expect(importesDeData(ruta), ruta).toEqual([]);
    }
  });
});

describe('carga diferida del bloque financiero', () => {
  it('Pagina.tsx lo importa con lazy y ningún módulo lo importa de forma estática', () => {
    expect(leer(`${DIR}/Pagina.tsx`)).toMatch(/lazy\(\(\) => import\('\.\/Financiero'\)\)/);
    for (const ruta of fuentesDe(DIR)) {
      const texto = leer(ruta);
      expect(texto, ruta).not.toMatch(/^import[^;]*from\s+'\.\/Financiero'/m);
    }
  });

  it('los bloques de M1 a M3 no importan el módulo de datos financiero (no crece su trozo)', () => {
    for (const nombre of [
      'Demografia.tsx',
      'Pensiones.tsx',
      'Cotizantes.tsx',
      'Introduccion.tsx',
    ]) {
      expect(leer(`${DIR}/${nombre}`), nombre).not.toMatch(/datos-financiero|series-financiero/);
    }
  });
});

describe('sin cifras escritas a mano en los textos del bloque financiero', () => {
  const ficheros = fuentesDe(DIR).filter(
    (r) => /\/Financiero[A-Za-z]*\.tsx$/.test(r) || r.endsWith('/series-financiero.ts'),
  );

  it('hay ficheros que revisar', () => {
    expect(ficheros.length).toBeGreaterThanOrEqual(7);
  });

  it.each(ficheros)('%s', (ruta) => {
    expect(textosConCifras(ruta)).toEqual([]);
  });
});
