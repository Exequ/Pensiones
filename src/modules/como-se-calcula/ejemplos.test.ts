/**
 * Los ejemplos de «Cómo se calcula»: cada uno coincide con un caso de oro del motor y con una cuenta
 * hecha a mano aquí (la operación está en el comentario de cada caso). Los resultados los calcula el
 * motor; las cuentas a mano usan constantes escritas en el propio test, no la página ni el motor.
 */
import { describe, expect, it } from 'vitest';
import { ejemplosCalculo } from './datos-como';
import { ejemplosCalculados, ejemplosDe, type EjemploCalculado } from './ejemplos';

const por = (id: string): EjemploCalculado => {
  const e = ejemplosCalculados().find((x) => x.id === id);
  if (e === undefined) throw new Error(`Falta el ejemplo ${id}`);
  return e;
};
const valorPaso = (e: EjemploCalculado, id: string): number => {
  const v = e.pasos.find((p) => p.id === id)?.valorMotor;
  if (typeof v !== 'number') throw new Error(`Paso numérico ${id} no encontrado en ${e.id}`);
  return v;
};

// Constantes de las cuentas a mano (de las normas y de /data, escritas aquí a propósito).
const BR_2030 = (310 * 2500) / 361.67; // 310 mejores bases de 320 meses entre 361,67 (DT 40.ª, 2030)
const BR_2031 = (312 * 2500) / 364; // 312 mejores bases de 324 meses entre 364 (DT 40.ª, 2031)
const BR_IP_CORTA = 2000 / 1.1666; // 75 bases de 2.000 entre 75 × 1,1666 (art. 197.2 y RD 1799/1985)
const BR_IP_96 = (96 * 2000) / 112; // 96 bases de 2.000 entre 112 (art. 197.1.a)
const BR_SV = (24 * 2000) / 28; // 24 meses de 2.000 entre 28 (art. 228 y Decreto 1646/1972)

describe('los ejemplos del fichero de datos', () => {
  it('son los catorce previstos y todos son ilustrativos', () => {
    const d = ejemplosCalculo();
    expect(d.ejemplos).toHaveLength(14);
    expect(d.nota).toMatch(/ilustrativos/);
    for (const e of d.ejemplos) {
      expect(e.ilustrativo).toBe(true);
    }
  });
  it('hay ejemplos de las cuatro prestaciones', () => {
    for (const s of ['jubilacion', 'incapacidad', 'viudedad', 'orfandad'] as const) {
      expect(ejemplosDe(s).length).toBeGreaterThanOrEqual(2);
    }
  });
  it('todos cumplen los requisitos y los calcula el motor', () => {
    for (const e of ejemplosCalculados()) {
      expect(e.cumpleRequisitos, e.id).toBe(true);
      expect(e.pasos.length, e.id).toBeGreaterThan(2);
      expect(e.pensionMensual, e.id).toBeGreaterThan(0);
    }
  });
});

describe('jubilación: cuentas a mano', () => {
  it('ordinaria: 310 × 2.500 / 361,67 = 2.142,84; 100 % de la base; 14 pagas = 29.999,72', () => {
    const e = por('jub-ordinaria');
    expect(valorPaso(e, 'base-reguladora')).toBeCloseTo(BR_2030, 6);
    expect(valorPaso(e, 'porcentaje')).toBe(100);
    expect(e.pensionMensual).toBeCloseTo(BR_2030, 6);
    expect(e.pensionMensual).toBeCloseTo(2142.84, 2);
    expect(e.pensionAnual).toBeCloseTo(29999.72, 2);
    expect(e.estado).toBe('contributiva');
  });
  it('anticipada voluntaria: 2.142,84 × (1 − 5 %) = 2.035,70', () => {
    const e = por('jub-anticipada-voluntaria');
    expect(valorPaso(e, 'coeficiente-reductor')).toBe(5);
    expect(e.pensionMensual).toBeCloseTo(BR_2030 * 0.95, 6);
    expect(e.pensionMensual).toBeCloseTo(2035.7, 1);
  });
  it('demorada: 312 × 2.500 / 364 = 2.142,86; 100 % + 4 % × 2 años = 108 %; × 1,08 = 2.314,29', () => {
    const e = por('jub-demorada');
    expect(valorPaso(e, 'base-reguladora')).toBeCloseTo(BR_2031, 6);
    expect(valorPaso(e, 'demora-porcentaje-adicional')).toBe(8);
    expect(e.pensionMensual).toBeCloseTo(BR_2031 * 1.08, 6);
    expect(e.pensionMensual).toBeCloseTo(2314.29, 2);
  });
  it('mínima: base 310 × 900 / 361,67 = 771,42; mínima de 2026 × 1,02⁴ / 14 = 1.013,37', () => {
    const e = por('jub-minima');
    expect(valorPaso(e, 'base-reguladora')).toBeCloseTo((310 * 900) / 361.67, 6);
    // Mínima 2026 (65 años, sin cónyuge a cargo) 13.106,80 € revalorizada cuatro años con el IPC supuesto del 2 %.
    expect(e.pensionMensual).toBeCloseTo((13106.8 * Math.pow(1.02, 4)) / 14, 6);
    expect(e.pensionMensual).toBeCloseTo(1013.37, 2);
    expect(e.estado).toBe('minima');
    expect(valorPaso(e, 'complemento-minimos')).toBeCloseTo(
      e.pensionMensual - valorPaso(e, 'pension-contributiva'),
      6,
    );
  });
  it('máxima: 3.359,60 de 2026 × (1 + 2 % + 0,115 puntos)⁴ = 3.652,97', () => {
    const e = por('jub-maxima');
    expect(e.estado).toBe('maxima');
    expect(e.pensionMensual).toBeCloseTo(3359.6 * Math.pow(1.02115, 4), 6);
    expect(e.pensionMensual).toBeCloseTo(3652.97, 2);
    expect(valorPaso(e, 'base-reguladora')).toBeGreaterThan(e.pensionMensual);
  });
});

