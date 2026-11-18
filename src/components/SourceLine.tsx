import { useEffect, useId, useRef, useState } from 'react';
import type { Dato } from '../engine/esquema-datos';
import { ETIQUETA_NATURALEZA, etiquetasNaturaleza, fuentesUnicas } from './fuentes';
import type { ReferenciaFuente } from './fuentes';
import './SourceLine.css';

interface SourceLineProps {
  /** Uno o varios datos; las fuentes repetidas se muestran una sola vez. */
  datos: Dato | readonly Dato[];
  /**
   * Título del gráfico, la tabla o el bloque al que pertenece la fuente. Si se indica, el botón
   * tiene un nombre accesible único («Fuentes: título») y el desplegable lo repite.
   */
  titulo?: string;
}

/** Instancia con el desplegable abierto, si la hay: solo uno a la vez. */
interface Instancia {
  readonly cerrar: () => void;
}
let abiertoActual: Instancia | null = null;

/**
 * Línea de fuente generada a partir de los datos: la palabra «Fuentes» (o «Fuente») como botón que
 * abre un desplegable con título (enlace), organismo, identificador del documento, naturaleza y,
 * solo si el dato los lleva, la cita y la ubicación en el documento. Si el dato declara su
 * naturaleza, se muestra siempre junto al botón, sin abrir nada: una proyección de modelo nunca debe
 * leerse como un dato observado.
 *
 * La fecha de descarga y la confianza siguen en los datos (`fetchedAt`, `confidence`) y se validan
 * con `npm run validate:data`, pero la interfaz no las muestra, ni siquiera a los lectores de pantalla.
 */
export function SourceLine({ datos, titulo }: SourceLineProps) {
  const lista: readonly Dato[] = Array.isArray(datos) ? datos : [datos as Dato];
  const fuentes = fuentesUnicas(lista);
  const [abierto, setAbierto] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  const habiaAbierto = useRef(false);

  // Al cerrar, el foco vuelve al botón (con el diálogo modal abierto, el resto de la página es inerte,
  // así que solo se puede hacer una vez desmontado).
  useEffect(() => {
    if (abierto) {
      habiaAbierto.current = true;
    } else if (habiaAbierto.current) {
      habiaAbierto.current = false;
      boton.current?.focus();
    }
  }, [abierto]);

  const [instancia] = useState<Instancia>(() => ({
    cerrar: () => {
      setAbierto(false);
    },
  }));

  useEffect(
    () => () => {
      if (abiertoActual === instancia) abiertoActual = null;
    },
    [instancia],
  );

  function cerrar() {
    if (abiertoActual === instancia) abiertoActual = null;
    setAbierto(false);
  }

  function abrir() {
    if (abiertoActual !== null && abiertoActual !== instancia) abiertoActual.cerrar();
    abiertoActual = instancia;
    setAbierto(true);
  }

  if (fuentes.length === 0) return null;
  const etiquetaBoton = fuentes.length === 1 ? 'Fuente' : 'Fuentes';
  const naturalezas = etiquetasNaturaleza(fuentes);
  return (
    <div className="linea-fuente">
      <button
        ref={boton}
        type="button"
        className="linea-fuente-boton"
        aria-haspopup="dialog"
        aria-expanded={abierto}
        {...(titulo === undefined ? {} : { 'aria-label': `${etiquetaBoton}: ${titulo}` })}
        onClick={abierto ? cerrar : abrir}
      >
        {etiquetaBoton}
      </button>
      {naturalezas.length > 0 ? (
        <span className="linea-fuente-naturaleza">naturaleza: {naturalezas.join('; ')}</span>
      ) : null}
      {abierto ? (
        <DialogoFuentes
          fuentes={fuentes}
          etiqueta={etiquetaBoton}
          {...(titulo === undefined ? {} : { titulo })}
          onCerrar={cerrar}
        />
      ) : null}
    </div>
  );
}

