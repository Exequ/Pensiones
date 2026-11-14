import * as Plot from '@observablehq/plot';
import { useMemo, type ReactNode } from 'react';
import { Chart } from '../../components/Chart';
import type { Columna } from '../../components/DataTable';
import { token } from '../../components/estiloGrafico';
import {
  diferenciasRespectoA,
  ordenarPorValor,
  separarEtiquetas,
  type PuntoPais,
  type ValorPais,
} from '../../engine/comparativa-internacional';
import type { Dato } from '../../engine/esquema-datos';
import { formatearNumero } from '../../engine/formato';
import { ticksAnuales } from '../historico/grafico-series';
import { ComoLeerlo } from '../historico/ComoLeerlo';
import { CODIGO_ESPANA, esAgregado, nombreCortoPais, nombrePais } from './paises';

type FilaTabla = Record<string, string | number | null>;

interface ComunesProps {
  readonly titulo: string;
  /** Qué mide y en qué unidad. */
  readonly descripcion: ReactNode;
  /** Etiqueta del eje de valores (unidad). */
  readonly unidadEje: string;
  readonly decimales: number;
  readonly fuentes: Dato | readonly Dato[];
  /** Nota de definición bajo el gráfico. */
  readonly nota?: ReactNode;
  /** «Cómo leerlo»: qué mide, qué no dice y por qué los países no son directamente comparables. */
  readonly comoLeerlo: ReactNode;
}

interface BarrasProps extends ComunesProps {
  /** Valor de cada país elegido (ya filtrado), en cualquier orden. */
  readonly valores: readonly ValorPais[];
  /** Valor de España en la misma medida, para la diferencia de la tabla aunque no esté elegida. */
  readonly valorEspana: number | null;
  /** Cabecera de la columna de diferencia (p. ej., «Diferencia con España (puntos de PIB)»). */
  readonly tituloDiferencia: string;
}

const ALTO_FILA = 28;
const ALTO_BASE = 76;

/**
 * Barras horizontales ordenadas por la medida mostrada, de mayor a menor. España va en el color de
 * resaltado y el resto en el color neutro; las medias (OCDE, UE-27) llevan contorno de tinta. Los
 * países sin dato en la fuente no tienen barra y figuran en la tabla como «—».
 */
export function GraficoBarrasPaises({
  titulo,
  descripcion,
  unidadEje,
  decimales,
  fuentes,
  nota,
  comoLeerlo,
  valores,
  valorEspana,
  tituloDiferencia,
}: BarrasProps) {
  const ordenados = useMemo(() => ordenarPorValor(valores), [valores]);
  const conDato = useMemo(
    () => ordenados.filter((v): v is { pais: string; valor: number } => v.valor !== null),
    [ordenados],
  );

  const filas = useMemo<FilaTabla[]>(() => {
    const incluyeEspana = valores.some((v) => v.pais === CODIGO_ESPANA);
    const base = incluyeEspana
      ? valores
      : [...valores, { pais: CODIGO_ESPANA, valor: valorEspana }];
    const dif = new Map(diferenciasRespectoA(base).map((d) => [d.pais, d.diferencia]));
    return ordenados.map((v) => ({
      pais: nombrePais(v.pais),
      valor: v.valor,
      diferencia: dif.get(v.pais) ?? null,
    }));
  }, [ordenados, valores, valorEspana]);

  const columnas = useMemo<Columna<FilaTabla>[]>(
    () => [
      { clave: 'pais', titulo: 'País o agregado' },
      { clave: 'valor', titulo: unidadEje, tipo: 'numero', decimales },
      { clave: 'diferencia', titulo: tituloDiferencia, tipo: 'numero', decimales },
    ],
    [unidadEje, decimales, tituloDiferencia],
  );

  const opciones = useMemo(() => {
    const datos = conDato.map((v) => ({
      nombre: nombreCortoPais(v.pais),
      valor: v.valor,
      texto: formatearNumero(v.valor, { decimales }),
      relleno: v.pais === CODIGO_ESPANA ? token('resaltado') : token('resto'),
      borde: esAgregado(v.pais) ? token('tinta') : 'none',
    }));
    const maximo = Math.max(1, ...datos.map((d) => d.valor));
    return (): Plot.PlotOptions => ({
      marginLeft: 92,
      marginRight: 48,
      x: {
        label: unidadEje,
        domain: [0, maximo * 1.12],
        grid: true,
        ticks: 5,
        tickFormat: (d: number) => formatearNumero(d, { maxDecimales: 1 }),
      },
      y: { label: null, domain: datos.map((d) => d.nombre), padding: 0.25 },
      color: { type: 'identity' },
      marks: [
        Plot.ruleX([0], { stroke: token('tinta') }),
        Plot.barX(datos, {
          y: 'nombre',
          x: 'valor',
          fill: 'relleno',
          stroke: 'borde',
          strokeWidth: 1.5,
        }),
        Plot.text(datos, {
          y: 'nombre',
          x: 'valor',
          text: 'texto',
          dx: 6,
          textAnchor: 'start',
          fill: token('tinta'),
        }),
      ],
    });
  }, [conDato, decimales, unidadEje]);

  return (
    <div className="bloque-grafico">
      {conDato.length === 0 ? (
        <>
          <p className="grafico-titulo">{titulo}</p>
          <p className="hist-aviso">
            Ninguno de los países elegidos tiene dato en esta medida y año.
          </p>
        </>
      ) : null}
      {conDato.length === 0 ? null : (
        <Chart
          titulo={titulo}
          descripcion={descripcion}
          alto={ALTO_BASE + ALTO_FILA * conDato.length}
          opciones={opciones}
          tabla={{ titulo, columnas, filas }}
          fuentes={fuentes}
          {...(nota === undefined ? {} : { nota })}
        />
      )}
      <ComoLeerlo>{comoLeerlo}</ComoLeerlo>
    </div>
  );
}

