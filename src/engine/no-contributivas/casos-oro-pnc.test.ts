/**
 * Casos de oro del motor de pensiones no contributivas (docs/MOTOR_NO_CONTRIBUTIVAS_MEI.md).
 *
 * Etiqueta de cada caso:
 * - «derivado de la norma»: calculado a mano a partir del texto legal y de /data (cuenta en el
 *   campo `cuenta`). Comprueba que el motor aplica nuestra lectura de la norma; NO es una
 *   validación independiente.
 * - «independiente»: ejemplo resuelto publicado en una fuente oficial (con su URL). No se ha
 *   localizado ninguno (docs/INFORME_VERIFICACION.md, Fase 2-B-3).
 *
 * Cuantías de 2026 de /data: íntegra 8.803,20 euros/año (70 % = 6.162,24; 35 % = 3.081,12; 25 % =
 * 2.200,80; 50 % = 4.401,60), alquiler 525,00, 14 pagas. Año 2023: íntegra 6.402,20 e IPREM
 * mensual 600,00. La solicitud del 10/03/2026 tiene efectos desde el 01/04/2026.
 */
import { describe, expect, it } from 'vitest';
import { DatoNoDisponible } from '../jubilacion/errores.ts';
import { calcularPNCInvalidez, calcularPNCJubilacion } from './repositorio.ts';
import type { OpcionesPNC, ResultadoPNC, SolicitantePNC } from './tipos.ts';

type Etiqueta = 'derivado de la norma' | 'independiente';
interface CasoOro {
  readonly id: string;
  readonly clase: 'incapacidad' | 'jubilacion';
  readonly etiqueta: Etiqueta;
  readonly url?: string;
  readonly cuenta: string;
  readonly solicitante: SolicitantePNC;
  readonly opciones?: OpcionesPNC;
  readonly esperado: Partial<
    Pick<
      ResultadoPNC,
      | 'pensionAnual'
      | 'pensionMensual'
      | 'totalAnual'
      | 'complementoTerceraPersonaAnual'
      | 'complementoAlquilerAnual'
      | 'reduccionPorRentas'
      | 'reduccionPorLimite'
      | 'reduccionPorTrabajo'
      | 'estado'
      | 'cumpleRequisitos'
    >
  >;
}

const INC: SolicitantePNC = {
  nacimiento: '1980-05-05',
  fechaSolicitud: '2026-03-10',
  residenciaLegalMeses: 120,
  residenciaRecienteMeses: 60,
  gradoDiscapacidad: 70,
  rentasAnuales: 0,
};
const JUB: SolicitantePNC = {
  nacimiento: '1955-03-03',
  fechaSolicitud: '2026-03-10',
  residenciaLegalMeses: 240,
  residenciaRecienteMeses: 60,
  rentasAnuales: 0,
};
const ALQ = {
  sinViviendaEnPropiedad: true,
  titularDelContrato: true,
  arrendadorFamiliarOPareja: false,
  mesesVigenciaContrato: 12,
  diasResidenciaEnLaVivienda: 180,
};

