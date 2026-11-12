/**
 * Motor de la pensión de incapacidad permanente contributiva (lógica pura, sin React ni DOM).
 * La versión que lee /data del repositorio (Vite o Vitest) está en `repositorio.ts`.
 */
export { calcularIncapacidadPermanenteConParametros, desdeMotor } from './calculo.ts';
export { LIMITACIONES_INCAPACIDAD } from './limitaciones.ts';
export {
  construirParametrosIncapacidad,
  reglaGranIncapacidadDelAnio,
  reglaIP,
  type ParametrosIncapacidad,
} from './parametros.ts';
export { revalorizarIncapacidad, type ImporteIncapacidadRevalorizado } from './revalorizacion.ts';
export { DatoNoDisponible, NoImplementada } from '../jubilacion/errores.ts';
export * from './tipos.ts';
