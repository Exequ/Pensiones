import { describe, expect, it } from 'vitest';
import { LECTURAS_ABIERTAS } from '../lecturas.ts';
import { porcentajeAdicional, tiempoDemora } from './demora.ts';
import { efectoMesesJubilacion, mesesMaximosCuadro } from './efecto-meses.ts';
import { coeficienteReductor, versionEscala } from './porcentajes.ts';
import { PARAMS, calc, continua, paso } from './pruebas.ts';
import type { Modalidad } from './tipos.ts';

const FRACCION = (() => {
  const v = LECTURAS_ABIERTAS.find((l) => l.id === 'jubilacion.fraccionDemora')?.porDefecto;
  return v === 'desde-primer-anio' ? 'desde-primer-anio' : 'desde-segundo-anio';
})();
const ANIO = 2030;
const efecto = efectoMesesJubilacion(PARAMS, ANIO, FRACCION);
const BASE = {
  escenario: { ipc: 0.02 },
  actualizarBases: false,
  usarOpcion25Anos: false,
  calcularAunqueNoCumpla: true,
} as const;

describe('efectoMesesJubilacion: cobertura y límites', () => {
  it('hay una fila por mes, de 1 al máximo de los dos cuadros', () => {
    const maximo = Math.max(
      mesesMaximosCuadro(PARAMS.coeficientesVoluntaria),
      mesesMaximosCuadro(PARAMS.coeficientesInvoluntaria),
    );
    expect(efecto.filas.map((f) => f.meses)).toEqual(
      Array.from({ length: maximo }, (_, i) => i + 1),
    );
  });

  it('el límite de cada cuadro sale de los datos y más allá no hay valor', () => {
    expect(efecto.voluntaria.mesesMaximos).toBe(mesesMaximosCuadro(PARAMS.coeficientesVoluntaria));
    expect(efecto.involuntaria.mesesMaximos).toBe(
      mesesMaximosCuadro(PARAMS.coeficientesInvoluntaria),
    );
    for (const f of efecto.filas) {
      const dentroV = f.meses <= efecto.voluntaria.mesesMaximos;
      const dentroI = f.meses <= efecto.involuntaria.mesesMaximos;
      expect(f.voluntaria.every((v) => v === null)).toBe(!dentroV);
      expect(f.involuntaria.every((v) => v === null)).toBe(!dentroI);
    }
    const ultima = efecto.filas.at(-1);
    expect(ultima?.meses).toBe(
      Math.max(efecto.voluntaria.mesesMaximos, efecto.involuntaria.mesesMaximos),
    );
  });

  it('cuatro tramos por cuadro, contiguos y con los umbrales de los datos', () => {
    for (const [tramos, tabla] of [
      [efecto.voluntaria.tramos, PARAMS.coeficientesVoluntaria],
      [efecto.involuntaria.tramos, PARAMS.coeficientesInvoluntaria],
    ] as const) {
      expect(tramos.map((t) => t.tramo)).toEqual([1, 2, 3, 4]);
      expect(tramos[0]?.desdeMeses).toBe(0);
      expect(tramos[3]?.hastaMeses).toBeNull();
      for (let i = 1; i < 4; i++) {
        expect(tramos[i]?.desdeMeses).toBe(tabla.umbralesMeses[i - 1]);
        expect(tramos[i - 1]?.hastaMeses).toBe(tramos[i]?.desdeMeses);
      }
    }
  });

  it('el cambio de las anticipadas es siempre una bajada y crece con los meses y baja con el tramo', () => {
    for (const [i, f] of efecto.filas.entries()) {
      for (const columna of [f.voluntaria, f.involuntaria]) {
        for (const v of columna) if (v !== null) expect(v).toBeLessThan(0);
        // Más cotización, menor reducción (en valor absoluto).
        const validos = columna.filter((v): v is number => v !== null);
        for (let t = 1; t < validos.length; t++)
          expect(Math.abs(validos[t] ?? 0)).toBeLessThanOrEqual(Math.abs(validos[t - 1] ?? 0));
      }
      const anterior = efecto.filas[i - 1];
      if (anterior) {
        for (const [t, v] of f.involuntaria.entries()) {
          if (v !== null) expect(v).toBeLessThanOrEqual(anterior.involuntaria[t] ?? 0);
        }
      }
    }
  });

  it('la demora no baja nunca y sube por escalones', () => {
    const puntos = efecto.filas.map((f) => f.demoraPuntos);
    for (let i = 1; i < puntos.length; i++)
      expect(puntos[i]).toBeGreaterThanOrEqual(puntos[i - 1] ?? 0);
    expect(puntos[0]).toBe(0);
  });
});

