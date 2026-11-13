/**
 * Panel «Supuestos y lecturas»: lecturas abiertas que afectan a la jubilación, con su valor elegido,
 * su estado y el motivo del registro, más su efecto en el cálculo concreto de la persona.
 *
 * Desde la Fase 3-B2 cada lectura se puede cambiar (la elección vive en el formulario). El efecto de
 * cada alternativa se mide volviendo a llamar al motor con una configuración que solo cambia esa
 * lectura respecto a la elección actual; no se calcula nada fuera del motor.
 */
import type { ConfiguracionMotor, EntradaJubilacion, Motor } from '../../engine/fachada';
import { formatearEuros } from '../../engine/formato';
import {
  ejecutarJubilacion,
  lecturasOfrecidas,
  valoresElegidos,
  type EjecutorPrestacion,
  type MotorOfrecido,
  type ResultadoComparable,
  importePrincipal,
} from '../../engine/comparar-lecturas';
import { type LecturaAbierta } from '../../engine/lecturas';
import { TEXTOS_LECTURAS } from './textos-lecturas';

export type EstadoLecturaVista = LecturaAbierta['estado'];

export const ETIQUETA_ESTADO: Record<EstadoLecturaVista, string> = {
  decidida: 'Decidida',
  provisional: 'Provisional',
  pendiente: 'Pendiente de decidir',
};

export const EXPLICACION_ESTADO: Record<EstadoLecturaVista, string> = {
  decidida: 'Lectura firme: la revisión actuarial la ha cerrado.',
  provisional: 'Lectura adoptada con confianza actuarial baja o media; sigue abierta a revisión.',
  pendiente: 'Lectura sin decidir: el cálculo usa la opción más sencilla mientras no se revise.',
};

export interface OpcionLecturaVista {
  readonly valor: string;
  readonly etiqueta: string;
  readonly queCambia: string;
  readonly esPorDefecto: boolean;
}

export interface LecturaVista {
  readonly id: string;
  readonly titulo: string;
  readonly descripcion: string;
  /** Valor elegido (el del registro si la persona no ha cambiado nada). */
  readonly valorActual: string;
  readonly valorPorDefecto: string;
  /** Todos los valores del registro, el de por defecto incluido. */
  readonly opciones: readonly OpcionLecturaVista[];
  /** `true` si el valor elegido difiere del de por defecto. */
  readonly cambiada: boolean;
  readonly estado: EstadoLecturaVista;
  readonly etiquetaEstado: string;
  readonly explicacionEstado: string;
  readonly motivo: string | null;
  readonly fechaEstado: string;
  /** Efecto en el resultado de la persona, o `undefined` si no se ha podido medir. */
  readonly efecto?: string;
  readonly afectaAlResultado: boolean;
}

/** Lecturas que ofrece el simulador (jubilación), en el orden del registro. */
export function lecturasDeJubilacion(): readonly LecturaAbierta[] {
  return lecturasOfrecidas();
}

const etiquetaDe = (id: string, valor: string): string =>
  TEXTOS_LECTURAS[id]?.valores[valor]?.etiqueta ?? valor;

const euros = (v: number): string => formatearEuros(v, { decimales: 2, conSigno: true });
const eurosSinSigno = (v: number): string => formatearEuros(v, { decimales: 2 });
const IGUAL = 0.005;

/**
 * Efecto de cada alternativa de cada lectura en la pensión y en la base reguladora. Cada
 * alternativa se evalúa con una configuración que solo cambia esa lectura.
 */
export function efectoPorLectura<E = EntradaJubilacion>(
  entrada: E,
  configuracion: ConfiguracionMotor,
  base: ResultadoComparable,
  fabrica: (c: ConfiguracionMotor) => Motor,
  ejecutor: EjecutorPrestacion<E> = ejecutarJubilacion as unknown as EjecutorPrestacion<E>,
  motorLecturas: MotorOfrecido = 'jubilacion',
  /** «la pensión mensual», «la cantidad a tanto alzado»: lo que mide el importe comparado. */
  importe = 'la pensión mensual',
): ReadonlyMap<string, { texto: string; afecta: boolean }> {
  const salida = new Map<string, { texto: string; afecta: boolean }>();
  const actuales = valoresElegidos(configuracion.lecturas, motorLecturas);
  for (const lectura of lecturasOfrecidas(motorLecturas)) {
    const partes: string[] = [];
    let afecta = false;
    let fallo = false;
    for (const alternativa of lectura.alternativas.filter((a) => a !== actuales[lectura.id])) {
      const nombre = etiquetaDe(lectura.id, alternativa);
      try {
        const motor = fabrica({
          ...configuracion,
          lecturas: { ...configuracion.lecturas, [lectura.id]: alternativa },
        });
        const r = ejecutor(motor, entrada);
        if (!r.ok) {
          fallo = true;
          continue;
        }
        const dPension = importePrincipal(r.detalle) - importePrincipal(base.detalle);
        const dBase = r.detalle.baseReguladora - base.detalle.baseReguladora;
        if (Math.abs(dPension) >= IGUAL) {
          afecta = true;
          partes.push(
            `con «${nombre}» ${importe} sería ${eurosSinSigno(importePrincipal(r.detalle))} (${euros(dPension)})`,
          );
        } else if (Math.abs(dBase) >= IGUAL) {
          afecta = true;
          partes.push(
            `con «${nombre}» la base reguladora cambiaría ${euros(dBase)} al mes, pero la pensión no cambia (límite aplicado)`,
          );
        } else {
          partes.push(`con «${nombre}» no cambia el resultado`);
        }
      } catch {
        fallo = true;
      }
    }
    const texto =
      partes.length === 0
        ? 'No se ha podido medir su efecto con estos datos.'
        : `${partes.join('; ')}${fallo ? '; alguna alternativa no se ha podido evaluar' : ''}.`;
    salida.set(lectura.id, { texto: texto.charAt(0).toUpperCase() + texto.slice(1), afecta });
  }
  return salida;
}

/**
 * Filas del panel; con `efectos` se añade el efecto en el resultado de la persona y con `elegidas`
 * (elección de lecturas) se marca el valor elegido de cada una.
 */
export function filasDelPanel(
  efectos?: ReadonlyMap<string, { texto: string; afecta: boolean }>,
  elegidas?: Readonly<Record<string, string>>,
  motorLecturas: MotorOfrecido = 'jubilacion',
): readonly LecturaVista[] {
  const valores = valoresElegidos(elegidas, motorLecturas);
  return lecturasOfrecidas(motorLecturas).map((l) => {
    const e = efectos?.get(l.id);
    const textos = TEXTOS_LECTURAS[l.id];
    const valorActual = valores[l.id] ?? l.porDefecto;
    return {
      id: l.id,
      titulo: textos?.titulo ?? l.descripcion,
      descripcion: l.descripcion,
      valorActual,
      valorPorDefecto: l.porDefecto,
      opciones: l.alternativas.map((valor) => ({
        valor,
        etiqueta: etiquetaDe(l.id, valor),
        queCambia: textos?.valores[valor]?.queCambia ?? '',
        esPorDefecto: valor === l.porDefecto,
      })),
      cambiada: valorActual !== l.porDefecto,
      estado: l.estado,
      etiquetaEstado: ETIQUETA_ESTADO[l.estado],
      explicacionEstado: EXPLICACION_ESTADO[l.estado],
      motivo: l.motivo,
      fechaEstado: l.fechaEstado,
      ...(e ? { efecto: e.texto } : {}),
      afectaAlResultado: e?.afecta ?? false,
    };
  });
}
