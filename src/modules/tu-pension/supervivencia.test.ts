/**
 * Casos de la viudedad y la orfandad de «Tu pensión» (Fase 3-C2), de formulario a resultado, con el
 * resultado esperado calculado a mano (la operación está en el comentario de cada caso).
 *
 * Cifras de /data de 2026 que usan las cuentas (las mismas que fija el encabezado de
 * `src/engine/supervivencia/casos-oro-supervivencia.test.ts`): cuantías mínimas anuales de viudedad
 * con menos de 60 años 9.931,60, con 65 años 13.106,80 y con cargas familiares 17.592,40; orfandad
 * 4.011,00; límite de ingresos 9.442; 14 pagas. Carrera simple de 2.000 euros desde enero de 2010
 * hasta febrero de 2026: base reguladora 24 × 2.000 / 28 = 1.714,2857 euros al mes.
 */
import { describe, expect, it } from 'vitest';
import { formatearEuros } from '../../engine/formato';
import { calcularTuPension, type Dependencias } from './calcular';
import { crearMotorDelRepositorio, leerReferenciaDeRepositorio } from './motor';
import { FORMULARIO_ORFANDAD, FORMULARIO_VIUDEDAD } from './pruebas';
import { catalogoPorDefecto } from './referencias-datos';
import { lecturasQueIntervienenSupervivencia } from './intervienen';
import {
  HUERFANO_VACIO,
  VIUDO_VACIO,
  nuevoHuerfano,
  type FormularioHuerfano,
  type FormularioViudo,
} from './supervivencia-tipos';
import type { FormularioTuPension } from './tipos';

const deps: Dependencias = {
  fabricaMotor: crearMotorDelRepositorio,
  leerReferencia: leerReferenciaDeRepositorio,
  catalogo: catalogoPorDefecto(),
};

const euros = (v: number): string => formatearEuros(v, { decimales: 2 });
const NBSP = '\u00a0';
const porcentaje = (v: number): string => `${v.toFixed(2).replace('.', ',')}${NBSP}%`;

function resultado(f: FormularioTuPension) {
  const r = calcularTuPension(f, deps);
  if (r.tipo !== 'resultado') throw new Error(`no es un resultado: ${JSON.stringify(r)}`);
  return r;
}
const cifra = (r: ReturnType<typeof resultado>, etiqueta: string): string | undefined =>
  r.modelo.cifras.find((c) => c.etiqueta.startsWith(etiqueta))?.valor;
const pension = (r: ReturnType<typeof resultado>) => cifra(r, 'Pensión mensual bruta');

const conViudo = (
  f: FormularioTuPension,
  viudo: Partial<FormularioViudo>,
  resto: Partial<FormularioTuPension> = {},
): FormularioTuPension => ({
  ...f,
  ...resto,
  supervivencia: { ...f.supervivencia, viudo: { ...f.supervivencia.viudo, ...viudo } },
});
const conHuerfano = (
  f: FormularioTuPension,
  huerfano: Partial<FormularioHuerfano>,
): FormularioTuPension => ({
  ...f,
  supervivencia: { ...f.supervivencia, huerfano: { ...f.supervivencia.huerfano, ...huerfano } },
});
const sinMinimos = (f: FormularioTuPension): FormularioTuPension => ({
  ...f,
  aplicarMinimos: false,
});
const menor = (anio: string): FormularioHuerfano => ({
  ...nuevoHuerfano(),
  nacimientoMes: '6',
  nacimientoAnio: anio,
});

