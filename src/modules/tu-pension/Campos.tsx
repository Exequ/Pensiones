/** Campos de formulario compartidos por «Tu pensión»: mes, texto, sí o no y error de grupo. */
import { Field } from '../../components/Field';
import { SegmentedPills } from '../../components/SegmentedPills';
import { MESES } from './textos';

export function SelectorMes({
  etiqueta,
  valor,
  error,
  onCambio,
}: {
  etiqueta: string;
  valor: string;
  error: string | undefined;
  onCambio: (valor: string) => void;
}) {
  return (
    <Field etiqueta={etiqueta} error={error}>
      {(atributos) => (
        <select
          {...atributos}
          value={valor}
          onChange={(e) => {
            onCambio(e.target.value);
          }}
        >
          <option value="">Elige un mes</option>
          {MESES.map((nombre, i) => (
            <option key={nombre} value={String(i + 1)}>
              {nombre}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function CampoTexto({
  etiqueta,
  ayuda,
  valor,
  error,
  modo = 'numeric',
  onCambio,
}: {
  etiqueta: string;
  ayuda?: string;
  valor: string;
  error: string | undefined;
  modo?: 'numeric' | 'decimal';
  onCambio: (valor: string) => void;
}) {
  return (
    <Field etiqueta={etiqueta} ayuda={ayuda} error={error}>
      {(atributos) => (
        <input
          {...atributos}
          type="text"
          inputMode={modo}
          autoComplete="off"
          value={valor}
          onChange={(e) => {
            onCambio(e.target.value);
          }}
        />
      )}
    </Field>
  );
}

export function ErrorGrupo({ error }: { error: string | undefined }) {
  return error ? (
    <p className="campo-error" aria-live="polite">
      <span className="campo-error-prefijo">Error: </span>
      {error}
    </p>
  ) : null;
}

/** Pregunta de respuesta «Sí» o «No» con su ayuda opcional. */
export function PreguntaSiNo({
  leyenda,
  ayuda,
  valor,
  onCambio,
  error,
}: {
  leyenda: string;
  ayuda?: string;
  valor: boolean;
  onCambio: (valor: boolean) => void;
  error?: string | undefined;
}) {
  return (
    <div className="tp-bloque">
      <SegmentedPills
        leyenda={leyenda}
        opciones={[
          { valor: 'si', etiqueta: 'Sí' },
          { valor: 'no', etiqueta: 'No' },
        ]}
        valor={valor ? 'si' : 'no'}
        onCambio={(v) => {
          onCambio(v === 'si');
        }}
      />
      {ayuda ? <p className="campo-ayuda">{ayuda}</p> : null}
      <ErrorGrupo error={error} />
    </div>
  );
}
