/**
 * Datos de la página «Cómo se calcula». Único módulo de la página que lee /data: el fichero de
 * ejemplos (importado) y los de `data/parametros/` (a través de `leerParametroDeRepositorio`, el
 * mismo lector que usa el motor). `FICHEROS_COMO_SE_CALCULA` los lista para el test de procedencia.
 * Cada fichero se valida con el esquema de /data al cargarlo.
 */
import ejemplosJson from '../../../data/ejemplos/como-se-calcula.json';
import {
  ArchivoDatos,
  ArchivoEjemplosCalculo,
  type Dato,
  type DatoConId,
} from '../../engine/esquema-datos';
import {
  formatearDuracion,
  formatearEuros,
  formatearNumero,
  formatearPorcentaje,
} from '../../engine/formato';
import { leerParametroDeRepositorio } from '../../engine/jubilacion/parametros-datos';
import { memorizar } from '../historico/cargar';
import { FICHEROS_COMO_SE_CALCULA } from './ficheros';
import type { FormatoParametro, ParametroConfig } from './ids-datos';

export { FICHEROS_COMO_SE_CALCULA };

export const ejemplosCalculo = memorizar(() => ArchivoEjemplosCalculo.parse(ejemplosJson));

const archivo = (() => {
  const cache = new Map<string, ArchivoDatos>();
  return (fichero: string): ArchivoDatos => {
    let a = cache.get(fichero);
    if (a === undefined) {
      a = ArchivoDatos.parse(leerParametroDeRepositorio(fichero));
      cache.set(fichero, a);
    }
    return a;
  };
})();

/** Datos de un fichero de parámetros (los elementos de `data`). */
export function elementosDe(fichero: string): readonly DatoConId[] {
  return archivo(fichero).data ?? [];
}

/** Último año con dato de la pensión máxima: el año al que se refieren los parámetros «vigentes». */
export const anioVigente = memorizar((): number => {
  const anios = elementosDe('pension-maxima').map((d) => Number(d.id));
  return Math.max(...anios.filter((a) => Number.isInteger(a)));
});

export function formatearParametro(valor: number | string, formato: FormatoParametro): string {
  if (typeof valor === 'string') return valor;
  switch (formato) {
    case 'duracion':
      return formatearDuracion(valor);
    case 'meses':
      return `${formatearNumero(valor)} ${valor === 1 ? 'mes' : 'meses'}`;
    case 'dias':
      return `${formatearNumero(valor)} ${valor === 1 ? 'día' : 'días'}`;
    case 'euros-mes':
      return `${formatearEuros(valor, { decimales: 2 })} al mes`;
    case 'euros-anio':
      return `${formatearEuros(valor, { decimales: 2 })} al año`;
    case 'porcentaje':
      return formatearPorcentaje(valor / 100, { maxDecimales: 2 });
    case 'numero':
      return formatearNumero(valor, { maxDecimales: 4 });
  }
}

export interface ParametroResuelto {
  readonly clave: string;
  readonly rotulo: string;
  readonly fichero: string;
  readonly idDato: string;
  /** Periodo de la norma o versión de la que procede el valor. */
  readonly periodo: string;
  readonly valor: string;
  readonly cita: string | undefined;
  readonly ubicacion: string | undefined;
  readonly dato: Dato;
}

/** Elemento al que apunta la configuración de un parámetro (véase `ids-datos.ts`). */
function localizar(cfg: ParametroConfig): DatoConId | undefined {
  const datos = elementosDe(cfg.fichero);
  if (!cfg.id.startsWith('@')) return datos.find((d) => d.id === cfg.id);
  const limite = anioVigente();
  const [modo, sufijo = ''] = cfg.id.slice(1).split(':') as [string, string?];
  const candidatos = datos.flatMap((d) => {
    if (modo === 'anio') return /^\d{4}$/.test(d.id) ? [{ d, anio: Number(d.id) }] : [];
    const m = /^(\d{4})-(.+)$/.exec(d.id);
    return m?.[1] !== undefined && m[2] === sufijo ? [{ d, anio: Number(m[1]) }] : [];
  });
  return candidatos
    .filter((c) => c.anio <= limite)
    .toSorted((a, b) => b.anio - a.anio)
    .at(0)?.d;
}

export function resolverParametro(cfg: ParametroConfig): ParametroResuelto | undefined {
  const d = localizar(cfg);
  if (d === undefined) return undefined;
  return {
    clave: cfg.clave,
    rotulo: cfg.rotulo,
    fichero: cfg.fichero,
    idDato: d.id,
    periodo: d.period,
    valor: formatearParametro(d.value, cfg.formato),
    cita: d.quote,
    ubicacion: d.location,
    dato: d,
  };
}

export interface ReferenciaResuelta {
  readonly referencia: string;
  readonly fichero: string;
  readonly id: string;
  readonly ubicacion: string | undefined;
  readonly cita: string | undefined;
  /** Valor tal como figura en /data (sin formatear) y su unidad, si es un dato escalar. */
  readonly valor: number | string | undefined;
  readonly unidad: string | undefined;
  readonly dato: Dato | undefined;
}

/** Referencia de un paso del motor («parametros/fichero.json#id») resuelta contra /data. */
export function resolverReferencia(referencia: string): ReferenciaResuelta {
  const [ruta = '', id = ''] = referencia.split('#');
  const fichero = ruta.replace(/^parametros\//, '').replace(/\.json$/, '');
  let d: DatoConId | undefined;
  try {
    d = elementosDe(fichero).find((e) => e.id === id);
  } catch {
    d = undefined;
  }
  return {
    referencia,
    fichero,
    id,
    ubicacion: d?.location,
    cita: d?.quote,
    valor: d?.value,
    unidad: d?.unit,
    dato: d,
  };
}
