import { DataTable } from '../../components/DataTable';
import { SegmentedPills } from '../../components/SegmentedPills';
import { SourceLine } from '../../components/SourceLine';
import { formatearNumero, formatearPorcentaje } from '../../engine/formato';
import { ComoLeerlo } from '../historico/ComoLeerlo';
import type { DatosFinanciero } from './datos-financiero';
import { MODELO } from './ids-datos';
import { ESCENARIO_BASE, MAGNITUDES_OBSERVADAS } from './ids-financiero';
import {
  comparacionEscenarios,
  descripcionCambio,
  rentabilidadImplicita,
  rentabilidadReal,
} from './series-financiero';

const pct = (fraccion: number): string => formatearPorcentaje(fraccion, { maxDecimales: 2 });

interface Props {
  readonly d: DatosFinanciero;
  readonly escenario: string;
  readonly onCambio: (id: string) => void;
}

/**
 * Selector de escenario de sensibilidad de M4 (el base, por defecto) y su descripción: qué cambia en cada
 * uno, cómo se comparan en el último año de la salida y cuál es el punto de partida observado. Todas las
 * cifras salen de `data/proyecciones/m4-escenarios.json` (y de lo que ese fichero recoge del LEEME).
 */
export function FinancieroEscenarios({ d, escenario, onCambio }: Props) {
  const base = d.escenarios.find((e) => e.id === ESCENARIO_BASE) ?? d.escenarioActivo;
  const opciones = d.escenarios.map((e) => ({ valor: e.id, etiqueta: e.etiqueta }));
  const comparacion = comparacionEscenarios(d);
  const indiceActivo = comparacion.filas.findIndex((f) => f.id === escenario);

  const filasEscenarios = d.escenarios.map((e) => ({
    escenario: e.etiqueta,
    g: pct(e.g),
    ipc: pct(e.ipc),
    cambia: descripcionCambio(e, base),
  }));
  const filasComparacion = comparacion.filas.map((f) => ({
    escenario: f.escenario,
    gasto: f.gastoPib,
    gastoDif: f.gastoDiferencia,
    saldo: f.saldoPib,
    saldoDif: f.saldoDiferencia,
    fondo: f.fondo,
    pension: f.pensionMediaConstante,
  }));
  const filasObservadas = MAGNITUDES_OBSERVADAS.flatMap((m) => {
    const valor = d.filaObservada.valores[m.columna];
    return valor === undefined
      ? []
      : [
          {
            magnitud: m.rotulo,
            unidad: m.unidad,
            valor: formatearNumero(valor, { decimales: m.decimales }),
          },
        ];
  });

  return (
    <>
      <h3 id="proy-fin-escenarios">Escenarios de sensibilidad</h3>
      <p>
        El modelo {MODELO.m4} se ha calculado en {d.escenarios.length} escenarios que combinan dos
        hipótesis: el crecimiento real de los salarios y el IPC. Cada escenario cambia solo una de
        ellas respecto al base; el resto de palancas del modelo es el mismo en todos. El selector
        elige el escenario que muestran los gráficos y las tablas de este bloque. Al abrir la página
        está seleccionado el escenario base, que es el de los demás modelos.
      </p>
      <div className="proy-controles">
        <SegmentedPills
          leyenda={`Escenario de ${MODELO.m4}`}
          opciones={opciones}
          valor={escenario}
          onCambio={onCambio}
        />
      </div>
      <p aria-live="polite" className="proy-escenario-activo">
        <strong>Escenario mostrado:</strong> {d.escenarioActivo.etiqueta}.{' '}
        {descripcionCambio(d.escenarioActivo, base)}.
      </p>

      <DataTable
        titulo={`Los escenarios de ${MODELO.m4} y lo que cambia en cada uno respecto al base`}
        columnas={[
          { clave: 'escenario', titulo: 'Escenario' },
          { clave: 'g', titulo: 'Crecimiento real de los salarios' },
          { clave: 'ipc', titulo: 'IPC' },
          { clave: 'cambia', titulo: 'Qué cambia respecto al base' },
        ]}
        filas={filasEscenarios}
        filaDestacada={d.escenarios.findIndex((e) => e.id === escenario)}
      />
      <SourceLine datos={[d.m4.dato]} />

      <DataTable
        titulo={`Resultado de cada escenario en ${comparacion.anio}, último año de la salida`}
        columnas={[
          { clave: 'escenario', titulo: 'Escenario' },
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
          {
            clave: 'fondo',
            titulo: 'Valor del Fondo (miles de millones de euros corrientes)',
            tipo: 'numero',
            decimales: 1,
          },
          {
            clave: 'pension',
            titulo: `Pensión media de todas las clases (euros constantes de ${comparacion.anioBase} al mes)`,
            tipo: 'numero',
            decimales: 0,
          },
        ]}
        filas={filasComparacion}
        filaDestacada={indiceActivo}
        pie="Cada escenario se divide por su propio PIB aproximado (afiliados por salario nominal). Las diferencias con el base mezclan, por tanto, el cambio del gasto y el del denominador. Los euros constantes usan el IPC de cada escenario."
      />
      <SourceLine datos={[d.m4.dato]} />

      <details className="grafico-datos">
        <summary>Ver el punto de partida: datos observados de {d.filaObservada.anio}</summary>
        <p>
          La salida de {MODELO.m4} incluye una fila de {d.filaObservada.anio} que no calcula el
          modelo: son datos observados, iguales en todos los escenarios. Así se obtiene cada
          magnitud, según el LEEME de la salida:
        </p>
        <ul className="hist-estado-lista">
          {d.filaObservada.descripcion.map((linea) => (
            <li key={linea}>{linea}</li>
          ))}
        </ul>
        <DataTable
          titulo={`Magnitudes observadas de ${d.filaObservada.anio} que acompañan a la salida`}
          columnas={[
            { clave: 'magnitud', titulo: 'Magnitud' },
            { clave: 'unidad', titulo: 'Unidad' },
            { clave: 'valor', titulo: `Valor de ${d.filaObservada.anio}` },
          ]}
          filas={filasObservadas}
        />
        <SourceLine datos={[d.m4.dato]} />
      </details>

      <details className="grafico-datos">
        <summary>Ver lo que es igual en todos los escenarios</summary>
        <p>
          En los {d.escenarios.length} escenarios, el resto de palancas es el de por defecto del
          modelo:
        </p>
        <ul className="hist-estado-lista">
          {d.parametrosComunes.map((linea) => (
            <li key={linea}>{linea}</li>
          ))}
        </ul>
      </details>

      <ComoLeerlo>
        <p>
          Cada escenario es un cálculo con dos hipótesis: cuánto crecen los salarios por encima de
          los precios y cuánto suben los precios. En el modelo, las dos intervienen en la pensión de
          las altas, en las bases de cotización y en el PIB aproximado, y las pensiones en vigor se
          revalorizan con el IPC. Las tablas dicen cuánto resulta en cada escenario con esos
          supuestos; no dicen cuál es más probable ni cuál debería esperarse.
        </p>
        <ul className="hist-estado-lista">
          {d.escenarios.map((e) => {
            const rentabilidad = rentabilidadImplicita(d, e.id);
            return (
              <li key={e.id}>
                <strong>{e.etiqueta}.</strong> {descripcionCambio(e, base)}.
                {e.ipc === base.ipc
                  ? ''
                  : ` La rentabilidad nominal del Fondo es la misma que en el base (${pct(rentabilidad.minima)}), de modo que su rentabilidad real es ${pct(rentabilidadReal(rentabilidad.minima, e.ipc))}, frente a ${pct(rentabilidadReal(rentabilidad.minima, base.ipc))} en el base.`}
              </li>
            );
          })}
        </ul>
        <p>
          Los resultados en porcentaje del PIB dependen también del denominador: el PIB aproximado
          de cada escenario crece de forma distinta. Por eso la tabla compara en euros el valor del
          Fondo y en euros constantes la pensión media, además de los porcentajes del PIB. La salida
          es un cálculo propio, no una previsión, y hereda la incertidumbre de {MODELO.m2},{' '}
          {MODELO.m1} y {MODELO.m3}.
        </p>
      </ComoLeerlo>
    </>
  );
}
