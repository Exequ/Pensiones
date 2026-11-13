/**
 * Orquestación del simulador: formulario → entrada del motor → resultado → modelo de vista.
 * Todo con el motor y la lectura de datos inyectados (se prueban sin navegador ni Vite).
 */
import type { ConfiguracionMotor, Motor } from '../../engine/fachada';
import { LECTURAS_ABIERTAS } from '../../engine/lecturas';
import { traducirError, type MensajeError } from './errores';
import { formularioAEntrada } from './mapeador';
import { presentarResultado, type LeerReferencia, type ModeloResultado } from './presentador';
import { efectoPorLectura, filasDelPanel, type LecturaVista } from './supuestos';
import type { ErroresFormulario, FormularioTuPension } from './tipos';

export type RespuestaCalculo =
  | {
      readonly tipo: 'resultado';
      readonly modelo: ModeloResultado;
      readonly lecturas: readonly LecturaVista[];
      /** Escenario de IPC usado, en %, o `undefined` si no se indicó. */
      readonly ipcUsado: string | undefined;
    }
  | { readonly tipo: 'errores-formulario'; readonly errores: ErroresFormulario }
  | { readonly tipo: 'error-motor'; readonly error: MensajeError };

export interface Dependencias {
  readonly fabricaMotor: (configuracion: ConfiguracionMotor) => Motor;
  readonly leerReferencia: LeerReferencia;
}

export function calcularTuPension(
  formulario: FormularioTuPension,
  { fabricaMotor, leerReferencia }: Dependencias,
): RespuestaCalculo {
  const mapeo = formularioAEntrada(formulario);
  if (!mapeo.ok) return { tipo: 'errores-formulario', errores: mapeo.errores };
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
  const efectos = resultado.detalle.cumpleRequisitos
    ? efectoPorLectura(mapeo.entrada, mapeo.configuracion, resultado, fabricaMotor)
    : undefined;
  return {
    tipo: 'resultado',
    modelo,
    lecturas: filasDelPanel(efectos),
    ipcUsado: formulario.ipcSupuesto.trim() === '' ? undefined : formulario.ipcSupuesto.trim(),
  };
}
