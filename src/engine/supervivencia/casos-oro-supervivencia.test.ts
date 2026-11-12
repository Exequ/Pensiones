/**
 * Casos de oro del motor de muerte y supervivencia (docs/MOTOR_SUPERVIVENCIA.md, «Casos de oro»).
 *
 * Etiqueta de cada caso:
 * - «derivado de la norma»: calculado a mano a partir del texto legal y de /data (cuenta en el
 *   campo `cuenta`). Comprueba que el motor aplica nuestra lectura de la norma; NO es una
 *   validación independiente.
 * - «independiente»: ejemplo resuelto publicado en una fuente oficial (con su URL). No se ha
 *   localizado ninguno (búsqueda en docs/INFORME_VERIFICACION.md, Fase 2-B-2).
 *
 * Para que la cuenta a mano sea exacta: bases constantes de 2.000 euros (base reguladora
 * 24 × 2.000 / 28 = 1.714,2857) y hecho causante en 2026 (cuantías de 2026 de /data: mínimas
 * anuales viudedad < 60 años 9.931,60, 65 años 13.106,80, cargas 17.592,40; orfandad y familiares
 * 4.011,00; familiares sin viudo ni huérfanos: < 65 años 9.126,60, a prorratear 5.920,60;
 * límite de ingresos 9.442; SMI anual 17.094 y mensual 1.221; pensión máxima 3.359,60;
 * brecha 36,90 por hijo; 14 pagas).
 */
import { describe, expect, it } from 'vitest';
import { calcularSupervivencia } from './repositorio.ts';
import type {
  Beneficiarios,
  Causante,
  OpcionesSupervivencia,
  ResultadoSupervivencia,
} from './tipos.ts';

type Etiqueta = 'derivado de la norma' | 'independiente';
type Grupo = 'viudedad' | 'orfandad' | 'favorFamiliares';
type Campo = 'pensionMensual' | 'pensionContributiva' | 'porcentaje' | 'complementoMinimos';

interface CasoOro {
  readonly id: string;
  readonly prestacion: 'viudedad' | 'orfandad' | 'favor-familiares';
  readonly etiqueta: Etiqueta;
  readonly url?: string;
  readonly cuenta: string;
  readonly causante: Causante;
  readonly beneficiarios: Beneficiarios;
  readonly opciones?: OpcionesSupervivencia;
  /** [grupo, índice, campo, valor] o [grupo, índice, 'sin-derecho'] o [grupo, índice, 'temporal', meses]. */
  readonly esperado: readonly (
    | readonly [Grupo, number, Campo, number]
    | readonly [Grupo, number, 'sin-derecho']
    | readonly [Grupo, number, 'temporal', number]
  )[];
}

const c = (desde: string, hasta: string, baseMensual = 2000) => ({ desde, hasta, baseMensual });
const alta = (
  fecha = '2026-03-15',
  hasta = '2026-02',
  causa: Causante['causa'] = 'enfermedad-comun',
): Causante => ({
  fechaFallecimiento: fecha,
  causa,
  situacion: 'alta',
  carrera: [c('2010-01', hasta)],
});
const conyuge = (nacimiento = '1976-05-01') =>
  ({ vinculo: 'conyuge', nacimiento, fechaMatrimonio: '2005-06-01' }) as const;
const CARGAS = {
  cargasFamiliares: { miembrosUnidadFamiliar: 3, rendimientosUnidadFamiliar: 10000 },
};

