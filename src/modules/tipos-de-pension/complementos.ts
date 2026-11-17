/**
 * Complementos por brecha de género y por maternidad en vigor (Fase 5-A4). Función pura: recibe el
 * contenido ya importado de /data (los CSV y los JSON de `datos-tipos.ts`) y lo estructura. No
 * contiene cifras: los nombres de columna son los del CSV y el resto sale de los datos.
 */
import { ArchivoExtraccionPdf, Dato, type Dato as DatoTipo } from '../../engine/esquema-datos';
import { filasCsv, numeroCsv } from '../../engine/series-historicas';
import { COLUMNAS_TRAMOS_HIJOS } from './ids-datos';

export type Complemento = 'brecha' | 'maternidad';
export type Sexo = 'ambos' | 'hombres' | 'mujeres';
export const SEXOS: readonly Sexo[] = ['ambos', 'hombres', 'mujeres'];

export interface CifrasSexo {
  readonly numero: number;
  readonly importeMedio: number;
  /** Pensiones por tramo de hijos (de menos a más hijos); `null` si el complemento no tiene ese tramo. */
  readonly tramos: readonly (number | null)[];
}

export interface FilaTerritorio {
  readonly territorio: string;
  readonly comunidad: string;
  readonly nivel: 'total' | 'comunidad' | 'provincia';
  readonly porSexo: Readonly<Record<Sexo, CifrasSexo>>;
}

export interface Variacion {
  readonly complemento: Complemento;
  readonly sexo: Sexo;
  readonly mesAbsoluta: number;
  readonly mesPorcentaje: number;
  readonly anioAbsoluta: number;
  readonly anioPorcentaje: number;
}

export interface DatosComplementos {
  readonly filas: Readonly<Record<Complemento, readonly FilaTerritorio[]>>;
  readonly variaciones: readonly Variacion[];
  /** Etiquetas de los tramos de hijos de cada complemento, de menos a más hijos. */
  readonly etiquetasTramos: Readonly<Record<Complemento, readonly string[]>>;
  /** Pensiones sin número de hijos determinado (total menos suma de tramos) por complemento y sexo. */
  readonly sinHijos: Readonly<Record<Complemento, Readonly<Record<Sexo, number>>>>;
  readonly fecha: string;
  readonly dato: DatoTipo;
  readonly datoIndicadores: DatoTipo;
}

const TRAMOS = COLUMNAS_TRAMOS_HIJOS;
const ETIQUETAS: Readonly<Record<Complemento, readonly string[]>> = {
  brecha: ['Un hijo', 'Dos hijos', 'Tres hijos', 'Cuatro o más hijos'],
  maternidad: ['Dos hijos', 'Tres hijos', 'Cuatro o más hijos'],
};

/** Rótulo para mostrar: la fuente escribe alguna comunidad en mayúsculas («GALICIA»); el CSV conserva el literal. */
function rotulo(texto: string): string {
  return texto !== '' && texto === texto.toUpperCase()
    ? texto.charAt(0) + texto.slice(1).toLowerCase()
    : texto;
}

function obligatorio(n: number | null, donde: string): number {
  if (n === null) throw new Error(`Falta la cifra «${donde}» en los complementos`);
  return n;
}

function datoDe(meta: ArchivoExtraccionPdf, unidad: string): DatoTipo {
  return Dato.parse({
    value: meta.filas,
    unit: unidad,
    period: String(meta.origenes[0]?.ejercicio ?? ''),
    source: meta.source,
    fetchedAt: meta.fetchedAt,
    confidence: meta.confidence,
    naturaleza: meta.naturaleza,
    ...(meta.notes === undefined ? {} : { notes: meta.notes }),
  });
}

export function construirComplementos(
  csvTerritorio: string,
  jsonTerritorio: unknown,
  csvIndicadores: string,
  jsonIndicadores: unknown,
): DatosComplementos {
  const meta = ArchivoExtraccionPdf.parse(jsonTerritorio);
  const metaInd = ArchivoExtraccionPdf.parse(jsonIndicadores);
  const crudas = filasCsv(csvTerritorio);
  if (crudas.length !== meta.filas)
    throw new Error('El CSV de complementos no tiene las filas declaradas');

  const construir = (complemento: Complemento): FilaTerritorio[] => {
    const deEste = crudas.filter((f) => f['complemento'] === complemento);
    const ambos = deEste.filter((f) => f['sexo'] === 'ambos');
    return ambos.map((fa, i) => {
      const porSexo = {} as Record<Sexo, CifrasSexo>;
      for (const sexo of SEXOS) {
        const f = deEste.filter((x) => x['sexo'] === sexo)[i];
        if (f === undefined || f['territorio'] !== fa['territorio']) {
          throw new Error(`Los territorios de «${complemento}» no coinciden entre sexos`);
        }
        porSexo[sexo] = {
          numero: obligatorio(numeroCsv(f['numero']), 'numero'),
          importeMedio: obligatorio(numeroCsv(f['importe_medio']), 'importe_medio'),
          tramos: TRAMOS[complemento].map((c) => numeroCsv(f[c])),
        };
      }
      const nivel = fa['nivel'];
      if (nivel !== 'total' && nivel !== 'comunidad' && nivel !== 'provincia') {
        throw new Error(`Nivel desconocido: ${nivel ?? ''}`);
      }
      return {
        territorio: rotulo(fa['territorio'] ?? ''),
        comunidad: rotulo(fa['comunidad'] ?? ''),
        nivel,
        porSexo,
      };
    });
  };
  const filas = { brecha: construir('brecha'), maternidad: construir('maternidad') };

  const sinHijosDe = (complemento: Complemento, sexo: Sexo): number => {
    const total = filas[complemento][0];
    if (total?.nivel !== 'total')
      throw new Error('La primera fila de cada tabla debe ser el total');
    const c = total.porSexo[sexo];
    return c.numero - c.tramos.reduce<number>((a, t) => a + (t ?? 0), 0);
  };
  const sinHijos = {
    brecha: Object.fromEntries(SEXOS.map((s) => [s, sinHijosDe('brecha', s)])) as Record<
      Sexo,
      number
    >,
    maternidad: Object.fromEntries(SEXOS.map((s) => [s, sinHijosDe('maternidad', s)])) as Record<
      Sexo,
      number
    >,
  };

  const ind = filasCsv(csvIndicadores);
  const de = (bloque: string, complemento: Complemento, concepto: string, sexo: Sexo): number => {
    const f = ind.find(
      (x) =>
        x['bloque'] === bloque && x['complemento'] === complemento && x['concepto'] === concepto,
    );
    return obligatorio(numeroCsv(f?.[sexo]), `${bloque}/${complemento}/${concepto}/${sexo}`);
  };
  const variaciones: Variacion[] = [];
  for (const complemento of ['brecha', 'maternidad'] as const) {
    for (const sexo of SEXOS) {
      variaciones.push({
        complemento,
        sexo,
        mesAbsoluta: de('Variación en el último mes', complemento, 'Variación absoluta', sexo),
        mesPorcentaje: de('Variación en el último mes', complemento, 'En %', sexo),
        anioAbsoluta: de('Variación en el último año', complemento, 'Variación absoluta', sexo),
        anioPorcentaje: de('Variación en el último año', complemento, 'En %', sexo),
      });
    }
  }

  return {
    filas,
    variaciones,
    etiquetasTramos: ETIQUETAS,
    sinHijos,
    fecha: meta.fetchedAt,
    dato: datoDe(meta, 'filas de la tabla de territorios'),
    datoIndicadores: datoDe(metaInd, 'filas de la tabla de indicadores'),
  };
}
