import { describe, expect, it } from 'vitest';
import { DatoNoDisponible, NoImplementada } from './errores.ts';
import { aEurosConstantesMotor, revalorizarPension } from './revalorizacion.ts';
import { PARAMS, calc, contexto, continua, paso, requisito } from './pruebas.ts';

const ESC = { ipc: 0.02 } as const;
const BASE = { escenario: ESC, actualizarBases: false, usarOpcion25Anos: false } as const;

describe('jubilación anticipada voluntaria (art. 208)', () => {
  const carrera = [continua('1988-01', '2029-12', 2500)];
  it('no se puede anticipar más de 24 meses', () => {
    // 25 meses antes de los 65 años
    const r = calc(carrera, '1967-02-01', '2030-01-01', 'anticipada-voluntaria', BASE);
    expect(requisito(r, 'edad').cumple).toBe(false);
    expect(r.cumpleRequisitos).toBe(false);
  });
  it('exige 35 años de cotización efectiva: 419 meses no bastan y 420 sí', () => {
    const corta = calc(
      [continua('1995-02', '2029-12', 2500)],
      '1966-01-01',
      '2030-01-01',
      'anticipada-voluntaria',
      BASE,
    );
    expect(requisito(corta, 'cotizacion-efectiva').valor).toBe(419);
    expect(requisito(corta, 'cotizacion-efectiva').cumple).toBe(false);
    const justa = calc(
      [continua('1995-01', '2029-12', 2500)],
      '1966-01-01',
      '2030-01-01',
      'anticipada-voluntaria',
      BASE,
    );
    expect(requisito(justa, 'cotizacion-efectiva').cumple).toBe(true);
  });
  it('si la edad ya es la ordinaria no hay anticipación y la modalidad no procede', () => {
    const r = calc(carrera, '1965-01-01', '2030-01-01', 'anticipada-voluntaria', BASE);
    expect(requisito(r, 'anticipacion').cumple).toBe(false);
  });
  it('la pensión reducida debe superar la mínima de los 65 años (art. 208.1.c)', () => {
    const r = calc(
      [continua('1988-01', '2029-12', 1000)],
      '1966-01-01',
      '2030-01-01',
      'anticipada-voluntaria',
      BASE,
    );
    expect(requisito(r, 'pension-superior-a-la-minima').cumple).toBe(false);
    expect(r.estado).toBe('no-causa-derecho');
  });
  it('con 3 meses de subsidio se aplican los coeficientes de la involuntaria y el tope por trimestres (art. 208.3)', () => {
    const vol = calc(carrera, '1966-01-01', '2030-01-01', 'anticipada-voluntaria', BASE);
    const sub = calc(carrera, '1966-01-01', '2030-01-01', 'anticipada-voluntaria', {
      ...BASE,
      mesesSubsidioDesempleo: 3,
    });
    expect(paso(vol, 'coeficiente-reductor').valor).toBe(5);
    expect(paso(sub, 'coeficiente-reductor').valor).toBe(5);
    expect(paso(sub, 'tope-trimestres').valor).toBeGreaterThan(0);
    const sub24 = calc(
      [continua('1989-01', '2029-12', 2500)],
      '1967-02-01',
      '2030-01-01',
      'anticipada-voluntaria',
      { ...BASE, mesesSubsidioDesempleo: 3, calcularAunqueNoCumpla: true },
    );
    expect(paso(sub24, 'coeficiente-reductor').valor).toBeLessThan(21);
  });
  it('con pensión por encima del límite los coeficientes se aplican sobre el límite, de forma gradual (DT 34.ª)', () => {
    const alta = [continua('1988-01', '2029-12', 20000)];
    const r = calc(alta, '1966-01-01', '2030-01-01', 'anticipada-voluntaria', {
      escenario: ESC,
      usarOpcion25Anos: false,
    });
    const maxima = contexto({ escenario: ESC }).pensionMaxima(2030).valor;
    const coef = paso(r, 'coeficiente-sobre-limite').valor as number;
    expect(coef).toBe(4.1); // 2030, 12 meses, tramo 3 (504 meses): tabla de la DT 34.ª
    expect(r.pensionMensual).toBeCloseTo(maxima * (1 - coef / 100), 6);
  });
  it('antes de 2022 no está implementada', () => {
    expect(() =>
      calc(
        [continua('1988-01', '2020-12', 2500)],
        '1957-06-01',
        '2021-01-01',
        'anticipada-voluntaria',
        BASE,
      ),
    ).toThrow(NoImplementada);
  });
});

