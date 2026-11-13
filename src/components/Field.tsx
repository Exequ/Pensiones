import { useId, type ReactNode } from 'react';
import './Field.css';

interface FieldProps {
  /** Etiqueta visible del campo. */
  etiqueta: string;
  /** Ayuda breve bajo la etiqueta (se asocia al control con aria-describedby). */
  ayuda?: ReactNode;
  /** Mensaje de error; se anuncia a los lectores de pantalla al aparecer. */
  error?: string | undefined;
  /** Recibe los atributos que el control debe llevar. */
  children: (atributos: {
    id: string;
    'aria-describedby': string | undefined;
    'aria-invalid': boolean;
  }) => ReactNode;
}

/**
 * Campo de formulario: etiqueta (`label`), ayuda y error asociados al control. El error va en una
 * región `aria-live` que existe siempre, para que el lector de pantalla lo anuncie al aparecer.
 */
export function Field({ etiqueta, ayuda, error, children }: FieldProps) {
  const id = useId();
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;
  const describedBy = [ayuda ? idAyuda : null, error ? idError : null].filter(Boolean).join(' ');
  return (
    <div className={error ? 'campo campo-con-error' : 'campo'}>
      <label className="campo-etiqueta" htmlFor={id}>
        {etiqueta}
      </label>
      {ayuda ? (
        <p className="campo-ayuda" id={idAyuda}>
          {ayuda}
        </p>
      ) : null}
      {children({
        id,
        'aria-describedby': describedBy === '' ? undefined : describedBy,
        'aria-invalid': Boolean(error),
      })}
      <p className="campo-error" id={idError} aria-live="polite">
        {error ? <span className="campo-error-prefijo">Error: </span> : null}
        {error}
      </p>
    </div>
  );
}
