/**
 * Palabras de valoración que no deben aparecer en los textos de las páginas «Hucha», «Financiación y
 * déficit», «Otros sistemas» y «Tipos de pensión» (regla c de CLAUDE.md, neutralidad). Lista ampliable; se usa en los tests de neutralidad.
 * Desde la fase «Mitos y realidades» incluye también los términos de veredicto (`PALABRAS_DE_VEREDICTO`).
 */

/**
 * Términos de veredicto: calificar una afirmación como cierta o falsa, o dar la razón a una postura.
 * La página «Mitos y realidades» no emite veredictos (regla c de CLAUDE.md): muestra qué dicen los
 * datos, con qué definición y qué cambia según la definición. Sin tildes, en minúsculas y como inicio
 * de palabra. Solo se admiten el título y el nombre de la sección («Mitos y realidades»), que
 * `valoracionesEn` y `veredictosEn` descartan antes de buscar.
 */
export const PALABRAS_DE_VEREDICTO = [
  'mito',
  'falso',
  'falsa',
  'falsedad',
  'verdader',
  'desmentid',
  'desmient',
  'desmont',
  'desmitific',
  'confirmad',
  'se confirma',
  'refut',
  'bulo',
  'fake',
  'leyenda urbana',
  'falacia',
  'mentira',
  'embuste',
  'tiene razon',
  'no tiene razon',
  'da la razon',
  'da razon',
  'es cierto',
  'es cierta',
  'no es cierto',
  'no es cierta',
  'son ciertos',
  'son ciertas',
  'es verdad',
  'no es verdad',
  'queda demostrad',
  'la realidad es',
] as const;

