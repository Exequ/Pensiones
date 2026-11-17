import { useState } from 'react';
import { DataTable } from '../../components/DataTable';
import { SegmentedPills } from '../../components/SegmentedPills';
import { SourceLine } from '../../components/SourceLine';
import { ComoLeerlo } from '../historico/ComoLeerlo';
import { datosHucha, type FilaContraste2025 } from '../historico/datos-hucha';
import { decimal2, entero } from '../historico/formatos';
import { TABLA_CONTRASTE } from './ids-datos';

/** Partidas que se muestran, con su rótulo: (tabla, patrón de la partida de la liquidación, rótulo). */
const PARTIDAS: readonly (readonly [string, RegExp, string])[] = [
  [TABLA_CONTRASTE.ingresos, /^TOTAL INGRESOS/, 'Total de ingresos'],
  [TABLA_CONTRASTE.ingresos, /^1\. Cotizaciones sociales/, 'Cotizaciones sociales'],
  [
    TABLA_CONTRASTE.ingresosCapitulos,
    /^Mecanismo de Equidad/,
    'De ellas, Mecanismo de Equidad Intergeneracional',
  ],
  [
    TABLA_CONTRASTE.ingresos,
    /^4\. Transferencias corrientes/,
    'Transferencias corrientes (ingresos)',
  ],
  [TABLA_CONTRASTE.ingresos, /^9\. Pasivos financieros/, 'Pasivos financieros (ingresos)'],
  [TABLA_CONTRASTE.gastos, /^TOTAL GASTOS/, 'Total de gastos'],
  [
    TABLA_CONTRASTE.gastosCapitulo,
    /^SUMA PENSIONES/,
    'Pensiones contributivas, suma de las clases',
  ],
  [TABLA_CONTRASTE.gastosCapitulo, /^Complemento a m/, 'Complemento a mínimos'],
  [TABLA_CONTRASTE.gastos, /^4\. Transferencias corrientes/, 'Transferencias corrientes (gastos)'],
];

type Fila = Record<string, string | number | null>;

/**
 * «Un año con las dos fuentes»: la liquidación del último ejercicio frente a la ejecución al cierre del
 * mismo ejercicio y del anterior. Muestra que la definición coincide y las diferencias que hay, sin
 * unir la liquidación a las de años anteriores (la ruptura de serie sigue rotulada en la página) y sin
 * atribuir causa a ninguna diferencia (Fase 5-A4).
 */
