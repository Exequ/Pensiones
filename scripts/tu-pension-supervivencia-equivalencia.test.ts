// @vitest-environment node
/**
 * Fase 3-C2, paso 5: el mapeador de viudedad y orfandad de «Tu pensión» (formulario → entrada), con la
 * llamada a la fachada, da el mismo resultado que la llamada directa al motor (±0,01) y el que se ha
 * calculado a mano en los casos de oro de supervivencia
 * (`src/engine/supervivencia/casos-oro-supervivencia.test.ts`, «derivados de la norma»).
 *
 * Las fechas del mapeador son el día 1 del mes; en estos casos el mes del nacimiento, del matrimonio y
 * del fallecimiento dan las mismas edades y duraciones en meses que los días de los casos de oro.
 * Bases de 2.000 euros: base reguladora 24 × 2.000 / 28 = 1.714,2857 euros al mes.
 */
import { describe, expect, it } from 'vitest';
import { crearMotor } from '../src/engine/fachada.ts';
import type {
  Beneficiarios,
  Causante,
  OpcionesSupervivencia,
} from '../src/engine/supervivencia/tipos.ts';
import { ejecutarSupervivencia } from '../src/modules/tu-pension/supervivencia-ejecutor.ts';
import { formularioAEntradaSupervivencia } from '../src/modules/tu-pension/supervivencia-mapeador.ts';
import {
  HUERFANO_VACIO,
  nuevoHuerfano,
  type FormularioViudo,
} from '../src/modules/tu-pension/supervivencia-tipos.ts';
import { FORMULARIO_ORFANDAD, FORMULARIO_VIUDEDAD } from '../src/modules/tu-pension/pruebas.ts';
import type { FormularioTuPension } from '../src/modules/tu-pension/tipos.ts';
import { leerParametroDeDisco } from './lib/motor-jubilacion.ts';
import { catalogoDesdeDisco } from './lib/referencias-disco.ts';

const catalogo = catalogoDesdeDisco();

const ALTA: Causante = {
  fechaFallecimiento: '2026-03-15',
  causa: 'enfermedad-comun',
  situacion: 'alta',
  carrera: [{ desde: '2010-01', hasta: '2026-02', baseMensual: 2000 }],
};
const huerfano = (anio: string) => ({
  ...nuevoHuerfano(),
  nacimientoMes: '1',
  nacimientoAnio: anio,
});
const viudo = (v: Partial<FormularioViudo>): FormularioViudo => ({
  ...FORMULARIO_VIUDEDAD.supervivencia.viudo,
  ...v,
});

interface Caso {
  readonly id: string;
  readonly formulario: FormularioTuPension;
  readonly quien: 'viudedad' | 'orfandad';
  /** Caso de oro del motor con las mismas entradas. */
  readonly directa: { beneficiarios: Beneficiarios; opciones?: OpcionesSupervivencia };
  /** Pensión mensual por paga de la persona que pregunta, calculada a mano. */
  readonly esperado: number;
  readonly cuenta: string;
}

