/**
 * Casos de oro del motor de incapacidad permanente (docs/MOTOR_INCAPACIDAD.md, «Casos de oro»).
 *
 * Etiqueta de cada caso:
 * - «derivado de la norma»: calculado a mano a partir del texto legal y de /data (cuentas en el
 *   campo `cuenta`). Comprueba que el motor hace lo que dice la norma según nuestra lectura; NO es
 *   una validación independiente.
 * - «independiente»: ejemplo resuelto publicado en una fuente oficial (con su URL). No se ha
 *   localizado ninguno en esta fase (véase docs/INFORME_VERIFICACION.md).
 *
 * Para que la cuenta a mano sea exacta: bases constantes, sin actualización por el IPC
 * (`actualizarBases: false`) y hecho causante en 2026 (cuantías de 2026 de /data).
 */
import { describe, expect, it } from 'vitest';
import { calcularIncapacidadPermanente } from './repositorio.ts';
import type {
  Carrera,
  GradoIncapacidad,
  OpcionesIncapacidad,
  OrigenIncapacidad,
  ResultadoIncapacidad,
} from './tipos.ts';

type Etiqueta = 'derivado de la norma' | 'independiente';

interface CasoOro {
  readonly id: string;
  readonly etiqueta: Etiqueta;
  readonly url?: string;
  readonly cuenta: string;
  readonly carrera: Carrera;
  readonly nacimiento: string;
  readonly hc: string;
  readonly grado: GradoIncapacidad;
  readonly origen: OrigenIncapacidad;
  readonly opciones?: OpcionesIncapacidad;
  readonly esperado: Partial<
    Pick<
      ResultadoIncapacidad,
      | 'pensionMensual'
      | 'baseReguladora'
      | 'complementoGranIncapacidad'
      | 'incrementoTotalCualificada'
      | 'cantidadTantoAlzado'
      | 'importeEnSuspenso'
      | 'estado'
      | 'cumpleRequisitos'
    >
  >;
}

const BASE = { actualizarBases: false } as const;
const c = (desde: string, hasta: string, baseMensual: number) => ({ desde, hasta, baseMensual });
const LARGA = [c('2000-01', '2026-02', 2000)];

