/**
 * Partes del formulario de «Tu pensión» propias de la viudedad y la orfandad (Fase 3-C2): la
 * persona fallecida, la persona viuda, los huérfanos. Preguntas progresivas: cada bloque aparece
 * solo cuando hace falta. Los textos están en `textos-supervivencia.ts` (sin cifras).
 */
import { SegmentedPills } from '../../components/SegmentedPills';
import { CampoTexto, ErrorGrupo, PreguntaSiNo, SelectorMes } from './Campos';
import {
  esVinculoDeCony,
  esVinculoDeEx,
  esVinculoDePareja,
  SITUACIONES,
  VINCULOS,
} from './supervivencia-mapeador';
import {
  nuevoHuerfano,
  type FormularioHuerfano,
  type FormularioSupervivencia,
  type FormularioViudo,
  type ClasePensionCausante,
  type SituacionCausanteFormulario,
  type VinculoViudedad,
} from './supervivencia-tipos';
import { TEXTOS_INCAPACIDAD_PROPIOS } from './textos-incapacidad';
import { TEXTOS_SUPERVIVENCIA as T } from './textos-supervivencia';
import { esOrigenProfesional, ORIGENES } from './incapacidad-mapeador';
import type { OrigenIncapacidad } from '../../engine/incapacidad/tipos';
import type { ErroresFormulario, FormularioTuPension, Sexo } from './tipos';
import type { TextosPrestacion } from './textos';

interface PropsCausante {
  valores: FormularioTuPension;
  errores: ErroresFormulario;
  textos: TextosPrestacion;
  onCambio: (cambios: Partial<FormularioTuPension>) => void;
  onCambioSv: (cambios: Partial<FormularioSupervivencia>) => void;
}

/** Fecha del fallecimiento, causa de la muerte, situación de la persona fallecida y su base reguladora. */
export function CausanteSupervivencia({
  valores,
  errores,
  textos,
  onCambio,
  onCambioSv,
}: PropsCausante) {
  const sv = valores.supervivencia;
  const profesional = valores.origen !== '' && esOrigenProfesional(valores.origen);
  const pensionista = sv.situacion === 'pensionista';
  return (
    <fieldset className="tp-grupo">
      <legend>{T.tituloCausante}</legend>
      <p className="campo-ayuda">{T.introCausante}</p>
      <div className="tp-fila">
        <SelectorMes
          etiqueta={textos.etiquetaMes}
          valor={valores.hechoCausanteMes}
          error={errores.hechoCausanteMes}
          onCambio={(v) => {
            onCambio({ hechoCausanteMes: v });
          }}
        />
        <CampoTexto
          etiqueta={textos.etiquetaAnio}
          valor={valores.hechoCausanteAnio}
          error={errores.hechoCausanteAnio}
          onCambio={(v) => {
            onCambio({ hechoCausanteAnio: v });
          }}
        />
      </div>
      <p className="campo-ayuda">{textos.ayudaFecha}</p>
      <div className="tp-bloque">
        <SegmentedPills<OrigenIncapacidad | ''>
          leyenda={T.causaLeyenda}
          opciones={ORIGENES.map((o) => ({ valor: o.valor, etiqueta: o.etiqueta }))}
          valor={valores.origen}
          onCambio={(v) => {
            onCambio({ origen: v });
          }}
        />
        <p className="campo-ayuda">{T.causaAyuda}</p>
        <ErrorGrupo error={errores.origen} />
      </div>
      <div className="tp-bloque">
        <SegmentedPills<SituacionCausanteFormulario | ''>
          leyenda={T.situacionLeyenda}
          opciones={SITUACIONES.map((s) => ({ valor: s.valor, etiqueta: s.etiqueta }))}
          valor={sv.situacion}
          onCambio={(v) => {
            onCambioSv({ situacion: v });
          }}
        />
        <p className="campo-ayuda">{T.situacionAyuda}</p>
        <p className="campo-ayuda">{T.situacionAltaSinObligacion}</p>
        <ErrorGrupo error={errores.situacion} />
      </div>
      {profesional ? (
        <div className="tp-bloque">
          <CampoTexto
            etiqueta={T.baseReguladoraProfesional}
            ayuda={T.baseReguladoraProfesionalAyuda}
            valor={valores.baseReguladora}
            error={errores.baseReguladora}
            modo="decimal"
            onCambio={(v) => {
              onCambio({ baseReguladora: v });
            }}
          />
          <p className="campo-ayuda">{TEXTOS_INCAPACIDAD_PROPIOS.baseReguladoraAviso}</p>
        </div>
      ) : pensionista ? (
        <div className="tp-bloque">
          <SegmentedPills<ClasePensionCausante>
            leyenda={T.clasePensionLeyenda}
            opciones={[
              { valor: 'jubilacion', etiqueta: T.clasePensionJubilacion },
              { valor: 'incapacidad-permanente', etiqueta: T.clasePensionIncapacidad },
            ]}
            valor={sv.clasePension}
            onCambio={(v) => {
              onCambioSv({ clasePension: v });
            }}
          />
          <div className="tp-fila">
            <SelectorMes
              etiqueta={T.pensionMes}
              valor={sv.pensionMes}
              error={errores.pensionMes}
              onCambio={(v) => {
                onCambioSv({ pensionMes: v });
              }}
            />
            <CampoTexto
              etiqueta={T.pensionAnio}
              valor={sv.pensionAnio}
              error={errores.pensionAnio}
              onCambio={(v) => {
                onCambioSv({ pensionAnio: v });
              }}
            />
          </div>
          <p className="campo-ayuda">{T.pensionAyuda}</p>
          <CampoTexto
            etiqueta={T.baseReguladoraPensionista}
            ayuda={T.baseReguladoraPensionistaAyuda}
            valor={valores.baseReguladora}
            error={errores.baseReguladora}
            modo="decimal"
            onCambio={(v) => {
              onCambio({ baseReguladora: v });
            }}
          />
          <p className="campo-ayuda">{T.sinCarreraPensionista}</p>
        </div>
      ) : null}
    </fieldset>
  );
}

