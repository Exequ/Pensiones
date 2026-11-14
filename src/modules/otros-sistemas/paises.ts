/**
 * Áreas de la comparativa internacional: países y agregados que publican la OCDE y Eurostat en
 * `data/internacional`. Son nombres y códigos, no cifras de datos. «UE-27» es la denominación
 * oficial del agregado de la Unión Europea (27 países) que usan las dos fuentes.
 */
export const CODIGO_ESPANA = 'ESP';
export const CODIGO_REINO_UNIDO = 'GBR';
/** Agregado de la Unión Europea (27 países) de la OCDE y de Eurostat. */
export const CODIGO_UE = 'EU27';

export interface InfoPais {
  /** Código de área de la fuente (ISO 3 o agregado: `OECD_REP`, `EU27`). */
  readonly codigo: string;
  readonly nombre: string;
  /** Nombre corto para etiquetas directas dentro de un gráfico. */
  readonly corto: string;
  readonly tipo: 'pais' | 'agregado';
}

/** España primero; el resto, por orden alfabético del nombre; los agregados, al final. */
export const PAISES: readonly InfoPais[] = [
  { codigo: 'ESP', nombre: 'España', corto: 'España', tipo: 'pais' },
  { codigo: 'DEU', nombre: 'Alemania', corto: 'Alemania', tipo: 'pais' },
  { codigo: 'DNK', nombre: 'Dinamarca', corto: 'Dinamarca', tipo: 'pais' },
  { codigo: 'USA', nombre: 'Estados Unidos', corto: 'EE. UU.', tipo: 'pais' },
  { codigo: 'FRA', nombre: 'Francia', corto: 'Francia', tipo: 'pais' },
  { codigo: 'ITA', nombre: 'Italia', corto: 'Italia', tipo: 'pais' },
  { codigo: 'NLD', nombre: 'Países Bajos', corto: 'P. Bajos', tipo: 'pais' },
  { codigo: 'POL', nombre: 'Polonia', corto: 'Polonia', tipo: 'pais' },
  { codigo: 'PRT', nombre: 'Portugal', corto: 'Portugal', tipo: 'pais' },
  { codigo: 'GBR', nombre: 'Reino Unido', corto: 'R. Unido', tipo: 'pais' },
  { codigo: 'SWE', nombre: 'Suecia', corto: 'Suecia', tipo: 'pais' },
  { codigo: 'OECD_REP', nombre: 'Media de la OCDE', corto: 'Media OCDE', tipo: 'agregado' },
  { codigo: 'EU27', nombre: 'Unión Europea (UE-27)', corto: 'UE-27', tipo: 'agregado' },
] as const;

export const CODIGOS_PAISES: readonly string[] = PAISES.map((p) => p.codigo);

/** Selección inicial: España y los países de mayor tamaño de la Unión Europea de la muestra. */
export const SELECCION_INICIAL: readonly string[] = ['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'SWE'];

export function infoPais(codigo: string): InfoPais {
  const p = PAISES.find((x) => x.codigo === codigo);
  if (!p) throw new Error(`Área desconocida: ${codigo}`);
  return p;
}

export const nombrePais = (codigo: string): string => infoPais(codigo).nombre;
export const nombreCortoPais = (codigo: string): string => infoPais(codigo).corto;
export const esAgregado = (codigo: string): boolean => infoPais(codigo).tipo === 'agregado';