/** Raíces de las palabras de valoración, sin tildes y en minúsculas. */
export const PALABRAS_DE_VALORACION = [
  'insostenible',
  'agujero',
  'quiebra',
  'bancarrota',
  'rescate',
  'rescatar',
  'no sirve',
  'pozo',
  'despilfarro',
  'derroche',
  'saqueo',
  'expolio',
  'robo',
  'estafa',
  'fraude',
  'desastre',
  'catastrof',
  'colapso',
  'hundimiento',
  'ruina',
  'escandalo',
  'vergonzos',
  'inaceptable',
  'irresponsable',
  'alarmante',
  'preocupante',
  'espectacular',
  'brutal',
  'bomba',
  'pelotazo',
  'chiringuito',
  'parche',
  'insuficiente',
  'excesiv',
  'escasez',
  'privilegi',
  // Ampliación de Ajustes actuariales 2: términos de alarma, de reproche y de elogio que no
  // describen datos, definiciones ni relaciones calculadas.
  'sangria',
  'lastre',
  'hipotecar',
  'burbuja',
  'tragedia',
  'dramatic',
  'peligro',
  'amenaza',
  'inasumible',
  'desbocad',
  'galopante',
  'desmesurad',
  'exorbitant',
  'disparad',
  'se dispara',
  'abusiv',
  'injust',
  'nefast',
  'ruinos',
  'miseria',
  'sablazo',
  'saquear',
  'expoliar',
  'demagog',
  'populis',
  'milagro',
  'ejemplar',
  'modelico',
  'envidiable',
  'sobredimension',
  'infradotad',
  'derrochad',
  'despilfarr',
  'trampa',
  'engano',
  'tapadera',
  'maquillaj',
  // Fase 5-B1: términos de alarma, de tranquilidad o de juicio sobre proyecciones. Las proyecciones
  // se describen con sus supuestos y sus diferencias calculadas, sin anticipar un desenlace.
  'colaps',
  'insostenibilidad',
  'preocupacion',
  'preocuparse',
  'cataclism',
  'apocalip',
  'hecatombe',
  'alarmist',
  'inquietante',
  'sombri',
  'fatidic',
  'inviab',
  'ineludible',
  'inevitable',
  'sin remedio',
  'tranquiliz',
  'alentador',
  'esperanzador',
  'optimista',
  'pesimista',
  // Fase 5-B2: términos que describen el resultado de un modelo financiero con un juicio sobre él
  // (alarma, urgencia, coste «alto» o desenlace anticipado). El resultado se describe con sus
  // supuestos y con comparaciones calculadas («mayor que», «menor que»), sin calificarlo.
  'aviso de tension',
  'senal de alarma',
  'tension financiera',
  'tensiones financieras',
  'agotaria',
  'agotaran',
  'se agota',
  'resulta mas caro',
  'resulta mas costoso',
  'proyecta un coste mas alto',
  'coste mas alto',
  'coste elevado',
  'gasto elevado',
  'deficit estructural',
  'estrangul',
  'asfixi',
  'sobrecarga',
  'sin margen',
  'a la deriva',
  'fuera de control',
  'sostenibilidad en peligro',
  // Ajustes de M4: calificativos de los escenarios de sensibilidad y del desenlace del Fondo. Los
  // escenarios se nombran por sus hipótesis (g e IPC) y se comparan con diferencias calculadas, sin
  // llamarlos favorables o adversos ni anticipar cuándo se acaba el Fondo.
  'agotamiento',
  'mas barato',
  'mas costoso',
  'peor escenario',
  'mejor escenario',
  'escenario favorable',
  'escenario desfavorable',
  'escenario adverso',
  'escenario negativo',
  'escenario positivo',
  'presion financiera',
  'tension en las cuentas',
  // Fase 5-C: términos de ranking valorativo y de juicio sobre sistemas de otros países. Se ordena por
  // la medida mostrada y se describen diferencias calculadas, sin decir qué sistema es mejor, ni
  // cuál debe imitarse, ni quién «gana» o «pierde».
  'mejor sistema',
  'peor sistema',
  'mejores sistemas',
  'peores sistemas',
  'mejor modelo',
  'peor modelo',
  'sistema modelo',
  'modelo a seguir',
  'modelo a imitar',
  'ejemplo a seguir',
  'ejemplo a imitar',
  'referente mundial',
  'referente europeo',
  'a la cola',
  'a la zaga',
  'cola de europa',
  'rezagad',
  'atrasad',
  'lider',
  'campeon',
  'ganador',
  'perdedor',
  'fracas',
  'exitos',
  'mas sostenible',
  'menos sostenible',
  'mas generos',
  'menos generos',
  'mas justo',
  'menos justo',
  'mas eficiente',
  'menos eficiente',
  'ineficien',
  'deberia copiar',
  'deberia imitar',
  'deberia adoptar',
  'deberia seguir',
  'habria que',
  'copiar',
  'imitar',
  // Fase 3-C2: viudedad y orfandad. La persona viuda o huérfana y las pensiones de supervivencia se
  // describen con sus requisitos y sus cifras calculadas, sin presentarlas como un privilegio, una
  // carga o un abuso, ni sugerir merecimiento o necesidad moral.
  'chollo',
  'prebenda',
  'parasit',
  'aprovechad',
  'vividor',
  'desamparad',
  'indefens',
  'inmerecid',
  'merecid',
  'generosa pension',
  'pension generosa',
  'pension miserable',
  'irrisori',
  // Fase «Mitos y realidades»: términos de veredicto.
  ...PALABRAS_DE_VEREDICTO,
] as const;

/**
 * Fase «Reformas»: términos de valoración política o de juicio sobre una norma. La página describe qué
 * cambió cada norma, cuándo y sobre qué parámetro, sin llamarla buena, mala, necesaria, justa o
 * suficiente, sin atribuirle intenciones y sin ordenar las normas por importancia. Sin tildes, en
 * minúsculas y como inicio de palabra. No forman parte de `PALABRAS_DE_VALORACION` (las otras páginas
 * pueden usar, p. ej., «histórica» para una serie de datos); se aplican con `valoracionesReformasEn`.
 * Los títulos oficiales de las normas y las citas literales del BOE no se someten a esta lista porque
 * son el texto de la norma, no el de la página (véase `scripts/reformas-fase.test.ts`).
 */