interface PropsViudo {
  viudo: FormularioViudo;
  errores: ErroresFormulario;
  /** Fecha del hecho causante en el formulario: para el aviso de la redacción del artículo de parejas. */
  avisoParejaHijos: boolean;
  titulo: string;
  intro: string;
  onCambio: (cambios: Partial<FormularioViudo>) => void;
}

/** Persona viuda: vínculo, datos del vínculo, pensiones y rentas, cargas familiares. */
export function DatosViudo({
  viudo: v,
  errores,
  avisoParejaHijos,
  titulo,
  intro,
  onCambio,
}: PropsViudo) {
  const conyuge = esVinculoDeCony(v.vinculo);
  const pareja = esVinculoDePareja(v.vinculo);
  const ex = esVinculoDeEx(v.vinculo);
  const hijos = Number(v.hijos.replace(',', '.'));
  return (
    <fieldset className="tp-grupo">
      <legend>{titulo}</legend>
      <p className="campo-ayuda">{intro}</p>
      <div className="tp-bloque">
        <SegmentedPills<VinculoViudedad | ''>
          leyenda={T.vinculoLeyenda}
          opciones={VINCULOS.map((o) => ({ valor: o.valor, etiqueta: o.etiqueta }))}
          valor={v.vinculo}
          onCambio={(x) => {
            onCambio({ vinculo: x });
          }}
        />
        <p className="campo-ayuda">{T.vinculoAyuda}</p>
        <ErrorGrupo error={errores.viudoVinculo} />
      </div>
      <div className="tp-fila">
        <SelectorMes
          etiqueta={`${T.nacimientoMes} de la persona viuda`}
          valor={v.nacimientoMes}
          error={errores.viudoNacimientoMes}
          onCambio={(x) => {
            onCambio({ nacimientoMes: x });
          }}
        />
        <CampoTexto
          etiqueta={`${T.nacimientoAnio} de la persona viuda`}
          valor={v.nacimientoAnio}
          error={errores.viudoNacimientoAnio}
          onCambio={(x) => {
            onCambio({ nacimientoAnio: x });
          }}
        />
      </div>
      <div className="tp-bloque">
        <SegmentedPills<Sexo | ''>
          leyenda={`${T.sexoLeyenda} de la persona viuda`}
          opciones={[
            { valor: 'hombre', etiqueta: 'Hombre' },
            { valor: 'mujer', etiqueta: 'Mujer' },
          ]}
          valor={v.sexo}
          onCambio={(x) => {
            onCambio({ sexo: x });
          }}
        />
        <p className="campo-ayuda">{T.sexoAyuda}</p>
        <ErrorGrupo error={errores.viudoSexo} />
      </div>
      <CampoTexto
        etiqueta={T.hijosEtiqueta}
        ayuda={T.hijosAyuda}
        valor={v.hijos}
        error={errores.viudoHijos}
        onCambio={(x) => {
          onCambio({ hijos: x });
        }}
      />
      {v.sexo === 'hombre' && hijos > 0 ? (
        <PreguntaSiNo
          leyenda={T.hijoConOrfandadLeyenda}
          ayuda={T.hijoConOrfandadAyuda}
          valor={v.hijoConOrfandad}
          onCambio={(x) => {
            onCambio({ hijoConOrfandad: x });
          }}
        />
      ) : null}
      {conyuge ? (
        <>
          <div className="tp-fila">
            <SelectorMes
              etiqueta={T.matrimonioMes}
              valor={v.matrimonioMes}
              error={errores.viudoMatrimonioMes}
              onCambio={(x) => {
                onCambio({ matrimonioMes: x });
              }}
            />
            <CampoTexto
              etiqueta={T.matrimonioAnio}
              valor={v.matrimonioAnio}
              error={errores.viudoMatrimonioAnio}
              onCambio={(x) => {
                onCambio({ matrimonioAnio: x });
              }}
            />
          </div>
          <p className="campo-ayuda">{T.matrimonioAyuda}</p>
          <PreguntaSiNo
            leyenda={T.enfermedadAnteriorLeyenda}
            ayuda={T.enfermedadAnteriorAyuda}
            valor={v.enfermedadAnterior}
            onCambio={(x) => {
              onCambio({ enfermedadAnterior: x });
            }}
          />
          {v.enfermedadAnterior ? (
            <CampoTexto
              etiqueta={T.convivenciaPreviaEtiqueta}
              ayuda={T.convivenciaPreviaAyuda}
              valor={v.convivenciaPreviaMeses}
              error={errores.viudoConvivenciaPrevia}
              onCambio={(x) => {
                onCambio({ convivenciaPreviaMeses: x });
              }}
            />
          ) : null}
        </>
      ) : null}
      {conyuge || pareja ? (
        <PreguntaSiNo
          leyenda={T.hijosComunesLeyenda}
          ayuda={T.hijosComunesAyuda}
          valor={v.hijosComunes}
          onCambio={(x) => {
            onCambio({ hijosComunes: x });
          }}
        />
      ) : null}
      {pareja ? (
        <>
          <CampoTexto
            etiqueta={T.convivenciaParejaEtiqueta}
            ayuda={T.convivenciaParejaAyuda}
            valor={v.convivenciaMeses}
            error={errores.viudoConvivencia}
            onCambio={(x) => {
              onCambio({ convivenciaMeses: x });
            }}
          />
          <div className="tp-fila">
            <SelectorMes
              etiqueta={T.registroMes}
              valor={v.registroMes}
              error={errores.viudoRegistroMes}
              onCambio={(x) => {
                onCambio({ registroMes: x });
              }}
            />
            <CampoTexto
              etiqueta={T.registroAnio}
              valor={v.registroAnio}
              error={errores.viudoRegistroAnio}
              onCambio={(x) => {
                onCambio({ registroAnio: x });
              }}
            />
          </div>
          <p className="campo-ayuda">{T.registroAyuda}</p>
          {avisoParejaHijos ? <p className="tp-aviso-supuesto">{T.aviso2026}</p> : null}
        </>
      ) : null}
      {ex ? (
        <>
          <CampoTexto
            etiqueta={T.compensatoriaEtiqueta}
            ayuda={T.compensatoriaAyuda}
            valor={v.compensatoriaAnual}
            error={errores.viudoCompensatoria}
            modo="decimal"
            onCambio={(x) => {
              onCambio({ compensatoriaAnual: x });
            }}
          />
          <PreguntaSiNo
            leyenda={T.violenciaLeyenda}
            ayuda={T.violenciaAyuda}
            valor={v.violenciaGenero}
            onCambio={(x) => {
              onCambio({ violenciaGenero: x });
            }}
          />
          <PreguntaSiNo
            leyenda={T.nuevoVinculoLeyenda}
            ayuda={T.nuevoVinculoAyuda}
            valor={v.nuevoVinculo}
            onCambio={(x) => {
              onCambio({ nuevoVinculo: x });
            }}
          />
          <PreguntaSiNo
            leyenda={T.separacionLeyenda}
            ayuda={T.separacionAyuda}
            valor={v.separacionAnterior}
            onCambio={(x) => {
              onCambio({ separacionAnterior: x });
            }}
          />
        </>
      ) : null}
      <h3 className="tp-subtitulo-grupo">{T.rentasTitulo}</h3>
      <p className="campo-ayuda">{T.rentasIntro}</p>
      <PreguntaSiNo
        leyenda={T.otraPensionLeyenda}
        ayuda={T.otraPensionAyuda}
        valor={v.otraPensionPublica}
        onCambio={(x) => {
          onCambio({ otraPensionPublica: x });
        }}
      />
      {v.otraPensionPublica && Number(v.hijos) > 0 ? (
        <PreguntaSiNo
          leyenda={T.brechaOtraLeyenda}
          ayuda={T.brechaOtraAyuda}
          valor={v.brechaEnOtraPension}
          onCambio={(x) => {
            onCambio({ brechaEnOtraPension: x });
          }}
        />
      ) : null}
      <PreguntaSiNo
        leyenda={T.discapacidadLeyenda}
        ayuda={T.discapacidadAyuda}
        valor={v.discapacidad65}
        onCambio={(x) => {
          onCambio({ discapacidad65: x });
        }}
      />
      <CampoTexto
        etiqueta={T.rentasTrabajoEtiqueta}
        ayuda={T.rentasTrabajoAyuda}
        valor={v.rentasTrabajo}
        error={errores.viudoRentasTrabajo}
        modo="decimal"
        onCambio={(x) => {
          onCambio({ rentasTrabajo: x });
        }}
      />
      <CampoTexto
        etiqueta={T.rentasCapitalEtiqueta}
        ayuda={T.rentasCapitalAyuda}
        valor={v.rentasCapital}
        error={errores.viudoRentasCapital}
        modo="decimal"
        onCambio={(x) => {
          onCambio({ rentasCapital: x });
        }}
      />
      <CampoTexto
        etiqueta={T.rendimientosEtiqueta}
        ayuda={T.rendimientosAyuda}
        valor={v.rendimientos}
        error={errores.viudoRendimientos}
        modo="decimal"
        onCambio={(x) => {
          onCambio({ rendimientos: x });
        }}
      />
      <PreguntaSiNo
        leyenda={T.cargasLeyenda}
        ayuda={T.cargasAyuda}
        valor={v.cargas}
        onCambio={(x) => {
          onCambio({ cargas: x });
        }}
      />
      {v.cargas ? (
        <>
          <CampoTexto
            etiqueta={T.rendimientosAnteriorEtiqueta}
            ayuda={T.rendimientosAnteriorAyuda}
            valor={v.rendimientosAnterior}
            error={errores.viudoRendimientosAnterior}
            modo="decimal"
            onCambio={(x) => {
              onCambio({ rendimientosAnterior: x });
            }}
          />
          <CampoTexto
            etiqueta={T.miembrosEtiqueta}
            ayuda={T.miembrosAyuda}
            valor={v.miembros}
            error={errores.viudoMiembros}
            onCambio={(x) => {
              onCambio({ miembros: x });
            }}
          />
          <CampoTexto
            etiqueta={T.rendimientosUnidadEtiqueta}
            ayuda={T.rendimientosUnidadAyuda}
            valor={v.rendimientosUnidad}
            error={errores.viudoRendimientosUnidad}
            modo="decimal"
            onCambio={(x) => {
              onCambio({ rendimientosUnidad: x });
            }}
          />
        </>
      ) : null}
    </fieldset>
  );
}

