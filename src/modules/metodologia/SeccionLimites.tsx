import { EnlaceFichero } from './Respaldo';
import { LIMITES } from './respaldo';
import { tituloApartado } from './apartados';

/** Apartado «Qué no hace esta web». */
export function SeccionLimites() {
  return (
    <section
      className="seccion prosa met-seccion"
      id="met-limites"
      aria-labelledby="met-limites-titulo"
    >
      <h2 id="met-limites-titulo" tabIndex={-1}>
        {tituloApartado('met-limites')}
      </h2>
      <p>
        Estos son los límites de la web que constan en el repositorio, con el fichero donde se
        recoge cada uno:
      </p>
      <ul className="met-limites">
        {LIMITES.map((l) => (
          <li key={l.texto}>
            {l.texto} <span className="met-respaldo-para">Consta en </span>
            <EnlaceFichero fichero={l.fichero} />.
          </li>
        ))}
      </ul>
    </section>
  );
}
