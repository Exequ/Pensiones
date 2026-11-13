/**
 * Registro único de las lecturas abiertas de todos los motores (jubilación, incapacidad
 * permanente, supervivencia, pensiones no contributivas y MEI).
 *
 * Una «lectura abierta» es una duda de interpretación de la norma que el motor no decide: está
 * implementada como una opción explícita con un valor por defecto (la lectura más sencilla,
 * documentada en docs/DECISIONES.md) y una o varias alternativas. Este módulo:
 *
 * - lista cada lectura con su identificador, una descripción en lenguaje llano, el valor por
 *   defecto, su estado y su fecha **leídos de `config/lecturas-por-defecto.json`** (de ahí leen también
 *   las constantes de cada motor; no se repiten aquí), las alternativas, la
 *   referencia al efecto medido en docs/INFORME_VERIFICACION.md y el id de la pregunta de
 *   docs/REVISION_ACTUARIAL.md (campo `id` de docs/claims.json);
 * - valida y traduce una configuración (`{ 'jubilacion.baseMaxima': 'sobre-cifra-inicial' }`) a las
 *   opciones de cada motor.
 *
 * Los valores por defecto los decide Sergio tras la revisión actuarial: este módulo no los cambia.
 * Las descripciones no llevan cifras (lo comprueba un test), para poder mostrarse en la interfaz.
 */
import { entradaDeLectura } from './config/lecturas-por-defecto.ts';

export type MotorLectura =
  'jubilacion' | 'incapacidad' | 'supervivencia' | 'no-contributivas' | 'mei';

export interface LecturaAbierta {
  /** `motor.opcion`, p. ej. `jubilacion.baseMaxima`. */
  readonly id: string;
  readonly motor: MotorLectura;
  /** Nombre de la opción en el motor. */
  readonly opcion: string;
  /** En lenguaje llano, sin cifras. */
  readonly descripcion: string;
  /** Valor por defecto, leído de `config/lecturas-por-defecto.json`. */
  readonly porDefecto: string;
  /** `pendiente` (lo decide Sergio) o `decidida` (registrada en docs/DECISIONES_ACTUARIALES.md). */
  readonly estado: 'pendiente' | 'decidida';
  /** Fecha (`AAAA-MM-DD`) del último cambio de estado. */
  readonly fechaEstado: string;
  readonly alternativas: readonly string[];
  /** Dónde está el efecto medido: sección de docs/INFORME_VERIFICACION.md y fila de su tabla. */
  readonly efecto: {
    readonly informe: 'docs/INFORME_VERIFICACION.md';
    readonly seccion: string;
    readonly fila: string;
  };
  /** Id de la afirmación de docs/claims.json cuya pregunta está en docs/REVISION_ACTUARIAL.md. */
  readonly preguntaActuarial: string;
}

const INFORME = 'docs/INFORME_VERIFICACION.md' as const;
const S_2A =
  'Fase 2-A: motor de cálculo de la jubilación › Cómo cambia el resultado de un caso típico con cada lectura abierta';
const S_2B1 =
  'Fase 2-B-1: motor de la incapacidad permanente › Cómo cambia el resultado con cada lectura abierta';
const S_2B2 =
  'Fase 2-B-2: motor de muerte y supervivencia › Cómo cambia el resultado con cada lectura abierta';
const S_2B3 =
  'Fase 2-B-3: pensiones no contributivas y MEI › Cómo cambia el resultado con cada lectura abierta';

function lectura(
  motor: MotorLectura,
  opcion: string,
  descripcion: string,
  alternativas: readonly string[],
  seccion: string,
  fila: string,
  preguntaActuarial: string,
): LecturaAbierta {
  const id = `${motor}.${opcion}`;
  const config = entradaDeLectura(id);
  return {
    id,
    motor,
    opcion,
    descripcion,
    porDefecto: config.valor,
    estado: config.estado,
    fechaEstado: config.fecha,
    alternativas,
    efecto: { informe: INFORME, seccion, fila },
    preguntaActuarial,
  };
}

