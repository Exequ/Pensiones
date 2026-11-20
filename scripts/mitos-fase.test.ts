/**
 * Fase «Mitos y realidades»: garantías sobre la página.
 *  1. Los ficheros de /data que importa `datos-mitos.ts` tienen source.url, fetchedAt y confianza, y el
 *     módulo importa exactamente los que declara; el resto de la página solo lee /data a través de los
 *     cargadores de datos.
 *  2. Ningún texto visible de la página lleva cifras escritas a mano (regla a de CLAUDE.md), ni
 *     tampoco la entrada de la sección en `secciones.ts`.
 *  3. Cada afirmación del catálogo tiene su tarjeta y las referencias del catálogo apuntan a ficheros
 *     y series que existen.
 *  4. Los términos de veredicto no aparecen en los textos del catálogo ni en los datos que muestra
 *     la página (título, notas y citas de los ficheros).
 *  5. `claims-web.json` registra las afirmaciones de la página con su revisión actuarial.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ArchivoDatos, ArchivoMitos } from '../src/engine/esquema-datos.ts';
import { FICHEROS_MITOS } from '../src/modules/mitos-y-realidades/ficheros.ts';
import { SECCIONES } from '../src/modules/secciones.ts';
import { textosConCifras } from './lib/textos-con-cifras.ts';
import { valoracionesEn, veredictosEn } from './lib/valoraciones.ts';

const RAIZ = path.resolve(import.meta.dirname, '..');
const leer = (ruta: string) => readFileSync(path.join(RAIZ, ruta), 'utf8');
const DIR = 'src/modules/mitos-y-realidades';
const confianzas = ['alta', 'media', 'baja'];

const fuentesDe = readdirSync(path.join(RAIZ, DIR))
  .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
  .map((f) => `${DIR}/${f}`);

describe('procedencia de los ficheros que usa la página', () => {
  const sinCatalogo = FICHEROS_MITOS.filter((f) => !f.startsWith('data/mitos/'));
  it.each(sinCatalogo)('%s tiene fuente, fecha de descarga y confianza en cada dato', (ruta) => {
    const a = ArchivoDatos.parse(JSON.parse(leer(ruta)));
    const elementos = [...(a.series ?? []), ...(a.data ?? [])];
    expect(elementos.length).toBeGreaterThan(0);
    for (const e of elementos) {
      expect(e.source.url, e.id).toMatch(/^https?:\/\//);
      expect(e.fetchedAt, e.id).toBeTruthy();
      expect(confianzas, e.id).toContain(e.confidence);
    }
  });

  it('el catálogo de afirmaciones se valida con su esquema', () => {
    expect(
      ArchivoMitos.parse(JSON.parse(leer('data/mitos/afirmaciones-circulantes.json'))).mitos,
    ).toHaveLength(12);
  });

  const importesDeData = (ruta: string) =>
    [...leer(ruta).matchAll(/from\s+'([^']*\/data\/[^']+)'/g)].map((m) => m[1]!);

  it('ningún componente de la página importa /data directamente', () => {
    for (const ruta of fuentesDe) {
      if (ruta.endsWith('/datos-mitos.ts')) continue;
      expect(importesDeData(ruta), ruta).toEqual([]);
    }
  });

  it('datos-mitos.ts importa exactamente los ficheros que declara', () => {
    const importados = importesDeData(`${DIR}/datos-mitos.ts`)
      .map((r) => r.replace(/^(\.\.\/)+/, '').replace(/\?raw$/, ''))
      .sort();
    expect([...new Set(importados)]).toEqual([...FICHEROS_MITOS].sort());
  });
});

describe('sin cifras escritas a mano en los textos de la página', () => {
  // `datos-mitos.ts`, `ficheros.ts` e `ids-datos.ts` solo contienen rutas e identificadores de /data
  // (algunos llevan un año o un código con cifras en el nombre).
  const ficheros = fuentesDe.filter(
    (r) =>
      !r.endsWith('/datos-mitos.ts') && !r.endsWith('/ficheros.ts') && !r.endsWith('/ids-datos.ts'),
  );
  it('hay ficheros que revisar', () => {
    expect(ficheros.length).toBeGreaterThan(8);
  });
  it.each(ficheros)('%s', (ruta) => {
    expect(textosConCifras(ruta)).toEqual([]);
  });
  it('la entrada de la sección en `secciones.ts` no tiene dígitos', () => {
    const s = SECCIONES.find((x) => x.slug === 'mitos-y-realidades');
    expect(s).toBeDefined();
    const texto = [s!.titulo, s!.tituloNav, s!.resumen, ...s!.previsto].join(' ');
    expect(texto).not.toMatch(/\d/);
  });
});

describe('catálogo de afirmaciones y tarjetas', () => {
  const catalogo = ArchivoMitos.parse(JSON.parse(leer('data/mitos/afirmaciones-circulantes.json')));

  it('cada afirmación tiene su tarjeta (y no hay tarjetas sin afirmación)', () => {
    const tarjetas = leer(`${DIR}/tarjetas.ts`);
    const ids = [...tarjetas.matchAll(/^\s*'([a-z0-9-]+)':\s*Tarjeta/gm)].map((m) => m[1]!);
    expect(ids.sort()).toEqual(catalogo.mitos.map((m) => m.id).sort());
  });

  it('las referencias del catálogo apuntan a ficheros y series que existen', () => {
    const refs = catalogo.mitos.flatMap((m) => [
      ...m.datos,
      ...m.definiciones.flatMap((d) => d.datos ?? []),
    ]);
    for (const ref of refs) {
      const [fichero, id] = ref.split('#') as [string, string | undefined];
      const ruta = `data/${fichero}`;
      expect(existsSync(path.join(RAIZ, ruta)), ref).toBe(true);
      if (id !== undefined && fichero.endsWith('.json')) {
        const json = JSON.parse(leer(ruta)) as {
          series?: { id: string }[];
          data?: { id: string }[];
          tipo?: string;
        };
        if (json.tipo === 'datos') {
          const ids = [...(json.series ?? []), ...(json.data ?? [])].map((e) => e.id);
          expect(ids, ref).toContain(id);
        }
      }
    }
  });

  it('la revisión actuarial del catálogo coincide con la de la tanda 3 (parte B)', () => {
    const aplicacion = JSON.parse(leer('docs/revision-actuarial/aplicacion-tanda3.json')) as {
      filas: { n: number; parte: string; id: string; estado: string; respuestaActuarial: string }[];
    };
    const filas = aplicacion.filas.filter((f) => f.parte === 'B' && f.n >= 18 && f.n <= 29);
    expect(filas).toHaveLength(12);
    const porNumero = new Map(
      catalogo.mitos.flatMap((m) => {
        const n = /n\.º (\d+)$/.exec(m.respuestaActuarial ?? '')?.[1];
        return n === undefined ? [] : [[Number(n), m] as const];
      }),
    );
    for (const f of filas) {
      const m = porNumero.get(f.n);
      if (f.estado === 'revisada') {
        expect(m?.revisionActuarial, `n.º ${f.n}`).toBe('revisada');
      }
    }
    // De las tres pendientes de la tanda 3 (21, 25 y 27), la cuarta tanda cerró la 21 y la 27
    // (docs/revision-actuarial/aplicacion-tanda4.json); la 25 sigue pendiente en el catálogo.
    const tanda4 = (
      JSON.parse(leer('docs/revision-actuarial/aplicacion-tanda4.json')) as {
        afirmaciones: { mito?: string; estado: string; respuestaActuarial?: string }[];
      }
    ).afirmaciones.filter((f) => f.mito !== undefined && f.estado === 'revisada');
    const cerradasT4 = new Map(tanda4.map((f) => [f.mito, f.respuestaActuarial]));
    for (const [id, respuesta] of cerradasT4) {
      const m = catalogo.mitos.find((x) => x.id === id);
      expect(m?.revisionActuarial, id).toBe('revisada');
      expect(m?.respuestaActuarial, id).toBe(respuesta);
    }
    const pendientes = catalogo.mitos.filter((m) => m.revisionActuarial === 'pendiente');
    expect(pendientes.map((m) => m.id).sort()).toEqual(
      filas
        .filter((f) => f.estado === 'pendiente')
        .map((f) => f.id.replace(/^mito-/, ''))
        .filter((id) => !cerradasT4.has(id))
        .sort(),
    );
    expect(pendientes.map((m) => m.id)).toEqual(['mayores-en-pobreza']);
  });
});

describe('sin términos de veredicto en el catálogo ni en los datos que muestra la página', () => {
  const catalogo = ArchivoMitos.parse(JSON.parse(leer('data/mitos/afirmaciones-circulantes.json')));
  const textos = (v: unknown): string[] =>
    typeof v === 'string'
      ? [v]
      : Array.isArray(v)
        ? v.flatMap(textos)
        : v !== null && typeof v === 'object'
          ? Object.values(v).flatMap(textos)
          : [];

  it('catálogo: enunciados, definiciones, límites, faltantes y pregunta actuarial', () => {
    for (const m of catalogo.mitos) {
      expect(veredictosEn(m.enunciado), m.id).toEqual([]);
      const propios = textos([
        m.definiciones,
        m.noSePuedeConcluir,
        m.faltan ?? [],
        m.preguntaActuarial,
      ]);
      for (const t of propios) {
        expect(veredictosEn(t), `${m.id}: ${t.slice(0, 60)}`).toEqual([]);
        expect(valoracionesEn(t), `${m.id}: ${t.slice(0, 60)}`).toEqual([]);
      }
    }
  });

  it.each(FICHEROS_MITOS.filter((f) => !f.startsWith('data/mitos/')))(
    '%s: título, notas y citas',
    (ruta) => {
      const a = ArchivoDatos.parse(JSON.parse(leer(ruta)));
      const elementos = [...(a.series ?? []), ...(a.data ?? [])];
      const propios = elementos.flatMap((e) => [
        'title' in e ? e.title : '',
        e.notes ?? '',
        'quote' in e ? (e.quote ?? '') : '',
        e.source.title,
      ]);
      for (const t of propios) {
        expect(veredictosEn(t), `${ruta}: ${t.slice(0, 60)}`).toEqual([]);
      }
    },
  );
});

describe('claims de la página en docs/claims-web.json', () => {
  const catalogo = ArchivoMitos.parse(JSON.parse(leer('data/mitos/afirmaciones-circulantes.json')));
  interface ClaimWeb {
    id: string;
    ubicacion: string;
    datos: string[];
    revisionActuarial?: string;
    respuestaActuarial?: string;
    preguntaActuarial?: string;
  }
  const web = (JSON.parse(leer('docs/claims-web.json')) as { claims: ClaimWeb[] }).claims.filter(
    (c) => c.id.startsWith('web-mitos-'),
  );

  it('cada afirmación del catálogo tiene al menos un claim, con su revisión actuarial', () => {
    expect(web.length).toBeGreaterThanOrEqual(catalogo.mitos.length);
    catalogo.mitos.forEach((m, i) => {
      const delas = web.filter((c) => c.ubicacion.includes(`afirmación ${i + 1} (`));
      expect(delas.length, m.id).toBeGreaterThan(0);
      for (const c of delas) {
        expect(c.revisionActuarial, c.id).toBe(m.revisionActuarial);
        if (m.revisionActuarial === 'revisada') {
          expect(c.respuestaActuarial, c.id).toBe(m.respuestaActuarial);
        } else {
          expect(c.preguntaActuarial?.length, c.id).toBeGreaterThan(80);
        }
      }
    });
  });

  it('las referencias de los claims existen en /data', () => {
    for (const c of web) {
      for (const ref of c.datos) {
        const [fichero, id] = ref.split('#') as [string, string];
        const json = JSON.parse(leer(`data/${fichero}`)) as {
          series?: { id: string }[];
          data?: { id: string }[];
        };
        const ids = [...(json.series ?? []), ...(json.data ?? [])].map((e) => e.id);
        expect(ids, `${c.id}: ${ref}`).toContain(id);
      }
    }
  });

  it('ningún claim de la página afirma un acumulado de la revalorización frente al IPC', () => {
    for (const c of web) {
      const texto = JSON.stringify(c);
      if (c.id === 'web-mitos-ipc-sin-acumulado') continue;
      expect(texto, c.id).not.toMatch(/acumulad[oa] de la revalorización/i);
    }
  });
});
