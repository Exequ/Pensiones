import { useState } from 'react';
import { DataTable } from '../../components/DataTable';
import { SourceLine } from '../../components/SourceLine';
import { ComoLeerlo } from '../historico/ComoLeerlo';
import { SelectorAnio } from './Comunes';
import type { DatosFinanciero } from './datos-financiero';
import { MODELO } from './ids-datos';
import { ESCENARIO_BASE } from './ids-financiero';
import { aniosSensibilidades, tablaSensibilidades } from './series-financiero';

/**
 * Sensibilidades de M4: cada caso cambia una sola palanca respecto al escenario base. La tabla se muestra
 * para el año que elige el usuario (por defecto, el último de la salida). Los casos van en el orden del
 * LEEME de la salida, sin ordenar por tamaño ni resaltar ninguno; la palanca y su valor son el texto del
 * LEEME. Todas las cifras salen de `data/proyecciones/m4-sensibilidades.json` (y del escenario base de
 * `m4-escenarios.json`); la diferencia con el base se calcula con los valores sin redondear.
 */
export function FinancieroSensibilidades({ d }: { d: DatosFinanciero }) {
  const anios = aniosSensibilidades(d);
  const [anio, setAnio] = useState<number>(anios.at(-1) ?? d.anioInicio);
  const s = d.sensibilidades;
  const tabla = tablaSensibilidades(d, anio);
  const etiquetaBase = d.escenarios.find((e) => e.id === ESCENARIO_BASE)?.etiqueta ?? '';

  const filas = tabla.filas.map((f) => ({
    cambia: f.parametro ?? `Ninguna: es el caso base (${etiquetaBase})`,
    gasto: f.gasto,
    gastoDif: f.gastoDiferencia,
    saldo: f.saldo,
    saldoDif: f.saldoDiferencia,
  }));

  return (
    <>
      <h3 id="proy-fin-sensibilidades">Sensibilidades: una palanca cada vez</h3>
      <p>
        Además de los escenarios de crecimiento de los salarios y de IPC, el modelo {MODELO.m4} se
        ha calculado en {s.casos.length} casos que cambian cada uno una sola palanca respecto al
        escenario base; la palanca y su valor figuran en la tabla. La tabla muestra, para el año
        elegido, el gasto en pensiones y el saldo no financiero de cada caso y su diferencia con el
        caso base. Es una proyección de modelo propio, no una previsión.
      </p>
      <div className="proy-controles">
        <SelectorAnio
          etiqueta="Año de las sensibilidades"
          anios={anios}
          valor={anio}
          onCambio={setAnio}
        />
      </div>
      <p aria-live="polite" className="proy-sensibilidades-aviso">
        <strong>Año mostrado:</strong> {tabla.anio}. Los casos están en el orden del LEEME de la
        salida, no por tamaño.
      </p>

      <div className="proy-sensibilidades">
        <DataTable
          titulo={`Sensibilidades de ${MODELO.m4} en ${tabla.anio}: proyección de modelo, una palanca cada vez respecto al caso base`}
          columnas={[
            {
              clave: 'cambia',
              titulo: 'Palanca que cambia y su valor (según el LEEME de la salida)',
            },
            {
              clave: 'gasto',
              titulo: 'Gasto en pensiones (% del PIB aproximado)',
              tipo: 'numero',
              decimales: 2,
            },
            {
              clave: 'gastoDif',
              titulo: 'Diferencia con el base (puntos de PIB)',
              tipo: 'numero',
              decimales: 2,
            },
            {
              clave: 'saldo',
              titulo: 'Saldo no financiero (% del PIB aproximado)',
              tipo: 'numero',
              decimales: 2,
            },
            {
              clave: 'saldoDif',
              titulo: 'Diferencia con el base (puntos de PIB)',
              tipo: 'numero',
              decimales: 2,
            },
          ]}
          filas={filas}
          pie="Gasto en pensiones: gasto en pensiones contributivas del modelo. Saldo no financiero: ingresos (cotizaciones, transferencias del Estado y otros ingresos) menos gasto en pensiones y menos el resto de gastos. Los dos se expresan en porcentaje del PIB aproximado de cada caso (afiliados por salario nominal), que no es el PIB del INE ni una previsión macroeconómica. La diferencia es el valor del caso menos el del base, calculada con los valores sin redondear: en el gasto, un signo positivo es más gasto que en el base; en el saldo, un signo positivo es un saldo mayor, es decir, menos negativo."
        />
      </div>
      <SourceLine
        datos={[s.tabla.dato, d.m4.dato]}
        titulo={`Sensibilidades de ${MODELO.m4} en ${tabla.anio}: proyección de modelo, una palanca cada vez respecto al caso base`}
      />

      <details className="grafico-datos">
        <summary>Ver lo que es igual en todos los casos</summary>
        <p>
          El caso base es el escenario base de la salida de escenarios, y cada caso cambia una
          palanca respecto a él. Según el LEEME de la salida:
        </p>
        <ul className="hist-estado-lista">
          <li>{s.descripcionBase}</li>
        </ul>
      </details>

      <ComoLeerlo>
        <ul className="hist-estado-lista">
          <li>
            Cada fila cambia solo una palanca y deja las demás como en el caso base. Los casos no se
            combinan: sumar dos diferencias no da el resultado de cambiar las dos palancas a la vez,
            porque ese cálculo no se ha hecho.
          </li>
          <li>
            No es una predicción: son resultados del modelo con la legislación actual congelada y
            con el cambio indicado en cada fila. La tabla no indica qué cambio es más probable ni si
            alguno llegará a aplicarse.
          </li>
          <li>
            Las diferencias se refieren al escenario base indicado (crecimiento real de los salarios
            e IPC). No se han calculado con otro escenario base, y el efecto de un mismo cambio
            puede depender del escenario del que se parte.
          </li>
          <li>
            Los casos van en el orden del LEEME de la salida y ninguno está resaltado. La diferencia
            en puntos de PIB depende también del denominador: cada caso se divide por su propio PIB
            aproximado, y cuando este cambia, la diferencia mezcla el cambio del gasto o del saldo y
            el del PIB aproximado.
          </li>
          <li>
            <strong>Procedencia.</strong> Los {s.casos.length} casos se ejecutaron el{' '}
            <time dateTime={s.ejecutadoEl}>{s.ejecutadoEl}</time> con el código de los modelos, en
            un entorno de ejecución automatizado, no en local por el autor. El caso base es el
            escenario base de la salida de escenarios, que coincide con la ejecución local del
            autor. Reproducción local por el autor de todos los casos:{' '}
            {s.reproduccionLocalPorAutor ? 'sí.' : 'no, todavía no.'}
          </li>
        </ul>
      </ComoLeerlo>
    </>
  );
}
