import { useId } from 'react';
import './SegmentedPills.css';

export interface OpcionPildora<T extends string | number> {
  readonly valor: T;
  readonly etiqueta: string;
  /** Opción que existe pero no se puede elegir (se explica fuera, con texto). */
  readonly deshabilitada?: boolean;
}

interface SegmentedPillsProps<T extends string | number> {
  /** Texto del grupo (se lee con lector de pantalla y se muestra salvo que se oculte). */
  leyenda: string;
  opciones: readonly OpcionPildora<T>[];
  valor: T;
  onCambio: (valor: T) => void;
  ocultarLeyenda?: boolean;
}

/**
 * Selector segmentado de opción única. Usa botones de opción nativos
 * (navegación con flechas incluida); la opción activa va rellena de tinta.
 */
export function SegmentedPills<T extends string | number>({
  leyenda,
  opciones,
  valor,
  onCambio,
  ocultarLeyenda = false,
}: SegmentedPillsProps<T>) {
  const nombre = useId();
  return (
    <fieldset className="pildoras">
      <legend className={ocultarLeyenda ? 'visualmente-oculto' : 'pildoras-leyenda'}>
        {leyenda}
      </legend>
      <div className="pildoras-opciones">
        {opciones.map((opcion) => (
          <label key={String(opcion.valor)} className="pildora">
            <input
              type="radio"
              className="pildora-input"
              name={nombre}
              value={String(opcion.valor)}
              checked={opcion.valor === valor}
              disabled={opcion.deshabilitada === true}
              onChange={() => {
                onCambio(opcion.valor);
              }}
            />
            <span className="pildora-texto">{opcion.etiqueta}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
