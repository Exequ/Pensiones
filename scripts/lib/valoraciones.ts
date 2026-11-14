/**
 * Palabras de valoración que no deben aparecer en los textos de las páginas «Hucha» y «Financiación y
 * déficit» (regla c de CLAUDE.md, neutralidad). Lista ampliable; se usa en los tests de neutralidad.
 */

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
  const t = normalizar(texto)
    .replaceAll('deficit excesivo', '')
    .replaceAll('contributivas en deficit estructural', '');
  return PALABRAS_DE_VALORACION.filter((p) => new RegExp(`(^|[^a-z])${p}`).test(t));
}
