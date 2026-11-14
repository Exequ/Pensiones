/**
 * Detector de cifras escritas a mano en los textos visibles de los componentes (regla a de
 * CLAUDE.md): cadenas, plantillas y texto JSX. Se usa en los tests de las páginas históricas y de
 * la página «Proyecciones». Nombres de propiedad, atributos no visibles (`className`, `id`…) y
 * importaciones no cuentan.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const RAIZ = path.resolve(import.meta.dirname, '../..');
const leer = (ruta: string) => readFileSync(path.join(RAIZ, ruta), 'utf8');

/** Cifras escritas a mano en textos visibles de las páginas (cadenas, plantillas y texto JSX). */
export function textosConCifras(ruta: string): string[] {
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