const CASOS: readonly CasoOro[] = [
  {
    id: 'viudedad-52',
    prestacion: 'viudedad',
    etiqueta: 'derivado de la norma',
    cuenta: 'BR 1.714,29 × 52 % = 891,43 > mínima < 60 años 9.931,60 / 14 = 709,40.',
    causante: alta(),
    beneficiarios: { viudos: [conyuge()] },
    esperado: [['viudedad', 0, 'pensionMensual', 891.43]],
  },
  {
    id: 'viudedad-60-mayor-65',
    prestacion: 'viudedad',
    etiqueta: 'derivado de la norma',
    cuenta:
      '70 años, sin otra pensión ni rentas: 60 % (RD 900/2018) = 1.028,57 > mínima 65 años 936,20.',
    causante: alta(),
    beneficiarios: { viudos: [conyuge('1956-01-01')] },
    esperado: [
      ['viudedad', 0, 'pensionMensual', 1028.57],
      ['viudedad', 0, 'porcentaje', 60],
    ],
  },
  {
    id: 'viudedad-70-cargas',
    prestacion: 'viudedad',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Cargas: 10.000 / 3 = 3.333 ≤ 75 % × (17.094 − 2 × 1.221) = 10.989; sin rentas propias; límite 9.442 + 9.931,60 = 19.373,60 ≥ 70 % × 14 = 16.800 → 1.200; mínima con cargas 1.256,60 → complemento 56,60.',
    causante: alta(),
    beneficiarios: { viudos: [{ ...conyuge('1981-01-01'), ...CARGAS }] },
    esperado: [
      ['viudedad', 0, 'pensionContributiva', 1200],
      ['viudedad', 0, 'pensionMensual', 1256.6],
    ],
  },
  {
    id: 'viudedad-70-reducida',
    prestacion: 'viudedad',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Rentas propias 5.000: (19.373,60 − 5.000) / 14 = 1.026,69 < 1.200 (y > 52 %); rentas ≤ 9.442 → mínima con cargas 1.256,60.',
    causante: alta(),
    beneficiarios: { viudos: [{ ...conyuge('1981-01-01'), ...CARGAS, rendimientosAnuales: 5000 }] },
    esperado: [
      ['viudedad', 0, 'pensionContributiva', 1026.69],
      ['viudedad', 0, 'pensionMensual', 1256.6],
    ],
  },
  {
    id: 'viudedad-prestacion-temporal',
    prestacion: 'viudedad',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Matrimonio de 6 meses, enfermedad anterior al vínculo, sin hijos ni convivencia previa: prestación temporal de 24 meses de 891,43 (sin mínimos).',
    causante: alta(),
    beneficiarios: {
      viudos: [{ ...conyuge(), fechaMatrimonio: '2025-09-15', enfermedadAnteriorAlVinculo: true }],
    },
    esperado: [
      ['viudedad', 0, 'temporal', 24],
      ['viudedad', 0, 'pensionMensual', 891.43],
    ],
  },
  {
    id: 'pareja-hecho',
    prestacion: 'viudedad',
    etiqueta: 'derivado de la norma',
    cuenta: 'Convivencia 72 meses ≥ 60; inscripción de 2023 (≥ 24 meses): 52 % = 891,43.',
    causante: alta(),
    beneficiarios: {
      viudos: [
        {
          vinculo: 'pareja-hecho',
          nacimiento: '1976-05-01',
          convivenciaMeses: 72,
          fechaRegistroPareja: '2023-01-10',
        },
      ],
    },
    esperado: [['viudedad', 0, 'pensionMensual', 891.43]],
  },
  {
    id: 'pareja-hijos-redaccion-2022',
    prestacion: 'viudedad',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Hechos causantes hasta el 20/10/2026: con hijos comunes basta la inscripción con dos años de antelación (convivencia de 10 meses): 891,43.',
    causante: alta(),
    beneficiarios: {
      viudos: [
        {
          vinculo: 'pareja-hecho',
          nacimiento: '1976-05-01',
          convivenciaMeses: 10,
          fechaRegistroPareja: '2023-06-01',
          hijosComunes: true,
        },
      ],
    },
    esperado: [['viudedad', 0, 'pensionMensual', 891.43]],
  },
  {
    id: 'pareja-hijos-redaccion-2026',
    prestacion: 'viudedad',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Desde el 21/10/2026 (RDL 31/2026): con hijos comunes se exigen dos años de convivencia; 10 meses: sin derecho.',
    causante: alta('2026-11-15', '2026-10'),
    beneficiarios: {
      viudos: [
        {
          vinculo: 'pareja-hecho',
          nacimiento: '1976-05-01',
          convivenciaMeses: 10,
          fechaRegistroPareja: '2023-06-01',
          hijosComunes: true,
        },
      ],
    },
    esperado: [['viudedad', 0, 'sin-derecho']],
  },
  {
    id: 'pareja-sin-inscripcion-temporal',
    prestacion: 'viudedad',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Convivencia 72 meses pero inscripción de 9 meses: prestación temporal (art. 222) de 24 meses, 891,43.',
    causante: alta(),
    beneficiarios: {
      viudos: [
        {
          vinculo: 'pareja-hecho',
          nacimiento: '1976-05-01',
          convivenciaMeses: 72,
          fechaRegistroPareja: '2025-06-01',
        },
      ],
    },
    esperado: [
      ['viudedad', 0, 'temporal', 24],
      ['viudedad', 0, 'pensionMensual', 891.43],
    ],
  },
  {
    id: 'excónyuge-compensatoria',
    prestacion: 'viudedad',
    etiqueta: 'derivado de la norma',
    cuenta:
      '52 % × 14 = 12.480 > compensatoria 6.000 → 6.000 / 14 = 428,57; mínima < 60 años 709,40 (rentas 0).',
    causante: alta(),
    beneficiarios: {
      viudos: [{ vinculo: 'excónyuge', nacimiento: '1976-05-01', pensionCompensatoriaAnual: 6000 }],
    },
    esperado: [
      ['viudedad', 0, 'pensionContributiva', 428.57],
      ['viudedad', 0, 'pensionMensual', 709.4],
    ],
  },
  {
    id: 'concurrencia-garantia-40',
    prestacion: 'viudedad',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Excónyuge 120 meses y cónyuge 60: cuotas 2/3 y 1/3 → al cónyuge el 40 % garantizado (356,57) y al excónyuge el 60 % (534,86); sin mínimos.',
    causante: alta(),
    beneficiarios: {
      viudos: [
        {
          vinculo: 'excónyuge',
          nacimiento: '1970-01-01',
          pensionCompensatoriaAnual: 20000,
          mesesConvividos: 120,
        },
        { ...conyuge(), fechaMatrimonio: '2021-01-01', mesesConvividos: 60 },
      ],
    },
    opciones: { aplicarMinimos: false },
    esperado: [
      ['viudedad', 0, 'pensionMensual', 534.86],
      ['viudedad', 1, 'pensionMensual', 356.57],
    ],
  },
  {
    id: 'orfandad-un-huerfano',
    prestacion: 'orfandad',
    etiqueta: 'derivado de la norma',
    cuenta: '20 % = 342,86 > mínima 4.011 / 14 = 286,50.',
    causante: alta(),
    beneficiarios: { huerfanos: [{ nacimiento: '2016-01-01' }] },
    esperado: [['orfandad', 0, 'pensionMensual', 342.86]],
  },
  {
    id: 'orfandad-absoluta-dos',
    prestacion: 'orfandad',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Orfandad absoluta sin viudedad: 20 % + 52 % / 2 = 46 % cada uno = 788,57; suma 92 % ≤ 100 %.',
    causante: alta(),
    beneficiarios: { huerfanos: [{ nacimiento: '2016-01-01' }, { nacimiento: '2012-01-01' }] },
    opciones: { orfandadAbsoluta: true },
    esperado: [
      ['orfandad', 0, 'pensionMensual', 788.57],
      ['orfandad', 1, 'porcentaje', 46],
    ],
  },
  {
    id: 'orfandad-absoluta-tres-limite',
    prestacion: 'orfandad',
    etiqueta: 'derivado de la norma',
    cuenta: '3 × (20 % + 17,33 %) = 112 % > 100 % → cada uno 33,33 % = 571,43.',
    causante: alta(),
    beneficiarios: {
      huerfanos: [
        { nacimiento: '2016-01-01' },
        { nacimiento: '2012-01-01' },
        { nacimiento: '2010-01-01' },
      ],
    },
    opciones: { orfandadAbsoluta: true },
    esperado: [['orfandad', 2, 'pensionMensual', 571.43]],
  },
  {
    id: 'viudedad-cuatro-huerfanos',
    prestacion: 'orfandad',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Viudedad 52 % + 4 × 20 % = 132 % → orfandades reducidas al 48 % (12 % = 205,71 cada una); mínima 286,50.',
    causante: alta(),
    beneficiarios: {
      viudos: [conyuge()],
      huerfanos: [
        { nacimiento: '2010-01-01' },
        { nacimiento: '2012-01-01' },
        { nacimiento: '2014-01-01' },
        { nacimiento: '2016-01-01' },
      ],
    },
    esperado: [
      ['viudedad', 0, 'pensionMensual', 891.43],
      ['orfandad', 3, 'pensionContributiva', 205.71],
      ['orfandad', 3, 'pensionMensual', 286.5],
    ],
  },
  {
    id: 'viudedad-70-tres-huerfanos-118',
    prestacion: 'orfandad',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Viudedad 70 % con cargas + 3 × 20 % = 130 %: excepción del art. 229.3, orfandades hasta el 48 % (16 % = 274,29 cada una) y total 118 %; mínima de orfandad 286,50.',
    causante: alta(),
    beneficiarios: {
      viudos: [{ ...conyuge('1981-01-01'), ...CARGAS }],
      huerfanos: [
        { nacimiento: '2012-01-01' },
        { nacimiento: '2014-01-01' },
        { nacimiento: '2016-01-01' },
      ],
    },
    esperado: [
      ['viudedad', 0, 'pensionContributiva', 1200],
      ['orfandad', 0, 'pensionContributiva', 274.29],
      ['orfandad', 0, 'pensionMensual', 286.5],
    ],
  },
  {
    id: 'orfandad-23-anios-ingresos',
    prestacion: 'orfandad',
    etiqueta: 'derivado de la norma',
    cuenta:
      '23 años: con 10.000 € de trabajo (< SMI anual 17.094) tiene derecho (342,86); con 20.000 €, no.',
    causante: alta(),
    beneficiarios: {
      huerfanos: [
        { nacimiento: '2003-01-01', rentasTrabajoAnuales: 10000 },
        { nacimiento: '2003-01-01', rentasTrabajoAnuales: 20000, rendimientosAnuales: 20000 },
      ],
    },
    esperado: [
      ['orfandad', 0, 'pensionContributiva', 342.86],
      ['orfandad', 1, 'sin-derecho'],
    ],
  },
  {
    id: 'orfandad-sin-carencia',
    prestacion: 'orfandad',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Causante en alta con 12 meses cotizados (enfermedad común): la orfandad no exige periodo previo (art. 224.1). BR 12 × 2.000 / 28 = 857,14; 20 % = 171,43 → mínima 286,50.',
    causante: {
      fechaFallecimiento: '2026-03-15',
      causa: 'enfermedad-comun',
      situacion: 'alta',
      carrera: [c('2025-02', '2026-01')],
    },
    beneficiarios: { huerfanos: [{ nacimiento: '2016-01-01' }] },
    esperado: [
      ['orfandad', 0, 'pensionContributiva', 171.43],
      ['orfandad', 0, 'pensionMensual', 286.5],
    ],
  },
  {
    id: 'familiares-nieto-incremento',
    prestacion: 'favor-familiares',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Nieto de 10 años huérfano de padre y madre, convivencia 36 meses, sin rentas; sin viudo ni huérfanos: 20 % + 52 % = 72 % = 1.234,29.',
    causante: alta(),
    beneficiarios: {
      familiares: [
        {
          parentesco: 'nieto',
          nacimiento: '2016-01-01',
          convivenciaMeses: 36,
          huerfanoDePadreYMadre: true,
        },
      ],
    },
    esperado: [['favorFamiliares', 0, 'pensionMensual', 1234.29]],
  },
  {
    id: 'familiares-padres',
    prestacion: 'favor-familiares',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Padre de 66 años y madre de 62 (sin viudo, huérfanos ni nietos): 20 % + 26 % = 46 % = 788,57 cada uno (mínima con dos beneficiarios 4.011 + 5.920,60 / 2 = 6.971,30 / 14 = 497,95).',
    causante: alta(),
    beneficiarios: {
      familiares: [
        { parentesco: 'padre', nacimiento: '1960-01-01', convivenciaMeses: 36 },
        {
          parentesco: 'madre',
          nacimiento: '1964-01-01',
          convivenciaMeses: 36,
          estadoCivilCumple: true,
        },
      ],
    },
    esperado: [
      ['favorFamiliares', 0, 'pensionMensual', 788.57],
      ['favorFamiliares', 1, 'pensionMensual', 788.57],
    ],
  },
  {
    id: 'familiares-limite-conjunto',
    prestacion: 'favor-familiares',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Viudedad 52 % + 2 orfandades 40 % + madre 20 %: a la madre le queda el 8 % = 137,14; mínima general de familiares 286,50.',
    causante: alta(),
    beneficiarios: {
      viudos: [conyuge()],
      huerfanos: [{ nacimiento: '2014-01-01' }, { nacimiento: '2016-01-01' }],
      familiares: [
        {
          parentesco: 'madre',
          nacimiento: '1950-01-01',
          convivenciaMeses: 30,
          estadoCivilCumple: true,
        },
      ],
    },
    esperado: [
      ['favorFamiliares', 0, 'pensionContributiva', 137.14],
      ['favorFamiliares', 0, 'pensionMensual', 286.5],
      ['orfandad', 1, 'pensionMensual', 342.86],
    ],
  },
  {
    id: 'causante-pensionista',
    prestacion: 'viudedad',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Pensionista de jubilación desde 06/2023 con BR 2.500: × 1,038 × 1,028 × 1,027 = 2.739,69; viuda de 70 años al 60 % = 1.643,81.',
    causante: {
      fechaFallecimiento: '2026-02-10',
      causa: 'enfermedad-comun',
      situacion: 'pensionista',
      pension: { baseReguladora: 2500, fechaHechoCausante: '2023-06-01', clase: 'jubilacion' },
    },
    beneficiarios: { viudos: [conyuge('1956-01-01')] },
    esperado: [['viudedad', 0, 'pensionMensual', 1643.81]],
  },
  {
    id: 'sin-alta-quince-anios',
    prestacion: 'viudedad',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Sin alta con 180 meses (2008-01 a 2022-12): derecho; BR con los 24 meses de 2021-2022 = 1.714,29; 52 % = 891,43.',
    causante: {
      fechaFallecimiento: '2026-03-15',
      causa: 'enfermedad-comun',
      situacion: 'sin-alta',
      carrera: [c('2008-01', '2022-12')],
    },
    beneficiarios: { viudos: [conyuge()] },
    esperado: [['viudedad', 0, 'pensionMensual', 891.43]],
  },
  {
    id: 'sin-alta-catorce-anios',
    prestacion: 'viudedad',
    etiqueta: 'derivado de la norma',
    cuenta: 'Sin alta con 179 meses: sin derecho.',
    causante: {
      fechaFallecimiento: '2026-03-15',
      causa: 'enfermedad-comun',
      situacion: 'sin-alta',
      carrera: [c('2008-02', '2022-12')],
    },
    beneficiarios: { viudos: [conyuge()] },
    esperado: [['viudedad', 0, 'sin-derecho']],
  },
  {
    id: 'accidente-no-laboral-sin-carencia',
    prestacion: 'viudedad',
    etiqueta: 'derivado de la norma',
    cuenta:
      '393 días en cinco años: por enfermedad común no habría derecho; por accidente no laboral sí (art. 219.1). BR 12 × 2.000 / 28 = 857,14 → 52 % = 445,71 → mínima 709,40. El nieto no tiene derecho (la Orden solo exime AT y EP).',
    causante: {
      fechaFallecimiento: '2026-03-15',
      causa: 'accidente-no-laboral',
      situacion: 'alta',
      carrera: [c('2025-02', '2026-02')],
    },
    beneficiarios: {
      viudos: [conyuge()],
      familiares: [
        {
          parentesco: 'nieto',
          nacimiento: '2016-01-01',
          convivenciaMeses: 36,
          huerfanoDePadreYMadre: true,
        },
      ],
    },
    esperado: [
      ['viudedad', 0, 'pensionContributiva', 445.71],
      ['viudedad', 0, 'pensionMensual', 709.4],
      ['favorFamiliares', 0, 'sin-derecho'],
    ],
  },
  {
    id: 'viudedad-pension-maxima',
    prestacion: 'viudedad',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Pensionista con BR 6.000 desde 01/2026 (sin revalorización): 60 % = 3.600 > máxima 3.359,60.',
    causante: {
      fechaFallecimiento: '2026-06-10',
      causa: 'enfermedad-comun',
      situacion: 'pensionista',
      pension: { baseReguladora: 6000, fechaHechoCausante: '2026-01-01', clase: 'jubilacion' },
    },
    beneficiarios: { viudos: [conyuge('1956-01-01')] },
    esperado: [['viudedad', 0, 'pensionMensual', 3359.6]],
  },
  {
    id: 'viudo-brecha',
    prestacion: 'viudedad',
    etiqueta: 'derivado de la norma',
    cuenta: 'Viudo con dos hijos, uno con orfandad (art. 60.1.a): 891,43 + 2 × 36,90 = 965,23.',
    causante: alta(),
    beneficiarios: { viudos: [{ ...conyuge(), sexo: 'hombre', hijos: 2, hijoConOrfandad: true }] },
    esperado: [['viudedad', 0, 'pensionMensual', 965.23]],
  },
];

