/**
 * Ajustes de M4, paso 1: la verificación reproducible de `scripts/verificacion-m4.ts` y su lectura
 * en `docs/DISCREPANCIAS.md`. Los umbrales son los de redondeo de la propia descripción.
 */
import { describe, expect, it } from 'vitest';
import { valoresInforme, verificarM4 } from './verificacion-m4.ts';

const r = verificarM4();

describe('(a) el MEI está dentro de las cotizaciones de la salida de M4', () => {
  it('las cotizaciones son mayores o iguales que el MEI en todos los años', () => {
    expect(r.mei.cotizacionesMayoresOIgualesQueMei).toBe(true);
    expect(r.mei.anios).toBeGreaterThan(20);
  });

  it('las cotizaciones sin MEI siguen la base de M2 y el MEI es el tipo legal por esa base', () => {
    expect(r.mei.desviacionSinMei).toBeLessThan(1e-9);
    expect(r.mei.desviacionConTipo).toBeLessThan(1e-9);
  });

  it('en la ejecución de 2025 el MEI es una partida de las cotizaciones sociales (la suma cuadra)', () => {
    expect(r.mei.ejecucion2025.mei).toBeGreaterThan(0);
    expect(r.mei.ejecucion2025.mei).toBeLessThan(r.mei.ejecucion2025.cotizaciones);
    expect(r.mei.ejecucion2025.sumaPartidas).toBeCloseTo(r.mei.ejecucion2025.cotizaciones, 1);
  });
});

describe('(b) gasto de 2025 frente a pensiones × pensión media × 14', () => {
  it('el cociente es menor que uno en conjunto y en cada clase', () => {
    expect(r.gasto.total.factor).toBeLessThan(1);
    for (const c of r.gasto.porClase) {
      expect(c.factor).toBeLessThan(1);
      expect(c.factor).toBeGreaterThan(0.8);
    }
  });

  it('lo que la ejecución trae fuera de las cinco clases es el gasto sin clase (pensiones de la DANA)', () => {
    expect(r.gasto.gastoSinClase).toBeGreaterThanOrEqual(0);
    expect(r.gasto.gastoSinClase).toBeLessThan(5);
  });

  it('el CSV de M4 reproduce el cociente total de 2025 y mantiene uno casi constante después', () => {
    expect(r.gasto.csv2025.gasto).toBeCloseTo(r.gasto.total.gastoEjecucion, 2);
    expect(r.gasto.csv2025.factor).toBeCloseTo(r.gasto.total.factor, 4);
    expect(r.gasto.factorProyectado.maximo - r.gasto.factorProyectado.minimo).toBeLessThan(0.001);
    expect(Math.abs(r.gasto.factorProyectado.minimo - r.gasto.total.factor)).toBeLessThan(0.001);
  });
});

describe('(c) complementos a mínimos en la ejecución', () => {
  it('son una partida aparte de las pensiones contributivas y con ellos el cociente se acerca a uno', () => {
    expect(r.complementos.partidaAparte).toBe(true);
    expect(r.complementos.importe).toBeGreaterThan(0);
    expect(r.complementos.factorConComplementos).toBeGreaterThan(r.gasto.total.factor);
    expect(Math.abs(r.complementos.factorConComplementos - 1)).toBeLessThan(0.01);
  });

  it('forman parte del gasto no financiero de la ejecución, fuera de la suma de pensiones', () => {
    expect(r.complementos.incluidosEnGastoNoFinanciero).toBe(true);
  });

  it('los complementos caben en el resto de gastos de la salida de M4 (es una condición, no una prueba)', () => {
    expect(r.complementos.importe).toBeLessThan(r.complementos.otrosGastosCsv2025);
  });
});

describe('(d) saldo sin transferencias = saldo no financiero − transferencias y otros ingresos', () => {
  it('se cumple en todas las filas de las dos salidas (2026-2050 y los cinco escenarios con 2025)', () => {
    expect(r.saldos.filas).toBeGreaterThan(150);
    expect(r.saldos.desviacionMaxima).toBeLessThan(1e-6);
  });

  it('con la ejecución de 2025 sale el mismo saldo sin transferencias que el de la fila de 2025', () => {
    const e = r.saldos.ejecucion2025;
    expect(e.saldoSinTransferencias).toBeCloseTo(e.saldoNoFinanciero - e.transferenciasYOtros, 6);
    expect(e.cotizaciones - e.obligacionesNoFinancieras).toBeCloseTo(e.saldoSinTransferencias, 6);
  });
});

describe('(e) valor inicial del Fondo de Reserva', () => {
  it('el fichero descargado lo declara a precio de adquisición y el CSV parte de ese valor', () => {
    expect(r.fondo.descripcionFichero).toContain('precio de adquisición');
    expect(r.fondo.valorCsv2025).toBe(r.fondo.valorFicheroMeur);
  });

  it('la lectura del informe a las Cortes (PDF no versionado) distingue adquisición y mercado', () => {
    const texto = [
      'FRSS at acquisition price                                9,376.65         14,069.81      4,693.16',
      'FRSS at market value                                     9,433.99         14,030.07      4,596.08',
    ].join('\n');
    expect(valoresInforme(texto)).toEqual({ adquisicion: 14069.81, mercado: 14030.07 });
    expect(valoresInforme(undefined)).toEqual({ adquisicion: null, mercado: null });
    expect(Math.round(14069.81)).toBe(r.fondo.valorFicheroMeur);
  });
});
