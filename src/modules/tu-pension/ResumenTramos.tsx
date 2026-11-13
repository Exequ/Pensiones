import { formatearNumero } from '../../engine/formato';
import { TEXTOS } from './textos';
import { textoDeHueco, type AvisoTramo, type ResumenCarrera } from './tramos';

interface ResumenTramosProps {
  resumen: ResumenCarrera;
  avisos: readonly AvisoTramo[];
}

/**
 * Resumen vivo bajo la tabla: meses cotizados, meses sin cotizar (lagunas) y huecos detectados,
 * más lo que hará el cálculo con las bases fuera de los límites. Región de estado (`aria-live`).
 */
export function ResumenTramos({ resumen, avisos }: ResumenTramosProps) {
  const hayTramos = resumen.primerMes !== undefined;
  return (
    <section className="tp-resumen-carrera" aria-labelledby="tp-resumen-titulo">
      <h3 id="tp-resumen-titulo">{TEXTOS.resumenTitulo}</h3>
      <div role="status" aria-live="polite">
        {hayTramos ? (
          <>
            <dl className="tp-cifras tp-cifras-resumen">
              <div className="tp-cifra">
                <dt>{TEXTOS.resumenMesesCotizados}</dt>
                <dd>{formatearNumero(resumen.mesesCotizados)}</dd>
              </div>
              <div className="tp-cifra">
                <dt>{TEXTOS.resumenMesesSinCotizar}</dt>
                <dd>{formatearNumero(resumen.mesesSinCotizar)}</dd>
              </div>
              <div className="tp-cifra">
                <dt>{TEXTOS.resumenHuecos}</dt>
                <dd>{formatearNumero(resumen.huecos.length)}</dd>
              </div>
            </dl>
            {resumen.huecos.length > 0 ? (
              <ul className="tp-huecos">
                {resumen.huecos.map((h) => (
                  <li key={h.desde}>{textoDeHueco(h)}</li>
                ))}
              </ul>
            ) : (
              <p className="tp-sin-resultado">{TEXTOS.resumenSinHuecos}</p>
            )}
          </>
        ) : (
          <p className="tp-sin-resultado">{TEXTOS.resumenSinTramos}</p>
        )}
      </div>
      {avisos.length > 0 ? (
        <div className="tp-avisos-limites">
          <h4>{TEXTOS.avisosLimitesTitulo}</h4>
          <ul className="tp-avisos">
            {avisos.map((a) => (
              <li key={a.mensaje}>{a.mensaje}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
