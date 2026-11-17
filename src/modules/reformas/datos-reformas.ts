/**
 * Datos de la página «Reformas». Único módulo de la página que lee /data: la cronología de normas
 * (`data/normativa/cronologia.json`) y los ficheros de parámetros de `FICHEROS_PARAMETROS_REFORMAS`.
 * Cada fichero se valida con su esquema al cargarlo. `ids-datos.ts` dice qué dato se enlaza a qué
 * norma; aquí se resuelve contra /data y se formatea con `formato.ts`.
 */
import cronologiaJson from '../../../data/normativa/cronologia.json';
import carenciaJson from '../../../data/parametros/carencia-jubilacion.json';
import cotizacionPara100Json from '../../../data/parametros/cotizacion-para-100.json';
import cuotaSolidaridadJson from '../../../data/parametros/cuota-solidaridad-calendario.json';
import edadOrdinariaJson from '../../../data/parametros/edad-ordinaria-jubilacion.json';
import demoraJson from '../../../data/parametros/jubilacion-demora-reglas.json';
import meiTipoTotalJson from '../../../data/parametros/mei-tipo-total.json';
import periodoCalculoJson from '../../../data/parametros/periodo-calculo-base-reguladora.json';
import revalorizacionJson from '../../../data/parametros/revalorizacion-general.json';
import {
  ArchivoCronologia,
  ArchivoDatos,
  type Dato,
  type DatoConId,
  type Norma,
} from '../../engine/esquema-datos';
import {
  formatearDuracion,
  formatearFechaIso,
  formatearNumero,
  formatearPorcentaje,
} from '../../engine/formato';
import { memorizar } from '../historico/cargar';
import type { SerieGrafico, RupturaGrafico } from '../historico/GraficoSeries';
import { FICHERO_GRAFICO, type NombreParametro } from './ficheros';
import {
  CALENDARIOS,
  DESTINOS,
  NOTAS_DE_ORIGEN,
  ROTULOS_PARAMETRO,
  VALORES,
  type CalendarioConfig,
  type Destino,
  type FormatoValor,
  type ValorConfig,
} from './ids-datos';
import type { ParametroNormativo } from './tipos';

export type { Destino, ParametroNormativo };

const JSON_DE: Readonly<Record<NombreParametro, unknown>> = {
  'carencia-jubilacion': carenciaJson,
  'cotizacion-para-100': cotizacionPara100Json,
  'cuota-solidaridad-calendario': cuotaSolidaridadJson,
  'edad-ordinaria-jubilacion': edadOrdinariaJson,
  'jubilacion-demora-reglas': demoraJson,
  'mei-tipo-total': meiTipoTotalJson,
  'periodo-calculo-base-reguladora': periodoCalculoJson,
  'revalorizacion-general': revalorizacionJson,
};

const archivos = new Map<NombreParametro, ArchivoDatos>();
/** Datos de un fichero de parámetros (los elementos de `data`), validados con el esquema de /data. */
export function elementosDe(fichero: NombreParametro): readonly DatoConId[] {
  let a = archivos.get(fichero);
  if (a === undefined) {
    a = ArchivoDatos.parse(JSON_DE[fichero]);
    archivos.set(fichero, a);
  }
  return a.data ?? [];
}

/** Descripción del fichero de parámetros en /data: es la definición del dato que se muestra. */
export function descripcionDe(fichero: NombreParametro): string {
  return ArchivoDatos.parse(JSON_DE[fichero]).description;
}

export const cronologia = memorizar(() => ArchivoCronologia.parse(cronologiaJson));

export function formatearValor(valor: number | string, formato: FormatoValor): string {
  if (typeof valor === 'string') return valor;
  switch (formato) {
    case 'duracion':
      return formatearDuracion(valor);
    case 'meses':
      return `${formatearNumero(valor)} ${valor === 1 ? 'mes' : 'meses'}`;
    case 'porcentaje':
      return formatearPorcentaje(valor / 100, { maxDecimales: 2 });
    case 'numero':
      return formatearNumero(valor, { maxDecimales: 4 });
  }
}

/** «Real Decreto-ley 2/2023, de 16 de marzo, …» → «RDL 2/2023». */
export function nombreCorto(titulo: string): string {
  const m = /^(Real Decreto Legislativo|Real Decreto-ley|Real Decreto|Ley)\s+(\d+\/\d{4})/.exec(
    titulo,
  );
  if (m?.[1] === undefined || m[2] === undefined) return titulo;
  const sigla: Record<string, string> = {
    'Real Decreto Legislativo': 'RDLeg',
    'Real Decreto-ley': 'RDL',
    'Real Decreto': 'RD',
    Ley: 'Ley',
  };
  return `${sigla[m[1]] ?? m[1]} ${m[2]}`;
}

