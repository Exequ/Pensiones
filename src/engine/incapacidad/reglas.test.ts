/** Tests unitarios por regla del motor de incapacidad permanente. */
import { describe, expect, it } from 'vitest';
import { LIMITACIONES_INCAPACIDAD } from './limitaciones.ts';
import { NoImplementada } from '../jubilacion/errores.ts';
import {
  calcularIncapacidadPermanente,
  revalorizarIncapacidadDelRepositorio,
} from './repositorio.ts';
import { parametrosIncapacidadDelRepositorio } from './parametros-datos.ts';
import { desdeMotor } from './calculo.ts';
import { leerParametroDeRepositorio } from '../jubilacion/parametros-datos.ts';
import { ArchivoDatos } from '../esquema-datos.ts';
import type { OpcionesIncapacidad, ResultadoIncapacidad } from './tipos.ts';

const P = parametrosIncapacidadDelRepositorio();
const R = (id: string): number => {
  const v = P.reglasIP.get(id);
  if (v === undefined) throw new Error(id);
  return v;
};
const SIN_IPC: OpcionesIncapacidad = { actualizarBases: false, huecoBaseMinima: 'anterior' };
const LARGA = [{ desde: '2000-01', hasta: '2026-02', baseMensual: 2000 }];
const paso = (r: ResultadoIncapacidad, id: string) => r.pasos.find((p) => p.id === id);
const requisito = (r: ResultadoIncapacidad, id: string) => r.requisitos.find((q) => q.id === id);

