/**
 * Las dos lecturas de la salvaguarda de la DT 34.ª calculadas juntas (Ajustes actuariales 4,
 * punto 4). Las cifras esperadas son las del caso de oro 7 (`casos-oro-motor.test.ts`), que no cambia.
 */
import { describe, expect, it } from 'vitest';
import { calcularJubilacionConParametros } from './calculo.ts';
import { parametrosDelRepositorio } from './parametros-datos.ts';
import { afectaSalvaguardaDT34, dosLecturasDT34, type LecturaDT34 } from './salvaguarda-dt34.ts';
import type { Modalidad } from './tipos.ts';

const P = parametrosDelRepositorio();
const ESC = { ipc: 0.02 } as const;

function calculo(
  baseMensual: number,
  modalidad: Modalidad,
  nacimiento = '1963-01-01',
  fecha = '2027-01-01',
) {
  return (l: LecturaDT34) =>
    calcularJubilacionConParametros(
      P,
      [{ desde: '1985-01', hasta: '2026-12', baseMensual }],
      nacimiento,
      fecha,
      modalidad,
      {
        escenario: ESC,
        usarOpcion25Anos: false,
        actualizarBases: true,
        lecturas: { salvaguardaDT34: l },
      },
    );
}

describe('dosLecturasDT34', () => {
  it('anticipada voluntaria por encima de la máxima (caso de oro 7): da las dos pensiones, A por encima de B', () => {
    const r = dosLecturasDT34(calculo(20000, 'anticipada-voluntaria'));
    expect(r).toBeDefined();
    // B: máxima de 2027 × (1 − 3,20 %); A: máxima solo con el IPC × (1 − 0,50 % × 4 trimestres).
    expect(r?.lecturaB).toBeCloseTo(3359.6 * 1.02115 * (1 - 0.032), 6);
    expect(r?.lecturaA).toBeCloseTo(3175.04 * 1.028 * 1.027 * 1.02 * 0.98, 6);
    expect(r?.lecturaA).toBeGreaterThan(r?.lecturaB ?? Number.POSITIVE_INFINITY);
  });

  it('la ordinaria no está afectada', () => {
    expect(dosLecturasDT34(calculo(20000, 'ordinaria', '1961-01-01'))).toBeUndefined();
  });

  it('la anticipada voluntaria por debajo de la máxima no está afectada', () => {
    expect(dosLecturasDT34(calculo(2500, 'anticipada-voluntaria'))).toBeUndefined();
  });

  it('el valor por defecto del motor (A) coincide con la lectura A', () => {
    const porDefecto = calcularJubilacionConParametros(
      P,
      [{ desde: '1985-01', hasta: '2026-12', baseMensual: 20000 }],
      '1963-01-01',
      '2027-01-01',
      'anticipada-voluntaria',
      { escenario: ESC, usarOpcion25Anos: false, actualizarBases: true },
    );
    expect(afectaSalvaguardaDT34(porDefecto.pasos)).toBe(true);
    expect(porDefecto.pensionMensual).toBe(
      dosLecturasDT34(calculo(20000, 'anticipada-voluntaria'))?.lecturaA,
    );
  });
});
