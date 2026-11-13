import type { SyntheticEvent } from 'react';
import { Field } from '../../components/Field';
import { SegmentedPills } from '../../components/SegmentedPills';
import { SourceLine } from '../../components/SourceLine';
import type { Dato } from '../../engine/esquema-datos';
import { MESES, TEXTOS } from './textos';
import type { ErroresFormulario, FormularioTuPension, Sexo } from './tipos';

interface FormularioProps {
  valores: FormularioTuPension;
  errores: ErroresFormulario;
  onCambio: (cambios: Partial<FormularioTuPension>) => void;
  onCalcular: () => void;
  fuenteBase: Dato;
  fuenteIpc: Dato;
}

function SelectorMes({
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

function CampoTexto({
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

const SI_NO = [
  { valor: 'si', etiqueta: 'Sí' },
  { valor: 'no', etiqueta: 'No' },
] as const;

/** Formulario de la jubilación ordinaria con carrera simple. */
export function Formulario({
  valores,
  errores,
  onCambio,
  onCalcular,
  fuenteBase,
  fuenteIpc,
}: FormularioProps) {
  const enviar = (e: SyntheticEvent) => {
    e.preventDefault();
    onCalcular();
  };
  const lagunas = Number(valores.mesesSinCotizar.replace(',', '.'));
  const hayErrores = Object.keys(errores).length > 0;
  return (
    <form
      className="tp-formulario"
      onSubmit={enviar}
      noValidate
      aria-label="Datos para calcular tu pensión"
    >
      {hayErrores ? (
        <div className="tp-resumen-errores" role="alert">
          <p>{TEXTOS.erroresResumen}</p>
          <ul>
            {Object.entries(errores).map(([campo, mensaje]) => (
              <li key={campo}>{mensaje}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <fieldset className="tp-grupo">
        <legend>{TEXTOS.tituloDatos}</legend>
        <div className="tp-fila">
          <SelectorMes
            etiqueta="Mes de nacimiento"
            valor={valores.nacimientoMes}
            error={errores.nacimientoMes}
            onCambio={(v) => {
              onCambio({ nacimientoMes: v });
            }}
          />
          <CampoTexto
            etiqueta="Año de nacimiento"
            valor={valores.nacimientoAnio}
            error={errores.nacimientoAnio}
            onCambio={(v) => {
              onCambio({ nacimientoAnio: v });
            }}
          />
        </div>
        <div className="tp-bloque">
          <SegmentedPills<Sexo | ''>
            leyenda="Sexo"
            opciones={[
              { valor: 'hombre', etiqueta: 'Hombre' },
              { valor: 'mujer', etiqueta: 'Mujer' },
            ]}
            valor={valores.sexo}
            onCambio={(v) => {
              onCambio({ sexo: v });
            }}
          />
          <p className="campo-ayuda">{TEXTOS.ayudaSexo}</p>
          {errores.sexo ? (
            <p className="campo-error" aria-live="polite">
              <span className="campo-error-prefijo">Error: </span>
              {errores.sexo}
            </p>
          ) : null}
        </div>
        {valores.sexo === 'mujer' ? (
          <CampoTexto
            etiqueta="Número de hijos"
            ayuda={TEXTOS.ayudaHijos}
            valor={valores.hijos}
            error={errores.hijos}
            onCambio={(v) => {
              onCambio({ hijos: v });
            }}
          />
        ) : null}
        <div className="tp-fila">
          <SelectorMes
            etiqueta="Mes de jubilación"
            valor={valores.jubilacionMes}
            error={errores.jubilacionMes}
            onCambio={(v) => {
              onCambio({ jubilacionMes: v });
            }}
          />
          <CampoTexto
            etiqueta="Año de jubilación"
            valor={valores.jubilacionAnio}
            error={errores.jubilacionAnio}
            onCambio={(v) => {
              onCambio({ jubilacionAnio: v });
            }}
          />
        </div>
        <p className="campo-ayuda">{TEXTOS.ayudaFechaJubilacion}</p>
        <p className="tp-proximamente">{TEXTOS.proximamente}</p>
      </fieldset>

      <fieldset className="tp-grupo">
        <legend>{TEXTOS.tituloCarrera}</legend>
        <p className="campo-ayuda">{TEXTOS.introCarrera}</p>
        <div className="tp-fila">
          <SelectorMes
            etiqueta="Mes de inicio de la cotización"
            valor={valores.inicioMes}
            error={errores.inicioMes}
            onCambio={(v) => {
              onCambio({ inicioMes: v });
            }}
          />
          <CampoTexto
            etiqueta="Año de inicio de la cotización"
            valor={valores.inicioAnio}
            error={errores.inicioAnio}
            onCambio={(v) => {
              onCambio({ inicioAnio: v });
            }}
          />
        </div>
        <CampoTexto
          etiqueta="Meses sin cotizar (lagunas)"
          ayuda={TEXTOS.ayudaLagunas}
          valor={valores.mesesSinCotizar}
          error={errores.mesesSinCotizar}
          onCambio={(v) => {
            onCambio({ mesesSinCotizar: v });
          }}
        />
        {lagunas > 0 ? (
          <div className="tp-bloque">
            <SegmentedPills
              leyenda="Dónde están los meses sin cotizar"
              opciones={[
                { valor: 'mitad', etiqueta: 'En mitad de la carrera' },
                { valor: 'final', etiqueta: 'Justo antes de jubilarme' },
              ]}
              valor={valores.ubicacionLagunas}
              onCambio={(v) => {
                onCambio({ ubicacionLagunas: v });
              }}
            />
            <p className="campo-ayuda">{TEXTOS.ayudaUbicacionLagunas}</p>
          </div>
        ) : null}
        <CampoTexto
          etiqueta="Base mensual de cotización (euros)"
          ayuda={TEXTOS.ayudaBase}
          modo="decimal"
          valor={valores.baseMensual}
          error={errores.baseMensual}
          onCambio={(v) => {
            onCambio({ baseMensual: v });
          }}
        />
        <SourceLine datos={fuenteBase} />
      </fieldset>

      <fieldset className="tp-grupo">
        <legend>{TEXTOS.tituloOpciones}</legend>
        <div className="tp-bloque">
          <SegmentedPills
            leyenda="Aplicar el complemento a mínimos"
            opciones={SI_NO}
            valor={valores.aplicarMinimos ? 'si' : 'no'}
            onCambio={(v) => {
              onCambio({ aplicarMinimos: v === 'si' });
            }}
          />
          <p className="campo-ayuda">{TEXTOS.ayudaMinimos}</p>
        </div>
        <div className="tp-bloque">
          <SegmentedPills
            leyenda="Aplicar el límite de pensión máxima"
            opciones={SI_NO}
            valor={valores.aplicarPensionMaxima ? 'si' : 'no'}
            onCambio={(v) => {
              onCambio({ aplicarPensionMaxima: v === 'si' });
            }}
          />
          <p className="campo-ayuda">{TEXTOS.ayudaMaxima}</p>
        </div>
      </fieldset>

      <fieldset className="tp-grupo">
        <legend>{TEXTOS.tituloEscenario}</legend>
        <p className="tp-aviso-supuesto">
          <strong>Supuesto del usuario.</strong> {TEXTOS.avisoIpc}
        </p>
        <CampoTexto
          etiqueta="IPC anual supuesto (%)"
          ayuda={`${TEXTOS.ayudaIpc} ${TEXTOS.avisoIpcVacio}`}
          modo="decimal"
          valor={valores.ipcSupuesto}
          error={errores.ipcSupuesto}
          onCambio={(v) => {
            onCambio({ ipcSupuesto: v });
          }}
        />
        <SourceLine datos={fuenteIpc} />
      </fieldset>

      <button type="submit" className="tp-boton">
        {TEXTOS.calcular}
      </button>
    </form>
  );
}