describe('jubilación anticipada involuntaria (art. 207)', () => {
  const carrera = [continua('1989-01', '2029-12', 2500)];
  it('hasta 48 meses de anticipación; 49 no', () => {
    const ok = calc(
      [continua('1985-01', '2029-12', 2500)],
      '1969-01-01',
      '2030-01-01',
      'anticipada-involuntaria',
      BASE,
    );
    expect(requisito(ok, 'edad').cumple).toBe(true);
    const mal = calc(
      [continua('1985-01', '2029-12', 2500)],
      '1969-02-01',
      '2030-01-01',
      'anticipada-involuntaria',
      BASE,
    );
    expect(requisito(mal, 'edad').cumple).toBe(false);
  });
  it('exige 33 años de cotización efectiva (396 meses)', () => {
    const r = calc(
      [continua('1997-02', '2029-12', 2500)],
      '1967-01-01',
      '2030-01-01',
      'anticipada-involuntaria',
      BASE,
    );
    expect(requisito(r, 'cotizacion-efectiva').valor).toBe(395);
    expect(r.cumpleRequisitos).toBe(false);
  });
  it('exige seis meses de demanda de empleo y causa tasada del cese', () => {
    const sin = calc(carrera, '1967-01-01', '2030-01-01', 'anticipada-involuntaria', {
      ...BASE,
      mesesDemandanteEmpleo: 5,
      ceseCausaTasada: true,
    });
    expect(requisito(sin, 'demandante-empleo').cumple).toBe(false);
    const causa = calc(carrera, '1967-01-01', '2030-01-01', 'anticipada-involuntaria', {
      ...BASE,
      mesesDemandanteEmpleo: 6,
      ceseCausaTasada: false,
    });
    expect(requisito(causa, 'causa-cese').cumple).toBe(false);
  });
  it('la pensión se limita a la máxima reducida un 0,50 % por trimestre de anticipación', () => {
    const alta = calc(
      [continua('1988-01', '2029-12', 20000)],
      '1967-01-01',
      '2030-01-01',
      'anticipada-involuntaria',
      { escenario: ESC, usarOpcion25Anos: false },
    );
    const maxima = contexto({ escenario: ESC }).pensionMaxima(2030).valor;
    expect(alta.estado).toBe('maxima');
    expect(alta.pensionMensual).toBeCloseTo(maxima * (1 - 0.005 * 8), 6);
  });
});