const CASOS: readonly Caso[] = [
  {
    id: 'viudedad-52',
    formulario: FORMULARIO_VIUDEDAD,
    quien: 'viudedad',
    directa: {
      beneficiarios: {
        viudos: [{ vinculo: 'conyuge', nacimiento: '1976-05-01', fechaMatrimonio: '2005-06-01' }],
      },
    },
    esperado: 891.43,
    cuenta: '1.714,2857 × 52 % = 891,43 (mínima 709,40)',
  },
  {
    id: 'viudedad-60-mayor-65',
    formulario: {
      ...FORMULARIO_VIUDEDAD,
      supervivencia: {
        ...FORMULARIO_VIUDEDAD.supervivencia,
        viudo: viudo({ nacimientoMes: '1', nacimientoAnio: '1956' }),
      },
    },
    quien: 'viudedad',
    directa: {
      beneficiarios: {
        viudos: [{ vinculo: 'conyuge', nacimiento: '1956-01-01', fechaMatrimonio: '2005-06-01' }],
      },
    },
    esperado: 1028.57,
    cuenta: '1.714,2857 × 60 % = 1.028,57',
  },
  {
    id: 'pareja-hecho',
    formulario: {
      ...FORMULARIO_VIUDEDAD,
      supervivencia: {
        ...FORMULARIO_VIUDEDAD.supervivencia,
        viudo: viudo({
          vinculo: 'pareja-hecho',
          convivenciaMeses: '72',
          registroMes: '1',
          registroAnio: '2023',
        }),
      },
    },
    quien: 'viudedad',
    directa: {
      beneficiarios: {
        viudos: [
          {
            vinculo: 'pareja-hecho',
            nacimiento: '1976-05-01',
            convivenciaMeses: 72,
            fechaRegistroPareja: '2023-01-01',
            hijosComunes: false,
          },
        ],
      },
    },
    esperado: 891.43,
    cuenta: 'Convivencia 72 meses y inscripción de más de 24 meses: 52 % = 891,43',
  },
  {
    id: 'excónyuge-compensatoria',
    formulario: {
      ...FORMULARIO_VIUDEDAD,
      supervivencia: {
        ...FORMULARIO_VIUDEDAD.supervivencia,
        viudo: viudo({ vinculo: 'excónyuge', compensatoriaAnual: '6000' }),
      },
    },
    quien: 'viudedad',
    directa: {
      beneficiarios: {
        viudos: [
          {
            vinculo: 'excónyuge',
            nacimiento: '1976-05-01',
            pensionCompensatoriaAnual: 6000,
            victimaViolenciaGenero: false,
            nuevoVinculo: false,
            separacionAnteriorA2008: false,
          },
        ],
      },
    },
    esperado: 709.4,
    cuenta:
      '52 % × 14 = 12.480 > compensatoria 6.000 → 6.000 / 14 = 428,57; mínima 9.931,60 / 14 = 709,40',
  },
  {
    id: 'orfandad-un-huerfano',
    formulario: FORMULARIO_ORFANDAD,
    quien: 'orfandad',
    directa: { beneficiarios: { huerfanos: [{ nacimiento: '2016-01-01' }] } },
    esperado: 342.86,
    cuenta: '20 % = 342,86 > mínima 4.011 / 14 = 286,50',
  },
  {
    id: 'orfandad-absoluta-dos',
    formulario: {
      ...FORMULARIO_ORFANDAD,
      supervivencia: {
        ...FORMULARIO_ORFANDAD.supervivencia,
        orfandadAbsoluta: true,
        otrosHuerfanos: [huerfano('2012')],
      },
    },
    quien: 'orfandad',
    directa: {
      beneficiarios: { huerfanos: [{ nacimiento: '2016-01-01' }, { nacimiento: '2012-01-01' }] },
      opciones: { orfandadAbsoluta: true },
    },
    esperado: 788.57,
    cuenta: '20 % + 52 % / 2 = 46 % × 1.714,2857 = 788,57 (suma 92 % ≤ 100 %)',
  },
  {
    id: 'viudedad-cuatro-huerfanos',
    formulario: {
      ...FORMULARIO_ORFANDAD,
      supervivencia: {
        ...FORMULARIO_ORFANDAD.supervivencia,
        huerfano: { ...HUERFANO_VACIO, nacimientoMes: '1', nacimientoAnio: '2016' },
        hayViudo: true,
        viudo: viudo({}),
        otrosHuerfanos: [huerfano('2010'), huerfano('2012'), huerfano('2014')],
      },
    },
    quien: 'orfandad',
    directa: {
      beneficiarios: {
        viudos: [{ vinculo: 'conyuge', nacimiento: '1976-05-01', fechaMatrimonio: '2005-06-01' }],
        huerfanos: [
          { nacimiento: '2016-01-01' },
          { nacimiento: '2010-01-01' },
          { nacimiento: '2012-01-01' },
          { nacimiento: '2014-01-01' },
        ],
      },
    },
    esperado: 286.5,
    cuenta:
      'Viudedad 52 % + 4 × 20 % = 132 % → orfandades al 48 % (12 % = 205,71 cada una); mínima 4.011 / 14 = 286,50',
  },
];

describe('«Tu pensión» (viudedad y orfandad) equivale al motor y a las cuentas a mano de los casos de oro', () => {
  for (const c of CASOS) {
    it(`${c.id}: ${c.cuenta}`, () => {
      const mapeo = formularioAEntradaSupervivencia(c.formulario, c.quien, catalogo);
      if (!mapeo.ok) throw new Error(JSON.stringify(mapeo.errores));
      const motor = crearMotor(leerParametroDeDisco, mapeo.configuracion);
      const ui = ejecutarSupervivencia(motor, mapeo.entrada);
      if (!ui.ok) throw ui.error.original;
      const directo = crearMotor(leerParametroDeDisco).supervivencia({
        causante: ALTA,
        beneficiarios: c.directa.beneficiarios,
        ...(c.directa.opciones === undefined ? {} : { opciones: c.directa.opciones }),
      });
      if (!directo.ok) throw directo.error.original;
      const lista = c.quien === 'viudedad' ? directo.detalle.viudedad : directo.detalle.orfandad;
      expect(Math.abs(ui.detalle.pensionMensual - (lista[0]?.pensionMensual ?? NaN))).toBeLessThan(
        0.01,
      );
      expect(Math.abs(ui.detalle.pensionMensual - c.esperado)).toBeLessThan(0.01);
    });
  }
});
