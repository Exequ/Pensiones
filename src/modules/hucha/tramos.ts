import type { PuntoAnual } from '../../engine/series-historicas';

/** «Liquidación (2010-2016)»: etiqueta de un tramo con los años que cubre, tomados de sus datos. */
export function etiquetaTramo(prefijo: string, puntos: readonly PuntoAnual[]): string {
  const primero = puntos[0];
  const ultimo = puntos.at(-1);
  if (!primero || !ultimo) throw new RangeError(`El tramo «${prefijo}» no tiene puntos`);
  return primero.anio === ultimo.anio
    ? `${prefijo} (${primero.anio})`
    : `${prefijo} (${primero.anio}-${ultimo.anio})`;
}
