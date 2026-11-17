/**
 * Fase «Reformas»: garantías sobre la página y sus datos.
 *  1. La cronología (`data/normativa/cronologia.json`) cumple su esquema; cada norma tiene fuente, fecha
 *     de descarga y confianza, y todas tienen los mismos campos.
 *  2. Cada fecha de entrada en vigor está respaldada: la cita consta en el texto descargado
 *     (`data-raw/boe/`) o en las notas y transiciones de la cronología; sin base, no hay fecha.
 *  3. Las citas literales de las normas con texto descargado constan en su fichero.
 *  4. Ningún texto visible lleva cifras escritas a mano (regla a de CLAUDE.md) ni la entrada de la
 *     sección en `secciones.ts`; solo `datos-reformas.ts` importa /data y solo los ficheros declarados.
 *  5. Neutralidad: ni los textos propios de la cronología ni los de la página usan términos de
 *     valoración ni de veredicto; la lista de reformas detecta los términos que el encargo prohíbe.
 *  6. `claims-web.json` y `claims.json` registran las afirmaciones; el inventario y los pendientes
 *     documentan todas las normas; los pendientes de afirmaciones no superan el tope.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ArchivoCronologia,
  ArchivoDatos,
  RegistroAfirmaciones,
} from '../src/engine/esquema-datos.ts';
import { FICHEROS_REFORMAS } from '../src/modules/reformas/ficheros.ts';
import { CALENDARIOS, VALORES } from '../src/modules/reformas/ids-datos.ts';
import { SECCIONES } from '../src/modules/secciones.ts';
import { textosConCifras } from './lib/textos-con-cifras.ts';
import {
  PALABRAS_DE_VALORACION_REFORMAS,
  valoracionesReformasEn,
  veredictosEn,
} from './lib/valoraciones.ts';

const RAIZ = path.resolve(import.meta.dirname, '..');
const leer = (ruta: string) => readFileSync(path.join(RAIZ, ruta), 'utf8');
const normaEspacios = (t: string) => t.replace(/\s+/g, ' ').trim();
const DIR = 'src/modules/reformas';
const confianzas = ['alta', 'media', 'baja'];

const cronologia = ArchivoCronologia.parse(JSON.parse(leer('data/normativa/cronologia.json')));

const fuentesDe = readdirSync(path.join(RAIZ, DIR))
  .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
  .map((f) => `${DIR}/${f}`);

describe('cronología: esquema, procedencia y mismos campos en todas las normas', () => {
  it('cada norma tiene fuente del BOE, fecha de descarga y confianza', () => {
    for (const n of cronologia.normas) {
      expect(n.source.url, n.id).toMatch(/^https:\/\/www\.boe\.es\//);
      expect(n.source.url, n.id).toContain(n.boeId);
      expect(n.fetchedAt, n.id).toBeTruthy();
      expect(confianzas, n.id).toContain(n.confidence);
    }
  });

  it('todas las normas y todos los cambios tienen exactamente los mismos campos', () => {
    const crudo = JSON.parse(leer('data/normativa/cronologia.json')) as {
      normas: Record<string, unknown>[];
    };
    const obligatorios = [
      'id',
      'titulo',
      'rango',
      'fecha',
      'fechaPublicacion',
      'boeId',
      'fetchedAt',
      'confidence',
      'resumen',
      'entradaEnVigor',
      'cambios',
      'modulos',
      'estado',
      'source',
    ];
    for (const n of crudo.normas) {
      const claves = Object.keys(n);
      for (const k of obligatorios) expect(claves, `${String(n['id'])}: ${k}`).toContain(k);
      for (const k of claves) expect([...obligatorios, 'notas', 'textoDescargado'], k).toContain(k);
      const vigor = n['entradaEnVigor'] as Record<string, unknown>;
      expect(Object.keys(vigor).sort()).toEqual(['base', 'cita', 'fecha', 'ubicacion']);
      for (const c of n['cambios'] as Record<string, unknown>[])
        expect(Object.keys(c).sort()).toEqual([
          'antes',
          'articulos',
          'despues',
          'evidencia',
          'parametro',
          'transicion',
        ]);
    }
    expect(crudo.normas.length).toBeGreaterThan(10);
  });

  it('las normas están en orden cronológico por fecha de aprobación y sin repetir', () => {
    const fechas = cronologia.normas.map((n) => n.fecha);
    expect([...fechas].sort()).toEqual(fechas);
    expect(new Set(cronologia.normas.map((n) => n.id)).size).toBe(cronologia.normas.length);
    expect(new Set(cronologia.normas.map((n) => n.boeId)).size).toBe(cronologia.normas.length);
  });
});

describe('entrada en vigor: cada fecha tiene su base', () => {
  it.each(cronologia.normas.map((n) => [n.id, n] as const))('%s', (_id, n) => {
    const v = n.entradaEnVigor;
    if (v.base === 'sin-texto') {
      expect(v.fecha).toBeNull();
      expect(v.cita).toBeNull();
      return;
    }
    expect(v.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(v.cita).not.toBeNull();
    const cita = normaEspacios(v.cita ?? '');
    if (v.base === 'disposicion-final') {
      expect(n.textoDescargado, 'una disposición final exige el texto descargado').toBeDefined();
    }
    if (n.textoDescargado !== undefined) {
      expect(existsSync(path.join(RAIZ, n.textoDescargado)), n.textoDescargado).toBe(true);
      expect(normaEspacios(leer(n.textoDescargado))).toContain(cita);
      expect(v.ubicacion).toContain(path.basename(n.textoDescargado));
    } else {
      const fuente = normaEspacios(
        [n.notas ?? '', ...n.cambios.map((c) => c.transicion)].join(' '),
      );
      expect(fuente).toContain(cita);
    }
    if (v.base === 'regla-sobre-publicacion') {
      const dia = new Date(`${n.fechaPublicacion}T00:00:00Z`);
      dia.setUTCDate(dia.getUTCDate() + 1);
      expect(v.fecha).toBe(dia.toISOString().slice(0, 10));
      expect(cita).toMatch(/día siguiente/);
    }
    if (v.base === 'metadatos-boe') expect(cita).toContain(v.fecha ?? '');
    expect((v.fecha ?? '') >= n.fecha, 'la entrada en vigor no precede a la aprobación').toBe(true);
  });

  it('las normas con real decreto de aplicación anual entran en vigor el día de su publicación', () => {
    for (const id of ['rd-316-2025', 'rd-241-2026']) {
      const n = cronologia.normas.find((x) => x.id === id);
      expect(n?.entradaEnVigor.fecha, id).toBe(n?.fechaPublicacion);
    }
  });

  it('la fecha de vigencia y la de publicación coinciden con la cabecera de los textos de la API del BOE', () => {
    const casos: [string, string, string][] = [
      ['rdl-2-2023', 'data-raw/boe/rdl-2-2023.txt', '20230401'],
      ['rd-316-2025', 'data-raw/boe/BOE-A-2025-7660.txt', '20250416'],
      ['rd-241-2026', 'data-raw/boe/BOE-A-2026-6977.txt', '20260326'],
    ];
    for (const [id, fichero, vigencia] of casos) {
      const n = cronologia.normas.find((x) => x.id === id);
      const cabecera = normaEspacios(leer(fichero).slice(0, 1500));
      expect(cabecera, id).toContain(
        `Boletín Oficial del Estado ${n?.fechaPublicacion.replaceAll('-', '')}`,
      );
      expect(cabecera, id).toMatch(new RegExp(` L ${vigencia} N N N`));
    }
  });
});

describe('las citas literales de las normas con texto descargado constan en su fichero', () => {
  const conTexto = cronologia.normas.filter((n) => n.textoDescargado !== undefined);
  it('hay normas con texto descargado', () => {
    expect(conTexto.length).toBeGreaterThanOrEqual(5);
  });
  it.each(conTexto.map((n) => [n.id, n] as const))('%s', (_id, n) => {
    const texto = normaEspacios(leer(n.textoDescargado ?? ''));
    const limpia = (t: string) =>
      normaEspacios(t.replace(/\s*\|\s*/g, ' ').replace(/-\s+(?=[a-záéíóúñ])/g, '')).replace(
        /[\s«»".…]+$/g,
        '',
      );
    const base = limpia(texto);
    const faltan: string[] = [];
    for (const c of n.cambios)
      for (const trozo of c.evidencia.split(/\s*(?:\|\||…|\.\.\.|\[\.\.\.\])\s*/)) {
        const t = limpia(trozo);
        if (t.length > 12 && !base.includes(t)) faltan.push(`${c.parametro}: ${t.slice(0, 90)}`);
      }
    expect(faltan).toEqual([]);
  });
});

