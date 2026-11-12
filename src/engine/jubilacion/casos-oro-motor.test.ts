/**
 * Casos de oro construidos a mano. Cada cuenta se puede repetir con una calculadora a partir del
 * texto de la ley y de los datos citados; el desglose paso a paso está en docs/CASOS_ORO_MOTOR.md.
 *
 * Todos usan bases constantes y sin actualizar (para que la cuenta sea de cabeza), el escenario
 * de IPC del 2 % solo para los años sin dato (2027 en adelante) y la opción de 25 años apagada
 * salvo que se diga lo contrario.
 */
import { describe, expect, it } from 'vitest';
import { PARAMS, calc, contexto, continua, paso, requisito } from './pruebas.ts';

const BASE = { escenario: { ipc: 0.02 }, actualizarBases: false, usarOpcion25Anos: false } as const;
const BR_2030 = (310 * 2500) / 361.67; // 310 mejores bases de 320 meses entre 361,67 (DT 40.ª, 2030)

describe('caso de oro 1 · jubilación ordinaria con carrera completa', () => {
  // Nacida el 1-1-1965, se jubila el 1-1-2030 a los 65 años con 43 años cotizados (516 meses) a 2.500 €/mes.
  const r = calc(
    [continua('1987-01', '2029-12', 2500)],
    '1965-01-01',
    '2030-01-01',
    'ordinaria',
    BASE,
  );
  it('cumple los requisitos y la edad exigida es de 65 años', () => {
    expect(r.cumpleRequisitos).toBe(true);
    expect(requisito(r, 'edad').exigido).toBe(780);
    expect(r.mesesCotizados).toBe(516);
  });
  it('base reguladora: 310 × 2.500 ÷ 361,67; porcentaje 100 %', () => {
    expect(r.baseReguladora).toBeCloseTo(2142.8374, 3);
    expect(r.porcentaje).toBe(100);
  });
  it('pensión: 2.142,84 € por paga y 29.999,72 € al año (14 pagas)', () => {
    expect(r.pensionMensual).toBeCloseTo(BR_2030, 6);
    expect(r.pensionMensual).toBeCloseTo(2142.84, 2);
    expect(r.pensionAnual).toBeCloseTo(29999.72, 2);
    expect(r.estado).toBe('contributiva');
    expect(r.pagas).toBe(14);
  });
});

describe('caso de oro 2 · jubilación anticipada voluntaria (12 meses)', () => {
  // Nacida el 1-1-1966: a 1-1-2030 tiene 64 años; la edad ordinaria (65, con 516 meses proyectados) llega el 1-1-2031.
  const r = calc(
    [continua('1988-01', '2029-12', 2500)],
    '1966-01-01',
    '2030-01-01',
    'anticipada-voluntaria',
    BASE,
  );
  it('cumple: 12 meses de anticipación, 504 meses cotizados (más de 35 años)', () => {
    expect(r.cumpleRequisitos).toBe(true);
    expect(r.mesesCotizados).toBe(504);
  });
  it('coeficiente del cuadro del art. 208.2: tramo de 41 años y 6 meses a menos de 44 y 6, 12 meses → 5,00 %', () => {
    expect(paso(r, 'coeficiente-reductor').valor).toBe(5);
  });
  it('pensión: 2.142,84 × (1 − 0,05) = 2.035,70 € por paga', () => {
    expect(r.pensionMensual).toBeCloseTo(BR_2030 * 0.95, 6);
    expect(r.pensionMensual).toBeCloseTo(2035.7, 1);
    expect(r.pensionAnual).toBeCloseTo(28499.74, 2);
  });
});

describe('caso de oro 3 · jubilación anticipada involuntaria (24 meses)', () => {
  // Nacida el 1-1-1967: 63 años a 1-1-2030. 492 meses cotizados (41 años): tramo de 38 años y 6 meses a menos de 41 y 6.
  const r = calc(
    [continua('1989-01', '2029-12', 2500)],
    '1967-01-01',
    '2030-01-01',
    'anticipada-involuntaria',
    BASE,
  );
  it('cumple con demanda de empleo y causa de cese indicadas', () => {
    const r2 = calc(
      [continua('1989-01', '2029-12', 2500)],
      '1967-01-01',
      '2030-01-01',
      'anticipada-involuntaria',
      { ...BASE, mesesDemandanteEmpleo: 6, ceseCausaTasada: true },
    );
    expect(r2.cumpleRequisitos).toBe(true);
    expect(r2.avisos.some((a) => a.includes('demanda de empleo'))).toBe(false);
    expect(r.cumpleRequisitos).toBe(true);
    expect(r.avisos.some((a) => a.includes('demanda de empleo'))).toBe(true);
  });
  it('coeficiente del art. 207.2: 24 meses, 492 meses cotizados → 14,00 %', () => {
    expect(paso(r, 'coeficiente-reductor').valor).toBe(14);
  });
  it('pensión: 2.142,84 × (1 − 0,14) = 1.842,84 € por paga', () => {
    expect(r.pensionMensual).toBeCloseTo(BR_2030 * 0.86, 6);
    expect(r.pensionMensual).toBeCloseTo(1842.84, 2);
  });
  it('tope por trimestres: 8 trimestres de anticipación reducen el tope un 4 %', () => {
    const tope = paso(r, 'tope-trimestres').valor;
    const maxima2030 = contexto({ escenario: { ipc: 0.02 } }).pensionMaxima(2030).valor;
    expect(Number(tope)).toBeCloseTo(maxima2030 * 0.96, 6);
  });
});