describe('jubilación demorada (art. 210.2)', () => {
  const carrera = [continua('1986-01', '2030-12', 2500)];
  it('exige al menos un año completo cotizado tras la edad ordinaria', () => {
    const r = calc(carrera, '1964-01-01', '2029-12-01', 'demorada', BASE);
    expect(requisito(r, 'demora').cumple).toBe(false);
    expect(r.cumpleRequisitos).toBe(false);
  });
  it('por encima del límite: la pensión es la máxima y el porcentaje no utilizado se paga como cantidad anual', () => {
    const alta = [continua('1986-01', '2030-12', 20000)];
    const r = calc(alta, '1964-01-01', '2031-01-01', 'demorada', {
      escenario: ESC,
      usarOpcion25Anos: false,
    });
    expect(r.estado).toBe('maxima');
    expect(r.cantidadAnualDemora).toBeGreaterThan(0);
    expect(Number.isInteger(r.cantidadAnualDemora)).toBe(true);
    expect(r.pensionAnual).toBeCloseTo(r.pensionMensual * 14 + r.cantidadAnualDemora, 6);
    // Tope: pensión anual más cantidad ≤ 12 × base máxima
    expect(r.pensionAnual).toBeLessThanOrEqual(
      12 * contexto({ escenario: ESC }).baseMaxima(2031).valor + 1e-6,
    );
  });
  it('tanto alzado con 44 años y 6 meses cotizados al cumplir la edad: se usa el 880 (un 10 % más)', () => {
    const larga = [continua('1980-01', '2030-12', 2500)]; // al 1-1-2029 (1964 + 65): 49 años
    const corta = [continua('1986-01', '2030-12', 2500)]; // 43 años
    const op = { ...BASE, demora: { opcion: 'tanto-alzado' as const } };
    const a = calc(larga, '1964-01-01', '2031-01-01', 'demorada', op);
    const b = calc(corta, '1964-01-01', '2031-01-01', 'demorada', op);
    // misma pensión anual (base reguladora igual, 100 %), distinto numerador
    expect(a.pensionMensual).toBeCloseTo(b.pensionMensual, 6);
    expect(a.pagoUnicoDemora / b.pagoUnicoDemora).toBeCloseTo(1.1, 10);
  });
  it('opción mixta (desde 28/08/2026): 4 años → 2 a porcentaje y 2 a tanto alzado', () => {
    const c = [continua('1984-01', '2032-12', 2500)];
    const r = calc(c, '1964-01-01', '2033-01-01', 'demorada', {
      ...BASE,
      demora: { opcion: 'mixta' },
    });
    expect(r.cumpleRequisitos).toBe(true);
    expect(paso(r, 'demora-mixta').valor).toBe(8);
    expect(r.pagoUnicoDemora).toBeGreaterThan(0);
    expect(r.porcentaje).toBe(108);
  });
  it('opción mixta con 9 años: 5 a tanto alzado y 4 años a porcentaje', () => {
    const c = [continua('1980-01', '2037-12', 2500)];
    const r = calc(c, '1964-01-01', '2038-01-01', 'demorada', {
      ...BASE,
      demora: { opcion: 'mixta' },
    });
    expect(paso(r, 'demora-mixta').valor).toBe(16);
  });
  it('opción mixta con menos de dos años: no procede', () => {
    expect(() =>
      calc(carrera, '1964-01-01', '2030-10-01', 'demorada', {
        ...BASE,
        demora: { opcion: 'mixta' },
      }),
    ).toThrow(RangeError);
  });
});

