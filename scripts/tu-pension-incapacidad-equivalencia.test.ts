// @vitest-environment node
/**
 * Fase 3-C1, paso 4: el mapeador de incapacidad de «Tu pensión», con la carrera equivalente, da el
 * mismo resultado que la llamada directa al motor (±0,01) en casos de oro de la incapacidad
 * (`src/engine/incapacidad/casos-oro-incapacidad.test.ts`, «derivados de la norma»).
 *
 * El único ajuste respecto a los casos de oro es `actualizarBases: false`, que el formulario no
 * ofrece: se añade a la entrada del mapeador para que la cuenta a mano sea exacta. Las fechas del
 * mapeador son el día 1 del mes; en estos casos el mes del nacimiento y del hecho causante dan la
 * misma edad en meses que los días de los casos de oro.
 */
import { describe, expect, it } from 'vitest';
import { crearMotor } from '../src/engine/fachada.ts';
import type {
  GradoIncapacidad,
  OpcionesIncapacidad,
  OrigenIncapacidad,
} from '../src/engine/incapacidad/tipos.ts';
import { formularioAEntradaIncapacidad } from '../src/modules/tu-pension/incapacidad-mapeador.ts';
import { FORMULARIO_BASE } from '../src/modules/tu-pension/pruebas.ts';
import type { FormularioTuPension } from '../src/modules/tu-pension/tipos.ts';
import type { TramoFormulario } from '../src/modules/tu-pension/tramos.ts';
import { leerParametroDeDisco } from './lib/motor-jubilacion.ts';
import { catalogoDesdeDisco } from './lib/referencias-disco.ts';

const catalogo = catalogoDesdeDisco();

const tramo = (id: string, d: string, h: string, importe: string): TramoFormulario => {
  const [da = '', dm = ''] = d.split('-');
  const [ha = '', hm = ''] = h.split('-');
  return {
    id,
    desdeMes: String(Number(dm)),
    desdeAnio: da,
    hastaMes: String(Number(hm)),
    hastaAnio: ha,
    referencia: 'importe',
    importe,
  };
};

interface Caso {
  readonly id: string;
  readonly formulario: Partial<FormularioTuPension>;
  /** Llamada directa al motor con los datos del caso de oro. */
  readonly directa: {
    readonly carrera: { desde: string; hasta: string; baseMensual: number }[];
    readonly nacimiento: string;
    readonly hc: string;
    readonly grado: GradoIncapacidad;
    readonly origen: OrigenIncapacidad;
    readonly opciones: OpcionesIncapacidad;
  };
  readonly esperado: Record<string, number>;
}

const LARGA = [{ desde: '2000-01', hasta: '2026-02', baseMensual: 2000 }];
const BASE = { actualizarBases: false } as const;
const COMUN = {
  prestacion: 'incapacidad' as const,
  nacimientoMes: '3',
  nacimientoAnio: '1981',
  jubilacionMes: '3',
  jubilacionAnio: '2026',
  inicioMes: '1',
  inicioAnio: '2000',
  baseMensual: '2000',
  ipcSupuesto: '',
  origen: 'enfermedad-comun' as const,
};
const DIRECTA = { carrera: LARGA, nacimiento: '1981-03-10', hc: '2026-03-15' };