interface PropsHuerfano {
  sv: FormularioSupervivencia;
  errores: ErroresFormulario;
  onCambioSv: (cambios: Partial<FormularioSupervivencia>) => void;
}

/** Persona huérfana que pregunta: nacimiento, incapacitación, discapacidad e ingresos. */
export function DatosHuerfano({ sv, errores, onCambioSv }: PropsHuerfano) {
  const h = sv.huerfano;
  const cambiar = (c: Partial<FormularioHuerfano>) => {
    onCambioSv({ huerfano: { ...h, ...c } });
  };
  return (
    <fieldset className="tp-grupo">
      <legend>{T.tituloOrfandad}</legend>
      <p className="campo-ayuda">{T.introOrfandad}</p>
      <div className="tp-fila">
        <SelectorMes
          etiqueta={T.huerfanoNacimientoMes}
          valor={h.nacimientoMes}
          error={errores.huerfanoNacimientoMes}
          onCambio={(x) => {
            cambiar({ nacimientoMes: x });
          }}
        />
        <CampoTexto
          etiqueta={T.huerfanoNacimientoAnio}
          valor={h.nacimientoAnio}
          error={errores.huerfanoNacimientoAnio}
          onCambio={(x) => {
            cambiar({ nacimientoAnio: x });
          }}
        />
      </div>
      <PreguntaSiNo
        leyenda={T.incapacitadoLeyenda}
        ayuda={T.incapacitadoAyuda}
        valor={h.incapacitado}
        onCambio={(x) => {
          cambiar({ incapacitado: x });
        }}
      />
      <PreguntaSiNo
        leyenda={T.discapacidadHuerfanoLeyenda}
        ayuda={T.discapacidadHuerfanoAyuda}
        valor={h.discapacidad65}
        onCambio={(x) => {
          cambiar({ discapacidad65: x });
        }}
      />
      <CampoTexto
        etiqueta={T.rentasTrabajoHuerfanoEtiqueta}
        ayuda={T.rentasTrabajoHuerfanoAyuda}
        valor={h.rentasTrabajo}
        error={errores.huerfanoRentasTrabajo}
        modo="decimal"
        onCambio={(x) => {
          cambiar({ rentasTrabajo: x });
        }}
      />
      <CampoTexto
        etiqueta={T.rendimientosHuerfanoEtiqueta}
        ayuda={T.rendimientosHuerfanoAyuda}
        valor={h.rendimientos}
        error={errores.huerfanoRendimientos}
        modo="decimal"
        onCambio={(x) => {
          cambiar({ rendimientos: x });
        }}
      />
      <PreguntaSiNo
        leyenda={T.orfandadAbsolutaLeyenda}
        ayuda={T.orfandadAbsolutaAyuda}
        valor={sv.orfandadAbsoluta}
        onCambio={(x) => {
          onCambioSv({ orfandadAbsoluta: x });
        }}
      />
    </fieldset>
  );
}

