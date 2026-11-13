/**
 * Prestaciones del simulador «Tu pensión» (Fase 3-C1).
 *
 * Cada prestación es una `Prestacion`: su identificador, sus textos, las lecturas que ofrece, las
 * limitaciones del motor que se muestran y su receta de cálculo (mapeador del formulario a la
 * entrada del motor, llamada al motor y presentador). El formulario, el resultado, el panel de
 * lecturas, la comparación y el enlace son comunes: la página elige la prestación y la usa.
 *
 * Esto es lógica pura (sin React). Las piezas de interfaz propias de cada prestación (campos del
 * formulario, bloques junto al resultado) están en `Pagina.tsx` y `FormularioIncapacidad.tsx`.
 */
import { ejecutarJubilacion } from '../../engine/comparar-lecturas';
import type {
  EntradaIncapacidad,
  EntradaJubilacion,
  Motor,
  ResultadoOk,
} from '../../engine/fachada';
import { LECTURAS_ABIERTAS } from '../../engine/lecturas';
import { calcularConReceta, type Dependencias, type Receta, type RespuestaCalculo } from './receta';
import { ETIQUETAS_JUBILACION, type EtiquetasComparacion } from './comparacion-texto';
import { formularioAEntradaIncapacidad } from './incapacidad-mapeador';
import { presentarIncapacidad } from './incapacidad-presentador';
import { formularioAEntrada } from './mapeador';
import { presentarResultado } from './presentador';
import type { FormularioTuPension, IdPrestacion } from './tipos';

export interface Prestacion {
  readonly id: IdPrestacion;
  /** Etiqueta del selector de prestación. */
  readonly etiqueta: string;
  /** Motor de las limitaciones (`LIMITACIONES_MOTOR`) que se muestran en la página. */
  readonly motorLimitaciones: 'jubilacion' | 'incapacidad';
  /** Palabras de la comparación con las lecturas por defecto. */
  etiquetasComparacion(f: FormularioTuPension): EtiquetasComparacion;
  /** Calcula con el motor y presenta el resultado (o devuelve los errores). */
  calcular(f: FormularioTuPension, deps: Dependencias): RespuestaCalculo;
}

const lecturaPorDefecto = (id: string): string =>
  LECTURAS_ABIERTAS.find((l) => l.id === id)?.porDefecto ?? '';

const recetaJubilacion: Receta<EntradaJubilacion, ResultadoOk<'jubilacion'>> = {
  id: 'jubilacion',
  motorLecturas: 'jubilacion',
  importeEfecto: () => 'la pensión mensual',
  mapear: (f, catalogo) => formularioAEntrada(f, catalogo),
  ejecutar: ejecutarJubilacion,
  presentar: (r, f, deps) =>
    presentarResultado(r, {
      sexo: f.sexo === 'mujer' ? 'mujer' : 'hombre',
      aplicarMinimos: f.aplicarMinimos,
      aplicarPensionMaxima: f.aplicarPensionMaxima,
      leerReferencia: deps.leerReferencia,
      factorMinimo: lecturaPorDefecto('jubilacion.actualizacionFactorMinimo'),
    }),
  bases: (r) => r.detalle.basesPeriodo,
};

const recetaIncapacidad: Receta<EntradaIncapacidad, ResultadoOk<'incapacidad-permanente'>> = {
  id: 'incapacidad',
  motorLecturas: 'incapacidad',
  importeEfecto: (r) =>
    r.detalle.grado === 'parcial' ? 'la cantidad a tanto alzado' : 'la pensión mensual',
  mapear: (f, catalogo) => formularioAEntradaIncapacidad(f, catalogo),
  ejecutar: ejecutarIncapacidad,
  presentar: (r, f, deps) =>
    presentarIncapacidad(r, {
      aplicarMinimos: f.aplicarMinimos,
      aplicarPensionMaxima: f.aplicarPensionMaxima,
      leerReferencia: deps.leerReferencia,
    }),
  // El motor de incapacidad no expone las bases del periodo: no hay gráfico (docs/DECISIONES.md, 3-C1).
  bases: () => undefined,
};

function ejecutarIncapacidad(motor: Motor, e: EntradaIncapacidad) {
  return motor.incapacidadPermanente(e);
}

export const JUBILACION: Prestacion = {
  id: 'jubilacion',
  etiqueta: 'Jubilación ordinaria',
  motorLimitaciones: 'jubilacion',
  etiquetasComparacion: () => ETIQUETAS_JUBILACION,
  calcular: (f, deps) => calcularConReceta(recetaJubilacion, f, deps),
};

export const INCAPACIDAD: Prestacion = {
  id: 'incapacidad',
  etiqueta: 'Incapacidad permanente',
  motorLimitaciones: 'incapacidad',
  etiquetasComparacion: (f) => ({
    requisitos: 'de la incapacidad permanente',
    importe: f.grado === 'parcial' ? 'la cantidad a tanto alzado' : 'la pensión mensual bruta',
    filaImporte:
      f.grado === 'parcial' ? 'Cantidad a tanto alzado' : 'Pensión mensual bruta (por paga)',
    sinImporte: f.grado === 'parcial' ? 'cantidad' : 'pensión',
    unidadDiferencia: f.grado === 'parcial' ? '' : ' al mes',
  }),
  calcular: (f, deps) => calcularConReceta(recetaIncapacidad, f, deps),
};

export const PRESTACIONES: readonly Prestacion[] = [JUBILACION, INCAPACIDAD];

/** Prestaciones que aún no están: se muestran como «próximamente», sin cifras. */
export const PRESTACIONES_PROXIMAS: readonly { readonly id: string; readonly etiqueta: string }[] =
  [
    { id: 'viudedad', etiqueta: 'Viudedad' },
    { id: 'orfandad', etiqueta: 'Orfandad' },
    { id: 'favor-familiares', etiqueta: 'Prestación en favor de familiares' },
    { id: 'no-contributivas', etiqueta: 'Pensiones no contributivas' },
  ];

export function prestacionDe(id: IdPrestacion): Prestacion {
  return id === 'incapacidad' ? INCAPACIDAD : JUBILACION;
}

/** Calcula la prestación del formulario. */
export function calcularTuPension(f: FormularioTuPension, deps: Dependencias): RespuestaCalculo {
  return prestacionDe(f.prestacion).calcular(f, deps);
}