describe('jubilación parcial (art. 215)', () => {
  const carrera = [continua('1986-01', '2030-12', 2500)];
  it('sin relevo, a la edad ordinaria: pensión proporcional a la reducción de jornada', () => {
    const plena = calc(carrera, '1965-01-01', '2030-01-01', 'ordinaria', BASE);
    const parcial = calc(carrera, '1965-01-01', '2030-01-01', 'parcial', {
      ...BASE,
      parcial: { reduccionJornadaPct: 50, conRelevo: false },
    });
    expect(parcial.cumpleRequisitos).toBe(true);
    expect(parcial.pensionMensual).toBeCloseTo(plena.pensionMensual * 0.5, 6);
  });
  it('la reducción de jornada debe estar entre el 25 y el 75 %', () => {
    const bajo = calc(carrera, '1965-01-01', '2030-01-01', 'parcial', {
      ...BASE,
      parcial: { reduccionJornadaPct: 24, conRelevo: false },
    });
    const alto = calc(carrera, '1965-01-01', '2030-01-01', 'parcial', {
      ...BASE,
      parcial: { reduccionJornadaPct: 76, conRelevo: false },
    });
    expect(bajo.cumpleRequisitos).toBe(false);
    expect(alto.cumpleRequisitos).toBe(false);
  });
  it('con relevo: hasta 36 meses antes, 33 años cotizados y 6 de antigüedad; sin coeficientes reductores', () => {
    const op = {
      ...BASE,
      parcial: { reduccionJornadaPct: 50, conRelevo: true, antiguedadEmpresaMeses: 72 },
    };
    const r = calc(carrera, '1967-01-01', '2030-01-01', 'parcial', op);
    expect(r.cumpleRequisitos).toBe(true);
    const sinAntiguedad = calc(carrera, '1967-01-01', '2030-01-01', 'parcial', {
      ...BASE,
      parcial: { reduccionJornadaPct: 50, conRelevo: true, antiguedadEmpresaMeses: 71 },
    });
    expect(requisito(sinAntiguedad, 'antiguedad-empresa').cumple).toBe(false);
    const limite = calc(carrera, '1968-01-01', '2030-01-01', 'parcial', op); // 36 meses
    expect(requisito(limite, 'edad').cumple).toBe(true);
    const demasiado = calc(carrera, '1968-01-02', '2030-01-01', 'parcial', op); // 36 meses y un día
    expect(requisito(demasiado, 'edad').cumple).toBe(false);
    expect(r.pasos.some((p) => p.id === 'coeficiente-reductor')).toBe(false);
  });
  it('exige indicar los datos de la parcial', () => {
    expect(() => calc(carrera, '1965-01-01', '2030-01-01', 'parcial', BASE)).toThrow(RangeError);
  });
  it('no da complemento de brecha de género', () => {
    const r = calc(carrera, '1965-01-01', '2030-01-01', 'parcial', {
      ...BASE,
      sexo: 'mujer',
      hijos: 2,
      parcial: { reduccionJornadaPct: 50, conRelevo: false },
    });
    expect(r.pasos.some((p) => p.id === 'complemento-brecha')).toBe(false);
  });
});

