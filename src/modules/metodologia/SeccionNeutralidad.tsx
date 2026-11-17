import { Definition } from '../../components/Definition';
import { formatearNumero } from '../../engine/formato';
import { recuentos } from './recuentos';
import { Respaldo } from './Respaldo';

/** Apartado «Neutralidad y verificación». */
export function SeccionNeutralidad() {
  const { listasDeTerminos, pruebas } = recuentos;
  return (
    <section
      className="seccion prosa met-seccion"
      id="met-neutralidad"
      aria-labelledby="met-neutralidad-titulo"
    >
      <h2 id="met-neutralidad-titulo" tabIndex={-1}>
        Neutralidad y verificación
      </h2>
      <p>
        Esta página describe cómo se hace la web. No defiende sus resultados ni los de ningún
        modelo.
      </p>
      <h3>La política de neutralidad</h3>
      <ul>
        <li>
          Si un resultado depende de cómo se mida (por ejemplo, las distintas definiciones de
          déficit o de la relación entre cotizantes y pensionistas), se muestran las definiciones
          alternativas con sus datos.
        </li>
        <li>
          Los textos no usan adjetivos valorativos ni tono panfletario: se explica, no se persuade.
        </li>
        <li>
          Las reformas se describen por lo que dice la norma, y las afirmaciones que circulan se
          contrastan con datos y definiciones, sin dictar veredicto.
        </li>
      </ul>
      <h3>Cómo se comprueba</h3>
      <p>
        Las pruebas automáticas recorren el texto de las páginas con listas de términos de
        valoración ({formatearNumero(listasDeTerminos.valoracion)} términos), de valoración propia
        de las reformas ({formatearNumero(listasDeTerminos.valoracionReformas)}) y de veredicto (
        {formatearNumero(listasDeTerminos.veredicto)}), y fallan si aparece alguno, con las
        excepciones que cada prueba declara (por ejemplo, los títulos oficiales de las normas y sus
        citas literales). {formatearNumero(pruebas.conListasDeTerminos)} ficheros de pruebas usan
        esas listas. Esta página las cumple igual que las demás: su prueba las aplica a su propio
        texto y a los textos de sus datos.
      </p>
      <Definition termino="La verificación manda">
        Cuando una indicación externa choca con lo que consta en una fuente descargada o con un
        recálculo desde /data, manda la verificación. Un revisor expresa una opinión experta, no una
        fuente: sus correcciones se aplican solo tras comprobarlas, y sus cifras y sus frases
        valorativas no pasan a la web.
      </Definition>
      <Respaldo apartado="neutralidad" />
    </section>
  );
}
