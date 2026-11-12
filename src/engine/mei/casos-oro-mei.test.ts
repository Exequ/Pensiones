/**
 * Casos de oro del motor del MEI y de la cotización adicional de solidaridad (docs/
 * MOTOR_NO_CONTRIBUTIVAS_MEI.md).
 *
 * Etiqueta de cada caso:
 * - «derivado de la norma»: calculado a mano a partir del texto legal y de /data (cuenta en el
 *   campo `cuenta`). NO es una validación independiente.
 * - «independiente»: ejemplo resuelto publicado en una fuente oficial (con su URL). No se ha
 *   localizado ninguno (docs/INFORME_VERIFICACION.md, Fase 2-B-3).
 */
import { describe, expect, it } from 'vitest';
import { NoImplementada } from '../jubilacion/errores.ts';
import {
  calcularMEIDelAnio,
  cotizacionAdicionalDelAnio,
  cuotaSolidaridadDelAnio,
  tipoMEIDelAnio,
} from './repositorio.ts';

type Etiqueta = 'derivado de la norma' | 'independiente';
interface Caso {
  readonly id: string;
  readonly etiqueta: Etiqueta;
  readonly url?: string;
  readonly cuenta: string;
  readonly calcular: () => Record<string, number>;
  readonly esperado: Record<string, number>;
}

