import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Definition } from '../../components/Definition';
import type { ArchivoMitos } from '../../engine/esquema-datos';
import { buscarSeccion, type SlugSeccion } from '../secciones';

export type Mito = ArchivoMitos['mitos'][number];

export interface EnlaceSeccion {
  readonly slug: SlugSeccion;
}

interface AfirmacionProps {
  readonly mito: Mito;
  /** Posición en el catálogo (desde cero) y número de afirmaciones del catálogo. */
  readonly indice: number;
  readonly total: number;
  /** «Qué se puede medir»: qué datos hay y con qué definición. */
  readonly medible: ReactNode;
  /** Gráficos, tablas y «Cómo leerlo». */
  readonly children: ReactNode;
  /** Páginas de la web donde ya está el dato. */
  readonly enlaces: readonly EnlaceSeccion[];
}

/**
 * Tarjeta de una afirmación circulante. La estructura es la misma para las doce, en el orden del
 * catálogo: la afirmación tal como circula, qué se puede medir, los datos con su fuente y su
 * «Cómo leerlo», las definiciones alternativas lado a lado, lo que los datos no permiten concluir y
 * lo que falta. No hay veredicto: la página no dice si la afirmación es cierta.
 */
export function Afirmacion({ mito, indice, total, medible, children, enlaces }: AfirmacionProps) {
  const idTitulo = `${mito.id}-titulo`;
  return (
    <section className="seccion prosa mito" id={mito.id} aria-labelledby={idTitulo}>
      <p className="mito-numero">
        Afirmación {indice + 1} de {total}
      </p>
      <h2 className="mito-titulo" id={idTitulo} tabIndex={-1}>
        {mito.enunciado}
      </h2>

      <h3>Qué se puede medir</h3>
      {medible}

      {children}

      <h3>Definiciones alternativas</h3>
      <div className="mito-definiciones">
        {mito.definiciones.map((d) => (
          <Definition key={d.nombre} termino={d.nombre}>
            {d.literal}
          </Definition>
        ))}
      </div>

      <h3>Qué no se puede concluir con los datos</h3>
      <ul>
        {mito.noSePuedeConcluir.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>

      {mito.faltan && mito.faltan.length > 0 ? (
        <>
          <h3>Qué falta en los datos</h3>
          <ul>
            {mito.faltan.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </>
      ) : null}

      {enlaces.length > 0 ? (
        <>
          <h3>Dónde ver más</h3>
          <ul className="mito-enlaces">
            {enlaces.map((e) => (
              <li key={e.slug}>
                <Link to={`/${e.slug}`}>{buscarSeccion(e.slug).tituloNav}</Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