interface PropsOtros {
  titulo: string;
  ayuda: string;
  otros: readonly FormularioHuerfano[];
  error: string | undefined;
  onCambio: (otros: readonly FormularioHuerfano[]) => void;
}

/** Lista de otros huérfanos con posible derecho (solo nacimiento e incapacitación). */
export function OtrosHuerfanos({ titulo, ayuda, otros, error, onCambio }: PropsOtros) {
  const cambiar = (id: string, c: Partial<FormularioHuerfano>) => {
    onCambio(otros.map((h) => (h.id === id ? { ...h, ...c } : h)));
  };
  return (
    <fieldset className="tp-grupo">
      <legend>{titulo}</legend>
      <p className="campo-ayuda">{ayuda}</p>
      {otros.length === 0 ? <p className="campo-ayuda">{T.sinOtrosHuerfanos}</p> : null}
      {otros.map((h, i) => {
        const n = String(i + 1);
        return (
          <div key={h.id} className="tp-huerfano-otro">
            <h3 className="tp-subtitulo-grupo">{`${T.huerfanoOtro} ${n}`}</h3>
            <div className="tp-fila">
              <SelectorMes
                etiqueta={`Mes de nacimiento del huérfano ${n}`}
                valor={h.nacimientoMes}
                error={undefined}
                onCambio={(x) => {
                  cambiar(h.id, { nacimientoMes: x });
                }}
              />
              <CampoTexto
                etiqueta={`Año de nacimiento del huérfano ${n}`}
                valor={h.nacimientoAnio}
                error={undefined}
                onCambio={(x) => {
                  cambiar(h.id, { nacimientoAnio: x });
                }}
              />
            </div>
            <PreguntaSiNo
              leyenda={`¿El huérfano ${n} está incapacitado para el trabajo?`}
              valor={h.incapacitado}
              onCambio={(x) => {
                cambiar(h.id, { incapacitado: x });
              }}
            />
            <button
              type="button"
              className="tp-boton-secundario"
              onClick={() => {
                onCambio(otros.filter((x) => x.id !== h.id));
              }}
            >
              {`${T.quitarHuerfano} el huérfano ${n}`}
            </button>
          </div>
        );
      })}
      <ErrorGrupo error={error} />
      <button
        type="button"
        className="tp-boton-secundario"
        onClick={() => {
          onCambio([...otros, nuevoHuerfano()]);
        }}
      >
        {T.anadirHuerfano}
      </button>
    </fieldset>
  );
}