describe('efectoMesesJubilacion: cada valor coincide con las funciones del motor', () => {
  it('anticipo: coeficiente de la tabla con los meses cotizados del tramo', () => {
    for (const f of efecto.filas) {
      for (const [tabla, tramos, columna] of [
        [PARAMS.coeficientesVoluntaria, efecto.voluntaria.tramos, f.voluntaria],
        [PARAMS.coeficientesInvoluntaria, efecto.involuntaria.tramos, f.involuntaria],
      ] as const) {
        for (const [i, t] of tramos.entries()) {
          const v = columna[i];
          if (f.meses > mesesMaximosCuadro(tabla)) continue;
          const esperado = coeficienteReductor(tabla, f.meses, t.desdeMeses);
          expect(esperado.tramo).toBe(t.tramo);
          expect(v).toBe(-esperado.pct);
          // El último mes del tramo cae en el mismo tramo.
          if (t.hastaMeses !== null)
            expect(coeficienteReductor(tabla, f.meses, t.hastaMeses - 1).pct).toBe(esperado.pct);
        }
      }
    }
  });

  it('demora: porcentaje adicional del motor y cambio respecto del máximo de la escala', () => {
    const maximo = versionEscala(PARAMS, ANIO).maximoPct;
    expect(efecto.maximoEscalaPct).toBe(maximo);
    expect(efecto.anio).toBe(ANIO);
    for (const f of efecto.filas) {
      const esperado = porcentajeAdicional(
        PARAMS.reglasDemora,
        tiempoDemora(PARAMS.reglasDemora, f.meses, FRACCION),
      );
      expect(f.demoraPuntos).toBe(esperado);
      expect(f.demoraCambio).toBeCloseTo((esperado / maximo) * 100, 12);
    }
  });
});

/** Meses de anticipación y tramo que informa el motor en el paso del coeficiente. */
function anticipoDelMotor(r: ReturnType<typeof calc>): { meses: number; tramo: number } {
  const p = paso(r, 'coeficiente-reductor');
  const m = /^(\d+) meses de anticipación, tramo de cotización (\d)\.$/.exec(p.detalle ?? '');
  if (!m) throw new Error(`Detalle inesperado: ${p.detalle ?? ''}`);
  return { meses: Number(m[1]), tramo: Number(m[2]) };
}

describe('la tabla y el cálculo completo del motor no discrepan', () => {
  const casos: readonly (readonly [string, string, string, Modalidad])[] = [
    ['voluntaria, tramo 3, 12 meses', '1988-01', '1966-01-01', 'anticipada-voluntaria'],
    ['voluntaria, tramo 2, 17 meses', '1990-01', '1966-06-01', 'anticipada-voluntaria'],
    ['voluntaria, tramo 4, 6 meses', '1984-01', '1966-07-01', 'anticipada-voluntaria'],
    ['voluntaria, tramo 1, 24 meses', '1994-12', '1965-01-01', 'anticipada-voluntaria'],
    ['involuntaria, tramo 4, 24 meses', '1985-01', '1967-01-01', 'anticipada-involuntaria'],
    ['involuntaria, tramo 1, 40 meses', '1996-01', '1965-09-01', 'anticipada-involuntaria'],
    ['involuntaria, tramo 3, 3 meses', '1988-01', '1966-10-01', 'anticipada-involuntaria'],
  ];
  it.each(casos)('%s', (_titulo, inicio, nacimiento, modalidad) => {
    const r = calc([continua(inicio, '2029-12', 2500)], nacimiento, '2030-01-01', modalidad, BASE);
    const { meses, tramo } = anticipoDelMotor(r);
    const fila = efecto.filas.find((f) => f.meses === meses);
    if (!fila) throw new Error(`Sin fila para ${meses} meses`);
    const columna = modalidad === 'anticipada-voluntaria' ? fila.voluntaria : fila.involuntaria;
    // La pensión baja el coeficiente que dice el motor, y la tabla dice lo mismo en ese tramo.
    expect(columna[tramo - 1]).toBe(-(paso(r, 'coeficiente-reductor').valor as number));
  });

  const demoras = [
    ['1964-01-01', '2030-01-01'],
    ['1964-01-01', '2030-07-01'],
    ['1964-01-01', '2031-01-01'],
    ['1964-01-01', '2031-08-01'],
    ['1964-01-01', '2032-12-01'],
  ] as const;
  it.each(demoras)('demora, nacimiento %s, hecho causante %s', (nacimiento, fecha) => {
    const r = calc([continua('1980-01', '2037-12', 2500)], nacimiento, fecha, 'demorada', BASE);
    const meses = paso(r, 'demora-tiempo').valor as number;
    const fila = efecto.filas.find((f) => f.meses === meses);
    if (!fila) throw new Error(`Sin fila para ${meses} meses`);
    expect(paso(r, 'demora-porcentaje-adicional').valor).toBe(fila.demoraPuntos);
    // Con el 100 % de la escala, la pensión sube lo mismo que los puntos adicionales.
    expect(r.porcentaje).toBeCloseTo(efecto.maximoEscalaPct + fila.demoraPuntos, 9);
  });
});
