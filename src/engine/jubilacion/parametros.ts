/**
 * Parámetros del motor de jubilación, leídos de /data/parametros. Aquí no hay ninguna cifra legal:
 * `construirParametros` recibe una función que devuelve el JSON de cada fichero.
 *
 * - `parametros-datos.ts` la implementa con los ficheros del repositorio (Vite/Vitest).
 * - Los scripts de Node pueden pasar una lectura con `readFileSync`.
 */
import { ArchivoDatos } from '../esquema-datos.ts';
import { DatoNoDisponible } from './errores.ts';

export type LeerDatos = (nombre: string) => unknown;

/** Serie con un valor por año. */
export interface SerieAnual {
  readonly fichero: string;
  readonly valores: ReadonlyMap<number, number>;
  readonly primero: number;
  readonly ultimo: number;
}

export interface ValorConReferencia {
  readonly valor: number;
  /** Referencia «parametros/fichero.json#id» del dato usado. */
  readonly ref: string;
  /** El año pedido es posterior al último de la serie y se usa el último valor («a partir de»). */
  readonly extendido: boolean;
}

export interface VersionEscala {
  readonly desde: number;
  readonly basePct: number;
  readonly baseMeses: number;
  readonly tramo1Pct: number;
  readonly tramo1Meses: number;
  readonly tramo2Pct: number;
  readonly tramo2Meses: number;
  readonly maximoPct: number;
}

export interface VersionLagunas {
  readonly desde: number;
  readonly tramo1Meses: number;
  readonly tramo1Pct: number;
  readonly tramo2Pct: number;
}

export interface VersionActualizacion {
  readonly desde: number;
  readonly mesesNominales: number;
  readonly mesIndiceReferencia: number;
}

export interface TablaCoeficientes {
  readonly fichero: string;
  /** Año desde el que rige el cuadro. */
  readonly desde: number;
  /** `t1-48` → % de reducción. */
  readonly coeficientes: ReadonlyMap<string, number>;
  readonly umbralesMeses: readonly [number, number, number];
}

export interface ParametrosJubilacion {
  readonly edadOrdinaria: SerieAnual;
  readonly carrera65: SerieAnual;
  readonly carencia: SerieAnual;
  readonly periodoCalculo: SerieAnual;
  readonly divisor: SerieAnual;
  readonly opcion25Aplicable: SerieAnual;
  readonly opcion25Ventana: SerieAnual;
  readonly opcion25Divisor: SerieAnual;
  readonly cotizacionPara100: SerieAnual;
  readonly edad65Meses: number;
  readonly edad65MinimasMeses: number;
  readonly periodoPrevioMeses: number;
  readonly periodoPrevioVentana: number;
  readonly escala: readonly VersionEscala[];
  readonly lagunas: readonly VersionLagunas[];
  readonly actualizacion: readonly VersionActualizacion[];
  readonly lagunasBrecha: ReadonlyMap<string, number>;
  readonly baseMaxima: SerieAnual;
  readonly baseMinima: SerieAnual;
  readonly incrementoBaseMaxima: SerieAnual;
  readonly pensionMaxima: SerieAnual;
  readonly incrementoPensionMaxima: SerieAnual;
  readonly incrementoMaxima2051: SerieAnual;
  readonly pensionMinima: ReadonlyMap<string, number>;
  readonly limiteIngresosMinimos: SerieAnual;
  readonly revalorizacion: SerieAnual;
  readonly ipcIndiceMedio: SerieAnual;
  readonly ipcVariacionDiciembre: SerieAnual;
  readonly complementoBrecha: SerieAnual;
  readonly reglasBrecha: ReadonlyMap<string, number>;
  readonly coeficientesInvoluntaria: TablaCoeficientes;
  readonly coeficientesVoluntaria: TablaCoeficientes;
  readonly coeficientesVoluntariaLimite: ReadonlyMap<string, number>;
  readonly reglasAnticipada: ReadonlyMap<string, number>;
  readonly reglasDemora: ReadonlyMap<string, number>;
}

/** Referencia a un dato de /data. */
export function ref(fichero: string, id: string | number): string {
  return `parametros/${fichero}.json#${id}`;
}

function archivo(leer: LeerDatos, nombre: string) {
  return ArchivoDatos.parse(leer(nombre));
}

function numero(valor: unknown, contexto: string): number {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    throw new DatoNoDisponible(`${contexto}: valor no numérico`);
  }
  return valor;
}

export function serieAnual(leer: LeerDatos, fichero: string): SerieAnual {
  const valores = new Map<number, number>();
  for (const d of archivo(leer, fichero).data ?? []) {
    if (!/^\d{4}$/.test(d.period))
      throw new DatoNoDisponible(`${fichero}: periodo no anual (${d.period})`);
    valores.set(Number(d.period), numero(d.value, `${fichero}#${d.id}`));
  }
  const anios = [...valores.keys()];
  if (anios.length === 0) throw new DatoNoDisponible(`${fichero}: sin datos`);
  return { fichero, valores, primero: Math.min(...anios), ultimo: Math.max(...anios) };
}

