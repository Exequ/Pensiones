import { norma } from './normas';
import type { Esquema } from './esquemas';

/** Esquema de cálculo: pasos en orden, con la norma que sostiene cada uno. */
export function EsquemaPasos({ esquema }: { readonly esquema: Esquema }) {
  return (
    <ol className="como-pasos">
      {esquema.pasos.map((p) => (
        <li key={p.id} className="como-paso">
          <h4>{p.titulo}</h4>
          {p.texto.map((t) => (
            <p key={t}>{t}</p>
          ))}
          <p className="como-normas">
            <span className="como-etiqueta">Norma:</span>{' '}
            {p.normas.map((id) => norma(id).etiqueta).join('; ')}
          </p>
        </li>
      ))}
    </ol>
  );
}