describe('viudedad: casos con el resultado calculado a mano', () => {
  it('cónyuge de 49 años: 52 % de la base reguladora', () => {
    // BR = 24 × 2.000 / 28 = 1.714,2857. 52 % → 891,4286 = 891,43. La mínima con menos de 60 años,
    // 9.931,60 / 14 = 709,40, es menor: no hay complemento.
    const r = resultado(FORMULARIO_VIUDEDAD);
    expect(r.prestacion).toBe('viudedad');
    expect(r.modelo.cumpleRequisitos).toBe(true);
    expect(pension(r)).toBe(euros(891.43));
    expect(cifra(r, 'Porcentaje aplicado')).toBe(porcentaje(52));
    expect(cifra(r, 'Base reguladora')).toBe(`${euros(1714.29)} al mes`);
    expect(cifra(r, 'Pensión anual')).toBe(euros(12480));
    expect(r.bases).toBeUndefined();
  });

  it('cónyuge de 70 años sin otras rentas: 60 % de la base reguladora', () => {
    // 70 años, sin otra pensión ni rentas del trabajo: 60 % × 1.714,2857 = 1.028,5714 = 1.028,57,
    // mayor que el 52 % (891,43) y que la mínima con 65 años, 13.106,80 / 14 = 936,20.
    const r = resultado(
      conViudo(FORMULARIO_VIUDEDAD, { nacimientoMes: '1', nacimientoAnio: '1956' }),
    );
    expect(pension(r)).toBe(euros(1028.57));
    expect(cifra(r, 'Porcentaje aplicado')).toBe(porcentaje(60));
    expect(r.modelo.pasos.find((p) => p.id === 'porcentaje')?.parrafos.join(' ')).toMatch(
      /60,00\s%/,
    );
  });

  it('cargas familiares: 70 % con complemento a mínimos', () => {
    // Cargas: 10.000 / 3 = 3.333 ≤ 75 % × (17.094 − 2 × 1.221) = 10.989; sin rentas propias; límite
    // 9.442 + 9.931,60 = 19.373,60 ≥ 70 % × 14 × ... : 70 % × 1.714,2857 = 1.200,00 (× 14 = 16.800).
    // Mínima con cargas 17.592,40 / 14 = 1.256,60 → complemento 1.256,60 − 1.200,00 = 56,60.
    const r = resultado(
      conViudo(FORMULARIO_VIUDEDAD, {
        nacimientoMes: '1',
        nacimientoAnio: '1981',
        cargas: true,
        miembros: '3',
        rendimientosUnidad: '10000',
      }),
    );
    expect(pension(r)).toBe(euros(1256.6));
    expect(cifra(r, 'Pensión contributiva')).toBe(`${euros(1200)} al mes`);
    expect(cifra(r, 'Complemento a mínimos')).toBe(`${euros(56.6)} al mes`);
    expect(r.modelo.estado).toBe('minima');
  });

  it('matrimonio de seis meses con enfermedad anterior: prestación temporal', () => {
    // Matrimonio en septiembre de 2025 (6 meses antes de marzo de 2026), enfermedad anterior al vínculo,
    // sin hijos ni convivencia previa: prestación temporal de 24 meses, de 52 % × 1.714,2857 = 891,43.
    const r = resultado(
      conViudo(FORMULARIO_VIUDEDAD, {
        matrimonioMes: '9',
        matrimonioAnio: '2025',
        enfermedadAnterior: true,
      }),
    );
    expect(cifra(r, 'Prestación temporal mensual bruta')).toBe(euros(891.43));
    expect(cifra(r, 'Duración de la prestación temporal')).toBe('2 años');
    expect(r.modelo.textoEstado).toMatch(/temporal/i);
  });

  it('excónyuge con pensión compensatoria: la viudedad no supera la compensatoria (anual o mensual)', () => {
    // Compensatoria de 6.000 al año. Anual: 6.000 / 14 pagas = 428,57 < 891,43. Mensual: 6.000 / 12 =
    // 500,00. Sin complemento a mínimos para aislar el límite.
    const f = sinMinimos(
      conViudo(FORMULARIO_VIUDEDAD, { vinculo: 'excónyuge', compensatoriaAnual: '6000' }),
    );
    expect(pension(resultado(f))).toBe(euros(428.57));
    const mensual = resultado({
      ...f,
      lecturas: { 'supervivencia.comparacionCompensatoria': 'mensual' },
    });
    expect(pension(mensual)).toBe(euros(500));
    // La lectura aparece entre las que intervienen, con su estado y el efecto de la alternativa.
    const base = resultado(f);
    const visibles = lecturasQueIntervienenSupervivencia(base.lecturas);
    expect(visibles.map((l) => l.id)).toContain('supervivencia.comparacionCompensatoria');
    const l = visibles.find((x) => x.id === 'supervivencia.comparacionCompensatoria');
    expect(l?.efecto).toMatch(/500,00/);
  });

  it('causante pensionista: base reguladora de su pensión revalorizada', () => {
    // Pensión de jubilación de marzo de 2023 con base 2.500, revalorizaciones de 2024, 2025 y 2026
    // (3,8 %, 2,8 % y 2,7 %): 2.500 × 1,038 × 1,028 × 1,027 = 2.739,69. Viuda de 70 años al 60 %:
    // 0,6 × 2.739,6868 = 1.643,81.
    const f = conViudo(
      {
        ...FORMULARIO_VIUDEDAD,
        baseReguladora: '2500',
        supervivencia: {
          ...FORMULARIO_VIUDEDAD.supervivencia,
          situacion: 'pensionista',
          clasePension: 'jubilacion',
          pensionMes: '3',
          pensionAnio: '2023',
        },
      },
      { nacimientoMes: '1', nacimientoAnio: '1956' },
    );
    const r = resultado(f);
    expect(pension(r)).toBe(euros(1643.81));
    expect(cifra(r, 'Base reguladora')).toBe(`${euros(2739.69)} al mes`);
    expect(r.modelo.pasos.find((p) => p.id === 'base')?.parrafos.join(' ')).toMatch(
      /pensión de la persona fallecida/,
    );
  });

  it('accidente de trabajo: la base reguladora es la que escribe la persona', () => {
    // Base reguladora escrita: 3.000. 52 % × 3.000 = 1.560,00 (menor que la pensión máxima).
    const r = resultado({
      ...FORMULARIO_VIUDEDAD,
      origen: 'accidente-trabajo',
      baseReguladora: '3000',
    });
    expect(pension(r)).toBe(euros(1560));
    expect(cifra(r, 'Base reguladora')).toBe(`${euros(3000)} al mes`);
    expect(r.modelo.pasos.find((p) => p.id === 'base')?.parrafos.join(' ')).toMatch(
      /Este simulador no la calcula/,
    );
  });

  it('con hijos con derecho a orfandad: reparto y límite conjunto (excepción con el 70 %)', () => {
    // Viudedad del 70 % (1.200,00) y tres huérfanos menores al 20 % (342,8571 cada uno): suma
    // 1.200 + 1.028,5714 = 2.228,5714 > BR 1.714,2857. Como la viudedad supera el 52 % y hay más de una
    // orfandad, estas bajan hasta el 48 % de la BR (822,8571 en total, 274,2857 = 274,29 cada una); la
    // viudedad se mantiene (sin mínimos para aislar el límite).
    const f = sinMinimos({
      ...FORMULARIO_VIUDEDAD,
      supervivencia: {
        ...FORMULARIO_VIUDEDAD.supervivencia,
        viudo: {
          ...FORMULARIO_VIUDEDAD.supervivencia.viudo,
          nacimientoMes: '1',
          nacimientoAnio: '1981',
          cargas: true,
          miembros: '4',
          rendimientosUnidad: '10000',
        },
        otrosHuerfanos: [menor('2012'), menor('2014'), menor('2016')],
      },
    });
    const r = resultado(f);
    expect(pension(r)).toBe(euros(1200));
    const reparto = r.modelo.reparto;
    expect(reparto?.filas.map((x) => x.beneficiario)).toEqual([
      'Tu viudedad',
      'Orfandad de un hijo del causante (n.º 1)',
      'Orfandad de un hijo del causante (n.º 2)',
      'Orfandad de un hijo del causante (n.º 3)',
    ]);
    expect(reparto?.filas.slice(1).map((x) => x.pension)).toEqual(
      Array(3).fill(`${euros(274.29)} al mes`),
    );
    expect(r.modelo.pasos.find((p) => p.id === 'limites')?.parrafos.join(' ')).toMatch(
      /excepción de la norma/,
    );
  });

  it('con hijo con derecho a orfandad en un caso sin exceso de límite: se muestra el reparto', () => {
    // 52 % = 891,43 y una orfandad del 20 % = 342,86: suma 1.234,29 < 1.714,29 (no hay límite).
    const f: FormularioTuPension = {
      ...FORMULARIO_VIUDEDAD,
      supervivencia: { ...FORMULARIO_VIUDEDAD.supervivencia, otrosHuerfanos: [menor('2014')] },
    };
    const r = resultado(f);
    expect(pension(r)).toBe(euros(891.43));
    expect(r.modelo.reparto?.filas.map((x) => x.pension)).toEqual([
      `${euros(891.43)} al mes`,
      `${euros(342.86)} al mes`,
    ]);
  });
});

