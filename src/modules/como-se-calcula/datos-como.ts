/**
 * Datos de la página «Cómo se calcula». Único módulo de la página que lee /data: el fichero de
 * ejemplos (importado) y los de `data/parametros/` (a través de `leerParametroDeRepositorio`, el
 * mismo lector que usa el motor). `FICHEROS_COMO_SE_CALCULA` los lista para el test de procedencia.
 * Cada fichero se valida con el esquema de /data al cargarlo.
 */
import ejemplosJson from '../../../data/ejemplos/como-se-calcula.json';
import prestacionesJson from '../../../data/normativa/prestaciones.json';
import type { DatoRotulado } from '../../components/fuentes';
import { datoDeBloque, quitarCitas } from '../../engine/citas-normativas';
import {
  ArchivoDatos,
  ArchivoEjemplosCalculo,
  ArchivoPrestaciones,
  Dato,
  type DatoConId,
  type Prestacion,
} from '../../engine/esquema-datos';
import {
  resolverFormula,
  type FormulaResuelta,
  type ResolverReferencia,
  type ValorReferencia,
} from '../../engine/formulas';
import {
  formatearDuracion,
  formatearEuros,
  formatearNumero,
  formatearPorcentaje,
} from '../../engine/formato';
import { leerParametroDeRepositorio } from '../../engine/jubilacion/parametros-datos';
import { memorizar } from '../historico/cargar';
import { FICHEROS_COMO_SE_CALCULA } from './ficheros';
import { MODALIDADES_JUBILACION, type FormatoParametro, type ParametroConfig } from './ids-datos';
import { FUENTES_DE_NORMA, type FuenteDeNorma } from './normas';

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

/** Año de los datos, en texto, como periodo de los datos que se construyen para «Fuentes». */
const periodoVigente = (): string => String(anioVigente());

/** Norma de una ubicación suelta («art. 31 Decreto 3158/1966»): la que se nombra antes en el texto. */
export function normaDeUbicacion(parte: string): FuenteDeNorma | undefined {
  let elegida: { readonly f: FuenteDeNorma; readonly posicion: number } | undefined;
  for (const f of FUENTES_DE_NORMA) {
    const posicion = parte.search(f.patron);
    if (posicion >= 0 && (elegida === undefined || posicion < elegida.posicion))
      elegida = { f, posicion };
  }
  return elegida?.f;
}

/** Partes de una ubicación que no nombran ninguna norma de las que tienen fuente en los datos. */
export function partesSinNorma(ubicacion: string): string[] {
  return ubicacion
    .split(';')
    .map((x) => x.trim())
    .filter((x) => x !== '' && normaDeUbicacion(x) === undefined);
}

const fuenteDe = (() => {
  const cache = new Map<string, Dato | undefined>();
  return (f: FuenteDeNorma): Dato | undefined => {
    const clave = f.patron.source;
    if (!cache.has(clave))
      cache.set(
        clave,
        elementosDe(f.fichero).find((d) => f.titulo.test(d.source.title)),
      );
    return cache.get(clave);
  };
})();

/**
 * Datos para el desplegable de «Fuentes» a partir de una ubicación normativa («art. 205 TRLGSS; DT
 * 7.ª TRLGSS»): un dato por fuente, con la fuente, la fecha de descarga y la confianza del dato de
 * `data/parametros` que la contiene, el rótulo («Se refiere a») y las ubicaciones de esa norma como
 * `location`. Las partes cuya norma no tiene fuente en los datos no se incluyen (`partesSinNorma`).
 */
export function datosDeUbicacion(rotulo: string, ubicacion: string): DatoRotulado[] {
  const porFuente = new Map<string, { readonly fuente: Dato; readonly partes: string[] }>();
  for (const parte of ubicacion.split(';').map((x) => x.trim())) {
    const f = parte === '' ? undefined : normaDeUbicacion(parte);
    const fuente = f === undefined ? undefined : fuenteDe(f);
    if (f === undefined || fuente === undefined) continue;
    const grupo = porFuente.get(f.patron.source) ?? { fuente, partes: [] };
    grupo.partes.push(parte);
    porFuente.set(f.patron.source, grupo);
  }
  return [...porFuente.values()].map(({ fuente, partes }) => ({
    ...Dato.parse({
      value: rotulo,
      unit: 'ubicación en la norma',
      period: periodoVigente(),
      source: fuente.source,
      fetchedAt: fuente.fetchedAt,
      confidence: fuente.confidence,
      location: partes.join('; '),
    }),
    rotulo,
  }));
}

