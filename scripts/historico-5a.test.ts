/**
 * Fase 5-A: garantías sobre las páginas históricas.
 *  1. Los ficheros de /data que usan las páginas tienen source.url, fetchedAt y confidence.
 *  2. Las páginas solo leen /data a través de los módulos `datos-*.ts`, y estos solo importan los
 *     ficheros que declaran.
 *  3. Ningún texto visible de las páginas lleva cifras escritas a mano (regla a de CLAUDE.md).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { ArchivoDatos, ArchivoTabla, ArchivoCronologia } from '../src/engine/esquema-datos.ts';
import {
  FICHEROS_COTIZANTES,
  FICHEROS_FINANCIACION,
  FICHEROS_HUCHA,
} from '../src/modules/historico/ficheros.ts';

const RAIZ = path.resolve(import.meta.dirname, '..');
const leer = (ruta: string) => readFileSync(path.join(RAIZ, ruta), 'utf8');

const TODOS = [...new Set([...FICHEROS_COTIZANTES, ...FICHEROS_FINANCIACION, ...FICHEROS_HUCHA])];
const confianzas = ['alta', 'media', 'baja'];

describe('procedencia de los ficheros que usan las páginas', () => {
  it.each(TODOS)('%s tiene fuente, fecha de descarga y confianza en cada dato', (ruta) => {
    const json: unknown = JSON.parse(leer(ruta));
    const tipo = (json as { tipo?: string }).tipo;
    if (tipo === 'tabla') {
      const t = ArchivoTabla.parse(json);
      expect(t.source.url).toMatch(/^https?:\/\//);
      expect(t.fetchedAt).toBeTruthy();
      expect(confianzas).toContain(t.confidence);
      // La tabla va acompañada de su CSV hermano.
      expect(existsSync(path.join(RAIZ, ruta.replace(/\.json$/, '.csv')))).toBe(true);
    } else if (tipo === 'cronologia') {
      const c = ArchivoCronologia.parse(json);
      for (const n of c.normas) {
        expect(n.source.url).toMatch(/^https?:\/\//);
        expect(n.fetchedAt).toBeTruthy();
        expect(confianzas).toContain(n.confidence);
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

const DIR_HISTORICO = 'src/modules/historico';
const MODULOS = [
  'src/modules/cotizantes-y-pensionistas',
  'src/modules/financiacion-y-deficit',
  'src/modules/hucha',
  DIR_HISTORICO,
];

function fuentesDe(dir: string): string[] {
  return readdirSync(path.join(RAIZ, dir))
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
    .map((f) => `${dir}/${f}`);
}

describe('las páginas leen /data solo a través de los módulos de datos', () => {
  const importesDeData = (ruta: string) =>
    [...leer(ruta).matchAll(/from\s+'([^']*\/data\/[^']+)'/g)].map((m) => m[1]!);

  it('ningún componente de página importa /data directamente', () => {
    for (const dir of MODULOS) {
      for (const ruta of fuentesDe(dir)) {
        if (/\/datos-[a-z]+\.ts$/.test(ruta)) continue;
        expect(importesDeData(ruta), ruta).toEqual([]);
      }
    }
  });

  it.each([
    ['datos-cotizantes.ts', FICHEROS_COTIZANTES],
    ['datos-financiacion.ts', FICHEROS_FINANCIACION],
    ['datos-hucha.ts', FICHEROS_HUCHA],
  ] as const)('%s importa exactamente los ficheros que declara', (nombre, declarados) => {
    const importados = importesDeData(`${DIR_HISTORICO}/${nombre}`)
      .map((r) =>
        r
          .replace(/^(\.\.\/)+/, '')
          .replace(/\?raw$/, '')
          .replace(/\.csv$/, '.json'),
      )
      .sort();
    expect([...new Set(importados)]).toEqual([...declarados].sort());
  });
});

/** Cifras escritas a mano en textos visibles de las páginas (cadenas, plantillas y texto JSX). */
function textosConCifras(ruta: string): string[] {
  const fuente = ts.createSourceFile(
    ruta,
    leer(ruta),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const hallazgos: string[] = [];
  const ATRIBUTOS_NO_VISIBLES = new Set([
    'className',
    'id',
    'aria-labelledby',
    'lang',
    'key',
    'to',
    'href',
  ]);
  const revisar = (texto: string) => {
    // «$1» en un reemplazo de expresión regular no es una cifra visible.
    if (/\d/.test(texto.replace(/\$\d/g, ''))) hallazgos.push(texto.trim());
  };
  const visitar = (nodo: ts.Node): void => {
    if (ts.isImportDeclaration(nodo) || ts.isExportDeclaration(nodo)) return;
    if (ts.isStringLiteral(nodo) || ts.isNoSubstitutionTemplateLiteral(nodo)) {
      const padre = nodo.parent;
      const esClave =
        (ts.isPropertyAssignment(padre) && padre.name === nodo) ||
        ts.isElementAccessExpression(padre);
      const esAtributoNoVisible =
        ts.isJsxAttribute(padre) && ATRIBUTOS_NO_VISIBLES.has(padre.name.getText(fuente));
      if (!esClave && !esAtributoNoVisible) revisar(nodo.text);
    } else if (ts.isTemplateHead(nodo) || ts.isTemplateMiddle(nodo) || ts.isTemplateTail(nodo)) {
      revisar(nodo.text);
    } else if (ts.isJsxText(nodo)) {
      revisar(nodo.text);
    }
    ts.forEachChild(nodo, visitar);
  };
  visitar(fuente);
  return hallazgos;
}

describe('sin cifras escritas a mano en los textos de las páginas', () => {
  // `datos-*.ts` y `ficheros.ts` solo contienen rutas e identificadores de /data; `grafico-series.ts`, guiones SVG.
  const ficheros = MODULOS.flatMap(fuentesDe).filter(
    (r) =>
      !/\/datos-[a-z]+\.ts$/.test(r) &&
      !r.endsWith('/grafico-series.ts') &&
      !r.endsWith('/ficheros.ts'),
  );

  it('hay ficheros que revisar', () => {
    expect(ficheros.length).toBeGreaterThan(10);
  });

  it.each(ficheros)('%s', (ruta) => {
    expect(textosConCifras(ruta)).toEqual([]);
  });

  it('el detector encuentra una cifra en un texto de prueba', () => {
    // Comprobación del propio detector sobre un fichero temporal en memoria.
    const casos = ts.createSourceFile(
      'x.tsx',
      "const a = 'hay 12 casos'; const b = <p>año 2020</p>;",
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    let n = 0;
    const visitar = (nodo: ts.Node): void => {
      if ((ts.isStringLiteral(nodo) || ts.isJsxText(nodo)) && /\d/.test(nodo.text)) n++;
      ts.forEachChild(nodo, visitar);
    };
    visitar(casos);
    expect(n).toBe(2);
  });
});