const CASOS: readonly CasoOro[] = [
  {
    id: 'incapacidad-integra',
    clase: 'incapacidad',
    etiqueta: 'derivado de la norma',
    cuenta: 'Sin rentas: 8.803,20 / 14 = 628,80.',
    solicitante: INC,
    esperado: { pensionAnual: 8803.2, pensionMensual: 628.8, estado: 'cuantia-integra' },
  },
  {
    id: 'incapacidad-rentas-35',
    clase: 'incapacidad',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Rentas 4.000: exceso sobre el 35 % = 4.000 − 3.081,12 = 918,88 → 7.884,32 / 14 = 563,17.',
    solicitante: { ...INC, rentasAnuales: 4000 },
    esperado: {
      reduccionPorRentas: 918.88,
      pensionAnual: 7884.32,
      pensionMensual: 563.1657,
      estado: 'reducida',
    },
  },
  {
    id: 'incapacidad-rentas-en-el-umbral',
    clase: 'incapacidad',
    etiqueta: 'derivado de la norma',
    cuenta: 'Rentas = 35 % = 3.081,12: compatibles, sin reducción.',
    solicitante: { ...INC, rentasAnuales: 3081.12 },
    esperado: { reduccionPorRentas: 0, pensionAnual: 8803.2 },
  },
  {
    id: 'incapacidad-rentas-casi-la-cuantia',
    clase: 'incapacidad',
    etiqueta: 'derivado de la norma',
    cuenta: 'Rentas 8.803,19 (< íntegra): 8.803,20 − (8.803,19 − 3.081,12) = 3.081,13.',
    solicitante: { ...INC, rentasAnuales: 8803.19 },
    esperado: { pensionAnual: 3081.13 },
  },
  {
    id: 'incapacidad-rentas-igual-cuantia',
    clase: 'incapacidad',
    etiqueta: 'derivado de la norma',
    cuenta: 'Rentas = 8.803,20: no son «inferiores» a la cuantía (art. 363.1.d): sin derecho.',
    solicitante: { ...INC, rentasAnuales: 8803.2 },
    esperado: { cumpleRequisitos: false, pensionAnual: 0 },
  },
  {
    id: 'incapacidad-tercera-persona',
    clase: 'incapacidad',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Grado 80 % con tercera persona: + 50 % × 8.803,20 = 4.401,60 → (8.803,20 + 4.401,60) / 14 = 943,20.',
    solicitante: { ...INC, gradoDiscapacidad: 80, necesitaTerceraPersona: true },
    esperado: {
      complementoTerceraPersonaAnual: 4401.6,
      pensionMensual: 943.2,
      totalAnual: 13204.8,
    },
  },
  {
    id: 'incapacidad-tercera-persona-grado-74',
    clase: 'incapacidad',
    etiqueta: 'derivado de la norma',
    cuenta: 'Grado 74 % (< 75 %): sin complemento.',
    solicitante: { ...INC, gradoDiscapacidad: 74, necesitaTerceraPersona: true },
    esperado: { complementoTerceraPersonaAnual: 0, pensionMensual: 628.8 },
  },
  {
    id: 'incapacidad-dos-beneficiarios',
    clase: 'incapacidad',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Dos convivientes beneficiarios: (8.803,20 + 70 % × 8.803,20) / 2 = 7.482,72 / 14 = 534,48.',
    solicitante: INC,
    opciones: { unidadEconomica: { convivientes: 2, beneficiarios: 2, rentasUnidadAnuales: 0 } },
    esperado: { pensionAnual: 7482.72, pensionMensual: 534.48 },
  },
  {
    id: 'incapacidad-unidad-no-beneficiario',
    clase: 'incapacidad',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Dos convivientes, un beneficiario; rentas de la unidad 10.000 (< límite 14.965,44): exceso = 10.000 + 8.803,20 − 14.965,44 = 3.837,76 → 4.965,44 / 14 = 354,67.',
    solicitante: INC,
    opciones: { unidadEconomica: { convivientes: 2, rentasUnidadAnuales: 10000 } },
    esperado: { reduccionPorLimite: 3837.76, pensionAnual: 4965.44, pensionMensual: 354.6743 },
  },
  {
    id: 'incapacidad-unidad-sin-derecho',
    clase: 'incapacidad',
    etiqueta: 'derivado de la norma',
    cuenta: 'Rentas de la unidad 15.000 ≥ límite 14.965,44: sin derecho.',
    solicitante: INC,
    opciones: { unidadEconomica: { convivientes: 2, rentasUnidadAnuales: 15000 } },
    esperado: { cumpleRequisitos: false },
  },
  {
    id: 'incapacidad-unidad-hijos-padres',
    clase: 'incapacidad',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Convive con descendientes o ascendientes: límite 2,5 × 14.965,44 = 37.413,60; rentas 20.000: sin reducción (20.000 + 8.803,20 < 37.413,60).',
    solicitante: INC,
    opciones: {
      unidadEconomica: {
        convivientes: 2,
        convivenciaAscendientesDescendientes: true,
        rentasUnidadAnuales: 20000,
      },
    },
    esperado: { pensionAnual: 8803.2, reduccionPorLimite: 0 },
  },
  {
    id: 'incapacidad-minimo-25',
    clase: 'incapacidad',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Tres convivientes, un beneficiario; rentas de la unidad 21.000 (límite 8.803,20 × 2,4 = 21.127,68): exceso 8.675,52 → 127,68 < 25 % = 2.200,80 → 2.200,80 / 14 = 157,20.',
    solicitante: INC,
    opciones: { unidadEconomica: { convivientes: 3, rentasUnidadAnuales: 21000 } },
    esperado: { pensionAnual: 2200.8, pensionMensual: 157.2, estado: 'minimo-25' },
  },
  {
    id: 'incapacidad-alquiler',
    clase: 'incapacidad',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Cumple el RD 1191/2012: + 525,00 anuales, aparte de la paga (628,80): total anual 9.328,20.',
    solicitante: INC,
    opciones: { alquiler: ALQ },
    esperado: { complementoAlquilerAnual: 525, totalAnual: 9328.2, pensionMensual: 628.8 },
  },
  {
    id: 'incapacidad-trabajo-cuatro-anios',
    clase: 'incapacidad',
    etiqueta: 'derivado de la norma',
    cuenta:
      '2023 (íntegra 6.402,20; IPREM 600): ingresos de la actividad 10.000 en el mes 12; límite = 7.200 + 6.402,20 = 13.602,20; 6.402,20 + 10.000 − 13.602,20 = 2.800 → 3.602,20 / 14 = 257,30.',
    solicitante: { ...INC, fechaSolicitud: '2023-03-10', rentasAnuales: 10000 },
    opciones: { trabajo: { ingresosActividadAnuales: 10000, mesesDesdeInicio: 12 } },
    esperado: { reduccionPorTrabajo: 2800, pensionAnual: 3602.2, pensionMensual: 257.3 },
  },
  {
    id: 'jubilacion-integra',
    clase: 'jubilacion',
    etiqueta: 'derivado de la norma',
    cuenta: '71 años, residencia de 20 años, sin rentas: 8.803,20 / 14 = 628,80.',
    solicitante: JUB,
    esperado: { pensionAnual: 8803.2, pensionMensual: 628.8 },
  },
  {
    id: 'jubilacion-64-anios',
    clase: 'jubilacion',
    etiqueta: 'derivado de la norma',
    cuenta: '64 años y 11 meses en la solicitud: sin derecho (se exigen 65 cumplidos).',
    solicitante: { ...JUB, nacimiento: '1961-03-11' },
    esperado: { cumpleRequisitos: false },
  },
  {
    id: 'jubilacion-65-justos',
    clase: 'jubilacion',
    etiqueta: 'derivado de la norma',
    cuenta: '65 años cumplidos el mismo día de la solicitud: derecho.',
    solicitante: { ...JUB, nacimiento: '1961-03-10' },
    esperado: { cumpleRequisitos: true, pensionAnual: 8803.2 },
  },
  {
    id: 'jubilacion-residencia-119',
    clase: 'jubilacion',
    etiqueta: 'derivado de la norma',
    cuenta: '119 meses de residencia (< 120): sin derecho.',
    solicitante: { ...JUB, residenciaLegalMeses: 119 },
    esperado: { cumpleRequisitos: false },
  },
  {
    id: 'jubilacion-rentas',
    clase: 'jubilacion',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Rentas 5.000: 5.000 − 3.081,12 = 1.918,88 → 6.884,32 / 14 = 491,74 (la jubilación usa el art. 364: art. 370).',
    solicitante: { ...JUB, rentasAnuales: 5000 },
    esperado: { pensionAnual: 6884.32, pensionMensual: 491.7371 },
  },
  {
    id: 'jubilacion-dos-convivientes-rentas',
    clase: 'jubilacion',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Dos beneficiarios, rentas propias 4.000: (8.803,20 + 6.162,24) / 2 = 7.482,72 − (4.000 − 3.081,12) = 6.563,84.',
    solicitante: { ...JUB, rentasAnuales: 4000 },
    opciones: { unidadEconomica: { convivientes: 2, beneficiarios: 2, rentasUnidadAnuales: 8000 } },
    esperado: { pensionAnual: 6563.84 },
  },
];