export interface CambioVista {
  readonly parametro: ParametroNormativo;
  readonly rotulo: string;
  readonly antes: string | null;
  readonly despues: string;
  readonly transicion: string;
  readonly articulos: string;
  readonly evidencia: string;
}

export interface TablaVista {
  readonly clave: string;
  readonly tipo: 'calendario' | 'valor';
  readonly parametro: ParametroNormativo;
  readonly rotulo: string;
  readonly titulo: string;
  /** Definición del dato (descripción del fichero de /data del que sale). */
  readonly definicion: string;
  /** Cabeceras; la primera es la de la fila (año o parámetro) y la última, la ubicación en la norma. */
  readonly columnas: readonly string[];
  readonly filas: readonly (readonly string[])[];
  /** Valor anterior y posterior, con el año al que se refiere cada uno. */
  readonly antes: string;
  readonly despues: string;
  readonly datos: readonly Dato[];
  readonly nota: string | undefined;
}

export interface ReformaVista {
  readonly id: string;
  readonly norma: Norma;
  readonly nombre: string;
  readonly aprobacion: string;
  readonly publicacion: string;
  /** Fecha de entrada en vigor o `null` si no consta en los textos ni en los datos del repositorio. */
  readonly entradaEnVigor: string | null;
  readonly cambios: readonly CambioVista[];
  readonly tablas: readonly TablaVista[];
  readonly enlaces: readonly Destino[];
  /** Dato que alimenta la línea de fuente de la norma. */
  readonly fuente: Dato;
}

const ORDEN_DESTINOS: readonly Destino[] = ['como-se-calcula', 'tipos-de-pension', 'hucha'];

function datoDeNorma(n: Norma): Dato {
  return {
    value: n.boeId,
    unit: 'norma',
    period: n.fecha.slice(0, 4),
    source: n.source,
    fetchedAt: n.fetchedAt,
    confidence: n.confidence,
  };
}

const buscar = (fichero: NombreParametro, id: string): DatoConId | undefined =>
  elementosDe(fichero).find((d) => d.id === id);

function tablaCalendario(c: CalendarioConfig, n: number): TablaVista {
  const primera = c.columnas[0];
  if (primera === undefined) throw new Error(`Calendario sin columnas: ${c.norma}`);
  const desde = Number(c.desde);
  const hasta = Number(c.hasta);
  const anios = Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);
  const datos: DatoConId[] = [];
  const filas = anios.map((anio) => {
    const celdas = c.columnas.map((col) => {
      const d = buscar(col.fichero, col.id.replace('{anio}', String(anio)));
      if (d === undefined) throw new Error(`Falta el dato ${col.fichero}#${col.id} (${anio})`);
      datos.push(d);
      return formatearValor(d.value, col.formato);
    });
    const ubicacion = buscar(primera.fichero, primera.id.replace('{anio}', String(anio)))?.location;
    return [String(anio), ...celdas, ubicacion ?? ''];
  });
  const anterior = buscar(primera.fichero, primera.id.replace('{anio}', String(desde - 1)));
  const ultimo = buscar(primera.fichero, primera.id.replace('{anio}', String(hasta)));
  if (anterior !== undefined) datos.push(anterior);
  const texto = (d: DatoConId | undefined, cuando: string) =>
    d === undefined
      ? ''
      : `${c.columnas.map((col) => `${col.rotulo.toLowerCase()}: ${formatearValor(buscar(col.fichero, col.id.replace('{anio}', d.id.slice(0, 4)))?.value ?? '', col.formato)}`).join('; ')} (${cuando})`;
  return {
    clave: `${c.norma}:${c.parametro}:${String(n)}`,
    tipo: 'calendario',
    parametro: c.parametro,
    rotulo: ROTULOS_PARAMETRO[c.parametro],
    titulo: c.titulo,
    definicion: descripcionDe(primera.fichero),
    columnas: ['Año', ...c.columnas.map((x) => x.rotulo), 'Dónde está en la norma'],
    filas,
    antes: texto(anterior, `valor de ${String(desde - 1)}, último año anterior al calendario`),
    despues: texto(ultimo, `valor de ${String(hasta)}, último año del calendario`),
    datos,
    nota: NOTAS_DE_ORIGEN[`${c.norma}:${c.parametro}`],
  };
}

