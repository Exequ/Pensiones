/**
 * Tests por regla del motor de muerte y supervivencia y de cada lectura abierta (opciones de
 * `lecturasSupervivencia`, docs/REVISION_ACTUARIAL.md).
 */
import { describe, expect, it } from 'vitest';
import { leerParametroDeRepositorio } from '../jubilacion/parametros-datos.ts';
import { DatoNoDisponible, NoImplementada } from '../jubilacion/errores.ts';
import { reglaSV } from './parametros.ts';
import { parametrosSupervivenciaDelRepositorio } from './parametros-datos.ts';
import {
  calcularFavorFamiliares,
  calcularOrfandad,
  calcularSupervivencia,
  calcularViudedad,
  revalorizarSupervivenciaDelRepositorio,
} from './repositorio.ts';
import type { BeneficiarioViudedad, Causante, ResultadoSupervivencia } from './tipos.ts';

const P = parametrosSupervivenciaDelRepositorio();
const c = (desde: string, hasta: string, baseMensual = 2000) => ({ desde, hasta, baseMensual });
const ALTA: Causante = {
  fechaFallecimiento: '2026-03-15',
  causa: 'enfermedad-comun',
  situacion: 'alta',
  carrera: [c('2010-01', '2026-02')],
};
const CONYUGE: BeneficiarioViudedad = {
  vinculo: 'conyuge',
  nacimiento: '1976-05-01',
  fechaMatrimonio: '2005-06-01',
};
const BR = (24 * 2000) / 28;

const v0 = (r: ResultadoSupervivencia) => {
  const p = r.viudedad[0];
  if (!p) throw new Error('sin viudedad');
  return p;
};

