import { definicionPorId } from '../contenido/definiciones';
import { anclaDefinicion } from '../engine/definiciones';
import { resolverFormula } from '../engine/formulas';
import { Definition } from './Definition';
import { Formula } from './Formula';
import { SourceLine } from './SourceLine';
import type { DatoRotulado } from './fuentes';
import './DefinitionById.css';

interface DefinitionByIdProps {
  /** Id estable de la definición (`src/contenido/definiciones/<id>.json`). */
  readonly id: string;
  /**
   * Da el `Dato` (o los `Dato`) de cada referencia de la definición (recibe también el id de la
   * definición), con los ficheros que la página ya carga. Debe cubrir todas: si falta una, el
   * componente falla (no se pinta una definición sin su fuente).
   */
  readonly fuentes: (
    referencia: string,
    idDefinicion: string,
  ) => DatoRotulado | readonly DatoRotulado[] | undefined;
  /** Oculta la fórmula si la página la muestra en otro sitio. Por defecto se muestra. */
  readonly sinFormula?: boolean;
}

/**
 * Definición reutilizable del módulo de definiciones (fase R7), por su id: término, explicación,
 * perímetro (qué incluye, qué no y qué no detallan las fuentes), criterio, fórmula con leyenda si es
 * un cálculo propio y «Fuentes» con las citas y ubicaciones de los datos que la sostienen. No escribe
 * ninguna cifra. Con un id que no existe falla con un mensaje que lista los ids válidos.
 */
export function DefinitionById({ id, fuentes, sinFormula = false }: DefinitionByIdProps) {
  const d = definicionPorId(id);
  const datos = d.datos.flatMap((ref) => {
    const r = fuentes(ref, id);
    if (r === undefined) throw new Error(`Definición «${id}»: falta la fuente de ${ref}`);
    return Array.isArray(r) ? (r as readonly DatoRotulado[]) : [r as DatoRotulado];
  });
  // Las fórmulas de las definiciones solo llevan símbolos: ninguna referencia que resolver.
  const formula =
    d.formula === undefined || sinFormula ? null : resolverFormula(d.formula, () => undefined);
  const p = d.perimetro;
  return (
    <div className="definicion-modulo" id={anclaDefinicion(id)}>
      <Definition termino={d.termino}>
        {d.texto.map((parrafo) => (
          <p key={parrafo}>{parrafo}</p>
        ))}
        {p === undefined && d.criterio === undefined ? null : (
          <dl className="definicion-modulo-perimetro">
            {p !== undefined && p.incluye.length > 0 ? (
              <div>
                <dt>Incluye</dt>
                {p.incluye.map((x) => (
                  <dd key={x}>{x}</dd>
                ))}
              </div>
            ) : null}
            {p !== undefined && p.noIncluye.length > 0 ? (
              <div>
                <dt>No incluye</dt>
                {p.noIncluye.map((x) => (
                  <dd key={x}>{x}</dd>
                ))}
              </div>
            ) : null}
            {p?.sinDetalle === undefined ? null : (
              <div>
                <dt>Sin detalle en las fuentes</dt>
                <dd>{p.sinDetalle}</dd>
              </div>
            )}
            {d.criterio === undefined ? null : (
              <div>
                <dt>Criterio</dt>
                <dd>{d.criterio}</dd>
              </div>
            )}
          </dl>
        )}
        {formula === null ? null : <Formula formula={formula} />}
        <SourceLine datos={datos} titulo={`Definición: ${d.termino}`} />
      </Definition>
    </div>
  );
}
