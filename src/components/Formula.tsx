import { Fragment, useId, type ReactNode } from 'react';
import type { FormulaResuelta, NodoMath } from '../engine/formulas';
import './Formula.css';

/**
 * Símbolo de la leyenda o de la fórmula: «B_mín» se escribe con subíndice textual y el resto, tal cual.
 * Los identificadores de varias letras («BR», «Pensión») salen en vertical, como en una fórmula impresa.
 */
function Notacion({ texto }: { readonly texto: string }): ReactNode {
  const [base, sub] = texto.split('_', 2);
  if (sub === undefined || base === undefined) return <mi>{texto}</mi>;
  return (
    <msub>
      <mi>{base}</mi>
      <mi>{sub}</mi>
    </msub>
  );
}

const DELIMITADORES = {
  parentesis: ['(', ')'],
  corchetes: ['[', ']'],
} as const;

/** Traduce una expresión resuelta a MathML. */
function Expresion({ nodo }: { readonly nodo: NodoMath }): ReactNode {
  switch (nodo.tipo) {
    case 'simbolo':
      return nodo.subindice ? (
        <msub>
          <Notacion texto={nodo.texto} />
          <Expresion nodo={nodo.subindice} />
        </msub>
      ) : (
        <Notacion texto={nodo.texto} />
      );
    case 'numero':
      return <mn>{nodo.texto}</mn>;
    case 'suma':
      return (
        <mrow>
          {nodo.terminos.map((t, i) => (
            <Fragment key={i}>
              {i > 0 ? <mo>+</mo> : null}
              <Expresion nodo={t} />
            </Fragment>
          ))}
        </mrow>
      );
    case 'producto':
      return (
        <mrow>
          {nodo.factores.map((f, i) => (
            <Fragment key={i}>
              {i > 0 ? <mo>·</mo> : null}
              <Expresion nodo={f} />
            </Fragment>
          ))}
        </mrow>
      );
    case 'cociente':
      return (
        <mfrac>
          <mrow>
            <Expresion nodo={nodo.numerador} />
          </mrow>
          <mrow>
            <Expresion nodo={nodo.denominador} />
          </mrow>
        </mfrac>
      );
    case 'sumatorio':
      return (
        <mrow>
          <munderover>
            <mo>∑</mo>
            <mrow>
              <Expresion nodo={nodo.variable} />
              <mo>=</mo>
              <Expresion nodo={nodo.desde} />
            </mrow>
            <Expresion nodo={nodo.hasta} />
          </munderover>
          <Expresion nodo={nodo.cuerpo} />
        </mrow>
      );
    case 'grupo': {
      const [abre, cierra] = DELIMITADORES[nodo.delimitador];
      return (
        <mrow>
          <mo>{abre}</mo>
          <Expresion nodo={nodo.cuerpo} />
          <mo>{cierra}</mo>
        </mrow>
      );
    }
  }
}

interface FormulaProps {
  /** Fórmula con las cifras ya resueltas (`resolverFormula`): el componente no escribe ninguna. */
  readonly formula: FormulaResuelta;
}

/**
 * Fórmula con notación matemática (MathML nativo) y la leyenda de cada símbolo y de cada cifra
 * debajo, como listas de definición. El nombre accesible de cada ecuación es su lectura en palabras.
 * En pantallas estrechas la fórmula se desplaza dentro de su caja, no la página.
 */
export function Formula({ formula }: FormulaProps) {
  const idTitulo = useId();
  return (
    <figure className="formula" aria-labelledby={idTitulo}>
      <figcaption id={idTitulo} className="formula-titulo">
        {formula.titulo}
      </figcaption>
      <div className="formula-caja" role="region" aria-labelledby={idTitulo} tabIndex={0}>
        {formula.ecuaciones.map((e, i) => (
          <math
            key={i}
            display="block"
            role="math"
            aria-label={e.lectura}
            className="formula-ecuacion"
          >
            <mrow>
              <Expresion nodo={e.izquierda} />
              <mo>=</mo>
              <Expresion nodo={e.derecha} />
            </mrow>
          </math>
        ))}
      </div>
      <p className="formula-leyenda-titulo">Qué significa cada símbolo</p>
      <dl className="formula-leyenda">
        {formula.simbolos.map((s) => (
          <div key={s.id}>
            <dt>
              <math role="math" aria-label={s.notacion.replace('_', ' sub ')}>
                <Notacion texto={s.notacion} />
              </math>
            </dt>
            <dd>
              <strong>{s.nombre}.</strong> {s.significado}
              {s.unidad === null ? null : (
                <span className="formula-unidad"> Unidad: {s.unidad}.</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {formula.cifras.length > 0 ? (
        <>
          <p className="formula-leyenda-titulo">Qué significa cada cifra</p>
          <dl className="formula-leyenda">
            {formula.cifras.map((c) => (
              <div key={`${c.referencia.fichero}#${c.referencia.id}`}>
                <dt>{c.texto}</dt>
                <dd>
                  {c.descripcion}.
                  {c.transitorio === undefined ? null : (
                    <>
                      {' '}
                      Es el valor del texto de la norma cuando se aplica por completo (desde{' '}
                      {c.periodo}); en {c.transitorio.periodo} el valor transitorio es{' '}
                      {c.transitorio.texto}.
                    </>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}
      {formula.notas.length > 0 ? (
        <ul className="formula-notas">
          {formula.notas.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}
    </figure>
  );
}