export const LECTURAS_ABIERTAS: readonly LecturaAbierta[] = [
  // Jubilación (Fase 2-A)
  lectura(
    'jubilacion',
    'baseMaxima',
    'Cómo se aplican los incrementos adicionales de la base máxima de cotización: año a año sobre la cifra del año anterior, o sumados sobre la cifra inicial.',
    ['compuesto', 'sobre-cifra-inicial'],
    S_2A,
    '(a) DT 38.ª, base máxima',
    'param-base-maxima-incremento-futuro',
  ),
  lectura(
    'jubilacion',
    'pensionMaxima',
    'Cómo crece el límite de la pensión máxima con el incremento adicional anual: una cantidad fija cada año o una que va creciendo.',
    ['compuesto', 'incremento-creciente'],
    S_2A,
    '(a) DT 39.ª, pensión máxima',
    'param-pension-maxima-incremento-futuro',
  ),
  lectura(
    'jubilacion',
    'referenciaBaseMinimaLagunas',
    'Con qué base mínima se rellenan los meses sin cotización: la del mes en que ocurrió o la del momento de la jubilación.',
    ['mes-de-la-laguna', 'hecho-causante'],
    S_2A,
    '(b) lagunas, base mínima',
    'param-lagunas-integracion',
  ),
  lectura(
    'jubilacion',
    'opcion25EnUltimoDia2040',
    'Si el último día en que rige la opción de contar más años de cotización queda dentro o fuera de ella.',
    ['incluida', 'excluida'],
    S_2A,
    '(c) opción de 25 años el 31/12/2040',
    'param-opcion-25-anos-ventana',
  ),
  lectura(
    'jubilacion',
    'lagunasAnterioresAlPrimerAlta',
    'Qué se hace con los meses sin cotización anteriores al primer alta dentro del periodo de cálculo: rellenarlos o ignorarlos.',
    ['integrar', 'ignorar'],
    S_2A,
    '(d) lagunas anteriores a la primera alta',
    'param-lagunas-integracion',
  ),
  lectura(
    'jubilacion',
    'interpolacionIPC',
    'Cómo se obtiene el índice de precios de cada mes a partir de las medias anuales: suavizado entre años o en escalones.',
    ['interpolada', 'escalon-anual'],
    S_2A,
    '(d) IPC mensual',
    'param-actualizacion-bases',
  ),
  lectura(
    'jubilacion',
    'fraccionDemora',
    'Desde cuándo cuentan las fracciones de año de la demora en la jubilación: desde el segundo año completo o desde el primero.',
    ['desde-segundo-anio', 'desde-primer-anio'],
    S_2A,
    '(d) fracción de la demora',
    'param-jubilacion-demora-reglas',
  ),
  lectura(
    'jubilacion',
    'maximaDesde2051',
    'Cómo se lee la tabla de incrementos de la pensión máxima de los últimos años del calendario legal: como incremento acumulado total o como incremento anual literal.',
    ['incremento-acumulado', 'incremento-anual-literal'],
    S_2A,
    '(d) pensión máxima desde 2051',
    'param-pension-maxima-incremento-2051-2065',
  ),
  // Incapacidad permanente (Fase 2-B-1)
  lectura(
    'incapacidad',
    'edadFiccion',
    'Qué edad ordinaria de jubilación se usa para añadir los años que faltan hasta ella en la base de la incapacidad: la que resulta de la carrera proyectada o la general.',
    ['carrera-proyectada', 'edad-general'],
    S_2B1,
    '(a) edad de la ficción (art. 197.1.b)',
    'param-incapacidad-permanente-reglas',
  ),
  lectura(
    'incapacidad',
    'computoFiccion',
    'Cómo se cuentan los años que le restan al trabajador hasta la edad de jubilación: por meses completos o por años completos.',
    ['meses', 'anios-completos'],
    S_2B1,
    '(b) años añadidos por meses o años completos',
    'param-incapacidad-permanente-reglas',
  ),
  lectura(
    'incapacidad',
    'divisorPeriodoCorto',
    'Qué divisor se usa en el periodo corto de la base reguladora: el coeficiente del reglamento o la proporción de catorce doceavos.',
    ['coeficiente-rd-1799-1985', 'catorce-doceavos'],
    S_2B1,
    '(d) divisor del periodo corto (art. 197.2)',
    'param-incapacidad-permanente-reglas',
  ),
  lectura(
    'incapacidad',
    'lagunasAccidenteNoLaboral',
    'En el accidente no laboral, qué se hace con los meses sin cotizar dentro del periodo elegido: contarlos como cero o rellenarlos con la base mínima.',
    ['sin-integrar', 'integrar'],
    S_2B1,
    '(e) meses sin cotizar en el accidente no laboral',
    'param-incapacidad-permanente-reglas',
  ),
  lectura(
    'incapacidad',
    'redondeoEdadCarencia',
    'Cómo se mide la edad para el periodo mínimo de cotización: en meses cumplidos o redondeada a medios años como decía el reglamento.',
    ['sin-redondeo', 'medio-anio'],
    S_2B1,
    '(c) redondeo de la edad a medios años (RD 1799/1985)',
    'param-incapacidad-permanente-reglas-carencia',
  ),
  lectura(
    'incapacidad',
    'diasCotizadosParcial',
    'Cómo se cuentan los días cotizados de cada mes en la incapacidad parcial: días naturales o treinta por mes.',
    ['naturales', 'treinta-por-mes'],
    S_2B1,
    '(f) días cotizados de la parcial',
    'param-incapacidad-permanente-reglas-carencia',
  ),
  // Supervivencia (Fase 2-B-2)
  lectura(
    'supervivencia',
    'ventanaBaseReguladora',
    'Hasta qué mes llega el periodo de quince años para elegir la base reguladora: hasta el mes anterior al mes previo al fallecimiento, o hasta el mes anterior al fallecimiento.',
    ['anterior-al-mes-previo', 'decreto-1646-1972'],
    S_2B2,
    '(a) ventana de la base reguladora',
    'param-supervivencia-reglas',
  ),
  lectura(
    'supervivencia',
    'diasCotizados',
    'Cómo se cuentan los días cotizados para el periodo previo exigido al causante: días naturales o treinta por mes.',
    ['naturales', 'treinta-por-mes'],
    S_2B2,
    '(b) días cotizados para los 500 días',
    'param-supervivencia-reglas',
  ),
  lectura(
    'supervivencia',
    'carenciaOrfandad',
    'Si la pensión de orfandad exige un periodo previo de cotización al causante en alta: no lo exige la ley vigente, pero sí lo exigía un reglamento anterior.',
    ['sin-carencia', 'rd-1647-1997'],
    S_2B2,
    '(c) periodo previo de la orfandad',
    'param-supervivencia-reglas',
  ),
  lectura(
    'supervivencia',
    'carenciaFamiliaresAccidenteNoLaboral',
    'Si el favor de familiares exige periodo previo cuando la muerte se debe a un accidente no laboral: lo exige la orden reglamentaria o queda exento como en la viudedad.',
    ['exigir', 'exenta'],
    S_2B2,
    '(d) familiares y accidente no laboral',
    'param-supervivencia-reglas',
  ),
  lectura(
    'supervivencia',
    'reduccionViudedad70',
    'Si la reducción de la pensión de viudedad con cargas familiares por superar el límite de rentas puede dejarla por debajo del porcentaje general.',
    ['no-inferior-52', 'sin-suelo'],
    S_2B2,
    '(f) reducción del 70 %',
    'param-supervivencia-reglas-cuantia',
  ),
  lectura(
    'supervivencia',
    'comparacionCompensatoria',
    'Cómo se compara la pensión de viudedad de una persona divorciada con su pensión compensatoria: en importes anuales o mensuales.',
    ['anual', 'mensual'],
    S_2B2,
    '(e) comparación con la compensatoria',
    'param-supervivencia-reglas-cuantia',
  ),
  lectura(
    'supervivencia',
    'incrementoFamiliares',
    'Si los familiares reciben el incremento del porcentaje de viudedad cuando no queda cónyuge superviviente.',
    ['porcentaje-viudedad', 'sin-incremento'],
    S_2B2,
    '(g) incremento de familiares sin viudo',
    'param-supervivencia-reglas-cuantia',
  ),
  lectura(
    'supervivencia',
    'reduccionLimiteConjunto',
    'Qué pensiones se reducen cuando la suma de viudedad y orfandad supera la base reguladora: solo las de orfandad o todas en proporción.',
    ['orfandad', 'proporcional'],
    S_2B2,
    '(h) reducción por el límite conjunto',
    'param-supervivencia-reglas-limites',
  ),
  // Pensiones no contributivas (Fase 2-B-3)
  lectura(
    'no-contributivas',
    'baseRentasCompatibles',
    'Sobre qué cuantía se calcula el porcentaje de rentas compatibles con la pensión no contributiva cuando hay varios beneficiarios: la cuantía íntegra o la de cada beneficiario.',
    ['cuantia-integra', 'cuantia-por-beneficiario'],
    S_2B3,
    '(a) base del 35 % de las rentas',
    'param-pnc-reglas',
  ),
  lectura(
    'no-contributivas',
    'limiteTrabajo',
    'Qué cantidad se suma al indicador de renta en el límite de la pensión de incapacidad no contributiva compatible con un trabajo: la cuantía íntegra o la pensión reconocida.',
    ['cuantia-integra', 'pension-reconocida'],
    S_2B3,
    '(b) límite del art. 366',
    'param-pnc-reglas',
  ),
  lectura(
    'no-contributivas',
    'rentasConTrabajoEnCuatroAnios',
    'Si durante los primeros años de una actividad el límite especial de compatibilidad sustituye a la reducción general por rentas o se aplican las dos.',
    ['sustituye-364-2', 'se-suman'],
    S_2B3,
    '(c) rentas del trabajo en los cuatro primeros años',
    'param-pnc-reglas',
  ),
  lectura(
    'no-contributivas',
    'limiteConTerceraPersona',
    'Con derecho al complemento por necesitar a otra persona, si el límite de recursos de la unidad económica se calcula sobre la cuantía con el complemento (como aplica el organismo gestor) o solo sobre la cuantía íntegra.',
    ['con-complemento', 'sin-complemento'],
    S_2B3,
    '(d) límite de acumulación con tercera persona',
    'param-pnc-reglas',
  ),
  // MEI (Fase 2-B-3)
  lectura(
    'mei',
    'baseMEI',
    'Sobre qué base se aplica el tipo del MEI: la base de cotización por contingencias comunes o la retribución completa, incluido lo que supera la base máxima.',
    ['base-cotizacion', 'retribucion-completa'],
    S_2B3,
    '(e) base del MEI',
    'param-mei-reglas',
  ),
];

