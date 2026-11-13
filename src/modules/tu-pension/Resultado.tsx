import { forwardRef, type ReactNode } from 'react';
import { DataTable } from '../../components/DataTable';
import type { BasesPeriodoCalculo } from '../../engine/jubilacion/tipos';
import { GraficoBases } from './GraficoBases';
import type { ModeloResultado } from './presentador';
import type { MensajeError } from './errores';
import { TEXTOS } from './textos';

export const ErrorMotorVista = forwardRef<HTMLDivElement, { error: MensajeError }>(
  function ErrorMotorVista({ error }, ref) {
    return (
      <div className="tp-error-motor" role="alert" tabIndex={-1} ref={ref}>
        <h3>{error.titulo}</h3>
        <p>{error.mensaje}</p>
        <p>
          <strong>Qué puedes hacer:</strong> {error.accion}
        </p>
      </div>
    );
  },
);

interface ResultadoProps {
  modelo: ModeloResultado;
  /** IPC supuesto usado, en %, tal como se escribió. */
  ipcUsado: string | undefined;
  /** Bases mes a mes del periodo de cálculo; `undefined` si el motor no las expone (incapacidad). */
  bases: BasesPeriodoCalculo | undefined;
  /** Bloque de comparación con las lecturas por defecto (va justo después de las cifras). */
  comparacion?: ReactNode;
  /** Bloque propio de la prestación junto al resultado (lecturas abiertas que intervienen). */
  aviso?: ReactNode;
  /** Nota que explica por qué no hay gráfico de bases (cuando el motor no las expone). */
  notaSinBases?: string | undefined;
}

/** Cifras principales, requisitos y explicación paso a paso. */
export const Resultado = forwardRef<HTMLHeadingElement, ResultadoProps>(function Resultado(
  { modelo, ipcUsado, bases, comparacion, aviso, notaSinBases },
  ref,
) {
  return (
    <div className="tp-resultado">
      <h2 tabIndex={-1} ref={ref}>
        {TEXTOS.resultadoTitulo}
      </h2>
      <p className={`tp-estado tp-estado-${modelo.estado}`}>{modelo.textoEstado}</p>
      <dl className="tp-cifras">
        {modelo.cifras.map((c, i) => (
          <div
            key={c.etiqueta}
            className={
              i === 0 && modelo.cumpleRequisitos ? 'tp-cifra tp-cifra-principal' : 'tp-cifra'
            }
          >
            <dt>{c.etiqueta}</dt>
            <dd>
              {c.valor}
              {c.detalle ? <span className="tp-cifra-detalle"> · {c.detalle}</span> : null}
            </dd>
          </div>
        ))}
      </dl>
      {comparacion}
      {aviso}
      <p className="tp-normativa">
        Normativa aplicada: la del año {modelo.momentoNormativa} ({modelo.anioNormativa}). Importes
        en euros de ese año.
        {ipcUsado ? ` IPC anual supuesto para los meses sin dato: ${ipcUsado} %.` : ''}
      </p>

      <section className="tp-subseccion" aria-labelledby="tp-requisitos">
        <h3 id="tp-requisitos">{modelo.tituloRequisitos}</h3>
        <DataTable
          titulo="Requisitos: lo acreditado frente a lo exigido"
          ocultarTitulo
          columnas={[
            { clave: 'requisito', titulo: 'Requisito' },
            { clave: 'acreditado', titulo: 'Acreditado', tipo: 'texto' },
            { clave: 'exigido', titulo: 'Exigido', tipo: 'texto' },
            { clave: 'cumple', titulo: '¿Se cumple?' },
          ]}
          filas={modelo.requisitos.map((q) => ({
            requisito: q.descripcion,
            acreditado: q.acreditado,
            exigido: q.exigido,
            cumple: q.cumple ? 'Sí' : 'No',
          }))}
        />
      </section>

      {bases ? (
        <section className="tp-subseccion" aria-labelledby="tp-bases">
          <h3 id="tp-bases">{TEXTOS.graficoSeccion}</h3>
          <GraficoBases bases={bases} />
        </section>
      ) : null}

      <section className="tp-subseccion" aria-labelledby="tp-como">
        <h3 id="tp-como">{TEXTOS.comoTitulo}</h3>
        {bases === undefined && notaSinBases ? <p className="campo-ayuda">{notaSinBases}</p> : null}
        <ol className="tp-pasos">
          {modelo.pasos.map((p) => (
            <li key={p.id} className="tp-paso">
              <h4>{p.titulo}</h4>
              {p.parrafos.map((texto) => (
                <p key={texto}>{texto}</p>
              ))}
              <p className="tp-articulo">{p.articulo}</p>
            </li>
          ))}
        </ol>
      </section>

      {modelo.avisos.length > 0 ? (
        <section className="tp-subseccion" aria-labelledby="tp-avisos">
          <h3 id="tp-avisos">{TEXTOS.avisosTitulo}</h3>
          <ul className="tp-avisos">
            {modelo.avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
});
