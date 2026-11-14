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

  it('detecta también los términos añadidos en Ajustes actuariales 2', () => {
    expect(valoracionesEn('Una amenaza para las cuentas')).toEqual(['amenaza']);
    expect(valoracionesEn('Una cifra desmesurada y un gasto desbocado').sort()).toEqual([
      'desbocad',
      'desmesurad',
    ]);
    expect(valoracionesEn('Un modelo ejemplar')).toEqual(['ejemplar']);
    expect(valoracionesEn('La razón entre afiliados y pensiones por pensionista')).toEqual([]);
  });
});

describe('términos de alarma o de juicio sobre proyecciones (Fase 5-B1)', () => {
  it.each([
    ['El sistema se encamina al colapso', ['colaps']],
    ['Una situación insostenible, de insostenibilidad', ['insostenible', 'insostenibilidad']],
    ['Un resultado preocupante y una preocupación', ['preocupante', 'preocupacion']],
    ['Un escenario catastrófico', ['catastrof']],
    ['El hundimiento es inevitable', ['hundimiento', 'inevitable']],
    ['Un futuro sombrío y alarmista', ['sombri', 'alarmist']],
    ['Un resultado tranquilizador y alentador', ['tranquiliz', 'alentador']],
  ])('detecta «%s»', (texto, esperadas) => {
    const halladas = valoracionesEn(texto);
    for (const e of esperadas) expect(halladas).toContain(e);
  });

  it('no marca la descripción neutral de una proyección', () => {
    expect(
      valoracionesEn(
        'El modelo calcula con la legislación congelada y supuestos explícitos; la diferencia con el INE es de unas décimas.',
      ),
    ).toEqual([]);
    expect(
      valoracionesEn('Sostenibilidad financiera del sistema y estabilidad de las cuentas'),
    ).toEqual([]);
  });
});

describe('términos de juicio sobre proyecciones financieras (Fase 5-B2)', () => {
  it.each([
    ['Es un aviso de tensión para el sistema', ['aviso de tension']],
    ['El Fondo se agotaría poco después', ['agotaria']],
    ['M4 proyecta un coste más alto: resulta más caro', ['coste mas alto', 'resulta mas caro']],
    ['Un déficit estructural creciente', ['deficit estructural']],
    ['Una señal de alarma y un gasto elevado', ['senal de alarma', 'gasto elevado']],
    ['Un sistema sin margen y al borde de la sobrecarga', ['sin margen', 'sobrecarga']],
  ])('detecta «%s»', (texto, esperadas) => {
    const halladas = valoracionesEn(texto);
    for (const e of esperadas) expect(halladas).toContain(e);
  });

  it('no marca las comparaciones calculadas con las que se describe el resultado de un modelo', () => {
    expect(
      valoracionesEn(
        'A fin del último año, el valor del Fondo es menor que la disposición de ese año; el gasto sobre el PIB del modelo crece más que el del Ageing Report.',
      ),
    ).toEqual([]);
    expect(valoracionesEn('Financiación adicional: lo que el Fondo no cubre')).toEqual([]);
    // La condición literal de la norma no es una valoración; la expresión suelta, sí.
    expect(
      valoracionesEn('solo para pensiones contributivas en déficit estructural, con límite anual'),
    ).toEqual([]);
    expect(
      valoracionesEn('una cifra más alta no significa un sistema más caro en términos absolutos'),
    ).toEqual([]);
    expect(
      valoracionesEn(
        'Saldo no financiero, saldo sin transferencias y cotizaciones menos pensiones',
      ),
    ).toEqual([]);
  });
});

describe.each([
  'hucha',
  'financiacion-y-deficit',
  'cotizantes-y-pensionistas',
  'proyecciones',
] as const)('neutralidad de la sección «%s»', (slug) => {
  it('el resumen y los contenidos de la sección no contienen palabras de valoración', () => {
    const seccion = buscarSeccion(slug);
    expect(
      valoracionesEn([seccion.titulo, seccion.resumen, ...seccion.previsto].join(' ')),
    ).toEqual([]);
  });
});

describe('neutralidad del código de las páginas', () => {
  const RAIZ = path.resolve(import.meta.dirname, '..');
  const directorios = [
    'src/modules/hucha',
    'src/modules/financiacion-y-deficit',
    'src/modules/cotizantes-y-pensionistas',
    'src/modules/historico',
    'src/modules/proyecciones',
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
