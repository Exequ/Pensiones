import { TEXTOS } from './textos';
import type { LecturaVista } from './supuestos';

/**
 * Panel «Supuestos y lecturas» (solo lectura). El estado se distingue con texto y con el borde
 * (continuo, discontinuo, punteado), no solo con el color.
 */
export function PanelSupuestos({
  lecturas,
  conEfecto,
}: {
  lecturas: readonly LecturaVista[];
  conEfecto: boolean;
}) {
  return (
    <section className="seccion tp-supuestos" aria-labelledby="tp-supuestos">
      <h2 id="tp-supuestos">{TEXTOS.supuestosTitulo}</h2>
      <p>{TEXTOS.supuestosIntro}</p>
      <ul className="tp-lecturas">
        {lecturas.map((l) => (
          <li key={l.id} className={`tp-lectura tp-lectura-${l.estado}`}>
            <h3>{l.descripcion}</h3>
            <p className="tp-lectura-estado">
              <span className="tp-etiqueta-estado">Estado: {l.etiquetaEstado}</span>{' '}
              <span>{l.explicacionEstado}</span>
            </p>
            <dl className="tp-lectura-datos">
              <div>
                <dt>Valor actual</dt>
                <dd>
                  <code>{l.valorActual}</code>
                </dd>
              </div>
              <div>
                <dt>Alternativas</dt>
                <dd>
                  {l.alternativas.map((a, i) => (
                    <span key={a}>
                      {i > 0 ? ', ' : ''}
                      <code>{a}</code>
                    </span>
                  ))}
                </dd>
              </div>
              {l.motivo ? (
                <div>
                  <dt>Motivo del registro</dt>
                  <dd>
                    {l.motivo} (<time dateTime={l.fechaEstado}>{l.fechaEstado}</time>)
                  </dd>
                </div>
              ) : (
                <div>
                  <dt>Motivo del registro</dt>
                  <dd>Sin decidir todavía.</dd>
                </div>
              )}
              {conEfecto && l.efecto ? (
                <div>
                  <dt>{TEXTOS.supuestosEfecto}</dt>
                  <dd>
                    {l.afectaAlResultado ? (
                      <strong>Afecta a tu resultado. </strong>
                    ) : (
                      <span>No afecta a tu resultado. </span>
                    )}
                    {l.efecto}
                  </dd>
                </div>
              ) : null}
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}
