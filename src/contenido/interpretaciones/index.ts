/**
 * Registros de las cajas «Interpretación» (fase RI, `docs/INTERPRETACIONES.md`): un JSON por
 * interpretación en esta carpeta, con el nombre de su `id`. Se validan con el esquema al cargarlos y
 * con las reglas de `scripts/lib/interpretaciones.ts` en `npm run lint`. Hoy solo hay dos registros
 * de ejemplo (`ejemplo: true`), que solo pueden usarse en /diseno y no se listan en ningún sitio.
 */
import { Interpretacion } from '../../engine/interpretaciones';

const FICHEROS = import.meta.glob<unknown>('./*.json', { eager: true, import: 'default' });

export const INTERPRETACIONES: readonly Interpretacion[] = Object.entries(FICHEROS)
  .map(([fichero, json]) => {
    const r = Interpretacion.parse(json);
    const nombre = /\.\/(.+)\.json$/.exec(fichero)?.[1];
    if (nombre !== r.id) throw new Error(`${fichero}: el id (${r.id}) no coincide con el nombre`);
    return r;
  })
  .sort((a, b) => a.id.localeCompare(b.id));

/** Interpretaciones publicadas (sin los ejemplos): las que lista «Metodología». */
export const INTERPRETACIONES_PUBLICADAS: readonly Interpretacion[] = INTERPRETACIONES.filter(
  (r) => r.ejemplo !== true,
);

export function interpretacionPorId(id: string): Interpretacion {
  const r = INTERPRETACIONES.find((x) => x.id === id);
  if (r === undefined) throw new RangeError(`Interpretación desconocida: ${id}`);
  return r;
}
