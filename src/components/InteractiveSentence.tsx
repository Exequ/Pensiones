import type { ReactNode } from 'react';
import './InteractiveSentence.css';

/** Frase con controles insertados en el propio texto. */
export function InteractiveSentence({ children }: { children: ReactNode }) {
  return <p className="frase-interactiva">{children}</p>;
}

export interface OpcionFrase<T extends string | number> {
  readonly valor: T;
  readonly texto: string;
}

interface SentenceSelectProps<T extends string | number> {
  /** Nombre accesible del control (no se ve: el contexto lo da la frase). */
  etiqueta: string;
  opciones: readonly OpcionFrase<T>[];
  valor: T;
  onCambio: (valor: T) => void;
}

/** Desplegable nativo que se lee como parte de la frase. */
export function SentenceSelect<T extends string | number>({
  etiqueta,
  opciones,
  valor,
  onCambio,
}: SentenceSelectProps<T>) {
  return (
    <span className="frase-control">
      <select
        aria-label={etiqueta}
        value={String(valor)}
        onChange={(evento) => {
          const elegida = opciones.find((o) => String(o.valor) === evento.target.value);
          if (elegida) onCambio(elegida.valor);
        }}
      >
        {opciones.map((opcion) => (
          <option key={String(opcion.valor)} value={String(opcion.valor)}>
            {opcion.texto}
          </option>
        ))}
      </select>
    </span>
  );
}

/** Resultado calculado dentro de la frase; se anuncia al cambiar. */
export function SentenceValue({ children }: { children: ReactNode }) {
  return (
    <output className="frase-valor" aria-live="polite">
      {children}
    </output>
  );
}
