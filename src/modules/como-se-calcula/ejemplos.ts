/**
 * Cálculo de los ejemplos de «Cómo se calcula». Las entradas son supuestos ilustrativos de
 * `data/ejemplos/como-se-calcula.json`; todos los resultados (cada paso, cada requisito, la pensión)
 * los calcula el motor al abrir la página con los parámetros de /data. Este módulo solo prepara la
 * entrada del motor, llama a la fachada y da formato a lo que devuelve: no calcula nada de la pensión.
 */
import {
  ejecutarJubilacion,
  type EjecutorPrestacion,
  type MotorOfrecido,
  type ResultadoComparable,
} from '../../engine/comparar-lecturas';
import type { EjemploCalculo } from '../../engine/esquema-datos';
import type {
  ConfiguracionMotor,
  EntradaIncapacidad,
  EntradaJubilacion,
  Motor,
} from '../../engine/fachada';
import { formatearEuros, formatearPorcentaje } from '../../engine/formato';
import { motorDelRepositorio } from '../../engine/repositorio';
import { memorizar } from '../historico/cargar';
import { efectoPorLectura } from '../tu-pension/supuestos';
import type { EntradaTuSupervivencia } from '../tu-pension/supervivencia-mapeador';
import { ejecutarSupervivencia } from '../tu-pension/supervivencia-ejecutor';
import { ejemplosCalculo, resolverReferencia, type ReferenciaResuelta } from './datos-como';
import { fechaLarga, mesLargo } from './fechas';
import { numerosEnTexto, valorConUnidad } from './formato-pasos';
import { OPCION_PERIODO_LARGO } from './pasos-motor';

export type { IdSeccion } from './esquemas';
import type { IdSeccion } from './esquemas';

export interface FilaEntrada {
  readonly etiqueta: string;
  readonly valor: string;
}

export interface RequisitoMostrado {
  readonly id: string;
  readonly descripcion: string;
  readonly cumple: boolean;
  readonly valor: string;
  readonly exigido: string;
  readonly articulo: string;
}

export interface PasoMostrado {
  readonly id: string;
  readonly titulo: string;
  /** Valor tal como lo devuelve el motor (para los tests). */
  readonly valorMotor: number | string | boolean;
  /** Valor formateado en es-ES. */
  readonly valor: string;
  readonly articulo: string;
  readonly detalle: string | undefined;
  readonly parametros: readonly ReferenciaResuelta[];
}

export type EfectosLectura = ReadonlyMap<string, { texto: string; afecta: boolean }>;

export interface EjemploCalculado {
  readonly id: string;
  readonly prestacion: IdSeccion;
  readonly titulo: string;
  readonly descripcion: string;
  readonly casoOro: { readonly fichero: string; readonly id: string };
  /** Qué entra: datos de la persona y de la carrera. */
  readonly entradas: readonly FilaEntrada[];
  /** Supuestos del cálculo que no son datos de la persona. */
  readonly supuestos: readonly FilaEntrada[];
  readonly requisitos: readonly RequisitoMostrado[];
  readonly cumpleRequisitos: boolean;
  readonly pasos: readonly PasoMostrado[];
  /** Resultado tal como lo devuelve el motor. */
  readonly pensionMensual: number;
  readonly pensionAnual: number;
  readonly pagas: number;
  readonly estado: string;
  readonly avisos: readonly string[];
  /** Efecto de cada lectura abierta en este ejemplo (se calcula al pedirlo). */
  readonly efectoLecturas: () => EfectosLectura;
}