describe('Casos de oro de pensiones no contributivas', () => {
  it('hay al menos 12 casos, todos con etiqueta y cuenta', () => {
    expect(CASOS.length).toBeGreaterThanOrEqual(12);
    expect(CASOS.some((k) => k.clase === 'jubilacion')).toBe(true);
    for (const k of CASOS) {
      expect(k.cuenta.length).toBeGreaterThan(10);
      if (k.etiqueta === 'independiente') expect(k.url).toMatch(/^https:\/\//);
    }
  });

  for (const k of CASOS) {
    it(`${k.id} (${k.etiqueta})`, () => {
      const r =
        k.clase === 'incapacidad'
          ? calcularPNCInvalidez(k.solicitante, k.opciones ?? {})
          : calcularPNCJubilacion(k.solicitante, k.opciones ?? {});
      for (const [campo, valor] of Object.entries(k.esperado)) {
        const real = r[campo as keyof ResultadoPNC];
        if (typeof valor === 'number') expect(real as number).toBeCloseTo(valor, 2);
        else expect(real).toBe(valor);
      }
    });
  }

  it('complemento de alquiler de 2024: DatoNoDisponible (el texto descargado no lo recoge)', () => {
    expect(() =>
      calcularPNCInvalidez({ ...INC, fechaSolicitud: '2024-03-10' }, { alquiler: ALQ }),
    ).toThrow(DatoNoDisponible);
  });
});
