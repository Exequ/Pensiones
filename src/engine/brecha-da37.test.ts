import { describe, expect, it } from 'vitest';
import CSV from '../../data/sistema/altas-bajas-anual-clase-sexo.csv?raw';
import { brechaDA37, brechasAnualesDA37, type FilaAltaBajaSexo } from './brecha-da37';
import { filasCsv, numeroCsv } from './series-historicas';

const FILAS: FilaAltaBajaSexo[] = filasCsv(CSV).map((f) => ({
  anio: Number(f['anio']),
  movimiento: f['movimiento'] ?? '',
  clase: f['clase'] ?? '',
  sexo: f['sexo'] ?? '',
  pensionMedia: numeroCsv(f['pension_media_eur_mes']),
}));

describe('brecha de la DA 37.ª con las altas iniciales de jubilación', () => {
  it('fórmula (hombres − mujeres) ÷ hombres', () => {
    expect(brechaDA37(2000, 1500)).toBeCloseTo(0.25, 12);
    expect(brechaDA37(1000, 1000)).toBe(0);
    expect(() => brechaDA37(0, 10)).toThrow(RangeError);
  });

  it('un valor por año completo de la tabla (2021-2025), calculado a mano en 2025', () => {
    const b = brechasAnualesDA37(FILAS);
    expect(b.map((x) => x.anio)).toEqual([2021, 2022, 2023, 2024, 2025]);
    const b2025 = b.at(-1);
    // 2025: hombres 1.770,14 €, mujeres 1.443,11 € (altas iniciales de jubilación).
    expect(b2025?.hombres).toBe(1770.14);
    expect(b2025?.mujeres).toBe(1443.11);
    expect(b2025?.brecha).toBeCloseTo((1770.14 - 1443.11) / 1770.14, 12);
    expect(b2025?.brecha).toBeCloseTo(0.184748, 6);
  });

  it('todos los años de la tabla quedan por encima del umbral del 5 % de la DA 37.ª', () => {
    for (const x of brechasAnualesDA37(FILAS))
      expect(x.brecha, String(x.anio)).toBeGreaterThan(0.05);
  });

  it('ignora los años sin uno de los dos sexos', () => {
    expect(
      brechasAnualesDA37([
        {
          anio: 2020,
          movimiento: 'alta-inicial',
          clase: 'jubilacion',
          sexo: 'hombres',
          pensionMedia: 1,
        },
      ]),
    ).toEqual([]);
  });
});
