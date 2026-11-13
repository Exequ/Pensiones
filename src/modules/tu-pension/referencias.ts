/**
 * Referencias de base de cotización para los tramos de la carrera: series anuales de /data que se
 * expanden año a año (base mínima, base máxima y, para la «base media», varias definiciones de
 * salario que no son intercambiables). Cada una lleva su fuente (`Dato`) y su cobertura.
 *
 * Las definiciones de salario en euros al año se pasan a euros al mes dividiendo entre doce (la base
 * de cotización es mensual); el resultado se redondea al céntimo. Es una conversión de unidades, no
 * una estimación: la serie original está en /data.
 */
import { ArchivoDatos, Dato, type Serie } from '../../engine/esquema-datos.ts';

export type TipoReferencia = 'minima' | 'media' | 'maxima';

/** Identificador de una referencia de base. */
export type IdReferencia =
  'base-minima' | 'base-maxima' | 'media-cotizacion-rg' | 'media-eaes' | 'media-etcl' | 'media-cn';

export interface ReferenciaBase {
  readonly id: IdReferencia;
  readonly tipo: TipoReferencia;
  /** Texto para la interfaz (sin cifras). */
  readonly etiqueta: string;
  /** Euros al mes por año. */
  readonly valores: ReadonlyMap<number, number>;
  readonly primerAnio: number;
  readonly ultimoAnio: number;
  /** Unidad de la serie original (`euros/año` se divide entre doce). */
  readonly unidadOriginal: string;
  readonly dividirEntreDoce: boolean;
  /** Datos con fuente para `SourceLine` (primer y último año de la serie, o la única fuente). */
  readonly datosFuente: readonly Dato[];
  /** Nota de la fuente sobre el concepto y la cobertura (texto de /data). */
  readonly nota: string | undefined;
}

export interface CatalogoReferencias {
  readonly referencias: readonly ReferenciaBase[];
  /** Definición de la «base media» que ya usa el simulador (la de la carrera simple). */
  readonly mediaPorDefecto: IdReferencia;
}

export const ID_MEDIA_POR_DEFECTO: IdReferencia = 'media-cotizacion-rg';

const MESES_POR_ANIO = 12;

/** Euros al mes con dos decimales (los céntimos son la unidad de cotización). */
export const aCentimos = (v: number): number => Math.round(v * 100) / 100;

function datoDeSerie(serie: Serie, period: string, value: number): Dato {
  return Dato.parse({
    value,
    unit: serie.unit,
    period,
    source: serie.source,
    fetchedAt: serie.fetchedAt,
    confidence: serie.confidence,
    ...(serie.notes === undefined ? {} : { notes: serie.notes }),
  });
}

function desdeSerie(
  id: IdReferencia,
  tipo: TipoReferencia,
  etiqueta: string,
  serie: Serie | undefined,
): ReferenciaBase {
  if (!serie) throw new Error(`Falta la serie de la referencia ${id} en /data/macro`);
  const dividir = serie.unit === 'euros/año';
  const valores = new Map<number, number>();
  for (const p of serie.points) {
    valores.set(Number(p.period), aCentimos(dividir ? p.value / MESES_POR_ANIO : p.value));
  }
  const anios = [...valores.keys()].sort((a, b) => a - b);
  const primero = serie.points.find((p) => Number(p.period) === anios[0]);
  const ultimo = serie.points.find((p) => Number(p.period) === anios.at(-1));
  if (!primero || !ultimo) throw new Error(`Serie vacía: ${id}`);
  return {
    id,
    tipo,
    etiqueta,
    valores,
    primerAnio: anios[0] ?? 0,
    ultimoAnio: anios.at(-1) ?? 0,
    unidadOriginal: serie.unit,
    dividirEntreDoce: dividir,
    datosFuente: [datoDeSerie(serie, primero.period, primero.value)],
    nota: serie.notes,
  };
}

