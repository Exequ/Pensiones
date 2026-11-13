import { describe, expect, it } from 'vitest';
import { calcularJubilacionConParametros, fechaEdadOrdinaria } from './calculo.ts';
import type { OpcionesJubilacion } from './tipos.ts';
import { sumarMeses, formatearMes, parsearFecha, mesAbsDe } from './tiempo.ts';
import { PARAMS, calc, continua, paso, requisito, ESCENARIO_2PC } from './pruebas.ts';

/** Carrera continua de `meses` meses que acaba en diciembre del año anterior a `anioHC`. */
function terminaEn(anioHC: number, meses: number, base = 2000) {
  const fin = anioHC * 12 - 1;
  return continua(formatearMes(fin - meses + 1), formatearMes(fin), base);
}
const OPC = { escenario: ESCENARIO_2PC, huecoBaseMinima: 'anterior' } as const;

describe('carencia (art. 205.1.b)', () => {
  // Nacida el 1-1-1960: a 1-1-2027 tiene 67 años (804 meses), la edad con carrera corta.
  const nac = '1960-01-01';
  it('justo cumplida: 180 meses', () => {
    const r = calc([terminaEn(2027, 180)], nac, '2027-01-01', 'ordinaria', OPC);
    expect(requisito(r, 'carencia').cumple).toBe(true);
    expect(r.cumpleRequisitos).toBe(true);
    expect(r.pensionMensual).toBeGreaterThan(0);
  });

  it('justo incumplida: 179 meses', () => {
    const r = calc([terminaEn(2027, 179)], nac, '2027-01-01', 'ordinaria', OPC);
    expect(requisito(r, 'carencia').cumple).toBe(false);
    expect(r.cumpleRequisitos).toBe(false);
    expect(r.estado).toBe('no-causa-derecho');
    expect(r.pensionMensual).toBe(0);
    expect(r.pensionAnual).toBe(0);
  });

  it('con 180 meses el porcentaje es el mínimo del 50 %', () => {
    const r = calc([terminaEn(2027, 180)], nac, '2027-01-01', 'ordinaria', OPC);
    expect(r.porcentaje).toBe(50);
  });
});

describe('periodo previo: dos años dentro de los quince anteriores (art. 205.1.b)', () => {
  const nac = '1960-01-01';
  const carrera = (hasta: string) => [continua('1990-01', hasta, 2000)];
  it('24 meses dentro de los 180 anteriores: cumple', () => {
    // Ventana de 180 meses antes de 2027-01: de 2012-01 a 2026-12. Cotiza 2012-01..2013-12 = 24 meses.
    const r = calc(carrera('2013-12'), nac, '2027-01-01', 'ordinaria', OPC);
    expect(requisito(r, 'periodo-previo').valor).toBe(24);
    expect(requisito(r, 'periodo-previo').cumple).toBe(true);
  });
  it('23 meses: no cumple', () => {
    const r = calc(carrera('2013-11'), nac, '2027-01-01', 'ordinaria', OPC);
    expect(requisito(r, 'periodo-previo').valor).toBe(23);
    expect(requisito(r, 'periodo-previo').cumple).toBe(false);
    expect(r.cumpleRequisitos).toBe(false);
  });
});

describe('edad ordinaria según años cotizados (art. 205.1.a y DT 7.ª)', () => {
  it('2026: 65 años con 459 meses cotizados (38 años y 3 meses)', () => {
    // Nacida el 1-1-1961: 65 años a 1-1-2026.
    const r = calc([terminaEn(2026, 459)], '1961-01-01', '2026-01-01', 'ordinaria', OPC);
    expect(r.edadMeses).toBe(780);
    expect(requisito(r, 'edad').exigido).toBe(780);
    expect(requisito(r, 'edad').cumple).toBe(true);
  });

  it('2026: con 458 meses la edad exigida es 66 años y 10 meses y a los 65 no se causa pensión', () => {
    const r = calc([terminaEn(2026, 458)], '1961-01-01', '2026-01-01', 'ordinaria', OPC);
    expect(requisito(r, 'edad').exigido).toBe(802);
    expect(requisito(r, 'edad').cumple).toBe(false);
    expect(r.cumpleRequisitos).toBe(false);
  });

  it('a 66 años y 10 meses sí se causa con 458 meses (más la cotización de esos meses no cambia la carrera dada)', () => {
    const r = calc([terminaEn(2026, 458)], '1959-03-01', '2026-01-01', 'ordinaria', OPC);
    expect(r.edadMeses).toBe(802);
    expect(requisito(r, 'edad').cumple).toBe(true);
  });

  it('desde 2027 se exigen 38 años y 6 meses: 461 meses → 67 años; 462 → 65', () => {
    const corta = calc([terminaEn(2027, 461)], '1962-01-01', '2027-01-01', 'ordinaria', OPC);
    expect(requisito(corta, 'edad').exigido).toBe(804);
    const larga = calc([terminaEn(2027, 462)], '1962-01-01', '2027-01-01', 'ordinaria', OPC);
    expect(requisito(larga, 'edad').exigido).toBe(780);
    expect(requisito(larga, 'edad').cumple).toBe(true);
  });

  it('para años posteriores a 2027 se mantiene el último valor del calendario (a partir de 2027)', () => {
    const r = calc([terminaEn(2040, 400)], '1973-01-01', '2040-01-01', 'ordinaria', OPC);
    expect(requisito(r, 'edad').exigido).toBe(804);
  });

  it('fechaEdadOrdinaria: primera fecha en que se cumple la edad', () => {
    const f = fechaEdadOrdinaria(PARAMS, [terminaEn(2030, 516)], '1965-06-15', OPC);
    expect(f).toBe('2030-06-15');
    const g = fechaEdadOrdinaria(PARAMS, [continua('2002-01', '2040-12', 2000)], '1970-02-10', OPC);
    expect(g).toBe(formatear(sumarMeses(parsearFecha('1970-02-10'), 804)));
  });
});

