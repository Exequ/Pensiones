/**
 * Definiciones reutilizables (fase R7): qué cuenta como «gasto en pensiones», qué significa
 * «déficit» y otras magnitudes que varias páginas necesitan explicar con las mismas palabras.
 *
 * Lógica pura, sin React ni DOM. Los registros están en `src/contenido/definiciones/<id>.json` (un
 * fichero por definición, con el nombre de su `id`) y los pinta el componente `DefinitionById`.
 * Ninguna definición lleva cifras escritas a mano: las cifras, cuando se muestran, salen de los datos
 * a los que remite (`datos`), y las fórmulas solo usan símbolos (las comprueba `comprobarFormula`).
 */
import { z } from 'zod';
import { FormulaEstructurada, PATRON_ID } from './esquema-datos.ts';

/** Grupo de la definición: para listarlas y para ampliar el módulo sin tocar las páginas. */
export const GRUPOS_DEFINICION = [
  'gasto-en-pensiones',
  'deficit',
  'contabilidad',
  'fondo-de-reserva',
] as const;
export type GrupoDefinicion = (typeof GRUPOS_DEFINICION)[number];

/**
 * Referencia a lo que sostiene la definición: un fichero de `/data` («carpeta/fichero.json») o un
 * dato o una serie suya («carpeta/fichero.json#id»). Las comprueba `scripts/definiciones.test.ts`.
 */
export const PATRON_REF_DEFINICION =
  /^[a-z0-9-]+\/[a-z0-9-]+\.json(?:#[a-z0-9]+(?:[-_.][a-z0-9]+)*)?$/;

const Texto = z.string().trim().min(1);

export const Definicion = z.strictObject({
  /** Identificador estable: no cambia aunque cambie el texto (otras páginas lo usan). */
  id: z.string().regex(PATRON_ID, { error: 'id con formato no válido' }),
  grupo: z.enum(GRUPOS_DEFINICION),
  /** Término que se define (lo que se lee en el encabezado del bloque). */
  termino: Texto,
  /** Párrafos de la explicación, con palabras propias: sin cifras, sin citas ni valoraciones. */
  texto: z.array(Texto).min(1),
  /** Qué incluye y qué no incluye la medida, y lo que las fuentes consultadas no detallan. */
  perimetro: z
    .strictObject({
      incluye: z.array(Texto),
      noIncluye: z.array(Texto),
      sinDetalle: Texto.optional(),
    })
    .optional(),
  /** Criterio contable o de medida (contabilidad presupuestaria, nacional, proyección…). */
  criterio: Texto.optional(),
  /** Datos que la sostienen; su fuente se abre en «Fuentes». */
  datos: z
    .array(z.string().regex(PATRON_REF_DEFINICION, { error: 'Referencia con formato no válido' }))
    .min(1, { error: 'Cada definición se apoya en al menos un dato' }),
  /** Fórmula del cálculo propio, solo con símbolos (sin cifras escritas). */
  formula: FormulaEstructurada.optional(),
});
export type Definicion = z.infer<typeof Definicion>;

/** Valida un registro y comprueba que su `id` coincide con el nombre del fichero. */
export function leerDefinicion(nombreFichero: string, json: unknown): Definicion {
  const d = Definicion.parse(json);
  if (d.id !== nombreFichero)
    throw new Error(`${nombreFichero}.json: el id (${d.id}) no coincide con el nombre del fichero`);
  return d;
}

/** Busca una definición por id; si no existe, falla con un mensaje que lista los ids válidos. */
export function buscarDefinicion(lista: readonly Definicion[], id: string): Definicion {
  const d = lista.find((x) => x.id === id);
  if (d === undefined) {
    throw new RangeError(
      `Definición desconocida: «${id}». Ids válidos: ${lista.map((x) => x.id).join(', ')}`,
    );
  }
  return d;
}

/** Ancla estable del bloque de una definición en la página. */
export function anclaDefinicion(id: string): string {
  return `definicion-${id}`;
}