const ETIQUETA_MODALIDAD: Record<string, string> = {
  ordinaria: 'Jubilación ordinaria',
  'anticipada-voluntaria': 'Jubilación anticipada voluntaria',
  'anticipada-involuntaria':
    'Jubilación anticipada por causa no imputable a la persona trabajadora',
  demorada: 'Jubilación demorada',
};
const ETIQUETA_GRADO: Record<string, string> = {
  parcial: 'Incapacidad permanente parcial',
  total: 'Incapacidad permanente total',
  absoluta: 'Incapacidad permanente absoluta',
  'gran-incapacidad': 'Gran incapacidad',
};
const ETIQUETA_CAUSA: Record<string, string> = {
  'enfermedad-comun': 'Enfermedad común',
  'accidente-no-laboral': 'Accidente no laboral',
};
export const ETIQUETA_ESTADO_PENSION: Record<string, string> = {
  contributiva: 'Pensión contributiva calculada',
  minima: 'Pensión completada hasta la cuantía mínima',
  maxima: 'Pensión limitada por la pensión máxima',
  'no-causa-derecho': 'No se causa derecho a la pensión',
};

const euros2 = (v: number): string => formatearEuros(v, { decimales: 2 });
const siNo = (v: boolean): string => (v ? 'Sí' : 'No');

type Carrera = readonly { desde: string; hasta: string; baseMensual: number }[];

function filasCarrera(carrera: Carrera): FilaEntrada[] {
  return carrera.map((t) => ({
    etiqueta: `Cotización de ${mesLargo(t.desde)} a ${mesLargo(t.hasta)}`,
    valor: `Base de cotización de ${euros2(t.baseMensual)} al mes`,
  }));
}

function filaIpc(ipc: number | undefined): FilaEntrada[] {
  return ipc === undefined
    ? []
    : [
        {
          etiqueta: 'Variación anual del IPC supuesta para los años sin dato',
          valor: formatearPorcentaje(ipc, { maxDecimales: 2 }),
        },
      ];
}

/** Propiedad opcional solo si tiene valor (con `exactOptionalPropertyTypes`). */
const si = <K extends string, V>(clave: K, valor: V | undefined): { [P in K]?: V } =>
  valor === undefined ? {} : ({ [clave]: valor } as { [P in K]?: V });

interface Preparado {
  readonly entradas: FilaEntrada[];
  readonly supuestos: FilaEntrada[];
  readonly ejecutar: (motor: Motor) => ResultadoPreparado | undefined;
  readonly motorLecturas: MotorOfrecido;
  readonly ejecutor: EjecutorPrestacion<unknown>;
  readonly entradaMotor: unknown;
}

interface ResultadoPreparado extends ResultadoComparable {
  readonly pasos: readonly {
    id: string;
    titulo: string;
    valor: number | string | boolean;
    unidad: string;
    parametros: readonly string[];
    articulo: string;
    detalle?: string;
  }[];
  readonly requisitos: readonly {
    id: string;
    descripcion: string;
    cumple: boolean;
    valor: number;
    exigido: number;
    unidad: string;
    articulo: string;
  }[];
  readonly estado: string;
  readonly pensionAnual: number;
  readonly pagas: number;
  readonly avisos: readonly string[];
}

function prepararJubilacion(e: Extract<EjemploCalculo, { prestacion: 'jubilacion' }>): Preparado {
  const o = e.entrada.opciones;
  const entradaMotor: EntradaJubilacion = {
    carrera: e.entrada.carrera,
    nacimiento: e.entrada.nacimiento,
    fechaJubilacion: e.entrada.fechaJubilacion,
    modalidad: e.entrada.modalidad,
    ...(o === undefined
      ? {}
      : {
          opciones: {
            ...si('actualizarBases', o.actualizarBases),
            ...si(OPCION_PERIODO_LARGO, o.usarOpcion25Anos),
          },
        }),
  };
  return {
    entradas: [
      { etiqueta: 'Fecha de nacimiento', valor: fechaLarga(e.entrada.nacimiento) },
      {
        etiqueta: 'Fecha de la jubilación (hecho causante)',
        valor: fechaLarga(e.entrada.fechaJubilacion),
      },
      { etiqueta: 'Modalidad', valor: ETIQUETA_MODALIDAD[e.entrada.modalidad] ?? '' },
      ...filasCarrera(e.entrada.carrera),
    ],
    supuestos: [
      {
        etiqueta: 'Actualización de las bases con el IPC',
        valor: siNo(o?.actualizarBases !== false),
      },
      {
        etiqueta: 'Opción transitoria de calcular la base con la redacción anterior del artículo',
        valor:
          o?.usarOpcion25Anos === false
            ? 'No se aplica en este ejemplo'
            : 'Se aplica si resulta más favorable',
      },
      ...filaIpc(e.escenarioIpc),
    ],
    ejecutar: (motor) => {
      const r = ejecutarJubilacion(motor, entradaMotor);
      if (!r.ok) return undefined;
      const p = r.prestaciones[0];
      if (p === undefined) return undefined;
      return {
        ok: true,
        detalle: r.detalle,
        pasos: p.pasos,
        requisitos: p.requisitos,
        estado: p.estado,
        pensionAnual: p.pensionAnual,
        pagas: p.pagas,
        avisos: r.avisos,
      };
    },
    motorLecturas: 'jubilacion',
    ejecutor: ejecutarJubilacion as unknown as EjecutorPrestacion<unknown>,
    entradaMotor,
  };
}

