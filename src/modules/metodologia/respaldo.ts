/**
 * Respaldo de cada apartado de la página «Metodología»: los ficheros del repositorio donde consta lo
 * que el apartado afirma. Cada entrada lleva un fragmento literal (`contiene`) que
 * `scripts/metodologia-fase.test.ts` busca en el fichero: si el fichero cambia y el fragmento
 * desaparece, el test falla. Sin dependencias: lo importan la página y los tests.
 */
export const REPOSITORIO = 'https://github.com/Exequ/Pensiones';

export interface Respaldo {
  /** Ruta desde la raíz del repositorio. */
  readonly fichero: string;
  /** Qué se encuentra en ese fichero (texto visible). */
  readonly para: string;
  /** Fragmento literal que el fichero contiene (comprobado por un test). */
  readonly contiene: string;
}

export const APARTADOS = [
  'datos',
  'comprobaciones',
  'confianza',
  'lecturas',
  'modelos',
  'neutralidad',
  'limites',
  'reproducir',
] as const;

export type IdApartado = (typeof APARTADOS)[number];

export const RESPALDO: Readonly<Record<IdApartado, readonly Respaldo[]>> = {
  datos: [
    {
      fichero: 'data/README.md',
      para: 'Formato de cada fichero de datos: fuente con su dirección, fecha de descarga y confianza.',
      contiene: '"fetchedAt"',
    },
    {
      fichero: 'src/engine/esquema-datos.ts',
      para: 'Esquema que rechaza los datos sin fuente, sin fecha de descarga o sin confianza.',
      contiene: 'confidence debe ser',
    },
    {
      fichero: 'docs/FUENTES.md',
      para: 'Registro de fuentes con organismo, dirección y fecha de descarga, y huella de cada fichero bruto.',
      contiene: 'Huellas de los ficheros brutos',
    },
    {
      fichero: 'docs/DECISIONES.md',
      para: 'Decisiones de la fase «Fuentes desplegables»: cada fuente en un desplegable, sin fecha de descarga ni confianza a la vista.',
      contiene: 'Fase R2 «Fuentes desplegables»',
    },
    {
      fichero: 'src/components/SourceLine.tsx',
      para: 'Componente que muestra la fuente de cada gráfico, tabla y bloque en un desplegable: sin fecha de descarga ni confianza, que constan en los datos.',
      contiene: 'pero la interfaz no las muestra',
    },
    {
      fichero: 'CLAUDE.md',
      para: 'Regla de procedencia: cada dato sale de una fuente descargada durante el trabajo.',
      contiene: 'descargada en la sesión de trabajo',
    },
    {
      fichero: 'docs/PENDIENTE_DATOS.md',
      para: 'Lo que no se ha podido descargar, con la dirección exacta, la fecha y el motivo.',
      contiene: 'Datos pendientes',
    },
    {
      fichero: 'docs/DESCARGAS_MANUALES.md',
      para: 'Documentos que hay que descargar a mano porque la descarga automática no es posible.',
      contiene: 'Descargas manuales',
    },
    {
      fichero: 'scripts/etl/comun.py',
      para: 'Los scripts de extracción leen documentos ya descargados y escriben los ficheros de datos.',
      contiene: 'Los scripts leen documentos ya descargados',
    },
    {
      fichero: 'docs/DECISIONES.md',
      para: 'Los perfiles de ejemplo de «Tu pensión» son de elaboración propia y lo dicen en su fuente.',
      contiene: 'data/ejemplos/personas.json',
    },
    {
      fichero: 'docs/AUDITORIA_DATOS.md',
      para: 'Auditoría de los ficheros de datos: huecos, derivados y confianza baja.',
      contiene: 'Derivados (marcados en título, descripción o notas)',
    },
    {
      fichero: 'src/modules/secciones.ts',
      para: 'Las páginas que convierten a euros constantes nombran el índice de precios usado.',
      contiene: 'euros corrientes y constantes',
    },
  ],
  comprobaciones: [
    {
      fichero: 'scripts/validate-data.ts',
      para: 'Validación del esquema de todos los ficheros de datos y de las afirmaciones.',
      contiene: 'Valida todos los JSON de /data',
    },
    {
      fichero: 'scripts/coherencia-sistema.test.ts',
      para: 'Ejemplo de pruebas de coherencia: sumas, huecos y rangos de los datos reales.',
      contiene: 'sumas por clase, régimen y sexo que igualan al total',
    },
    {
      fichero: 'docs/auditoria-independiente.json',
      para: 'Contraste de series con una segunda fuente, con el resultado de cada una.',
      contiene: 'segundaFuente',
    },
    {
      fichero: 'docs/comprobacion-urls.json',
      para: 'Comprobación de que las direcciones de una muestra de fuentes responden.',
      contiene: '"muestra"',
    },
    {
      fichero: 'docs/DISCREPANCIAS.md',
      para: 'Diferencias entre fuentes y cómo se resolvió cada una.',
      contiene: 'Discrepancias detectadas',
    },
    {
      fichero: 'docs/INFORME_VERIFICACION.md',
      para: 'Informe de verificación de cada fase, con las limitaciones de la verificación.',
      contiene: 'Limitaciones de la verificación',
    },
    {
      fichero: 'docs/INVENTARIO_CASOS_ORO.md',
      para: 'Casos de oro de los motores, con su etiqueta «independiente» o «derivado de la norma».',
      contiene: 'derivado de la norma',
    },
    {
      fichero: 'docs/CONTRASTE_M5.md',
      para: 'Contraste del motor con un modelo simplificado, sin ajustar el motor.',
      contiene: 'No se ha ajustado el motor para que coincida',
    },
    {
      fichero: '.github/workflows/ci.yml',
      para: 'Integración continua: lint, tipos, pruebas, validación de datos, compilación e interfaz.',
      contiene: 'Lint (ESLint, Prettier, estilos y contraste)',
    },
  ],
  confianza: [
    {
      fichero: 'docs/DECISIONES.md',
      para: 'Criterio de confianza en tres conceptos separados (dato, lectura de la norma y salidas de los modelos), confirmado por la cuarta revisión actuarial.',
      contiene: 'Criterio de confianza en tres conceptos',
    },
    {
      fichero: 'docs/AUDITORIA_CONFIANZA.md',
      para: 'Auditoría de la confianza de los datos con ese criterio: casos corregidos y casos dudosos.',
      contiene: 'Auditoría de la confianza',
    },
    {
      fichero: 'docs/DECISIONES.md',
      para: 'La confianza mide la fiabilidad de la fuente; criterio aplicado a los modelos.',
      contiene: 'en el resto de /data mide la fiabilidad de la fuente',
    },
    {
      fichero: 'docs/DECISIONES.md',
      para: 'Datos derivados por el propio proyecto, con confianza «media» y el cálculo en las notas.',
      contiene: 'dato derivado, confianza «media»',
    },
    {
      fichero: 'scripts/etl/fuentes_claims.py',
      para: 'Una afirmación queda «verificada» si la confianza de su fuente es alta.',
      contiene: "'verificada' if conf == 'alta'",
    },
    {
      fichero: 'src/engine/esquema-datos.ts',
      para: 'Estados de revisión actuarial y referencia obligatoria a la respuesta que respalda «revisada».',
      contiene: 'respuestaActuarial debe empezar por',
    },
    {
      fichero: 'docs/REVISION_ACTUARIAL.md',
      para: 'Qué afirmaciones requieren revisión actuarial y qué pregunta se le hace a cada una.',
      contiene: 'no son la transcripción literal de una norma o de una cifra publicada',
    },
    {
      fichero: 'docs/claims.json',
      para: 'Registro de afirmaciones, con su estado de revisión y, si procede, la respuesta o la pregunta.',
      contiene: 'respuestaActuarial',
    },
    {
      fichero: 'docs/DECISIONES_ACTUARIALES.md',
      para: 'Decisiones sobre las lecturas, con su fecha y su motivo, y el calendario de cambios de estado.',
      contiene: 'Ajustes actuariales 3, tercera tanda de la revisión actuarial',
    },
    {
      fichero: 'docs/ESTADO_AJUSTES_ACTUARIALES_1.md',
      para: 'Primera parte de la revisión actuarial, con sus decisiones sobre las lecturas.',
      contiene: 'Revisión actuarial del 14-11-2026',
    },
    {
      fichero: 'docs/ESTADO_AJUSTES_ACTUARIALES_3.md',
      para: 'Tercera tanda de la revisión actuarial: qué se comprobó y qué quedó pendiente.',
      contiene: 'Tercera tanda de la revisión actuarial',
    },
    {
      fichero: 'docs/revision-actuarial/aplicacion-tanda3.json',
      para: 'Una fila por pregunta de la tercera tanda, con su estado final.',
      contiene: 'Aplicación de la tercera tanda',
    },
    {
      fichero: 'scripts/reformas-fase.test.ts',
      para: 'Prueba que limita el número de afirmaciones pendientes y exige su pregunta.',
      contiene: 'toBeLessThanOrEqual(70)',
    },
  ],
  lecturas: [
    {
      fichero: 'src/engine/lecturas.ts',
      para: 'Registro único de las lecturas abiertas, con su descripción, alternativas y estado.',
      contiene: 'es una duda de interpretación de la norma que el motor no decide',
    },
    {
      fichero: 'src/engine/config/lecturas-por-defecto.json',
      para: 'Valor por defecto, estado y fecha de cada lectura.',
      contiene: '«provisional»: decidida con confianza actuarial baja o media',
    },
    {
      fichero: 'docs/DECISIONES_ACTUARIALES.md',
      para: 'Registro de decisiones y significado de los tres estados.',
      contiene: 'Los estados son tres',
    },
    {
      fichero: 'docs/INFORME_VERIFICACION.md',
      para: 'Efecto medido de cada lectura sobre el resultado de un caso típico.',
      contiene: 'Cómo cambia el resultado',
    },
    {
      fichero: 'src/modules/tu-pension/supuestos.ts',
      para: 'Etiqueta y explicación de cada estado tal como se muestran en «Tu pensión».',
      contiene: 'Lectura firme',
    },
    {
      fichero: 'src/modules/como-se-calcula/LecturasQueInfluyen.tsx',
      para: 'Lecturas que influyen en cada prestación, en «Cómo se calcula».',
      contiene: 'filasDelPanel',
    },
  ],
  modelos: [
    {
      fichero: 'modelos/README.md',
      para: 'Los modelos están escritos en Python y los ejecuta el autor en local; no forman parte de la web.',
      contiene: 'no forma parte de la web ni de su CI',
    },
    {
      fichero: 'data/proyecciones/README.md',
      para: 'Metadatos de las salidas publicadas: naturaleza, escenario, confianza y procedencia.',
      contiene: 'naturaleza: "proyeccion-de-modelo"',
    },
    {
      fichero: 'docs/DECISIONES.md',
      para: 'Criterio inicial de la confianza de los modelos, confirmado y precisado después por la cuarta revisión actuarial.',
      contiene: 'media` = modelo con comprobaciones documentadas',
    },
    {
      fichero: 'docs/CONTRASTE_M5.md',
      para: 'Uso del modelo simplificado de reposición para contrastar el motor.',
      contiene: 'Contraste del motor con M5 v2',
    },
  ],
  neutralidad: [
    {
      fichero: 'CLAUDE.md',
      para: 'Política de neutralidad del proyecto.',
      contiene: 'Explicar, no persuadir',
    },
    {
      fichero: 'scripts/lib/valoraciones.ts',
      para: 'Listas de términos de valoración y de veredicto que aplican las pruebas.',
      contiene: 'PALABRAS_DE_VEREDICTO',
    },
    {
      fichero: 'scripts/neutralidad-5a2.test.ts',
      para: 'Prueba de neutralidad de la página de la «hucha».',
      contiene: 'valoracionesEn',
    },
    {
      fichero: 'scripts/mitos-fase.test.ts',
      para: 'Prueba de ausencia de veredictos en «Mitos y realidades».',
      contiene: 'veredictosEn',
    },
    {
      fichero: 'scripts/reformas-fase.test.ts',
      para: 'Prueba de neutralidad de «Reformas» con su propia lista de términos.',
      contiene: 'valoracionesReformasEn',
    },
    {
      fichero: 'docs/ESTADO_AJUSTES_ACTUARIALES_3.md',
      para: 'Principio «la verificación manda»: la opinión experta no es una fuente.',
      contiene: 'La verificación manda',
    },
    {
      fichero: 'docs/GUIA_DE_VOZ.md',
      para: 'Guía de voz de los textos de la web: expresiones que no aparecen fuera de esta página y cómo se sustituyen.',
      contiene: 'Expresiones prohibidas',
    },
    {
      fichero: 'src/app/voz-rutas.test.tsx',
      para: 'Prueba que recorre todas las rutas y falla si aparece una expresión prohibida fuera de la zona permitida.',
      contiene: 'ZONA_PERMITIDA',
    },
  ],
  limites: [],
  reproducir: [
    {
      fichero: 'docs/DECISIONES.md',
      para: 'Registro de que las sensibilidades del modelo financiero las ejecutó el asistente de inteligencia artificial con el código de los modelos, no el autor en local.',
      contiene: 'ejecutado por Claude con el código de los modelos del repositorio',
    },
    {
      fichero: 'README.md',
      para: 'Requisitos y comandos de comprobación.',
      contiene: 'Requiere Node.js',
    },
    {
      fichero: 'package.json',
      para: 'Versión de Node y definición de cada comando.',
      contiene: '"engines"',
    },
    {
      fichero: 'CLAUDE.md',
      para: 'Reglas del proyecto y lista de comandos.',
      contiene: '## Comandos',
    },
    {
      fichero: 'scripts/etl/comun.py',
      para: 'Cómo se ejecutan los scripts de extracción.',
      contiene: 'Ejecutar con `python3 -I`',
    },
    {
      fichero: 'data/README.md',
      para: 'Cómo regenerar el registro de fuentes y de afirmaciones.',
      contiene: 'Regenerar `docs/FUENTES.md`',
    },
    {
      fichero: 'scripts/generador-claims.test.ts',
      para: 'Prueba que comprueba que la regeneración es reproducible.',
      contiene: 'Reproducibilidad del generador',
    },
    {
      fichero: 'data/proyecciones/README.md',
      para: 'Cómo regenerar las salidas de los modelos.',
      contiene: 'Cómo regenerarlos',
    },
    {
      fichero: 'modelos/README.md',
      para: 'Cómo ejecutar los modelos.',
      contiene: 'Ejecución (desde la carpeta de cada modelo)',
    },
  ],
};

