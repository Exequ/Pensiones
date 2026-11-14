/**
 * Fase 5-C: garantías sobre las páginas «Otros sistemas» y «Tipos de pensión».
 *  1. Los ficheros de /data que usan tienen source.url, fetchedAt y confidence (también cada dato).
 *  2. Solo leen /data a través de su módulo `datos-*.ts`, y este importa exactamente los ficheros
 *     que declara.
 *  3. Ningún texto visible lleva cifras escritas a mano (regla a de CLAUDE.md).
 *  4. Los textos de las dos páginas y de las dos secciones no usan palabras de valoración.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ArchivoDatos, ArchivoPrestaciones, ArchivoTabla } from '../src/engine/esquema-datos.ts';
import { FICHEROS_OTROS_SISTEMAS } from '../src/modules/otros-sistemas/ficheros.ts';
import { buscarSeccion } from '../src/modules/secciones.ts';
import { FICHEROS_TIPOS_DE_PENSION } from '../src/modules/tipos-de-pension/ficheros.ts';
import { textosConCifras } from './lib/textos-con-cifras.ts';
import { valoracionesEn } from './lib/valoraciones.ts';

const RAIZ = path.resolve(import.meta.dirname, '..');
const leer = (ruta: string) => readFileSync(path.join(RAIZ, ruta), 'utf8');
const confianzas = ['alta', 'media', 'baja'];

const MODULOS = [
  {
    dir: 'src/modules/otros-sistemas',
    datos: 'datos-sistemas.ts',
    ficheros: FICHEROS_OTROS_SISTEMAS,
    slug: 'otros-sistemas',
  },
  {
    dir: 'src/modules/tipos-de-pension',
    datos: 'datos-tipos.ts',
    ficheros: FICHEROS_TIPOS_DE_PENSION,
    slug: 'tipos-de-pension',
  },
] as const;

const TODOS = [...new Set([...FICHEROS_OTROS_SISTEMAS, ...FICHEROS_TIPOS_DE_PENSION])];

describe('procedencia de los ficheros que usan las páginas de la Fase 5-C', () => {
  it.each(TODOS)('%s tiene fuente, fecha de descarga y confianza en cada dato', (ruta) => {
    const json: unknown = JSON.parse(leer(ruta));
    const tipo = (json as { tipo?: string }).tipo;
    if (tipo === 'tabla') {
      const t = ArchivoTabla.parse(json);
      expect(t.source.url).toMatch(/^https?:\/\//);
      expect(t.fetchedAt).toBeTruthy();
      expect(confianzas).toContain(t.confidence);
      expect(existsSync(path.join(RAIZ, ruta.replace(/\.json$/, '.csv')))).toBe(true);
    } else if (tipo === 'prestaciones') {
      const a = ArchivoPrestaciones.parse(json);
      expect(a.prestaciones.length).toBeGreaterThan(0);
      for (const p of a.prestaciones) {
        expect(p.source.url, p.id).toMatch(/^https?:\/\//);
        expect(p.fetchedAt, p.id).toBeTruthy();
        expect(confianzas, p.id).toContain(p.confidence);
      }
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

function fuentesDe(dir: string): string[] {
  return readdirSync(path.join(RAIZ, dir))
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
    .map((f) => `${dir}/${f}`);
}

const importesDeData = (ruta: string) =>
  [...leer(ruta).matchAll(/from\s+'([^']*\/data\/[^']+)'/g)].map((m) => m[1]!);

describe.each(MODULOS)('módulo $dir', ({ dir, datos, ficheros, slug }) => {
  it('solo el módulo de datos importa ficheros de /data', () => {
    for (const ruta of fuentesDe(dir)) {
      if (ruta.endsWith(`/${datos}`)) continue;
      expect(importesDeData(ruta), ruta).toEqual([]);
    }
  });

  it('el módulo de datos importa exactamente los ficheros que declara', () => {
    const importados = importesDeData(`${dir}/${datos}`)
      .map((r) =>
        r
          .replace(/^(\.\.\/)+/, '')
          .replace(/\?raw$/, '')
          .replace(/\.csv$/, '.json'),
      )
      .sort();
    expect([...new Set(importados)]).toEqual([...ficheros].sort());
  });

  describe('sin cifras escritas a mano en los textos', () => {
    // `datos-*.ts`, `ficheros.ts` e `ids-datos.ts` solo contienen rutas e identificadores de /data;
    // `paises.ts`, los nombres y códigos de las áreas («UE-27» es la denominación del agregado).
    const ficherosTexto = fuentesDe(dir).filter(
      (r) =>
        !r.endsWith(`/${datos}`) &&
        !r.endsWith('/ficheros.ts') &&
        !r.endsWith('/ids-datos.ts') &&
        !r.endsWith('/paises.ts'),
    );
    it('hay ficheros que revisar', () => {
      expect(ficherosTexto.length).toBeGreaterThan(2);
    });
    it.each(ficherosTexto)('%s', (ruta) => {
      expect(textosConCifras(ruta)).toEqual([]);
    });
  });

  it('el resumen y lo previsto de la sección no tienen cifras ni valoraciones', () => {
    const s = buscarSeccion(slug);
    const texto = [s.resumen, ...s.previsto].join('\n');
    expect(texto).not.toMatch(/\d/);
    expect(valoracionesEn(texto)).toEqual([]);
  });
});
