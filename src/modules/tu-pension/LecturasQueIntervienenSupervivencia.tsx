import { lecturasQueIntervienenSupervivencia } from './intervienen';
import type { LecturaVista } from './supuestos';
import { TEXTOS_SUPERVIVENCIA as T } from './textos-supervivencia';

/**
 * Lecturas abiertas que intervienen en el resultado de la viudedad o la orfandad (Fase 3-C2): las
 * que, con los datos de la persona, cambian el resultado con su alternativa, sean decididas,
 * provisionales o pendientes. Si ninguna lo cambia, lo dice: no se oculta nada.
 */
export function LecturasQueIntervienenSupervivencia({
  lecturas,
}: {
  lecturas: readonly LecturaVista[];
}) {
  const visibles = lecturasQueIntervienenSupervivencia(lecturas);
  return (
    <section className="tp-intervienen" aria-labelledby="tp-intervienen-titulo">
      <h3 id="tp-intervienen-titulo">{T.intervienenTitulo}</h3>
      {visibles.length === 0 ? (
        <p>{T.intervienenNinguna}</p>
      ) : (
        <>
          <p>{T.intervienenIntro}</p>
          <ul className="tp-lecturas">
            {visibles.map((l) => (
              <li key={l.id} className={`tp-lectura tp-lectura-${l.estado}`}>
                <h4>{l.titulo}</h4>
                <dl className="tp-lectura-datos">
                  <div>
                    <dt>{T.intervienenEstado}</dt>
                    <dd>
                      <span className="tp-etiqueta-estado">{l.etiquetaEstado}</span>{' '}
                      {l.explicacionEstado}
                    </dd>
                  </div>
                  <div>
                    <dt>{T.intervienenMotivo}</dt>
                    <dd>
                      {l.motivo ? (
                        <>
                          {l.motivo} (<time dateTime={l.fechaEstado}>{l.fechaEstado}</time>)
                        </>
                      ) : (
                        'Sin decidir todavía.'
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>{T.intervienenEfecto}</dt>
                    <dd>{l.efecto ?? T.intervienenSinEfecto}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
          <p className="tp-nota-lecturas">{T.intervienenNota}</p>
        </>
      )}
    </section>
  );
}
