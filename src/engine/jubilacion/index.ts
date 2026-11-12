/**
 * Motor de la pensión de jubilación contributiva (lógica pura, sin React ni DOM).
 * La versión que lee /data del repositorio (Vite o Vitest) está en `repositorio.ts`.
 */
export { calcularJubilacionConParametros, fechaEdadOrdinaria } from './calculo.ts';
export { calcularBaseReguladora, reglaGeneral, reglaOpcion25 } from './base-reguladora.ts';
export { crearContexto, aEurosConstantesDelContexto, type Contexto } from './contexto.ts';
export { DatoNoDisponible, LIMITACIONES, NoImplementada } from './errores.ts';
export { construirParametros, type LeerDatos, type ParametrosJubilacion } from './parametros.ts';
export {
  coeficienteReductor,
  coeficienteSobreLimite,
  mesesPara100,
  porcentajeEscala,
  tramoCotizacion,
  versionEscala,
} from './porcentajes.ts';
export { aEurosConstantesMotor, revalorizarPension, serieRevalorizada } from './revalorizacion.ts';
export { procesarCarrera } from './carrera.ts';
export * from './tipos.ts';