const CASOS: readonly Caso[] = [
  {
    id: 'mei-2023',
    etiqueta: 'derivado de la norma',
    cuenta:
      'DT 43.ª, 2023: 0,60 (0,50 empresa y 0,10 trabajador). Base 3.000: 18,00 = 15,00 + 3,00.',
    calcular: () => {
      const r = calcularMEIDelAnio(2023, 3000);
      return { total: r.cuotaTotal, empresa: r.cuotaEmpresa, trabajador: r.cuotaTrabajador };
    },
    esperado: { total: 18, empresa: 15, trabajador: 3 },
  },
  {
    id: 'mei-2026',
    etiqueta: 'derivado de la norma',
    cuenta: 'DT 43.ª, 2026: 0,90 (0,75 y 0,15). Base 2.000: 18,00 = 15,00 + 3,00.',
    calcular: () => {
      const r = calcularMEIDelAnio(2026, 2000);
      return { total: r.cuotaTotal, empresa: r.cuotaEmpresa, trabajador: r.cuotaTrabajador };
    },
    esperado: { total: 18, empresa: 15, trabajador: 3 },
  },
  {
    id: 'mei-2029',
    etiqueta: 'derivado de la norma',
    cuenta: 'DT 43.ª, 2029: 1,2 (1,00 y 0,2). Base 4.000: 48,00 = 40,00 + 8,00.',
    calcular: () => {
      const r = calcularMEIDelAnio(2029, 4000);
      return { total: r.cuotaTotal, empresa: r.cuotaEmpresa, trabajador: r.cuotaTrabajador };
    },
    esperado: { total: 48, empresa: 40, trabajador: 8 },
  },
  {
    id: 'mei-2035-mismo-porcentaje',
    etiqueta: 'derivado de la norma',
    cuenta:
      'De 2030 a 2050 se mantiene el 1,2 con igual distribución (1,00 y 0,2). Base 1.000: 12,00 = 10,00 + 2,00.',
    calcular: () => {
      const r = calcularMEIDelAnio(2035, 1000);
      return { total: r.cuotaTotal, empresa: r.cuotaEmpresa, trabajador: r.cuotaTrabajador };
    },
    esperado: { total: 12, empresa: 10, trabajador: 2 },
  },
  {
    id: 'mei-antes-de-2023',
    etiqueta: 'derivado de la norma',
    cuenta: 'El MEI tiene efectos desde el 01/01/2023: en 2022, tipo 0 y cuota 0.',
    calcular: () => {
      const r = calcularMEIDelAnio(2022, 3000);
      return { total: r.cuotaTotal, tipo: r.tipo.total };
    },
    esperado: { total: 0, tipo: 0 },
  },
  {
    id: 'mei-contingencias-profesionales',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Solo se cotiza el MEI donde se cotiza por la contingencia de jubilación: en contingencias profesionales, 0.',
    calcular: () => ({ total: calcularMEIDelAnio(2026, 3000, 'profesionales').cuotaTotal }),
    esperado: { total: 0 },
  },
  {
    id: 'solidaridad-2026-dos-tramos',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Base máxima 5.101,20; retribución 6.000: exceso 898,80 = 510,12 (tramo a, 1,15 %) + 388,68 (tramo b, 1,25 %) → 5,86638 + 4,8585 = 10,72488; reparto 23,60 / 28,30 = 83,39 % empresa: 8,943716.',
    calcular: () => {
      const r = cuotaSolidaridadDelAnio(2026, 6000);
      return {
        exceso: r.exceso,
        total: r.cuotaTotal,
        empresa: r.cuotaEmpresa,
        trabajador: r.cuotaTrabajador,
      };
    },
    esperado: { exceso: 898.8, total: 10.72488, empresa: 8.943716, trabajador: 1.781164 },
  },
  {
    id: 'solidaridad-2026-tres-tramos',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Retribución 8.000: exceso 2.898,80 = 510,12 (a) + 2.040,48 (b: el 40 % de la base) + 348,20 (c, 1,46 %) → 5,86638 + 25,506 + 5,08372 = 36,4561.',
    calcular: () => ({ total: cuotaSolidaridadDelAnio(2026, 8000).cuotaTotal }),
    esperado: { total: 36.4561 },
  },
  {
    id: 'solidaridad-2025',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Base máxima 2025 4.909,50; retribución 5.000: exceso 90,50 en el tramo a (0,92 %) = 0,8326.',
    calcular: () => ({ total: cuotaSolidaridadDelAnio(2025, 5000).cuotaTotal }),
    esperado: { total: 0.8326 },
  },
  {
    id: 'solidaridad-sin-exceso',
    etiqueta: 'derivado de la norma',
    cuenta: 'Retribución igual a la base máxima: sin exceso, cuota 0.',
    calcular: () => ({ total: cuotaSolidaridadDelAnio(2026, 5101.2).cuotaTotal }),
    esperado: { total: 0 },
  },
  {
    id: 'solidaridad-antes-de-2025',
    etiqueta: 'derivado de la norma',
    cuenta:
      'La cotización adicional de solidaridad rige desde el 01/01/2025: en 2024, 0 aunque haya exceso.',
    calcular: () => ({ total: cuotaSolidaridadDelAnio(2024, 9000).cuotaTotal }),
    esperado: { total: 0 },
  },
  {
    id: 'solidaridad-tipos-finales',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Desde 2045 rigen los tipos del art. 19 bis (5,5, 6 y 7 %). Base máxima 5.000, retribución 10.000: tramos 500 / 2.000 / 2.500 → 27,5 + 120 + 175 = 322,5 (año 2046, tipos de contingencias comunes indicados).',
    calcular: () => ({
      total: cuotaSolidaridadDelAnio(2046, 10000, {
        baseMaximaMensual: 5000,
        tiposContingenciasComunes: { empresa: 23.6, trabajador: 4.7 },
      }).cuotaTotal,
    }),
    esperado: { total: 322.5 },
  },
  {
    id: 'cotizacion-adicional-2026',
    etiqueta: 'derivado de la norma',
    cuenta:
      'Retribución 6.000 en 2026: MEI sobre la base de cotización 5.101,20 (0,9 % = 45,9108) + solidaridad 10,72488 = 56,63568.',
    calcular: () => {
      const r = cotizacionAdicionalDelAnio(2026, 6000);
      return { base: r.baseCotizacion, mei: r.mei.cuotaTotal, total: r.cuotaTotal };
    },
    esperado: { base: 5101.2, mei: 45.9108, total: 56.63568 },
  },
];

describe('Casos de oro del MEI y de la solidaridad', () => {
  it('hay al menos 6 casos, todos con etiqueta y cuenta', () => {
    expect(CASOS.length).toBeGreaterThanOrEqual(6);
    for (const k of CASOS) {
      expect(k.cuenta.length).toBeGreaterThan(10);
      if (k.etiqueta === 'independiente') expect(k.url).toMatch(/^https:\/\//);
    }
  });

  for (const k of CASOS) {
    it(`${k.id} (${k.etiqueta})`, () => {
      const real = k.calcular();
      for (const [campo, valor] of Object.entries(k.esperado))
        expect(real[campo]).toBeCloseTo(valor, 5);
    });
  }

  it('después de 2050 el MEI lanza NoImplementada', () => {
    expect(() => tipoMEIDelAnio(2051)).toThrow(NoImplementada);
  });
});
