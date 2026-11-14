import { filasLecturasJubilacionEnIncapacidad } from './lecturas-jubilacion-en-incapacidad';
import { ETIQUETA_ESTADO } from './supuestos';
import { TEXTOS_INCAPACIDAD_PROPIOS as T } from './textos-incapacidad';

/**
 * Nota plegable de la pantalla de incapacidad: qué lecturas de jubilación se aplican y con qué
 * valor (el del registro, leído al mostrarla). No son editables aquí; el botón lleva a la pantalla
 * de jubilación, donde se explican y se pueden cambiar para el cálculo de la jubilación.
 */
export function LecturasJubilacionEnIncapacidad({
  onIrAJubilacion,
}: {
  onIrAJubilacion: () => void;
}) {
  const filas = filasLecturasJubilacionEnIncapacidad();
  return (
    <details className="tp-jubilacion-aplicada">
      <summary>{T.jubilacionAplicadaTitulo}</summary>
      <p>{T.jubilacionAplicadaIntro}</p>
      <ul className="tp-lecturas-aplicadas">
        {filas.map((f) => (
          <li key={f.id}>
            <strong>{f.titulo}.</strong> {T.jubilacionAplicadaValor}: {f.valorAplicado}.{' '}
            {T.jubilacionAplicadaEstado}: {ETIQUETA_ESTADO[f.estado]}.
          </li>
        ))}
      </ul>
      <button type="button" className="tp-boton-secundario" onClick={onIrAJubilacion}>
        {T.jubilacionAplicadaEnlace}
      </button>
    </details>
  );
}
