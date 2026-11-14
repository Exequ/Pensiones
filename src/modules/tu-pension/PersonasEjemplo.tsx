import { describirPersona, type PersonaEjemplo } from './personas';
import { TEXTOS } from './textos';

export interface PersonaCargada {
  readonly id: string;
  readonly notas: readonly string[];
}

interface PersonasEjemploProps {
  personas: readonly PersonaEjemplo[];
  onCargar: (id: string) => void;
  /** Mensaje de la última acción (por ejemplo, que faltan las fechas). */
  mensaje: string | undefined;
  cargada: PersonaCargada | undefined;
  /** Introducción propia de la prestación (por defecto, la de la jubilación). */
  introduccion?: string;
  /** Nota sobre el «salario medio ilustrativo» (cobertura de la definición elegida). */
  notaMedia?: string;
}

/** Personas-ejemplo ilustrativas: cada una carga su carrera, en tramos, en la tabla. */
export function PersonasEjemplo({
  personas,
  onCargar,
  mensaje,
  cargada,
  introduccion,
  notaMedia,
}: PersonasEjemploProps) {
  const persona = personas.find((p) => p.id === cargada?.id);
  return (
    <section className="tp-personas" aria-labelledby="tp-personas-titulo">
      <h3 id="tp-personas-titulo">{TEXTOS.personasTitulo}</h3>
      <p className="campo-ayuda">{introduccion ?? TEXTOS.personasIntro}</p>
      {notaMedia ? <p className="campo-ayuda tp-nota-media">{notaMedia}</p> : null}
      <ul className="tp-personas-lista">
        {personas.map((p) => (
          <li key={p.id} className="tp-persona">
            <div>
              <h4>
                {p.nombre} <span className="tp-etiqueta-estado">{TEXTOS.ilustrativo}</span>
              </h4>
              <p className="campo-ayuda">{p.descripcion}</p>
              <p className="campo-ayuda">{describirPersona(p)}</p>
            </div>
            <button
              type="button"
              className="tp-boton-secundario"
              onClick={() => {
                onCargar(p.id);
              }}
            >
              {TEXTOS.cargarPersona}{' '}
              <span className="visualmente-oculto">la persona «{p.nombre}»</span>
            </button>
          </li>
        ))}
      </ul>
      <div role="status" aria-live="polite" className="tp-persona-estado">
        {mensaje ? <p className="campo-error">{mensaje}</p> : null}
        {persona && cargada ? (
          <div className="tp-persona-cargada">
            <p>
              <strong>{TEXTOS.personaCargadaTitulo}:</strong> {persona.nombre} (
              {TEXTOS.ilustrativo.toLowerCase()}). {TEXTOS.personaCargadaTexto}
            </p>
            {cargada.notas.length > 0 ? (
              <>
                <p>{TEXTOS.personaAjustes}:</p>
                <ul className="tp-avisos">
                  {cargada.notas.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
