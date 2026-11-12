/**
 * Revalorización de la pensión de incapacidad permanente (art. 58.2 TRLGSS). En la gran incapacidad
 * la pensión y el complemento se revalorizan por separado (norma de revalorización de cada año).
 */
import { crearContexto } from '../jubilacion/contexto.ts';
import { serieRevalorizada } from '../jubilacion/revalorizacion.ts';
import type { ParametrosIncapacidad } from './parametros.ts';
import type { OpcionesIncapacidad, ResultadoIncapacidad } from './tipos.ts';

export interface ImporteIncapacidadRevalorizado {
  readonly anio: number;
  /** Paga mensual sin el complemento de gran incapacidad. */
  readonly pension: number;
  readonly complementoGranIncapacidad: number;
  readonly total: number;
  readonly revalorizacionPct: number;
}

export function revalorizarIncapacidad(
  params: ParametrosIncapacidad,
  resultado: ResultadoIncapacidad,
  anioFinal: number,
  opciones: OpcionesIncapacidad = {},
): ImporteIncapacidadRevalorizado[] {
  const ctx = crearContexto(params, opciones);
  const anio = resultado.anioNormativa;
  const gi = resultado.complementoGranIncapacidad;
  const pension = serieRevalorizada(ctx, resultado.pensionMensual - gi, anio, anioFinal);
  const complemento = serieRevalorizada(ctx, gi, anio, anioFinal);
  return pension.map((p, i) => {
    const c = complemento[i]?.importe ?? 0;
    return {
      anio: p.anio,
      pension: p.importe,
      complementoGranIncapacidad: c,
      total: p.importe + c,
      revalorizacionPct: p.revalorizacionPct,
    };
  });
}
