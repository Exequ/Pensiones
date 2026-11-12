/** Tests por regla, por lectura abierta y de propiedades del motor de pensiones no contributivas. */
import { describe, expect, it } from 'vitest';
import { leerParametroDeRepositorio } from '../jubilacion/parametros-datos.ts';
import { DatoNoDisponible, NoImplementada } from '../jubilacion/errores.ts';
import { calcularPNCInvalidez, calcularPNCJubilacion } from './repositorio.ts';
import type { SolicitantePNC } from './tipos.ts';

const INC: SolicitantePNC = {
  nacimiento: '1980-05-05',
  fechaSolicitud: '2026-03-10',
  residenciaLegalMeses: 120,
  residenciaRecienteMeses: 60,
  gradoDiscapacidad: 70,
  rentasAnuales: 0,
};
const JUB: SolicitantePNC = {
  nacimiento: '1955-03-03',
  fechaSolicitud: '2026-03-10',
  residenciaLegalMeses: 240,
  residenciaRecienteMeses: 60,
  rentasAnuales: 0,
};
const C = 8803.2;

describe('Referencias y años', () => {
  it('todas las referencias a /data de los pasos y requisitos existen', () => {
    const r = calcularPNCInvalidez(
      { ...INC, gradoDiscapacidad: 80, necesitaTerceraPersona: true, rentasAnuales: 5000 },
      {
        unidadEconomica: { convivientes: 3, beneficiarios: 2, rentasUnidadAnuales: 9000 },
        alquiler: {
          sinViviendaEnPropiedad: true,
          titularDelContrato: true,
          arrendadorFamiliarOPareja: false,
          mesesVigenciaContrato: 12,
          diasResidenciaEnLaVivienda: 200,
        },
      },
    );
    const refs = new Set<string>();
    for (const p of r.pasos) for (const x of p.parametros) refs.add(x);
    for (const q of r.requisitos) for (const x of q.parametros) refs.add(x);
    expect(refs.size).toBeGreaterThan(12);
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

  it('efectos desde el mes siguiente: una solicitud en diciembre aplica la cuantía del año siguiente', () => {
    const r = calcularPNCJubilacion({ ...JUB, fechaSolicitud: '2025-12-20' });
    expect(r.fechaEfectos).toBe('2026-01-01');
    expect(r.cuantiaIntegraAnual).toBe(C);
    expect(
      calcularPNCJubilacion({ ...JUB, fechaSolicitud: '2025-11-30' }).cuantiaIntegraAnual,
    ).toBe(7905.8);
  });

  it('años anteriores a 2022: NoImplementada; posteriores a 2026: DatoNoDisponible', () => {
    expect(() => calcularPNCJubilacion({ ...JUB, fechaSolicitud: '2021-03-10' })).toThrow(
      NoImplementada,
    );
    expect(() => calcularPNCJubilacion({ ...JUB, fechaSolicitud: '2027-03-10' })).toThrow(
      DatoNoDisponible,
    );
  });
});

describe('Requisitos', () => {
  it('incapacidad: 18 años estrictos, menor de 65 y grado de al menos el 65 %', () => {
    expect(calcularPNCInvalidez({ ...INC, nacimiento: '2008-03-10' }).cumpleRequisitos).toBe(false);
    expect(calcularPNCInvalidez({ ...INC, nacimiento: '2008-03-09' }).cumpleRequisitos).toBe(true);
    expect(calcularPNCInvalidez({ ...INC, nacimiento: '1961-03-11' }).cumpleRequisitos).toBe(true);
    expect(calcularPNCInvalidez({ ...INC, nacimiento: '1961-03-10' }).cumpleRequisitos).toBe(false);
    expect(calcularPNCInvalidez({ ...INC, gradoDiscapacidad: 64 }).cumpleRequisitos).toBe(false);
    expect(calcularPNCInvalidez({ ...INC, gradoDiscapacidad: 65 }).cumpleRequisitos).toBe(true);
  });

  it('incapacidad: cinco años de residencia, dos de ellos inmediatamente anteriores', () => {
    expect(calcularPNCInvalidez({ ...INC, residenciaLegalMeses: 59 }).cumpleRequisitos).toBe(false);
    expect(calcularPNCInvalidez({ ...INC, residenciaRecienteMeses: 23 }).cumpleRequisitos).toBe(
      false,
    );
    expect(
      calcularPNCInvalidez({ ...INC, residenciaLegalMeses: 60, residenciaRecienteMeses: 24 })
        .cumpleRequisitos,
    ).toBe(true);
  });

  it('jubilación: dos años consecutivos inmediatamente anteriores', () => {
    expect(calcularPNCJubilacion({ ...JUB, residenciaRecienteMeses: 23 }).cumpleRequisitos).toBe(
      false,
    );
  });

  it('el complemento de tercera persona solo existe en la incapacidad', () => {
    const r = calcularPNCJubilacion({
      ...JUB,
      gradoDiscapacidad: 90,
      necesitaTerceraPersona: true,
    });
    expect(r.complementoTerceraPersonaAnual).toBe(0);
  });

  it('entradas incoherentes: más beneficiarios que convivientes', () => {
    expect(() =>
      calcularPNCInvalidez(INC, { unidadEconomica: { convivientes: 1, beneficiarios: 2 } }),
    ).toThrow(RangeError);
  });

  it('complemento de alquiler: cada requisito del RD 1191/2012 lo impide', () => {
    const ok = {
      sinViviendaEnPropiedad: true,
      titularDelContrato: true,
      arrendadorFamiliarOPareja: false,
      mesesVigenciaContrato: 12,
      diasResidenciaEnLaVivienda: 180,
    };
    expect(calcularPNCInvalidez(INC, { alquiler: ok }).complementoAlquilerAnual).toBe(525);
    for (const malo of [
      { sinViviendaEnPropiedad: false },
      { titularDelContrato: false },
      { arrendadorFamiliarOPareja: true },
      { mesesVigenciaContrato: 11 },
      { diasResidenciaEnLaVivienda: 179 },
      { otroPensionistaEsTitular: true },
    ]) {
      const r = calcularPNCInvalidez(INC, { alquiler: { ...ok, ...malo } });
      expect(r.complementoAlquilerAnual, JSON.stringify(malo)).toBe(0);
      expect(r.avisos.length).toBeGreaterThan(0);
    }
  });

  it('el art. 366 en la jubilación se ignora con aviso; sin IPREM del año, DatoNoDisponible', () => {
    expect(
      calcularPNCJubilacion(JUB, {
        trabajo: { ingresosActividadAnuales: 1000, mesesDesdeInicio: 3 },
      }).avisos.length,
    ).toBe(1);
    expect(() =>
      calcularPNCInvalidez(
        { ...INC, rentasAnuales: 1000 },
        { trabajo: { ingresosActividadAnuales: 1000, mesesDesdeInicio: 3 } },
      ),
    ).toThrow(DatoNoDisponible);
  });

  it('el art. 366 solo dura cuatro años (48 meses)', () => {
    const s = { ...INC, fechaSolicitud: '2023-03-10', rentasAnuales: 20000 };
    const dentro = calcularPNCInvalidez(s, {
      trabajo: { ingresosActividadAnuales: 20000, mesesDesdeInicio: 48 },
    });
    const fuera = calcularPNCInvalidez(s, {
      trabajo: { ingresosActividadAnuales: 20000, mesesDesdeInicio: 49 },
    });
    expect(dentro.cumpleRequisitos).toBe(true);
    expect(dentro.reduccionPorTrabajo).toBeGreaterThan(0);
    expect(fuera.cumpleRequisitos).toBe(false);
  });
});

describe('Lecturas abiertas (una prueba por opción)', () => {
  it('baseRentasCompatibles: sobre la cuantía por beneficiario el umbral del 35 % baja', () => {
    const o = { unidadEconomica: { convivientes: 2, beneficiarios: 2, rentasUnidadAnuales: 8000 } };
    const s = { ...INC, rentasAnuales: 4000 };
    const a = calcularPNCInvalidez(s, o);
    const b = calcularPNCInvalidez(s, {
      ...o,
      lecturasPNC: { baseRentasCompatibles: 'cuantia-por-beneficiario' },
    });
    expect(a.reduccionPorRentas).toBeCloseTo(4000 - 0.35 * C, 6);
    expect(b.reduccionPorRentas).toBeCloseTo(4000 - 0.35 * ((C + 0.7 * C) / 2), 6);
    expect(b.pensionAnual).toBeLessThan(a.pensionAnual);
  });

  it('limiteTrabajo: con la pensión reconocida el límite del art. 366 baja si ya hay reducción por rentas', () => {
    const s = { ...INC, fechaSolicitud: '2023-03-10', rentasAnuales: 12000 };
    const o = { trabajo: { ingresosActividadAnuales: 10000, mesesDesdeInicio: 12 } };
    const a = calcularPNCInvalidez({ ...s, rentasAnuales: 12000 }, o);
    const b = calcularPNCInvalidez(
      { ...s, rentasAnuales: 12000 },
      { ...o, lecturasPNC: { limiteTrabajo: 'pension-reconocida' } },
    );
    // Rentas ajenas a la actividad 2.000 (≤ 35 %): pensión 6.402,20; límite íntegra 13.602,20 frente a 7.200 + pensión.
    expect(a.pensionAnual).toBeCloseTo(3602.2, 2);
    expect(b.pensionAnual).toBeCloseTo(3602.2, 2);
    const s2 = { ...s, rentasAnuales: 14000 };
    const a2 = calcularPNCInvalidez(s2, o);
    const b2 = calcularPNCInvalidez(s2, {
      ...o,
      lecturasPNC: { limiteTrabajo: 'pension-reconocida' },
    });
    expect(b2.pensionAnual).toBeLessThan(a2.pensionAnual);
  });

  it('rentasConTrabajoEnCuatroAnios: sumar ambas reducciones deja menos pensión', () => {
    const s = { ...INC, fechaSolicitud: '2023-03-10', rentasAnuales: 10000 };
    const o = { trabajo: { ingresosActividadAnuales: 10000, mesesDesdeInicio: 12 } };
    const a = calcularPNCInvalidez(s, o);
    const b = calcularPNCInvalidez(s, {
      ...o,
      lecturasPNC: { rentasConTrabajoEnCuatroAnios: 'se-suman' },
    });
    expect(a.pensionAnual).toBeCloseTo(3602.2, 2);
    expect(b.cumpleRequisitos).toBe(false);
  });
});

describe('Propiedades', () => {
  it('la pensión no sube con las rentas, no pasa de la íntegra ni baja del 25 % (con derecho)', () => {
    for (const anio of [2022, 2023, 2024, 2025, 2026]) {
      for (const [convivientes, beneficiarios] of [
        [1, 1],
        [2, 1],
        [2, 2],
        [3, 1],
        [4, 2],
      ] as const) {
        let previa = Infinity;
        for (let rentas = 0; rentas <= 40000; rentas += 500) {
          const r = calcularPNCInvalidez(
            { ...INC, fechaSolicitud: `${anio}-03-10`, rentasAnuales: Math.min(rentas, 9000) },
            { unidadEconomica: { convivientes, beneficiarios, rentasUnidadAnuales: rentas } },
          );
          expect(Number.isFinite(r.totalAnual)).toBe(true);
          if (!r.cumpleRequisitos) {
            expect(r.pensionAnual).toBe(0);
            continue;
          }
          expect(r.pensionAnual).toBeLessThanOrEqual(r.cuantiaIntegraAnual + 1e-9);
          expect(r.pensionAnual).toBeGreaterThanOrEqual(0.25 * r.cuantiaIntegraAnual - 1e-9);
          expect(r.pensionAnual).toBeLessThanOrEqual(previa + 1e-9);
          previa = r.pensionAnual;
        }
      }
    }
  });

  it('más beneficiarios en la unidad: la cuantía de cada uno no sube', () => {
    let previa = Infinity;
    for (const b of [1, 2, 3, 4, 5]) {
      const r = calcularPNCInvalidez(INC, {
        unidadEconomica: { convivientes: b, beneficiarios: b, rentasUnidadAnuales: 0 },
      });
      expect(r.pensionAnual).toBeLessThanOrEqual(previa + 1e-9);
      previa = r.pensionAnual;
    }
  });

  it('con rentas nulas, la pensión es la cuantía por beneficiario y el total es pensión + complementos', () => {
    const r = calcularPNCInvalidez({ ...INC, gradoDiscapacidad: 90, necesitaTerceraPersona: true });
    expect(r.totalAnual).toBeCloseTo(
      r.pensionAnual + r.complementoTerceraPersonaAnual + r.complementoAlquilerAnual,
      9,
    );
  });
});
