import { Field } from '../../components/Field';
import { SourceLine } from '../../components/SourceLine';
import { TEXTOS } from './textos';
import type { CatalogoReferencias, ReferenciaBase } from './referencias';

interface ReferenciasBaseProps {
  catalogo: CatalogoReferencias;
  /** Identificador de la definición de «base media» elegida. */
  definicionMedia: string;
  onCambio: (id: string) => void;
}

function Cobertura({ r }: { r: ReferenciaBase }) {
  return (
    <p className="campo-ayuda">
      {TEXTOS.coberturaDatos}: de {String(r.primerAnio)} a {String(r.ultimoAnio)}.{' '}
      {r.dividirEntreDoce ? TEXTOS.conversionAnual : TEXTOS.conversionMensual}
    </p>
  );
}

/**
 * Referencias de base de los tramos con su fuente de /data. La «base media» tiene varias
 * definiciones de salario, que se muestran lado a lado sin recomendar ninguna; por defecto, la que
 * ya usa el valor inicial de la carrera simple.
 */
export function ReferenciasBase({ catalogo, definicionMedia, onCambio }: ReferenciasBaseProps) {
  const medias = catalogo.referencias.filter((r) => r.tipo === 'media');
  const elegida = medias.find((r) => r.id === definicionMedia) ?? medias[0];
  const otras = catalogo.referencias.filter((r) => r.tipo !== 'media');
  return (
    <section className="tp-referencias" aria-labelledby="tp-referencias-titulo">
      <h3 id="tp-referencias-titulo">{TEXTOS.referenciasTitulo}</h3>
      <p className="campo-ayuda">{TEXTOS.referenciasIntro}</p>
      <Field etiqueta={TEXTOS.definicionMediaEtiqueta} ayuda={TEXTOS.neutralidadMedia}>
        {(atributos) => (
          <select
            {...atributos}
            value={elegida?.id ?? ''}
            onChange={(e) => {
              onCambio(e.target.value);
            }}
          >
            {medias.map((r) => (
              <option key={r.id} value={r.id}>
                {r.etiqueta}
              </option>
            ))}
          </select>
        )}
      </Field>
      {elegida ? (
        <div className="tp-referencia-elegida">
          <Cobertura r={elegida} />
          {elegida.nota ? <p className="campo-ayuda">{elegida.nota}</p> : null}
          <SourceLine datos={elegida.datosFuente} />
        </div>
      ) : null}
      <details className="tp-referencias-otras">
        <summary>{TEXTOS.otrasReferencias}</summary>
        <p className="campo-ayuda">{TEXTOS.fuentePorAnio}</p>
        {otras.map((r) => (
          <div key={r.id} className="tp-referencia-elegida">
            <p className="campo-etiqueta">{r.etiqueta}</p>
            <Cobertura r={r} />
            <SourceLine datos={r.datosFuente} />
          </div>
        ))}
      </details>
    </section>
  );
}
