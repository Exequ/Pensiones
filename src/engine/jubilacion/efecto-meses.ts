/**
 * Efecto de adelantar o retrasar la jubilación sobre la pensión (Fase R6): para cada número de
 * meses, el cambio porcentual de la pensión respecto de la jubilación a la edad ordinaria con la
 * misma base reguladora y el mismo porcentaje por años cotizados. Función pura sobre los parámetros
 * de `data/parametros`: no escribe ninguna cifra.
 *
 * Reutiliza las funciones con las que calcula el simulador (`coeficienteReductor`, `tiempoDemora`,
 * `porcentajeAdicional`, `versionEscala` y `tramoCotizacion`), de modo que la tabla y el cálculo no
 * pueden discrepar. No incluye la interacción con la pensión máxima, el complemento a mínimos ni la
 * salvaguarda de la DT 34.ª.
 */
import { porcentajeAdicional, tiempoDemora } from './demora.ts';
import type { ParametrosJubilacion, TablaCoeficientes } from './parametros.ts';
import { coeficienteReductor, versionEscala } from './porcentajes.ts';
import type { LecturasAbiertas } from './tipos.ts';

/** Tramo de cotización acumulada de un cuadro de coeficientes. */
export interface TramoEfecto {
  /** 1 a 4, como en el cuadro de la norma. */
  readonly tramo: 1 | 2 | 3 | 4;
  /** Meses cotizados desde los que se aplica el tramo (0 en el primero). */
  readonly desdeMeses: number;
  /** Meses cotizados hasta los que se aplica (exclusive); `null` en el último. */
  readonly hastaMeses: number | null;
}

export interface EfectoAnticipo {
  readonly tramos: readonly TramoEfecto[];
  /** Máximo de meses de anticipación que admite el cuadro. */
  readonly mesesMaximos: number;
}

export interface FilaEfectoMeses {
  /** Meses de adelanto (anticipada) o de demora (cada fila vale para los dos casos). */
  readonly meses: number;
  /**
   * Cambio de la pensión, en %, de la anticipada voluntaria, por tramo (negativo). `null` si los
   * meses superan lo que admite el cuadro de la modalidad.
   */
  readonly voluntaria: readonly (number | null)[];
  /** Ídem de la anticipada por causa no imputable a la persona trabajadora. */
  readonly involuntaria: readonly (number | null)[];
  /** Porcentaje adicional de la demora, en puntos de la base reguladora. */
  readonly demoraPuntos: number;
  /**
   * Cambio de la pensión por la demora, en %, si el porcentaje por años cotizados es el máximo de
   * la escala vigente: el porcentaje adicional entre ese máximo.
   */
  readonly demoraCambio: number;
}

export interface EfectoMeses {
  readonly filas: readonly FilaEfectoMeses[];
  readonly voluntaria: EfectoAnticipo;
  readonly involuntaria: EfectoAnticipo;
  /** Porcentaje máximo de la escala del año indicado (el de la pensión de referencia en la demora). */
  readonly maximoEscalaPct: number;
  /** Año del hecho causante con el que se elige la versión de la escala. */
  readonly anio: number;
}

/** Máximo de meses de anticipación de un cuadro: el mayor `tramo-meses` de sus identificadores. */
export function mesesMaximosCuadro(tabla: TablaCoeficientes): number {
  let maximo = 0;
  for (const id of tabla.coeficientes.keys()) {
    const m = /^t\d-(\d+)$/.exec(id)?.[1];
    if (m !== undefined) maximo = Math.max(maximo, Number(m));
  }
  return maximo;
}

function tramosDe(tabla: TablaCoeficientes): readonly TramoEfecto[] {
  const [u2, u3, u4] = tabla.umbralesMeses;
  return [
    { tramo: 1, desdeMeses: 0, hastaMeses: u2 },
    { tramo: 2, desdeMeses: u2, hastaMeses: u3 },
    { tramo: 3, desdeMeses: u3, hastaMeses: u4 },
    { tramo: 4, desdeMeses: u4, hastaMeses: null },
  ];
}

/** Cambio de la pensión (negativo) por `meses` de anticipación en cada tramo, o `null` si no cabe. */
function cambiosAnticipo(
  tabla: TablaCoeficientes,
  tramos: readonly TramoEfecto[],
  meses: number,
  maximo: number,
): (number | null)[] {
  if (meses > maximo) return tramos.map(() => null);
  // `desdeMeses` cae dentro de su tramo: es lo que elige `tramoCotizacion` en el motor.
  return tramos.map((t) => -coeficienteReductor(tabla, meses, t.desdeMeses).pct);
}

/**
 * Efecto de 1 a `mesesHasta` meses de adelanto o de demora. `mesesHasta` es, por defecto, el mayor
 * número de meses de anticipación de los dos cuadros. `anio` es el año del hecho causante con el que
 * se elige la versión de la escala (la vigente en la fecha de los datos). `fraccion` es la lectura
 * abierta `jubilacion.fraccionDemora`, la misma que usa el simulador.
 */
export function efectoMesesJubilacion(
  p: ParametrosJubilacion,
  anio: number,
  fraccion: LecturasAbiertas['fraccionDemora'],
  mesesHasta?: number,
): EfectoMeses {
  const tramosVoluntaria = tramosDe(p.coeficientesVoluntaria);
  const tramosInvoluntaria = tramosDe(p.coeficientesInvoluntaria);
  const maxVoluntaria = mesesMaximosCuadro(p.coeficientesVoluntaria);
  const maxInvoluntaria = mesesMaximosCuadro(p.coeficientesInvoluntaria);
  const hasta = mesesHasta ?? Math.max(maxVoluntaria, maxInvoluntaria);
  const maximoEscalaPct = versionEscala(p, anio).maximoPct;
  const filas = Array.from({ length: hasta }, (_, i): FilaEfectoMeses => {
    const meses = i + 1;
    const demoraPuntos = porcentajeAdicional(
      p.reglasDemora,
      tiempoDemora(p.reglasDemora, meses, fraccion),
    );
    return {
      meses,
      voluntaria: cambiosAnticipo(p.coeficientesVoluntaria, tramosVoluntaria, meses, maxVoluntaria),
      involuntaria: cambiosAnticipo(
        p.coeficientesInvoluntaria,
        tramosInvoluntaria,
        meses,
        maxInvoluntaria,
      ),
      demoraPuntos,
      demoraCambio: (demoraPuntos / maximoEscalaPct) * 100,
    };
  });
  return {
    filas,
    voluntaria: { tramos: tramosVoluntaria, mesesMaximos: maxVoluntaria },
    involuntaria: { tramos: tramosInvoluntaria, mesesMaximos: maxInvoluntaria },
    maximoEscalaPct,
    anio,
  };
}
