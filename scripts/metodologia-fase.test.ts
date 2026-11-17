/**
 * Fase «Metodología»: garantías sobre la página y sus recuentos.
 *  1. Los recuentos que muestra la página (`calcularRecuentos`) se recalculan aquí con otro
 *     procedimiento (texto bruto de los ficheros, registro de lecturas del motor, `inventario()` de
 *     los casos de oro, `git ls-files`) y coinciden.
 *  2. Cada apartado tiene su respaldo: el fichero existe y contiene el fragmento citado; cada
 *     modelo y cada límite también.
 *  3. Ningún texto visible lleva cifras escritas a mano (regla a de CLAUDE.md), ni la entrada de la
 *     sección en `secciones.ts`.
 *  4. Neutralidad: los textos propios no usan términos de valoración ni de veredicto.
 *  5. Las afirmaciones nuevas están en `claims-web.json` y `claims.json`; las pendientes no superan
 *     el tope ni se agrupan; los comandos de la página existen en `package.json`.
 *  6. La documentación de la fase existe y recoge los huecos.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { RegistroAfirmaciones } from '../src/engine/esquema-datos.ts';
import { LECTURAS_ABIERTAS } from '../src/engine/lecturas.ts';
import { calcularRecuentos } from '../src/engine/metodologia.ts';
import { TEXTOS_MODELOS } from '../src/modules/metodologia/modelos.ts';
import { APARTADOS, LIMITES, RESPALDO } from '../src/modules/metodologia/respaldo.ts';
import { SECCIONES } from '../src/modules/secciones.ts';
import { inventario } from './inventario-casos-oro.ts';
import { leerEntradasMetodologia } from './lib/entradas-metodologia.ts';
import { textosConCifras } from './lib/textos-con-cifras.ts';
import {
  PALABRAS_DE_VALORACION,
  PALABRAS_DE_VALORACION_REFORMAS,
  PALABRAS_DE_VEREDICTO,
  valoracionesEn,
  veredictosEn,
} from './lib/valoraciones.ts';

const RAIZ = path.resolve(import.meta.dirname, '..');
const leer = (ruta: string) => readFileSync(path.join(RAIZ, ruta), 'utf8');
const normaEspacios = (t: string) => t.replace(/\s+/g, ' ').trim();
const DIR = 'src/modules/metodologia';
const git = (...args: string[]) =>
  execFileSync('git', ['ls-files', '-co', '--exclude-standard', ...args], {
    cwd: RAIZ,
    encoding: 'utf8',
  })
    .split('\n')
    .filter((l) => l !== '');

const r = calcularRecuentos(leerEntradasMetodologia(RAIZ));
const ocurrencias = (texto: string, patron: RegExp) => [...texto.matchAll(patron)].length;

describe('recuentos recalculados de forma independiente', () => {
  it('fuentes: filas de la tabla de FUENTES.md, sin las huellas', () => {
    const tabla = leer('docs/FUENTES.md').split('## Huellas')[0] ?? '';
    const urls = new Set([...tabla.matchAll(/\|\s*<(https?:\/\/[^>\s]+)>\s*\|/g)].map((m) => m[1]));
    expect(r.fuentes.distintas).toBe(urls.size);
    const organismos = new Set(
      tabla
        .split('\n')
        .filter((l) => /\| <https?:\/\//.test(l))
        .map((l) => l.slice(1).split(' | ')[0]?.trim()),
    );
    expect(r.fuentes.organismos).toBe(organismos.size);
    expect(r.fuentes.porOrganismo.reduce((s, o) => s + o.fuentes, 0)).toBe(
      ocurrencias(tabla, /^\| .* \| <https?:\/\//gm),
    );
  });

  it('datos: ficheros por tipo y confianza de cada elemento, contados en el texto bruto', () => {
    const todos = readdirSync(path.join(RAIZ, 'data'), { recursive: true, encoding: 'utf8' })
      .map((f) => f.replaceAll('\\', '/'))
      .filter((f) => !f.endsWith('README.md') && /\.[a-z]+$/.test(f));
    const json = todos.filter((f) => f.endsWith('.json'));
    expect(r.datos.json).toBe(json.length);
    expect(r.datos.csv).toBe(todos.filter((f) => f.endsWith('.csv')).length);
    expect(r.datos.ficheros).toBe(json.length + r.datos.csv);
    const nivel = (n: string) =>
      json.reduce(
        (s, f) => s + ocurrencias(leer(`data/${f}`), new RegExp(`"confidence":\\s*"${n}"`, 'g')),
        0,
      );
    expect(r.datos.elementosConConfianza).toEqual({
      alta: nivel('alta'),
      media: nivel('media'),
      baja: nivel('baja'),
      total: nivel('alta') + nivel('media') + nivel('baja'),
    });
    expect(r.datos.porCarpeta.reduce((s, c) => s + c.json, 0)).toBe(json.length);
  });

  it('afirmaciones y revisión actuarial: esquema validado y texto bruto', () => {
    const texto = leer('docs/claims.json');
    const registro = RegistroAfirmaciones.parse(JSON.parse(texto));
    const porDefecto = registro.revisionActuarialPorDefecto ?? 'pendiente';
    const revision = (c: { revisionActuarial?: string | undefined }) =>
      c.revisionActuarial ?? porDefecto;
    expect(r.afirmaciones.total).toBe(registro.claims.length);
    expect(r.afirmaciones.estado.verificada).toBe(
      registro.claims.filter((c) => c.estado === 'verificada').length,
    );
    expect(r.afirmaciones.estado.pendiente).toBe(
      registro.claims.filter((c) => c.estado === 'pendiente').length,
    );
    expect(r.afirmaciones.revision.pendiente).toBe(
      ocurrencias(texto, /"revisionActuarial": "pendiente"/g),
    );
    expect(r.afirmaciones.revision.revisada).toBe(
      ocurrencias(texto, /"revisionActuarial": "revisada"/g),
    );
    expect(r.afirmaciones.revision.noRequiere).toBe(
      registro.claims.filter((c) => revision(c) === 'no-requiere').length,
    );
    const suma = Object.values(r.afirmaciones.revision).reduce((s, n) => s + n, 0);
    expect(suma).toBe(registro.claims.length);
    expect(r.afirmaciones.pendientes.map((p) => p.id).sort()).toEqual(
      registro.claims
        .filter((c) => revision(c) === 'pendiente')
        .map((c) => c.id)
        .sort(),
    );
  });

  it('tandas: referencias contadas en el texto bruto y partes de la tabla de aplicación', () => {
    const texto = leer('docs/claims.json');
    for (const g of r.tandas.gruposRevisados)
      expect(g.afirmaciones, g.referencia).toBe(
        ocurrencias(texto, new RegExp(`"respuestaActuarial": "${g.referencia}`, 'g')),
      );
    const filas = (
      JSON.parse(leer('docs/revision-actuarial/aplicacion-tanda3.json')) as {
        filas: { n: number; parte: string; estado: string }[];
      }
    ).filas;
    expect(r.tandas.tanda3.filasRevisadas + r.tandas.tanda3.filasPendientes).toBe(filas.length);
    for (const p of r.tandas.tanda3.partes) {
      const suyas = filas.filter((f) => f.parte === p.parte);
      expect(p.preguntasRevisadas).toBe(suyas.filter((f) => f.estado === 'revisada').length);
      expect(p.preguntasPendientes).toBe(suyas.filter((f) => f.estado === 'pendiente').length);
    }
    expect(r.tandas.tanda3.fecha).toBe(
      leer('docs/ESTADO_AJUSTES_ACTUARIALES_3.md')
        .match(/respuestas del (\d\d)-(\d\d)-(\d{4})/)
        ?.slice(1)
        .reverse()
        .join('-'),
    );
  });

  it('lecturas: registro del motor', () => {
    const cuenta = (e: string) => LECTURAS_ABIERTAS.filter((l) => l.estado === e).length;
    expect(r.lecturas.total).toBe(LECTURAS_ABIERTAS.length);
    expect(r.lecturas.estado).toEqual({
      decidida: cuenta('decidida'),
      provisional: cuenta('provisional'),
      pendiente: cuenta('pendiente'),
    });
    for (const m of r.lecturas.porMotor)
      expect(m.total, m.motor).toBe(LECTURAS_ABIERTAS.filter((l) => l.motor === m.motor).length);
    expect(r.lecturas.porMotor.reduce((s, m) => s + m.total, 0)).toBe(LECTURAS_ABIERTAS.length);
    expect(r.lecturas.porFecha.reduce((s, f) => s + f.lecturas, 0)).toBe(LECTURAS_ABIERTAS.length);
  });

  it('casos de oro: total del inventario generado por scripts/inventario-casos-oro.ts', () => {
    const fila = inventario()
      .split('\n')
      .find((l) => l.includes('**Total**'));
    const numeros = [...(fila ?? '').matchAll(/\*\*(\d+)\*\*/g)].map((m) => Number(m[1]));
    expect([r.casosOro.total, r.casosOro.independientes, r.casosOro.derivados]).toEqual(numeros);
    expect(r.casosOro.independientes + r.casosOro.derivados).toBe(r.casosOro.total);
  });

  it('auditoría y direcciones: texto bruto', () => {
    const aud = leer('docs/auditoria-independiente.json');
    expect(r.auditoria.series).toBe(ocurrencias(aud, /^ {6}"resultado": /gm));
    for (const f of r.auditoria.porResultado)
      expect(f.series, f.resultado).toBe(
        ocurrencias(aud, new RegExp(`"resultado": "${f.resultado}"`, 'g')),
      );
    const urls = leer('docs/comprobacion-urls.json');
    for (const f of r.urls.porEstado)
      expect(f.urls, f.estado).toBe(ocurrencias(urls, new RegExp(`"estado": "${f.estado}"`, 'g')));
    expect(r.urls.muestra).toBe(r.urls.porEstado.reduce((s, f) => s + f.urls, 0));
  });

  it('pruebas, ETL y listas de términos: git ls-files y las listas importadas', () => {
    expect(r.pruebas.ficheros).toBe(
      git('src', 'scripts').filter((f) => /\.test\.tsx?$/.test(f)).length,
    );
    expect(r.etl.ficheros).toBe(
      git('scripts/etl').filter((f) => /^scripts\/etl\/[^/]+\.py$/.test(f) && !/\/test_/.test(f))
        .length,
    );
    expect(r.listasDeTerminos).toEqual({
      valoracion: PALABRAS_DE_VALORACION.length,
      valoracionReformas: PALABRAS_DE_VALORACION_REFORMAS.length,
      veredicto: PALABRAS_DE_VEREDICTO.length,
    });
    const conListas = git('src', 'scripts').filter(
      (f) => /\.test\.tsx?$/.test(f) && /valoraciones/.test(leer(f)),
    );
    expect(r.pruebas.conListasDeTerminos).toBe(conListas.length);
  });

  it('modelos: ficheros de proyecciones por prefijo, confianza y fecha del metadato', () => {
    expect(r.modelos.map((m) => m.modelo)).toEqual(['M1', 'M2', 'M3', 'M4', 'M5', 'M6']);
    for (const m of r.modelos) {
      const ficheros = git('data/proyecciones').filter((f) =>
        f.startsWith(`data/proyecciones/${m.modelo.toLowerCase()}-`),
      );
      expect(m.ficheros, m.modelo).toBe(ficheros.length);
      if (ficheros.length === 0) {
        expect(m.confianza).toBeNull();
        continue;
      }
      const metadatos = ficheros.map(
        (f) => JSON.parse(leer(f)) as { confidence: string; escenario: { legislacion: string } },
      );
      expect(new Set(metadatos.map((x) => x.confidence))).toEqual(new Set([m.confianza]));
      expect(metadatos.every((x) => x.escenario.legislacion === 'congelada')).toBe(
        m.legislacionCongelada,
      );
    }
  });

  it('reproducción: Node y comandos de las reglas existen en package.json', () => {
    const paquete = JSON.parse(leer('package.json')) as {
      engines: { node: string };
      scripts: Record<string, string>;
    };
    expect(paquete.engines.node).toContain(r.reproduccion.node ?? '¿?');
    expect(r.reproduccion.comandos.length).toBeGreaterThanOrEqual(6);
    for (const c of r.reproduccion.comandos) {
      const m = /^npm (?:run )?([a-z0-9:-]+)$/.exec(c.comando);
      expect(m, c.comando).not.toBeNull();
      expect(paquete.scripts[m?.[1] ?? ''], c.comando).toBeDefined();
      expect(c.comentario.length, c.comando).toBeGreaterThan(3);
    }
    for (const linea of r.reproduccion.regenerarFuentes) {
      const script = /scripts\/etl\/[a-z_]+\.py/.exec(linea)?.[0];
      if (script !== undefined) expect(existsSync(path.join(RAIZ, script)), linea).toBe(true);
    }
    expect(r.reproduccion.regenerarFuentes.length).toBeGreaterThanOrEqual(2);
    const modelos = r.reproduccion.regenerarModelos?.match(/scripts\/etl\/[a-z_]+\.py/)?.[0];
    expect(existsSync(path.join(RAIZ, modelos ?? 'no-existe'))).toBe(true);
    expect(r.reproduccion.ejecutarModelos.length).toBe(3);
  });
});

