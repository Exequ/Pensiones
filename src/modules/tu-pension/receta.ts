/**
 * Orquestación del simulador: formulario → entrada del motor → resultado → modelo de vista.
 * Todo con el motor y la lectura de datos inyectados (se prueban sin navegador ni Vite).
 *
 * Desde la Fase 3-C1 la orquestación es la misma para todas las prestaciones: cada una aporta una
 * «receta» (`Receta`, véase `prestaciones.ts`) con su mapeador, su llamada al motor y su presentador.
 * `calcularTuPension` elige la receta por `formulario.prestacion`.
 */
import type { ConfiguracionMotor, Motor } from '../../engine/fachada';
import type { BasesPeriodoCalculo } from '../../engine/jubilacion/tipos';
import {
  compararLecturas,
  type ComparacionLecturas,
  type EjecutorPrestacion,
  type MotorOfrecido,
  type ResultadoComparable,
} from '../../engine/comparar-lecturas';
import { traducirError, type MensajeError } from './errores';
import type { ResultadoMapeo } from './mapeador';
import type { LeerReferencia, ModeloResultado } from './presentador';
import { efectoPorLectura, filasDelPanel, type LecturaVista } from './supuestos';
import type { CatalogoReferencias } from './referencias';
import type { ErroresFormulario, FormularioTuPension, IdPrestacion } from './tipos';
import type { AvisoTramo, ErrorTramo, ResumenCarrera } from './tramos';

export type RespuestaCalculo =
  | {
      readonly tipo: 'resultado';
      readonly prestacion: IdPrestacion;
      /** Formulario con el que se calculó este resultado. */
      readonly formulario: FormularioTuPension;
      readonly modelo: ModeloResultado;
      readonly lecturas: readonly LecturaVista[];
      /**
       * Comparación con las lecturas por defecto (Fase 3-B2): `sin-cambios` si la persona no ha
       * cambiado ninguna lectura.
       */
      readonly comparacion: ComparacionLecturas;
      /** Escenario de IPC usado, en %, o `undefined` si no se indicó. */
      readonly ipcUsado: string | undefined;
      /** Bases mes a mes del periodo de cálculo (para el gráfico); `undefined` si el motor no las expone. */
      readonly bases: BasesPeriodoCalculo | undefined;
      /** Resumen y avisos de la carrera por tramos (`undefined` / vacío con la carrera simple). */
      readonly resumenTramos: ResumenCarrera | undefined;
      readonly avisosTramos: readonly AvisoTramo[];
    }
  | {
      readonly tipo: 'errores-formulario';
      readonly errores: ErroresFormulario;
      readonly erroresTramos: readonly ErrorTramo[];
    }
  | {
      readonly tipo: 'error-motor';
      readonly prestacion: IdPrestacion;
      readonly error: MensajeError;
    };

export interface Dependencias {
  readonly fabricaMotor: (configuracion: ConfiguracionMotor) => Motor;
  readonly leerReferencia: LeerReferencia;
  /** Referencias de base para la carrera por tramos. */
  readonly catalogo: CatalogoReferencias;
}

/** Lo que cada prestación aporta a la orquestación común. */
export interface Receta<E, R extends ResultadoComparable> {
  readonly id: IdPrestacion;
  /** Lecturas del registro que ofrece la prestación. */
  readonly motorLecturas: MotorOfrecido;
  /** «la pensión mensual», «la cantidad a tanto alzado»: lo que mide el efecto de una lectura. */
  readonly importeEfecto: (r: R) => string;
  mapear(f: FormularioTuPension, catalogo: CatalogoReferencias): ResultadoMapeo<E>;
  ejecutar: EjecutorPrestacion<E, R>;
  presentar(r: R, f: FormularioTuPension, deps: Dependencias): ModeloResultado;
  /** Bases mes a mes del periodo de cálculo, si el motor las expone. */
  bases(r: R): BasesPeriodoCalculo | undefined;
}

export function calcularConReceta<E, R extends ResultadoComparable>(
  receta: Receta<E, R>,
  formulario: FormularioTuPension,
  deps: Dependencias,
): RespuestaCalculo {
  const { fabricaMotor, catalogo } = deps;
  const mapeo = receta.mapear(formulario, catalogo);
  if (!mapeo.ok) {
    return {
      tipo: 'errores-formulario',
      errores: mapeo.errores,
      erroresTramos: mapeo.erroresTramos,
    };
  }
  const motor = fabricaMotor(mapeo.configuracion);
  const resultado = receta.ejecutar(motor, mapeo.entrada);
  if (!resultado.ok) {
    return {
      tipo: 'error-motor',
      prestacion: receta.id,
      error: traducirError(resultado.error, receta.id),
    };
  }
  const modelo = receta.presentar(resultado, formulario, deps);
  const comparacion = compararLecturas(
    mapeo.entrada,
    mapeo.configuracion,
    formulario.lecturas,
    fabricaMotor,
    receta.ejecutar,
    receta.motorLecturas,
  );
  const efectos = resultado.detalle.cumpleRequisitos
    ? efectoPorLectura(
        mapeo.entrada,
        mapeo.configuracion,
        resultado,
        fabricaMotor,
        receta.ejecutar,
        receta.motorLecturas,
        receta.importeEfecto(resultado),
      )
    : undefined;
  return {
    tipo: 'resultado',
    prestacion: receta.id,
    formulario,
    modelo,
    lecturas: filasDelPanel(efectos, formulario.lecturas, receta.motorLecturas),
    comparacion,
    ipcUsado: formulario.ipcSupuesto.trim() === '' ? undefined : formulario.ipcSupuesto.trim(),
    bases: receta.bases(resultado),
    resumenTramos: mapeo.resumenTramos,
    avisosTramos: mapeo.avisosTramos,
  };
}
