// @vitest-environment node
/**
 * Reglas de las cajas «Interpretación» (fase RI, `docs/INTERPRETACIONES.md`): los registros reales
 * las cumplen y un registro de prueba que viola cada regla falla (prueba de sensibilidad).
 */
import { describe, expect, it } from 'vitest';
import {
  ESTADOS_REVISION_INTERPRETACION,
  Interpretacion,
  marcadoresEn,
} from '../src/engine/interpretaciones.ts';
import {
  infraccionesDe,
  REGLAS_INTERPRETACION,
  type ReglaInterpretacion,
} from './lib/interpretaciones.ts';
import { contextoDelDisco, registrosDelDisco } from './lib/interpretaciones-contexto.ts';
import { politicaEn, TERMINOS_POLITICOS } from './lib/politica.ts';

const ctx = contextoDelDisco();
const registros = registrosDelDisco().map(({ fichero, json }) => ({
  fichero,
  r: Interpretacion.parse(json),
}));

/** Registro de una página de contenido que cumple todas las reglas (no se guarda en ningún sitio). */
const VALIDO = Interpretacion.parse({
  id: 'prueba-valida',
  tipo: 'autor',
  titulo: 'Prueba',
  pagina: '/proyecciones',
  ancla: 'grafico-de-prueba',
  texto:
    'El gasto llegaría a {{gasto}} y eso sería una «tensión financiera» con el criterio de abajo.',
  marcadores: { gasto: { ref: 'data/parametros/pension-maxima.json#2026', formato: 'euros' } },
  criterios: [{ termino: 'tensión financiera', definicion: 'Gastos por encima de los ingresos.' }],
  datosQueLaSostienen: ['data/parametros/pension-maxima.json#2026'],
  grado: 'juicio-profesional',
  estadoRevision: 'pendiente-de-revision',
  fechaRedaccion: '2026-11-20',
});
const ATRIBUCION = {
  autores: 'Autoría de prueba',
  anio: 2024,
  titulo: 'Estudio de prueba',
  publicacion: 'Revista de prueba',
  dato: {
    value: 3,
    unit: 'puntos',
    period: '2050',
    source: {
      title: 'Estudio de prueba',
      publisher: 'Universidad de prueba',
      url: 'https://doi.org/10.0000/prueba',
    },
    fetchedAt: '2026-11-20',
    confidence: 'media',
  },
};
const ATRIBUIDA = Interpretacion.parse({
  ...VALIDO,
  id: 'prueba-atribuida',
  tipo: 'atribuida',
  texto: 'Según el estudio, la cifra sería {{cifra}}.',
  marcadores: { cifra: { atribucion: true, formato: 'numero' } },
  criterios: [],
  atribucion: ATRIBUCION,
  grado: 'respaldada',
});

const reglas = (r: Interpretacion): ReglaInterpretacion[] => [
  ...new Set(infraccionesDe(r, ctx).map((f) => f.regla)),
];
const con = (base: Interpretacion, cambios: Record<string, unknown>): Interpretacion =>
  Interpretacion.parse({ ...base, ...cambios });

describe('registros de src/contenido/interpretaciones', () => {
  it('cada registro cumple el esquema, se llama como su id y cumple todas las reglas', () => {
    expect(registros.length).toBeGreaterThan(0);
    for (const { fichero, r } of registros) {
      expect(fichero).toBe(`${r.id}.json`);
      expect(infraccionesDe(r, ctx), r.id).toEqual([]);
    }
  });

  it('hoy solo hay los dos ejemplos (uno de cada tipo), marcados como ejemplo y solo para /diseno', () => {
    expect(registros.map(({ r }) => [r.id, r.tipo, r.ejemplo, r.pagina])).toEqual([
      ['ejemplo-atribuida', 'atribuida', true, '/diseno'],
      ['ejemplo-autor', 'autor', true, '/diseno'],
    ]);
  });

  it('el estado de revisión empieza en «pendiente de revisión»', () => {
    expect(ESTADOS_REVISION_INTERPRETACION[0]).toBe('pendiente-de-revision');
    for (const { r } of registros) expect(r.estadoRevision).toBe('pendiente-de-revision');
  });

  it('los registros válidos de prueba pasan todas las reglas', () => {
    expect(infraccionesDe(VALIDO, ctx)).toEqual([]);
    expect(infraccionesDe(ATRIBUIDA, ctx)).toEqual([]);
  });
});

