import {
  datosDeLaCaja,
  etiquetaGrado,
  FUNCIONES_MOTOR_INTERPRETACION,
  formatearMarcador,
  resolverMarcadores,
  rotuloInterpretacion,
  valorMarcador,
  type Interpretacion,
  type ResolverDato,
} from '../engine/interpretaciones';
import { SourceLine } from './SourceLine';
import './InterpretationBox.css';

/** Atributo que identifica una caja en el DOM (lo usan las pruebas de neutralidad y de orden). */
export const ATRIBUTO_INTERPRETACION = 'data-interpretacion';
export const SELECTOR_INTERPRETACION = `[${ATRIBUTO_INTERPRETACION}]`;

interface InterpretationBoxProps {
  readonly interpretacion: Interpretacion;
  /** Datos de /data que la página pone a disposición de la caja (los de `datosQueLaSostienen`). */
  readonly resolver: ResolverDato;
  /** Funciones del motor (por defecto, el registro `FUNCIONES_MOTOR_INTERPRETACION`). */
  readonly motor?: Readonly<Record<string, () => number>>;
}

/**
 * Caja «Interpretación» (fase RI, `docs/INTERPRETACIONES.md`): una lectura experta de los datos que la
 * preceden, separada de ellos y rotulada. Va siempre después del gráfico, la tabla o la cifra que
 * interpreta (el elemento con el id `interpretacion.ancla`). Muestra el texto con sus cifras resueltas
 * desde los datos, la hipótesis y el rango si es una proyección, el criterio de cada término de
 * valoración, el grado de confianza (escala provisional, como etiqueta neutra) y sus fuentes.
 * El estado de revisión no se muestra aquí: consta en «Metodología».
 */
export function InterpretationBox({
  interpretacion: r,
  resolver,
  motor = FUNCIONES_MOTOR_INTERPRETACION,
}: InterpretationBoxProps) {
  const texto = (t: string) => resolverMarcadores(r, t, resolver, motor);
  const cifra = (nombre: string) => {
    const m = r.marcadores[nombre];
    if (m === undefined) throw new RangeError(`${r.id}: marcador sin definir ${nombre}`);
    return formatearMarcador(valorMarcador(r, m, resolver, motor), m.formato, m.decimales);
  };
  const rotulo = rotuloInterpretacion(r);
  const datos = datosDeLaCaja(r, resolver);
  const p = r.proyeccion;
  return (
    <section
      className="interpretacion"
      aria-label={`Interpretación: ${r.titulo}`}
      {...{ [ATRIBUTO_INTERPRETACION]: r.id }}
      data-interpreta={r.ancla}
      {...(r.ejemplo === true ? { 'data-ejemplo': 'true' } : {})}
    >
      <p className="interpretacion-rotulo">{rotulo}</p>
      <p className="interpretacion-titulo">{r.titulo}</p>
      <p className="interpretacion-texto">{texto(r.texto)}</p>
      {p === undefined ? null : (
        <p className="interpretacion-hipotesis">
          <span className="interpretacion-campo">Hipótesis:</span> {texto(p.hipotesis)}
          {p.rango === undefined ? null : (
            <>
              {' '}
              <span className="interpretacion-campo">Rango:</span> entre {cifra(p.rango.desde)} y{' '}
              {cifra(p.rango.hasta)}.
            </>
          )}
        </p>
      )}
      {r.criterios.length === 0 ? null : (
        <div className="interpretacion-criterios">
          <p className="interpretacion-campo">Criterio de cada valoración</p>
          <dl>
            {r.criterios.map((c) => (
              <div key={c.termino}>
                <dt>{c.termino}</dt>
                <dd>{texto(c.definicion)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      <p className="interpretacion-grado">
        <span className="interpretacion-campo">Grado de confianza (escala provisional):</span>{' '}
        <span className="interpretacion-etiqueta">{etiquetaGrado(r.grado)}</span>
      </p>
      {r.atribucion?.fuentePrimaria === undefined ? null : (
        <p className="interpretacion-primaria">
          <span className="interpretacion-campo">Fuente que cita la publicación:</span>{' '}
          {r.atribucion.fuentePrimaria}
        </p>
      )}
      <SourceLine datos={datos} titulo={`${rotulo}: ${r.titulo}`} />
    </section>
  );
}