const CASOS: readonly CasoOro[] = [
  {
    id: 'total-ec-45',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Edad 540 meses: exigidos (540 − 240) / 4 = 75 < 96 → art. 197.2: 75 bases / (75 × 1,1666) = 2.000 / 1,1666 = 1.714,3837; 314 meses + 239 hasta los 65 (carrera proyectada ≥ 459) = 553 ≥ 438 → 100 %; total 55 % = 942,9110',
    carrera: LARGA,
    nacimiento: '1981-03-10',
    hc: '2026-03-15',
    grado: 'total',
    origen: 'enfermedad-comun',
    opciones: BASE,
    esperado: { baseReguladora: 1714.3837, pensionMensual: 942.911, estado: 'contributiva' },
  },
  {
    id: 'absoluta-ec-45',
    etiqueta: 'derivado de la norma',
    cuenta: 'BR 1.714,3837 (periodo corto, como el caso anterior) × 100 %',
    carrera: LARGA,
    nacimiento: '1981-03-10',
    hc: '2026-03-15',
    grado: 'absoluta',
    origen: 'enfermedad-comun',
    opciones: BASE,
    esperado: { pensionMensual: 1714.3837 },
  },
  {
    id: 'gran-incapacidad-ec-45',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Complemento = 45 % × 1.424,40 (base mínima 2026) + 30 % × 2.000 = 1.240,98 (> 45 % × 1.714,38); total 1.714,3837 + 1.240,98 = 2.955,3637',
    carrera: LARGA,
    nacimiento: '1981-03-10',
    hc: '2026-03-15',
    grado: 'gran-incapacidad',
    origen: 'enfermedad-comun',
    opciones: BASE,
    esperado: { complementoGranIncapacidad: 1240.98, pensionMensual: 2955.3637 },
  },
  {
    id: 'total-cualificada-ec-58',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Edad 697 meses; 314 + 83 = 397 < 459 → edad 802 meses (2034-11-20): faltan 104 → 418 meses → 50 + 49 × 0,21 + 189 × 0,19 = 96,20 %; BR 1.649,1429; 55 % = 907,0286 + 20 % = 329,8286',
    carrera: LARGA,
    nacimiento: '1968-01-20',
    hc: '2026-03-15',
    grado: 'total',
    origen: 'enfermedad-comun',
    opciones: BASE,
    esperado: {
      baseReguladora: 1649.1429,
      incrementoTotalCualificada: 329.8286,
      pensionMensual: 1236.8571,
    },
  },
  {
    id: 'total-ec-suelo-con-rentas',
    etiqueta: 'derivado de la norma',
    cuenta:
      'BR 900 / 1,1666 = 771,4727 (periodo corto); 55 % = 424,31 < suelo 9.580,20 / 14 = 684,30 (art. 196.2); rentas > límite: sin complemento a mínimos',
    carrera: [c('2000-01', '2026-02', 900)],
    nacimiento: '1981-03-10',
    hc: '2026-03-15',
    grado: 'total',
    origen: 'enfermedad-comun',
    opciones: { ...BASE, rentasAnuales: 20000 },
    esperado: { pensionMensual: 684.3, estado: 'minima' },
  },
  {
    id: 'total-ec-minima-sin-rentas',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Como el anterior sin rentas: mínima menor de 60 años sin cónyuge 9.662,80 / 14 = 690,20',
    carrera: [c('2000-01', '2026-02', 900)],
    nacimiento: '1981-03-10',
    hc: '2026-03-15',
    grado: 'total',
    origen: 'enfermedad-comun',
    opciones: BASE,
    esperado: { pensionMensual: 690.2, estado: 'minima' },
  },
  {
    id: 'absoluta-minima',
    etiqueta: 'derivado de la norma',
    cuenta: 'BR 771,4727 < mínima de la absoluta sin cónyuge 13.106,80 / 14 = 936,20',
    carrera: [c('2000-01', '2026-02', 900)],
    nacimiento: '1981-03-10',
    hc: '2026-03-15',
    grado: 'absoluta',
    origen: 'enfermedad-comun',
    opciones: BASE,
    esperado: { pensionMensual: 936.2, estado: 'minima' },
  },
  {
    id: 'gran-incapacidad-maxima',
    etiqueta: 'derivado de la norma',
    cuenta:
      'BR 5.101,20 / 1,1666 = 4.372,7 (periodo corto) > máxima 3.359,60; complemento 640,98 + 30 % × 5.101,20 = 2.171,34 fuera del tope; total 5.530,94',
    carrera: [c('2000-01', '2026-02', 5101.2)],
    nacimiento: '1981-03-10',
    hc: '2026-03-15',
    grado: 'gran-incapacidad',
    origen: 'enfermedad-comun',
    opciones: { ...BASE, topeBases: false },
    esperado: { complementoGranIncapacidad: 2171.34, pensionMensual: 5530.94, estado: 'maxima' },
  },
  {
    id: 'gran-incapacidad-complemento-minimo',
    etiqueta: 'derivado de la norma',
    cuenta:
      '640,98 + 30 % × 100 = 670,98 < 45 % × 1.714,3837 = 771,4727 → complemento 771,4727; total 2.485,8564',
    carrera: LARGA,
    nacimiento: '1981-03-10',
    hc: '2026-03-15',
    grado: 'gran-incapacidad',
    origen: 'enfermedad-comun',
    opciones: { ...BASE, ultimaBaseCotizacion: 100 },
    esperado: { complementoGranIncapacidad: 771.4727, pensionMensual: 2485.8564 },
  },
  {
    id: 'total-anl-periodo-favorable',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Mejores 24 meses en siete años: 2022-01 a 2023-12 a 3.000 = 72.000 / 28 = 2.571,4286; 55 % = 1.414,2857; sin mínima (total < 60 años no derivada de enfermedad común)',
    carrera: [
      c('2019-03', '2021-12', 1500),
      c('2022-01', '2023-12', 3000),
      c('2024-01', '2026-02', 1800),
    ],
    nacimiento: '1981-03-10',
    hc: '2026-03-15',
    grado: 'total',
    origen: 'accidente-no-laboral',
    opciones: BASE,
    esperado: { baseReguladora: 2571.4286, pensionMensual: 1414.2857 },
  },
  {
    id: 'total-anl-lagunas-sin-integrar',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Carrera de 18 meses a 2.000 (2024-01 a 2025-06); periodo elegido 2024-01 a 2025-12 con 6 meses sin cotizar contados como cero (lectura «sin-integrar», valor por defecto desde el 14-11-2026): 36.000 / 28 = 1.285,7143; 55 % = 707,1429',
    carrera: [c('2024-01', '2025-06', 2000)],
    nacimiento: '1981-03-10',
    hc: '2026-03-15',
    grado: 'total',
    origen: 'accidente-no-laboral',
    opciones: { ...BASE, lecturasIncapacidad: { lagunasAccidenteNoLaboral: 'sin-integrar' } },
    esperado: { baseReguladora: 1285.7143, pensionMensual: 707.1429 },
  },
  {
    id: 'total-anl-lagunas-integrar',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Mismo caso con la lectura «integrar»: las 6 lagunas (2025-07 a 2025-12) se integran al 100 % de la base mínima de 2025 (6 × 1.381,20 = 8.287,20; son menos de 48 meses): (36.000 + 8.287,20) / 28 = 1.581,6857; 55 % = 869,9271',
    carrera: [c('2024-01', '2025-06', 2000)],
    nacimiento: '1981-03-10',
    hc: '2026-03-15',
    grado: 'total',
    origen: 'accidente-no-laboral',
    opciones: { ...BASE, lecturasIncapacidad: { lagunasAccidenteNoLaboral: 'integrar' } },
    esperado: { baseReguladora: 1581.6857, pensionMensual: 869.9271 },
  },
  {
    id: 'total-anl-periodo-elegido',
    etiqueta: 'derivado de la norma',
    cuenta: 'Periodo elegido 2024-01 a 2025-12: 24 × 1.800 / 28 = 1.542,8571; 55 % = 848,5714',
    carrera: [
      c('2019-03', '2021-12', 1500),
      c('2022-01', '2023-12', 3000),
      c('2024-01', '2026-02', 1800),
    ],
    nacimiento: '1981-03-10',
    hc: '2026-03-15',
    grado: 'total',
    origen: 'accidente-no-laboral',
    opciones: { ...BASE, periodoElegidoDesde: '2024-01' },
    esperado: { pensionMensual: 848.5714 },
  },
  {
    id: 'parcial-ec',
    etiqueta: 'derivado de la norma',
    cuenta: '24 mensualidades × 2.000 (base del mes anterior al inicio de la incapacidad temporal)',
    carrera: LARGA,
    nacimiento: '1981-03-10',
    hc: '2026-03-15',
    grado: 'parcial',
    origen: 'enfermedad-comun',
    opciones: { ...BASE, inicioIncapacidadTemporal: '2025-06' },
    esperado: { cantidadTantoAlzado: 48000, pensionMensual: 0 },
  },
  {
    id: 'absoluta-ec-22-periodo-corto',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Edad 264 meses: exigidos (264 − 192) / 3 = 24 < 96 → 24 bases / (24 × 1,1666 = 27,9984) → 36.000 / 27,9984 = 1.285,7878; 36 + 515 meses ≥ 438 → 100 %',
    carrera: [c('2023-03', '2026-02', 1500)],
    nacimiento: '2004-03-10',
    hc: '2026-03-15',
    grado: 'absoluta',
    origen: 'enfermedad-comun',
    opciones: BASE,
    esperado: { baseReguladora: 1285.7878, pensionMensual: 1285.7878 },
  },
  {
    id: 'total-ec-63-menos-de-15-anios',
    etiqueta: 'derivado de la norma',
    cuenta:
      '130 meses + 45 hasta los 66 años y 10 meses = 175 < 180 → 50 %; BR 857,1429; 55 % = 471,43 < suelo 684,30 < mínima de 60 a 64 años 12.262,60 / 14 = 875,90',
    carrera: [c('2015-05', '2026-02', 2000)],
    nacimiento: '1963-03-10',
    hc: '2026-03-15',
    grado: 'total',
    origen: 'enfermedad-comun',
    opciones: BASE,
    esperado: { baseReguladora: 857.1429, pensionMensual: 875.9, estado: 'minima' },
  },
  {
    id: 'ec-excluida-por-jubilacion',
    etiqueta: 'derivado de la norma',
    cuenta:
      '68 años y 2 meses (≥ 802 meses) con carencia y periodo previo: no causa IP por contingencias comunes (art. 195.1)',
    carrera: [c('1985-01', '2026-02', 2000)],
    nacimiento: '1958-01-10',
    hc: '2026-03-15',
    grado: 'absoluta',
    origen: 'enfermedad-comun',
    opciones: BASE,
    esperado: { cumpleRequisitos: false, estado: 'no-causa-derecho', pensionMensual: 0 },
  },
  {
    id: 'anl-68-art-196-5',
    etiqueta: 'derivado de la norma',
    cuenta:
      '68 años sin carencia de jubilación (120 meses): BR 48.000 / 28 = 1.714,2857 × porcentaje de 180 meses (50 %) = 857,1429; rentas > límite: sin mínima',
    carrera: [c('2016-03', '2026-02', 2000)],
    nacimiento: '1958-01-10',
    hc: '2026-03-15',
    grado: 'absoluta',
    origen: 'accidente-no-laboral',
    opciones: { ...BASE, rentasAnuales: 20000 },
    esperado: { pensionMensual: 857.1429 },
  },
  {
    id: 'total-ec-brecha',
    etiqueta: 'derivado de la norma',
    cuenta: '942,9110 + 2 hijos × 36,90 (complemento de 2026) = 1.016,7110',
    carrera: LARGA,
    nacimiento: '1981-03-10',
    hc: '2026-03-15',
    grado: 'total',
    origen: 'enfermedad-comun',
    opciones: { ...BASE, sexo: 'mujer', hijos: 2 },
    esperado: { pensionMensual: 1016.711 },
  },
  {
    id: 'gran-incapacidad-trabaja',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Trabaja (desde el 22/12/2024): en suspenso 1.714,3837; el complemento 1.240,98 se sigue pagando',
    carrera: LARGA,
    nacimiento: '1981-03-10',
    hc: '2026-03-15',
    grado: 'gran-incapacidad',
    origen: 'enfermedad-comun',
    opciones: { ...BASE, trabaja: true },
    esperado: { importeEnSuspenso: 1714.3837, complementoGranIncapacidad: 1240.98 },
  },
  {
    id: 'absoluta-ec-sin-alta-con-lagunas',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Sin alta: 15 años (276 meses) y 36 en los diez últimos. Ventana: 59 bases de 2.000 + 37 lagunas al 100 % de la base mínima (12 × 1.260 + 12 × 1.323 + 12 × 1.381,20 + 1.424,40 = 48.994,80) = 166.994,80 / 112 = 1.491,0250; 276 + 141 = 417 meses → 96,01 % → 1.431,5331',
    carrera: [c('2000-01', '2022-12', 2000)],
    nacimiento: '1971-03-10',
    hc: '2026-03-15',
    grado: 'absoluta',
    origen: 'enfermedad-comun',
    opciones: { ...BASE, enAlta: false },
    esperado: { baseReguladora: 1431.5331, pensionMensual: 1431.5331 },
  },
  {
    id: 'total-at-base-facilitada',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Accidente de trabajo con base reguladora facilitada 2.500: 55 % = 1.375; sin mínima (menor de 60 años, no enfermedad común)',
    carrera: LARGA,
    nacimiento: '1981-03-10',
    hc: '2026-03-15',
    grado: 'total',
    origen: 'accidente-trabajo',
    opciones: { ...BASE, baseReguladoraProfesional: 2500 },
    esperado: { pensionMensual: 1375 },
  },
];

describe('casos de oro de la incapacidad permanente', () => {
  it('hay al menos 15 casos y cada uno lleva etiqueta (y URL si es independiente)', () => {
    expect(CASOS.length).toBeGreaterThanOrEqual(15);
    for (const caso of CASOS) {
      if (caso.etiqueta === 'independiente') expect(caso.url).toMatch(/^https:\/\//);
      expect(caso.cuenta.length).toBeGreaterThan(10);
    }
  });

  for (const caso of CASOS) {
    it(`${caso.id} (${caso.etiqueta})`, () => {
      const r = calcularIncapacidadPermanente(
        caso.carrera,
        caso.nacimiento,
        caso.hc,
        caso.grado,
        caso.origen,
        caso.opciones,
      );
      for (const [clave, valor] of Object.entries(caso.esperado)) {
        const obtenido = r[clave as keyof typeof caso.esperado];
        if (typeof valor === 'number') expect(obtenido, clave).toBeCloseTo(valor, 3);
        else expect(obtenido, clave).toBe(valor);
      }
    });
  }
});