function mapaPorId(leer: LeerDatos, fichero: string): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const d of archivo(leer, fichero).data ?? [])
    mapa.set(d.id, numero(d.value, `${fichero}#${d.id}`));
  return mapa;
}

function porId(mapa: ReadonlyMap<string, number>, id: string, fichero: string): number {
  const v = mapa.get(id);
  if (v === undefined) throw new DatoNoDisponible(`${fichero}#${id}`);
  return v;
}

/** Valor de una serie anual en `anio`; si es posterior al último dato, el último («a partir de»). */
export function valorEn(serie: SerieAnual, anio: number): ValorConReferencia {
  if (anio < serie.primero) {
    throw new DatoNoDisponible(
      `${serie.fichero}: sin dato para ${anio} (la serie empieza en ${serie.primero})`,
    );
  }
  const usado = Math.min(anio, serie.ultimo);
  const v = serie.valores.get(usado);
  if (v === undefined) {
    throw new DatoNoDisponible(
      `${serie.fichero}: sin dato para ${anio}; consta en docs/PENDIENTE_DATOS.md`,
    );
  }
  return { valor: v, ref: ref(serie.fichero, usado), extendido: anio > serie.ultimo };
}

/** Valor de un año concreto, sin extender ni buscar otro; `undefined` si no hay dato. */
export function valorExacto(serie: SerieAnual, anio: number): number | undefined {
  return serie.valores.get(anio);
}

/** Versión de una regla que rige en `anio`: la de mayor año de inicio que no lo supera. */
export function versionEn<T extends { readonly desde: number }>(
  versiones: readonly T[],
  anio: number,
  regla: string,
): T {
  let elegida: T | undefined;
  for (const v of versiones)
    if (v.desde <= anio && (elegida === undefined || v.desde > elegida.desde)) elegida = v;
  if (elegida === undefined) {
    throw new DatoNoDisponible(`${regla}: sin versión de la regla para ${anio}`);
  }
  return elegida;
}

function versiones(mapa: ReadonlyMap<string, number>, sufijo: string): number[] {
  return [...mapa.keys()]
    .filter((k) => k.endsWith(sufijo))
    .map((k) => Number(k.slice(0, 4)))
    .sort((a, b) => a - b);
}

function tablaCoeficientes(leer: LeerDatos, fichero: string): TablaCoeficientes {
  const mapa = mapaPorId(leer, fichero);
  const coeficientes = new Map<string, number>();
  for (const [id, v] of mapa) if (/^t[1-4]-\d+$/.test(id)) coeficientes.set(id, v);
  const desde = Math.min(...(archivo(leer, fichero).data ?? []).map((d) => Number(d.period)));
  return {
    fichero,
    desde,
    coeficientes,
    umbralesMeses: [
      porId(mapa, 'umbral-t2', fichero),
      porId(mapa, 'umbral-t3', fichero),
      porId(mapa, 'umbral-t4', fichero),
    ],
  };
}