describe('Datos y referencias', () => {
  it('el 20 % de la orfandad coincide en el Decreto 3158/1966 y en la Orden de 1967', () => {
    expect(reglaSV(P, 'orfandad-pct')).toBe(reglaSV(P, 'orfandad-pct-contraste-orden-1967'));
  });

  it('todas las referencias a /data de los pasos y requisitos existen', () => {
    const r = calcularSupervivencia(
      ALTA,
      {
        viudos: [{ ...CONYUGE, sexo: 'mujer', hijos: 1 }],
        huerfanos: [{ nacimiento: '2010-01-01' }, { nacimiento: '2012-01-01' }],
        familiares: [
          {
            parentesco: 'madre',
            nacimiento: '1950-01-01',
            convivenciaMeses: 30,
            estadoCivilCumple: true,
          },
        ],
      },
      { orfandadAbsoluta: true },
    );
    const refs = new Set<string>();
    const todos = [...r.viudedad, ...r.orfandad, ...r.favorFamiliares];
    for (const p of [...r.pasos, ...todos.flatMap((x) => x.pasos)])
      for (const x of p.parametros) refs.add(x);
    for (const q of [...r.requisitosCausante, ...todos.flatMap((x) => x.requisitos)])
      for (const x of q.parametros) refs.add(x);
    expect(refs.size).toBeGreaterThan(20);
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
});

describe('Causante', () => {
  it('hechos causantes anteriores a 2022: NoImplementada', () => {
    expect(() =>
      calcularViudedad({ ...ALTA, fechaFallecimiento: '2021-12-31' }, [CONYUGE]),
    ).toThrow(NoImplementada);
  });

  it('contingencias profesionales sin base calculada fuera: NoImplementada; con ella, se usa', () => {
    const at: Causante = { ...ALTA, causa: 'accidente-trabajo' };
    expect(() => calcularViudedad(at, [CONYUGE])).toThrow(NoImplementada);
    const r = calcularViudedad({ ...at, baseReguladoraProfesional: 3000 }, [CONYUGE]);
    expect(r.baseReguladora).toBe(3000);
    expect(v0(r).pensionContributiva).toBeCloseTo(1560, 6);
  });

  it('separación anterior a 2008 (DT 13.ª): NoImplementada', () => {
    expect(() =>
      calcularViudedad(ALTA, [
        { vinculo: 'excónyuge', nacimiento: '1970-01-01', separacionAnteriorA2008: true },
      ]),
    ).toThrow(NoImplementada);
  });

  it('500 días en los cinco años anteriores al cese de la obligación de cotizar', () => {
    const base: Causante = {
      ...ALTA,
      situacion: 'alta-sin-obligacion',
      carrera: [c('2015-01', '2018-12')],
    };
    expect(
      v0(calcularViudedad({ ...base, finObligacionCotizar: '2019-01-01' }, [CONYUGE]))
        .cumpleRequisitos,
    ).toBe(true);
    expect(
      v0(calcularViudedad({ ...base, finObligacionCotizar: '2024-06-01' }, [CONYUGE]))
        .cumpleRequisitos,
    ).toBe(false);
  });

  it('la base reguladora es el periodo de 24 meses más favorable de los quince años', () => {
    const r = calcularViudedad(
      { ...ALTA, carrera: [c('2010-01', '2015-12', 3000), c('2016-01', '2026-02', 1000)] },
      [CONYUGE],
    );
    expect(r.baseReguladora).toBeCloseTo((24 * 3000) / 28, 6);
  });

  it('pensionista: base de su pensión con las revalorizaciones de cada año posterior', () => {
    const r = calcularViudedad(
      {
        fechaFallecimiento: '2026-02-10',
        causa: 'enfermedad-comun',
        situacion: 'pensionista',
        pension: {
          baseReguladora: 1000,
          fechaHechoCausante: '2025-03-01',
          clase: 'incapacidad-permanente',
        },
      },
      [CONYUGE],
    );
    expect(r.baseReguladora).toBeCloseTo(1000 * 1.027, 6);
  });
});

describe('Viudedad', () => {
  it('cónyuge: con enfermedad anterior al vínculo bastan los hijos comunes o más de dos años de convivencia con el matrimonio', () => {
    const corto = { ...CONYUGE, fechaMatrimonio: '2025-09-15', enfermedadAnteriorAlVinculo: true };
    expect(v0(calcularViudedad(ALTA, [corto])).clase).toBe('prestacion-temporal-viudedad');
    expect(v0(calcularViudedad(ALTA, [{ ...corto, hijosComunes: true }])).clase).toBe('viudedad');
    expect(v0(calcularViudedad(ALTA, [{ ...corto, convivenciaPreviaMeses: 19 }])).clase).toBe(
      'viudedad',
    );
    expect(v0(calcularViudedad(ALTA, [{ ...corto, convivenciaPreviaMeses: 18 }])).clase).toBe(
      'prestacion-temporal-viudedad',
    );
  });

  it('pareja de hecho sin cinco años de convivencia: sin derecho', () => {
    const r = calcularViudedad(ALTA, [
      {
        vinculo: 'pareja-hecho',
        nacimiento: '1976-01-01',
        convivenciaMeses: 59,
        fechaRegistroPareja: '2020-01-01',
      },
    ]);
    expect(v0(r).cumpleRequisitos).toBe(false);
  });

  it('excónyuge: sin compensatoria no; víctima de violencia de género sí; con nuevo matrimonio no', () => {
    const ex: BeneficiarioViudedad = { vinculo: 'excónyuge', nacimiento: '1976-01-01' };
    expect(v0(calcularViudedad(ALTA, [ex])).cumpleRequisitos).toBe(false);
    expect(
      v0(calcularViudedad(ALTA, [{ ...ex, victimaViolenciaGenero: true }])).pensionContributiva,
    ).toBeCloseTo(0.52 * BR, 6);
    expect(
      v0(calcularViudedad(ALTA, [{ ...ex, pensionCompensatoriaAnual: 9000, nuevoVinculo: true }]))
        .cumpleRequisitos,
    ).toBe(false);
  });

  it('60 %: no con otra pensión pública ni con rentas del trabajo', () => {
    const mayor = { ...CONYUGE, nacimiento: '1956-01-01' };
    expect(v0(calcularViudedad(ALTA, [mayor])).porcentaje).toBe(60);
    expect(v0(calcularViudedad(ALTA, [{ ...mayor, otraPensionPublica: true }])).porcentaje).toBe(
      52,
    );
    expect(v0(calcularViudedad(ALTA, [{ ...mayor, rentasTrabajoAnuales: 100 }])).porcentaje).toBe(
      52,
    );
    expect(v0(calcularViudedad(ALTA, [{ ...mayor, rentasCapitalAnuales: 9443 }])).porcentaje).toBe(
      52,
    );
  });

  it('70 %: sin cargas (renta por miembro por encima del 75 % del SMI sin pagas extra) se queda en el 52 %', () => {
    const r = calcularViudedad(ALTA, [
      {
        ...CONYUGE,
        cargasFamiliares: { miembrosUnidadFamiliar: 2, rendimientosUnidadFamiliar: 22000 },
      },
    ]);
    expect(v0(r).porcentaje).toBe(52);
  });

  it('70 % y 60 % no se acumulan: se aplica el más favorable', () => {
    const r = calcularViudedad(ALTA, [
      {
        ...CONYUGE,
        nacimiento: '1956-01-01',
        cargasFamiliares: { miembrosUnidadFamiliar: 3, rendimientosUnidadFamiliar: 6000 },
      },
    ]);
    expect(v0(r).porcentaje).toBe(70);
  });

  it('brecha: no se suma si ya se percibe con otra pensión; un hombre sin orfandad de los hijos no la tiene', () => {
    expect(
      v0(calcularViudedad(ALTA, [{ ...CONYUGE, sexo: 'mujer', hijos: 5 }])).complementoBrecha,
    ).toBeCloseTo(4 * 36.9, 6);
    expect(
      v0(
        calcularViudedad(ALTA, [
          { ...CONYUGE, sexo: 'mujer', hijos: 2, brechaEnOtraPension: true },
        ]),
      ).complementoBrecha,
    ).toBe(0);
    expect(
      v0(calcularViudedad(ALTA, [{ ...CONYUGE, sexo: 'hombre', hijos: 2 }])).complementoBrecha,
    ).toBe(0);
  });

  it('rentas por encima del límite: sin complemento a mínimos', () => {
    const r = calcularViudedad({ ...ALTA, carrera: [c('2010-01', '2026-02', 1200)] }, [
      { ...CONYUGE, rendimientosAnuales: 20000 },
    ]);
    expect(v0(r).complementoMinimos).toBe(0);
    expect(v0(r).pensionMensual).toBeCloseTo((0.52 * 24 * 1200) / 28, 6);
  });
});

describe('Orfandad y familiares', () => {
  it('orfandad absoluta con un beneficiario de viudedad: incremento con el porcentaje no asignado', () => {
    const r = calcularSupervivencia(
      ALTA,
      {
        viudos: [
          {
            vinculo: 'excónyuge',
            nacimiento: '1970-01-01',
            pensionCompensatoriaAnual: 20000,
            mesesConvividos: 60,
          },
          { ...CONYUGE, mesesConvividos: 240 },
        ],
        huerfanos: [{ nacimiento: '2012-01-01' }],
      },
      { orfandadAbsoluta: true, aplicarMinimos: false },
    );
    // Cuotas 20 % y 80 %: 52 % repartido entero; no queda porcentaje sin asignar.
    expect(r.orfandad[0]?.porcentaje).toBeCloseTo(20, 6);
  });

  it('huérfano incapacitado de 30 años: derecho', () => {
    const r = calcularOrfandad(ALTA, [{ nacimiento: '1996-01-01', incapacitado: true }]);
    expect(r.orfandad[0]?.cumpleRequisitos).toBe(true);
  });

  it('mínima de orfandad absoluta: la mínima más el incremento repartido', () => {
    const r = calcularOrfandad(
      { ...ALTA, carrera: [c('2010-01', '2026-02', 1200)] },
      [{ nacimiento: '2012-01-01' }, { nacimiento: '2014-01-01' }],
      { orfandadAbsoluta: true },
    );
    // 46 % × 1.028,57 = 473,14 < (4.011 + 9.931,60 / 2) / 14 = 641,19.
    expect(r.orfandad[0]?.pensionMensual).toBeCloseTo((4011 + 9931.6 / 2) / 14, 2);
  });

  it('hijo de pensionista mayor de 45 años: exige causante pensionista', () => {
    const f = {
      parentesco: 'hijo-de-pensionista',
      nacimiento: '1975-01-01',
      convivenciaMeses: 60,
      solteroDivorciadoOViudo: true,
      dedicacionCuidado: true,
    } as const;
    expect(calcularFavorFamiliares(ALTA, [f]).favorFamiliares[0]?.cumpleRequisitos).toBe(false);
    const pens: Causante = {
      fechaFallecimiento: '2026-03-15',
      causa: 'enfermedad-comun',
      situacion: 'pensionista',
      pension: { baseReguladora: 2000, fechaHechoCausante: '2026-01-01', clase: 'jubilacion' },
    };
    expect(calcularFavorFamiliares(pens, [f]).favorFamiliares[0]?.cumpleRequisitos).toBe(true);
  });

  it('familiar único de 65 o más años sin viudo ni huérfanos: mínima incrementada', () => {
    // 72 % × 514,29 = 370,29 < 9.683,80 / 14.
    const r = calcularFavorFamiliares({ ...ALTA, carrera: [c('2010-01', '2026-02', 600)] }, [
      { parentesco: 'padre', nacimiento: '1950-01-01', convivenciaMeses: 30 },
    ]);
    expect(r.favorFamiliares[0]?.pensionMensual).toBeCloseTo(9683.8 / 14, 2);
  });

  it('con viudo u huérfanos pensionistas (cálculo aislado): sin incremento', () => {
    const r = calcularFavorFamiliares(
      ALTA,
      [{ parentesco: 'padre', nacimiento: '1950-01-01', convivenciaMeses: 30 }],
      { hayViudoOHuerfanosPensionistas: true },
    );
    expect(r.favorFamiliares[0]?.porcentaje).toBe(20);
  });

  it('nieto de 20 años con ingresos del trabajo del 80 % del SMI: sin derecho', () => {
    const r = calcularFavorFamiliares(ALTA, [
      {
        parentesco: 'nieto',
        nacimiento: '2006-01-01',
        convivenciaMeses: 30,
        huerfanoDePadreYMadre: true,
        rentasTrabajoAnuales: 0.8 * 17094,
        rendimientosAnuales: 0.8 * 17094,
      },
    ]);
    expect(r.favorFamiliares[0]?.cumpleRequisitos).toBe(false);
  });
});

describe('Revalorización y SMI', () => {
  it('la revalorización aplica la general a la cuantía inicial', () => {
    const r = calcularViudedad(
      { ...ALTA, fechaFallecimiento: '2024-03-15', carrera: [c('2010-01', '2024-02')] },
      [CONYUGE],
    );
    const s = revalorizarSupervivenciaDelRepositorio(v0(r), 2024, 2026);
    expect(s[2]?.importe).toBeCloseTo(v0(r).pensionMensual * 1.028 * 1.027, 6);
  });

  it('SMI anual posterior al último de /data: DatoNoDisponible si un requisito lo necesita', () => {
    expect(() =>
      calcularOrfandad(
        { ...ALTA, fechaFallecimiento: '2027-03-15', carrera: [c('2010-01', '2027-02')] },
        [{ nacimiento: '2004-01-01' }],
        { escenario: { ipc: 0.02 } },
      ),
    ).toThrow(DatoNoDisponible);
  });
});

describe('Lecturas abiertas (una prueba por opción)', () => {
  it('ventanaBaseReguladora: con el último mes más alto, la del Decreto 1646/1972 lo incluye', () => {
    const k: Causante = {
      ...ALTA,
      carrera: [c('2010-01', '2026-01', 2000), c('2026-02', '2026-02', 4000)],
    };
    const a = calcularViudedad(k, [CONYUGE]).baseReguladora;
    const b = calcularViudedad(k, [CONYUGE], {
      lecturasSupervivencia: { ventanaBaseReguladora: 'decreto-1646-1972' },
    }).baseReguladora;
    expect(a).toBeCloseTo(BR, 6);
    expect(b).toBeCloseTo((23 * 2000 + 4000) / 28, 6);
  });

  it('diasCotizados: 17 meses (febrero incluido) dan 500 días naturales pero 510 a treinta', () => {
    const k: Causante = { ...ALTA, carrera: [c('2024-10', '2026-02')] };
    const nat = v0(calcularViudedad(k, [CONYUGE])).requisitos.find((q) => q.id === 'carencia-alta');
    const tre = v0(
      calcularViudedad(k, [CONYUGE], {
        lecturasSupervivencia: { diasCotizados: 'treinta-por-mes' },
      }),
    ).requisitos.find((q) => q.id === 'carencia-alta');
    expect(nat?.valor).toBe(516);
    expect(tre?.valor).toBe(510);
  });

  it('carenciaOrfandad: con el RD 1647/1997 se exigen 500 días', () => {
    const k: Causante = { ...ALTA, carrera: [c('2025-02', '2026-01')] };
    expect(calcularOrfandad(k, [{ nacimiento: '2016-01-01' }]).orfandad[0]?.cumpleRequisitos).toBe(
      true,
    );
    expect(
      calcularOrfandad(k, [{ nacimiento: '2016-01-01' }], {
        lecturasSupervivencia: { carenciaOrfandad: 'rd-1647-1997' },
      }).orfandad[0]?.cumpleRequisitos,
    ).toBe(false);
  });

  it('carenciaFamiliaresAccidenteNoLaboral: exenta da derecho al nieto', () => {
    const k: Causante = {
      ...ALTA,
      causa: 'accidente-no-laboral',
      carrera: [c('2025-02', '2026-02')],
    };
    const f = [
      {
        parentesco: 'nieto',
        nacimiento: '2016-01-01',
        convivenciaMeses: 36,
        huerfanoDePadreYMadre: true,
      },
    ] as const;
    expect(calcularFavorFamiliares(k, f).favorFamiliares[0]?.cumpleRequisitos).toBe(false);
    expect(
      calcularFavorFamiliares(k, f, {
        lecturasSupervivencia: { carenciaFamiliaresAccidenteNoLaboral: 'exenta' },
      }).favorFamiliares[0]?.cumpleRequisitos,
    ).toBe(true);
  });

  it('comparacionCompensatoria: mensual (entre 12) da más que anual (entre 14)', () => {
    const ex: BeneficiarioViudedad = {
      vinculo: 'excónyuge',
      nacimiento: '1976-01-01',
      pensionCompensatoriaAnual: 6000,
    };
    const o = { aplicarMinimos: false } as const;
    expect(v0(calcularViudedad(ALTA, [ex], o)).pensionMensual).toBeCloseTo(6000 / 14, 6);
    expect(
      v0(
        calcularViudedad(ALTA, [ex], {
          ...o,
          lecturasSupervivencia: { comparacionCompensatoria: 'mensual' },
        }),
      ).pensionMensual,
    ).toBeCloseTo(500, 6);
  });

  it('reduccionViudedad70: sin suelo puede bajar del 52 %', () => {
    const v: BeneficiarioViudedad = {
      ...CONYUGE,
      nacimiento: '1981-01-01',
      rendimientosAnuales: 9000,
      cargasFamiliares: { miembrosUnidadFamiliar: 3, rendimientosUnidadFamiliar: 12000 },
    };
    const o = { aplicarMinimos: false } as const;
    const a = v0(calcularViudedad(ALTA, [v], o)).pensionMensual;
    const b = v0(
      calcularViudedad(ALTA, [v], {
        ...o,
        lecturasSupervivencia: { reduccionViudedad70: 'sin-suelo' },
      }),
    ).pensionMensual;
    expect(a).toBeCloseTo(0.52 * BR, 6);
    expect(b).toBeCloseTo((9442 + 9931.6 - 9000) / 14, 6);
  });

  it('incrementoFamiliares: sin incremento el nieto queda en el 20 %', () => {
    const f = [
      {
        parentesco: 'nieto',
        nacimiento: '2016-01-01',
        convivenciaMeses: 36,
        huerfanoDePadreYMadre: true,
      },
    ] as const;
    expect(
      calcularFavorFamiliares(ALTA, f, {
        lecturasSupervivencia: { incrementoFamiliares: 'sin-incremento' },
      }).favorFamiliares[0]?.porcentaje,
    ).toBe(20);
  });

  it('reduccionLimiteConjunto: proporcional reduce también la viudedad', () => {
    const b = {
      viudos: [CONYUGE],
      huerfanos: [1, 2, 3, 4].map((k) => ({ nacimiento: `201${k}-01-01` })),
    };
    const o = { aplicarMinimos: false } as const;
    const a = calcularSupervivencia(ALTA, b, o);
    const p = calcularSupervivencia(ALTA, b, {
      ...o,
      lecturasSupervivencia: { reduccionLimiteConjunto: 'proporcional' },
    });
    expect(a.viudedad[0]?.pensionMensual).toBeCloseTo(0.52 * BR, 6);
    expect(p.viudedad[0]?.pensionMensual).toBeCloseTo((0.52 / 1.32) * BR, 6);
    expect(p.sumaSujetaAlLimite).toBeCloseTo(BR, 6);
  });
});
