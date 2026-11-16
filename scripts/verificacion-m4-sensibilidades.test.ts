/**
 * Ajustes de M4 (sensibilidades), paso 1: la verificación reproducible de
 * `scripts/verificacion-m4-sensibilidades.ts` y su lectura en `docs/DISCREPANCIAS.md`.
 */
import { describe, expect, it } from 'vitest';
import {
  casosDelLeeme,
  resultadosDelLeeme,
  TOLERANCIA_BASE,
  verificarSensibilidades,
} from './verificacion-m4-sensibilidades.ts';

const r = verificarSensibilidades();

describe('lectura del LEEME', () => {
  const texto = [
    'CASOS',
    'a_1                  | g = 2 %',
    'b_2 | cotización, gradual',
    '',
    'RESULTADOS EN 2050 (x)',
    'base 16,13 y −5,62 (en otro fichero) | a_1 1,50 y −0,25 | b_2 2,00 y 3,00',
  ].join('\n');
  it('lee los casos en su orden, con su descripción literal', () => {
    expect(casosDelLeeme(`\n${texto}`)).toEqual([
      { id: 'a_1', parametro: 'g = 2 %' },
      { id: 'b_2', parametro: 'cotización, gradual' },
    ]);
  });
  it('lee los resultados de 2050 con el signo menos tipográfico', () => {
    expect(resultadosDelLeeme(texto)).toEqual({
      base: { gasto: 16.13, saldo: -5.62 },
      a_1: { gasto: 1.5, saldo: -0.25 },
      b_2: { gasto: 2, saldo: 3 },
    });
  });
});

describe('(a) el caso base', () => {
  it('el base de los escenarios reproduce m4_financiero.csv dentro de la tolerancia declarada', () => {
    expect(r.base.diferenciaRelativaConFinanciero).toBeLessThanOrEqual(TOLERANCIA_BASE);
  });
  it('la fila observada de 2025 es igual en los diez casos y en el base', () => {
    expect(r.fila2025.igualEnLosCasos).toBe(true);
    expect(r.fila2025.igualAlBase).toBe(true);
  });
  it('el caso de +1 punto de cotización no toca el gasto ni las cotizaciones de 2026', () => {
    expect(r.cotizacionMas1.diferenciaRelativaGasto).toBeLessThanOrEqual(TOLERANCIA_BASE);
    expect(r.cotizacionMas1.diferenciaCotizaciones2026).toBeLessThanOrEqual(TOLERANCIA_BASE);
  });
  it('el base de 2050 coincide con el LEEME (dos decimales) y con la descripción (un decimal)', () => {
    expect(Math.abs(r.base.gasto - r.base.leeme.gasto)).toBeLessThanOrEqual(0.005);
    expect(Math.abs(r.base.saldo - r.base.leeme.saldo)).toBeLessThanOrEqual(0.005);
    expect(Math.abs(r.base.gasto - r.base.descripcion.gasto)).toBeLessThanOrEqual(0.05);
    expect(Math.abs(r.base.saldo - r.base.descripcion.saldo)).toBeLessThanOrEqual(0.05);
  });
});

describe('(b) los diez casos en 2050', () => {
  it('hay diez casos con 26 años (2025 a 2050)', () => {
    expect(r.casos).toHaveLength(10);
    expect(r.aniosPorCaso).toBe(26);
  });
  it('ninguno difiere del LEEME ni de la sección 7 más que el redondeo', () => {
    for (const c of r.casos) {
      expect(c.superaRedondeo, c.id).toBe(false);
    }
  });
  it('los fragmentos que se comparan constan en la descripción', () => {
    const citados = r.casos.filter(
      (c) => c.descripcion.gasto !== null || c.descripcion.saldo !== null,
    );
    expect(citados).toHaveLength(8);
    for (const c of citados) expect(c.descripcion.fragmentoPresente, c.id).toBe(true);
  });
});

describe('(c) y (d) coherencias', () => {
  it('las columnas «_pct_pib» son importe entre PIB por cien', () => {
    expect(r.diferenciaPctPib).toBeLessThan(1e-9);
  });
  it('sin enlace con M5 el gasto de 2050 cambia menos de 0,1 puntos; con g de 1,8 %, el índice es 134', () => {
    expect(Math.abs(r.seccion3.cambioSinEnlace)).toBeLessThan(0.1);
    expect(Math.round(r.seccion3.indiceGasto2050ConG1_8)).toBe(134);
  });
  it('el LEEME fija el parámetro del caso de empleo de 55 a 64 años', () => {
    // El LEEME actual da el factor en el parámetro y el avance lineal en su nota sobre los casos de M2.
    expect(r.parametroEmpleo).toContain('tasas de afiliación y de cotización de 55 a 64 años');
    expect(r.parametroEmpleo).toMatch(/multiplicadas por 1,1 en 2050$/);
    expect(r.notaM2).toContain('El avance es lineal desde 2026');
    expect(r.notaM2).toContain('k = (t − 2026)/24');
    expect(r.notaM2).toContain(
      'empleo_55_64_mas_10 las tasas de 55 a 64 años quedan multiplicadas por 1,1',
    );
  });
});