describe('orfandad: casos con el resultado calculado a mano', () => {
  it('huérfano de 10 años: 20 % de la base reguladora', () => {
    // 20 % × 1.714,2857 = 342,8571 = 342,86 (> mínima de la orfandad, 4.011 / 14 = 286,50).
    const r = resultado(FORMULARIO_ORFANDAD);
    expect(r.prestacion).toBe('orfandad');
    expect(pension(r)).toBe(euros(342.86));
    expect(cifra(r, 'Porcentaje aplicado')).toBe(porcentaje(20));
    expect(r.modelo.reparto).toBeUndefined();
  });

  it('orfandad absoluta: se suma el 52 % repartido entre los huérfanos con derecho', () => {
    // Un solo huérfano y ningún progenitor vivo: 20 % + 52 % = 72 % × 1.714,2857 = 1.234,2857 = 1.234,29.
    const f: FormularioTuPension = {
      ...FORMULARIO_ORFANDAD,
      supervivencia: { ...FORMULARIO_ORFANDAD.supervivencia, orfandadAbsoluta: true },
    };
    const r = resultado(f);
    expect(pension(r)).toBe(euros(1234.29));
    expect(cifra(r, 'Porcentaje aplicado')).toBe(porcentaje(72));
    expect(r.modelo.pasos.find((p) => p.id === 'porcentaje')?.parrafos.join(' ')).toMatch(
      /Orfandad absoluta/,
    );
  });

  it('con una viuda con cargas y tres huérfanos: la orfandad baja al 16 % por el límite conjunto', () => {
    // Viudedad 70 % = 1.200 y 3 huérfanos al 20 % = 1.028,57: suma 2.228,57 > 1.714,29. Excepción del
    // art. 229.3: las orfandades bajan al 48 % en conjunto, 16 % cada una = 0,16 × 1.714,2857 = 274,2857.
    const f = sinMinimos({
      ...FORMULARIO_ORFANDAD,
      supervivencia: {
        ...FORMULARIO_ORFANDAD.supervivencia,
        hayViudo: true,
        viudo: {
          ...VIUDO_VACIO,
          vinculo: 'conyuge',
          nacimientoMes: '1',
          nacimientoAnio: '1981',
          sexo: 'mujer',
          matrimonioMes: '6',
          matrimonioAnio: '2005',
          cargas: true,
          miembros: '4',
          rendimientosUnidad: '10000',
        },
        otrosHuerfanos: [menor('2012'), menor('2014')],
      },
    });
    const r = resultado(f);
    expect(pension(r)).toBe(euros(274.29));
    expect(cifra(r, 'Porcentaje aplicado')).toBe(porcentaje(16));
    expect(r.modelo.reparto?.filas.map((x) => x.beneficiario)).toEqual([
      'Viudedad del cónyuge o pareja superviviente',
      'Tu orfandad',
      'Orfandad de otro huérfano (n.º 1)',
      'Orfandad de otro huérfano (n.º 2)',
    ]);
    expect(r.modelo.reparto?.filas[0]?.pension).toBe(`${euros(1200)} al mes`);
    // Con la excepción del art. 229.3 la otra lectura (reducción proporcional) da lo mismo: no interviene.
    const ids = lecturasQueIntervienenSupervivencia(r.lecturas).map((l) => l.id);
    expect(ids).not.toContain('supervivencia.reduccionLimiteConjunto');
  });

  it('límite conjunto sin excepción: la lectura de qué pensiones se reducen interviene', () => {
    // Viudedad 52 % = 891,4286 y 3 huérfanos al 20 % = 1.028,5714: suma 1.920,00 > 1.714,2857. Por defecto
    // se reducen las orfandades: hueco 1.714,2857 − 891,4286 = 822,8571 / 3 = 274,2857 = 274,29 cada una.
    // Con la reducción proporcional: factor 1.714,2857 / 1.920 = 0,892857; orfandad 342,8571 × 0,892857 =
    // 306,1224 = 306,12.
    const f = sinMinimos({
      ...FORMULARIO_ORFANDAD,
      supervivencia: {
        ...FORMULARIO_ORFANDAD.supervivencia,
        hayViudo: true,
        viudo: {
          ...VIUDO_VACIO,
          vinculo: 'conyuge',
          nacimientoMes: '5',
          nacimientoAnio: '1976',
          sexo: 'mujer',
          matrimonioMes: '6',
          matrimonioAnio: '2005',
        },
        otrosHuerfanos: [menor('2012'), menor('2014')],
      },
    });
    const r = resultado(f);
    expect(pension(r)).toBe(euros(274.29));
    const l = lecturasQueIntervienenSupervivencia(r.lecturas).find(
      (x) => x.id === 'supervivencia.reduccionLimiteConjunto',
    );
    expect(l).toBeDefined();
    expect(l?.efecto).toMatch(/306,12/);
    const alternativa = resultado({
      ...f,
      lecturas: { 'supervivencia.reduccionLimiteConjunto': 'proporcional' },
    });
    expect(pension(alternativa)).toBe(euros(306.12));
  });

  it('huérfano incapacitado de 36 años: conserva el derecho; sin incapacidad, no', () => {
    // La incapacidad para el trabajo elimina el límite de edad: 20 % × 1.714,2857 = 342,86.
    const incapacitado = conHuerfano(FORMULARIO_ORFANDAD, {
      nacimientoMes: '4',
      nacimientoAnio: '1990',
      incapacitado: true,
    });
    expect(pension(resultado(incapacitado))).toBe(euros(342.86));
    // Sin incapacidad, con 36 años no se cumple el requisito de edad: sin pensión.
    const sin = resultado(conHuerfano(incapacitado, { incapacitado: false }));
    expect(sin.modelo.cumpleRequisitos).toBe(false);
    expect(pension(sin)).toBeUndefined();
    expect(sin.modelo.requisitos.some((q) => !q.cumple)).toBe(true);
  });

  it('con mínimos: la orfandad baja al límite y se completa hasta la mínima', () => {
    // Con el 16 % por el límite conjunto (274,29) y mínimos: mínima 4.011 / 14 = 286,50 → complemento
    // 286,50 − 274,2857 = 12,21.
    const f: FormularioTuPension = {
      ...FORMULARIO_ORFANDAD,
      supervivencia: {
        ...FORMULARIO_ORFANDAD.supervivencia,
        hayViudo: true,
        viudo: {
          ...VIUDO_VACIO,
          vinculo: 'conyuge',
          nacimientoMes: '1',
          nacimientoAnio: '1981',
          sexo: 'mujer',
          matrimonioMes: '6',
          matrimonioAnio: '2005',
          cargas: true,
          miembros: '4',
          rendimientosUnidad: '10000',
        },
        otrosHuerfanos: [menor('2012'), menor('2014')],
      },
    };
    const r = resultado(f);
    expect(pension(r)).toBe(euros(286.5));
    expect(cifra(r, 'Complemento a mínimos')).toBe(`${euros(12.21)} al mes`);
  });
});

describe('valores iniciales de los huérfanos y de la persona viuda', () => {
  it('el huérfano de las pruebas parte de los valores vacíos', () => {
    expect(HUERFANO_VACIO.incapacitado).toBe(false);
    expect(VIUDO_VACIO.vinculo).toBe('');
  });
});
