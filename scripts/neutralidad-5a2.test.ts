// @vitest-environment node
/** Neutralidad verificable del código y de los textos de sección (Fase 5-A2). */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buscarSeccion } from '../src/modules/secciones.ts';
import { valoracionesEn } from './lib/valoraciones.ts';

describe('el detector de valoraciones', () => {
  it('encuentra una palabra de la lista y respeta las demás', () => {
    expect(valoracionesEn('El sistema es insostenible')).toEqual(['insostenible']);
    expect(valoracionesEn('Un AGUJERO en las cuentas y un rescate')).toEqual([
      'agujero',
      'rescate',
    ]);
    expect(valoracionesEn('Ese pozo sin fondo')).toEqual(['pozo']);
    expect(valoracionesEn('Protocolo de Déficit Excesivo')).toEqual([]);
    expect(valoracionesEn('El valor del Fondo equivale a varios meses de transferencias')).toEqual(
      [],
    );
  });
});

describe.each(['hucha', 'financiacion-y-deficit'] as const)(
  'neutralidad de la sección «%s»',
  (slug) => {
    it('el resumen y los contenidos de la sección no contienen palabras de valoración', () => {
      const seccion = buscarSeccion(slug);
      expect(
        valoracionesEn([seccion.titulo, seccion.resumen, ...seccion.previsto].join(' ')),
      ).toEqual([]);
    });
  },
);

describe('neutralidad del código de las páginas', () => {
  const RAIZ = path.resolve(import.meta.dirname, '..');
  const directorios = [
    'src/modules/hucha',
    'src/modules/financiacion-y-deficit',
    'src/modules/historico',
  ];
  const ficheros = directorios.flatMap((dir) =>
    readdirSync(path.join(RAIZ, dir))
      .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
      .map((f) => `${dir}/${f}`),
  );

  it('hay ficheros que revisar', () => {
    expect(ficheros.length).toBeGreaterThan(15);
  });

  it.each(ficheros)('%s no contiene palabras de valoración en sus textos', (ruta) => {
    const fuente = readFileSync(path.join(RAIZ, ruta), 'utf8');
    // Solo se revisa el texto entre comillas, plantillas y JSX, no los identificadores.
    const textos = [
      ...fuente.matchAll(/'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`|>([^<>{}]+)</g),
    ].map((m) => m[1] ?? m[2] ?? m[3] ?? '');
    expect(valoracionesEn(textos.join('\n'))).toEqual([]);
  });
});