describe('prueba de sensibilidad: un registro que viola cada regla falla', () => {
  const casos: [ReglaInterpretacion, Interpretacion][] = [
    ['criterio-valoracion', con(VALIDO, { criterios: [] })],
    ['politica', con(VALIDO, { texto: `${VALIDO.texto} Lo dice el programa electoral del PSOE.` })],
    ['cifras', con(VALIDO, { texto: `${VALIDO.texto} En 2050 será del 15 %.` })],
    ['marcadores', con(VALIDO, { texto: `${VALIDO.texto} Y {{otra}}.` })],
    ['datos', con(VALIDO, { datosQueLaSostienen: ['data/parametros/no-existe.json#x'] })],
    [
      'atribucion',
      con(ATRIBUIDA, {
        atribucion: {
          ...ATRIBUCION,
          dato: {
            ...ATRIBUCION.dato,
            source: { ...ATRIBUCION.dato.source, url: 'https://x.com/alguien/status/1' },
          },
        },
      }),
    ],
    ['redaccion-atribuida', con(ATRIBUIDA, { texto: 'La cifra sería {{cifra}}.' })],
    [
      'proyeccion',
      con(VALIDO, { proyeccion: { hipotesis: 'Legislación congelada.', sensibilidades: true } }),
    ],
    ['voz', con(VALIDO, { texto: `${VALIDO.texto} Consta en el repositorio.` })],
    ['ejemplo', con(VALIDO, { ejemplo: true })],
  ];

  it('hay un caso por regla', () => {
    expect(casos.map(([regla]) => regla).sort()).toEqual([...REGLAS_INTERPRETACION].sort());
  });

  for (const [regla, r] of casos) {
    it(`${regla}: falla`, () => {
      expect(reglas(r)).toContain(regla);
    });
  }

  it('atribución: también fallan los apuntes de clase, el dominio de ejemplo fuera de un ejemplo y la caja del autor con cifra atribuida', () => {
    const apuntes = con(ATRIBUIDA, {
      atribucion: { ...ATRIBUCION, titulo: 'Apuntes de Previsión Social, tema 3' },
    });
    expect(reglas(apuntes)).toContain('atribucion');
    const ejemplo = con(ATRIBUIDA, {
      atribucion: {
        ...ATRIBUCION,
        dato: {
          ...ATRIBUCION.dato,
          source: { ...ATRIBUCION.dato.source, url: 'https://example.org/x' },
        },
      },
    });
    expect(reglas(ejemplo)).toContain('atribucion');
    expect(
      reglas(con(VALIDO, { marcadores: { gasto: { atribucion: true, formato: 'numero' } } })),
    ).toContain('marcadores');
  });

  it('el esquema rechaza una atribuida sin atribución, una del autor con atribución, una fuente atribuida en «alta» y unos datos vacíos', () => {
    expect(Interpretacion.safeParse({ ...ATRIBUIDA, atribucion: undefined }).success).toBe(false);
    expect(Interpretacion.safeParse({ ...VALIDO, atribucion: ATRIBUCION }).success).toBe(false);
    expect(
      Interpretacion.safeParse({
        ...ATRIBUIDA,
        atribucion: { ...ATRIBUCION, dato: { ...ATRIBUCION.dato, confidence: 'alta' } },
      }).success,
    ).toBe(false);
    expect(Interpretacion.safeParse({ ...VALIDO, datosQueLaSostienen: [] }).success).toBe(false);
    expect(
      Interpretacion.safeParse({
        ...ATRIBUIDA,
        atribucion: {
          ...ATRIBUCION,
          dato: { ...ATRIBUCION.dato, source: { title: 'x', publisher: 'y' } },
        },
      }).success,
    ).toBe(false);
  });

  it('las cifras de los criterios y de la hipótesis también entran por marcadores', () => {
    expect(
      reglas(
        con(VALIDO, {
          criterios: [{ termino: 'tensión financiera', definicion: 'Déficit de 3 años.' }],
        }),
      ),
    ).toContain('cifras');
    expect(marcadoresEn('a {{uno}} b {{dos}}')).toEqual(['uno', 'dos']);
  });
});