export interface SeriePais {
  readonly pais: string;
  readonly puntos: readonly PuntoPais[];
}

interface LineasProps extends ComunesProps {
  readonly series: readonly SeriePais[];
  readonly alto?: number;
}

const MARGEN_SUPERIOR = 24;
const MARGEN_INFERIOR = 36;
const SEPARACION_ETIQUETAS = 16;

/**
 * Líneas por país con la etiqueta directa al final de cada una (sin leyenda). España va en el color
 * de resaltado y trazo grueso; el resto, en tinta apagada; las medias, con trazo discontinuo. Las
 * etiquetas se separan para que no se solapen aunque las líneas terminen en valores próximos.
 */
export function GraficoLineasPaises({
  titulo,
  descripcion,
  unidadEje,
  decimales,
  fuentes,
  nota,
  comoLeerlo,
  series,
  alto = 340,
}: LineasProps) {
  const conPuntos = useMemo(() => series.filter((s) => s.puntos.length > 0), [series]);

  const { filas, columnas } = useMemo(() => {
    const anios = [...new Set(conPuntos.flatMap((s) => s.puntos.map((p) => p.anio)))].sort(
      (a, b) => a - b,
    );
    const mapas = conPuntos.map((s) => new Map(s.puntos.map((p) => [p.anio, p.valor])));
    const f = anios.map((anio): FilaTabla => {
      const fila: FilaTabla = { anio: String(anio) };
      conPuntos.forEach((s, i) => {
        fila[s.pais] = mapas[i]?.get(anio) ?? null;
      });
      return fila;
    });
    const c: Columna<FilaTabla>[] = [
      { clave: 'anio', titulo: 'Año' },
      ...conPuntos.map((s) => ({
        clave: s.pais,
        titulo: nombrePais(s.pais),
        tipo: 'numero' as const,
        decimales,
      })),
    ];
    return { filas: f, columnas: c };
  }, [conPuntos, decimales]);

  const opciones = useMemo(() => {
    const anios = conPuntos.flatMap((s) => s.puntos.map((p) => p.anio));
    const valores = conPuntos.flatMap((s) => s.puntos.map((p) => p.valor));
    const minimoX = Math.min(...anios);
    const maximoX = Math.max(...anios);
    const minimoY = Math.floor(Math.min(...valores) * 0.95);
    const maximoY = Math.ceil(Math.max(...valores) * 1.05);
    const altoInterior = alto - MARGEN_SUPERIOR - MARGEN_INFERIOR;
    const aPixel = (v: number) => ((maximoY - v) / (maximoY - minimoY)) * altoInterior;
    const aValor = (px: number) => maximoY - (px / altoInterior) * (maximoY - minimoY);
    const finales = conPuntos.map((s) => {
      const ultimo = s.puntos.reduce((u, p) => (p.anio > u.anio ? p : u), s.puntos[0]!);
      return { pais: s.pais, anio: ultimo.anio, valor: ultimo.valor };
    });
    const ajustados = separarEtiquetas(
      finales.map((f) => aPixel(f.valor)),
      SEPARACION_ETIQUETAS,
      0,
      altoInterior,
    );
    const etiquetas = finales.map((f, i) => ({
      anio: f.anio,
      y: aValor(ajustados[i] ?? aPixel(f.valor)),
      texto: nombreCortoPais(f.pais),
      destacada: f.pais === CODIGO_ESPANA,
    }));
    return ({ ancho }: { ancho: number }): Plot.PlotOptions => {
      const estrecho = ancho < 520;
      return {
        marginLeft: estrecho ? 44 : 52,
        marginRight: estrecho ? 78 : 92,
        marginTop: MARGEN_SUPERIOR,
        marginBottom: MARGEN_INFERIOR,
        x: {
          type: 'linear',
          label: null,
          domain: [minimoX, maximoX],
          ticks: ticksAnuales(minimoX, maximoX, estrecho ? 4 : 7),
          tickFormat: (d: number) => String(d),
          line: true,
        },
        y: {
          label: unidadEje,
          domain: [minimoY, maximoY],
          grid: true,
          ticks: 5,
          tickFormat: (d: number) => formatearNumero(d, { maxDecimales: 1 }),
        },
        color: { type: 'identity' },
        marks: [
          ...conPuntos.map((s) => {
            const espana = s.pais === CODIGO_ESPANA;
            return Plot.line(s.puntos, {
              x: 'anio',
              y: 'valor',
              stroke: espana ? token('resaltado') : token('apagado'),
              strokeWidth: espana ? 3 : 1.5,
              strokeDasharray: esAgregado(s.pais) ? '6 3' : 'none',
            });
          }),
          // Con pocos puntos (series de la OCDE por años sueltos) se marcan los puntos.
          ...conPuntos
            .filter((s) => s.puntos.length <= 12)
            .map((s) =>
              Plot.dot(s.puntos, {
                x: 'anio',
                y: 'valor',
                stroke: s.pais === CODIGO_ESPANA ? token('resaltado') : token('apagado'),
                fill: token('papel'),
                r: 3.5,
              }),
            ),
          Plot.text(
            etiquetas.filter((e) => !e.destacada),
            {
              x: 'anio',
              y: 'y',
              text: 'texto',
              dx: 8,
              textAnchor: 'start',
              fontWeight: 500,
              fill: token('tinta-2'),
            },
          ),
          Plot.text(
            etiquetas.filter((e) => e.destacada),
            {
              x: 'anio',
              y: 'y',
              text: 'texto',
              dx: 8,
              textAnchor: 'start',
              fontWeight: 700,
              fill: token('acento-oscuro'),
            },
          ),
        ],
      };
    };
  }, [conPuntos, alto, unidadEje]);

  return (
    <div className="bloque-grafico">
      {conPuntos.length === 0 ? (
        <>
          <p className="grafico-titulo">{titulo}</p>
          <p className="hist-aviso">Ninguno de los países elegidos tiene dato en esta medida.</p>
        </>
      ) : (
        <Chart
          titulo={titulo}
          descripcion={descripcion}
          alto={alto}
          opciones={opciones}
          tabla={{ titulo, columnas, filas }}
          fuentes={fuentes}
          {...(nota === undefined ? {} : { nota })}
        />
      )}
      <ComoLeerlo>{comoLeerlo}</ComoLeerlo>
    </div>
  );
}
