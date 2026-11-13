import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTituloPagina } from '../../app/useTituloPagina';
import { Kicker } from '../../components/Kicker';
import { Lead } from '../../components/Lead';
import { MarginNote } from '../../components/MarginNote';
import { normalizarEleccion } from '../../engine/comparar-lecturas';
import { LIMITACIONES_MOTOR } from '../../engine/limitaciones';
import { antetituloSeccion, buscarSeccion } from '../secciones';
import { calcularTuPension, type RespuestaCalculo } from './calcular';
import { ComparacionLecturas } from './ComparacionLecturas';
import { EnlaceCompartible } from './EnlaceCompartible';
import { escribirEnlace, leerEnlace, tramosParaEnlace, type ResultadoEnlace } from './enlace';
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

/** Parte de búsqueda de la URL de hash (`#/tu-pension?v=1&…` → `?v=1&…`), o cadena vacía. */
function busquedaDelHash(): string {
  const hash = window.location.hash;
  const i = hash.indexOf('?');
  return i < 0 ? '' : hash.slice(i);
}

/** Enlace completo (con la ruta base de la web) para una parte de búsqueda. */
function enlaceCompleto(busqueda: string): string {
  return `${window.location.href.split('#')[0] ?? ''}#/${seccion.slug}${busqueda}`;
}

interface OpcionesCalculo {
  /** No muestra errores de formulario ni mueve el foco (carga desde un enlace, cambio de lectura). */
  readonly silencioso?: boolean;
  /** Mueve el foco al resultado (por defecto, sí salvo en modo silencioso). */
  readonly enfocar?: boolean;
}

