/** Fachada única: equivale a llamar a cada motor, unifica errores y acepta la configuración de lecturas. */
import { describe, expect, it } from 'vitest';
import { calcularIncapacidadPermanente } from './incapacidad/repositorio.ts';
import { calcularJubilacion } from './jubilacion/repositorio.ts';
import { LECTURAS_ABIERTAS } from './lecturas.ts';
import { calcularPNCInvalidez, calcularPNCJubilacion } from './no-contributivas/repositorio.ts';
import { motorDelRepositorio } from './repositorio.ts';
import { desenvolver, type Entrada } from './index.ts';
import {
  calcularFavorFamiliares,
  calcularOrfandad,
  calcularSupervivencia,
  calcularViudedad,
} from './supervivencia/repositorio.ts';
import type { Causante } from './supervivencia/tipos.ts';

const motor = motorDelRepositorio();
const carrera = [{ desde: '2000-01', hasta: '2026-02', baseMensual: 2000 }];
const OPC = { escenario: { ipc: 0.02 } } as const;
const causante: Causante = {
  fechaFallecimiento: '2026-03-15',
  causa: 'enfermedad-comun',
  situacion: 'alta',
  carrera: [{ desde: '2010-01', hasta: '2026-02', baseMensual: 2000 }],
};
const viudos = [
  { vinculo: 'conyuge', nacimiento: '1976-05-01', fechaMatrimonio: '2005-06-01' },
] as const;
const huerfanos = [{ nacimiento: '2014-01-01' }, { nacimiento: '2016-01-01' }] as const;
const familiares = [
  { parentesco: 'madre', nacimiento: '1950-01-01', convivenciaMeses: 30, estadoCivilCumple: true },
] as const;
const pncInc = {
  nacimiento: '1980-05-05',
  fechaSolicitud: '2026-03-10',
  residenciaLegalMeses: 120,
  residenciaRecienteMeses: 60,
  gradoDiscapacidad: 80,
  necesitaTerceraPersona: true,
  rentasAnuales: 2000,
};
const pncJub = {
  nacimiento: '1955-03-03',
  fechaSolicitud: '2026-03-10',
  residenciaLegalMeses: 240,
  residenciaRecienteMeses: 60,
  rentasAnuales: 0,
};