export function construirParametros(leer: LeerDatos): ParametrosJubilacion {
  const escalaMapa = mapaPorId(leer, 'escala-jubilacion-tramos');
  const escala: VersionEscala[] = versiones(escalaMapa, '-tramo1-pct').map((desde) => {
    const g = (s: string) => porId(escalaMapa, `${desde}-${s}`, 'escala-jubilacion-tramos');
    return {
      desde,
      basePct: g('base-pct'),
      baseMeses: g('base-meses'),
      tramo1Pct: g('tramo1-pct'),
      tramo1Meses: g('tramo1-meses'),
      tramo2Pct: g('tramo2-pct'),
      tramo2Meses: g('tramo2-meses'),
      maximoPct: g('maximo-pct'),
    };
  });

  const lagMapa = mapaPorId(leer, 'lagunas-integracion');
  const lagunas: VersionLagunas[] = versiones(lagMapa, '-tramo1-meses').map((desde) => {
    const tramo1Pct = porId(lagMapa, `${desde}-tramo1-pct-base-minima`, 'lagunas-integracion');
    return {
      desde,
      tramo1Meses: porId(lagMapa, `${desde}-tramo1-meses`, 'lagunas-integracion'),
      tramo1Pct,
      tramo2Pct: lagMapa.get(`${desde}-tramo2-pct-base-minima`) ?? tramo1Pct,
    };
  });

  const actMapa = mapaPorId(leer, 'actualizacion-bases');
  const actualizacion: VersionActualizacion[] = versiones(actMapa, '-meses-nominales').map(
    (desde) => ({
      desde,
      mesesNominales: porId(actMapa, `${desde}-meses-nominales`, 'actualizacion-bases'),
      mesIndiceReferencia: porId(actMapa, `${desde}-mes-indice-referencia`, 'actualizacion-bases'),
    }),
  );

  const previo = mapaPorId(leer, 'jubilacion-periodo-previo');

  const edad65 = mapaPorId(leer, 'jubilacion-edad-65');
  const minimas = new Map<string, number>();
  // Las mínimas de incapacidad permanente («AAAA-ip-…»), viudedad («AAAA-viud-…») y orfandad y
  // favor de familiares («AAAA-orf-…», «AAAA-prest-orf-…», «AAAA-fam…») no coinciden con las de
  // jubilación: se cargan todas en el mismo mapa.
  for (const f of [
    'pension-minima-jubilacion',
    'pension-minima-incapacidad',
    'pension-minima-viudedad',
    'pension-minima-orfandad-familiares',
  ])
    for (const [id, v] of mapaPorId(leer, f)) minimas.set(id, v);

  return {
    edadOrdinaria: serieAnual(leer, 'edad-ordinaria-jubilacion'),
    carrera65: serieAnual(leer, 'carrera-jubilacion-65'),
    carencia: serieAnual(leer, 'carencia-jubilacion'),
    periodoCalculo: serieAnual(leer, 'periodo-calculo-base-reguladora'),
    divisor: serieAnual(leer, 'divisor-base-reguladora'),
    opcion25Aplicable: serieAnual(leer, 'opcion-25-anos-aplicable'),
    opcion25Ventana: serieAnual(leer, 'opcion-25-anos-ventana'),
    opcion25Divisor: serieAnual(leer, 'opcion-25-anos-divisor'),
    cotizacionPara100: serieAnual(leer, 'cotizacion-para-100'),
    edad65Meses: porId(edad65, '2013-carrera-larga-meses', 'jubilacion-edad-65'),
    edad65MinimasMeses: porId(edad65, '2013-referencia-minimas-meses', 'jubilacion-edad-65'),
    periodoPrevioMeses: porId(previo, '2013-meses-minimos', 'jubilacion-periodo-previo'),
    periodoPrevioVentana: porId(previo, '2013-ventana-meses', 'jubilacion-periodo-previo'),
    escala,
    lagunas,
    actualizacion,
    lagunasBrecha: mapaPorId(leer, 'lagunas-integracion-brecha-genero'),
    baseMaxima: serieAnual(leer, 'base-maxima-rg'),
    baseMinima: serieAnual(leer, 'base-minima-rg'),
    incrementoBaseMaxima: serieAnual(leer, 'base-maxima-incremento-futuro'),
    pensionMaxima: serieAnual(leer, 'pension-maxima'),
    incrementoPensionMaxima: serieAnual(leer, 'pension-maxima-incremento-futuro'),
    incrementoMaxima2051: serieAnualSinDuplicados(leer, 'pension-maxima-incremento-2051-2065'),
    pensionMinima: minimas,
    limiteIngresosMinimos: serieAnual(leer, 'limite-ingresos-complementos-minimos'),
    revalorizacion: serieAnual(leer, 'revalorizacion-general'),
    ipcIndiceMedio: serieAnual(leer, 'ipc-indice-medio-anual'),
    ipcVariacionDiciembre: serieAnual(leer, 'ipc-variacion-diciembre'),
    complementoBrecha: serieAnual(leer, 'complemento-brecha-genero'),
    reglasBrecha: mapaPorId(leer, 'complemento-brecha-genero-reglas'),
    coeficientesInvoluntaria: tablaCoeficientes(leer, 'jubilacion-coeficientes-involuntaria'),
    coeficientesVoluntaria: tablaCoeficientes(leer, 'jubilacion-coeficientes-voluntaria'),
    coeficientesVoluntariaLimite: mapaPorId(leer, 'jubilacion-coeficientes-voluntaria-limite'),
    reglasAnticipada: mapaPorId(leer, 'jubilacion-anticipada-reglas'),
    reglasDemora: mapaPorId(leer, 'jubilacion-demora-reglas'),
  };
}

/** Serie de la tabla de la DT 39.ª.4: ignora el dato «convergencia total» (id no anual). */
function serieAnualSinDuplicados(leer: LeerDatos, fichero: string): SerieAnual {
  const valores = new Map<number, number>();
  for (const d of archivo(leer, fichero).data ?? []) {
    if (!/^\d{4}$/.test(d.id)) continue;
    valores.set(Number(d.id), numero(d.value, `${fichero}#${d.id}`));
  }
  const anios = [...valores.keys()];
  return { fichero, valores, primero: Math.min(...anios), ultimo: Math.max(...anios) };
}

/** Valor de un dato por id de un mapa de parámetros (con error claro si falta). */
export function parametro(mapa: ReadonlyMap<string, number>, id: string, fichero: string): number {
  return porId(mapa, id, fichero);
}