const archivoPrestaciones = memorizar(() => ArchivoPrestaciones.parse(prestacionesJson));

/** Texto de una modalidad sin las citas (que van a sus desplegables de fuentes). */
export interface DatosModalidad {
  readonly id: string;
  readonly nombre: string;
  readonly textos: {
    readonly aQuienCubre: string;
    readonly requisitos: readonly {
      readonly tipo: Prestacion['requisitos'][number]['tipo'];
      readonly descripcion: string;
    }[];
    readonly duracion: string;
    readonly compatibilidades: string;
    readonly formula: string;
    readonly limites: string;
  };
  readonly fuentes: {
    readonly quien: readonly DatoRotulado[];
    readonly requisitos: readonly DatoRotulado[];
    readonly calculo: readonly DatoRotulado[];
    readonly norma: readonly DatoRotulado[];
  };
  /** Fórmula estructurada resuelta, si la norma da una fórmula cerrada con cifras en los datos. */
  readonly formula: FormulaResuelta | null;
}

const esNumero = (v: unknown): v is number => typeof v === 'number';

/** Dato numérico de un parámetro de `data/parametros`; `undefined` si no existe o no es numérico. */
export const resolverReferenciaParametro: ResolverReferencia = ({
  fichero,
  id,
}): ValorReferencia | undefined => {
  const d = elementosDe(fichero).find((x) => x.id === id);
  return d !== undefined && esNumero(d.value)
    ? { valor: d.value, unidad: d.unit, periodo: d.period }
    : undefined;
};

/** Modalidades de la jubilación (todas menos la ordinaria), en el orden de `MODALIDADES_JUBILACION`. */
export const modalidadesJubilacion = memorizar((): readonly DatosModalidad[] => {
  const a = archivoPrestaciones();
  const periodo = a.vigenteA.slice(0, 4);
  return MODALIDADES_JUBILACION.map((id): DatosModalidad => {
    const p = a.prestaciones.find((x) => x.id === id);
    if (p === undefined) throw new Error(`Falta la modalidad «${id}» en los datos de la web`);
    const textos = {
      aQuienCubre: quitarCitas(p.aQuienCubre),
      requisitos: p.requisitos.map((r) => ({
        tipo: r.tipo,
        descripcion: quitarCitas(r.descripcion),
      })),
      duracion: quitarCitas(p.duracion),
      compatibilidades: quitarCitas(p.compatibilidades),
      formula: quitarCitas(p.calculo.formula),
      limites: quitarCitas(p.limites),
    };
    const f = p.calculo.formulaEstructurada;
    return {
      id,
      nombre: p.nombre,
      textos,
      fuentes: {
        quien: [datoDeBloque(p, periodo, 'A quién cubre', p.aQuienCubre)],
        requisitos: [
          ...p.requisitos.map((r, i) =>
            datoDeBloque(
              p,
              periodo,
              textos.requisitos[i]?.descripcion ?? r.descripcion,
              r.descripcion,
              r.articulo,
            ),
          ),
          datoDeBloque(p, periodo, 'Duración', p.duracion),
          datoDeBloque(p, periodo, 'Compatibilidades', p.compatibilidades),
        ],
        calculo: [
          datoDeBloque(p, periodo, 'Fórmula de la cuantía', p.calculo.formula, p.calculo.articulos),
          datoDeBloque(p, periodo, 'Límites', p.limites),
        ],
        norma: [
          datoDeBloque(p, periodo, 'Norma de la modalidad', p.nombre, p.articulos.join('; ')),
        ],
      },
      formula:
        f === undefined
          ? null
          : resolverFormula(f, resolverReferenciaParametro, {
              anioVigente: anioVigente(),
              resolverSerie: (fichero, idDato) =>
                resolverReferenciaParametro({ fichero, id: idDato }),
            }),
    };
  });
});

/**
 * Dato de un cuadro de parámetros para «Fuentes» sin la cita de su primera fila: la fuente, la fecha
 * de descarga, la confianza y la ubicación del primer dato del fichero, con el rótulo del cuadro.
 */
export function datoDeCuadro(fichero: string, rotulo: string): DatoRotulado {
  const d = elementosDe(fichero)[0];
  if (d === undefined) throw new Error(`Sin datos en ${fichero}`);
  return {
    ...Dato.parse({
      value: rotulo,
      unit: 'cuadro de parámetros',
      period: d.period,
      source: d.source,
      fetchedAt: d.fetchedAt,
      confidence: d.confidence,
      ...(d.location === undefined ? {} : { location: d.location }),
    }),
    rotulo,
  };
}
