import { useRef, useState } from 'react';
import { Field } from '../../components/Field';
import { TEXTOS } from './textos';

interface EnlaceCompartibleProps {
  /** Enlace completo a la simulación actual. */
  enlace: string;
  /** Tramos de la tabla que el enlace no puede incluir por su límite. */
  tramosOmitidos: number;
}

type EstadoCopia = 'ninguno' | 'copiado' | 'fallo';

/**
 * Enlace compartible: campo de solo lectura con el enlace y botón «Copiar enlace». La confirmación
 * va en una región `aria-live` que existe siempre. Si el portapapeles no está disponible se dice y
 * se deja el enlace seleccionado en el campo.
 */
export function EnlaceCompartible({ enlace, tramosOmitidos }: EnlaceCompartibleProps) {
  const campo = useRef<HTMLTextAreaElement>(null);
  const [copia, setCopia] = useState<EstadoCopia>('ninguno');

  const copiar = async () => {
    campo.current?.focus();
    campo.current?.select();
    try {
      await navigator.clipboard.writeText(enlace);
      setCopia('copiado');
    } catch {
      setCopia('fallo');
    }
  };

  return (
    <section className="seccion tp-enlace" aria-labelledby="tp-enlace-titulo">
      <h2 id="tp-enlace-titulo">{TEXTOS.enlaceTitulo}</h2>
      <p>{TEXTOS.enlaceIntro}</p>
      <Field etiqueta={TEXTOS.enlaceCampo} ayuda={TEXTOS.enlacePrivacidad}>
        {(atributos) => (
          <textarea
            {...atributos}
            ref={campo}
            readOnly
            value={enlace}
            onFocus={(e) => {
              e.currentTarget.select();
            }}
            onChange={() => {
              setCopia('ninguno');
            }}
          />
        )}
      </Field>
      {tramosOmitidos > 0 ? <p className="campo-ayuda">{TEXTOS.enlaceTramosOmitidos}</p> : null}
      <div className="tp-restablecer">
        <button
          type="button"
          className="tp-boton-secundario"
          onClick={() => {
            void copiar();
          }}
        >
          {TEXTOS.enlaceCopiar}
        </button>
        <p className="tp-copia-estado" role="status" aria-live="polite">
          {copia === 'copiado' ? TEXTOS.enlaceCopiado : null}
          {copia === 'fallo' ? TEXTOS.enlaceNoCopiado : null}
        </p>
      </div>
    </section>
  );
}
