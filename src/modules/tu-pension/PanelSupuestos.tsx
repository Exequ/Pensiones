import { TEXTOS } from './textos';
import type { LecturaVista } from './supuestos';

interface PanelSupuestosProps {
  lecturas: readonly LecturaVista[];
  conEfecto: boolean;
  /** Se llama al elegir otro valor de una lectura. */
  onElegir: (id: string, valor: string) => void;
  /** Devuelve todas las lecturas a su valor por defecto. */
  onRestablecer: () => void;
}

/**
 * Panel «Supuestos y lecturas». Cada lectura abierta es un grupo de opciones (botones de opción
 * nativos: teclado completo, etiquetas y objetivos de 44 px). El estado (decidida, provisional,
 * pendiente) se distingue con texto y con el borde (continuo, discontinuo, punteado), no solo con el
 * color, y se muestra como información sobre la revisión actuarial, nunca como consejo.
 */
export function PanelSupuestos({
  lecturas,
  conEfecto,
  onElegir,
  onRestablecer,
}: PanelSupuestosProps) {
  return (
    <section className="seccion tp-supuestos" aria-labelledby="tp-supuestos">
      <h2 id="tp-supuestos">{TEXTOS.supuestosTitulo}</h2>
      <p>{TEXTOS.supuestosIntro}</p>
      <p className="campo-ayuda">{TEXTOS.supuestosEstadoNota}</p>
      <div className="tp-restablecer">
        <button type="button" className="tp-boton-secundario" onClick={onRestablecer}>
          {TEXTOS.restablecerLecturas}
        </button>
        <span className="campo-ayuda">{TEXTOS.restablecerAyuda}</span>
      </div>
      <ul className="tp-lecturas">
        {lecturas.map((l) => (
          <li
            key={l.id}
            className={`tp-lectura tp-lectura-${l.estado}${l.cambiada ? ' tp-lectura-cambiada' : ''}`}
          >
            <h3>{l.titulo}</h3>
            <p>{l.descripcion}</p>
            <p className="tp-lectura-estado">
              <span className="tp-etiqueta-estado">Estado: {l.etiquetaEstado}</span>{' '}
              <span>{l.explicacionEstado}</span>
            </p>
            <fieldset className="tp-opciones-lectura">
              <legend>Cómo se lee: {l.titulo}</legend>
              {l.opciones.map((o) => {
                const idOpcion = `${l.id}-${o.valor}`;
                return (
                  <div key={o.valor} className="tp-opcion-lectura">
                    <label htmlFor={idOpcion} className="tp-opcion-etiqueta">
                      <input
                        id={idOpcion}
                        type="radio"
                        name={l.id}
                        value={o.valor}
                        checked={l.valorActual === o.valor}
                        aria-describedby={`${idOpcion}-que`}
                        onChange={() => {
                          onElegir(l.id, o.valor);
                        }}
                      />
                      <span className="tp-opcion-texto">
                        <span className="tp-opcion-nombre">
                          {o.etiqueta}
                          {o.esPorDefecto ? (
                            <span className="tp-opcion-defecto"> ({TEXTOS.opcionPorDefecto})</span>
                          ) : null}
                        </span>
                        <span className="tp-opcion-que" id={`${idOpcion}-que`}>
                          {o.queCambia}
                        </span>
                      </span>
                    </label>
                  </div>
                );
              })}
            </fieldset>
            <dl className="tp-lectura-datos">
              <div>
                <dt>{TEXTOS.lecturaMotivo}</dt>
                <dd>
                  {l.motivo ? (
                    <>
                      {l.motivo} (<time dateTime={l.fechaEstado}>{l.fechaEstado}</time>)
                    </>
                  ) : (
                    TEXTOS.lecturaSinDecidir
                  )}
                </dd>
              </div>
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
      {conEfecto ? <p className="campo-ayuda">{TEXTOS.supuestosEfectoNota}</p> : null}
    </section>
  );
}
