import { describe, expect, it } from 'vitest';
import { diferenciaAcumuladaMei } from './mei-conciliacion';

describe('diferencia acumulada entre derechos reconocidos y dotaciones del MEI', () => {
  it('suma derechos menos dotación de todos los años y da el periodo', () => {
    expect(
      diferenciaAcumuladaMei([
        { anio: 2025, derechos: 4935.43, dotacion: 4356 },
        { anio: 2024, derechos: 3711.6, dotacion: 3576 },
      ]),
    ).toEqual({ desde: 2024, hasta: 2025, diferencia: expect.closeTo(715.03, 6) as number });
  });

  it('rechaza años sin cifra', () => {
    expect(() => diferenciaAcumuladaMei([])).toThrow(RangeError);
    expect(() =>
      diferenciaAcumuladaMei([{ anio: 2024, derechos: 1, dotacion: Number.NaN }]),
    ).toThrow(RangeError);
  });
});
