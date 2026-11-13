/**
 * Configuración única de las lecturas abiertas: valor por defecto, estado de la decisión, fecha y
 * pregunta de docs/REVISION_ACTUARIAL.md de cada una. Lee `lecturas-por-defecto.json`.
 *
 * Está en `src/engine/config/` y no en `data/config/` porque `validate:data` exige que todo valor
 * lleve fuente con URL y fecha de descarga: estas entradas son decisiones del proyecto, no datos
 * de una fuente (docs/DECISIONES.md, Fase 2-C).
 *
 * Los motores (`tipos.ts` de cada uno) construyen sus lecturas por defecto con `porDefectoDelMotor`,
 * y el registro de lecturas (`../lecturas.ts`) las lee de aquí: hay una sola fuente de verdad.
 */
import { z } from 'zod';
import cruda from './lecturas-por-defecto.json' with { type: 'json' };

export const ESTADOS_LECTURA = ['pendiente', 'provisional', 'decidida'] as const;

const Entrada = z
  .strictObject({
    id: z.string().regex(/^[a-z]+(?:-[a-z]+)*\.[A-Za-z0-9]+$/),
    valor: z.string().min(1),
    estado: z.enum(ESTADOS_LECTURA),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** Motivo corto (con la confianza actuarial, solo con palabras); obligatorio si no es «pendiente». */
    motivo: z.string().min(1).optional(),
    pregunta: z.string().min(1),
  })
  .refine((e) => e.estado === 'pendiente' || e.motivo !== undefined, {
    message: 'Una lectura provisional o decidida necesita motivo',
    path: ['motivo'],
  });
const Configuracion = z.strictObject({
  descripcion: z.string().min(1),
  lecturas: z.array(Entrada).min(1),
});

export type EntradaLectura = z.infer<typeof Entrada>;

export const CONFIG_LECTURAS: readonly EntradaLectura[] = Configuracion.parse(cruda).lecturas;

/** Entrada de una lectura (`motor.opcion`); lanza si no existe. */
export function entradaDeLectura(id: string): EntradaLectura {
  const e = CONFIG_LECTURAS.find((x) => x.id === id);
  if (e === undefined) throw new RangeError(`Lectura sin configuración por defecto: ${id}`);
  return e;
}

/**
 * Lecturas por defecto de un motor, con el nombre de opción de ese motor como clave. El parámetro de
 * tipo es el de las lecturas de cada motor (`LecturasAbiertas`…); un test comprueba que las claves y
 * los valores coinciden con el registro.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function porDefectoDelMotor<T>(motor: string): T {
  const salida: Record<string, string> = {};
  for (const e of CONFIG_LECTURAS) {
    if (e.id.startsWith(`${motor}.`)) salida[e.id.slice(motor.length + 1)] = e.valor;
  }
  return salida as unknown as T;
}
