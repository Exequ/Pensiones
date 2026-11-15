/**
 * Datos de la página «Otros sistemas». Único módulo que importa ficheros de /data para esa página;
 * `FICHEROS_OTROS_SISTEMAS` los lista para el test de procedencia.
 */
import contrasteJson from '../../../data/internacional/contraste-espana.json';
import eurostatCsv from '../../../data/internacional/eurostat-indicadores.csv?raw';
import eurostatJson from '../../../data/internacional/eurostat-indicadores.json';
import codigosCsv from '../../../data/internacional/ocde-pag-codigos.csv?raw';
import codigosJson from '../../../data/internacional/ocde-pag-codigos.json';
import ocdeCsv from '../../../data/internacional/ocde-pag.csv?raw';
import ocdeJson from '../../../data/internacional/ocde-pag.json';
import supuestosJson from '../../../data/internacional/ocde-supuestos-reposicion.json';
import sistemasJson from '../../../data/internacional/paises-sistemas.json';
import { Dato, type ArchivoDatos, type DatoConId } from '../../engine/esquema-datos';
import { datoDeArchivo, filasCsv } from '../../engine/series-historicas';
import {
  cargarSerie,
  datoDeTabla,
  memorizar,
  validarArchivo,
  validarTabla,
} from '../historico/cargar';
import type { SerieCargada } from '../historico/cargar';
import {
  observacionesEurostat,
  observacionesOcde,
  type ObsEurostat,
  type ObsOcde,
} from './consultas';
import { FICHEROS_OTROS_SISTEMAS } from './ficheros';

export { FICHEROS_OTROS_SISTEMAS };

/** Un rasgo de la estructura del sistema de un país, con la cita literal de la fuente. */
export interface RasgoSistema {
  readonly id: string;
  readonly pais: string;
  /** Etiqueta en español que sustenta la cita (confianza media). */
  readonly etiqueta: string;
  /** Cita literal en inglés del documento. */
  readonly cita: string;
  readonly ubicacion: string;
  readonly confianza: Dato['confidence'];
  readonly dato: Dato;
}

/** Un supuesto de la tasa de reposición teórica de la OCDE. */
export interface Supuesto {
  readonly id: string;
  readonly valor: number | string;
  readonly unidad: string;
  readonly dato: Dato;
}

/** Cifra derivada de España para el contraste con la OCDE (serie de `contraste-espana`). */
export interface CifraContraste {
  readonly id: string;
  readonly titulo: string;
  readonly unidad: string;
  readonly anio: number;
  readonly valor: number;
  readonly dato: Dato;
}

export interface DatosSistemas {
  readonly ocde: {
    readonly observaciones: readonly ObsOcde[];
    readonly dato: (periodo: string) => Dato;
    /** Literal en inglés de la medida, tal como lo da la fuente (`ocde-pag-codigos`). */
    readonly literalMedida: (codigo: string) => string;
    readonly datoCodigos: Dato;
  };
  readonly eurostat: {
    readonly observaciones: readonly ObsEurostat[];
    readonly dato: (periodo: string) => Dato;
  };
  readonly rasgos: readonly RasgoSistema[];
  readonly supuesto: (id: string) => Supuesto;
  readonly contraste: {
    readonly cifra: (id: string) => CifraContraste;
    readonly serie: (id: string) => SerieCargada;
    readonly dato: (id: string) => Dato;
  };
}

function anioDeSerie(s: SerieCargada): { anio: number; valor: number } {
  const ultimo = s.puntos.at(-1);
  if (!ultimo) throw new Error(`La serie ${s.serie.id} no tiene puntos`);
  return { anio: ultimo.anio, valor: ultimo.valor };
}

function paisDeId(id: string): string {
  const partes = /^sistema-([a-z]{3})-\d+$/.exec(id);
  if (!partes?.[1]) throw new Error(`Identificador de sistema no válido: ${id}`);
  return partes[1].toUpperCase();
}

function rasgo(archivo: ArchivoDatos, d: DatoConId): RasgoSistema {
  if (typeof d.value !== 'string' || d.quote === undefined || d.location === undefined) {
    throw new Error(`El rasgo ${d.id} necesita etiqueta, cita y localización`);
  }
  return {
    id: d.id,
    pais: paisDeId(d.id),
    etiqueta: d.value,
    cita: d.quote,
    ubicacion: d.location,
    confianza: d.confidence,
    dato: datoDeArchivo(archivo, d.id),
  };
}

/** Datos validados con el esquema de /data y memorizados: se leen y validan una sola vez. */
export const datosSistemas = memorizar((): DatosSistemas => {
  const ocdeTabla = validarTabla(ocdeJson);
  const eurostatTabla = validarTabla(eurostatJson);
  const codigosTabla = validarTabla(codigosJson);
  const sistemas = validarArchivo(sistemasJson);
  const supuestos = validarArchivo(supuestosJson);
  const contraste = validarArchivo(contrasteJson);

  const literales = new Map<string, string>();
  for (const f of filasCsv(codigosCsv)) {
    if (
      f['dimension'] === 'MEASURE' &&
      f['codigo'] !== undefined &&
      f['literal_en'] !== undefined
    ) {
      literales.set(f['codigo'], f['literal_en']);
    }
  }

  return {
    ocde: {
      observaciones: observacionesOcde(filasCsv(ocdeCsv)),
      dato: (periodo) => datoDeTabla(ocdeTabla, periodo),
      literalMedida: (codigo) => {
        const l = literales.get(codigo);
        if (l === undefined) throw new Error(`Sin literal para la medida ${codigo}`);
        return l;
      },
      datoCodigos: datoDeTabla(codigosTabla, '2024'),
    },
    eurostat: {
      observaciones: observacionesEurostat(filasCsv(eurostatCsv)),
      dato: (periodo) => datoDeTabla(eurostatTabla, periodo),
    },
    rasgos: (sistemas.data ?? []).map((d) => rasgo(sistemas, d)),
    supuesto: (id) => {
      const d = supuestos.data?.find((x) => x.id === id);
      if (!d) throw new Error(`Falta el supuesto «${id}»`);
      return { id, valor: d.value, unidad: d.unit, dato: datoDeArchivo(supuestos, id) };
    },
    contraste: {
      serie: (id) => cargarSerie(contraste, id),
      cifra: (id) => {
        const s = cargarSerie(contraste, id);
        const { anio, valor } = anioDeSerie(s);
        return { id, titulo: s.serie.title, unidad: s.serie.unit, anio, valor, dato: s.dato };
      },
      dato: (id) => datoDeArchivo(contraste, id),
    },
  };
});

/** Cifra suelta (`data`) de `contraste-espana`: edad de jubilación y meses de carrera. */
export function cifraSuelta(id: string): { valor: number; unidad: string; dato: Dato } {
  const archivo = validarArchivo(contrasteJson);
  const d = archivo.data?.find((x) => x.id === id);
  if (!d || typeof d.value !== 'number') throw new Error(`Falta la cifra «${id}» de contraste`);
  return { valor: d.value, unidad: d.unit, dato: datoDeArchivo(archivo, id) };
}
