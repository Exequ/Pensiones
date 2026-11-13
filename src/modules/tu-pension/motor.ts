/**
 * Acceso al motor y a /data desde el navegador. Este módulo (y con él los ficheros de
 * /data/parametros, vía `import.meta.glob` de Vite) solo se carga con la página «Tu pensión»
 * (carga perezosa en `src/modules/paginas.ts`).
 */
import type { ConfiguracionMotor, Motor } from '../../engine/fachada';
import { leerParametroDeRepositorio } from '../../engine/jubilacion/parametros-datos';
import { motorDelRepositorio } from '../../engine/repositorio';

export function crearMotorDelRepositorio(configuracion: ConfiguracionMotor = {}): Motor {
  return motorDelRepositorio(configuracion);
}

/** Valor numérico de `parametros/fichero.json#id` en /data, o `undefined` si no existe. */
export function leerReferenciaDeRepositorio(referencia: string): number | undefined {
  const m = /^parametros\/([a-z0-9-]+)\.json#(.+)$/.exec(referencia);
  if (!m?.[1] || !m[2]) return undefined;
  try {
    const archivo = leerParametroDeRepositorio(m[1]) as {
      data?: readonly { id: string; value: unknown }[];
    };
    const valor = archivo.data?.find((d) => d.id === m[2])?.value;
    return typeof valor === 'number' ? valor : undefined;
  } catch {
    return undefined;
  }
}
