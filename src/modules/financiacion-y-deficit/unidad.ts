/** Unidad en que se muestran los importes de la página: millones de euros o porcentaje del PIB. */
export type Unidad = 'millones' | 'porcentaje';

export interface FormatoUnidad {
  /** Etiqueta del eje vertical. */
  readonly eje: string;
  /** Texto de la unidad para las descripciones. */
  readonly descripcion: string;
  readonly divisor: number;
  readonly decimales: number;
  readonly decimalesEje: number;
}

/** Formato de gráfico (eje, tabla) de cada unidad. */
export function UnidadFinanciera(unidad: Unidad): FormatoUnidad {
  return unidad === 'millones'
    ? {
        eje: 'Miles de millones de euros',
        descripcion: 'millones de euros (el eje, en miles de millones)',
        divisor: 1000,
        decimales: 0,
        decimalesEje: 0,
      }
    : {
        eje: '% del PIB',
        descripcion: 'porcentaje del PIB corriente',
        divisor: 1,
        decimales: 2,
        decimalesEje: 1,
      };
}