/** Configuración: `{ 'jubilacion.baseMaxima': 'sobre-cifra-inicial', … }`. */
export type ConfiguracionLecturas = Readonly<Record<string, string>>;

export function lecturaPorId(id: string): LecturaAbierta | undefined {
  return LECTURAS_ABIERTAS.find((l) => l.id === id);
}

/** Valor por defecto de cada lectura (los de las constantes de cada motor). */
export function valoresPorDefecto(): Record<string, string> {
  return Object.fromEntries(LECTURAS_ABIERTAS.map((l) => [l.id, l.porDefecto]));
}

/** Errores de la configuración: ids desconocidos y valores que no son alternativas de la lectura. */
export function erroresConfiguracion(config: ConfiguracionLecturas): string[] {
  const errores: string[] = [];
  for (const [id, valor] of Object.entries(config)) {
    const l = lecturaPorId(id);
    if (l === undefined) errores.push(`Lectura desconocida: ${id}`);
    else if (!l.alternativas.includes(valor)) {
      errores.push(`${id}: «${valor}» no es una alternativa (${l.alternativas.join(', ')})`);
    }
  }
  return errores;
}

/** Valores efectivos: los de por defecto sobrescritos por la configuración (que se valida). */
export function resolverLecturas(config: ConfiguracionLecturas = {}): Record<string, string> {
  const errores = erroresConfiguracion(config);
  if (errores.length > 0)
    throw new RangeError(`Configuración de lecturas no válida: ${errores.join('; ')}`);
  return { ...valoresPorDefecto(), ...config };
}

/** Opciones de un motor (solo las lecturas que la configuración cambia respecto al defecto). */
export function lecturasDelMotor(
  motor: MotorLectura,
  config: ConfiguracionLecturas = {},
): Record<string, string> {
  const efectivas = resolverLecturas(config);
  const salida: Record<string, string> = {};
  for (const l of LECTURAS_ABIERTAS) {
    const v = efectivas[l.id];
    if (l.motor === motor && v !== undefined && v !== l.porDefecto) salida[l.opcion] = v;
  }
  return salida;
}