describe('procedencia de los ficheros que usa la página', () => {
  it.each(FICHEROS_REFORMAS.filter((f) => f.startsWith('data/parametros/')))(
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

  it('todos los ficheros declarados existen y los ids de la configuración están en ellos', () => {
    for (const f of FICHEROS_REFORMAS) expect(existsSync(path.join(RAIZ, f)), f).toBe(true);
    const idsDe = (n: string) =>
      new Set(
        (JSON.parse(leer(`data/parametros/${n}.json`)) as { data: { id: string }[] }).data.map(
          (d) => d.id,
        ),
      );
    for (const c of CALENDARIOS) {
      const anios = Array.from(
        { length: Number(c.hasta) - Number(c.desde) + 1 },
        (_, i) => Number(c.desde) + i,
      );
      for (const col of c.columnas)
        for (const a of anios)
          expect(idsDe(col.fichero), `${c.norma} ${col.fichero}`).toContain(
            col.id.replace('{anio}', String(a)),
          );
    }
    for (const v of VALORES)
      for (const f of v.filas) expect(idsDe(f.fichero), `${v.norma} ${f.id}`).toContain(f.id);
  });

  const importesDeData = (ruta: string) =>
    [...leer(ruta).matchAll(/from\s+'([^']*\/data\/[^']+)'/g)].map((m) => m[1]!);

  it('solo datos-reformas.ts importa /data y exactamente los ficheros declarados', () => {
    for (const ruta of fuentesDe) {
      if (ruta.endsWith('/datos-reformas.ts')) continue;
      expect(importesDeData(ruta), ruta).toEqual([]);
    }
    const importados = importesDeData(`${DIR}/datos-reformas.ts`)
      .map((r) => r.replace(/^(\.\.\/)+/, ''))
      .sort();
    expect(importados).toEqual([...FICHEROS_REFORMAS].sort());
  });
});

describe('sin cifras escritas a mano en los textos de la página', () => {
  // `ids-datos.ts` y `ficheros.ts` solo contienen identificadores de /data (años y claves) y el
  // rótulo de cada parámetro; `tipos.ts`, tipos.
  const EXENTOS = ['ids-datos.ts', 'ficheros.ts', 'tipos.ts'];
  const ficheros = fuentesDe.filter((r) => !EXENTOS.some((e) => r.endsWith(`/${e}`)));
  it('hay ficheros que revisar', () => {
    expect(ficheros.length).toBeGreaterThanOrEqual(6);
  });
  it.each(ficheros)('%s', (ruta) => {
    expect(textosConCifras(ruta)).toEqual([]);
  });
  it('los rótulos y títulos de `ids-datos.ts` no tienen dígitos fuera de los identificadores', () => {
    const fuente = leer(`${DIR}/ids-datos.ts`);
    const titulos = [...fuente.matchAll(/(?:titulo|rotulo):\s*'([^']*)'/g)].map((m) => m[1] ?? '');
    expect(titulos.length).toBeGreaterThan(10);
    for (const t of titulos) expect(t, t).not.toMatch(/\d/);
  });
  it('la entrada de la sección en `secciones.ts` no tiene dígitos', () => {
    const s = SECCIONES.find((x) => x.slug === 'reformas');
    expect(s).toBeDefined();
    const texto = [s!.titulo, s!.tituloNav, s!.resumen, ...s!.previsto].join(' ');
    expect(texto).not.toMatch(/\d/);
  });
});

describe('neutralidad de los textos propios y de los datos', () => {
  it('la lista de reformas detecta los términos que el encargo prohíbe', () => {
    for (const t of [
      'un recorte de las pensiones',
      'el blindaje del sistema',
      'una contrarreforma',
      'una reforma histórica',
      'una medida necesaria',
      'una reforma injusta',
      'una cuantía insuficiente',
      'una gran reforma',
      'endurece los requisitos',
    ])
      expect(valoracionesReformasEn(t), t).not.toEqual([]);
    expect(valoracionesReformasEn('Modifica el periodo de cálculo de la base reguladora.')).toEqual(
      [],
    );
    expect(PALABRAS_DE_VALORACION_REFORMAS.length).toBeGreaterThan(40);
  });

  it('los resúmenes, notas, cambios y bases de la cronología no tienen términos de valoración ni de veredicto', () => {
    // Quedan fuera los títulos oficiales (`titulo`, `source.title`) y las citas literales
    // (`evidencia`, `cita`): son el texto de la norma, no el de la web.
    for (const n of cronologia.normas) {
      const textos = [
        n.resumen,
        n.notas ?? '',
        n.entradaEnVigor.ubicacion,
        ...n.cambios.flatMap((c) => [c.antes ?? '', c.despues, c.transicion, c.articulos]),
      ];
      for (const t of textos) {
        expect(valoracionesReformasEn(t), `${n.id}: ${t.slice(0, 80)}`).toEqual([]);
        expect(veredictosEn(t), `${n.id}: ${t.slice(0, 80)}`).toEqual([]);
      }
    }
  });

  it('el código de la página no tiene términos de valoración en sus textos', () => {
    const textos = fuentesDe
      .filter((r) => !r.endsWith('/ficheros.ts') && !r.endsWith('/tipos.ts'))
      .map((r) => leer(r))
      .join('\n')
      // Comentarios del código: describen la regla de neutralidad con las propias palabras.
      .replace(/from\s+'[^']*'/g, '')
      .replace(/import\s+'[^']*'/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(valoracionesReformasEn(textos)).toEqual([]);
  });
});

describe('afirmaciones, pendientes e inventario', () => {
  interface ClaimWeb {
    id: string;
    datos: string[];
    fuentes: { url: string }[];
    revisionActuarial?: string;
    preguntaActuarial?: string;
    respuestaActuarial?: string;
  }
  const web = (JSON.parse(leer('docs/claims-web.json')) as { claims: ClaimWeb[] }).claims.filter(
    (c) => c.id.startsWith('web-reformas-'),
  );

  it('claims-web.json registra las afirmaciones de la página, cada una con dato, fuente y revisión', () => {
    expect(web.length).toBeGreaterThanOrEqual(8);
    for (const c of web) {
      expect(c.datos.length, c.id).toBeGreaterThan(0);
      expect(c.fuentes.length, c.id).toBeGreaterThan(0);
      expect(['no-requiere', 'revisada', 'pendiente'], c.id).toContain(c.revisionActuarial);
      if (c.revisionActuarial === 'pendiente')
        expect(c.preguntaActuarial?.length ?? 0, c.id).toBeGreaterThan(80);
      if (c.revisionActuarial === 'revisada') expect(c.respuestaActuarial, c.id).toBeTruthy();
    }
  });

  it('las referencias de los claims existen en /data', () => {
    for (const c of web)
      for (const ref of c.datos) {
        const [fichero, id] = ref.split('#') as [string, string];
        const json = JSON.parse(leer(`data/${fichero}`)) as Record<string, { id: string }[]>;
        const ids = ['data', 'series', 'normas'].flatMap((k) => (json[k] ?? []).map((e) => e.id));
        expect(ids, `${c.id}: ${ref}`).toContain(id);
      }
  });

  it('docs/claims.json recoge las mismas afirmaciones que claims-web.json', () => {
    const todas = RegistroAfirmaciones.parse(JSON.parse(leer('docs/claims.json')));
    const ids = new Set(todas.claims.map((c) => c.id));
    for (const c of web) expect(ids.has(c.id), c.id).toBe(true);
  });

  it('el número de afirmaciones pendientes no supera el tope y no se agrupan', () => {
    const todas = RegistroAfirmaciones.parse(JSON.parse(leer('docs/claims.json')));
    const pendientes = todas.claims.filter(
      (c) => (c.revisionActuarial ?? todas.revisionActuarialPorDefecto) === 'pendiente',
    );
    expect(pendientes.length).toBeLessThanOrEqual(70);
    for (const c of pendientes) expect(c.preguntaActuarial?.length ?? 0, c.id).toBeGreaterThan(80);
  });

  it('el inventario documenta todas las normas, con su identificador del BOE', () => {
    const inventario = leer('docs/INVENTARIO_REFORMAS.md');
    for (const n of cronologia.normas) {
      expect(inventario, n.id).toContain(`\`${n.id}\``);
      expect(inventario, n.id).toContain(n.boeId);
    }
  });

  it('las normas sin entrada en vigor constan en PENDIENTE_DATOS.md y en DESCARGAS_MANUALES.md con su URL exacta', () => {
    const pendiente = leer('docs/PENDIENTE_DATOS.md');
    const descargas = leer('docs/DESCARGAS_MANUALES.md');
    const sin = cronologia.normas.filter((n) => n.entradaEnVigor.base === 'sin-texto');
    expect(sin.length).toBeGreaterThan(0);
    for (const n of sin) {
      expect(pendiente, n.id).toContain(n.source.url);
      expect(descargas, n.id).toContain(n.source.url);
    }
  });

  it('el estado de la fase y las decisiones existen', () => {
    expect(existsSync(path.join(RAIZ, 'docs/ESTADO_FASE_REFORMAS.md'))).toBe(true);
    expect(leer('docs/DECISIONES.md')).toMatch(/## Fase «Reformas»/);
  });
});