export const PALABRAS_DE_VALORACION_REFORMAS = [
  'recort',
  'blindaj',
  'blindar',
  'contrarreform',
  'contra-reform',
  'historica',
  'historico',
  'necesaria',
  'necesario',
  'imprescindible',
  'injust',
  'insuficien',
  'suficiente',
  'justa',
  'justo',
  'justicia',
  'drastic',
  'duro golpe',
  'dura reforma',
  'severa',
  'severo',
  'draconian',
  'regresiv',
  'progresiv',
  'ambiciosa',
  'ambicioso',
  'timida',
  'timido',
  'valiente',
  'audaz',
  'tijeretazo',
  'congelacion',
  'congelar',
  'congelad',
  'gran reforma',
  'reforma estructural',
  'reforma profunda',
  'reforma clave',
  'reforma fallida',
  'reforma exitosa',
  'primera gran',
  'hito',
  'avance',
  'retroceso',
  'conquista',
  'sacrific',
  'penaliza',
  'castig',
  'premia',
  'perjudic',
  'beneficia\\b',
  'beneficiosa',
  'favorece',
  'favorable',
  'desfavorable',
  'mejora',
  'empeora',
  'endurece',
  'endurecimiento',
  'suaviza',
  'rebaja',
  'recorta',
  'agrava',
  'alivia',
  'pretende',
  'pretendia',
  'persigue',
  'con el fin de',
  'busca reducir',
  'busca aumentar',
  'con la intencion',
  'intencion de',
  'intencionad',
  'objetivo politico',
  'electoral',
  'partidista',
  'ideolog',
  'mas generosa',
  'menos generosa',
  'mas restrictiva',
  'menos restrictiva',
  'restrictiva',
  'generosa',
] as const;

const normalizar = (t: string): string =>
  t
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Palabras de valoración presentes en un texto (coincidencia al inicio de palabra). */
export function valoracionesEn(texto: string): string[] {
  // «Protocolo de Déficit Excesivo» es el nombre de un procedimiento y «pensiones contributivas en déficit
  // estructural» es la condición literal que fija la norma para disponer del Fondo de Reserva (cita de
  // la cronología de /data), no valoraciones. Fuera de esas expresiones, «déficit estructural» se marca.
  // «Mitos y realidades» es el nombre de la sección y el título de su página: no es un veredicto.
  const t = normalizar(texto)
    .replaceAll('deficit excesivo', '')
    .replaceAll('contributivas en deficit estructural', '')
    .replaceAll(NOMBRE_SECCION_MITOS, '');
  return PALABRAS_DE_VALORACION.filter((p) => new RegExp(`(^|[^a-z])${p}`).test(t));
}

/**
 * Palabras de valoración de la lista general y de la de reformas presentes en un texto (coincidencia
 * al inicio de palabra). Para los textos de la página «Reformas» y de sus datos propios.
 */
export function valoracionesReformasEn(texto: string): string[] {
  const t = normalizar(texto);
  const propias = PALABRAS_DE_VALORACION_REFORMAS.filter((p) =>
    new RegExp(`(^|[^a-z])${p}`).test(t),
  );
  return [...valoracionesEn(texto), ...propias];
}

/** Nombre de la sección, normalizado: se descarta antes de buscar términos de veredicto. */
const NOMBRE_SECCION_MITOS = 'mitos y realidades';

/**
 * Términos de veredicto presentes en un texto. Sirve para las afirmaciones tal como circulan
 * (entrecomilladas), que pueden contener palabras de valoración propias de la afirmación (p. ej.,
 * «insostenibles») pero no términos de veredicto.
 */
export function veredictosEn(texto: string): string[] {
  const t = normalizar(texto).replaceAll(NOMBRE_SECCION_MITOS, '');
  return PALABRAS_DE_VEREDICTO.filter((p) => new RegExp(`(^|[^a-z])${p}`).test(t));
}
