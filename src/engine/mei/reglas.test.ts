/** Tests por regla, por lectura abierta y de propiedades del motor del MEI y de la solidaridad. */
import { describe, expect, it } from 'vitest';
import { leerParametroDeRepositorio } from '../jubilacion/parametros-datos.ts';
import { DatoNoDisponible } from '../jubilacion/errores.ts';
import { parametrosMEIDelRepositorio } from './parametros-datos.ts';
import {
  calcularMEIDelAnio,
  cotizacionAdicionalDelAnio,
  cuotaSolidaridadDelAnio,
  tipoMEIDelAnio,
} from './repositorio.ts';

describe('Datos y referencias', () => {
  it('todas las referencias a /data de los pasos existen', () => {
    const refs = new Set<string>();
    for (const anio of [2026, 2035]) {
      const r = cotizacionAdicionalDelAnio(anio, 7000, {
        escenario: { ipc: 0.02 },
        tiposContingenciasComunes: { empresa: 23.6, trabajador: 4.7 },
      });
      for (const p of [...r.mei.pasos, ...r.solidaridad.pasos])
        for (const x of p.parametros) refs.add(x);
    }
    expect(refs.size).toBeGreaterThan(8);
    for (const x of refs) {
      const m = /^parametros\/(.+)\.json#(.+)$/.exec(x);
      expect(m, x).not.toBeNull();
      if (!m?.[1] || !m[2]) continue;
      const datos = (leerParametroDeRepositorio(m[1]) as { data: { id: string }[] }).data;
      expect(
        datos.some((d) => d.id === m[2]),
        x,
      ).toBe(true);
    }
  });

  it('empresa + trabajador = total en cada año de 2023 a 2050', () => {
    for (let a = 2023; a <= 2050; a++) {
      const t = tipoMEIDelAnio(a);
      expect(t.empresa + t.trabajador).toBeCloseTo(t.total, 9);
      expect(t.total).toBeGreaterThan(0);
    }
  });

  it('el calendario de la solidaridad coincide con los tipos de la orden de cotización de 2025 y 2026', () => {
    const p = parametrosMEIDelRepositorio();
    const orden = (
      leerParametroDeRepositorio('cuota-solidaridad-tipos') as {
        data: { id: string; value: number }[];
      }
    ).data;
    expect(orden.length).toBe(6);
    for (const d of orden) expect(p.calendarioSolidaridad.get(d.id), d.id).toBeCloseTo(d.value, 9);
  });

  it('el calendario sube cada año en cada tramo y acaba en los tipos del art. 19 bis en 2045', () => {
    const p = parametrosMEIDelRepositorio();
    for (const t of ['a', 'b', 'c']) {
      for (let a = 2026; a <= 2045; a++) {
        expect(p.calendarioSolidaridad.get(`${a}-tramo-${t}`) ?? 0).toBeGreaterThan(
          p.calendarioSolidaridad.get(`${a - 1}-tramo-${t}`) ?? 99,
        );
      }
    }
    expect(p.calendarioSolidaridad.get('2045-tramo-a')).toBe(
      p.reglasMEI.get('solidaridad-tipo-final-tramo-a'),
    );
    expect(p.calendarioSolidaridad.get('2045-tramo-b')).toBe(
      p.reglasMEI.get('solidaridad-tipo-final-tramo-b'),
    );
    expect(p.calendarioSolidaridad.get('2045-tramo-c')).toBe(
      p.reglasMEI.get('solidaridad-tipo-final-tramo-c'),
    );
  });
});

describe('Errores', () => {
  it('la solidaridad posterior a 2026 sin escenario ni base máxima: DatoNoDisponible', () => {
    expect(() => cuotaSolidaridadDelAnio(2030, 8000)).toThrow(DatoNoDisponible);
  });

  it('sin tipos de contingencias comunes de ese año: DatoNoDisponible (o se indican)', () => {
    expect(() => cuotaSolidaridadDelAnio(2030, 8000, { baseMaximaMensual: 5000 })).toThrow(
      DatoNoDisponible,
    );
    expect(
      cuotaSolidaridadDelAnio(2030, 8000, {
        baseMaximaMensual: 5000,
        tiposContingenciasComunes: { empresa: 23.6, trabajador: 4.7 },
      }).cuotaTotal,
    ).toBeGreaterThan(0);
  });

  it('bases negativas: RangeError', () => {
    expect(() => calcularMEIDelAnio(2026, -1)).toThrow(RangeError);
  });
});

describe('Lecturas abiertas', () => {
  it('baseMEI: la retribución completa cotiza MEI también por el exceso sobre la base máxima', () => {
    const a = cotizacionAdicionalDelAnio(2026, 6000);
    const b = cotizacionAdicionalDelAnio(2026, 6000, {
      lecturasMEI: { baseMEI: 'retribucion-completa' },
    });
    expect(a.mei.cuotaTotal).toBeCloseTo(0.009 * 5101.2, 6);
    expect(b.mei.cuotaTotal).toBeCloseTo(0.009 * 6000, 6);
    expect(b.cuotaTotal).toBeGreaterThan(a.cuotaTotal);
  });
});

describe('Propiedades', () => {
  it('la cuota de solidaridad no baja con la retribución, es 0 sin exceso y reparte exactamente', () => {
    for (const anio of [2025, 2026]) {
      let previa = -1;
      for (let r = 0; r <= 12000; r += 250) {
        const c = cuotaSolidaridadDelAnio(anio, r);
        expect(c.cuotaTotal).toBeGreaterThanOrEqual(previa - 1e-9);
        if (r <= c.baseMaximaMensual) expect(c.cuotaTotal).toBe(0);
        expect(c.cuotaEmpresa + c.cuotaTrabajador).toBeCloseTo(c.cuotaTotal, 9);
        expect(c.tramos.reduce((s, t) => s + t.importe, 0)).toBeCloseTo(c.exceso, 9);
        previa = c.cuotaTotal;
      }
    }
  });

  it('el tipo medio de la solidaridad crece con el exceso (los tramos suben) y nunca supera el del tramo c', () => {
    const c = cuotaSolidaridadDelAnio(2026, 20000);
    expect(c.cuotaTotal / c.exceso).toBeLessThan(0.0146);
    expect(c.cuotaTotal / c.exceso).toBeGreaterThan(0.0115);
  });

  it('la cuota del MEI es lineal en la base y no baja con los años hasta 2029', () => {
    let previa = 0;
    for (let a = 2023; a <= 2050; a++) {
      const c = calcularMEIDelAnio(a, 2000);
      expect(c.cuotaTotal).toBeGreaterThanOrEqual(previa - 1e-9);
      expect(calcularMEIDelAnio(a, 4000).cuotaTotal).toBeCloseTo(2 * c.cuotaTotal, 9);
      previa = c.cuotaTotal;
    }
  });
});
