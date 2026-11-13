import { describe, expect, it } from 'vitest';
import type { ComparacionLecturas } from '../../engine/comparar-lecturas';
import { filasComparacion, fraseComparacion, porcentajeConSigno } from './comparacion-texto';
import { TEXTOS } from './textos';

type Comparado = Extract<ComparacionLecturas, { tipo: 'comparado' }>;

function comparado(
  elegido: { pension: number; base: number; cumple?: boolean },
  defecto: { pension: number; base: number; cumple?: boolean },
): Comparado {
  const detalle = (x: { pension: number; base: number; cumple?: boolean }) =>
    ({
      pensionMensual: x.pension,
      baseReguladora: x.base,
      cumpleRequisitos: x.cumple ?? true,
    }) as never;
  return {
    tipo: 'comparado',
    cambiadas: [
      {
        id: 'jubilacion.actualizacionFactorMinimo',
        valor: 'sin-suelo',
        porDefecto: 'suelo-1',
      },
    ],
    elegido: { detalle: detalle(elegido) } as never,
    porDefecto: { detalle: detalle(defecto) } as never,
    diferencia: {
      pension: {
        euros: elegido.pension - defecto.pension,
        porcentaje: ((elegido.pension - defecto.pension) / defecto.pension) * 100,
      },
      baseReguladora: {
        euros: elegido.base - defecto.base,
        porcentaje: ((elegido.base - defecto.base) / defecto.base) * 100,
      },
    },
  };
}

describe('frase de la comparación', () => {
  it('sin cambios: dice que todas están por defecto', () => {
    expect(fraseComparacion({ tipo: 'sin-cambios', resultado: {} as never })).toBe(
      TEXTOS.comparacionSinCambios,
    );
    expect(fraseComparacion({ tipo: 'sin-cambios', resultado: {} as never }, true)).toBe(
      TEXTOS.lecturasRestablecidas,
    );
  });

  it('nombra la lectura cambiada con sus etiquetas, los dos importes y la diferencia', () => {
    const f = fraseComparacion(
      comparado({ pension: 2000, base: 3000 }, { pension: 2100, base: 3100 }),
    );
    expect(f).toMatch(/Has cambiado una lectura/);
    expect(f).toMatch(/«Sin suelo»/);
    expect(f).toMatch(/«Con suelo igual a uno»/);
    expect(f).toMatch(/2\.000,00\s€/);
    expect(f).toMatch(/2\.100,00\s€/);
    expect(f).toMatch(/-100,00\s€ al mes \(-4,76\s%\)/);
  });

  it('es neutra: no dice qué lectura es mejor ni correcta', () => {
    const f = fraseComparacion(
      comparado({ pension: 2200, base: 3000 }, { pension: 2100, base: 3100 }),
    );
    expect(f.toLowerCase()).not.toMatch(/mejor|peor|correcta|recomend|conviene/);
  });

  it('sin diferencia en la pensión lo dice con palabras', () => {
    const f = fraseComparacion(
      comparado({ pension: 2100, base: 3000 }, { pension: 2100, base: 3100 }),
    );
    expect(f).toMatch(/la pensión mensual bruta no cambia/);
  });

  it('si solo una de las dos cumple los requisitos, lo explica y no hay tabla', () => {
    const c = comparado(
      { pension: 0, base: 3000, cumple: false },
      { pension: 2100, base: 3100, cumple: true },
    );
    expect(fraseComparacion(c)).toMatch(/Con tus lecturas no se cumplen los requisitos/);
    expect(filasComparacion(c)).toEqual([]);
    const ninguna = comparado(
      { pension: 0, base: 3000, cumple: false },
      { pension: 0, base: 3100, cumple: false },
    );
    expect(fraseComparacion(ninguna)).toMatch(/no hay pensión que comparar/);
  });

  it('error de una de las dos llamadas: no compara y lo dice', () => {
    const f = fraseComparacion({
      tipo: 'no-comparable',
      cambiadas: [],
      error: { codigo: 'DatoNoDisponible', mensaje: 'Falta un dato.' } as never,
    });
    expect(f).toMatch(/No se ha podido comparar/);
  });
});

describe('tabla de la comparación', () => {
  it('dos filas (pensión y base reguladora) con importes y diferencias formateados', () => {
    const filas = filasComparacion(
      comparado({ pension: 2000, base: 3000 }, { pension: 2100, base: 3100 }),
    );
    expect(filas.map((f) => f.concepto)).toEqual([
      TEXTOS.comparacionFilaPension,
      TEXTOS.comparacionFilaBase,
    ]);
    expect(filas[0]?.diferenciaEuros).toMatch(/^-100,00\s€$/);
    expect(filas[0]?.diferenciaPorcentaje).toMatch(/^-4,76\s%$/);
  });

  it('el porcentaje sin base de partida se muestra como raya', () => {
    expect(porcentajeConSigno(undefined)).toBe('—');
  });
});