export default function TuPension() {
  useTituloPagina(seccion.titulo);
  const base = useMemo(() => sugerenciaBase(), []);
  const ipc = useMemo(() => supuestoIpcPorDefecto(), []);
  const catalogo = useMemo(() => catalogoPorDefecto(), []);
  const personas = useMemo(() => personasDeRepositorio().personas, []);
  const defecto = useMemo<FormularioTuPension>(
    () => ({
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
      lecturas: {},
    }),
    [base, ipc, catalogo],
  );
  const contextoEnlace = useMemo(
    () => ({
      defecto,
      definicionesMedia: catalogo.referencias.filter((r) => r.tipo === 'media').map((r) => r.id),
      personas: personas.map((p) => p.id),
    }),
    [defecto, catalogo, personas],
  );
  // Enlace con el que se abre la página (si lo hay): rellena el formulario y se calcula.
  const [enlaceInicial] = useState<ResultadoEnlace | undefined>(() =>
    leerEnlace(busquedaDelHash(), contextoEnlace),
  );
  const [avisosEnlace, setAvisosEnlace] = useState<readonly string[]>(enlaceInicial?.avisos ?? []);
  const [valores, setValores] = useState<FormularioTuPension>(
    () => enlaceInicial?.formulario ?? defecto,
  );
  const [respuesta, setRespuesta] = useState<RespuestaCalculo | undefined>(undefined);
  const [erroresVista, setErroresVista] = useState<ErroresFormulario>({});
  const [erroresTramos, setErroresTramos] = useState<readonly ErrorTramo[]>([]);
  const [personaCargada, setPersonaCargada] = useState<PersonaCargada | undefined>(undefined);
  const [mensajePersona, setMensajePersona] = useState<string | undefined>(undefined);
  const [restablecidas, setRestablecidas] = useState(false);
  /** Formulario con el que se calculó el resultado que se ve (las lecturas se cambian sobre él). */
  const ultimoCalculado = useRef<FormularioTuPension | undefined>(undefined);
  const encabezadoResultado = useRef<HTMLHeadingElement>(null);
  const errorMotor = useRef<HTMLDivElement>(null);

  const calcular = (
    aCalcular: FormularioTuPension = valores,
    { silencioso = false, enfocar = !silencioso }: OpcionesCalculo = {},
  ) => {
    const r = calcularTuPension(aCalcular, {
      fabricaMotor: crearMotorDelRepositorio,
      leerReferencia: leerReferenciaDeRepositorio,
      catalogo,
    });
    if (r.tipo === 'errores-formulario') {
      ultimoCalculado.current = undefined;
      if (silencioso) {
        setRespuesta(undefined);
        return;
      }
      setRespuesta(r);
      setErroresVista(r.errores);
      setErroresTramos(r.erroresTramos);
      // El foco va al primer control con error, para el teclado y los lectores de pantalla.
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('.tp-formulario [aria-invalid="true"]')?.focus();
      });
      return;
    }
    ultimoCalculado.current = aCalcular;
    setRespuesta(r);
    setErroresVista({});
    setErroresTramos([]);
    if (enfocar) {
      requestAnimationFrame(() => {
        (encabezadoResultado.current ?? errorMotor.current)?.focus();
      });
    }
  };

  /** Aplica un enlace (al abrir la página o al pegar otro en la misma pestaña). */
  const aplicarEnlace = useCallback(
    (enlace: ResultadoEnlace) => {
      setValores(enlace.formulario);
      setAvisosEnlace(enlace.avisos);
      setErroresVista({});
      setErroresTramos([]);
      setMensajePersona(undefined);
      setRestablecidas(false);
      const persona = personas.find((p) => p.id === enlace.personaId);
      const { nacimiento, jubilacion } = leerFechasFormulario(enlace.formulario);
      const carga =
        persona && nacimiento && jubilacion
          ? cargarPersona(persona, {
              nacimiento,
              jubilacion,
              catalogo,
              definicionMedia: enlace.formulario.definicionMedia,
            })
          : undefined;
      setPersonaCargada(
        persona && enlace.aplicado
          ? { id: persona.id, notas: carga?.ok ? carga.notas : [] }
          : undefined,
      );
      if (enlace.aplicado) {
        const r = calcularTuPension(enlace.formulario, {
          fabricaMotor: crearMotorDelRepositorio,
          leerReferencia: leerReferenciaDeRepositorio,
          catalogo,
        });
        ultimoCalculado.current = r.tipo === 'errores-formulario' ? undefined : enlace.formulario;
        setRespuesta(r.tipo === 'errores-formulario' ? undefined : r);
      } else {
        ultimoCalculado.current = undefined;
        setRespuesta(undefined);
      }
    },
    [personas, catalogo],
  );

  // Al abrir la página con un enlace se rellena el formulario y se calcula (una sola vez).
  const busquedaAplicada = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (busquedaAplicada.current !== undefined) return;
    busquedaAplicada.current = busquedaDelHash();
    if (enlaceInicial) aplicarEnlace(enlaceInicial);
  }, [enlaceInicial, aplicarEnlace]);

  // Si se pega otro enlace en la misma pestaña, la página no se vuelve a montar: se escucha el hash.
  useEffect(() => {
    const alCambiarHash = () => {
      const busqueda = busquedaDelHash();
      if (busqueda === busquedaAplicada.current) return;
      busquedaAplicada.current = busqueda;
      const enlace = leerEnlace(busqueda, contextoEnlace);
      if (enlace) aplicarEnlace(enlace);
    };
    window.addEventListener('hashchange', alCambiarHash);
    return () => {
      window.removeEventListener('hashchange', alCambiarHash);
    };
  }, [contextoEnlace, aplicarEnlace]);

  /** Cambia las lecturas elegidas y, si ya había resultado, lo recalcula sin mover el foco. */
  const cambiarLecturas = (nuevas: Readonly<Record<string, string>>, reiniciadas: boolean) => {
    const lecturas = normalizarEleccion(nuevas);
    setValores((v) => ({ ...v, lecturas }));
    setRestablecidas(reiniciadas);
    if (ultimoCalculado.current) {
      calcular({ ...ultimoCalculado.current, lecturas }, { silencioso: true, enfocar: false });
    }
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

  const lecturas =
    respuesta?.tipo === 'resultado'
      ? respuesta.lecturas
      : filasDelPanel(undefined, valores.lecturas);
  const busquedaActual = useMemo(
    () => escribirEnlace(valores, personaCargada?.id),
    [valores, personaCargada],
  );
  const tramosOmitidos = tramosParaEnlace(valores.tramos).omitidosPorLimite;
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
        {avisosEnlace.length > 0 ? (
          <aside className="tp-aviso tp-aviso-enlace" aria-labelledby="tp-aviso-enlace-titulo">
            <h2 id="tp-aviso-enlace-titulo">{TEXTOS.enlaceAvisoTitulo}</h2>
            <p>{TEXTOS.enlaceAvisoIntro}</p>
            <ul>
              {avisosEnlace.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </aside>
        ) : null}

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

        <section className="seccion" aria-labelledby="tp-resultado-seccion">
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
              comparacion={
                <ComparacionLecturas
                  comparacion={respuesta.comparacion}
                  restablecidas={restablecidas}
                />
              }
              ref={encabezadoResultado}
            />
          )}
        </section>

        <PanelSupuestos
          lecturas={lecturas}
          conEfecto={respuesta?.tipo === 'resultado'}
          onElegir={(id, valor) => {
            cambiarLecturas({ ...valores.lecturas, [id]: valor }, false);
          }}
          onRestablecer={() => {
            cambiarLecturas({}, true);
          }}
        />

        <EnlaceCompartible
          enlace={enlaceCompleto(busquedaActual)}
          tramosOmitidos={tramosOmitidos}
        />

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
