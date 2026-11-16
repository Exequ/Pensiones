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
  ResultadoError,
} from './fachada.ts';
import { LECTURAS_ABIERTAS, type LecturaAbierta, type MotorLectura } from './lecturas.ts';

/**
 * Prestaciones con lecturas que el simulador ofrece cambiar (jubilación e incapacidad en la 3-C1;
 * viudedad y orfandad en la 3-C2, que comparten el motor `supervivencia` pero no todas sus lecturas).
 */
export type MotorOfrecido = 'jubilacion' | 'incapacidad' | 'viudedad' | 'orfandad';

/** Motor del registro de lecturas al que pertenecen las de cada prestación. */
const MOTOR_DEL_REGISTRO: Record<MotorOfrecido, MotorLectura> = {
  jubilacion: 'jubilacion',
  incapacidad: 'incapacidad',
  viudedad: 'supervivencia',
  orfandad: 'supervivencia',
};

/**
 * Lecturas del motor de supervivencia que cambian el cálculo de cada prestación (las de favor de
 * familiares no cambian ni la viudedad ni la orfandad: se ofrecerán en la Fase 3-C3). Las demás
 * prestaciones ofrecen todas las lecturas de su motor.
 */
const SOLO_ESTAS: Partial<Record<MotorOfrecido, readonly string[]>> = {
  viudedad: [
    'supervivencia.ventanaBaseReguladora',
    'supervivencia.diasCotizados',
    'supervivencia.reduccionViudedad70',
    'supervivencia.comparacionCompensatoria',
    'supervivencia.reduccionLimiteConjunto',
  ],
  orfandad: [
    'supervivencia.ventanaBaseReguladora',
    'supervivencia.diasCotizados',
    'supervivencia.carenciaOrfandad',
    'supervivencia.reduccionLimiteConjunto',
  ],
};

/** Lo mínimo que la comparación necesita de un resultado de cualquier prestación. */
export interface ResultadoComparable {
  readonly ok: true;
  readonly detalle: {
    readonly cumpleRequisitos: boolean;
    readonly pensionMensual: number;
    readonly baseReguladora: number;
    /** Solo la incapacidad permanente parcial: su importe es un pago único, no una pensión. */
    readonly cantidadTantoAlzado?: number;
  };
}

/** Importe que se compara: la cantidad a tanto alzado (parcial) o la pensión mensual por paga. */
export function importePrincipal(d: ResultadoComparable['detalle']): number {
  return d.cantidadTantoAlzado !== undefined && d.cantidadTantoAlzado > 0
    ? d.cantidadTantoAlzado
    : d.pensionMensual;
}

/**
 * Cómo se calcula una prestación con un motor (Fase 3-C1): la comparación y el efecto de cada
 * lectura no saben de qué prestación se trata; solo llaman a esta función.
 */
export type EjecutorPrestacion<E, R extends ResultadoComparable = ResultadoComparable> = (
  motor: Motor,
  entrada: E,
) => R | ResultadoError;

/** Ejecutor de la jubilación ordinaria (el de las Fases 3-A a 3-B2). */
export const ejecutarJubilacion: EjecutorPrestacion<
  EntradaJubilacion,
  Extract<ReturnType<Motor['jubilacion']>, { ok: true }>
> = (motor, entrada) => motor.jubilacion(entrada);

/** Elección de lecturas: `{ 'jubilacion.baseMaxima': 'sobre-cifra-inicial', … }`. */
export type EleccionLecturas = Readonly<Record<string, string>>;

/**
 * Lecturas que la interfaz ofrece cambiar: las de la prestación (por defecto, la jubilación) con
 * al menos dos valores en el registro.
 */
export function lecturasOfrecidas(motor: MotorOfrecido = 'jubilacion'): readonly LecturaAbierta[] {
  const soloEstas = SOLO_ESTAS[motor];
  return LECTURAS_ABIERTAS.filter(
    (l) =>
      l.motor === MOTOR_DEL_REGISTRO[motor] &&
      l.alternativas.length >= 2 &&
      (soloEstas === undefined || soloEstas.includes(l.id)),
  );
}

/** Valor efectivo de cada lectura ofrecida: el elegido si es válido y, si no, el del registro. */
export function valoresElegidos(
  eleccion: EleccionLecturas = {},
  motor: MotorOfrecido = 'jubilacion',
): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const l of lecturasOfrecidas(motor)) {
    const v = eleccion[l.id];
    salida[l.id] = v !== undefined && l.alternativas.includes(v) ? v : l.porDefecto;
  }
  return salida;
}

/**
 * Forma normalizada de una elección: solo las lecturas ofrecidas con un valor válido distinto del
 * valor por defecto. Ignora lo que no esté en el registro.
 */
export function normalizarEleccion(
  eleccion: EleccionLecturas = {},
  motor: MotorOfrecido = 'jubilacion',
): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const l of lecturasOfrecidas(motor)) {
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
export function lecturasCambiadas(
  eleccion: EleccionLecturas = {},
  motor: MotorOfrecido = 'jubilacion',
): readonly LecturaCambiada[] {
  const normalizada = normalizarEleccion(eleccion, motor);
  return lecturasOfrecidas(motor).flatMap((l) => {
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

export type ComparacionLecturas<R extends ResultadoComparable = ResultadoComparable> =
  /** La elección coincide con los valores por defecto: no hay diferencia que mostrar. */
  | { readonly tipo: 'sin-cambios'; readonly resultado: R }
  | {
      readonly tipo: 'comparado';
      readonly cambiadas: readonly LecturaCambiada[];
      readonly elegido: R;
      readonly porDefecto: R;
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
export function compararLecturas<
  E = EntradaJubilacion,
  R extends ResultadoComparable = ResultadoComparable,
>(
  entrada: E,
  configuracion: ConfiguracionMotor,
  eleccion: EleccionLecturas,
  fabrica: (configuracion: ConfiguracionMotor) => Motor,
  ejecutor: EjecutorPrestacion<E, R> = ejecutarJubilacion as unknown as EjecutorPrestacion<E, R>,
  motorLecturas: MotorOfrecido = 'jubilacion',
): ComparacionLecturas<R> {
  const cambiadas = lecturasCambiadas(eleccion, motorLecturas);
  const { lecturas: _ignoradas, ...base } = configuracion;
  const porDefecto = ejecutor(fabrica(base), entrada);
  if (cambiadas.length === 0) {
    return porDefecto.ok
      ? { tipo: 'sin-cambios', resultado: porDefecto }
      : { tipo: 'no-comparable', cambiadas, error: porDefecto.error };
  }
  const elegido = ejecutor(
    fabrica({ ...base, lecturas: normalizarEleccion(eleccion, motorLecturas) }),
    entrada,
  );
  if (!elegido.ok) return { tipo: 'no-comparable', cambiadas, error: elegido.error };
  if (!porDefecto.ok) return { tipo: 'no-comparable', cambiadas, error: porDefecto.error };
  return {
    tipo: 'comparado',
    cambiadas,
    elegido,
    porDefecto,
    diferencia: {
      pension: diferenciaDe(
        importePrincipal(elegido.detalle),
        importePrincipal(porDefecto.detalle),
      ),
      baseReguladora: diferenciaDe(
        elegido.detalle.baseReguladora,
        porDefecto.detalle.baseReguladora,
      ),
    },
  };
}
