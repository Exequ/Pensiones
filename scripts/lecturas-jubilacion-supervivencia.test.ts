// @vitest-environment node
/**
 * Fase 3-C2: la nota «Qué lecturas de jubilación se aplican aquí» de las pantallas de viudedad y de
 * orfandad lista exactamente las lecturas `jubilacion.*` que cambian el cálculo de supervivencia.
 *
 * El motor de supervivencia lee en su código compartido las siete lecturas de jubilación que también
 * lee la incapacidad, pero dos de ellas no llegan a aplicarse: las bases van por su valor nominal
 * (`actualizar: false`, sin IPC ni factor mínimo) y los meses sin cotizar cuentan como cero (sin
 * integración de lagunas). Este test lo mide con el motor: solo cambian el resultado las tres que
 * fijan los límites (base máxima, pensión máxima y pensión máxima desde 2051).
 */
import { describe, expect, it } from 'vitest';
import { crearMotor } from '../src/engine/fachada.ts';
import { LECTURAS_ABIERTAS } from '../src/engine/lecturas.ts';
import { LECTURAS_JUBILACION_EN_SUPERVIVENCIA } from '../src/modules/tu-pension/lecturas-jubilacion-en-incapacidad.ts';
import { leerParametroDeDisco } from './lib/motor-jubilacion.ts';

const ALTERNATIVA: Record<string, string> = Object.fromEntries(
  LECTURAS_ABIERTAS.filter((l) => l.motor === 'jubilacion').map((l) => [
    l.id,
    l.alternativas.find((a) => a !== l.porDefecto) ?? l.porDefecto,
  ]),
);

/** Pensión mensual de la viuda con la lectura cambiada (y la base reguladora del causante). */
function viudedad(
  anio: number,
  lecturas: Record<string, string>,
  causante:
    | { tipo: 'carrera'; base: number; desde: string }
    | { tipo: 'pensionista'; baseReguladora: number },
): [number, number] {
  const r = crearMotor(leerParametroDeDisco, { lecturas, escenario: { ipc: 0.02 } }).viudedad({
    causante:
      causante.tipo === 'carrera'
        ? {
            fechaFallecimiento: `${anio}-03-01`,
            causa: 'enfermedad-comun',
            situacion: 'alta',
            carrera: [{ desde: causante.desde, hasta: `${anio}-02`, baseMensual: causante.base }],
          }
        : {
            fechaFallecimiento: `${anio}-03-01`,
            causa: 'enfermedad-comun',
            situacion: 'pensionista',
            pension: {
              baseReguladora: causante.baseReguladora,
              fechaHechoCausante: '2024-03-01',
              clase: 'jubilacion',
            },
          },
    viudos: [
      {
        vinculo: 'conyuge',
        nacimiento: '1956-01-01',
        fechaMatrimonio: '1990-01-01',
        otraPensionPublica: false,
      },
    ],
    opciones: { aplicarMinimos: false },
  });
  if (!r.ok) throw r.error.original;
  return [r.detalle.baseReguladora, r.prestaciones[0]?.pensionMensual ?? 0];
}

describe('lecturas de jubilación que rigen en la viudedad y la orfandad', () => {
  it('todas existen en el registro como lecturas de jubilación', () => {
    for (const id of LECTURAS_JUBILACION_EN_SUPERVIVENCIA) {
      expect(LECTURAS_ABIERTAS.find((l) => l.id === id)?.motor, id).toBe('jubilacion');
    }
  });

  it('la base máxima cambia la base reguladora con bases por encima del límite en años futuros', () => {
    const c = { tipo: 'carrera', base: 9000, desde: '2005-01' } as const;
    const [defecto] = viudedad(2045, {}, c);
    const [alternativa] = viudedad(
      2045,
      { 'jubilacion.baseMaxima': ALTERNATIVA['jubilacion.baseMaxima']! },
      c,
    );
    expect(alternativa).not.toBeCloseTo(defecto, 6);
  });

  it('la pensión máxima cambia la pensión cuando se aplica el límite en años futuros', () => {
    const c = { tipo: 'pensionista', baseReguladora: 9000 } as const;
    const [, defecto] = viudedad(2045, {}, c);
    const [, alternativa] = viudedad(
      2045,
      { 'jubilacion.pensionMaxima': ALTERNATIVA['jubilacion.pensionMaxima']! },
      c,
    );
    expect(alternativa).not.toBeCloseTo(defecto, 6);
  });

  it('la pensión máxima desde 2051 cambia la pensión limitada a partir de ese año', () => {
    const c = { tipo: 'pensionista', baseReguladora: 20000 } as const;
    const [, defecto] = viudedad(2058, {}, c);
    const [, alternativa] = viudedad(
      2058,
      { 'jubilacion.maximaDesde2051': ALTERNATIVA['jubilacion.maximaDesde2051']! },
      c,
    );
    expect(alternativa).not.toBeCloseTo(defecto, 6);
  });

  it('las demás lecturas de jubilación no cambian el cálculo de supervivencia (IPC, factor mínimo, lagunas, demora…)', () => {
    // Dos hechos causantes con carreras largas: la actualización con el IPC y el relleno de lagunas no se aplican.
    const escenarios = [
      { anio: 2026, c: { tipo: 'carrera', base: 2000, desde: '2000-01' } },
      { anio: 2030, c: { tipo: 'carrera', base: 2500, desde: '2015-01' } },
    ] as const;
    const usadas = new Set(LECTURAS_JUBILACION_EN_SUPERVIVENCIA);
    const otras = Object.keys(ALTERNATIVA).filter((id) => !usadas.has(id));
    expect(otras.length).toBeGreaterThanOrEqual(7);
    for (const { anio, c } of escenarios) {
      const defecto = viudedad(anio, {}, c);
      for (const id of otras) {
        expect(viudedad(anio, { [id]: ALTERNATIVA[id]! }, c), `${id} en ${String(anio)}`).toEqual(
          defecto,
        );
      }
    }
  });
});