/** Qué no hace la web, con el fichero donde consta cada límite. */
export interface Limite {
  readonly texto: string;
  readonly fichero: string;
  readonly contiene: string;
}

export const LIMITES: readonly Limite[] = [
  {
    texto:
      'No predice. Las proyecciones fijan la legislación vigente y unos supuestos explícitos: dicen qué resultaría si nada cambiara, no qué va a ocurrir.',
    fichero: 'data/proyecciones/README.md',
    contiene: 'legislacion: "congelada"',
  },
  {
    texto:
      'No da una cifra oficial de pensión. El resultado de «Tu pensión» es orientativo y la propia página enumera lo que el cálculo no tiene en cuenta.',
    fichero: 'src/modules/secciones.ts',
    contiene: 'por qué el resultado es orientativo',
  },
  {
    texto:
      'No valora las reformas ni les atribuye intenciones o efectos que no consten en la norma o en un dato descargado.',
    fichero: 'src/modules/reformas/Pagina.tsx',
    contiene: 'No valora',
  },
  {
    texto:
      'No emite veredictos sobre las afirmaciones que circulan: muestra los datos y las definiciones con las que se pueden contrastar.',
    fichero: 'src/modules/secciones.ts',
    contiene: 'La página no valora las afirmaciones',
  },
  {
    texto:
      'No explica todavía la revalorización anual de las pensiones en curso, ni tiene una ficha propia de Clases Pasivas.',
    fichero: 'src/modules/secciones.ts',
    contiene: 'La revalorización anual de las pensiones en curso: no se explica en esta página',
  },
  {
    texto:
      'No compara lo cotizado con lo cobrado: faltan los historiales de cotización, y la página solo muestra el marco del cálculo.',
    fichero: 'src/modules/secciones.ts',
    contiene: 'faltan los historiales de cotización',
  },
  {
    texto: 'No es una web del Gobierno ni de ningún organismo, y no usa sus símbolos.',
    fichero: 'CLAUDE.md',
    contiene: 'no es una web del Gobierno',
  },
];
