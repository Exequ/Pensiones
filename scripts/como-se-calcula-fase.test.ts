/**
 * Fase «Cómo se calcula»: garantías sobre la página.
 *  1. Los ficheros de /data que lee tienen fuente, fecha de descarga y confianza, y el módulo de datos
 *     importa exactamente los que declara; ningún otro componente importa /data.
 *  2. Ningún texto visible lleva cifras escritas a mano (regla a de CLAUDE.md), ni la entrada de la
 *     sección en `secciones.ts`.
 *  3. Cada referencia normativa existe en el texto descargado (`data-raw/boe/`): ninguna afirmación
 *     normativa sin texto.
 *  4. Los ejemplos corresponden a casos de oro que existen en los tests del motor.
 *  5. `claims-web.json` registra las afirmaciones de la página con su revisión actuarial y el
 *     inventario documenta todas las normas y todos los ejemplos.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ArchivoDatos,
  ArchivoEjemplosCalculo,
  RegistroAfirmaciones,
} from '../src/engine/esquema-datos.ts';
import { ESQUEMAS } from '../src/modules/como-se-calcula/esquemas.ts';
import { FICHEROS_COMO_SE_CALCULA } from '../src/modules/como-se-calcula/ficheros.ts';
import { N, NORMAS } from '../src/modules/como-se-calcula/normas.ts';
import { SECCIONES } from '../src/modules/secciones.ts';
import { textosConCifras } from './lib/textos-con-cifras.ts';

const RAIZ = path.resolve(import.meta.dirname, '..');
const leer = (ruta: string) => readFileSync(path.join(RAIZ, ruta), 'utf8');
const DIR = 'src/modules/como-se-calcula';
const confianzas = ['alta', 'media', 'baja'];

const fuentesDe = readdirSync(path.join(RAIZ, DIR))
  .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
  .map((f) => `${DIR}/${f}`);

describe('procedencia de los ficheros que usa la página', () => {
  it.each(FICHEROS_COMO_SE_CALCULA.filter((f) => f.startsWith('data/parametros/')))(
    '%s tiene fuente, fecha de descarga y confianza en cada dato',
    (ruta) => {
      const a = ArchivoDatos.parse(JSON.parse(leer(ruta)));
      const elementos = [...(a.series ?? []), ...(a.data ?? [])];
      expect(elementos.length).toBeGreaterThan(0);
      for (const e of elementos) {
        expect(e.source.url, e.id).toMatch(/^https?:\/\//);
        expect(e.fetchedAt, e.id).toBeTruthy();
        expect(confianzas, e.id).toContain(e.confidence);
      }
    },
  );

  it('los ejemplos se validan con su esquema y llevan fuente, fecha y confianza baja', () => {
    const a = ArchivoEjemplosCalculo.parse(JSON.parse(leer('data/ejemplos/como-se-calcula.json')));
    expect(a.nota).toMatch(/Supuestos ilustrativos, no son datos observados/);
    for (const e of a.ejemplos) {
      expect(e.ilustrativo).toBe(true);
      expect(e.source.url).toMatch(/^https?:\/\//);
      expect(e.fetchedAt).toBeTruthy();
      expect(e.confidence).toBe('baja');
    }
  });

  it('todos los ficheros declarados existen', () => {
    for (const f of FICHEROS_COMO_SE_CALCULA) expect(existsSync(path.join(RAIZ, f)), f).toBe(true);
  });

  const importesDeData = (ruta: string) =>
    [...leer(ruta).matchAll(/from\s+'([^']*\/data\/[^']+)'/g)].map((m) => m[1]!);

  it('solo datos-como.ts importa /data, y solo el fichero de ejemplos y el de prestaciones', () => {
    for (const ruta of fuentesDe) {
      if (ruta.endsWith('/datos-como.ts')) continue;
      expect(importesDeData(ruta), ruta).toEqual([]);
    }
    const importados = importesDeData(`${DIR}/datos-como.ts`).map((r) =>
      r.replace(/^(\.\.\/)+/, 'data/'.replace('data/', '')),
    );
    expect(importados).toEqual([
      'data/ejemplos/como-se-calcula.json',
      'data/normativa/prestaciones.json',
    ]);
  });
});

describe('sin cifras escritas a mano en los textos de la página', () => {
  // Estos módulos solo contienen identificadores (números de artículo, años en ids de /data,
  // nombres de pasos y de opciones del motor); los rótulos de `ids-datos.ts` se revisan en
  // `datos-como.test.ts`.
  // `lecturas-sin-citas.ts` solo contiene patrones de búsqueda de citas (no texto visible).
  const EXENTOS = [
    'normas.ts',
    'ids-datos.ts',
    'ficheros.ts',
    'pasos-motor.ts',
    'lecturas-sin-citas.ts',
  ];
  const ficheros = fuentesDe.filter((r) => !EXENTOS.some((e) => r.endsWith(`/${e}`)));
  it('hay ficheros que revisar', () => {
    expect(ficheros.length).toBeGreaterThan(10);
  });
  it.each(ficheros)('%s', (ruta) => {
    expect(textosConCifras(ruta)).toEqual([]);
  });
  it('la entrada de la sección en `secciones.ts` no tiene dígitos', () => {
    const s = SECCIONES.find((x) => x.slug === 'como-se-calcula');
    expect(s).toBeDefined();
    const texto = [s!.titulo, s!.tituloNav, s!.resumen, ...s!.previsto].join(' ');
    expect(texto).not.toMatch(/\d/);
  });
  it('los textos del esquema no tienen dígitos', () => {
    for (const e of ESQUEMAS) {
      const t = [
        e.titulo,
        e.resumen,
        e.quien,
        ...e.noCalcula,
        ...e.pasos.flatMap((p) => [p.titulo, ...p.texto]),
      ];
      for (const x of t) expect(x, x).not.toMatch(/\d/);
    }
  });
});

describe('cada referencia normativa tiene su texto descargado', () => {
  const lineas = new Map<string, string[]>();
  const delFichero = (f: string) => {
    if (!lineas.has(f)) lineas.set(f, leer(f).split('\n'));
    return lineas.get(f)!;
  };
  it.each(NORMAS.map((n) => [n.etiqueta, n] as const))(
    '%s está en el texto descargado',
    (_e, n) => {
      expect(existsSync(path.join(RAIZ, n.fichero)), n.fichero).toBe(true);
      const hay = delFichero(n.fichero).some((l) => l.startsWith(n.encabezado));
      expect(hay, `${n.fichero}: «${n.encabezado}»`).toBe(true);
    },
  );
  it('los identificadores son únicos y los de `N` y los esquemas existen', () => {
    const ids = NORMAS.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const v of Object.values(N)) expect(ids, v).toContain(v);
    for (const e of ESQUEMAS)
      for (const p of e.pasos) for (const id of p.normas) expect(ids).toContain(id);
  });
  it('cada norma de `NORMAS` se usa en algún esquema', () => {
    const usadas = new Set(ESQUEMAS.flatMap((e) => e.pasos.flatMap((p) => p.normas)));
    for (const n of NORMAS) expect(usadas.has(n.id), n.id).toBe(true);
  });
});

describe('los ejemplos corresponden a casos de oro del motor', () => {
  const a = ArchivoEjemplosCalculo.parse(JSON.parse(leer('data/ejemplos/como-se-calcula.json')));
  it.each(a.ejemplos.map((e) => [e.id, e] as const))('%s', (_id, e) => {
    const fuente = leer(e.casoOro.fichero);
    const marca = e.casoOro.id.startsWith('caso de oro') ? e.casoOro.id : `id: '${e.casoOro.id}'`;
    expect(fuente, `${e.casoOro.fichero}: ${e.casoOro.id}`).toContain(marca);
  });
});

describe('afirmaciones, fuentes e inventario', () => {
  interface ClaimWeb {
    id: string;
    datos: string[];
    fuentes: { url: string }[];
    revisionActuarial?: string;
    preguntaActuarial?: string;
  }
  it('claims-web.json registra las afirmaciones de la página, con revisión actuarial y sin agrupar', () => {
    const propias = (
      JSON.parse(leer('docs/claims-web.json')) as { claims: ClaimWeb[] }
    ).claims.filter((c) => c.id.startsWith('web-como-'));
    expect(propias.length).toBeGreaterThanOrEqual(6);
    for (const c of propias) {
      expect(c.datos.length, c.id).toBeGreaterThan(0);
      expect(c.fuentes.length, c.id).toBeGreaterThan(0);
      expect(['no-requiere', 'revisada', 'pendiente'], c.id).toContain(c.revisionActuarial);
      if (c.revisionActuarial === 'pendiente') {
        expect(c.preguntaActuarial?.length ?? 0, c.id).toBeGreaterThan(80);
      }
    }
  });
  it('las referencias de los claims existen en /data', () => {
    const propias = (
      JSON.parse(leer('docs/claims-web.json')) as { claims: ClaimWeb[] }
    ).claims.filter((c) => c.id.startsWith('web-como-'));
    for (const c of propias) {
      for (const ref of c.datos) {
        const [fichero, id] = ref.split('#') as [string, string];
        const json = JSON.parse(leer(`data/${fichero}`)) as {
          series?: { id: string }[];
          data?: { id: string }[];
          ejemplos?: { id: string }[];
        };
        const ids = [...(json.series ?? []), ...(json.data ?? []), ...(json.ejemplos ?? [])].map(
          (e) => e.id,
        );
        expect(ids, `${c.id}: ${ref}`).toContain(id);
      }
    }
  });
  it('docs/claims.json recoge las mismas afirmaciones que claims-web.json', () => {
    const web = (JSON.parse(leer('docs/claims-web.json')) as { claims: ClaimWeb[] }).claims;
    const todas = RegistroAfirmaciones.parse(JSON.parse(leer('docs/claims.json')));
    const ids = new Set(todas.claims.map((c) => c.id));
    for (const c of web.filter((x) => x.id.startsWith('web-como-')))
      expect(ids.has(c.id), c.id).toBe(true);
  });
  it('el inventario documenta todos los ejemplos y todas las normas usadas', () => {
    const inventario = leer('docs/INVENTARIO_COMO_SE_CALCULA.md');
    const a = ArchivoEjemplosCalculo.parse(JSON.parse(leer('data/ejemplos/como-se-calcula.json')));
    for (const e of a.ejemplos) expect(inventario, e.id).toContain(`\`${e.id}\``);
    for (const n of NORMAS) expect(inventario, n.etiqueta).toContain(n.etiqueta);
  });
});
