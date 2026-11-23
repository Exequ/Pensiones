import { SourceLine } from '../../components/SourceLine';
import { datosDeUbicacion } from './datos-como';
import type { Esquema } from './esquemas';
import { norma } from './normas';

/**
 * Esquema de cálculo: pasos en orden. Las normas que sostienen cada paso no se ven en el cuerpo:
 * están en el desplegable «Fuentes» de la sección, con la descripción del paso como rótulo.
 */
export function EsquemaPasos({ esquema }: { readonly esquema: Esquema }) {
  const datos = esquema.pasos.flatMap((p) =>
    datosDeUbicacion(p.titulo, p.normas.map((id) => norma(id).etiqueta).join('; ')),
  );
  return (
    <>
      <ol className="como-pasos">
        {esquema.pasos.map((p) => (
          <li key={p.id} className="como-paso">
            <h4>{p.titulo}</h4>
            {p.texto.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </li>
        ))}
      </ol>
      <SourceLine datos={datos} titulo={`Normas de cada paso: ${esquema.titulo}`} />
    </>
  );
}
