export interface EntradaIndice {
  readonly id: string;
  readonly titulo: string;
  readonly resumen: string;
}

/** Apartados de la página, en orden: el índice y las secciones comparten los identificadores. */
export const APARTADOS_INDICE: readonly EntradaIndice[] = [
  {
    id: 'met-datos',
    titulo: 'De dónde salen los datos',
    resumen: 'Fuentes, descarga, fecha y confianza.',
  },
  {
    id: 'met-comprobaciones',
    titulo: 'Cómo se comprueban',
    resumen: 'Validaciones, contrastes, discrepancias y casos de oro.',
  },
  {
    id: 'met-confianza',
    titulo: 'Qué significa la confianza y la revisión actuarial',
    resumen: 'Niveles, estados y calendario de las tandas, con las pendientes.',
  },
  {
    id: 'met-lecturas',
    titulo: 'Lecturas del motor',
    resumen: 'Qué son, sus tres estados y su recuento.',
  },
  {
    id: 'met-modelos',
    titulo: 'Los modelos de proyección',
    resumen: 'Qué responde cada uno, qué supone y qué límites tiene.',
  },
  {
    id: 'met-neutralidad',
    titulo: 'Neutralidad y verificación',
    resumen: 'La política y las pruebas que la comprueban.',
  },
  {
    id: 'met-limites',
    titulo: 'Qué no hace esta web',
    resumen: 'Límites que constan en el repositorio.',
  },
  {
    id: 'met-reproducir',
    titulo: 'Cómo reproducirlo',
    resumen: 'Repositorio, comandos y extracción de datos.',
  },
];
