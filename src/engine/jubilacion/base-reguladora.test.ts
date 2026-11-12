import { describe, expect, it } from 'vitest';
import { reglaGeneral } from './base-reguladora.ts';
import { PARAMS, calc, contexto, continua, paso } from './pruebas.ts';

const ESC = { ipc: 0.02, sustituirHistoricoIPC: true } as const;
const SIN_ACT = {
  escenario: ESC,
  usarOpcion25Anos: false,
  actualizarBases: false,
  calcularAunqueNoCumpla: true,
} as const;
const NAC = '1965-01-01';

describe('periodo de cómputo, divisor y bases de mayor importe (art. 209.1, DT 8.ª y 40.ª)', () => {
  it('cada divisor sale de «bases computadas × 14 / 12» y los descartados siguen el calendario de la DT 40.ª', () => {
    const ctx = contexto();
    for (let a = 2013; a <= 2045; a++) {
      const r = reglaGeneral(ctx, a, false);
      const descartadas = r.ventana - r.nBases;
      const esperado = a <= 2025 ? 0 : Math.min(2 * (a - 2025), 24);
      expect(descartadas, String(a)).toBe(esperado);
      expect(r.divisor, String(a)).toBeCloseTo((r.nBases * 14) / 12, 1);
    }
  });

  it('2030: 310 mejores bases de 320 meses entre 361,67 (base constante, sin actualizar)', () => {
    const r = calc([continua('1987-01', '2029-12', 2500)], NAC, '2030-01-01', 'ordinaria', SIN_ACT);
    expect(r.baseReguladora).toBeCloseTo((310 * 2500) / 361.67, 8);
    expect(paso(r, 'periodo-calculo').valor).toBe('310 bases de 320 meses ÷ 361.67');
  });

  it('se descartan las bases más bajas, no las más antiguas', () => {
    // 9 meses de 500 al final: están entre las 10 bases que se descartan de la ventana de 320
    const carrera = [continua('1987-01', '2029-02', 2500), continua('2029-03', '2029-11', 500)];
    const r = calc(carrera, NAC, '2030-01-01', 'ordinaria', SIN_ACT);
    expect(r.baseReguladora).toBeCloseTo((310 * 2500) / 361.67, 8);
  });

  it('el mes previo al hecho causante no entra en la ventana', () => {
    // Diciembre de 2029 (mes previo) con base enorme: no cambia nada
    const sin = calc(
      [continua('1987-01', '2029-11', 2500)],
      NAC,
      '2030-01-01',
      'ordinaria',
      SIN_ACT,
    );
    const con = calc(
      [continua('1987-01', '2029-11', 2500), continua('2029-12', '2029-12', 4000)],
      NAC,
      '2030-01-01',
      'ordinaria',
      SIN_ACT,
    );
    expect(con.baseReguladora).toBeCloseTo(sin.baseReguladora, 10);
  });

  it('en 2030 la opción de 25 años (300 meses entre 350) y la regla general dan casi lo mismo con base constante: se aplica la mayor', () => {
    const r = calc([continua('1987-01', '2029-12', 2500)], NAC, '2030-01-01', 'ordinaria', {
      escenario: ESC,
      actualizarBases: false,
    });
    expect(r.baseReguladora).toBeCloseTo(Math.max((310 * 2500) / 361.67, (300 * 2500) / 350), 8);
    const opcion = paso(r, 'base-reguladora-opcion-25').valor;
    expect(opcion).toBeCloseTo((300 * 2500) / 350, 8);
  });
});

describe('actualización de bases con el IPC (art. 209.1.c-d)', () => {
  it('las 24 bases más recientes van en valor nominal; las demás se multiplican por I25/Ii', () => {
    // Con un IPC constante del 2 % anual, I25/Ii = 1,02^((i − 25)/12) para i > 24.
    const r = calc([continua('1987-01', '2029-12', 2000)], NAC, '2030-01-01', 'ordinaria', {
      escenario: ESC,
      usarOpcion25Anos: false,
      calcularAunqueNoCumpla: true,
    });
    let suma = 0;
    for (let i = 1; i <= 320; i++) suma += 2000 * (i > 24 ? Math.pow(1.02, (i - 25) / 12) : 1);
    suma -= 10 * 2000; // se descartan las 10 más bajas: las nominales
    expect(r.baseReguladora).toBeCloseTo(suma / 361.67, 6);
  });

  it('sin actualizar, la base reguladora es menor', () => {
    const base = { escenario: ESC, usarOpcion25Anos: false, calcularAunqueNoCumpla: true } as const;
    const carrera = [continua('1987-01', '2029-12', 2000)];
    const con = calc(carrera, NAC, '2030-01-01', 'ordinaria', base);
    const sin = calc(carrera, NAC, '2030-01-01', 'ordinaria', { ...base, actualizarBases: false });
    expect(sin.baseReguladora).toBeCloseTo((310 * 2000) / 361.67, 8);
    expect(con.baseReguladora).toBeGreaterThan(sin.baseReguladora);
  });
});

