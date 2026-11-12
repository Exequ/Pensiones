/**
 * Motor de pensiones: fachada única (lógica pura, sin React ni DOM).
 *
 * - `crearMotor(leer, configuracion)`: una función de entrada por tipo de prestación y una
 *   `calcular(entrada)` que despacha por tipo; entradas, salidas y errores unificados.
 * - `LECTURAS_ABIERTAS`: registro único de las lecturas abiertas de todos los motores.
 * - La versión que lee /data del repositorio (Vite o Vitest) está en `repositorio.ts`.
 *
 * Los motores concretos siguen disponibles en sus carpetas (`jubilacion/`, `incapacidad/`,
 * `supervivencia/`, `no-contributivas/` y `mei/`).
 */
export * from './fachada.ts';
export {
  LECTURAS_ABIERTAS,
  erroresConfiguracion,
  lecturaPorId,
  lecturasDelMotor,
  resolverLecturas,
  valoresPorDefecto,
  type ConfiguracionLecturas,
  type LecturaAbierta,
  type MotorLectura,
} from './lecturas.ts';
export { DatoNoDisponible, NoImplementada } from './jubilacion/errores.ts';
export type { LeerDatos } from './jubilacion/parametros.ts';
export { LIMITACIONES_MOTOR } from './limitaciones.ts';