describe('incapacidad permanente: cuentas a mano', () => {
  it('total: 2.000 / 1,1666 = 1.714,38 × 100 % × 55 % = 942,91', () => {
    const e = por('ip-total');
    expect(valorPaso(e, 'base-reguladora')).toBeCloseTo(BR_IP_CORTA, 6);
    expect(valorPaso(e, 'porcentaje-grado')).toBe(55);
    expect(e.pensionMensual).toBeCloseTo(BR_IP_CORTA * 0.55, 6);
    expect(e.pensionMensual).toBeCloseTo(942.91, 2);
  });
  it('total cualificada: 96 × 2.000 / 112 × 96,20 % = 1.649,14; 55 % + 20 % = 1.236,86', () => {
    const e = por('ip-total-cualificada');
    // 50 % + 49 meses × 0,21 % + 189 meses × 0,19 % = 96,20 % (escala de la DT 9.ª con 418 meses).
    const porcentaje = 50 + 49 * 0.21 + 189 * 0.19;
    const br = BR_IP_96 * (porcentaje / 100);
    expect(valorPaso(e, 'base-reguladora')).toBeCloseTo(br, 6);
    expect(valorPaso(e, 'total-cualificada')).toBeCloseTo(0.2 * br, 6);
    expect(e.pensionMensual).toBeCloseTo(0.55 * br + 0.2 * br, 6);
    expect(e.pensionMensual).toBeCloseTo(1236.86, 2);
  });
  it('absoluta: 2.000 / 1,1666 × 100 % = 1.714,38', () => {
    const e = por('ip-absoluta');
    expect(e.pensionMensual).toBeCloseTo(BR_IP_CORTA, 6);
  });
  it('gran incapacidad: 1.714,38 + (45 % × 1.424,40 + 30 % × 2.000) = 2.955,36', () => {
    const e = por('ip-gran-incapacidad');
    // Base mínima de 2026: 1.424,40 €/mes; complemento 640,98 + 600 = 1.240,98 (> 45 % de la pensión).
    const complemento = 0.45 * 1424.4 + 0.3 * 2000;
    expect(valorPaso(e, 'complemento-gran-incapacidad')).toBeCloseTo(complemento, 6);
    expect(e.pensionMensual).toBeCloseTo(BR_IP_CORTA + complemento, 6);
    expect(e.pensionMensual).toBeCloseTo(2955.36, 2);
  });
});

describe('viudedad y orfandad: cuentas a mano', () => {
  it('base reguladora común: 24 × 2.000 / 28 = 1.714,29', () => {
    for (const id of [
      'viudedad-basica',
      'viudedad-65',
      'viudedad-cargas',
      'orfandad-basica',
      'orfandad-absoluta',
    ]) {
      expect(valorPaso(por(id), 'base-reguladora'), id).toBeCloseTo(BR_SV, 6);
    }
  });
  it('viudedad general: 1.714,29 × 52 % = 891,43 (mayor que la mínima de 9.931,60 / 14 = 709,40)', () => {
    const e = por('viudedad-basica');
    expect(valorPaso(e, 'porcentaje')).toBe(52);
    expect(e.pensionMensual).toBeCloseTo(BR_SV * 0.52, 6);
    expect(e.pensionMensual).toBeCloseTo(891.43, 2);
  });
  it('viudedad con edad avanzada y sin otras rentas: × 60 % = 1.028,57', () => {
    const e = por('viudedad-65');
    expect(valorPaso(e, 'porcentaje')).toBe(60);
    expect(e.pensionMensual).toBeCloseTo(BR_SV * 0.6, 6);
  });
  it('viudedad con cargas: × 70 % = 1.200; mínima con cargas 17.592,40 / 14 = 1.256,60', () => {
    const e = por('viudedad-cargas');
    expect(valorPaso(e, 'porcentaje')).toBe(70);
    expect(BR_SV * 0.7).toBeCloseTo(1200, 6);
    expect(e.pensionMensual).toBeCloseTo(17592.4 / 14, 6);
    expect(e.pensionMensual).toBeCloseTo(1256.6, 2);
    expect(valorPaso(e, 'complemento-minimos')).toBeCloseTo(17592.4 / 14 - 1200, 6);
    expect(e.estado).toBe('minima');
  });
  it('orfandad: 1.714,29 × 20 % = 342,86 (mayor que la mínima de 4.011 / 14 = 286,50)', () => {
    const e = por('orfandad-basica');
    expect(e.pensionMensual).toBeCloseTo(BR_SV * 0.2, 6);
    expect(e.pensionMensual).toBeCloseTo(342.86, 2);
  });
  it('orfandad absoluta con dos huérfanos: 20 % + 52 % / 2 = 46 % = 788,57; suma 92 % ≤ 100 %', () => {
    const e = por('orfandad-absoluta');
    expect(e.pensionMensual).toBeCloseTo(BR_SV * 0.46, 6);
    expect(e.pensionMensual).toBeCloseTo(788.57, 2);
    expect(2 * 0.46).toBeLessThanOrEqual(1);
  });
});

describe('lecturas abiertas medidas con el motor', () => {
  it('cada ejemplo da un efecto para cada lectura de su prestación', () => {
    for (const e of ejemplosCalculados()) {
      const efectos = e.efectoLecturas();
      expect(efectos.size, e.id).toBeGreaterThan(2);
      for (const [, v] of efectos) expect(v.texto.length).toBeGreaterThan(10);
    }
  });
});