const CASOS: readonly Caso[] = [
  {
    id: 'total-ec-45',
    formulario: { ...COMUN, grado: 'total' },
    directa: { ...DIRECTA, grado: 'total', origen: 'enfermedad-comun', opciones: BASE },
    esperado: { baseReguladora: 1714.3837, pensionMensual: 942.911 },
  },
  {
    id: 'absoluta-ec-45',
    formulario: { ...COMUN, grado: 'absoluta' },
    directa: { ...DIRECTA, grado: 'absoluta', origen: 'enfermedad-comun', opciones: BASE },
    esperado: { pensionMensual: 1714.3837 },
  },
  {
    id: 'gran-incapacidad-ec-45',
    formulario: { ...COMUN, grado: 'gran-incapacidad' },
    directa: { ...DIRECTA, grado: 'gran-incapacidad', origen: 'enfermedad-comun', opciones: BASE },
    esperado: { complementoGranIncapacidad: 1240.98, pensionMensual: 2955.3637 },
  },
  {
    id: 'total-ec-minima-sin-rentas',
    formulario: { ...COMUN, grado: 'total', baseMensual: '900' },
    directa: {
      ...DIRECTA,
      carrera: [{ desde: '2000-01', hasta: '2026-02', baseMensual: 900 }],
      grado: 'total',
      origen: 'enfermedad-comun',
      opciones: BASE,
    },
    esperado: { pensionMensual: 690.2 },
  },
  {
    id: 'total-ec-brecha (mujer, dos hijos)',
    formulario: { ...COMUN, grado: 'total', sexo: 'mujer', hijos: '2' },
    directa: {
      ...DIRECTA,
      grado: 'total',
      origen: 'enfermedad-comun',
      opciones: { ...BASE, sexo: 'mujer', hijos: 2 },
    },
    esperado: {},
  },
  {
    id: 'gran-incapacidad-trabaja',
    formulario: { ...COMUN, grado: 'gran-incapacidad', trabaja: true },
    directa: {
      ...DIRECTA,
      grado: 'gran-incapacidad',
      origen: 'enfermedad-comun',
      opciones: { ...BASE, trabaja: true },
    },
    esperado: { importeEnSuspenso: 1714.3837, complementoGranIncapacidad: 1240.98 },
  },
  {
    id: 'parcial-ec',
    formulario: { ...COMUN, grado: 'parcial' },
    directa: {
      ...DIRECTA,
      grado: 'parcial',
      origen: 'enfermedad-comun',
      opciones: { ...BASE, inicioIncapacidadTemporal: '2025-06' },
    },
    esperado: { cantidadTantoAlzado: 48000, pensionMensual: 0 },
  },
  {
    id: 'total-anl-periodo-favorable (carrera por tramos)',
    formulario: {
      ...COMUN,
      grado: 'total',
      origen: 'accidente-no-laboral',
      tipoCarrera: 'tramos',
      tramos: [
        tramo('a', '2019-03', '2021-12', '1500'),
        tramo('b', '2022-01', '2023-12', '3000'),
        tramo('c', '2024-01', '2026-02', '1800'),
      ],
    },
    directa: {
      ...DIRECTA,
      carrera: [
        { desde: '2019-03', hasta: '2021-12', baseMensual: 1500 },
        { desde: '2022-01', hasta: '2023-12', baseMensual: 3000 },
        { desde: '2024-01', hasta: '2026-02', baseMensual: 1800 },
      ],
      grado: 'total',
      origen: 'accidente-no-laboral',
      opciones: BASE,
    },
    esperado: { baseReguladora: 2571.4286, pensionMensual: 1414.2857 },
  },
];

describe('el mapeador de incapacidad equivale a la llamada directa al motor (casos de oro)', () => {
  it('hay al menos tres casos', () => {
    expect(CASOS.length).toBeGreaterThanOrEqual(3);
  });
  for (const caso of CASOS) {
    it(`${caso.id}: mismos resultados (±0,01)`, () => {
      const motor = crearMotor(leerParametroDeDisco);
      const directa = motor.incapacidadPermanente({
        carrera: caso.directa.carrera,
        nacimiento: caso.directa.nacimiento,
        fechaHechoCausante: caso.directa.hc,
        grado: caso.directa.grado,
        origen: caso.directa.origen,
        opciones: caso.directa.opciones,
      });
      if (!directa.ok) throw directa.error.original;
      const mapeo = formularioAEntradaIncapacidad(
        { ...FORMULARIO_BASE, ...caso.formulario },
        catalogo,
      );
      if (!mapeo.ok) throw new Error(JSON.stringify([mapeo.errores, mapeo.erroresTramos]));
      const via = crearMotor(leerParametroDeDisco, mapeo.configuracion).incapacidadPermanente({
        ...mapeo.entrada,
        opciones: { ...mapeo.entrada.opciones, ...BASE },
      });
      if (!via.ok) throw via.error.original;
      const a = via.detalle;
      const b = directa.detalle;
      expect(a.cumpleRequisitos).toBe(b.cumpleRequisitos);
      for (const campo of [
        'pensionMensual',
        'baseReguladora',
        'cantidadTantoAlzado',
        'complementoGranIncapacidad',
        'incrementoTotalCualificada',
        'importeEnSuspenso',
      ] as const) {
        expect(Math.abs(a[campo] - b[campo]), campo).toBeLessThanOrEqual(0.01);
      }
      expect(a.mesesCotizados).toBe(b.mesesCotizados);
      for (const [campo, valor] of Object.entries(caso.esperado)) {
        expect(
          Math.abs((a as unknown as Record<string, number>)[campo]! - valor),
          campo,
        ).toBeLessThanOrEqual(0.01);
      }
    });
  }
});
