/**
 * Punto de entrada del cálculo del simulador (formulario → resultado). La orquestación común está
 * en `receta.ts` y las prestaciones en `prestaciones.ts` (véase docs/SIMULADOR.md, Fase 3-C1).
 */
export type { Dependencias, RespuestaCalculo } from './receta';
export { calcularTuPension } from './prestaciones';