describe('complemento de brecha de género (art. 60) y complemento a mínimos (art. 59)', () => {
  const carrera = [continua('1988-01', '2029-12', 2500)];
  const sin = calc(carrera, '1965-01-01', '2030-01-01', 'ordinaria', BASE);
  const importe = contexto({ escenario: ESC }).importeBrechaPorHijo(2030).valor;
  it('importe por hijo del año, revalorizado como las pensiones tras 2026', () => {
    expect(importe).toBeCloseTo(36.9 * Math.pow(1.02, 4), 6);
  });
  it('3 hijos: 3 veces el importe; con 5 hijos, el tope de 4 veces', () => {
    const tres = calc(carrera, '1965-01-01', '2030-01-01', 'ordinaria', {
      ...BASE,
      sexo: 'mujer',
      hijos: 3,
    });
    const cinco = calc(carrera, '1965-01-01', '2030-01-01', 'ordinaria', {
      ...BASE,
      sexo: 'mujer',
      hijos: 5,
    });
    expect(tres.pensionMensual).toBeCloseTo(sin.pensionMensual + 3 * importe, 6);
    expect(cinco.pensionMensual).toBeCloseTo(sin.pensionMensual + 4 * importe, 6);
  });
  it('un hombre solo lo recibe si acredita las condiciones del art. 60.1.b)', () => {
    const no = calc(carrera, '1965-01-01', '2030-01-01', 'ordinaria', {
      ...BASE,
      sexo: 'hombre',
      hijos: 2,
    });
    const si = calc(carrera, '1965-01-01', '2030-01-01', 'ordinaria', {
      ...BASE,
      sexo: 'hombre',
      hijos: 2,
      hombreCumpleArt60: true,
    });
    expect(no.pensionMensual).toBeCloseTo(sin.pensionMensual, 8);
    expect(si.pensionMensual).toBeCloseTo(sin.pensionMensual + 2 * importe, 6);
  });
  it('no cuenta para el límite de pensión máxima y se suma a la mínima', () => {
    const alta = calc(
      [continua('1988-01', '2029-12', 20000)],
      '1965-01-01',
      '2030-01-01',
      'ordinaria',
      { escenario: ESC, usarOpcion25Anos: false, sexo: 'mujer', hijos: 2 },
    );
    const maxima = contexto({ escenario: ESC }).pensionMaxima(2030).valor;
    expect(alta.pensionMensual).toBeCloseTo(maxima + 2 * importe, 6);
    const baja = calc(
      [continua('1988-01', '2029-12', 900)],
      '1965-01-01',
      '2030-01-01',
      'ordinaria',
      { ...BASE, sexo: 'mujer', hijos: 1 },
    );
    expect(baja.estado).toBe('minima');
    expect(baja.pensionMensual).toBeCloseTo((13106.8 * Math.pow(1.02, 4)) / 14 + importe, 6);
  });
  it('mínima con rentas por encima del límite de ingresos: no hay complemento', () => {
    const baja = [continua('1988-01', '2029-12', 900)];
    const con = calc(baja, '1965-01-01', '2030-01-01', 'ordinaria', BASE);
    const rico = calc(baja, '1965-01-01', '2030-01-01', 'ordinaria', {
      ...BASE,
      rentasAnuales: 100000,
    });
    expect(con.estado).toBe('minima');
    expect(rico.estado).toBe('contributiva');
    expect(rico.pensionMensual).toBeLessThan(con.pensionMensual);
  });
  it('mínima con cónyuge a cargo: la cuantía es mayor; con rentas se avisa de que no está implementada', () => {
    const baja = [continua('1988-01', '2029-12', 900)];
    const uni = calc(baja, '1965-01-01', '2030-01-01', 'ordinaria', BASE);
    const conyuge = calc(baja, '1965-01-01', '2030-01-01', 'ordinaria', {
      ...BASE,
      situacionFamiliar: 'conyuge-a-cargo',
    });
    expect(conyuge.pensionMensual).toBeGreaterThan(uni.pensionMensual);
    const rentas = calc(baja, '1965-01-01', '2030-01-01', 'ordinaria', {
      ...BASE,
      situacionFamiliar: 'conyuge-a-cargo',
      rentasAnuales: 1000,
    });
    expect(rentas.avisos.some((a) => a.includes('cónyuge a cargo'))).toBe(true);
    expect(rentas.estado).toBe('contributiva');
  });
  it('mínima de menores de 65 años en una jubilación anticipada', () => {
    const r = calc(
      [continua('1988-01', '2029-12', 900)],
      '1966-01-01',
      '2030-01-01',
      'anticipada-involuntaria',
      { ...BASE, mesesDemandanteEmpleo: 6, ceseCausaTasada: true },
    );
    expect(r.estado).toBe('minima');
    expect(r.pensionMensual).toBeCloseTo((12262.6 * Math.pow(1.02, 4)) / 14, 6);
  });
  it('se pueden apagar el límite máximo y los mínimos', () => {
    const alta = calc(
      [continua('1988-01', '2029-12', 20000)],
      '1965-01-01',
      '2030-01-01',
      'ordinaria',
      { escenario: ESC, aplicarPensionMaxima: false },
    );
    expect(alta.estado).toBe('contributiva');
    expect(alta.pensionMensual).toBeGreaterThan(
      contexto({ escenario: ESC }).pensionMaxima(2030).valor,
    );
    const baja = calc(
      [continua('1988-01', '2029-12', 900)],
      '1965-01-01',
      '2030-01-01',
      'ordinaria',
      { ...BASE, aplicarMinimos: false },
    );
    expect(baja.estado).toBe('contributiva');
  });
});

