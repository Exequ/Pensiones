/** Fachada del motor con los parámetros de /data del repositorio (solo Vite o Vitest). */
import { crearMotor, type ConfiguracionMotor, type Motor } from './fachada.ts';
import { leerParametroDeRepositorio } from './jubilacion/parametros-datos.ts';

export function motorDelRepositorio(configuracion: ConfiguracionMotor = {}): Motor {
  return crearMotor(leerParametroDeRepositorio, configuracion);
}
