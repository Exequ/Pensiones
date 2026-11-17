import { REPOSITORIO, RESPALDO, type IdApartado } from './respaldo';

/** Enlace a un fichero del repositorio (rama principal). */
export function EnlaceFichero({ fichero }: { fichero: string }) {
  return (
    <a href={`${REPOSITORIO}/blob/main/${fichero}`} rel="noopener noreferrer">
      <code>{fichero}</code>
    </a>
  );
}

/** «Dónde consta»: los ficheros del repositorio que respaldan lo que dice un apartado. */
export function Respaldo({ apartado }: { apartado: IdApartado }) {
  const entradas = RESPALDO[apartado];
  if (entradas.length === 0) return null;
  return (
    <div className="met-respaldo">
      <h3 id={`met-${apartado}-respaldo`}>Dónde consta</h3>
      <ul aria-labelledby={`met-${apartado}-respaldo`}>
        {entradas.map((r) => (
          <li key={`${r.fichero}|${r.contiene}`}>
            <EnlaceFichero fichero={r.fichero} />{' '}
            <span className="met-respaldo-para">{r.para}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
