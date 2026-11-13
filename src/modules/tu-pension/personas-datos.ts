/** Personas-ejemplo leídas de /data con Vite (importación de JSON). */
import personas from '../../../data/ejemplos/personas.json';
import { ArchivoPersonas } from '../../engine/esquema-datos';

export function personasDeRepositorio() {
  return ArchivoPersonas.parse(personas);
}
