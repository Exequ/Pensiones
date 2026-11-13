/**
 * Tipos públicos del motor del Mecanismo de Equidad Intergeneracional (MEI, art. 127 bis TRLGSS) y
 * de la cotización adicional de solidaridad (art. 19 bis y DT 42.ª). Importes en euros/mes del año
 * indicado; tipos en porcentaje.
 */
import type { OpcionesJubilacion, Paso } from '../jubilacion/tipos.ts';
import { porDefectoDelMotor } from '../config/lecturas-por-defecto.ts';

export type { Paso };

export type ContingenciaMEI = 'comunes' | 'profesionales';

export interface TipoMEI {
  readonly anio: number;
  readonly contingencia: ContingenciaMEI;
  /** Puntos porcentuales; 0 antes de 2023 y en contingencias que no son la de jubilación. */
  readonly total: number;
  readonly empresa: number;
  readonly trabajador: number;
  readonly pasos: readonly Paso[];
}

/** Lecturas de la norma que el motor no decide (docs/REVISION_ACTUARIAL.md). */
export interface LecturasMEI {
  /**
   * Base del MEI: la base de cotización por contingencias comunes (por defecto) o la retribución
   * completa, incluido el exceso sobre la base máxima que cotiza como solidaridad.
   */
  readonly baseMEI: 'base-cotizacion' | 'retribucion-completa';
}

export const LECTURAS_MEI_POR_DEFECTO: LecturasMEI = porDefectoDelMotor<LecturasMEI>('mei');

export interface OpcionesMEI extends Pick<OpcionesJubilacion, 'escenario' | 'lecturas'> {
  readonly lecturasMEI?: Partial<LecturasMEI>;
  /** Base máxima mensual del año; por defecto, la de /data (o la proyectada con el escenario). */
  readonly baseMaximaMensual?: number;
  /** Tipos de contingencias comunes (%) para repartir la solidaridad; por defecto, los de /data del año. */
  readonly tiposContingenciasComunes?: { readonly empresa: number; readonly trabajador: number };
}

export interface CuotaMEI {
  readonly anio: number;
  readonly base: number;
  readonly tipo: TipoMEI;
  readonly cuotaTotal: number;
  readonly cuotaEmpresa: number;
  readonly cuotaTrabajador: number;
  readonly pasos: readonly Paso[];
}

export interface CuotaSolidaridad {
  readonly anio: number;
  readonly retribucionMensual: number;
  readonly baseMaximaMensual: number;
  /** Parte de la retribución por encima de la base máxima. */
  readonly exceso: number;
  /** Importe de cada tramo (a: hasta el 10 % adicional; b: del 10 % al 50 %; c: más del 50 %). */
  readonly tramos: readonly {
    readonly tramo: 'a' | 'b' | 'c';
    readonly importe: number;
    readonly tipo: number;
    readonly cuota: number;
  }[];
  readonly cuotaTotal: number;
  readonly cuotaEmpresa: number;
  readonly cuotaTrabajador: number;
  readonly pasos: readonly Paso[];
  readonly avisos: readonly string[];
}

export interface CotizacionAdicional {
  readonly anio: number;
  readonly retribucionMensual: number;
  readonly baseCotizacion: number;
  readonly mei: CuotaMEI;
  readonly solidaridad: CuotaSolidaridad;
  readonly cuotaTotal: number;
  readonly cuotaEmpresa: number;
  readonly cuotaTrabajador: number;
}