function DialogoFuentes({
  fuentes,
  etiqueta,
  titulo,
  onCerrar,
}: {
  readonly fuentes: readonly ReferenciaFuente[];
  readonly etiqueta: string;
  readonly titulo?: string;
  readonly onCerrar: () => void;
}) {
  const idTitulo = useId();
  const dialogo = useRef<HTMLDialogElement>(null);
  const cerrarBoton = useRef<HTMLButtonElement>(null);
  // Siempre la última versión de onCerrar, sin volver a montar los oyentes en cada pintado.
  const alCerrar = useRef(onCerrar);
  useEffect(() => {
    alCerrar.current = onCerrar;
  });

  useEffect(() => {
    const nodo = dialogo.current;
    if (!nodo) return;
    // jsdom no implementa showModal: sin él se abre como diálogo no modal (la prueba real, en el
    // navegador, usa el modal nativo, con fondo inerte).
    if (typeof nodo.showModal === 'function') {
      if (!nodo.open) nodo.showModal();
    } else {
      nodo.setAttribute('open', '');
    }
    cerrarBoton.current?.focus();

    // Oyentes nativos (y no props de React): un <dialog> no es un elemento interactivo para las
    // reglas de accesibilidad del lint, y el comportamiento es el mismo con y sin showModal.
    let empezoFuera: boolean | null = null;
    const alCancelar = (evento: Event) => {
      evento.preventDefault();
      alCerrar.current();
    };
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        alCerrar.current();
      } else if (evento.key === 'Tab') {
        // El modal nativo deja salir el foco hacia el navegador al pasar del último control: se
        // cierra el circuito para que el foco no se pierda.
        const controles = [...nodo.querySelectorAll<HTMLElement>('button, a[href]')];
        const primero = controles[0];
        const ultimo = controles.at(-1);
        if (!primero || !ultimo) return;
        if (evento.shiftKey && document.activeElement === primero) {
          evento.preventDefault();
          ultimo.focus();
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
          evento.preventDefault();
          primero.focus();
        }
      }
    };
    const alBajarElPuntero = (evento: Event) => {
      empezoFuera = evento.target === nodo;
    };
    const alHacerClic = (evento: Event) => {
      // El fondo del modal es el propio <dialog>: un clic que empieza y acaba ahí es «fuera».
      const fuera = evento.target === nodo && empezoFuera !== false;
      empezoFuera = null;
      if (fuera) alCerrar.current();
    };
    nodo.addEventListener('cancel', alCancelar);
    nodo.addEventListener('keydown', alPulsar);
    nodo.addEventListener('pointerdown', alBajarElPuntero);
    nodo.addEventListener('click', alHacerClic);
    return () => {
      nodo.removeEventListener('cancel', alCancelar);
      nodo.removeEventListener('keydown', alPulsar);
      nodo.removeEventListener('pointerdown', alBajarElPuntero);
      nodo.removeEventListener('click', alHacerClic);
    };
  }, []);

  return (
    <dialog ref={dialogo} className="fuentes-dialogo" aria-labelledby={idTitulo}>
      <div className="fuentes-dialogo-contenido">
        <div className="fuentes-dialogo-cabecera">
          <p id={idTitulo} className="fuentes-dialogo-titulo">
            {titulo === undefined ? etiqueta : `${etiqueta}: ${titulo}`}
          </p>
          <button
            ref={cerrarBoton}
            type="button"
            className="fuentes-dialogo-cerrar"
            onClick={onCerrar}
          >
            Cerrar
          </button>
        </div>
        <ul className="fuentes-dialogo-lista">
          {fuentes.map((fuente) => (
            <li key={fuente.clave} className="fuentes-dialogo-fuente">
              <a className="fuentes-dialogo-enlace" href={fuente.url}>
                {fuente.titulo}
              </a>
              <dl className="fuentes-dialogo-datos">
                <div>
                  <dt>Organismo</dt>
                  <dd>{fuente.organismo}</dd>
                </div>
                {fuente.docId ? (
                  <div>
                    <dt>Identificador del documento</dt>
                    <dd>{fuente.docId}</dd>
                  </div>
                ) : null}
                {fuente.naturaleza ? (
                  <div>
                    <dt>Naturaleza</dt>
                    <dd>{ETIQUETA_NATURALEZA[fuente.naturaleza]}</dd>
                  </div>
                ) : null}
                {fuente.citas.map((c, i) => (
                  <div key={i}>
                    {c.cita === undefined ? null : (
                      <>
                        <dt>Cita</dt>
                        <dd className="fuentes-dialogo-cita">{c.cita}</dd>
                      </>
                    )}
                    {c.ubicacion === undefined ? null : (
                      <>
                        <dt>Ubicación en el documento</dt>
                        <dd>{c.ubicacion}</dd>
                      </>
                    )}
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  );
}