function tablaValores(v: ValorConfig, n: number): TablaVista {
  const datos: DatoConId[] = [];
  const filas = v.filas.map((f) => {
    const d = buscar(f.fichero, f.id);
    if (d === undefined) throw new Error(`Falta el dato ${f.fichero}#${f.id}`);
    datos.push(d);
    return [f.rotulo, formatearValor(d.value, f.formato), d.period, d.location ?? ''];
  });
  const despues = v.filas
    .map((f, i) => {
      const d = datos[i];
      return d === undefined
        ? ''
        : `${f.rotulo.toLowerCase()}: ${formatearValor(d.value, f.formato)} (año ${d.period})`;
    })
    .join('; ');
  return {
    clave: `${v.norma}:${v.parametro}:${String(n)}`,
    tipo: 'valor',
    parametro: v.parametro,
    rotulo: ROTULOS_PARAMETRO[v.parametro],
    titulo: v.titulo,
    definicion: [...new Set(v.filas.map((f) => descripcionDe(f.fichero)))].join(' '),
    columnas: ['Valor', 'Cifra', 'Año', 'Dónde está en la norma'],
    filas,
    antes: '',
    despues,
    datos,
    nota: NOTAS_DE_ORIGEN[`${v.norma}:${v.parametro}`],
  };
}

export const reformas = memorizar((): readonly ReformaVista[] => {
  const normas = cronologia().normas;
  return normas.map((norma) => {
    const tablas = [
      ...CALENDARIOS.filter((c) => c.norma === norma.id).map((c, i) => tablaCalendario(c, i)),
      ...VALORES.filter((v) => v.norma === norma.id).map((v, i) => tablaValores(v, i)),
    ];
    const destinos = new Set<Destino>(norma.cambios.flatMap((c) => DESTINOS[c.parametro]));
    return {
      id: norma.id,
      norma,
      nombre: nombreCorto(norma.titulo),
      aprobacion: formatearFechaIso(norma.fecha),
      publicacion: formatearFechaIso(norma.fechaPublicacion),
      entradaEnVigor:
        norma.entradaEnVigor.fecha === null ? null : formatearFechaIso(norma.entradaEnVigor.fecha),
      cambios: norma.cambios.map((c) => ({
        parametro: c.parametro,
        rotulo: ROTULOS_PARAMETRO[c.parametro],
        antes: c.antes,
        despues: c.despues,
        transicion: c.transicion,
        articulos: c.articulos,
        evidencia: c.evidencia,
      })),
      tablas,
      enlaces: ORDEN_DESTINOS.filter((d) => destinos.has(d)),
      fuente: datoDeNorma(norma),
    };
  });
});

export interface DatosGraficoReforma {
  readonly clave: 'edad' | 'periodo' | 'maximo';
  readonly series: readonly SerieGrafico[];
  readonly rupturas: readonly RupturaGrafico[];
  readonly fuentes: readonly Dato[];
  /** Definición del dato (descripción del fichero de /data). */
  readonly definicion: string;
}

function serieDe(fichero: NombreParametro, etiqueta: string, clave: string): SerieGrafico {
  const puntos = elementosDe(fichero)
    .filter((d) => /^\d{4}$/.test(d.id) && typeof d.value === 'number')
    .map((d) => ({ anio: Number(d.id), valor: d.value as number }))
    .sort((a, b) => a.anio - b.anio);
  return { clave, etiqueta, puntos };
}

/**
 * Tres parámetros que cambian con el calendario. Las rupturas señalan el año en que empieza el
 * calendario que fija cada norma de la cronología (se dibujan entre el año anterior y ese).
 */
export const graficosParametros = memorizar((): readonly DatosGraficoReforma[] => {
  const nombres = new Map(cronologia().normas.map((n) => [n.id, nombreCorto(n.titulo)] as const));
  const rupturas = (fichero: NombreParametro, primerAnio: number): RupturaGrafico[] =>
    CALENDARIOS.filter(
      (c) => c.columnas[0]?.fichero === fichero && Number(c.desde) > primerAnio,
    ).map((c) => ({ anio: Number(c.desde), etiqueta: nombres.get(c.norma) ?? c.norma }));
  const definiciones: ReadonlyArray<{
    clave: DatosGraficoReforma['clave'];
    fichero: NombreParametro;
    etiqueta: string;
  }> = [
    { clave: 'edad', fichero: FICHERO_GRAFICO.edad, etiqueta: 'Edad ordinaria' },
    { clave: 'periodo', fichero: FICHERO_GRAFICO.periodo, etiqueta: 'Periodo de cálculo' },
    {
      clave: 'maximo',
      fichero: FICHERO_GRAFICO.maximo,
      etiqueta: 'Cotización para el máximo de la escala',
    },
  ];
  return definiciones.map((d) => {
    const serie = serieDe(d.fichero, d.etiqueta, d.clave);
    const primero = serie.puntos[0]?.anio ?? 0;
    return {
      clave: d.clave,
      series: [serie],
      rupturas: rupturas(d.fichero, primero),
      fuentes: elementosDe(d.fichero),
      definicion: descripcionDe(d.fichero),
    };
  });
});