describe('Equivalencia con los motores (la fachada no cambia ningún resultado)', () => {
  it('jubilación', () => {
    const d = calcularJubilacion(carrera, '1960-01-15', '2026-02-01', 'ordinaria', OPC);
    const r = desenvolver(
      motor.jubilacion({
        carrera,
        nacimiento: '1960-01-15',
        fechaJubilacion: '2026-02-01',
        modalidad: 'ordinaria',
        opciones: OPC,
      }),
    );
    expect(r.detalle).toEqual(d);
    expect(r.prestaciones[0]?.pensionMensual).toBe(d.pensionMensual);
    expect(r.pasos).toEqual([]);
    expect(r.prestaciones[0]?.pasos).toEqual(d.pasos);
  });

  it('incapacidad permanente', () => {
    const d = calcularIncapacidadPermanente(
      carrera,
      '1968-01-20',
      '2026-03-15',
      'total',
      'enfermedad-comun',
      OPC,
    );
    const r = desenvolver(
      motor.incapacidadPermanente({
        carrera,
        nacimiento: '1968-01-20',
        fechaHechoCausante: '2026-03-15',
        grado: 'total',
        origen: 'enfermedad-comun',
        opciones: OPC,
      }),
    );
    expect(r.detalle).toEqual(d);
    expect(r.pensionAnualTotal).toBe(d.pensionAnual);
  });

  it('viudedad, orfandad, favor de familiares y supervivencia conjunta', () => {
    expect(desenvolver(motor.viudedad({ causante, viudos })).detalle).toEqual(
      calcularViudedad(causante, viudos),
    );
    expect(desenvolver(motor.orfandad({ causante, huerfanos })).detalle).toEqual(
      calcularOrfandad(causante, huerfanos),
    );
    expect(desenvolver(motor.favorFamiliares({ causante, familiares })).detalle).toEqual(
      calcularFavorFamiliares(causante, familiares),
    );
    const c = desenvolver(
      motor.supervivencia({ causante, beneficiarios: { viudos, huerfanos, familiares } }),
    );
    expect(c.detalle).toEqual(calcularSupervivencia(causante, { viudos, huerfanos, familiares }));
    expect(c.prestaciones.length).toBe(4);
    expect(c.pensionMensualTotal).toBeCloseTo(
      c.prestaciones.reduce((a, p) => a + p.pensionMensual, 0),
      9,
    );
  });

  it('pensiones no contributivas', () => {
    expect(desenvolver(motor.pncIncapacidad({ solicitante: pncInc })).detalle).toEqual(
      calcularPNCInvalidez(pncInc),
    );
    expect(desenvolver(motor.pncJubilacion({ solicitante: pncJub })).detalle).toEqual(
      calcularPNCJubilacion(pncJub),
    );
    const r = desenvolver(motor.pncIncapacidad({ solicitante: pncInc }));
    expect(r.pensionAnualTotal).toBe(r.detalle.totalAnual);
  });

  it('calcular(entrada) despacha por tipo', () => {
    const entradas: Entrada[] = [
      {
        tipo: 'jubilacion',
        carrera,
        nacimiento: '1960-01-15',
        fechaJubilacion: '2026-02-01',
        modalidad: 'ordinaria',
        opciones: OPC,
      },
      { tipo: 'viudedad', causante, viudos },
      { tipo: 'orfandad', causante, huerfanos },
      { tipo: 'favor-familiares', causante, familiares },
      { tipo: 'pnc-jubilacion', solicitante: pncJub },
      { tipo: 'pnc-incapacidad', solicitante: pncInc },
    ];
    for (const e of entradas) {
      const r = motor.calcular(e);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.tipo).toBe(e.tipo);
    }
  });

  it('MEI y solidaridad', () => {
    const r = motor.cotizacionAdicional({ anio: 2026, retribucionMensual: 6000 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.detalle.cuotaTotal).toBeCloseTo(56.63568, 5);
  });
});

describe('Errores unificados', () => {
  it('NoImplementada, DatoNoDisponible y EntradaInvalida se devuelven, no se lanzan', () => {
    const a = motor.viudedad({
      causante: { ...causante, fechaFallecimiento: '2021-06-01' },
      viudos,
    });
    expect(!a.ok && a.error.codigo).toBe('NoImplementada');
    expect(!a.ok && a.error.regla).toBeDefined();
    const b = motor.pncJubilacion({ solicitante: { ...pncJub, fechaSolicitud: '2027-03-10' } });
    expect(!b.ok && b.error.codigo).toBe('DatoNoDisponible');
    const c = motor.pncJubilacion({ solicitante: { ...pncJub, fechaSolicitud: '1950-03-10' } });
    expect(!c.ok && c.error.codigo).toBe('EntradaInvalida');
    const d = motor.cotizacionAdicional({ anio: 2051, retribucionMensual: 3000 });
    expect(!d.ok && d.error.codigo).toBe('NoImplementada');
  });

  it('desenvolver vuelve a lanzar el error original del motor', () => {
    expect(() =>
      desenvolver(
        motor.pncJubilacion({ solicitante: { ...pncJub, fechaSolicitud: '2027-03-10' } }),
      ),
    ).toThrow(/Dato no disponible/);
  });
});