function prepararIncapacidad(e: Extract<EjemploCalculo, { prestacion: 'incapacidad' }>): Preparado {
  const o = e.entrada.opciones;
  const entradaMotor: EntradaIncapacidad = {
    carrera: e.entrada.carrera,
    nacimiento: e.entrada.nacimiento,
    fechaHechoCausante: e.entrada.fechaHechoCausante,
    grado: e.entrada.grado,
    origen: e.entrada.origen,
    ...(o === undefined ? {} : { opciones: si('actualizarBases', o.actualizarBases) }),
  };
  const ejecutor = (motor: Motor, entrada: EntradaIncapacidad) =>
    motor.incapacidadPermanente(entrada);
  return {
    entradas: [
      { etiqueta: 'Fecha de nacimiento', valor: fechaLarga(e.entrada.nacimiento) },
      { etiqueta: 'Fecha del hecho causante', valor: fechaLarga(e.entrada.fechaHechoCausante) },
      { etiqueta: 'Grado', valor: ETIQUETA_GRADO[e.entrada.grado] ?? '' },
      { etiqueta: 'Origen', valor: ETIQUETA_CAUSA[e.entrada.origen] ?? '' },
      ...filasCarrera(e.entrada.carrera),
    ],
    supuestos: [
      {
        etiqueta: 'Actualización de las bases con el IPC',
        valor: siNo(o?.actualizarBases !== false),
      },
      ...filaIpc(e.escenarioIpc),
    ],
    ejecutar: (motor) => {
      const r = ejecutor(motor, entradaMotor);
      if (!r.ok) return undefined;
      const p = r.prestaciones[0];
      if (p === undefined) return undefined;
      return {
        ok: true,
        detalle: r.detalle,
        pasos: p.pasos,
        requisitos: p.requisitos,
        estado: p.estado,
        pensionAnual: p.pensionAnual,
        pagas: p.pagas,
        avisos: r.avisos,
      };
    },
    motorLecturas: 'incapacidad',
    ejecutor: ejecutor as unknown as EjecutorPrestacion<unknown>,
    entradaMotor,
  };
}

type EjemploSupervivencia = Extract<EjemploCalculo, { prestacion: 'viudedad' | 'orfandad' }>;

/** Pasos del grupo (base reguladora y límite conjunto) intercalados con los de la prestación. */
function pasosSupervivencia(
  grupo: readonly ResultadoPreparado['pasos'][number][],
  propios: readonly ResultadoPreparado['pasos'][number][],
): ResultadoPreparado['pasos'] {
  const base = grupo.filter((p) => p.id === 'base-reguladora');
  const limite = grupo.filter((p) => p.id === 'limite-conjunto');
  const posicion = propios.findIndex((p) =>
    ['complemento-minimos', 'complemento-brecha', 'pension-final'].includes(p.id),
  );
  const corte = posicion < 0 ? propios.length : posicion;
  return [...base, ...propios.slice(0, corte), ...limite, ...propios.slice(corte)];
}

