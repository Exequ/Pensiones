import * as Plot from '@observablehq/plot';
import { useState } from 'react';
import { useTituloPagina } from '../app/useTituloPagina';
import { Chart, type ContextoGrafico } from '../components/Chart';
import { DataTable } from '../components/DataTable';
import { Definition } from '../components/Definition';
import { DevBanner } from '../components/DevBanner';
import { CATEGORICOS, CATEGORICOS_TEXTO, token } from '../components/estiloGrafico';
import {
  InteractiveSentence,
  SentenceSelect,
  SentenceValue,
} from '../components/InteractiveSentence';
import { Kicker } from '../components/Kicker';
import { Lead } from '../components/Lead';
import { MarginNote } from '../components/MarginNote';
import { SegmentedPills } from '../components/SegmentedPills';
import { SourceLine } from '../components/SourceLine';
import { formatearPorcentaje } from '../engine/formato';
import { MUESTRA, porcentajeFicticio } from './muestra';
import './DesignLab.css';

const OPCIONES_ANIOS = MUESTRA.porcentajePorAnios.map(({ anios }) => anios);

const FILAS_CASOS = MUESTRA.casos.map((c) => {
  const porcentaje = porcentajeFicticio(c.anios);
  return {
    caso: c.caso,
    base: c.baseReguladora,
    anios: c.anios,
    porcentaje,
    pension: c.baseReguladora * porcentaje,
  };
});

const FILAS_PORCENTAJE = MUESTRA.porcentajePorAnios.map((t) => ({
  anios: `${t.anios} años`,
  porcentaje: t.porcentaje,
}));

const PUNTOS_SERIES = MUESTRA.series.flatMap((s, indice) =>
  s.valores.map((valor, periodo) => ({ serie: s.serie, indice, periodo: periodo + 1, valor })),
);

const FILAS_SERIES = MUESTRA.series.map((s) => ({
  serie: s.serie,
  primero: s.valores[0] ?? null,
  ultimo: s.valores[s.valores.length - 1] ?? null,
}));

const TOKENS_PALETA = [
  ['papel', 'Papel'],
  ['tinta', 'Tinta'],
  ['tinta-2', 'Tinta 2'],
  ['apagado', 'Apagado'],
  ['filete', 'Filete'],
  ['acento', 'Acento'],
  ['acento-oscuro', 'Acento oscuro'],
  ['cat-granate', 'Cat. 1 · granate'],
  ['cat-azul', 'Cat. 2 · azul tinta'],
  ['cat-ocre', 'Cat. 3 · ocre'],
  ['cat-verde', 'Cat. 4 · verde'],
  ['cat-gris', 'Cat. 5 · gris'],
  ['sec-1', 'Secuencial 1'],
  ['sec-2', 'Secuencial 2'],
  ['sec-3', 'Secuencial 3'],
  ['sec-4', 'Secuencial 4'],
  ['sec-5', 'Secuencial 5'],
] as const;

const opcionesLineas = ({ ancho }: ContextoGrafico): Plot.PlotOptions => ({
  marginRight: ancho < 480 ? 64 : 80,
  x: { label: 'Periodo (ficticio)', ticks: 6, line: true },
  y: { label: null, grid: true, ticks: 4, zero: true },
  color: { type: 'identity' },
  marks: [
    Plot.lineY(PUNTOS_SERIES, {
      x: 'periodo',
      y: 'valor',
      z: 'serie',
      stroke: (d: { indice: number }) => CATEGORICOS[d.indice] ?? token('tinta'),
      strokeWidth: 2,
    }),
    Plot.text(
      PUNTOS_SERIES,
      Plot.selectLast({
        x: 'periodo',
        y: 'valor',
        z: 'serie',
        text: 'serie',
        textAnchor: 'start',
        dx: 6,
        fill: (d: { indice: number }) => CATEGORICOS_TEXTO[d.indice] ?? token('tinta'),
        fontWeight: 600,
      }),
    ),
  ],
});

