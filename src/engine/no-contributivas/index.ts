/**
 * Motor de las pensiones no contributivas (lógica pura, sin React ni DOM). La versión que lee
 * /data del repositorio (Vite o Vitest) está en `repositorio.ts`.
 */
export {
  calcularPNCConParametros,
  calcularPNCInvalidezConParametros,
  calcularPNCJubilacionConParametros,
} from './calculo.ts';
export { LIMITACIONES_PNC } from './limitaciones.ts';
export {
  construirParametrosPNC,
  desdeMotorPNC,
  reglaPNC,
  type ParametrosPNC,
} from './parametros.ts';
export { DatoNoDisponible, NoImplementada } from '../jubilacion/errores.ts';
export * from './tipos.ts';