describe('integración de lagunas (art. 209.1.b)', () => {
  it('lagunas al final: las primeras 48 al 100 % de la base mínima del mes', () => {
    // La carrera acaba en 2028-12: hay 11 lagunas (enero a noviembre de 2029) en la ventana de 2030.
    const r = calc([continua('1987-01', '2028-12', 2500)], NAC, '2030-01-01', 'ordinaria', SIN_ACT);
    const baseMinima2029 = 1424.4 * Math.pow(1.02, 3); // 2026 de /data, con el IPC del escenario
    // 309 bases de 2500 y 11 lagunas: de las 320 se descartan las 10 más bajas (lagunas)
    expect(r.baseReguladora).toBeCloseTo((309 * 2500 + baseMinima2029) / 361.67, 6);
    expect(paso(r, 'periodo-calculo').detalle).toBe(
      '309 meses con base y 11 lagunas en la ventana.',
    );
  });

  it('laguna en medio: dos años sin cotizar en 2011-2012 se integran con la base mínima de cada año', () => {
    const carrera = [continua('1987-01', '2010-12', 2500), continua('2013-01', '2029-12', 2500)];
    const r = calc(carrera, NAC, '2030-01-01', 'ordinaria', SIN_ACT);
    // 296 bases de 2500 y 24 lagunas de 748,20 (base mínima de 2011 y 2012): se descartan 10 lagunas
    expect(r.baseReguladora).toBeCloseTo((296 * 2500 + 14 * 748.2) / 361.67, 6);
  });

  it('laguna al inicio: los meses de la ventana anteriores a la primera alta se integran (lectura literal)', () => {
    const carrera = [continua('2015-01', '2029-12', 2500)];
    const integrar = calc(carrera, NAC, '2030-01-01', 'ordinaria', SIN_ACT);
    const ignorar = calc(carrera, NAC, '2030-01-01', 'ordinaria', {
      ...SIN_ACT,
      lecturas: { lagunasAnterioresAlPrimerAlta: 'ignorar' },
    });
    // 2015-01..2029-11 son 179 bases en la ventana de 320: 141 meses anteriores a la primera alta
    expect(ignorar.baseReguladora).toBeCloseTo((179 * 2500) / 361.67, 8);
    expect(paso(integrar, 'periodo-calculo').detalle).toBe(
      '179 meses con base y 141 lagunas en la ventana.',
    );
    expect(integrar.baseReguladora).toBeGreaterThan(ignorar.baseReguladora);
  });

  it('DT 41.ª: con la integración reforzada, las mensualidades 49.ª a 84.ª valen más (mujeres)', () => {
    // 90 lagunas finales en 2045; IPC 0 %: la base mínima de 2027 en adelante es constante (1.424,40).
    const cero = { ipc: 0, sustituirHistoricoIPC: true } as const;
    const carrera = [continua('2000-01', '2037-05', 2000)];
    const base = {
      escenario: cero,
      usarOpcion25Anos: false,
      actualizarBases: false,
      calcularAunqueNoCumpla: true,
    } as const;
    const hombre = calc(carrera, '1980-01-01', '2045-01-01', 'ordinaria', {
      ...base,
      sexo: 'hombre',
    });
    const mujer = calc(carrera, '1980-01-01', '2045-01-01', 'ordinaria', {
      ...base,
      sexo: 'mujer',
    });
    // Ventana de 348 meses, 324 bases, divisor 378; 258 bases de 2000 y 90 lagunas
    expect(hombre.baseReguladora).toBeCloseTo((258 * 2000 + 48 * 1424.4 + 18 * 712.2) / 378, 6);
    expect(mujer.baseReguladora).toBeCloseTo((258 * 2000 + 60 * 1424.4 + 6 * 1139.52) / 378, 6);
    expect(mujer.baseReguladora).toBeGreaterThan(hombre.baseReguladora);
  });

  it('DT 41.ª: no se aplica antes de 2026 ni si se desactiva', () => {
    const cero = { ipc: 0, sustituirHistoricoIPC: true } as const;
    const carrera = [continua('2000-01', '2037-05', 2000)];
    const base = {
      escenario: cero,
      usarOpcion25Anos: false,
      actualizarBases: false,
      calcularAunqueNoCumpla: true,
      sexo: 'mujer',
    } as const;
    const apagada = calc(carrera, '1980-01-01', '2045-01-01', 'ordinaria', {
      ...base,
      integracionReforzadaLagunas: false,
    });
    expect(apagada.baseReguladora).toBeCloseTo((258 * 2000 + 48 * 1424.4 + 18 * 712.2) / 378, 6);
  });

  it('un hombre solo tiene la integración reforzada si acredita las condiciones del art. 60.1.b)', () => {
    const cero = { ipc: 0, sustituirHistoricoIPC: true } as const;
    const carrera = [continua('2000-01', '2037-05', 2000)];
    const base = {
      escenario: cero,
      usarOpcion25Anos: false,
      actualizarBases: false,
      calcularAunqueNoCumpla: true,
      sexo: 'hombre',
    } as const;
    const con = calc(carrera, '1980-01-01', '2045-01-01', 'ordinaria', {
      ...base,
      hombreCumpleArt60: true,
    });
    expect(con.baseReguladora).toBeCloseTo((258 * 2000 + 60 * 1424.4 + 6 * 1139.52) / 378, 6);
  });
});

describe('topes de las bases', () => {
  it('cada base se reduce a la base máxima de su mes y se avisa', () => {
    const carrera = [continua('2000-01', '2029-12', 20000)];
    const con = calc(carrera, NAC, '2030-01-01', 'ordinaria', {
      escenario: ESC,
      calcularAunqueNoCumpla: true,
    });
    const sin = calc(carrera, NAC, '2030-01-01', 'ordinaria', {
      escenario: ESC,
      calcularAunqueNoCumpla: true,
      topeBases: false,
    });
    expect(con.avisos.some((a) => a.includes('base máxima'))).toBe(true);
    expect(con.baseReguladora).toBeLessThan(sin.baseReguladora / 3);
    expect(sin.baseReguladora).toBeGreaterThan(15000);
  });

  it('los parámetros de la regla de 2030 salen de /data', () => {
    expect(PARAMS.periodoCalculo.valores.get(2030)).toBe(320);
    expect(PARAMS.divisor.valores.get(2030)).toBe(361.67);
  });
});
