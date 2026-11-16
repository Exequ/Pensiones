import {
  filasLecturasJubilacionEnIncapacidad,
  LECTURAS_JUBILACION_EN_SUPERVIVENCIA,
} from './lecturas-jubilacion-en-incapacidad';
import { ETIQUETA_ESTADO } from './supuestos';
import { TEXTOS_INCAPACIDAD_PROPIOS } from './textos-incapacidad';
import { TEXTOS_SUPERVIVENCIA } from './textos-supervivencia';

/**
 * Nota plegable de la pantalla de incapacidad: qué lecturas de jubilación se aplican y con qué
 * valor (el del registro, leído al mostrarla). No son editables aquí; el botón lleva a la pantalla
 * de jubilación, donde se explican y se pueden cambiar para el cálculo de la jubilación.
 */
export function LecturasJubilacionEnIncapacidad({
  onIrAJubilacion,
  prestacion = 'incapacidad',
}: {
  onIrAJubilacion: () => void;
  /** `supervivencia`: la nota de la viudedad y la orfandad (Fase 3-C2). */
  prestacion?: 'incapacidad' | 'supervivencia';
}) {
  const supervivencia = prestacion === 'supervivencia';
  const T = supervivencia ? TEXTOS_SUPERVIVENCIA : TEXTOS_INCAPACIDAD_PROPIOS;
  const filas = filasLecturasJubilacionEnIncapacidad(
    supervivencia ? LECTURAS_JUBILACION_EN_SUPERVIVENCIA : undefined,
  );
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
