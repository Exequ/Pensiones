import { useMemo, useRef, useState } from 'react';
import { useTituloPagina } from '../../app/useTituloPagina';
import { Kicker } from '../../components/Kicker';
import { Lead } from '../../components/Lead';
import { MarginNote } from '../../components/MarginNote';
import { LIMITACIONES_MOTOR } from '../../engine/limitaciones';
import { antetituloSeccion, buscarSeccion } from '../secciones';
import { calcularTuPension, type RespuestaCalculo } from './calcular';
import { sugerenciaBase, supuestoIpcPorDefecto } from './datos';
import { Formulario } from './Formulario';
import {
  analizarTramos,
  leerFechasFormulario,
  numeroATexto,
  tramosDeCarreraSimple,
} from './mapeador';
import { cargarPersona } from './personas';
import { personasDeRepositorio } from './personas-datos';
import { type PersonaCargada } from './PersonasEjemplo';
import { catalogoPorDefecto } from './referencias-datos';
import { crearMotorDelRepositorio, leerReferenciaDeRepositorio } from './motor';
import { PanelSupuestos } from './PanelSupuestos';
import { ErrorMotorVista, Resultado } from './Resultado';
import { filasDelPanel } from './supuestos';
import { TEXTOS } from './textos';
import type { ErroresFormulario, FormularioTuPension, TipoCarrera } from './tipos';
import { tramoVacio, type ErrorTramo, type TramoFormulario } from './tramos';
import './TuPension.css';

const seccion = buscarSeccion('tu-pension');