describe('datos de las reglas', () => {
  it('porcentajes por grado, total cualificada, parcial y complemento de gran incapacidad', () => {
    expect(R('total-porcentaje')).toBe(R('total-porcentaje-contraste-1966'));
    expect(R('absoluta-porcentaje')).toBeGreaterThan(R('total-porcentaje'));
    expect(R('gran-incapacidad-porcentaje')).toBe(R('absoluta-porcentaje'));
    expect(R('total-cualificada-pct')).toBeGreaterThan(0);
    expect(R('parcial-mensualidades')).toBeGreaterThan(0);
    expect(R('br-ec-divisor') / R('br-ec-meses')).toBeCloseTo(
      R('br-periodo-corto-coeficiente-divisor'),
      3,
    );
  });

  it('el motor cubre hechos causantes desde el primer año con reglas de revalorización en /data', () => {
    expect(desdeMotor(P)).toBe(2022);
  });

  it('todas las referencias de los pasos y requisitos existen en /data', () => {
    const casos: ResultadoIncapacidad[] = [
      calcularIncapacidadPermanente(LARGA, '1968-01-20', '2026-03-15', 'total', 'enfermedad-comun'),
      calcularIncapacidadPermanente(
        LARGA,
        '1981-03-10',
        '2026-03-15',
        'gran-incapacidad',
        'enfermedad-comun',
        { sexo: 'mujer', hijos: 1 },
      ),
      calcularIncapacidadPermanente(
        LARGA,
        '1981-03-10',
        '2026-03-15',
        'total',
        'accidente-no-laboral',
      ),
      calcularIncapacidadPermanente(
        LARGA,
        '1981-03-10',
        '2026-03-15',
        'parcial',
        'enfermedad-comun',
      ),
    ];
    for (const r of casos) {
      for (const ref of [
        ...r.pasos.flatMap((p) => p.parametros),
        ...r.requisitos.flatMap((q) => q.parametros),
      ]) {
        const m = /^parametros\/([^#]+)\.json#(.+)$/.exec(ref);
        expect(m, ref).not.toBeNull();
        const archivo = ArchivoDatos.parse(leerParametroDeRepositorio(m?.[1] ?? ''));
        expect(
          (archivo.data ?? []).some((d) => d.id === m?.[2]),
          ref,
        ).toBe(true);
      }
    }
  });
});

describe('periodo mínimo de cotización (art. 195)', () => {
  const carencia = (nac: string, opciones: OpcionesIncapacidad = {}) =>
    requisito(
      calcularIncapacidadPermanente(LARGA, nac, '2026-03-15', 'absoluta', 'enfermedad-comun', {
        ...SIN_IPC,
        ...opciones,
      }),
      'carencia',
    );

  it('menores de 31 años: la tercera parte del tiempo desde los 16', () => {
    // 22 años: (264 − 192) / 3 = 24 meses
    expect(carencia('2004-03-10')?.exigido).toBe(24);
  });
  it('31 o más años: la cuarta parte desde los 20, con un mínimo de cinco años', () => {
    expect(carencia('1995-03-10')?.exigido).toBe(R('carencia-general-minimo-meses')); // 31 años
    expect(carencia('1976-03-10')?.exigido).toBe(90); // 50 años: (600 − 240) / 4
  });
  it('se desprecian las fracciones de mes', () => {
    // 45 años y 2 meses: (542 − 240) / 4 = 75,5 → 75
    expect(carencia('1981-01-10')?.exigido).toBe(75);
  });
  it('lectura alternativa: edad redondeada a medios años (RD 1799/1985)', () => {
    // 45 años y 8 meses: sin redondeo (548 − 240) / 4 = 77; con medio año (546 − 240) / 4 = 76
    expect(carencia('1980-07-10')?.exigido).toBe(77);
    expect(
      carencia('1980-07-10', { lecturasIncapacidad: { redondeoEdadCarencia: 'medio-anio' } })
        ?.exigido,
    ).toBe(76);
  });
  it('la quinta parte en los diez años anteriores y, sin alta, quince años', () => {
    const r = calcularIncapacidadPermanente(
      [{ desde: '1990-01', hasta: '2010-12', baseMensual: 2000 }],
      '1966-03-10',
      '2026-03-15',
      'absoluta',
      'enfermedad-comun',
      SIN_IPC,
    );
    expect(requisito(r, 'carencia-reciente')?.cumple).toBe(false);
    expect(r.estado).toBe('no-causa-derecho');
    const sinAlta = calcularIncapacidadPermanente(
      LARGA,
      '1966-03-10',
      '2026-03-15',
      'absoluta',
      'enfermedad-comun',
      { ...SIN_IPC, enAlta: false },
    );
    expect(requisito(sinAlta, 'carencia')?.exigido).toBe(R('carencia-sin-alta-meses'));
  });
  it('desde una situación sin obligación de cotizar, la ventana se cuenta desde el cese', () => {
    const carrera = [{ desde: '1990-01', hasta: '2014-12', baseMensual: 2000 }];
    const base = calcularIncapacidadPermanente(
      carrera,
      '1966-03-10',
      '2026-03-15',
      'absoluta',
      'enfermedad-comun',
      SIN_IPC,
    );
    const conCese = calcularIncapacidadPermanente(
      carrera,
      '1966-03-10',
      '2026-03-15',
      'absoluta',
      'enfermedad-comun',
      { ...SIN_IPC, finObligacionCotizar: '2015-01-01' },
    );
    expect(requisito(base, 'carencia-reciente')?.cumple).toBe(false);
    expect(requisito(conCese, 'carencia-reciente')?.cumple).toBe(true);
  });
  it('los meses que faltaban para agotar la incapacidad temporal cuentan como cotizados', () => {
    const corta = [{ desde: '2021-06', hasta: '2026-02', baseMensual: 2000 }]; // 57 meses
    const sin = calcularIncapacidadPermanente(
      corta,
      '1990-03-10',
      '2026-03-15',
      'total',
      'enfermedad-comun',
      SIN_IPC,
    );
    const con = calcularIncapacidadPermanente(
      corta,
      '1990-03-10',
      '2026-03-15',
      'total',
      'enfermedad-comun',
      { ...SIN_IPC, mesesAsimiladosIT: 6 },
    );
    expect(requisito(sin, 'carencia')?.cumple).toBe(false);
    expect(requisito(con, 'carencia')?.cumple).toBe(true);
  });
  it('accidente y enfermedad profesional: sin periodo previo', () => {
    const r = calcularIncapacidadPermanente(
      [{ desde: '2026-01', hasta: '2026-02', baseMensual: 2000 }],
      '1990-03-10',
      '2026-03-15',
      'total',
      'accidente-no-laboral',
      SIN_IPC,
    );
    expect(r.cumpleRequisitos).toBe(true);
    expect(requisito(r, 'carencia')).toBeUndefined();
  });
  it('parcial: 1.800 días en diez años (días naturales o treinta por mes)', () => {
    const carrera = [{ desde: '2021-01', hasta: '2025-11', baseMensual: 2000 }]; // 59 meses
    const nat = calcularIncapacidadPermanente(
      carrera,
      '1980-01-01',
      '2026-03-15',
      'parcial',
      'enfermedad-comun',
      SIN_IPC,
    );
    const treinta = calcularIncapacidadPermanente(
      carrera,
      '1980-01-01',
      '2026-03-15',
      'parcial',
      'enfermedad-comun',
      {
        ...SIN_IPC,
        lecturasIncapacidad: { diasCotizadosParcial: 'treinta-por-mes' },
      },
    );
    // 2021-01 a 2025-11: 1.795 días naturales; 59 × 30 = 1.770
    expect(requisito(nat, 'carencia-parcial')?.valor).toBe(1795);
    expect(requisito(treinta, 'carencia-parcial')?.valor).toBe(59 * 30);
    expect(requisito(nat, 'carencia-parcial')?.exigido).toBe(R('carencia-parcial-dias'));
    expect(nat.cantidadTantoAlzado).toBe(0);
    const doce = calcularIncapacidadPermanente(
      [{ desde: '2021-01', hasta: '2025-12', baseMensual: 2000 }],
      '1980-01-01',
      '2026-03-15',
      'parcial',
      'enfermedad-comun',
      SIN_IPC,
    );
    expect(requisito(doce, 'carencia-parcial')?.cumple).toBe(true);
  });
  it('sin alta solo causan pensión la absoluta y la gran incapacidad', () => {
    const r = calcularIncapacidadPermanente(
      LARGA,
      '1970-03-10',
      '2026-03-15',
      'total',
      'enfermedad-comun',
      { ...SIN_IPC, enAlta: false },
    );
    expect(requisito(r, 'alta')?.cumple).toBe(false);
  });
});

describe('base reguladora (art. 197 y art. 7 del Decreto 1646/1972)', () => {
  it('periodo corto: con la alternativa 14/12 el divisor cambia muy poco', () => {
    const a = calcularIncapacidadPermanente(
      LARGA,
      '1981-03-10',
      '2026-03-15',
      'absoluta',
      'enfermedad-comun',
      SIN_IPC,
    );
    const b = calcularIncapacidadPermanente(
      LARGA,
      '1981-03-10',
      '2026-03-15',
      'absoluta',
      'enfermedad-comun',
      { ...SIN_IPC, lecturasIncapacidad: { divisorPeriodoCorto: 'catorce-doceavos' } },
    );
    expect(b.baseReguladora).toBeCloseTo((2000 * 12) / 14, 4);
    expect(Math.abs(a.baseReguladora / b.baseReguladora - 1)).toBeLessThan(1e-4);
  });
  it('periodo general (52 años o más): 96 bases entre 112', () => {
    const r = calcularIncapacidadPermanente(
      LARGA,
      '1970-03-10',
      '2026-03-15',
      'absoluta',
      'enfermedad-comun',
      SIN_IPC,
    );
    expect(paso(r, 'base-reguladora-bases')?.valor).toBeCloseTo((96 * 2000) / 112, 4);
  });
  it('la actualización con el IPC eleva la base de una carrera constante', () => {
    const sin = calcularIncapacidadPermanente(
      LARGA,
      '1970-03-10',
      '2026-03-15',
      'absoluta',
      'enfermedad-comun',
      SIN_IPC,
    );
    const con = calcularIncapacidadPermanente(
      LARGA,
      '1970-03-10',
      '2026-03-15',
      'absoluta',
      'enfermedad-comun',
    );
    expect(con.baseReguladora).toBeGreaterThan(sin.baseReguladora);
  });
  it('accidente no laboral: meses sin cotizar a cero o integrados (lectura abierta)', () => {
    const carrera = [{ desde: '2024-01', hasta: '2025-06', baseMensual: 2000 }]; // 18 meses
    const cero = calcularIncapacidadPermanente(
      carrera,
      '1981-03-10',
      '2026-03-15',
      'total',
      'accidente-no-laboral',
      SIN_IPC,
    );
    const integra = calcularIncapacidadPermanente(
      carrera,
      '1981-03-10',
      '2026-03-15',
      'total',
      'accidente-no-laboral',
      { ...SIN_IPC, lecturasIncapacidad: { lagunasAccidenteNoLaboral: 'integrar' } },
    );
    expect(cero.baseReguladora).toBeCloseTo((18 * 2000) / 28, 4);
    expect(integra.baseReguladora).toBeGreaterThan(cero.baseReguladora);
  });
  it('el periodo elegido debe estar dentro de los siete años', () => {
    expect(() =>
      calcularIncapacidadPermanente(
        LARGA,
        '1981-03-10',
        '2026-03-15',
        'total',
        'accidente-no-laboral',
        { ...SIN_IPC, periodoElegidoDesde: '2010-01' },
      ),
    ).toThrow(RangeError);
  });
});

describe('porcentaje del art. 197.1.b) con los años hasta la edad ordinaria', () => {
  const pct = (opciones: OpcionesIncapacidad = {}) =>
    paso(
      calcularIncapacidadPermanente(
        [{ desde: '2012-01', hasta: '2026-02', baseMensual: 2000 }],
        '1968-01-20',
        '2026-03-15',
        'absoluta',
        'enfermedad-comun',
        { ...SIN_IPC, ...opciones },
      ),
      'porcentaje-cotizacion',
    )?.valor as number;
  it('sin quince años con la ficción, el 50 %', () => {
    const r = calcularIncapacidadPermanente(
      [{ desde: '2015-05', hasta: '2026-02', baseMensual: 2000 }],
      '1963-03-10',
      '2026-03-15',
      'absoluta',
      'enfermedad-comun',
      SIN_IPC,
    );
    expect(paso(r, 'porcentaje-cotizacion')?.valor).toBe(R('br-ec-porcentaje-sin-15-anios'));
  });
  it('años completos dan un porcentaje menor o igual que meses', () => {
    expect(pct({ lecturasIncapacidad: { computoFiccion: 'anios-completos' } })).toBeLessThanOrEqual(
      pct(),
    );
  });
  it('edad general (sin carrera larga) da igual o más meses que la carrera proyectada', () => {
    expect(pct({ lecturasIncapacidad: { edadFiccion: 'edad-general' } })).toBeGreaterThanOrEqual(
      pct(),
    );
  });
});

describe('grados, complementos y límites', () => {
  it('total cualificada: 55 años o más; se suspende si trabaja; se puede excluir', () => {
    const base = calcularIncapacidadPermanente(
      LARGA,
      '1968-01-20',
      '2026-03-15',
      'total',
      'enfermedad-comun',
      SIN_IPC,
    );
    expect(base.incrementoTotalCualificada).toBeCloseTo(
      (base.baseReguladora * R('total-cualificada-pct')) / 100,
      6,
    );
    const trabaja = calcularIncapacidadPermanente(
      LARGA,
      '1968-01-20',
      '2026-03-15',
      'total',
      'enfermedad-comun',
      { ...SIN_IPC, trabaja: true },
    );
    expect(trabaja.incrementoTotalCualificada).toBe(0);
    const no = calcularIncapacidadPermanente(
      LARGA,
      '1968-01-20',
      '2026-03-15',
      'total',
      'enfermedad-comun',
      { ...SIN_IPC, totalCualificada: false },
    );
    expect(no.incrementoTotalCualificada).toBe(0);
    const joven = calcularIncapacidadPermanente(
      LARGA,
      '1981-03-10',
      '2026-03-15',
      'total',
      'enfermedad-comun',
      { ...SIN_IPC, totalCualificada: true },
    );
    expect(joven.incrementoTotalCualificada).toBe(0);
  });
  it('total de 60 a 64 y de 65 o más años: su propia mínima', () => {
    const pobre = [{ desde: '2000-01', hasta: '2026-02', baseMensual: 700 }];
    const r62 = calcularIncapacidadPermanente(
      pobre,
      '1964-01-10',
      '2026-03-15',
      'total',
      'accidente-no-laboral',
      SIN_IPC,
    );
    expect(
      paso(r62, 'complemento-minimos')?.parametros.some((x) => x.includes('ip-total-60-64')),
    ).toBe(true);
    const r65 = calcularIncapacidadPermanente(
      pobre,
      '1960-12-10',
      '2026-03-15',
      'total',
      'accidente-no-laboral',
      SIN_IPC,
    );
    expect(
      paso(r65, 'complemento-minimos')?.parametros.some((x) => x.includes('ip-total-65')),
    ).toBe(true);
    const r45 = calcularIncapacidadPermanente(
      pobre,
      '1981-03-10',
      '2026-03-15',
      'total',
      'accidente-no-laboral',
      SIN_IPC,
    );
    expect(paso(r45, 'sin-minima')).toBeDefined();
  });
  it('gran incapacidad: la mínima comprende pensión y complemento', () => {
    const pobre = [{ desde: '2000-01', hasta: '2026-02', baseMensual: 700 }];
    const r = calcularIncapacidadPermanente(
      pobre,
      '1981-03-10',
      '2026-03-15',
      'gran-incapacidad',
      'enfermedad-comun',
      SIN_IPC,
    );
    const minima = (P.pensionMinima.get('2026-ip-gran-invalidez-unipersonal') ?? 0) / 14;
    expect(r.pensionMensual).toBeCloseTo(Math.max(minima, r.pensionMensual), 6);
    expect(r.pensionMensual).toBeGreaterThanOrEqual(minima - 1e-9);
  });
  it('sin cónyuge a cargo con rentas por encima del límite no hay complemento a mínimos', () => {
    const pobre = [{ desde: '2000-01', hasta: '2026-02', baseMensual: 700 }];
    const r = calcularIncapacidadPermanente(
      pobre,
      '1981-03-10',
      '2026-03-15',
      'absoluta',
      'enfermedad-comun',
      { ...SIN_IPC, rentasAnuales: 50000 },
    );
    expect(paso(r, 'minimos-limite-ingresos')).toBeDefined();
    expect(r.estado).toBe('contributiva');
  });
  it('el complemento de brecha no se aplica a la parcial (pago único)', () => {
    const r = calcularIncapacidadPermanente(
      LARGA,
      '1981-03-10',
      '2026-03-15',
      'parcial',
      'enfermedad-comun',
      { ...SIN_IPC, sexo: 'mujer', hijos: 2 },
    );
    expect(r.pensionMensual).toBe(0);
    expect(paso(r, 'complemento-brecha')).toBeUndefined();
  });
  it('un hombre solo con las condiciones del art. 60.1.b)', () => {
    const sin = calcularIncapacidadPermanente(
      LARGA,
      '1981-03-10',
      '2026-03-15',
      'absoluta',
      'enfermedad-comun',
      { ...SIN_IPC, sexo: 'hombre', hijos: 2 },
    );
    const con = calcularIncapacidadPermanente(
      LARGA,
      '1981-03-10',
      '2026-03-15',
      'absoluta',
      'enfermedad-comun',
      { ...SIN_IPC, sexo: 'hombre', hijos: 2, hombreCumpleArt60: true },
    );
    expect(con.pensionMensual).toBeGreaterThan(sin.pensionMensual);
  });
});

describe('ramas no implementadas', () => {
  it('hechos causantes anteriores a 2022', () => {
    expect(() =>
      calcularIncapacidadPermanente(
        LARGA,
        '1970-01-01',
        '2021-06-01',
        'absoluta',
        'enfermedad-comun',
      ),
    ).toThrow(NoImplementada);
  });
  it('contingencias profesionales sin base facilitada', () => {
    expect(() =>
      calcularIncapacidadPermanente(
        LARGA,
        '1970-01-01',
        '2026-03-15',
        'absoluta',
        'enfermedad-profesional',
      ),
    ).toThrow(NoImplementada);
    expect(() =>
      calcularIncapacidadPermanente(
        LARGA,
        '1970-01-01',
        '2026-03-15',
        'parcial',
        'accidente-trabajo',
      ),
    ).toThrow(NoImplementada);
  });
  it('trabajo de un pensionista de absoluta antes del 22/12/2024', () => {
    expect(() =>
      calcularIncapacidadPermanente(
        LARGA,
        '1970-01-01',
        '2024-06-01',
        'absoluta',
        'enfermedad-comun',
        { trabaja: true, escenario: { ipc: 0.02 } },
      ),
    ).toThrow(NoImplementada);
  });
  it('LIMITACIONES recoge las ramas no implementadas', () => {
    expect(LIMITACIONES_INCAPACIDAD.length).toBeGreaterThanOrEqual(8);
  });
});

describe('revalorización', () => {
  it('la pensión y el complemento de gran incapacidad se revalorizan por separado con el mismo porcentaje', () => {
    const r = calcularIncapacidadPermanente(
      LARGA,
      '1981-03-10',
      '2025-03-15',
      'gran-incapacidad',
      'enfermedad-comun',
      SIN_IPC,
    );
    const serie = revalorizarIncapacidadDelRepositorio(r, 2028, { escenario: { ipc: 0.02 } });
    expect(serie[0]?.total).toBeCloseTo(r.pensionMensual, 6);
    const ultimo = serie.at(-1);
    expect(ultimo?.anio).toBe(2028);
    const factor = (ultimo?.pension ?? 0) / (serie[0]?.pension ?? 1);
    expect((ultimo?.complementoGranIncapacidad ?? 0) / r.complementoGranIncapacidad).toBeCloseTo(
      factor,
      9,
    );
  });
});
