/**
 * Capa de lecturas abiertas para el simulador (Fase 3-B2). Lógica pura, sin React ni DOM: no
 * cambia ninguna regla del motor ni ningún valor por defecto; solo decide qué lecturas se ofrecen,
 * normaliza una elección de lecturas y mide, llamando al motor, la diferencia entre el resultado
 * con la elección de la persona y el resultado con todas las lecturas por defecto.
 *
 * - Solo se ofrecen las lecturas de la jubilación que tienen al menos dos valores en el registro
 *   (`src/engine/lecturas.ts`). No se inventa ninguna alternativa fuera del registro.
 * - Una elección es `{ id: valor }`. La forma normalizada contiene solo las lecturas ofrecidas cuyo
 *   valor es una alternativa del registro y distinto del valor por defecto: es la que se pasa al
 *   motor y la que se guarda en el enlace compartible.
 */
import type {
  ConfiguracionMotor,
  EntradaJubilacion,
  ErrorMotor,
  Motor,
  ResultadoOk,
} from './fachada.ts';
import { LECTURAS_ABIERTAS, type LecturaAbierta } from './lecturas.ts';

/** Elección de lecturas: `{ 'jubilacion.baseMaxima': 'sobre-cifra-inicial', … }`. */
export type EleccionLecturas = Readonly<Record<string, string>>;

/** Lecturas que la interfaz ofrece cambiar: las de la jubilación con al menos dos valores. */
export function lecturasOfrecidas(): readonly LecturaAbierta[] {
  return LECTURAS_ABIERTAS.filter((l) => l.motor === 'jubilacion' && l.alternativas.length >= 2);
}

/** Valor efectivo de cada lectura ofrecida: el elegido si es válido y, si no, el del registro. */
export function valoresElegidos(eleccion: EleccionLecturas = {}): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const l of lecturasOfrecidas()) {
    const v = eleccion[l.id];
    salida[l.id] = v !== undefined && l.alternativas.includes(v) ? v : l.porDefecto;
  }
  return salida;
}

/**
 * Forma normalizada de una elección: solo las lecturas ofrecidas con un valor válido distinto del
 * valor por defecto. Ignora lo que no esté en el registro.
 */
export function normalizarEleccion(eleccion: EleccionLecturas = {}): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const l of lecturasOfrecidas()) {
    const v = eleccion[l.id];
    if (v !== undefined && v !== l.porDefecto && l.alternativas.includes(v)) salida[l.id] = v;
  }
  return salida;
}

export interface LecturaCambiada {
  readonly id: string;
  readonly valor: string;
  readonly porDefecto: string;
}

/** Lecturas cuyo valor elegido difiere del valor por defecto, en el orden del registro. */
export function lecturasCambiadas(eleccion: EleccionLecturas = {}): readonly LecturaCambiada[] {
  const normalizada = normalizarEleccion(eleccion);
  return lecturasOfrecidas().flatMap((l) => {
    const valor = normalizada[l.id];
    return valor === undefined ? [] : [{ id: l.id, valor, porDefecto: l.porDefecto }];
  });
}

/** Diferencia de un importe: en euros y en porcentaje del valor por defecto. */
export interface DiferenciaImporte {
  /** Valor con las lecturas elegidas menos valor con las lecturas por defecto. */
  readonly euros: number;
  /** En % del valor por defecto; `undefined` si el valor por defecto es cero. */
  readonly porcentaje: number | undefined;
}

export interface Diferencia {
  readonly pension: DiferenciaImporte;
  readonly baseReguladora: DiferenciaImporte;
}

export type ComparacionLecturas =
  /** La elección coincide con los valores por defecto: no hay diferencia que mostrar. */
  | { readonly tipo: 'sin-cambios'; readonly resultado: ResultadoOk<'jubilacion'> }
  | {
      readonly tipo: 'comparado';
      readonly cambiadas: readonly LecturaCambiada[];
      readonly elegido: ResultadoOk<'jubilacion'>;
      readonly porDefecto: ResultadoOk<'jubilacion'>;
      readonly diferencia: Diferencia;
    }
  /** Alguno de los dos cálculos no se pudo hacer (el motor devolvió un error). */
  | {
      readonly tipo: 'no-comparable';
      readonly cambiadas: readonly LecturaCambiada[];
      readonly error: ErrorMotor;
    };

const diferenciaDe = (elegido: number, porDefecto: number): DiferenciaImporte => ({
  euros: elegido - porDefecto,
  porcentaje: porDefecto === 0 ? undefined : ((elegido - porDefecto) / porDefecto) * 100,
});

/**
 * Calcula el resultado con la elección de lecturas y con todas las lecturas por defecto, y su
 * diferencia (euros por mes y porcentaje) en la pensión y en la base reguladora.
 *
 * `configuracion` es la del simulador sin lecturas (escenario de IPC…); la elección se le añade. Si
 * la elección normalizada está vacía, no se llama dos veces: no hay diferencia.
 */
export function compararLecturas(
  entrada: EntradaJubilacion,
  configuracion: ConfiguracionMotor,
  eleccion: EleccionLecturas,
  fabrica: (configuracion: ConfiguracionMotor) => Motor,
): ComparacionLecturas {
  const cambiadas = lecturasCambiadas(eleccion);
  const { lecturas: _ignoradas, ...base } = configuracion;
  const porDefecto = fabrica(base).jubilacion(entrada);
  if (cambiadas.length === 0) {
    return porDefecto.ok
      ? { tipo: 'sin-cambios', resultado: porDefecto }
      : { tipo: 'no-comparable', cambiadas, error: porDefecto.error };
  }
  const elegido = fabrica({ ...base, lecturas: normalizarEleccion(eleccion) }).jubilacion(entrada);
  if (!elegido.ok) return { tipo: 'no-comparable', cambiadas, error: elegido.error };
  if (!porDefecto.ok) return { tipo: 'no-comparable', cambiadas, error: porDefecto.error };
  return {
    tipo: 'comparado',
    cambiadas,
    elegido,
    porDefecto,
    diferencia: {
      pension: diferenciaDe(elegido.detalle.pensionMensual, porDefecto.detalle.pensionMensual),
      baseReguladora: diferenciaDe(
        elegido.detalle.baseReguladora,
        porDefecto.detalle.baseReguladora,
      ),
    },
  };
}