function formatear(f: { anio: number; mes: number; dia: number }) {
  return `${f.anio}-${String(f.mes).padStart(2, '0')}-${String(f.dia).padStart(2, '0')}`;
}

describe('jubilación el mismo día del cambio de normativa', () => {
  // Misma carrera: se jubila el 31-12-2025 (normativa de 2025) y el 1-1-2026 (normativa de 2026).
  const carrera = [continua('1983-01', '2025-11', 2200)];
  it('el 31-12-2025 rige la ventana de 300 meses (divisor 350) y el 1-1-2026 la de 304 (divisor 352,33)', () => {
    const a = calc(carrera, '1960-12-31', '2025-12-31', 'ordinaria', {
      escenario: ESCENARIO_2PC,
      usarOpcion25Anos: false,
    });
    const b = calc(carrera, '1960-12-31', '2026-01-01', 'ordinaria', {
      escenario: ESCENARIO_2PC,
      usarOpcion25Anos: false,
    });
    expect(a.anioNormativa).toBe(2025);
    expect(b.anioNormativa).toBe(2026);
    expect(paso(a, 'periodo-calculo').valor).toBe('300 bases de 300 meses ÷ 350');
    expect(paso(b, 'periodo-calculo').valor).toBe('302 bases de 304 meses ÷ 352.33');
  });

  it('cada fecha usa la pensión máxima de su año', () => {
    const alta = [continua('1983-01', '2025-11', 9000)];
    const a = calc(alta, '1960-12-31', '2025-12-31', 'ordinaria', { escenario: ESCENARIO_2PC });
    const b = calc(alta, '1960-12-31', '2026-01-01', 'ordinaria', { escenario: ESCENARIO_2PC });
    expect(a.estado).toBe('maxima');
    expect(a.pensionMensual).toBe(3267.6);
    expect(b.pensionMensual).toBe(3359.6);
  });
});

describe('datos que faltan: un año sin base mínima en la serie', () => {
  // /data ya tiene la base mínima de 2020 y 2021; el mecanismo se prueba con una copia de los
  // parámetros a la que se quita 2020-2021 (sin tocar /data).
  const valores = new Map(PARAMS.baseMinima.valores);
  valores.delete(2020);
  valores.delete(2021);
  const sinDato = { ...PARAMS, baseMinima: { ...PARAMS.baseMinima, valores } };
  const carrera = [continua('1990-01', '2013-12', 2000)];
  const calcSinDato = (opciones: OpcionesJubilacion) =>
    calcularJubilacionConParametros(
      sinDato,
      carrera,
      '1960-01-01',
      '2027-01-01',
      'ordinaria',
      opciones,
    );

  it('una laguna en un año sin dato no se rellena en silencio: error salvo que se pida el último valor conocido', () => {
    expect(() => calcSinDato({ escenario: ESCENARIO_2PC })).toThrow(/base mínima de 20(20|21)/);
    const r = calcSinDato(OPC);
    expect(r.avisos.some((a) => a.includes('Base mínima de 2021 sin dato'))).toBe(true);
  });

  it('con los datos de /data, 2020 y 2021 tienen base mínima y no hay error ni aviso', () => {
    const r = calc(carrera, '1960-01-01', '2027-01-01', 'ordinaria', { escenario: ESCENARIO_2PC });
    expect(r.avisos.some((a) => a.includes('sin dato'))).toBe(false);
  });
});

describe('mes previo y años posteriores al hecho causante', () => {
  it('el mes previo no se computa en la base reguladora pero sí en los meses cotizados', () => {
    const r = calc(
      [continua('2000-01', '2025-12', 2000)],
      '1961-01-01',
      '2026-01-01',
      'ordinaria',
      { escenario: ESCENARIO_2PC },
    );
    expect(r.mesesCotizados).toBe(
      mesAbsDe(parsearFecha('2026-01-01')) - mesAbsDe(parsearFecha('2000-01-01')),
    );
  });
});