function prepararSupervivencia(e: EjemploSupervivencia): Preparado {
  const c = e.entrada.causante;
  const esViudedad = e.prestacion === 'viudedad';
  const entradaMotor: EntradaTuSupervivencia = esViudedad
    ? {
        quien: 'viudedad',
        causante: c,
        beneficiarios: {
          viudos: [
            {
              vinculo: 'conyuge',
              nacimiento: (e.entrada as { viudo: { nacimiento: string } }).viudo.nacimiento,
              fechaMatrimonio: (e.entrada as { viudo: { fechaMatrimonio: string } }).viudo
                .fechaMatrimonio,
              ...((e.entrada as { viudo: { cargasFamiliares?: object } }).viudo.cargasFamiliares ===
              undefined
                ? {}
                : {
                    cargasFamiliares: (
                      e.entrada as {
                        viudo: {
                          cargasFamiliares: {
                            miembrosUnidadFamiliar: number;
                            rendimientosEjercicioAnteriorUnidadFamiliar: number;
                          };
                        };
                      }
                    ).viudo.cargasFamiliares,
                  }),
            },
          ],
        },
      }
    : {
        quien: 'orfandad',
        causante: c,
        beneficiarios: {
          huerfanos: (e.entrada as { huerfanos: { nacimiento: string }[] }).huerfanos,
        },
        ...((e.entrada as { opciones?: { orfandadAbsoluta?: boolean } }).opciones === undefined
          ? {}
          : {
              opciones: si(
                'orfandadAbsoluta',
                (e.entrada as { opciones: { orfandadAbsoluta?: boolean } }).opciones
                  .orfandadAbsoluta,
              ),
            }),
      };

  const filasPersona: FilaEntrada[] = esViudedad
    ? (() => {
        const v = (
          e.entrada as {
            viudo: {
              nacimiento: string;
              fechaMatrimonio: string;
              cargasFamiliares?: {
                miembrosUnidadFamiliar: number;
                rendimientosEjercicioAnteriorUnidadFamiliar: number;
              };
            };
          }
        ).viudo;
        return [
          { etiqueta: 'Persona beneficiaria', valor: 'Cónyuge superviviente' },
          { etiqueta: 'Fecha de nacimiento del cónyuge', valor: fechaLarga(v.nacimiento) },
          { etiqueta: 'Fecha del matrimonio', valor: fechaLarga(v.fechaMatrimonio) },
          ...(v.cargasFamiliares === undefined
            ? []
            : [
                {
                  etiqueta: 'Miembros de la unidad familiar con cargas',
                  valor: String(v.cargasFamiliares.miembrosUnidadFamiliar),
                },
                {
                  etiqueta: 'Rendimientos de la unidad familiar en el ejercicio anterior',
                  valor: `${euros2(v.cargasFamiliares.rendimientosEjercicioAnteriorUnidadFamiliar)} al año`,
                },
              ]),
        ];
      })()
    : (e.entrada as { huerfanos: { nacimiento: string }[] }).huerfanos.map((h, i) => ({
        etiqueta: `Fecha de nacimiento del huérfano o huérfana (${String(i + 1)})`,
        valor: fechaLarga(h.nacimiento),
      }));
  const absoluta =
    !esViudedad &&
    (e.entrada as { opciones?: { orfandadAbsoluta?: boolean } }).opciones?.orfandadAbsoluta;

  const ejecutar = (motor: Motor): ResultadoPreparado | undefined => {
    const r = ejecutarSupervivencia(motor, entradaMotor);
    if (!r.ok) return undefined;
    const lista = esViudedad ? r.detalle.viudedad : r.detalle.orfandad;
    const p = lista[0];
    if (p === undefined) return undefined;
    return {
      ok: true,
      detalle: r.detalle,
      pasos: pasosSupervivencia(r.pasos, p.pasos),
      requisitos: p.requisitos,
      estado: p.estado,
      pensionAnual: p.pensionAnual,
      pagas: p.pagas,
      avisos: r.avisos,
    };
  };
  return {
    entradas: [
      {
        etiqueta: 'Fecha del fallecimiento (hecho causante)',
        valor: fechaLarga(c.fechaFallecimiento),
      },
      { etiqueta: 'Causa del fallecimiento', valor: ETIQUETA_CAUSA[c.causa] ?? '' },
      { etiqueta: 'Situación de la persona fallecida', valor: 'En alta' },
      ...filasCarrera(c.carrera),
      ...filasPersona,
    ],
    supuestos: [
      ...(absoluta !== true
        ? []
        : [
            {
              etiqueta: 'Orfandad absoluta',
              valor: 'Sí, sin cónyuge superviviente con derecho a viudedad',
            },
          ]),
      ...filaIpc(e.escenarioIpc),
    ],
    ejecutar,
    motorLecturas: e.prestacion,
    ejecutor: ejecutarSupervivencia as unknown as EjecutorPrestacion<unknown>,
    entradaMotor,
  };
}

