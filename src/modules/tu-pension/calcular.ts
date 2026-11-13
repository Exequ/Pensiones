/**
 * Orquestación del simulador: formulario → entrada del motor → resultado → modelo de vista.
 * Todo con el motor y la lectura de datos inyectados (se prueban sin navegador ni Vite).
 */
import type { ConfiguracionMotor, Motor } from '../../engine/fachada';
import type { BasesPeriodoCalculo } from '../../engine/jubilacion/tipos';
import { compararLecturas, type ComparacionLecturas } from '../../engine/comparar-lecturas';
import { LECTURAS_ABIERTAS } from '../../engine/lecturas';
import { traducirError, type MensajeError } from './errores';
import { formularioAEntrada } from './mapeador';
import { presentarResultado, type LeerReferencia, type ModeloResultado } from './presentador';
import { efectoPorLectura, filasDelPanel, type LecturaVista } from './supuestos';
import type { CatalogoReferencias } from './referencias';
import type { ErroresFormulario, FormularioTuPension } from './tipos';
import type { AvisoTramo, ErrorTramo, ResumenCarrera } from './tramos';

export type RespuestaCalculo =
  | {
      readonly tipo: 'resultado';
      readonly modelo: ModeloResultado;
      readonly lecturas: readonly LecturaVista[];
      /**
       * Comparación con las lecturas por defecto (Fase 3-B2): `sin-cambios` si la persona no ha
       * cambiado ninguna lectura.
       */
      readonly comparacion: ComparacionLecturas;
      /** Escenario de IPC usado, en %, o `undefined` si no se indicó. */
      readonly ipcUsado: string | undefined;
      /** Bases mes a mes del periodo de cálculo (para el gráfico). */
      readonly bases: BasesPeriodoCalculo;
      /** Resumen y avisos de la carrera por tramos (`undefined` / vacío con la carrera simple). */
      readonly resumenTramos: ResumenCarrera | undefined;
      readonly avisosTramos: readonly AvisoTramo[];
    }
  | {
      readonly tipo: 'errores-formulario';
      readonly errores: ErroresFormulario;
      readonly erroresTramos: readonly ErrorTramo[];
    }
  | { readonly tipo: 'error-motor'; readonly error: MensajeError };

export interface Dependencias {
  readonly fabricaMotor: (configuracion: ConfiguracionMotor) => Motor;
  readonly leerReferencia: LeerReferencia;
  /** Referencias de base para la carrera por tramos. */
  readonly catalogo: CatalogoReferencias;
}

export function calcularTuPension(
  formulario: FormularioTuPension,
  { fabricaMotor, leerReferencia, catalogo }: Dependencias,
): RespuestaCalculo {
  const mapeo = formularioAEntrada(formulario, catalogo);
  if (!mapeo.ok) {
    return {
      tipo: 'errores-formulario',
      errores: mapeo.errores,
      erroresTramos: mapeo.erroresTramos,
    };
  }
  const motor = fabricaMotor(mapeo.configuracion);
  const resultado = motor.jubilacion(mapeo.entrada);
  if (!resultado.ok) return { tipo: 'error-motor', error: traducirError(resultado.error) };
  const factorMinimo =
    LECTURAS_ABIERTAS.find((l) => l.id === 'jubilacion.actualizacionFactorMinimo')?.porDefecto ??
    '';
  const modelo = presentarResultado(resultado, {
    sexo: formulario.sexo === 'mujer' ? 'mujer' : 'hombre',
    aplicarMinimos: formulario.aplicarMinimos,
    aplicarPensionMaxima: formulario.aplicarPensionMaxima,
    leerReferencia,
    factorMinimo,
  });
  const comparacion = compararLecturas(
    mapeo.entrada,
    mapeo.configuracion,
    formulario.lecturas,
    fabricaMotor,
  );
  const efectos = resultado.detalle.cumpleRequisitos
    ? efectoPorLectura(mapeo.entrada, mapeo.configuracion, resultado, fabricaMotor)
    : undefined;
  return {
    tipo: 'resultado',
    modelo,
    lecturas: filasDelPanel(efectos, formulario.lecturas),
    comparacion,
    ipcUsado: formulario.ipcSupuesto.trim() === '' ? undefined : formulario.ipcSupuesto.trim(),
    bases: resultado.detalle.basesPeriodo,
    resumenTramos: mapeo.resumenTramos,
    avisosTramos: mapeo.avisosTramos,
  };
}