describe('respaldo de cada apartado', () => {
  it.each(APARTADOS)('%s tiene respaldo (o límites) y cada fichero contiene su fragmento', (id) => {
    const entradas = RESPALDO[id];
    if (id === 'limites') expect(LIMITES.length).toBeGreaterThanOrEqual(5);
    else expect(entradas.length, id).toBeGreaterThanOrEqual(4);
    for (const e of entradas) {
      expect(existsSync(path.join(RAIZ, e.fichero)), e.fichero).toBe(true);
      expect(normaEspacios(leer(e.fichero)), `${e.fichero}: ${e.contiene}`).toContain(
        normaEspacios(e.contiene),
      );
      expect(e.para.length, e.fichero).toBeGreaterThan(20);
    }
  });

  it('cada límite consta en su fichero', () => {
    for (const l of LIMITES) {
      expect(normaEspacios(leer(l.fichero)), `${l.fichero}: ${l.contiene}`).toContain(
        normaEspacios(l.contiene),
      );
    }
  });

  it('cada modelo tiene texto propio con fiabilidad y límites, respaldado en su descripción', () => {
    for (const m of r.modelos) {
      const t = TEXTOS_MODELOS[m.modelo];
      expect(t, m.modelo).toBeDefined();
      expect(t?.fiabilidad.length ?? 0, m.modelo).toBeGreaterThan(40);
      expect(t?.limites.length ?? 0, m.modelo).toBeGreaterThanOrEqual(3);
      expect(t?.hipotesis.length ?? 0, m.modelo).toBeGreaterThanOrEqual(2);
      const fichero = `docs/modelos/${m.modelo}_descripcion.md`;
      expect(existsSync(path.join(RAIZ, fichero)), fichero).toBe(true);
      for (const f of t?.respaldo ?? [])
        expect(normaEspacios(leer(fichero)), `${fichero}: ${f}`).toContain(normaEspacios(f));
    }
    expect(Object.keys(TEXTOS_MODELOS).sort()).toEqual(r.modelos.map((m) => m.modelo).sort());
  });

  it('los modelos sin salidas en /data lo dicen en su fiabilidad', () => {
    for (const m of r.modelos.filter((x) => x.ficheros === 0))
      expect(TEXTOS_MODELOS[m.modelo]?.fiabilidad, m.modelo).toMatch(
        /No tiene ficheros ni metadatos/,
      );
  });

  it('las descripciones de los modelos no se tocan: la página no copia sus cifras', () => {
    const textos = Object.values(TEXTOS_MODELOS).flatMap((t) => [
      t.responde,
      t.fiabilidad,
      ...t.hipotesis,
      ...t.limites,
    ]);
    for (const t of textos) expect(t).not.toMatch(/\d/);
  });
});

