/**
 * Voz de la web (fase R1, `docs/GUIA_DE_VOZ.md`): el detector de expresiones de proyecto interno, su
 * lista (`scripts/lib/voz.ts`, único módulo, como la lista de términos de valoración) y la zona permitida. Las rutas
 * renderizadas se recorren en `src/app/voz-rutas.test.tsx`; aquí, además, las cadenas de texto del
 * código de la web, que cubren los estados que el recorrido de rutas no alcanza.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { EXPRESIONES_PROHIBIDAS, ZONA_PERMITIDA, vozEn } from './lib/voz.ts';

describe('detector de expresiones de proyecto interno', () => {
  it('detecta cada expresión prohibida de la lista (prueba de sensibilidad)', () => {
    const muestras: Record<string, string> = {
      'descargado/a(s)': 'Los ficheros descargados no lo precisan.',
      'la descarga (de los ficheros)': 'La descarga está anotada como pendiente.',
      repositorio: 'Consta en el repositorio.',
      repo: 'Ya está en el repo.',
      GitHub: 'Se publica en GitHub.',
      commit: 'Cada commit ejecuta las pruebas.',
      claims: 'El catálogo de claims.',
      Claude: 'Redactado con Claude.',
      'fichero(s) de datos o de salida': 'El fichero de datos.',
      'ruta data/…': 'Véase data/sistema/pensiones.json y /data.',
      '.ts': 'Véase motor.ts',
      'ruta docs/…, modelos/…, src/… o scripts/…': 'Véase docs/FUENTES.',
      '.json': 'cronologia.json',
      '.md': 'README.md',
      revisor: 'Según el revisor, …',
      'revisión actuarial': 'Pendiente de revisión actuarial.',
      'revisión interna': 'Tras la revisión interna.',
      'Literal de la fuente': 'Literal de la fuente: «…»',
    };
    expect(Object.keys(muestras).sort()).toEqual(
      EXPRESIONES_PROHIBIDAS.map((e) => e.nombre).sort(),
    );
    for (const { nombre } of EXPRESIONES_PROHIBIDAS) {
      const hallados = vozEn(muestras[nombre] ?? '').map((h) => h.nombre);
      expect(hallados, nombre).toContain(nombre);
    }
    // Variantes con tilde y sin ella, singular y plural.
    expect(vozEn('texto Descargado').length).toBe(1);
    expect(vozEn('revision actuarial').length).toBe(1);
    expect(vozEn('Revisión Actuarial').length).toBe(1);
    expect(vozEn('los textos descargados y la norma descargada').length).toBe(2);
  });

  it('no marca el lenguaje que sí es de publicación', () => {
    expect(vozEn('Según el INE, no consta en las fuentes consultadas.')).toEqual([]);
    expect(
      vozEn('Fuente: título (organismo) · descargado el 2026-11-11 · confianza: alta'),
    ).toEqual([]);
  });

  it('la lista prohibida y la zona permitida viven en scripts/lib/voz.ts', () => {
    expect(EXPRESIONES_PROHIBIDAS.length).toBeGreaterThan(10);
    expect(ZONA_PERMITIDA.length).toBeGreaterThan(0);
  });
});

describe('zona permitida', () => {
  it('es una sola, la página «Metodología», con el motivo declarado (la prueba de rutas comprueba que sigue renderizándose)', () => {
    expect(ZONA_PERMITIDA.map((e) => e.ruta)).toEqual(['/metodologia']);
    for (const e of ZONA_PERMITIDA) {
      expect(e.motivo.length).toBeGreaterThan(40);
      expect(e.familias.length).toBeGreaterThan(0);
    }
  });
});

/**
 * Cadenas de código que solo se pintan en estados que el recorrido de rutas no alcanza (los avisos del
 * motor tras calcular, las limitaciones de cada prestación…). Se recorren los literales de texto del
 * código de la web, sin los comentarios, y se aplica la misma lista.
 */
const RAIZ = path.resolve(import.meta.dirname, '..');

