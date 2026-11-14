import type { SyntheticEvent } from 'react';
import { Field } from '../../components/Field';
import { SegmentedPills } from '../../components/SegmentedPills';
import { SourceLine } from '../../components/SourceLine';
import type { Dato } from '../../engine/esquema-datos';
import { PersonasEjemplo, type PersonaCargada } from './PersonasEjemplo';
import type { PersonaEjemplo } from './personas';
import type { CatalogoReferencias } from './referencias';
import { ReferenciasBase } from './ReferenciasBase';
import { ResumenTramos } from './ResumenTramos';
import { TablaTramos } from './TablaTramos';
import type { GradoIncapacidad, OrigenIncapacidad } from '../../engine/incapacidad/tipos';
import { esOrigenProfesional, GRADOS, ORIGENES } from './incapacidad-mapeador';
import { MESES, TEXTOS, type TextosPrestacion } from './textos';
import { TEXTOS_INCAPACIDAD_PROPIOS } from './textos-incapacidad';
import type { ErroresFormulario, FormularioTuPension, Sexo, TipoCarrera } from './tipos';
import type { ErrorTramo, ResultadoTramos, TramoFormulario } from './tramos';

interface FormularioProps {
  valores: FormularioTuPension;
  errores: ErroresFormulario;
  /** Errores de la tabla de tramos (carrera por tramos). */
  erroresTramos: readonly ErrorTramo[];
  /** Análisis vivo de los tramos (resumen y avisos de límites); solo con la carrera por tramos. */
  analisis: ResultadoTramos | undefined;
  onCambio: (cambios: Partial<FormularioTuPension>) => void;
  onCambioTipoCarrera: (tipo: TipoCarrera) => void;
  onCambioTramos: (tramos: readonly TramoFormulario[]) => void;
  onCalcular: () => void;
  fuenteBase: Dato;
  fuenteIpc: Dato;
  catalogo: CatalogoReferencias;
  personas: readonly PersonaEjemplo[];
  personaCargada: PersonaCargada | undefined;
  mensajePersona: string | undefined;
  onCargarPersona: (id: string) => void;
  /** Textos que cambian con la prestación (fecha final de la carrera, introducciones). */
  textos: TextosPrestacion;
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
  erroresTramos,
  analisis,
  onCambio,
  onCambioTipoCarrera,
  onCambioTramos,
  onCalcular,
  fuenteBase,
  fuenteIpc,
  catalogo,
  personas,
  personaCargada,
  mensajePersona,
  onCargarPersona,
  textos,
}: FormularioProps) {
  const enviar = (e: SyntheticEvent) => {
    e.preventDefault();
    onCalcular();
  };
  const lagunas = Number(valores.mesesSinCotizar.replace(',', '.'));
  const hayErrores = Object.keys(errores).length > 0 || erroresTramos.length > 0;
  const simple = valores.tipoCarrera === 'simple';
  const incapacidad = valores.prestacion === 'incapacidad';
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
            {erroresTramos.map((e) => (
              <li key={`${e.tramoId}-${e.mensaje}`}>{e.mensaje}</li>
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
            etiqueta={textos.etiquetaMes}
            valor={valores.jubilacionMes}
            error={errores.jubilacionMes}
            onCambio={(v) => {
              onCambio({ jubilacionMes: v });
            }}
          />
          <CampoTexto
            etiqueta={textos.etiquetaAnio}
            valor={valores.jubilacionAnio}
            error={errores.jubilacionAnio}
            onCambio={(v) => {
              onCambio({ jubilacionAnio: v });
            }}
          />
        </div>
        <p className="campo-ayuda">{textos.ayudaFecha}</p>
        {incapacidad ? null : <p className="tp-proximamente">{TEXTOS.proximamente}</p>}
      </fieldset>

      {incapacidad ? (
        <fieldset className="tp-grupo">
          <legend>{TEXTOS_INCAPACIDAD_PROPIOS.tituloIncapacidad}</legend>
          <p className="campo-ayuda">{TEXTOS_INCAPACIDAD_PROPIOS.introIncapacidad}</p>
          <div className="tp-bloque">
            <SegmentedPills<GradoIncapacidad | ''>
              leyenda={TEXTOS_INCAPACIDAD_PROPIOS.gradoLeyenda}
              opciones={GRADOS.map((g) => ({ valor: g.valor, etiqueta: g.etiqueta }))}
              valor={valores.grado}
              onCambio={(v) => {
                onCambio({ grado: v });
              }}
            />
            <p className="campo-ayuda">
              {GRADOS.find((g) => g.valor === valores.grado)?.descripcion ??
                'Elige un grado para ver qué significa.'}
            </p>
            {errores.grado ? (
              <p className="campo-error" aria-live="polite">
                <span className="campo-error-prefijo">Error: </span>
                {errores.grado}
              </p>
            ) : null}
          </div>
          <div className="tp-bloque">
            <SegmentedPills<OrigenIncapacidad | ''>
              leyenda={TEXTOS_INCAPACIDAD_PROPIOS.origenLeyenda}
              opciones={ORIGENES.map((o) => ({
                valor: o.valor,
                etiqueta: o.disponible ? o.etiqueta : `${o.etiqueta} (no disponible)`,
                deshabilitada: !o.disponible,
              }))}
              valor={valores.origen}
              onCambio={(v) => {
                onCambio({ origen: v });
              }}
            />
            <p className="campo-ayuda">{TEXTOS_INCAPACIDAD_PROPIOS.origenAyuda}</p>
            {errores.origen ? (
              <p className="campo-error" aria-live="polite">
                <span className="campo-error-prefijo">Error: </span>
                {errores.origen}
              </p>
            ) : null}
          </div>
          {valores.origen !== '' && esOrigenProfesional(valores.origen) ? (
            <div className="tp-bloque">
              <CampoTexto
                etiqueta={TEXTOS_INCAPACIDAD_PROPIOS.baseReguladoraEtiqueta}
                ayuda={
                  valores.grado === 'parcial'
                    ? `${TEXTOS_INCAPACIDAD_PROPIOS.baseReguladoraAyuda} ${TEXTOS_INCAPACIDAD_PROPIOS.baseReguladoraAyudaParcial}`
                    : TEXTOS_INCAPACIDAD_PROPIOS.baseReguladoraAyuda
                }
                valor={valores.baseReguladora}
                error={errores.baseReguladora}
                modo="decimal"
                onCambio={(v) => {
                  onCambio({ baseReguladora: v });
                }}
              />
              <p className="campo-ayuda">{TEXTOS_INCAPACIDAD_PROPIOS.baseReguladoraAviso}</p>
            </div>
          ) : null}
          <div className="tp-bloque">
            <SegmentedPills
              leyenda={TEXTOS_INCAPACIDAD_PROPIOS.enAltaLeyenda}
              opciones={[
                { valor: 'si', etiqueta: TEXTOS_INCAPACIDAD_PROPIOS.enAltaSi },
                { valor: 'no', etiqueta: TEXTOS_INCAPACIDAD_PROPIOS.enAltaNo },
              ]}
              valor={valores.enAlta ? 'si' : 'no'}
              onCambio={(v) => {
                onCambio({ enAlta: v === 'si' });
              }}
            />
            <p className="campo-ayuda">{TEXTOS_INCAPACIDAD_PROPIOS.enAltaAyuda}</p>
            {errores.enAlta ? (
              <p className="campo-error" aria-live="polite">
                <span className="campo-error-prefijo">Error: </span>
                {errores.enAlta}
              </p>
            ) : null}
          </div>
          <div className="tp-bloque">
            <SegmentedPills
              leyenda={TEXTOS_INCAPACIDAD_PROPIOS.trabajaLeyenda}
              opciones={[
                { valor: 'no', etiqueta: TEXTOS_INCAPACIDAD_PROPIOS.trabajaNo },
                { valor: 'si', etiqueta: TEXTOS_INCAPACIDAD_PROPIOS.trabajaSi },
              ]}
              valor={valores.trabaja ? 'si' : 'no'}
              onCambio={(v) => {
                onCambio({ trabaja: v === 'si' });
              }}
            />
            <p className="campo-ayuda">{TEXTOS_INCAPACIDAD_PROPIOS.trabajaAyuda}</p>
          </div>
        </fieldset>
      ) : null}

      <fieldset className="tp-grupo">
        <legend>{TEXTOS.tituloCarrera}</legend>
        <div className="tp-bloque">
          <SegmentedPills<TipoCarrera>
            leyenda={TEXTOS.tipoCarreraLeyenda}
            opciones={[
              { valor: 'simple', etiqueta: TEXTOS.carreraSimple },
              { valor: 'tramos', etiqueta: TEXTOS.carreraTramos },
            ]}
            valor={valores.tipoCarrera}
            onCambio={onCambioTipoCarrera}
          />
        </div>
        {simple ? (
          <>
            <p className="campo-ayuda">{textos.introCarrera}</p>
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
              ayuda={textos.ayudaLagunas}
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
                    { valor: 'final', etiqueta: textos.ubicacionFinal },
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
          </>
        ) : (
          <>
            <p className="campo-ayuda">{TEXTOS.introTramos}</p>
            <PersonasEjemplo
              personas={personas}
              onCargar={onCargarPersona}
              mensaje={mensajePersona}
              cargada={personaCargada}
              introduccion={textos.personasIntro}
            />
            <section className="tp-tramos-seccion" aria-labelledby="tp-tramos-titulo">
              <h3 id="tp-tramos-titulo">{TEXTOS.tramosTitulo}</h3>
              <TablaTramos
                tramos={valores.tramos}
                errores={erroresTramos}
                onCambio={onCambioTramos}
              />
            </section>
            <ResumenTramos
              resumen={
                analisis?.resumen ?? {
                  mesesCotizados: 0,
                  mesesSinCotizar: 0,
                  huecos: [],
                  primerMes: undefined,
                  ultimoMes: undefined,
                }
              }
              avisos={analisis?.avisos ?? []}
              textoSinHuecos={textos.resumenSinHuecos}
            />
            <ReferenciasBase
              catalogo={catalogo}
              definicionMedia={valores.definicionMedia}
              onCambio={(id) => {
                onCambio({ definicionMedia: id });
              }}
            />
          </>
        )}
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
          ayuda={`${TEXTOS.ayudaIpc} ${textos.avisoIpcVacio}`}
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
