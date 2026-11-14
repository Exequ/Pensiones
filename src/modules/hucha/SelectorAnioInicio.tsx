import type { ReactNode } from 'react';
import { Field } from '../../components/Field';

interface SelectorAnioInicioProps {
  readonly etiqueta: string;
  readonly ayuda?: ReactNode;
  readonly anios: readonly number[];
  readonly valor: number;
  readonly onCambio: (anio: number) => void;
}

/** Selector del año de inicio de una suma acumulada (lista de años con dato, sin cifras escritas). */
export function SelectorAnioInicio({
  etiqueta,
  ayuda,
  anios,
  valor,
  onCambio,
}: SelectorAnioInicioProps) {
  return (
    <div className="hucha-selector">
      <Field etiqueta={etiqueta} {...(ayuda === undefined ? {} : { ayuda })}>
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