export function SeccionContraste() {
  const c = datosHucha().contraste2025;
  const anios = [...new Set(c.filas.map((f) => f.ejercicio))].sort((a, b) => a - b);
  const ultimo = anios.at(-1);
  const anterior = anios.at(-2);
  if (ultimo === undefined || anterior === undefined)
    throw new Error('Faltan ejercicios del contraste');
  const [anio, setAnio] = useState<number>(ultimo);

  const de = (a: number, tabla: string, patron: RegExp): FilaContraste2025 | undefined =>
    c.filas.find((f) => f.ejercicio === a && f.tabla === tabla && patron.test(f.partida));
  const filas: Fila[] = PARTIDAS.flatMap(([tabla, patron, rotulo]) => {
    const f = de(anio, tabla, patron);
    return f
      ? [
          {
            partida: rotulo,
            liquidacion: f.liquidacion,
            ejecucion: f.ejecucion,
            diferencia: f.diferencia,
          },
        ]
      : [];
  });
  const delUltimo = c.filas.filter((f) => f.ejercicio === ultimo);
  const delAnterior = c.filas.filter((f) => f.ejercicio === anterior);
  const difieren = delAnterior.filter((f) => !f.coincide);
  const totalContributivas = difieren.find((f) =>
    /^TOTAL PRESTACIONES CONTRIBUTIVAS/.test(f.partida),
  );
  const filasMei: Fila[] = c.mei.map((m) => ({
    anio: String(m.anio),
    derechos: m.derechos,
    dotacion: m.dotacion,
    diferencia: m.derechos - m.dotacion,
  }));

  return (
    <section className="seccion prosa" aria-labelledby="contraste-liquidacion">
      <h2 id="contraste-liquidacion">
        Un ejercicio con las dos fuentes: la liquidación frente a la ejecución
      </h2>
      <p>
        Para el último ejercicio, la Seguridad Social publica la liquidación del presupuesto del
        sistema en un documento y la ejecución al cierre de diciembre en otro. Esta sección compara
        las dos, partida por partida. De las {entero(delUltimo.length)} cifras del ejercicio{' '}
        {ultimo} que se pueden casar, coinciden {entero(delUltimo.filter((f) => f.coincide).length)}
        ; en {anterior} coinciden {entero(delAnterior.filter((f) => f.coincide).length)} de{' '}
        {entero(delAnterior.length)}, y las {entero(difieren.length)} que difieren son del capítulo
        de transferencias corrientes de gastos
        {totalContributivas ? (
          <>
            {' '}
            (la suma de las prestaciones contributivas difiere en{' '}
            {decimal2(totalContributivas.diferencia)} millones de euros)
          </>
        ) : null}
        . Los datos no permiten atribuir esa diferencia a una causa.
      </p>
      <SegmentedPills<number>
        leyenda="Ejercicio"
        opciones={anios.map((a) => ({ valor: a, etiqueta: String(a) }))}
        valor={anio}
        onCambio={setAnio}
      />
      <DataTable
        titulo={`Liquidación y ejecución al cierre del ejercicio ${anio}, en millones de euros`}
        columnas={[
          { clave: 'partida', titulo: 'Partida' },
          { clave: 'liquidacion', titulo: 'Liquidación', tipo: 'numero', decimales: 2 },
          { clave: 'ejecucion', titulo: 'Ejecución', tipo: 'numero', decimales: 2 },
          { clave: 'diferencia', titulo: 'Diferencia', tipo: 'numero', decimales: 2 },
        ]}
        filas={filas}
        pie="Diferencia: ejecución menos liquidación. Una diferencia de cero indica que las dos publicaciones dan la misma cifra con dos decimales."
      />
      <SourceLine datos={c.dato} />
      <h3>El Mecanismo de Equidad Intergeneracional: derechos reconocidos y dotaciones al Fondo</h3>
      <DataTable
        titulo="Derechos reconocidos del Mecanismo de Equidad Intergeneracional en la liquidación y dotaciones anuales al Fondo de Reserva con cargo a ese mecanismo, en millones de euros"
        columnas={[
          { clave: 'anio', titulo: 'Ejercicio' },
          {
            clave: 'derechos',
            titulo: 'Derechos reconocidos (liquidación)',
            tipo: 'numero',
            decimales: 2,
          },
          {
            clave: 'dotacion',
            titulo: 'Dotación al Fondo (informe a las Cortes)',
            tipo: 'numero',
            decimales: 0,
          },
          { clave: 'diferencia', titulo: 'Diferencia', tipo: 'numero', decimales: 2 },
        ]}
        filas={filasMei}
        pie="Diferencia: derechos reconocidos menos dotación. La fuente no concilia las dos cifras y esta página no atribuye la diferencia a ninguna causa."
      />
      <SourceLine datos={[c.dato, c.datoDotaciones]} />
      <ComoLeerlo>
        <p>
          Una liquidación y una ejecución que dan las mismas cifras comparten definición: ambas
          recogen obligaciones reconocidas en los gastos y derechos reconocidos netos en los
          ingresos. Eso permite usar la liquidación del ejercicio {ultimo} como contraste de la
          ejecución, pero no une la liquidación a las de los ejercicios anteriores de las series de
          esta página: entre ellas no hay ejercicio común y la ruptura de serie sigue rotulada.
        </p>
        <p>
          Los derechos reconocidos se contabilizan al nacer el derecho de cobro; las dotaciones al
          Fondo son una cifra de otra publicación y de otro concepto. Por eso la tabla del Mecanismo
          de Equidad Intergeneracional enfrenta dos magnitudes distintas: no es un error de una de
          ellas, y esta página no muestra la recaudación de caja de cada mes porque no figura en las
          fuentes descargadas.
        </p>
      </ComoLeerlo>
    </section>
  );
}