/** Ficheros que no pintan texto: listas de ficheros de datos, esquemas, constantes técnicas. */
const NO_PINTAN = [
  /\/ficheros\.ts$/,
  /\/normas\.ts$/,
  /\/esquema-datos\.ts$/,
  /\/parametros-datos\.ts$/,
  /\/engine\/lecturas\.ts$/,
  // La página «Metodología» es la zona permitida; su texto lo recorre la prueba de rutas.
  /\/metodologia\//,
  /\/engine\/metodologia\.ts$/,
  // Línea de fuente: la sustituye la fase R2.
  /\/components\/SourceLine\.tsx$/,
  // Entradas de las secciones: las recorre la prueba de rutas (la de «Metodología» va en su zona).
  /\/modules\/secciones\.ts$/,
  // Motores y módulos que la web no publica o que solo pintan errores de desarrollo.
  /\/engine\/(mei|no-contributivas)\//,
];

function ficherosDeCodigo(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = path.join(dir, nombre);
    if (statSync(ruta).isDirectory()) return ficherosDeCodigo(ruta);
    return /\.(ts|tsx)$/.test(ruta) && !/\.test\.|\/test\//.test(ruta) ? [ruta] : [];
  });
}

/** Literales de texto de un fichero (no los de `import`, `new Error(…)` ni los de `.json#` de referencias). */
export function literalesDe(ruta: string, comoTsx = false): { linea: number; texto: string }[] {
  const fuente = ts.createSourceFile(
    ruta,
    readFileSync(ruta, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    comoTsx || ruta.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const salida: { linea: number; texto: string }[] = [];
  const visitar = (n: ts.Node): void => {
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) return;
    if (ts.isNewExpression(n) && n.expression.getText() === 'Error') return;
    if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword) return;
    let texto: string | undefined;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) texto = n.text;
    else if (ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) texto = n.text;
    else if (ts.isJsxText(n)) texto = n.text;
    if (texto !== undefined && texto.trim() !== '')
      salida.push({ linea: fuente.getLineAndCharacterOfPosition(n.getStart()).line + 1, texto });
    ts.forEachChild(n, visitar);
  };
  visitar(fuente);
  return salida;
}

describe('cadenas de texto del código de la web', () => {
  it('el detector de literales encuentra cadenas, plantillas y texto JSX, y descarta los errores de desarrollo', () => {
    const dir = path.join(RAIZ, 'scripts/fixtures');
    expect(statSync(dir).isDirectory()).toBe(true);
    const ficticio = path.join(dir, 'voz-literales.txt');
    const literales = literalesDe(ficticio, true).map((l) => l.texto);
    expect(literales).toContain('Consta en el repositorio.');
    expect(literales.some((t) => t.includes('en el fichero de datos'))).toBe(true);
    expect(literales.some((t) => t.includes('texto JSX con data/x.json'))).toBe(true);
    expect(literales.join(' ')).not.toContain('error de desarrollo');
  });

  it('ninguna cadena de texto de los motores y de los módulos usa lenguaje de proyecto interno', () => {
    const hallazgos: string[] = [];
    for (const raiz of [
      'src/engine',
      'src/modules',
      'src/app',
      'src/components',
      'src/config.ts',
    ]) {
      const abs = path.join(RAIZ, raiz);
      const ficheros = statSync(abs).isDirectory() ? ficherosDeCodigo(abs) : [abs];
      for (const f of ficheros) {
        if (NO_PINTAN.some((p) => p.test(f))) continue;
        for (const { linea, texto } of literalesDe(f)) {
          // Referencias a datos (`carpeta/fichero.json#id`): identificadores de código, no texto.
          if (!/\s/.test(texto.trim()) && /\.json/.test(texto)) continue;
          for (const h of vozEn(texto, [], 25))
            hallazgos.push(
              `${path.relative(RAIZ, f)}:${String(linea)} ${h.nombre}: …${h.contexto}…`,
            );
        }
      }
    }
    expect(hallazgos).toEqual([]);
  });
});
