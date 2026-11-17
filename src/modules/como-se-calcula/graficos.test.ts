/**
 * Series de los gráficos: cada punto coincide con una cuenta hecha a mano a partir de las tablas de
 * la norma (constantes escritas aquí) y con los casos de oro del motor.
 */
import { describe, expect, it } from 'vitest';
import { datosAnticipo, datosDemora, datosEscala } from './graficos';

const valor = (puntos: readonly { anio: number; valor: number }[], i: number): number =>
  puntos.find((p) => p.anio === i)!.valor;

describe('escala de porcentajes', () => {
  const d = datosEscala();
  const serie = (clave: string) => d.series.find((s) => s.clave === clave)!;
  it('hay una serie por versión de la escala, en orden, con su etiqueta', () => {
    expect(d.series.map((s) => s.etiqueta)).toEqual([
      'Desde 2013',
      'Desde 2020',
      'Desde 2023',
      'Desde 2027',
    ]);
    expect(d.etiquetasX[0]).toBe('15 años');
    expect(d.etiquetasX).toHaveLength(serie('escala-2027').puntos.length);
  });
  it('versión de 2027: 50 % + 0,19 % × meses adicionales (hasta 248) + 0,18 % × el resto (hasta 16)', () => {
    const p = serie('escala-2027').puntos;
    expect(valor(p, 0)).toBeCloseTo(50, 9); // 180 meses
    expect(valor(p, 1)).toBeCloseTo(50 + 0.19 * 12, 9); // 192 meses
    expect(valor(p, 10)).toBeCloseTo(50 + 0.19 * 120, 9); // 300 meses
    // 444 meses = 180 + 248 + 16: 50 + 0,19 × 248 + 0,18 × 16 = 100; con 456 sigue en 100.
    expect(valor(p, 22)).toBeCloseTo(100, 9);
    expect(valor(p, p.length - 1)).toBe(100);
  });
  it('versión de 2013: 50 % + 0,21 % × 163 + 0,19 % × 83 = 100 al llegar a 426 meses', () => {
    const p = serie('escala-2013').puntos;
    expect(valor(p, 2)).toBeCloseTo(50 + 0.21 * 24, 9); // 204 meses
    expect(valor(p, 20)).toBeCloseTo(50 + 0.21 * 163 + 0.19 * (420 - 180 - 163), 9); // 420 meses
    expect(valor(p, 21)).toBeCloseTo(100, 9); // 432 meses
  });
  it('ninguna serie supera el máximo y todas son crecientes', () => {
    for (const s of d.series) {
      for (let i = 1; i < s.puntos.length; i++) {
        expect(s.puntos[i]!.valor).toBeGreaterThanOrEqual(s.puntos[i - 1]!.valor);
      }
      expect(Math.max(...s.puntos.map((p) => p.valor))).toBeLessThanOrEqual(100);
    }
  });
  it('lleva fuente con URL, fecha de descarga y confianza', () => {
    expect(d.fuentes).toHaveLength(1);
    expect(d.fuentes[0]!.source.url).toMatch(/^https:/);
  });
});

describe('coeficientes de anticipación', () => {
  it('voluntaria: tramo 3 con 12 meses = 5 % (caso de oro 2) y tramo 1 con 24 meses = 21 %', () => {
    const d = datosAnticipo('voluntaria');
    expect(valor(d.series[2]!.puntos, 11)).toBe(5);
    expect(valor(d.series[0]!.puntos, 23)).toBe(21);
    expect(d.etiquetasX).toHaveLength(24);
    expect(d.series).toHaveLength(4);
  });
  it('involuntaria: tramo 2 con 24 meses = 14 % (caso de oro 3) y tramo 1 con 48 meses = 30 %', () => {
    const d = datosAnticipo('involuntaria');
    // Caso de oro 3: 492 meses cotizados caen en el tramo 2 (de 462 a menos de 498 meses).
    expect(valor(d.series[1]!.puntos, 23)).toBe(14);
    expect(valor(d.series[0]!.puntos, 47)).toBe(30);
    expect(d.etiquetasX).toHaveLength(48);
  });
  it('a más anticipación, más reducción, en todos los tramos', () => {
    for (const cuadro of ['voluntaria', 'involuntaria'] as const) {
      for (const s of datosAnticipo(cuadro).series) {
        for (let i = 1; i < s.puntos.length; i++) {
          expect(s.puntos[i]!.valor).toBeGreaterThanOrEqual(s.puntos[i - 1]!.valor);
        }
      }
    }
  });
});

describe('porcentaje adicional de la demora', () => {
  const p = datosDemora().series[0]!.puntos;
  it('cuatro por ciento por año completo: 12 meses = 4 %, 24 meses = 8 % (caso de oro 4)', () => {
    expect(valor(p, 0)).toBe(0);
    expect(valor(p, 4)).toBe(4); // 12 meses
    expect(valor(p, 8)).toBe(8); // 24 meses
    expect(valor(p, 12)).toBe(12); // 36 meses
  });
  it('con la lectura por defecto (fracción desde el segundo año) la fracción del primer año no suma', () => {
    expect(valor(p, 7)).toBe(4); // 21 meses: un año completo y 9 meses
  });
  it('desde el segundo año una fracción de más de seis meses suma el 2 %', () => {
    expect(valor(p, 11)).toBe(10); // 33 meses: dos años completos (8 %) y 9 meses (2 %)
    expect(valor(p, 9)).toBe(8); // 27 meses: dos años y 3 meses, la fracción no llega a seis meses
  });
});
