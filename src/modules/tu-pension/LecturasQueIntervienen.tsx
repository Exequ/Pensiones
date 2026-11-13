import { LECTURA_ANL, lecturasQueIntervienen } from './intervienen';
import { TEXTOS_INCAPACIDAD_PROPIOS as T } from './textos-incapacidad';
import type { LecturaVista } from './supuestos';
import type { FormularioTuPension } from './tipos';

export function LecturasQueIntervienen({
  lecturas,
  origen,
}: {
  lecturas: readonly LecturaVista[];
  origen: FormularioTuPension['origen'];
}) {
  const visibles = lecturasQueIntervienen(lecturas, origen);
  if (visibles.length === 0) return null;
  const hayAnl = visibles.some((l) => l.id === LECTURA_ANL);
  return (
    <section className="tp-intervienen" aria-labelledby="tp-intervienen-titulo">
      <h3 id="tp-intervienen-titulo">{T.intervienenTitulo}</h3>
      <p>
        {hayAnl && origen === 'accidente-no-laboral' ? T.intervienenAnlIntro : T.intervienenIntro}
      </p>
      <ul className="tp-lecturas">
        {visibles.map((l) => (
          <li key={l.id} className={`tp-lectura tp-lectura-${l.estado}`}>
            <h4>{l.id === LECTURA_ANL ? T.intervienenAnlTitulo : l.titulo}</h4>
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
    </section>
  );
}