/** Laboratorio de diseño: ruta /diseno, no enlazada en la navegación. Cifras FICTICIAS. */
export default function DesignLab() {
  useTituloPagina('Laboratorio de diseño');
  const [anios, setAnios] = useState(MUESTRA.aniosPorDefecto);
  const porcentaje = porcentajeFicticio(anios);

  const opcionesBarras = ({ ancho }: ContextoGrafico): Plot.PlotOptions => ({
    marginLeft: 8,
    marginRight: 8,
    marginTop: 28,
    x: { label: null, tickSize: 0, padding: ancho < 480 ? 0.25 : 0.35 },
    y: { axis: null, domain: [0, 1] },
    color: { type: 'identity' },
    marks: [
      Plot.barY(MUESTRA.porcentajePorAnios, {
        x: (d: { anios: number }) => `${d.anios} años`,
        y: 'porcentaje',
        fill: (d: { anios: number }) => (d.anios === anios ? token('resaltado') : token('resto')),
      }),
      // Etiquetas directas: la barra resaltada en acento y seminegrita; el resto, en tinta 2.
      ...[false, true].map((resaltada) =>
        Plot.text(MUESTRA.porcentajePorAnios, {
          filter: (d: { anios: number }) => (d.anios === anios) === resaltada,
          x: (d: { anios: number }) => `${d.anios} años`,
          y: 'porcentaje',
          text: (d: { porcentaje: number }) => formatearPorcentaje(d.porcentaje),
          dy: -10,
          fill: resaltada ? token('acento') : token('tinta-2'),
          fontWeight: resaltada ? 600 : 400,
        }),
      ),
      Plot.ruleY([0], { stroke: token('tinta') }),
    ],
  });

  const filaDestacada = FILAS_CASOS.findIndex((f) => f.anios === anios);

  return (
    <div className="laboratorio">
      <div className="laboratorio-aviso" role="note">
        <p className="contenedor">
          <strong>Laboratorio de diseño.</strong> Página interna, no enlazada. Todas las cifras de
          esta página son ficticias.
        </p>
      </div>

      {/* Reproducción de la maqueta de referencia */}
      <article className="contenedor pagina">
        <div className="articulo">
          <header className="pagina-cabecera">
            <Kicker>Cómo se calcula · 1 de 9</Kicker>
            <h1>¿De qué depende la cuantía de una pensión de jubilación?</h1>
            <Lead>
              Dos factores pesan más que ningún otro: lo que se ha cotizado y durante cuánto tiempo.
              Este ejemplo, con cifras inventadas, muestra cómo se presentará el cálculo.
            </Lead>
          </header>

          <p>
            La cuantía inicial se obtiene aplicando un porcentaje a la base reguladora. Ese
            porcentaje crece con los años cotizados. Elige un número de años para ver cómo cambia el
            resultado en este ejemplo ficticio.
          </p>
          <MarginNote>
            <p>
              Las cifras de esta página son ficticias y solo sirven para probar el diseño. Las
              reales llegarán con su fuente en fases posteriores.
            </p>
          </MarginNote>

          <SegmentedPills
            leyenda="Años cotizados"
            opciones={OPCIONES_ANIOS.map((a) => ({ valor: a, etiqueta: String(a) }))}
            valor={anios}
            onCambio={setAnios}
          />

          <InteractiveSentence>
            Con{' '}
            <SentenceSelect
              etiqueta="Años cotizados"
              opciones={OPCIONES_ANIOS.map((a) => ({ valor: a, texto: String(a) }))}
              valor={anios}
              onCambio={setAnios}
            />{' '}
            años cotizados, la pensión de este ejemplo sería el{' '}
            <SentenceValue>{formatearPorcentaje(porcentaje)}</SentenceValue> de la base reguladora.
          </InteractiveSentence>

          <Chart
            titulo="Porcentaje de la base reguladora según los años cotizados"
            descripcion="Ejemplo ficticio. En porcentaje de la base reguladora."
            opciones={opcionesBarras}
            alto={260}
            tabla={{
              columnas: [
                { clave: 'anios', titulo: 'Años cotizados' },
                { clave: 'porcentaje', titulo: 'Porcentaje', tipo: 'porcentaje' },
              ],
              filas: FILAS_PORCENTAJE,
              filaDestacada: OPCIONES_ANIOS.indexOf(anios),
            }}
            nota="Datos ficticios."
            fuentes={MUESTRA.fuentes.slice(0, 1)}
          />

          <Definition termino="Base reguladora">
            Importe de referencia sobre el que se calcula la pensión. Se obtiene a partir de las
            bases de cotización de un periodo determinado.
          </Definition>

          <DataTable
            titulo="Tres casos ficticios"
            columnas={[
              { clave: 'caso', titulo: 'Caso' },
              { clave: 'base', titulo: 'Base reguladora', tipo: 'euros' },
              { clave: 'anios', titulo: 'Años cotizados', tipo: 'numero' },
              { clave: 'porcentaje', titulo: 'Porcentaje', tipo: 'porcentaje' },
              { clave: 'pension', titulo: 'Pensión', tipo: 'euros' },
            ]}
            filas={FILAS_CASOS}
            {...(filaDestacada >= 0 ? { filaDestacada } : {})}
            pie="Importes mensuales ficticios, en euros."
          />
          <MarginNote etiqueta="Cómo leer la tabla">
            <p>Se destaca el caso que coincide con los años elegidos arriba, si lo hay.</p>
          </MarginNote>

          <SourceLine datos={MUESTRA.fuentes} />
        </div>
      </article>

      {/* Catálogo de componentes */}
      <section className="contenedor pagina" aria-labelledby="catalogo">
        <div className="seccion">
          <h2 id="catalogo">Catálogo de componentes</h2>
        </div>

        <div className="catalogo">
          <section className="catalogo-bloque" aria-labelledby="cat-paleta">
            <h3 id="cat-paleta">Paleta</h3>
            <ul className="paleta">
              {TOKENS_PALETA.map(([token, nombre]) => (
                <li key={token} className="paleta-elemento">
                  <span className={`paleta-muestra paleta-muestra--${token}`} aria-hidden="true" />
                  <span className="paleta-nombre">{nombre}</span>
                  <code className="paleta-token">--color-{token}</code>
                </li>
              ))}
            </ul>
          </section>

          <section className="catalogo-bloque" aria-labelledby="cat-tipografia">
            <h3 id="cat-tipografia">Tipografía</h3>
            <div className="tipografia">
              <Kicker>Kicker · antetítulo</Kicker>
              <p className="tipografia-h1">Titular h1 en Newsreader</p>
              <p className="tipografia-h2">Subtítulo h2 en Newsreader</p>
              <Lead>Entradilla en Newsreader, más grande que el texto corrido.</Lead>
              <p>Texto de lectura en Newsreader, con cifras tabulares: 1.234,56 y 7.890,12.</p>
              <p className="texto-interfaz">Etiqueta de interfaz en Public Sans.</p>
            </div>
          </section>

          <section className="catalogo-bloque" aria-labelledby="cat-lineas">
            <h3 id="cat-lineas">Gráfico de líneas con etiquetas directas</h3>
            <Chart
              titulo="Cinco series ficticias con la paleta categórica"
              descripcion="Cada serie se identifica con su etiqueta, sin leyenda aparte."
              opciones={opcionesLineas}
              tabla={{
                columnas: [
                  { clave: 'serie', titulo: 'Serie' },
                  { clave: 'primero', titulo: 'Primer periodo', tipo: 'numero' },
                  { clave: 'ultimo', titulo: 'Último periodo', tipo: 'numero' },
                ],
                filas: FILAS_SERIES,
              }}
              nota="Datos ficticios."
            />
          </section>

          <section className="catalogo-bloque" aria-labelledby="cat-fuente">
            <h3 id="cat-fuente">Línea de fuente</h3>
            <SourceLine datos={MUESTRA.fuentes[1] ?? MUESTRA.fuentes} />
            <SourceLine datos={MUESTRA.fuentes} />
          </section>

          <section className="catalogo-bloque" aria-labelledby="cat-banner">
            <h3 id="cat-banner">Franja de desarrollo</h3>
            <DevBanner visible />
          </section>
        </div>
      </section>
    </div>
  );
}
