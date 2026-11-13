/**
 * Datos de /data que usa la página «Tu pensión» fuera del motor: el valor sugerido de la base de
 * cotización y el IPC supuesto por defecto. Cada uno con su fuente (se muestran con `SourceLine`).
 * Se validan con el esquema de /data al cargar; si la estructura cambia, falla aquí y no en pantalla.
 */
import salarios from '../../../data/macro/salario-medio-definiciones.json';
import supuestosOcde from '../../../data/internacional/ocde-supuestos-reposicion.json';
import { ArchivoDatos, Dato, type Dato as DatoTipo } from '../../engine/esquema-datos';

const ID_SERIE_BASE = 'base-media-cotizacion-rg-ambos';
const ID_IPC_OCDE = 'ocde-pag-2025-inflacion-base';

export interface SugerenciaBase {
  /** Euros al mes. */
  readonly valor: number;
  readonly periodo: string;
  readonly dato: DatoTipo;
}

export interface SupuestoIpc {
  /** Porcentaje anual (2 = 2 %). */
  readonly porcentaje: number;
  readonly dato: DatoTipo;
}

/** Base media de cotización por contingencias comunes del Régimen General en el último año completo. */
export function sugerenciaBase(): SugerenciaBase {
  const archivo = ArchivoDatos.parse(salarios);
  const serie = archivo.series?.find((s) => s.id === ID_SERIE_BASE);
  const punto = serie?.points.at(-1);
  if (!serie || !punto) throw new Error(`Falta la serie ${ID_SERIE_BASE} en /data/macro`);
  return {
    valor: punto.value,
    periodo: punto.period,
    dato: Dato.parse({
      value: punto.value,
      unit: serie.unit,
      period: punto.period,
      source: serie.source,
      fetchedAt: serie.fetchedAt,
      confidence: serie.confidence,
      ...(serie.notes === undefined ? {} : { notes: serie.notes }),
    }),
  };
}

/** Inflación supuesta en el escenario base de «Pensions at a Glance 2025» (OCDE). */
export function supuestoIpcPorDefecto(): SupuestoIpc {
  const archivo = ArchivoDatos.parse(supuestosOcde);
  const dato = archivo.data?.find((d) => d.id === ID_IPC_OCDE);
  if (!dato || typeof dato.value !== 'number') {
    throw new Error(`Falta el dato ${ID_IPC_OCDE} en /data/internacional`);
  }
  const { id: _id, ...sinId } = dato;
  return { porcentaje: dato.value, dato: Dato.parse(sinId) };
}
