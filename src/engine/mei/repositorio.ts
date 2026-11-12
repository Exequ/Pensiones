/** Motor del MEI con los parámetros de /data del repositorio (solo Vite o Vitest). */
import { calcularMEI, cotizacionAdicionalMensual, cuotaSolidaridad, tipoMEI } from './calculo.ts';
import { parametrosMEIDelRepositorio } from './parametros-datos.ts';
import type {
  ContingenciaMEI,
  CotizacionAdicional,
  CuotaMEI,
  CuotaSolidaridad,
  OpcionesMEI,
  TipoMEI,
} from './tipos.ts';

const p = parametrosMEIDelRepositorio;

export const tipoMEIDelAnio = (anio: number, contingencia: ContingenciaMEI = 'comunes'): TipoMEI =>
  tipoMEI(p(), anio, contingencia);
export const calcularMEIDelAnio = (
  anio: number,
  base: number,
  contingencia: ContingenciaMEI = 'comunes',
): CuotaMEI => calcularMEI(p(), anio, base, contingencia);
export const cuotaSolidaridadDelAnio = (
  anio: number,
  retribucion: number,
  opciones: OpcionesMEI = {},
): CuotaSolidaridad => cuotaSolidaridad(p(), anio, retribucion, opciones);
export const cotizacionAdicionalDelAnio = (
  anio: number,
  retribucion: number,
  opciones: OpcionesMEI = {},
): CotizacionAdicional => cotizacionAdicionalMensual(p(), anio, retribucion, opciones);
