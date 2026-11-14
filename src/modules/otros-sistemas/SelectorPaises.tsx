import { useId } from 'react';
import { CODIGO_ESPANA, PAISES } from './paises';
import './OtrosSistemas.css';

interface SelectorPaisesProps {
  readonly seleccion: ReadonlySet<string>;
  readonly onCambio: (seleccion: ReadonlySet<string>) => void;
}

/**
 * Selector accesible de los países que se comparan: un grupo de casillas con leyenda. Siempre
 * queda al menos un país elegido. Los botones «Todos» y «Solo España» cambian la selección de una
 * vez.
 */
export function SelectorPaises({ seleccion, onCambio }: SelectorPaisesProps) {
  const id = useId();
  const alternar = (codigo: string) => {
    const nueva = new Set(seleccion);
    if (nueva.has(codigo)) {
      if (nueva.size === 1) return;
      nueva.delete(codigo);
    } else {
      nueva.add(codigo);
    }
    onCambio(nueva);
  };
  return (
    <div className="sistemas-selector">
      <fieldset className="sistemas-casillas">
        <legend>Países y agregados que se comparan</legend>
        <div className="sistemas-casillas-lista">
          {PAISES.map((p) => {
            const marcado = seleccion.has(p.codigo);
            return (
              <label key={p.codigo} className="sistemas-casilla" htmlFor={`${id}-${p.codigo}`}>
                <input
                  id={`${id}-${p.codigo}`}
                  type="checkbox"
                  checked={marcado}
                  disabled={marcado && seleccion.size === 1}
                  onChange={() => {
                    alternar(p.codigo);
                  }}
                />
                <span>{p.nombre}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="sistemas-acciones">
        <button
          type="button"
          className="sistemas-boton"
          onClick={() => {
            onCambio(new Set(PAISES.map((p) => p.codigo)));
          }}
        >
          Elegir todos
        </button>
        <button
          type="button"
          className="sistemas-boton"
          onClick={() => {
            onCambio(new Set([CODIGO_ESPANA]));
          }}
        >
          Solo España
        </button>
      </div>
    </div>
  );
}