/** Módulo «tu-pension»: jubilación ordinaria con carrera simple (Fase 3-A). */
export default function TuPension() {
  useTituloPagina(seccion.titulo);
  const base = useMemo(() => sugerenciaBase(), []);
  const ipc = useMemo(() => supuestoIpcPorDefecto(), []);
  const catalogo = useMemo(() => catalogoPorDefecto(), []);
  const personas = useMemo(() => personasDeRepositorio().personas, []);
  const [valores, setValores] = useState<FormularioTuPension>(() => ({
    nacimientoMes: '',
    nacimientoAnio: '',
    sexo: '',
    hijos: '0',
    jubilacionMes: '',
    jubilacionAnio: '',
    inicioMes: '',
    inicioAnio: '',
    mesesSinCotizar: '0',
    ubicacionLagunas: 'mitad',
    baseMensual: numeroATexto(base.valor),
    tipoCarrera: 'simple',
    tramos: [],
    definicionMedia: catalogo.mediaPorDefecto,
    aplicarMinimos: true,
    aplicarPensionMaxima: true,
    ipcSupuesto: numeroATexto(ipc.porcentaje),
  }));
  const [respuesta, setRespuesta] = useState<RespuestaCalculo | undefined>(undefined);
  const [erroresVista, setErroresVista] = useState<ErroresFormulario>({});
  const [erroresTramos, setErroresTramos] = useState<readonly ErrorTramo[]>([]);
  const [personaCargada, setPersonaCargada] = useState<PersonaCargada | undefined>(undefined);
  const [mensajePersona, setMensajePersona] = useState<string | undefined>(undefined);
  const encabezadoResultado = useRef<HTMLHeadingElement>(null);
  const errorMotor = useRef<HTMLDivElement>(null);

  const calcular = (aCalcular: FormularioTuPension = valores) => {
    const r = calcularTuPension(aCalcular, {
      fabricaMotor: crearMotorDelRepositorio,
      leerReferencia: leerReferenciaDeRepositorio,
      catalogo,
    });
    setRespuesta(r);
    if (r.tipo === 'errores-formulario') {
      setErroresVista(r.errores);
      setErroresTramos(r.erroresTramos);
      // El foco va al primer control con error, para el teclado y los lectores de pantalla.
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('.tp-formulario [aria-invalid="true"]')?.focus();
      });
      return;
    }
    setErroresVista({});
    setErroresTramos([]);
    requestAnimationFrame(() => {
      (encabezadoResultado.current ?? errorMotor.current)?.focus();
    });
  };

  const cambiarTipoCarrera = (tipo: TipoCarrera) => {
    setErroresVista({});
    setErroresTramos([]);
    setMensajePersona(undefined);
    if (tipo === 'simple') setPersonaCargada(undefined);
    setValores((v) => ({
      ...v,
      tipoCarrera: tipo,
      // Al pasar a tramos se parte de la carrera simple si está completa.
      tramos:
        tipo === 'tramos' && v.tramos.length === 0
          ? (tramosDeCarreraSimple(v) ?? [tramoVacio()])
          : v.tramos,
    }));
  };

  const cambiarTramos = (nuevos: readonly TramoFormulario[]) => {
    const previos = new Map(valores.tramos.map((t) => [t.id, t]));
    // Al añadir o quitar tramos cambia la numeración: se retiran todos los errores; al editar uno,
    // solo los suyos.
    const estructural = nuevos.length !== valores.tramos.length;
    const editados = new Set(nuevos.filter((t) => previos.get(t.id) !== t).map((t) => t.id));
    setErroresTramos((e) => (estructural ? [] : e.filter((x) => !editados.has(x.tramoId))));
    setValores((v) => ({ ...v, tramos: nuevos }));
  };

  const cargarPersonaEjemplo = (id: string) => {
    const persona = personas.find((p) => p.id === id);
    const { nacimiento, jubilacion } = leerFechasFormulario(valores);
    if (!persona) return;
    if (!nacimiento || !jubilacion) {
      setMensajePersona(TEXTOS.personaSinFechas);
      return;
    }
    const carga = cargarPersona(persona, {
      nacimiento,
      jubilacion,
      catalogo,
      definicionMedia: valores.definicionMedia,
    });
    if (!carga.ok) {
      setMensajePersona(carga.mensaje);
      return;
    }
    setMensajePersona(undefined);
    setPersonaCargada({ id, notas: carga.notas });
    const nuevos: FormularioTuPension = { ...valores, tipoCarrera: 'tramos', tramos: carga.tramos };
    setValores(nuevos);
    setErroresTramos([]);
    calcular(nuevos);
  };

  const analisis = useMemo(
    () => (valores.tipoCarrera === 'tramos' ? analizarTramos(valores, catalogo) : undefined),
    [valores, catalogo],
  );

  const lecturas = respuesta?.tipo === 'resultado' ? respuesta.lecturas : filasDelPanel();
  const limitaciones = LIMITACIONES_MOTOR.filter((l) => l.motor === 'jubilacion');

  return (
    <article className="contenedor pagina tp-pagina">
      <div className="articulo">
        <header className="pagina-cabecera">
          <Kicker>{antetituloSeccion('tu-pension')}</Kicker>
          <h1>{seccion.titulo}</h1>
          <Lead>{seccion.resumen}</Lead>
        </header>
        <aside className="tp-aviso" aria-label={TEXTOS.avisoTitulo}>
          <p>
            <strong>{TEXTOS.avisoTitulo}.</strong> {TEXTOS.aviso}
          </p>
        </aside>
        <MarginNote>
          <p>{TEXTOS.nota}</p>
        </MarginNote>

        <section className="seccion" aria-labelledby="tp-datos">
          <h2 id="tp-datos">Tus datos y tu carrera</h2>
          <Formulario
            valores={valores}
            errores={erroresVista}
            onCambio={(c) => {
              setValores((v) => ({ ...v, ...c }));
              // Al corregir un campo se retira su error.
              setErroresVista((e) =>
                Object.fromEntries(Object.entries(e).filter(([campo]) => !(campo in c))),
              );
            }}
            onCalcular={() => {
              calcular();
            }}
            fuenteBase={base.dato}
            fuenteIpc={ipc.dato}
            erroresTramos={erroresTramos}
            analisis={analisis}
            onCambioTipoCarrera={cambiarTipoCarrera}
            onCambioTramos={cambiarTramos}
            catalogo={catalogo}
            personas={personas}
            personaCargada={personaCargada}
            mensajePersona={mensajePersona}
            onCargarPersona={cargarPersonaEjemplo}
          />
        </section>

        <section className="seccion" aria-labelledby="tp-resultado-seccion" aria-live="polite">
          <h2 id="tp-resultado-seccion" className="visualmente-oculto">
            Resultado
          </h2>
          {respuesta === undefined || respuesta.tipo === 'errores-formulario' ? (
            <p className="tp-sin-resultado">{TEXTOS.sinResultado}</p>
          ) : respuesta.tipo === 'error-motor' ? (
            <ErrorMotorVista error={respuesta.error} ref={errorMotor} />
          ) : (
            <Resultado
              modelo={respuesta.modelo}
              ipcUsado={respuesta.ipcUsado}
              bases={respuesta.bases}
              ref={encabezadoResultado}
            />
          )}
        </section>

        <PanelSupuestos lecturas={lecturas} conEfecto={respuesta?.tipo === 'resultado'} />

        <section className="seccion" aria-labelledby="tp-limitaciones">
          <h2 id="tp-limitaciones">{TEXTOS.limitacionesTitulo}</h2>
          <p>{TEXTOS.limitacionesIntro}</p>
          <ul className="tp-limitaciones">
            {limitaciones.map((l) => (
              <li key={l.regla}>
                <strong>{l.regla}.</strong> {l.motivo}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </article>
  );
}
