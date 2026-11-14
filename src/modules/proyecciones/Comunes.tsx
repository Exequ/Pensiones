import type { ReactNode } from 'react';
import { Field } from '../../components/Field';

/**
 * Apartado plegable «Cómo funciona este modelo», redactado en lenguaje llano a partir de la
 * descripción del modelo en `docs/modelos/`. No añade nada que esa descripción no diga.
 */
export function ComoFunciona({ children }: { children: ReactNode }) {
  return (
    <details className="proy-funciona">
      <summary>Cómo funciona este modelo</summary>
      <div className="proy-funciona-contenido prosa">{children}</div>
    </details>
  );
}

/** Lista de variables con la descripción que figura en los metadatos del fichero de /data. */
export function ListaVariables({
  columnas,
}: {
  columnas: readonly { readonly id: string; readonly descripcion: string }[];
}) {
  return (
    <ul className="hist-estado-lista">
      {columnas.map((c) => (
        <li key={c.id}>{c.descripcion}</li>
      ))}
    </ul>
  );
}

interface SelectorAnioProps {
  readonly etiqueta: string;
  readonly anios: readonly number[];
  readonly valor: number;
  readonly onCambio: (anio: number) => void;
}

/** Selector de año con la lista de años que hay en los datos. */
export function SelectorAnio({ etiqueta, anios, valor, onCambio }: SelectorAnioProps) {
  return (
    <div className="proy-selector">
      <Field etiqueta={etiqueta}>
        {(atributos) => (
          <select
            {...atributos}
            value={String(valor)}
            onChange={(e) => {
              onCambio(Number(e.target.value));
            }}
          >
            {anios.map((anio) => (
              <option key={anio} value={String(anio)}>
                {anio}
              </option>
            ))}
          </select>
        )}
      </Field>
    </div>
  );
}