describe('sin cifras escritas a mano en los textos de la página', () => {
  const fuentes = readdirSync(path.join(RAIZ, DIR))
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && !f.endsWith('.d.ts'))
    .map((f) => `${DIR}/${f}`);
  // `respaldo.ts` contiene rutas de ficheros (con cifras en los nombres); sus textos visibles se
  // comprueban aparte.
  const ficheros = fuentes.filter((f) => !f.endsWith('/respaldo.ts'));
  it('hay ficheros que revisar', () => {
    expect(ficheros.length).toBeGreaterThanOrEqual(12);
  });
  it.each(ficheros)('%s', (ruta) => {
    expect(textosConCifras(ruta)).toEqual([]);
  });
  it('los textos visibles de `respaldo.ts` no tienen dígitos', () => {
    for (const lista of Object.values(RESPALDO))
      for (const e of lista) expect(e.para).not.toMatch(/\d/);
    for (const l of LIMITES) expect(l.texto).not.toMatch(/\d/);
  });
  it('la entrada de la sección en `secciones.ts` no tiene dígitos y ya no está en construcción', () => {
    const s = SECCIONES.find((x) => x.slug === 'metodologia');
    expect(s).toBeDefined();
    const texto = [s?.titulo, s?.tituloNav, s?.resumen, ...(s?.previsto ?? [])].join(' ');
    expect(texto).not.toMatch(/\d/);
    expect(texto).not.toMatch(/construcci/i);
    expect(leer(`${DIR}/Pagina.tsx`)).not.toMatch(/UnderConstruction/);
  });
});

