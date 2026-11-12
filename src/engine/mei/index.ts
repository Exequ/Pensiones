/**
 * Motor del MEI y de la cotización adicional de solidaridad (lógica pura, sin React ni DOM). La
 * versión que lee /data del repositorio (Vite o Vitest) está en `repositorio.ts`.
 */
export { calcularMEI, cotizacionAdicionalMensual, cuotaSolidaridad, tipoMEI } from './calculo.ts';
export { LIMITACIONES_MEI } from './limitaciones.ts';
export { construirParametrosMEI, reglaMEI, type ParametrosMEI } from './parametros.ts';
export { DatoNoDisponible, NoImplementada } from '../jubilacion/errores.ts';
export * from './tipos.ts';