function prestacion(r: ResultadoSupervivencia, g: Grupo, i: number) {
  const p = r[g][i];
  if (p === undefined) throw new Error(`sin prestación ${g}[${i}]`);
  return p;
}

describe('Casos de oro de muerte y supervivencia', () => {
  it('hay al menos 20 casos, repartidos entre las tres prestaciones, y todos llevan etiqueta y cuenta', () => {
    expect(CASOS.length).toBeGreaterThanOrEqual(20);
    for (const p of ['viudedad', 'orfandad', 'favor-familiares'] as const) {
      expect(CASOS.filter((k) => k.prestacion === p).length).toBeGreaterThanOrEqual(3);
    }
    for (const k of CASOS) {
      expect(k.cuenta.length).toBeGreaterThan(10);
      if (k.etiqueta === 'independiente') expect(k.url).toMatch(/^https:\/\//);
    }
  });

  for (const k of CASOS) {
    it(`${k.id} (${k.etiqueta})`, () => {
      const r = calcularSupervivencia(k.causante, k.beneficiarios, k.opciones ?? {});
      for (const e of k.esperado) {
        const p = prestacion(r, e[0], e[1]);
        if (e[2] === 'sin-derecho') {
          expect(p.cumpleRequisitos).toBe(false);
          expect(p.pensionMensual).toBe(0);
        } else if (e[2] === 'temporal') {
          expect(p.clase).toBe('prestacion-temporal-viudedad');
          expect(p.duracionMeses).toBe(e[3]);
        } else {
          expect(p.cumpleRequisitos).toBe(true);
          expect(p[e[2]]).toBeCloseTo(e[3], 2);
        }
      }
    });
  }
});