describe('neutralidad de los textos propios', () => {
  // Se aplican la lista general de valoración y la de veredicto. La lista propia de «Reformas» queda
  // fuera: incluye «congelad», y «legislación congelada» es el término técnico de los modelos.
  const textos = [
    ...Object.values(TEXTOS_MODELOS).flatMap((t) => [
      t.responde,
      t.fiabilidad,
      ...t.hipotesis,
      ...t.limites,
    ]),
    ...Object.values(RESPALDO).flatMap((l) => l.map((e) => e.para)),
    ...LIMITES.map((l) => l.texto),
    ...(SECCIONES.find((s) => s.slug === 'metodologia')?.previsto ?? []),
    SECCIONES.find((s) => s.slug === 'metodologia')?.resumen ?? '',
  ];
  it('modelos, respaldo, límites y entrada de la sección', () => {
    for (const t of textos) {
      expect(valoracionesEn(t), t).toEqual([]);
      expect(veredictosEn(t), t).toEqual([]);
    }
  });
  it('el código de la página no tiene términos de valoración en sus textos', () => {
    const codigo = readdirSync(path.join(RAIZ, DIR))
      .filter((f) => /\.tsx$/.test(f) && !/\.test\.tsx$/.test(f))
      .map((f) => leer(`${DIR}/${f}`))
      .join('\n')
      .replace(/from\s+'[^']*'/g, '')
      .replace(/import\s+'[^']*'/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(valoracionesEn(codigo)).toEqual([]);
    expect(veredictosEn(codigo)).toEqual([]);
  });
});