function preparar(e: EjemploCalculo): Preparado {
  switch (e.prestacion) {
    case 'jubilacion':
      return prepararJubilacion(e);
    case 'incapacidad':
      return prepararIncapacidad(e);
    case 'viudedad':
    case 'orfandad':
      return prepararSupervivencia(e);
  }
}

/** Calcula un ejemplo con el motor del repositorio. Lanza si el motor no puede calcularlo. */
export function calcularEjemplo(e: EjemploCalculo): EjemploCalculado {
  const configuracion: ConfiguracionMotor =
    e.escenarioIpc === undefined ? {} : { escenario: { ipc: e.escenarioIpc } };
  const motor = motorDelRepositorio(configuracion);
  const p = preparar(e);
  const r = p.ejecutar(motor);
  if (r === undefined) throw new Error(`El motor no puede calcular el ejemplo ${e.id}`);
  const importeEfecto = 'la pensión mensual';
  return {
    id: e.id,
    prestacion: e.prestacion,
    titulo: e.titulo,
    descripcion: e.descripcion,
    casoOro: e.casoOro,
    entradas: p.entradas,
    supuestos: p.supuestos,
    requisitos: r.requisitos.map((q) => ({
      id: q.id,
      descripcion: q.descripcion,
      cumple: q.cumple,
      valor: valorConUnidad(q.valor, q.unidad),
      exigido: valorConUnidad(q.exigido, q.unidad),
      articulo: q.articulo,
    })),
    cumpleRequisitos: r.detalle.cumpleRequisitos,
    pasos: r.pasos.map((s) => ({
      id: s.id,
      titulo: s.titulo,
      valorMotor: s.valor,
      valor: valorConUnidad(s.valor, s.unidad),
      articulo: s.articulo,
      detalle: s.detalle === undefined ? undefined : numerosEnTexto(s.detalle),
      parametros: s.parametros.map(resolverReferencia),
    })),
    pensionMensual: r.detalle.pensionMensual,
    pensionAnual: r.pensionAnual,
    pagas: r.pagas,
    estado: r.estado,
    avisos: r.avisos.map(numerosEnTexto),
    efectoLecturas: memorizar(() =>
      efectoPorLectura(
        p.entradaMotor,
        configuracion,
        r,
        (c) => motorDelRepositorio(c),
        p.ejecutor,
        p.motorLecturas,
        importeEfecto,
      ),
    ),
  };
}

/** Todos los ejemplos del fichero de datos, calculados con el motor (una sola vez). */
export const ejemplosCalculados = memorizar((): readonly EjemploCalculado[] =>
  ejemplosCalculo().ejemplos.map(calcularEjemplo),
);

export function ejemplosDe(seccion: IdSeccion): readonly EjemploCalculado[] {
  return ejemplosCalculados().filter((e) => e.prestacion === seccion);
}
