/**
 * Panel «Supuestos y lecturas»: lecturas abiertas que afectan a la jubilación, con su valor actual,
 * su estado y el motivo del registro, más su efecto en el cálculo concreto de la persona.
 *
 * Solo lectura: no hay selector para cambiarlas (eso es de la Fase 3-B). El efecto se mide
 * volviendo a llamar al motor con cada alternativa; no se calcula nada fuera de él.
 */
import type {
  ConfiguracionMotor,
  EntradaJubilacion,
  Motor,
  ResultadoOk,
} from '../../engine/fachada';
import { formatearEuros } from '../../engine/formato';
import { LECTURAS_ABIERTAS, type LecturaAbierta } from '../../engine/lecturas';

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

export interface LecturaVista {
  readonly id: string;
  readonly descripcion: string;
  readonly valorActual: string;
  readonly alternativas: readonly string[];
  readonly estado: EstadoLecturaVista;
  readonly etiquetaEstado: string;
  readonly explicacionEstado: string;
  readonly motivo: string | null;
  readonly fechaEstado: string;
  /** Efecto en el resultado de la persona, o `undefined` si no se ha podido medir. */
  readonly efecto?: string;
  readonly afectaAlResultado: boolean;
}

/** Alternativas a la opción vigente (sin repetir el valor actual). */
const alternativasDe = (l: LecturaAbierta): readonly string[] =>
  l.alternativas.filter((a) => a !== l.porDefecto);

/** Lecturas del motor de jubilación, en el orden del registro. */
export function lecturasDeJubilacion(): readonly LecturaAbierta[] {
  return LECTURAS_ABIERTAS.filter((l) => l.motor === 'jubilacion');
}

const euros = (v: number): string => formatearEuros(v, { decimales: 2, conSigno: true });
const eurosSinSigno = (v: number): string => formatearEuros(v, { decimales: 2 });
const IGUAL = 0.005;

/**
 * Efecto de cada alternativa de cada lectura en la pensión y en la base reguladora. Cada
 * alternativa se evalúa con una configuración que solo cambia esa lectura.
 */
export function efectoPorLectura(
  entrada: EntradaJubilacion,
  configuracion: ConfiguracionMotor,
  base: ResultadoOk<'jubilacion'>,
  fabrica: (c: ConfiguracionMotor) => Motor,
): ReadonlyMap<string, { texto: string; afecta: boolean }> {
  const salida = new Map<string, { texto: string; afecta: boolean }>();
  for (const lectura of lecturasDeJubilacion()) {
    const partes: string[] = [];
    let afecta = false;
    let fallo = false;
    for (const alternativa of alternativasDe(lectura)) {
      try {
        const motor = fabrica({
          ...configuracion,
          lecturas: { ...configuracion.lecturas, [lectura.id]: alternativa },
        });
        const r = motor.jubilacion(entrada);
        if (!r.ok) {
          fallo = true;
          continue;
        }
        const dPension = r.detalle.pensionMensual - base.detalle.pensionMensual;
        const dBase = r.detalle.baseReguladora - base.detalle.baseReguladora;
        if (Math.abs(dPension) >= IGUAL) {
          afecta = true;
          partes.push(
            `con «${alternativa}» la pensión mensual sería ${eurosSinSigno(r.detalle.pensionMensual)} (${euros(dPension)})`,
          );
        } else if (Math.abs(dBase) >= IGUAL) {
          afecta = true;
          partes.push(
            `con «${alternativa}» la base reguladora cambiaría ${euros(dBase)} al mes, pero la pensión no cambia (límite aplicado)`,
          );
        } else {
          partes.push(`con «${alternativa}» no cambia el resultado`);
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

/** Filas del panel; con `efectos` se añade el efecto en el resultado de la persona. */
export function filasDelPanel(
  efectos?: ReadonlyMap<string, { texto: string; afecta: boolean }>,
): readonly LecturaVista[] {
  return lecturasDeJubilacion().map((l) => {
    const e = efectos?.get(l.id);
    return {
      id: l.id,
      descripcion: l.descripcion,
      valorActual: l.porDefecto,
      alternativas: alternativasDe(l),
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