describe('Configuración de lecturas', () => {
  it('expone el valor efectivo de todas las lecturas y no cambia ningún valor por defecto', () => {
    expect(Object.keys(motor.lecturas).sort()).toEqual(LECTURAS_ABIERTAS.map((l) => l.id).sort());
    for (const l of LECTURAS_ABIERTAS) expect(motor.lecturas[l.id]).toBe(l.porDefecto);
  });

  it('una configuración inválida lanza al crear el motor', () => {
    expect(() =>
      motorDelRepositorio({ lecturas: { 'supervivencia.incrementoFamiliares': 'no' } }),
    ).toThrow(RangeError);
  });

  it('sobrescribe las lecturas de cada motor y la entrada tiene prioridad sobre la configuración', () => {
    const sin = motorDelRepositorio({
      lecturas: { 'supervivencia.incrementoFamiliares': 'sin-incremento' },
    });
    const nieto = [
      {
        parentesco: 'nieto',
        nacimiento: '2016-01-01',
        convivenciaMeses: 36,
        huerfanoDePadreYMadre: true,
      },
    ] as const;
    const porDefecto =
      desenvolver(motor.favorFamiliares({ causante, familiares: nieto })).prestaciones[0]
        ?.pensionMensual ?? 0;
    const cambiada =
      desenvolver(sin.favorFamiliares({ causante, familiares: nieto })).prestaciones[0]
        ?.pensionMensual ?? 0;
    expect(cambiada).toBeLessThan(porDefecto);
    const priorEntrada = desenvolver(
      sin.favorFamiliares({
        causante,
        familiares: nieto,
        opciones: { lecturasSupervivencia: { incrementoFamiliares: 'porcentaje-viudedad' } },
      }),
    ).prestaciones[0]?.pensionMensual;
    expect(priorEntrada).toBeCloseTo(porDefecto, 9);

    const pnc = motorDelRepositorio({
      lecturas: { 'no-contributivas.limiteConTerceraPersona': 'sin-complemento' },
    });
    const unidad = { unidadEconomica: { convivientes: 2, rentasUnidadAnuales: 20000 } };
    expect(
      desenvolver(motor.pncIncapacidad({ solicitante: pncInc, opciones: unidad })).detalle
        .cumpleRequisitos,
    ).toBe(true);
    expect(
      desenvolver(pnc.pncIncapacidad({ solicitante: pncInc, opciones: unidad })).detalle
        .cumpleRequisitos,
    ).toBe(false);

    const mei = motorDelRepositorio({ lecturas: { 'mei.baseMEI': 'retribucion-completa' } });
    const a = motor.cotizacionAdicional({ anio: 2026, retribucionMensual: 6000 });
    const b = mei.cotizacionAdicional({ anio: 2026, retribucionMensual: 6000 });
    expect(a.ok && b.ok && b.detalle.mei.cuotaTotal > a.detalle.mei.cuotaTotal).toBe(true);

    const inc = motorDelRepositorio({
      lecturas: { 'incapacidad.computoFiccion': 'anios-completos' },
    });
    const e = {
      carrera,
      nacimiento: '1968-01-20',
      fechaHechoCausante: '2026-03-15',
      grado: 'total',
      origen: 'enfermedad-comun',
      opciones: { ...OPC, aplicarMinimos: false },
    } as const;
    expect(desenvolver(inc.incapacidadPermanente(e)).pensionMensualTotal).toBeLessThan(
      desenvolver(motor.incapacidadPermanente(e)).pensionMensualTotal,
    );

    const jub = motorDelRepositorio({
      lecturas: { 'jubilacion.interpolacionIPC': 'escalon-anual' },
    });
    const j = {
      carrera,
      nacimiento: '1958-01-15',
      fechaJubilacion: '2026-02-01',
      modalidad: 'ordinaria',
      opciones: { ...OPC, aplicarMinimos: false },
    } as const;
    expect(desenvolver(jub.jubilacion(j)).pensionMensualTotal).not.toBe(
      desenvolver(motor.jubilacion(j)).pensionMensualTotal,
    );
  });

  it('el escenario de la configuración se usa si la entrada no trae uno', () => {
    const conEscenario = motorDelRepositorio({ escenario: { ipc: 0.02 } });
    const e = {
      carrera,
      nacimiento: '1958-01-15',
      fechaJubilacion: '2026-02-01',
      modalidad: 'ordinaria',
    } as const;
    expect(conEscenario.jubilacion(e).ok).toBe(true);
    expect(desenvolver(conEscenario.jubilacion(e)).pensionMensualTotal).toBeCloseTo(
      desenvolver(motor.jubilacion({ ...e, opciones: OPC })).pensionMensualTotal,
      9,
    );
  });
});