describe('revalorización y euros constantes', () => {
  it('cada 1 de enero se multiplica por 1 + revalorización; la pensión del año del hecho causante es la inicial', () => {
    const serie = revalorizarPension(PARAMS, 1000, 2030, 2033, { escenario: ESC });
    expect(serie.map((s) => s.anio)).toEqual([2030, 2031, 2032, 2033]);
    expect(serie[0]?.importe).toBe(1000);
    expect(serie[3]?.importe).toBeCloseTo(1000 * Math.pow(1.02, 3), 8);
  });
  it('con datos de /data: 2026 se revaloriza un 2,7 %', () => {
    const serie = revalorizarPension(PARAMS, 1000, 2025, 2026, {});
    expect(serie[1]?.importe).toBeCloseTo(1027, 8);
  });
  it('la revalorización no puede ser negativa (art. 58.3)', () => {
    const serie = revalorizarPension(PARAMS, 1000, 2030, 2031, { escenario: { ipc: -0.01 } });
    expect(serie[1]?.importe).toBe(1000);
  });
  it('sin escenario, un año sin dato es un error, no un valor inventado', () => {
    expect(() => revalorizarPension(PARAMS, 1000, 2030, 2031, {})).toThrow(DatoNoDisponible);
  });
  it('euros constantes con el índice medio anual de /data (2024 → 2025)', () => {
    const v = aEurosConstantesMotor(PARAMS, 1000, 2024, 2025);
    expect(v).toBeCloseTo((1000 * 100) / 97.396, 6);
  });
  it('euros constantes con IPC del escenario más allá de 2025', () => {
    const v = aEurosConstantesMotor(PARAMS, 1000, 2035, 2025, { escenario: ESC });
    expect(v).toBeCloseTo(1000 / Math.pow(1.02, 10), 6);
  });
});

describe('errores y límites del alcance', () => {
  const carrera = [continua('1980-01', '2011-12', 2000)];
  it('hechos causantes anteriores a 2013: escala no estructurada', () => {
    expect(() => calc(carrera, '1946-01-01', '2012-01-01', 'ordinaria', BASE)).toThrow();
  });
  it('sin escenario, una carrera con bases de años sin dato lo dice', () => {
    expect(() =>
      calc([continua('2000-01', '2039-12', 2000)], '1975-01-01', '2040-01-01', 'ordinaria', {}),
    ).toThrow(DatoNoDisponible);
  });
  it('periodos mal formados', () => {
    expect(() =>
      calc([continua('2000-05', '2000-01', 2000)], '1975-01-01', '2030-01-01', 'ordinaria', BASE),
    ).toThrow(RangeError);
    expect(() =>
      calc([continua('2000-01', '2000-05', -1)], '1975-01-01', '2030-01-01', 'ordinaria', BASE),
    ).toThrow(RangeError);
    expect(() =>
      calc([continua('2000-01', '2000-05', 2000)], '2030-01-01', '2030-01-01', 'ordinaria', BASE),
    ).toThrow(RangeError);
  });
  it('pluriempleo: las bases de periodos solapados se suman con el tope de la base máxima', () => {
    const solapado = calc(
      [continua('1988-01', '2029-12', 2000), continua('1988-01', '2029-12', 2000)],
      '1965-01-01',
      '2030-01-01',
      'ordinaria',
      BASE,
    );
    const unico = calc(
      [continua('1988-01', '2029-12', 4000)],
      '1965-01-01',
      '2030-01-01',
      'ordinaria',
      BASE,
    );
    expect(solapado.baseReguladora).toBeCloseTo(unico.baseReguladora, 8);
  });
  it('bases por año y por mes', () => {
    const porAnio = calc(
      [
        {
          desde: '1988-01',
          hasta: '2029-12',
          basesPorAnio: Object.fromEntries(
            Array.from({ length: 42 }, (_, i) => [String(1988 + i), 2500]),
          ),
        },
      ],
      '1965-01-01',
      '2030-01-01',
      'ordinaria',
      BASE,
    );
    const constante = calc(
      [continua('1988-01', '2029-12', 2500)],
      '1965-01-01',
      '2030-01-01',
      'ordinaria',
      BASE,
    );
    expect(porAnio.baseReguladora).toBeCloseTo(constante.baseReguladora, 10);
    expect(() =>
      calc(
        [{ desde: '1988-01', hasta: '1988-02', basesPorMes: { '1988-01': 2000 } }],
        '1965-01-01',
        '2030-01-01',
        'ordinaria',
        BASE,
      ),
    ).toThrow(RangeError);
  });
});
