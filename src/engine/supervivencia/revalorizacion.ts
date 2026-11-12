/**
 * Revalorización de las pensiones de muerte y supervivencia (art. 58.2 TRLGSS). El límite conjunto
 * del art. 229 solo se aplica a las cuantías iniciales (no a las revalorizaciones).
 */
import { crearContexto } from '../jubilacion/contexto.ts';
import { serieRevalorizada, type ImporteRevalorizado } from '../jubilacion/revalorizacion.ts';
import type { ParametrosSupervivencia } from './parametros.ts';
import type { OpcionesSupervivencia, ResultadoPrestacion } from './tipos.ts';

export function revalorizarSupervivencia(
  params: ParametrosSupervivencia,
  prestacion: ResultadoPrestacion,
  anioHechoCausante: number,
  anioFinal: number,
  opciones: OpcionesSupervivencia = {},
): ImporteRevalorizado[] {
  return serieRevalorizada(
    crearContexto(params, opciones),
    prestacion.pensionMensual,
    anioHechoCausante,
    anioFinal,
  );
}