describe('afirmaciones, pendientes y documentación', () => {
  interface ClaimWeb {
    id: string;
    datos: string[];
    fuentes: { url: string }[];
    revisionActuarial?: string;
    preguntaActuarial?: string;
    respuestaActuarial?: string;
  }
  const web = (JSON.parse(leer('docs/claims-web.json')) as { claims: ClaimWeb[] }).claims.filter(
    (c) => c.id.startsWith('web-metodologia-'),
  );

  it('claims-web.json registra las afirmaciones de la página, cada una con dato, fuente y revisión', () => {
    expect(web.length).toBeGreaterThanOrEqual(3);
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
        expect(existsSync(path.join(RAIZ, 'data', fichero)), ref).toBe(true);
        const json = JSON.parse(leer(`data/${fichero}`)) as Record<string, unknown>;
        const ids = ['data', 'series', 'normas'].flatMap((k) =>
          ((json[k] as { id: string }[] | undefined) ?? []).map((e) => e.id),
        );
        if (json['tipo'] === 'proyeccion') ids.push(json['id'] as string);
        expect(ids, ref).toContain(id);
      }
  });

  it('claims.json recoge las mismas afirmaciones', () => {
    const todas = RegistroAfirmaciones.parse(JSON.parse(leer('docs/claims.json')));
    const ids = new Set(todas.claims.map((c) => c.id));
    for (const c of web) expect(ids.has(c.id), c.id).toBe(true);
  });

  it('el número de pendientes no supera el tope, cada una va por separado y con su pregunta', () => {
    const todas = RegistroAfirmaciones.parse(JSON.parse(leer('docs/claims.json')));
    const pendientes = todas.claims.filter(
      (c) => (c.revisionActuarial ?? todas.revisionActuarialPorDefecto) === 'pendiente',
    );
    expect(pendientes.length).toBeLessThanOrEqual(70);
    expect(new Set(pendientes.map((p) => p.id)).size).toBe(pendientes.length);
    for (const c of pendientes) expect(c.preguntaActuarial?.length ?? 0, c.id).toBeGreaterThan(80);
    expect(r.afirmaciones.pendientes.length).toBe(pendientes.length);
  });

  it('FUENTES.md registra la fuente de los recuentos', () => {
    expect(leer('docs/FUENTES.md')).toContain('src/engine/metodologia.ts');
  });

  it('el inventario, el estado de la fase y las decisiones existen y los huecos constan en los pendientes', () => {
    const inventario = leer('docs/INVENTARIO_METODOLOGIA.md');
    for (const t of [
      'De dónde salen los datos',
      'Cómo se comprueban',
      'Confianza y revisión actuarial',
      'Lecturas del motor',
      'modelos de proyección',
      'Neutralidad y verificación',
      'Qué no hace esta web',
      'Cómo reproducirlo',
    ])
      expect(inventario, t).toContain(t);
    expect(existsSync(path.join(RAIZ, 'docs/ESTADO_FASE_METODOLOGIA.md'))).toBe(true);
    expect(leer('docs/DECISIONES.md')).toMatch(/## Fase «Metodología»/);
    const pendiente = leer('docs/PENDIENTE_DATOS.md');
    expect(pendiente).toMatch(/## Fase «Metodología»/);
    expect(pendiente).toMatch(/definición general/);
    expect(pendiente).toMatch(/primera y la segunda tanda/);
  });
});
