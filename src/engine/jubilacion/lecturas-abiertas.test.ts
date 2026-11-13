/**
 * Lecturas abiertas de la revisión actuarial (docs/REVISION_ACTUARIAL.md). Cada una es una opción
 * explícita del motor, con por defecto la lectura que ya reflejan los ficheros de /data. Para cada
 * una: (1) la opción por defecto coincide con /data y (2) cambiarla cambia el resultado en el
 * sentido esperado.
 */
import { describe, expect, it } from 'vitest';
import { LECTURAS_POR_DEFECTO } from './tipos.ts';
import { PARAMS, calc, contexto, continua, paso } from './pruebas.ts';
import type { PeriodoCarrera } from './tipos.ts';

const ESC = { ipc: 0.02 } as const;

describe('valores por defecto = lecturas ya reflejadas en /data', () => {
  it('lecturas por defecto', () => {
    expect(LECTURAS_POR_DEFECTO).toEqual({
      baseMaxima: 'compuesto',
      pensionMaxima: 'compuesto',
      referenciaBaseMinimaLagunas: 'mes-de-la-laguna',
      opcion25EnUltimoDia2040: 'incluida',
      lagunasAnterioresAlPrimerAlta: 'integrar',
      interpolacionIPC: 'mensual-ine',
      actualizacionFactorMinimo: 'suelo-1',
      fraccionDemora: 'desde-segundo-anio',
      maximaDesde2051: 'incremento-acumulado',
    });
  });

  it('la lectura compuesta reproduce los datos de 2025 y 2026 (base máxima y pensión máxima)', () => {
    const rev = (a: number) => PARAMS.revalorizacion.valores.get(a) ?? NaN;
    for (const a of [2025, 2026]) {
      const bm = (PARAMS.baseMaxima.valores.get(a - 1) ?? 0) * (1 + (rev(a) + 1.2) / 100);
      expect(bm).toBeCloseTo(PARAMS.baseMaxima.valores.get(a) ?? NaN, 0);
      const pm = (PARAMS.pensionMaxima.valores.get(a - 1) ?? 0) * (1 + (rev(a) + 0.115) / 100);
      expect(pm).toBeCloseTo(PARAMS.pensionMaxima.valores.get(a) ?? NaN, 1);
    }
  });
});

describe('(a) «acumulativos» de las DT 38.ª y 39.ª', () => {
  const compuesto = contexto({ escenario: ESC });
  it('base máxima: sumar los 1,2 puntos sobre la cifra inicial da una base menor que componerlos', () => {
    const simple = contexto({ escenario: ESC, lecturas: { baseMaxima: 'sobre-cifra-inicial' } });
    expect(simple.baseMaxima(2026).valor).toBe(compuesto.baseMaxima(2026).valor);
    expect(simple.baseMaxima(2027).valor).toBeCloseTo(compuesto.baseMaxima(2027).valor, 6); // el primer año coincide
    expect(simple.baseMaxima(2040).valor).toBeLessThan(compuesto.baseMaxima(2040).valor);
  });

  it('pensión máxima: un incremento que crece 0,115 puntos cada año da una máxima mayor que 0,115 constante', () => {
    const creciente = contexto({
      escenario: ESC,
      lecturas: { pensionMaxima: 'incremento-creciente' },
    });
    expect(creciente.pensionMaxima(2026).valor).toBe(compuesto.pensionMaxima(2026).valor);
    expect(creciente.pensionMaxima(2040).valor).toBeGreaterThan(
      compuesto.pensionMaxima(2040).valor,
    );
  });

  it('cambia la pensión final de quien está topado por la base y por la pensión máxima', () => {
    const carrera = [continua('2000-01', '2039-12', 20000)];
    const por = (l: object) =>
      calc(carrera, '1975-01-01', '2040-01-01', 'ordinaria', {
        escenario: ESC,
        lecturas: l,
        usarOpcion25Anos: false,
      });
    const base = por({});
    expect(por({ pensionMaxima: 'incremento-creciente' }).pensionMensual).toBeGreaterThan(
      base.pensionMensual,
    );
    expect(por({ baseMaxima: 'sobre-cifra-inicial' }).baseReguladora).toBeLessThan(
      base.baseReguladora,
    );
  });
});

describe('(b) referencia de la base mínima en la integración de lagunas (art. 209.1.b, desde 2026)', () => {
  it('con la base mínima del hecho causante (en euros actuales) la base reguladora es mayor que con la del mes de la laguna', () => {
    // 40 lagunas finales en 2040: quedan 16 tras descartar las 24 bases más bajas
    const carrera = [continua('2000-01', '2036-07', 2000)];
    const por = (ref: 'mes-de-la-laguna' | 'hecho-causante') =>
      calc(carrera, '1975-01-01', '2040-01-01', 'ordinaria', {
        escenario: ESC,
        usarOpcion25Anos: false,
        calcularAunqueNoCumpla: true,
        lecturas: { referenciaBaseMinimaLagunas: ref },
      });
    const mes = por('mes-de-la-laguna');
    const hecho = por('hecho-causante');
    expect(paso(mes, 'periodo-calculo').detalle).toContain('40 lagunas');
    expect(hecho.baseReguladora).toBeGreaterThan(mes.baseReguladora);
  });

  it('sin lagunas la lectura es indiferente', () => {
    const carrera = [continua('2000-01', '2039-11', 2000)];
    const por = (ref: 'mes-de-la-laguna' | 'hecho-causante') =>
      calc(carrera, '1975-01-01', '2040-01-01', 'ordinaria', {
        escenario: ESC,
        calcularAunqueNoCumpla: true,
        lecturas: { referenciaBaseMinimaLagunas: ref },
      });
    expect(por('hecho-causante').baseReguladora).toBe(por('mes-de-la-laguna').baseReguladora);
  });
});

