/**
 * Texto propio de la página sobre cada modelo de proyección, resumido de `docs/modelos/` sin cifras
 * de resultados y sin las frases valorativas de las descripciones. La clave es el identificador del
 * modelo tal como lo calcula `calcularRecuentos` (de los nombres de los ficheros de `docs/modelos/`);
 * el título, la confianza y la fecha salen de los recuentos, no de aquí.
 */
export interface TextoModelo {
  /** Qué pregunta responde. */
  readonly responde: string;
  /** Hipótesis principales, en lenguaje llano. */
  readonly hipotesis: readonly string[];
  /** Qué indica la descripción o los metadatos sobre su fiabilidad. */
  readonly fiabilidad: string;
  /** Límites que declara su descripción. */
  readonly limites: readonly string[];
  /**
   * Fragmentos literales de `docs/modelos/<modelo>_descripcion.md` que respaldan el texto
   * (los comprueba `scripts/metodologia-fase.test.ts`).
   */
  readonly respaldo: readonly string[];
}

export const TEXTOS_MODELOS: Readonly<Record<string, TextoModelo>> = {
  M1: {
    responde:
      'Cuántas personas habrá en España cada año, por sexo y edad, y cómo cambia esa población si cambian los nacimientos, la esperanza de vida o la inmigración. Es la base de los demás modelos.',
    hipotesis: [
      'Método de cohortes-componentes: la población de partida avanza un año cada vez, con fallecimientos, migraciones y nacimientos.',
      'Las hipótesis de fecundidad, mortalidad y migración son las de las proyecciones del INE, que se usan como escenario base. No son predicciones: son escenarios.',
    ],
    fiabilidad:
      'Su descripción documenta un contraste con la proyección del INE y una prueba hacia atrás con datos observados. Sus ficheros llevan la confianza que indica la tabla.',
    limites: [
      'No modela la economía ni el empleo.',
      'La mortalidad del último tramo de edad está aproximada y no hay estructura por nacionalidad, región ni estado civil.',
      'Las migraciones del pasado vienen de dos series del INE que no encajan del todo en un año de cambio de metodología.',
      'Lo posterior al horizonte de presentación debe leerse como ilustrativo.',
    ],
    respaldo: ['cohortes-componentes', 'No modela la economía ni el empleo'],
  },
  M2: {
    responde:
      'Cuántas personas estarán afiliadas y cotizando si cambia la demografía, y cuánto cotizarían en conjunto. Es la otra mitad de la ecuación: el modelo de pensiones cuenta las pensiones y este cuenta a quienes las financian.',
    hipotesis: [
      'Aplica a la población que proyecta el modelo demográfico las proporciones de afiliación y de cotización observadas en el último año, que se mantienen constantes.',
      'La base de cotización media de cada tramo de edad crece con el salario real y con los precios, que son dos parámetros del escenario.',
      'La recaudación es la de contingencias comunes del Régimen General: la base total por el tipo vigente.',
    ],
    fiabilidad:
      'Su descripción lo presenta como versión preliminar, con tasas constantes y tareas pendientes declaradas; sus ficheros llevan la confianza que indica la tabla.',
    limites: [
      'Tasas constantes, sin ciclo económico ni paro.',
      'Autónomos y otros regímenes solo entran en los afiliados totales, sin su recaudación.',
      'Sin topes de base ni bases mínimas por persona.',
      'Legislación congelada.',
    ],
    respaldo: ['Tasas constantes sin ciclo económico ni paro', 'Pendiente: incorporar el RETA'],
  },
  M3: {
    responde:
      'Cuántas pensiones contributivas habrá cada año, por clase, sexo y edad, si la proporción de personas de cada edad que cobra cada tipo de pensión se mantiene como hoy. Mide cuántas pensiones hay que pagar, no cuánto cuestan.',
    hipotesis: [
      'Parte de la situación real de las pensiones en vigor en una fecha, por clase, sexo y grupo de edad de cinco años, y la divide entre la población de cada grupo.',
      'Aplica esas proporciones a la población que proyecta el modelo demográfico.',
    ],
    fiabilidad:
      'Su descripción documenta un contraste con las proyecciones de la Comisión Europea y una comprobación de las bajas con los registros de la Seguridad Social. Sus ficheros llevan la confianza que indica la tabla.',
    limites: [
      'La proporción es constante: no recoge reformas ni cambios en la edad efectiva de jubilación.',
      'No hay importes: no dice cuánto cobra cada pensión.',
      'No distingue la jubilación anticipada de la demorada.',
      'Los grupos de edad son de cinco años y dentro de cada grupo se reparte como la población.',
    ],
    respaldo: ['No hay importes', 'La prevalencia es constante'],
  },
  M4: {
    responde:
      'Cuánto costarían las pensiones contributivas, cuánto ingresaría el sistema, qué saldo quedaría y cuánto duraría el Fondo de Reserva, con la legislación actual congelada. Junta los tres modelos anteriores.',
    hipotesis: [
      'Gasto: pensiones de cada clase por pensión media por las pagas anuales, con un factor de calibración de cada clase que se mantiene constante.',
      'Ingresos: cotizaciones (que incluyen el Mecanismo de Equidad Intergeneracional), transferencias del Estado y otros ingresos.',
      'Saldo: se muestran tres medidas. El Fondo de Reserva se nutre del Mecanismo de Equidad Intergeneracional y puede cubrir déficit con un límite legal anual.',
      'Está calibrado con la ejecución presupuestaria del último año observado. Hay escenarios de crecimiento salarial y de precios, y sensibilidades que cambian una palanca cada vez.',
    ],
    fiabilidad:
      'Su descripción indica una fiabilidad media y que hereda la incertidumbre del modelo de cotizantes (fiabilidad baja), del demográfico y del de pensiones; la calibración fija el punto de partida, no la trayectoria. Con el criterio de esta página sus ficheros llevan confianza baja: el contraste con la proyección de la Comisión Europea no tiene una tolerancia escrita.',
    limites: [
      'Legislación congelada y sin ciclo económico.',
      'El PIB es un indicador aproximado, no una previsión macroeconómica.',
      'El Mecanismo de Equidad Intergeneracional solo se modela hasta el último año que fija la norma.',
      'La pensión de las altas sigue las reglas del modelo de reposición solo para dos perfiles de carrera, no para la distribución real de salarios.',
    ],
    respaldo: [
      'asegura el punto de partida, no la trayectoria',
      'Legislación congelada; autónomos solo dentro de los totales',
    ],
  },
  M5: {
    responde:
      'Si una persona con una carrera concreta se jubila en un año determinado y la ley sigue como está hoy, con sus calendarios de transición, qué pensión inicial cobra y qué parte de su sueldo representa.',
    hipotesis: [
      'Construye una carrera con un salario que crece cada año en términos reales a un ritmo dado y decide la edad de jubilación según la longitud de la carrera.',
      'Calcula la base reguladora, el porcentaje según los años cotizados y la pensión en catorce pagas, y compara esa pensión con el salario.',
      'No es una previsión: es un cálculo de lo que sale si la ley no cambia.',
    ],
    fiabilidad:
      'No tiene ficheros ni metadatos de confianza en /data. Su descripción advierte que las carreras con pocos años cotizados dan un resultado que no debe tomarse como fiable.',
    limites: [
      'No rellena las lagunas de cotización, por lo que en las carreras cortas la base reguladora sale más baja que la real.',
      'Sin base máxima, pensión máxima ni mínimas; todo en euros constantes.',
      'Sin jubilación anticipada ni demorada.',
      'Mantiene el último valor conocido de cada parámetro para los años posteriores al último dato.',
    ],
    respaldo: ['resultado no fiable', 'Sin topes'],
  },
  M6: {
    responde:
      'Qué pensión cobraría y qué rendimiento obtendría por lo que cotiza la misma persona, con la misma carrera y la misma cotización, en un sistema de cuentas nocionales en lugar del español.',
    hipotesis: [
      'Cada mes se anota en una cuenta virtual un porcentaje del salario, y el saldo crece cada año a un tipo nocional.',
      'Al jubilarse, el saldo se divide entre un divisor de anualidad que depende de la esperanza de vida: más esperanza de vida, pensión inicial menor para el mismo saldo.',
      'Durante la jubilación, la pensión se actualiza según el tipo nocional menos un tipo de referencia.',
    ],
    fiabilidad:
      'No tiene ficheros ni metadatos de confianza en /data. Su descripción advierte que la mortalidad que usa es provisional y que todos sus resultados dependen de ella.',
    limites: [
      'El tipo de cotización total es un límite superior de lo que corresponde a pensiones, porque financia también otras prestaciones.',
      'Sin topes ni lagunas, sin viudedad, incapacidad ni complementos, y sin el mecanismo de equilibrio financiero del sistema sueco.',
      'La tasa interna de rendimiento compara solo la pensión de jubilación de una persona: no dice nada del conjunto del sistema.',
    ],
    respaldo: ['La mortalidad es provisional', 'límite superior'],
  },
};