/** Base mínima o máxima anual (`data/parametros`): un `Dato` por año, cada uno con la orden de su año. */
function desdeParametro(
  id: 'base-minima' | 'base-maxima',
  tipo: 'minima' | 'maxima',
  etiqueta: string,
  json: unknown,
): ReferenciaBase {
  const archivo = ArchivoDatos.parse(json);
  const datos = [...(archivo.data ?? [])].sort((a, b) => Number(a.period) - Number(b.period));
  const primero = datos[0];
  const ultimo = datos.at(-1);
  if (!primero || !ultimo) throw new Error(`Falta ${id} en /data/parametros`);
  const valores = new Map(datos.map((d) => [Number(d.period), Number(d.value)] as const));
  const { id: _a, ...sinIdPrimero } = primero;
  const { id: _b, ...sinIdUltimo } = ultimo;
  return {
    id,
    tipo,
    etiqueta,
    valores,
    primerAnio: Number(primero.period),
    ultimoAnio: Number(ultimo.period),
    unidadOriginal: primero.unit,
    dividirEntreDoce: false,
    datosFuente: [Dato.parse(sinIdPrimero), Dato.parse(sinIdUltimo)],
    nota: archivo.description,
  };
}

/** Contenido (sin interpretar) de los ficheros de /data que alimentan las referencias. */
export interface FicherosReferencias {
  /** `data/parametros/base-minima-rg.json` */
  readonly baseMinima: unknown;
  /** `data/parametros/base-maxima-rg.json` */
  readonly baseMaxima: unknown;
  /** `data/macro/salario-medio-definiciones.json` */
  readonly salarios: unknown;
}

/**
 * Catálogo con las referencias de /data. Se valida con el esquema al construirse. Recibe los
 * ficheros ya leídos: `referencias-datos.ts` los importa con Vite; los scripts, con `readFileSync`.
 */
export function construirCatalogo(ficheros: FicherosReferencias): CatalogoReferencias {
  const { baseMinima, baseMaxima, salarios } = ficheros;
  const series = ArchivoDatos.parse(salarios).series ?? [];
  const serie = (id: string) => series.find((s) => s.id === id);
  return {
    mediaPorDefecto: ID_MEDIA_POR_DEFECTO,
    referencias: [
      desdeParametro('base-minima', 'minima', 'Base mínima de cotización', baseMinima),
      desdeParametro('base-maxima', 'maxima', 'Base máxima de cotización', baseMaxima),
      desdeSerie(
        'media-cotizacion-rg',
        'media',
        'Base media de cotización del Régimen General (Seguridad Social)',
        serie('base-media-cotizacion-rg-ambos'),
      ),
      desdeSerie(
        'media-eaes',
        'media',
        'Salario medio bruto anual, Encuesta Anual de Estructura Salarial (INE)',
        serie('eaes-ambos'),
      ),
      desdeSerie(
        'media-etcl',
        'media',
        'Coste salarial medio, Encuesta Trimestral de Coste Laboral (INE)',
        serie('etcl-coste-salarial-total'),
      ),
      desdeSerie(
        'media-cn',
        'media',
        'Remuneración por asalariado, Contabilidad Nacional (INE)',
        serie('cn-remuneracion-por-asalariado-puesto'),
      ),
    ],
  };
}

export function buscarReferencia(
  catalogo: CatalogoReferencias,
  id: string,
): ReferenciaBase | undefined {
  return catalogo.referencias.find((r) => r.id === id);
}

/** Referencia del tipo dado: la mínima y la máxima son únicas; la media, la definición elegida. */
export function referenciaDeTipo(
  catalogo: CatalogoReferencias,
  tipo: TipoReferencia,
  definicionMedia: string = catalogo.mediaPorDefecto,
): ReferenciaBase | undefined {
  if (tipo === 'media') return buscarReferencia(catalogo, definicionMedia);
  return catalogo.referencias.find((r) => r.tipo === tipo);
}
