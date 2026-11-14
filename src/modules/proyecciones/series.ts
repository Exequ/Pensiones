/**
 * Series que usa la página «Proyecciones», construidas a partir de las salidas de los modelos (sin
 * React). Lógica pura y comprobada en `proyecciones.test.ts`.
 */
import type { PuntoAnual } from '../../engine/series-historicas';
import type { FilaModelo } from './datos-proyecciones';

const numero = (f: FilaModelo, columna: string): number => {
  const v = f[columna];
  if (typeof v !== 'number') throw new TypeError(`La columna «${columna}» no es numérica`);
  return v;
};

/** Serie anual de una columna numérica, opcionalmente filtrada (p. ej., un escenario o una clase). */
export function puntosDeColumna(
  filas: readonly FilaModelo[],
  columna: string,
  filtro: (f: FilaModelo) => boolean = () => true,
  columnaAnio = 'anio',
): PuntoAnual[] {
  return filas
    .filter(filtro)
    .map((f) => ({ anio: numero(f, columnaAnio), valor: numero(f, columna) }))
    .sort((a, b) => a.anio - b.anio);
}

/** Valores distintos de una columna de texto, en orden de aparición. */
export function valoresDe(filas: readonly FilaModelo[], columna: string): string[] {
  return [...new Set(filas.map((f) => String(f[columna])))];
}

/** Años distintos de las filas, en orden. */
export function aniosDe(filas: readonly FilaModelo[], columnaAnio = 'anio'): number[] {
  return [...new Set(filas.map((f) => numero(f, columnaAnio)))].sort((a, b) => a - b);
}

/** Pensiones de una clase y un año por grupo de edad y sexo (M3), en el orden de los grupos de edad. */
export interface PensionesPorEdad {
  readonly grupos: readonly string[];
  readonly hombres: readonly number[];
  readonly mujeres: readonly number[];
}

/**
 * Pensiones de una clase (o de todas, con `clase = 'total'`) y un año, por grupo de edad y sexo.
 * Con `total`, suma las cinco clases de cada grupo y sexo.
 */
export function pensionesPorEdadYSexo(
  filas: readonly FilaModelo[],
  clase: string,
  anio: number,
): PensionesPorEdad {
  const delAnio = filas.filter((f) => f['anio'] === anio);
  const grupos = valoresDe(delAnio, 'grupo_edad');
  const suma = (sexo: string, grupo: string): number =>
    delAnio
      .filter(
        (f) =>
          f['sexo'] === sexo &&
          f['grupo_edad'] === grupo &&
          (clase === 'total' || f['clase'] === clase),
      )
      .reduce((acc, f) => acc + numero(f, 'pensiones'), 0);
  return {
    grupos,
    hombres: grupos.map((g) => suma('hombres', g)),
    mujeres: grupos.map((g) => suma('mujeres', g)),
  };
}

/** Suma de pensiones de un año y clase (o total) a partir del detalle por edad y sexo. */
export function totalDeClase(filas: readonly FilaModelo[], clase: string, anio: number): number {
  const p = pensionesPorEdadYSexo(filas, clase, anio);
  return [...p.hombres, ...p.mujeres].reduce((a, b) => a + b, 0);
}

/** Cada valor multiplicado por un factor (cambio de unidades). */
export function escalarPuntos(puntos: readonly PuntoAnual[], factor: number): PuntoAnual[] {
  return puntos.map((p) => ({ anio: p.anio, valor: p.valor * factor }));
}

/** Convierte una serie del Ageing Report en miles a unidades (la fuente publica miles). */
export const MILES = 1000;
