import { useId, useRef } from 'react';
import type { Dato } from '../engine/esquema-datos';
import { ETIQUETA_NATURALEZA, etiquetasNaturaleza, fuentesUnicas } from './fuentes';
import type { DatoRotulado, ReferenciaFuente } from './fuentes';
import { crearGrupoDialogos, useDialogoModal, useDialogoUnico } from './dialogoModal';
import './SourceLine.css';

interface SourceLineProps {
  /** Uno o varios datos; las fuentes repetidas se muestran una sola vez. */
  datos: DatoRotulado | readonly DatoRotulado[];
  /**
   * Título del gráfico, la tabla o el bloque al que pertenece la fuente. Si se indica, el botón
   * tiene un nombre accesible único («Fuentes: título») y el desplegable lo repite.
   */
  titulo?: string;
}

/** Desplegables de fuentes: solo uno abierto a la vez. */
const GRUPO_FUENTES = crearGrupoDialogos();

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
  const lista: readonly DatoRotulado[] = Array.isArray(datos) ? datos : [datos as Dato];
  const fuentes = fuentesUnicas(lista);
  const boton = useRef<HTMLButtonElement>(null);
  const { abierto, abrir, cerrar } = useDialogoUnico(GRUPO_FUENTES, boton);

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
  useDialogoModal(dialogo, cerrarBoton, onCerrar);

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
                    {c.rotulo === undefined ? null : (
                      <>
                        <dt>Se refiere a</dt>
                        <dd className="fuentes-dialogo-rotulo">{c.rotulo}</dd>
                      </>
                    )}
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
