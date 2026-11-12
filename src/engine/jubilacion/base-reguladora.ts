/**
 * Base reguladora de la jubilación (art. 209.1 y DT 8.ª, 40.ª y 4.ª.7 TRLGSS):
 * periodo de cómputo, actualización con el IPC, integración de lagunas y selección de las mejores bases.
 * El cálculo de la ventana es común (`src/engine/comun/base-reguladora.ts`); aquí se construye la
 * regla de la jubilación desde /data.
 */
import {
  basesDeVentana,
  integracionEnDosTramos,
  type EntradaBases,
  type IntegracionLaguna,
} from '../comun/base-reguladora.ts';
import type { Contexto } from './contexto.ts';
import { parametro, ref, valorEn, versionEn } from './parametros.ts';

export interface ReglaBR {
  readonly id: 'general' | 'opcion-25-anos';
  /** Meses de la ventana anterior al mes previo al hecho causante. */
  readonly ventana: number;
  /** Bases de mayor importe que se suman (resto descartado). */
  readonly nBases: number;
  readonly divisor: number;
  /** Año de la versión de lagunas/actualización que rige la regla. */
  readonly anioVersion: number;
  /** Integración reforzada de la DT 41.ª (solo la regla general). */
  readonly integracionReforzada: boolean;
  readonly refs: readonly string[];
}

export interface DetalleBR {
  readonly regla: ReglaBR;
  readonly baseReguladora: number;
  readonly sumaBases: number;
  readonly mesesConBase: number;
  readonly lagunas: number;
  readonly lagunasIntegradasAlCien: number;
  readonly refs: readonly string[];
}

/** Entrada de la base reguladora (común a todas las prestaciones: `src/engine/comun`). */
export type EntradaBR = EntradaBases;

/** Regla general del año: ventana, divisor y número de bases según /data. */
export function reglaGeneral(ctx: Contexto, anio: number, integracionReforzada: boolean): ReglaBR {
  const p = ctx.params;
  const v = valorEn(p.periodoCalculo, anio);
  const d = valorEn(p.divisor, anio);
  // El divisor recoge las pagas: divisor = bases computadas × pagas / 12
  const pagas = parametro(p.reglasBrecha, 'pagas-anuales', 'complemento-brecha-genero-reglas');
  return {
    id: 'general',
    ventana: v.valor,
    nBases: Math.round((d.valor * 12) / pagas),
    divisor: d.valor,
    anioVersion: anio,
    integracionReforzada,
    refs: [v.ref, d.ref],
  };
}

/** Opción de 25 años (DT 4.ª.7), si está disponible para el hecho causante. */
export function reglaOpcion25(
  ctx: Contexto,
  anio: number,
  esUltimoDia2040: boolean,
): ReglaBR | undefined {
  const p = ctx.params;
  if (anio < p.opcion25Aplicable.primero) return undefined;
  const aplicable = valorEn(p.opcion25Aplicable, anio);
  if (aplicable.valor !== 1) return undefined;
  if (esUltimoDia2040 && ctx.lecturas.opcion25EnUltimoDia2040 === 'excluida') return undefined;
  const v = valorEn(p.opcion25Ventana, anio);
  const d = valorEn(p.opcion25Divisor, anio);
  return {
    id: 'opcion-25-anos',
    ventana: v.valor,
    nBases: v.valor, // la DT 4.ª.7 computa todas las bases de la ventana (divisor = ventana × 14/12)
    divisor: d.valor,
    anioVersion: 2023, // «redacción vigente el 1 de enero de 2023»
    integracionReforzada: false,
    refs: [aplicable.ref, v.ref, d.ref],
  };
}

export function calcularBaseReguladora(
  ctx: Contexto,
  entrada: EntradaBR,
  regla: ReglaBR,
  anioHechoCausante: number,
): DetalleBR {
  const p = ctx.params;
  const vLag = versionEn(p.lagunas, regla.anioVersion, 'lagunas-integracion');
  const vAct = versionEn(p.actualizacion, regla.anioVersion, 'actualizacion-bases');
  const refs: string[] = [
    ...regla.refs,
    ref('lagunas-integracion', `${vLag.desde}-tramo1-meses`),
    ref('actualizacion-bases', `${vAct.desde}-meses-nominales`),
  ];
  const general = integracionEnDosTramos(vLag.tramo1Meses, vLag.tramo1Pct, vLag.tramo2Pct, []);
  const LB = 'lagunas-integracion-brecha-genero';
  // Integración reforzada de la DT 41.ª (solo la regla general).
  const integrarLaguna: IntegracionLaguna = (orden) => {
    if (
      !regla.integracionReforzada ||
      orden < parametro(p.lagunasBrecha, '2026-tramo-a-desde-mes', LB)
    )
      return general(orden);
    const aHasta = parametro(p.lagunasBrecha, '2026-tramo-a-hasta-mes', LB);
    const bDesde = parametro(p.lagunasBrecha, '2026-tramo-b-desde-mes', LB);
    const bHasta = parametro(p.lagunasBrecha, '2026-tramo-b-hasta-mes', LB);
    if (orden <= aHasta) {
      return {
        pct: parametro(p.lagunasBrecha, '2026-tramo-a-pct-base-minima', LB),
        refs: [ref(LB, '2026-tramo-a-pct-base-minima')],
      };
    }
    if (orden >= bDesde && orden <= bHasta) {
      return {
        pct: parametro(p.lagunasBrecha, '2026-tramo-b-pct-base-minima', LB),
        refs: [ref(LB, '2026-tramo-b-pct-base-minima')],
      };
    }
    return general(orden);
  };
  const d = basesDeVentana(
    ctx,
    entrada,
    {
      ventana: regla.ventana,
      nBases: regla.nBases,
      divisor: regla.divisor,
      mesesNominales: vAct.mesesNominales,
      mesIndiceReferencia: vAct.mesIndiceReferencia,
      integrarLaguna,
      refs,
    },
    anioHechoCausante,
  );
  return { regla, ...d };
}
