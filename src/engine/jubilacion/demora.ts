/**
 * Complemento por jubilación demorada (art. 210.2 TRLGSS, Ley 21/2021 y RD 371/2023).
 * Funciones puras: reciben las reglas numéricas de /data/parametros/jubilacion-demora-reglas.
 */
import { parametro, ref } from './parametros.ts';
import type { LecturasAbiertas } from './tipos.ts';

const F = 'jubilacion-demora-reglas';

export interface TiempoDemora {
  /** Meses cotizados entre la edad ordinaria y el hecho causante. */
  readonly meses: number;
  readonly aniosCompletos: number;
  /** Periodo de más de 6 meses y menos de un año computable (desde el segundo año, o el primero según la lectura). */
  readonly fraccionComputable: boolean;
}

export function tiempoDemora(
  reglas: ReadonlyMap<string, number>,
  meses: number,
  lectura: LecturasAbiertas['fraccionDemora'],
): TiempoDemora {
  const aniosCompletos = Math.floor(meses / 12);
  const resto = meses - aniosCompletos * 12;
  const minimaFraccion = parametro(reglas, 'fraccion-minima-meses', F);
  const desde = lectura === 'desde-segundo-anio' ? 2 : 1;
  return {
    meses,
    aniosCompletos,
    fraccionComputable: resto > minimaFraccion && aniosCompletos >= desde,
  };
}

/** Porcentaje adicional del art. 210.2.a): 4 % por año completo y 2 % por la fracción computable. */
export function porcentajeAdicional(reglas: ReadonlyMap<string, number>, t: TiempoDemora): number {
  return (
    parametro(reglas, 'porcentaje-adicional-anual', F) * t.aniosCompletos +
    (t.fraccionComputable ? parametro(reglas, 'porcentaje-adicional-semestre', F) : 0)
  );
}

/** Pago único por año completo de demora (art. 210.2.b): 800 (o 880) × (pensión anual / 500)^(1/1,65). */
export function pagoUnicoPorAnio(
  reglas: ReadonlyMap<string, number>,
  pensionInicialAnual: number,
  mesesCotizadosALaEdadOrdinaria: number,
): number {
  const umbral = parametro(reglas, 'tanto-alzado-umbral-cotizacion-meses', F);
  const numerador = parametro(
    reglas,
    mesesCotizadosALaEdadOrdinaria >= umbral
      ? 'tanto-alzado-base-44-6-o-mas'
      : 'tanto-alzado-base-menos-44-6',
    F,
  );
  const divisor = parametro(reglas, 'tanto-alzado-divisor-pension', F);
  const exponenteInverso = parametro(reglas, 'tanto-alzado-exponente-divisor', F);
  return numerador * Math.pow(pensionInicialAnual / divisor, 1 / exponenteInverso);
}

/** Años de pago único: años completos más la mitad por la fracción computable. */
export function aniosDePagoUnico(reglas: ReadonlyMap<string, number>, t: TiempoDemora): number {
  return (
    t.aniosCompletos +
    (t.fraccionComputable ? parametro(reglas, 'tanto-alzado-factor-semestre', F) : 0)
  );
}

export interface RepartoMixto {
  /** Años cuyo complemento es porcentaje adicional (sin contar semestres). */
  readonly aniosPorcentaje: number;
  /** Años cuyo complemento es pago único. */
  readonly aniosTantoAlzado: number;
  /** Semestre completo: en el tramo 1 va al pago único (×0,5); en el 2, al porcentaje (2 %). */
  readonly semestre: boolean;
  readonly tramo: 1 | 2;
}

/** Opción mixta (art. 3 RD 371/2023, redacción desde 28/08/2026). `undefined` si no se puede optar. */
export function repartoMixto(
  reglas: ReadonlyMap<string, number>,
  mesesDemora: number,
): RepartoMixto | undefined {
  // «Se tomarán años y semestres completos»
  const computables = 6 * Math.floor(mesesDemora / 6);
  const minimo = parametro(reglas, 'mixta-minimo-anios', F) * 12;
  if (computables < minimo) return undefined;
  const aniosCompletos = Math.floor(computables / 12);
  const semestre = computables - aniosCompletos * 12 >= 6;
  if (computables <= parametro(reglas, 'mixta-tramo1-maximo-meses', F)) {
    const parteEntera = Math.floor(
      aniosCompletos / parametro(reglas, 'mixta-tramo1-divisor-anios', F),
    );
    return {
      aniosPorcentaje: parteEntera,
      aniosTantoAlzado: aniosCompletos - parteEntera,
      semestre,
      tramo: 1,
    };
  }
  const aniosTA = parametro(reglas, 'mixta-tramo2-anios-tanto-alzado', F);
  return {
    aniosPorcentaje: aniosCompletos - aniosTA,
    aniosTantoAlzado: aniosTA,
    semestre,
    tramo: 2,
  };
}

export const REFS_DEMORA = {
  porcentaje: [ref(F, 'porcentaje-adicional-anual'), ref(F, 'porcentaje-adicional-semestre')],
  tantoAlzado: [
    ref(F, 'tanto-alzado-base-menos-44-6'),
    ref(F, 'tanto-alzado-base-44-6-o-mas'),
    ref(F, 'tanto-alzado-divisor-pension'),
    ref(F, 'tanto-alzado-exponente-divisor'),
  ],
  mixta: [
    ref(F, 'mixta-minimo-anios'),
    ref(F, 'mixta-tramo1-maximo-meses'),
    ref(F, 'mixta-tramo2-anios-tanto-alzado'),
  ],
};