describe('(c) el 31/12/2040 y la opción de 25 años (DT 4.ª.7)', () => {
  // Salarios que crecen un 4 % nominal al año (2 % real): la opción de 25 años da una base reguladora mayor.
  const creciente: PeriodoCarrera = {
    desde: '2005-01',
    hasta: '2040-12',
    basesPorAnio: Object.fromEntries(
      Array.from({ length: 36 }, (_, i) => [
        String(2005 + i),
        Math.round(1500 * Math.pow(1.04, i)),
      ]),
    ),
  };
  const por = (fecha: string, lectura: 'incluida' | 'excluida') =>
    calc([creciente], '1975-12-31', fecha, 'ordinaria', {
      escenario: ESC,
      calcularAunqueNoCumpla: true,
      lecturas: { opcion25EnUltimoDia2040: lectura },
    });

  it('la víspera (30/12/2040) la opción de 25 años se aplica con cualquiera de las dos lecturas', () => {
    const a = por('2040-12-30', 'incluida');
    const b = por('2040-12-30', 'excluida');
    expect(paso(a, 'base-reguladora').detalle).toContain('25 años');
    expect(b.baseReguladora).toBe(a.baseReguladora);
  });

  it('el 31/12/2040, «incluida» da una base reguladora mayor que «excluida» (que aplica solo la regla general)', () => {
    const incluida = por('2040-12-31', 'incluida');
    const excluida = por('2040-12-31', 'excluida');
    expect(paso(incluida, 'base-reguladora').detalle).toContain('25 años');
    expect(paso(excluida, 'base-reguladora').detalle).toBe('Regla general.');
    expect(incluida.baseReguladora).toBeGreaterThan(excluida.baseReguladora);
    expect(incluida.pensionMensual).toBeGreaterThan(excluida.pensionMensual);
  });

  it('el 1/1/2041 rige la ventana de 306 meses (357) con cualquiera de las dos lecturas', () => {
    const a = por('2041-01-01', 'incluida');
    const b = por('2041-01-01', 'excluida');
    expect(b.baseReguladora).toBe(a.baseReguladora);
    expect(paso(a, 'base-reguladora-opcion-25').detalle).toBe('306 meses ÷ 357');
  });
});

describe('(d) otras lecturas del informe que afectan a la jubilación', () => {
  it('lagunas anteriores a la primera alta: integrarlas da una base reguladora mayor', () => {
    const carrera = [continua('2015-01', '2029-12', 2500)];
    const por = (l: 'integrar' | 'ignorar') =>
      calc(carrera, '1965-01-01', '2030-01-01', 'ordinaria', {
        escenario: ESC,
        calcularAunqueNoCumpla: true,
        lecturas: { lagunasAnterioresAlPrimerAlta: l },
      });
    expect(por('integrar').baseReguladora).toBeGreaterThan(por('ignorar').baseReguladora);
  });

  it('IPC mensual: interpolar la media anual o usar el escalón anual cambia la actualización de bases', () => {
    const carrera = [continua('1995-01', '2025-12', 2000)];
    const por = (i: 'mensual-ine' | 'interpolada' | 'escalon-anual') =>
      calc(carrera, '1961-01-01', '2026-01-01', 'ordinaria', {
        escenario: ESC,
        usarOpcion25Anos: false,
        lecturas: { interpolacionIPC: i },
      });
    const real = por('mensual-ine').baseReguladora;
    const a = por('interpolada').baseReguladora;
    const b = por('escalon-anual').baseReguladora;
    expect(a).not.toBe(b);
    expect(real).not.toBe(a);
    expect(Math.abs(a / b - 1)).toBeLessThan(0.02);
    expect(Math.abs(real / a - 1)).toBeLessThan(0.02);
  });

  it('demora: una fracción de más de 6 meses cuenta desde el primer año o desde el segundo', () => {
    // Edad ordinaria el 1-1-2029; se jubila a los 21 meses (1 año completo y 9 meses)
    const carrera = [continua('1986-01', '2030-12', 2500)];
    const por = (l: 'desde-segundo-anio' | 'desde-primer-anio') =>
      calc(carrera, '1964-01-01', '2030-10-01', 'demorada', {
        escenario: ESC,
        usarOpcion25Anos: false,
        lecturas: { fraccionDemora: l },
      });
    expect(paso(por('desde-segundo-anio'), 'demora-porcentaje-adicional').valor).toBe(4);
    expect(paso(por('desde-primer-anio'), 'demora-porcentaje-adicional').valor).toBe(6);
    expect(por('desde-primer-anio').pensionMensual).toBeGreaterThan(
      por('desde-segundo-anio').pensionMensual,
    );
  });

  it('pensión máxima desde 2051: tabla de la DT 39.ª.4 como incremento acumulado o anual literal', () => {
    const acumulado = contexto({ escenario: ESC });
    const literal = contexto({
      escenario: ESC,
      lecturas: { maximaDesde2051: 'incremento-anual-literal' },
    });
    expect(literal.pensionMaxima(2050).valor).toBe(acumulado.pensionMaxima(2050).valor);
    expect(literal.pensionMaxima(2055).valor).toBeGreaterThan(acumulado.pensionMaxima(2055).valor);
    expect(acumulado.pensionMaxima(2055).valor).toBeGreaterThan(
      acumulado.pensionMaxima(2050).valor,
    );
    expect(acumulado.avisos.size).toBeGreaterThan(0);
  });
});
