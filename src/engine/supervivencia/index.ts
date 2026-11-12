/**
 * Motor de las prestaciones de muerte y supervivencia contributivas (lógica pura, sin React ni
 * DOM). La versión que lee /data del repositorio (Vite o Vitest) está en `repositorio.ts`.
 */
export { calcularSupervivenciaConParametros } from './calculo.ts';
export {
  calcularFavorFamiliaresConParametros,
  calcularOrfandadConParametros,
  calcularViudedadConParametros,
} from './prestaciones.ts';
export { LIMITACIONES_SUPERVIVENCIA } from './limitaciones.ts';
export {
  construirParametrosSupervivencia,
  desdeMotorSupervivencia,
  reglaSV,
  type ParametrosSupervivencia,
} from './parametros.ts';
export { revalorizarSupervivencia } from './revalorizacion.ts';
export { DatoNoDisponible, NoImplementada } from '../jubilacion/errores.ts';
export * from './tipos.ts';