describe('términos políticos (scripts/lib/politica.ts)', () => {
  it('marca partidos, programas, voto y propuestas', () => {
    expect(politicaEn('El PP y el PSOE')).toEqual(['psoe', 'pp']);
    expect(politicaEn('según el programa electoral')).toContain('programa electoral');
    expect(politicaEn('hay que votar en las elecciones')).toEqual(
      expect.arrayContaining(['votar', 'elecciones']),
    );
    expect(politicaEn('El Gobierno debería subir las pensiones')).toContain('el gobierno deberia');
    expect(politicaEn('una propuesta de Sumar')).toContain('sumar');
  });

  it('no marca las palabras corrientes que coinciden con nombres de partidos', () => {
    for (const t of [
      'Al sumar las pensiones',
      'Podemos ver la serie',
      'Los ciudadanos',
      'la pp. 3',
      'derecho a la pensión',
    ])
      expect(politicaEn(t), t).toEqual([]);
    expect(TERMINOS_POLITICOS.length).toBeGreaterThan(30);
  });
});

describe('categoría «interpretacion» de docs/claims-web.json (esquema de afirmaciones)', () => {
  const base = {
    id: 'web-interpretacion-de-prueba',
    texto: 'Afirmación de prueba.',
    ubicacion: 'Página de prueba',
    datos: ['parametros/pension-maxima.json#2026'],
    fuentes: [{ title: 'Fuente', publisher: 'BOE', url: 'https://www.boe.es/' }],
    fetchedAt: '2026-11-20',
    estado: 'pendiente',
    revisionActuarial: 'no-requiere',
  };
  it('admite la categoría con sus campos y la exige completa', async () => {
    const { Afirmacion } = await import('../src/engine/esquema-datos.ts');
    const completa = {
      ...base,
      categoria: 'interpretacion',
      interpretacion: 'prueba-valida',
      datosQueLaSostienen: ['data/parametros/pension-maxima.json#2026'],
      estadoRevisionInterpretacion: 'pendiente-de-revision',
    };
    expect(Afirmacion.safeParse(completa).success).toBe(true);
    expect(Afirmacion.safeParse({ ...completa, atribucion: ATRIBUCION }).success).toBe(true);
    expect(Afirmacion.safeParse({ ...completa, datosQueLaSostienen: [] }).success).toBe(false);
    expect(
      Afirmacion.safeParse({ ...completa, estadoRevisionInterpretacion: undefined }).success,
    ).toBe(false);
    expect(
      Afirmacion.safeParse({
        ...completa,
        atribucion: { ...ATRIBUCION, dato: { ...ATRIBUCION.dato, confidence: 'alta' } },
      }).success,
    ).toBe(false);
    // Los campos de interpretación solo valen en esa categoría; las afirmaciones de siempre no cambian.
    expect(Afirmacion.safeParse(base).success).toBe(true);
    expect(Afirmacion.safeParse({ ...base, datosQueLaSostienen: ['motor:x'] }).success).toBe(false);
  });

  it('docs/claims-web.json no tiene todavía ninguna afirmación de esa categoría', async () => {
    const { readFileSync } = await import('node:fs');
    const web = JSON.parse(readFileSync('docs/claims-web.json', 'utf8')) as {
      claims: { categoria?: string }[];
    };
    expect(web.claims.filter((c) => c.categoria === 'interpretacion')).toEqual([]);
  });
});
