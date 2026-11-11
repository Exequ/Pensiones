import { Fragment } from 'react';
import type { Dato } from '../engine/esquema-datos';
import { fuentesUnicas } from './fuentes';
import './SourceLine.css';

interface SourceLineProps {
  /** Uno o varios datos; las fuentes repetidas se muestran una sola vez. */
  datos: Dato | readonly Dato[];
}

/**
 * Línea de fuente generada a partir de los datos:
 * «Fuente: título (organismo) · descargado el AAAA-MM-DD · confianza: alta».
 */
export function SourceLine({ datos }: SourceLineProps) {
  const lista: readonly Dato[] = Array.isArray(datos) ? datos : [datos as Dato];
  const fuentes = fuentesUnicas(lista);
  if (fuentes.length === 0) return null;
  return (
    <p className="linea-fuente">
      <span className="linea-fuente-etiqueta">{fuentes.length === 1 ? 'Fuente' : 'Fuentes'}:</span>{' '}
      {fuentes.map((fuente, i) => (
        <Fragment key={fuente.clave}>
          {i > 0 ? '; ' : null}
          <a href={fuente.url}>{fuente.titulo}</a> ({fuente.organismo}
          {fuente.docId ? `, ${fuente.docId}` : ''}) · descargado el{' '}
          <time dateTime={fuente.fecha}>{fuente.fecha}</time> · confianza: {fuente.confianza}
        </Fragment>
      ))}
    </p>
  );
}