describe('caso de oro 4 · jubilación demorada (dos años)', () => {
  // Nacida el 1-1-1964: 65 años el 1-1-2029 (516 meses cotizados: carrera suficiente). Se jubila el 1-1-2031 con 2 años más cotizados (540 meses).
  const carrera = [continua('1986-01', '2030-12', 2500)];
  const BR_2031 = (312 * 2500) / 364; // 2031: 312 mejores bases de 324 meses entre 364
  it('porcentaje adicional: 4 % × 2 años → 108 %', () => {
    const r = calc(carrera, '1964-01-01', '2031-01-01', 'demorada', BASE);
    expect(r.cumpleRequisitos).toBe(true);
    expect(paso(r, 'demora-porcentaje-adicional').valor).toBe(8);
    expect(r.porcentaje).toBe(108);
    expect(r.baseReguladora).toBeCloseTo(BR_2031, 6);
    expect(r.pensionMensual).toBeCloseTo(BR_2031 * 1.08, 6);
    expect(r.pensionMensual).toBeCloseTo(2314.29, 2);
    expect(r.pensionAnual).toBeCloseTo(32400, 2);
  });
  it('tanto alzado: 800 × (pensión anual / 500)^(1/1,65) por año completo (menos de 44 años y 6 meses al cumplir la edad)', () => {
    const r = calc(carrera, '1964-01-01', '2031-01-01', 'demorada', {
      ...BASE,
      demora: { opcion: 'tanto-alzado' },
    });
    const porAnio = 800 * Math.pow((BR_2031 * 14) / 500, 1 / 1.65);
    expect(porAnio).toBeCloseTo(9566.6, 1);
    expect(r.pagoUnicoDemora).toBeCloseTo(2 * porAnio, 6);
    expect(r.pagoUnicoDemora).toBeCloseTo(19133.19, 2);
    expect(r.pensionMensual).toBeCloseTo(BR_2031, 6);
  });
});

describe('caso de oro 5 · pensión topada', () => {
  // Bases altas (se reducen a la base máxima de cada mes y se actualizan con el IPC): la pensión se limita a la máxima de 2030.
  const r = calc([continua('1988-01', '2029-12', 9000)], '1965-01-01', '2030-01-01', 'ordinaria', {
    escenario: { ipc: 0.02 },
    usarOpcion25Anos: false,
  });
  it('base máxima de 2030: 5.101,20 de 2026 × 1,032 cada año (revalorización 2 % + 1,2 puntos)', () => {
    expect(r.avisos.some((a) => a.includes('base máxima'))).toBe(true);
  });
  it('pensión máxima de 2030: 3.359,60 de 2026 × 1,02115 cada año (2 % + 0,115 puntos) = 3.652,97 €', () => {
    expect(r.estado).toBe('maxima');
    expect(r.baseReguladora).toBeGreaterThan(r.pensionMensual);
    expect(r.pensionMensual).toBeCloseTo(3359.6 * Math.pow(1.02115, 4), 6);
    expect(r.pensionMensual).toBeCloseTo(3652.97, 2);
  });
});

describe('caso de oro 6 · pensión mínima', () => {
  // Bases bajas: la pensión contributiva queda por debajo de la mínima de 2030 y se complementa.
  const r = calc(
    [continua('1988-01', '2029-12', 900)],
    '1965-01-01',
    '2030-01-01',
    'ordinaria',
    BASE,
  );
  it('mínima de 2030 (jubilación a los 65 años, sin cónyuge a cargo): 13.106,80 € de 2026 × 1,02 cada año', () => {
    const minimaAnual = 13106.8 * Math.pow(1.02, 4);
    expect(minimaAnual).toBeCloseTo(14187.22, 2);
    expect(r.estado).toBe('minima');
    expect(r.pensionMensual).toBeCloseTo(minimaAnual / 14, 6);
    expect(r.pensionMensual).toBeCloseTo(1013.37, 2);
  });
  it('la pensión contributiva sin complemento era inferior', () => {
    expect(paso(r, 'pension-contributiva').valor as number).toBeLessThan(r.pensionMensual);
    expect(Number(paso(r, 'complemento-minimos').valor)).toBeGreaterThan(0);
  });
  it('los parámetros usados son los de /data', () => {
    expect(PARAMS.pensionMinima.get('2026-jub65-unipersonal')).toBe(13106.8);
    expect(PARAMS.pensionMaxima.valores.get(2026)).toBe(3359.6);
  });
});
