/**
 * Fachada única del motor de pensiones: una función de entrada por tipo de prestación (jubilación,
 * incapacidad permanente, viudedad, orfandad, favor de familiares y pensiones no contributivas), con
 * entradas y salidas unificadas, errores unificados y el desglose por pasos de cada motor.
 *
 * - `crearMotor(leer, configuracion)` recibe la lectura de los ficheros de /data (en Vite o
 *   Vitest, `motorDelRepositorio` en `repositorio.ts`; en Node, una lectura con `readFileSync`) y una
 *   configuración opcional que sobrescribe las lecturas abiertas (registro único en `lecturas.ts`).
 * - Ninguna función lanza por reglas del dominio: devuelven `{ ok: false, error }` con el código
 *   `NoImplementada`, `DatoNoDisponible` o `EntradaInvalida`. `desenvolver` vuelve a lanzar el error.
 * - No cambia el comportamiento de los motores: cada función llama a la del motor con las mismas
 *   opciones. Prioridad de las lecturas: por defecto < configuración < `opciones` de la entrada.
 */
import { calcularIncapacidadPermanenteConParametros } from './incapacidad/calculo.ts';
import { construirParametrosIncapacidad } from './incapacidad/parametros.ts';
import type {
  GradoIncapacidad,
  OpcionesIncapacidad,
  OrigenIncapacidad,
  ResultadoIncapacidad,
} from './incapacidad/tipos.ts';
import { calcularJubilacionConParametros } from './jubilacion/calculo.ts';
import { DatoNoDisponible, NoImplementada } from './jubilacion/errores.ts';
import { construirParametros, type LeerDatos } from './jubilacion/parametros.ts';
import type {
  Carrera,
  Escenario,
  Modalidad,
  OpcionesJubilacion,
  Paso,
  Requisito,
  ResultadoJubilacion,
} from './jubilacion/tipos.ts';
import { lecturasDelMotor, resolverLecturas, type ConfiguracionLecturas } from './lecturas.ts';
import { cotizacionAdicionalMensual } from './mei/calculo.ts';
import { construirParametrosMEI } from './mei/parametros.ts';
import type { CotizacionAdicional, OpcionesMEI } from './mei/tipos.ts';
import { calcularPNCConParametros } from './no-contributivas/calculo.ts';
import { construirParametrosPNC } from './no-contributivas/parametros.ts';
import type {
  ClasePNC,
  OpcionesPNC,
  ResultadoPNC,
  SolicitantePNC,
} from './no-contributivas/tipos.ts';
import { calcularSupervivenciaConParametros } from './supervivencia/calculo.ts';
import { construirParametrosSupervivencia } from './supervivencia/parametros.ts';
import type {
  BeneficiarioViudedad,
  Beneficiarios,
  Causante,
  Familiar,
  Huerfano,
  OpcionesSupervivencia,
  ResultadoPrestacion,
  ResultadoSupervivencia,
} from './supervivencia/tipos.ts';

export type TipoPrestacion =
  | 'jubilacion'
  | 'incapacidad-permanente'
  | 'viudedad'
  | 'orfandad'
  | 'favor-familiares'
  | 'pnc-jubilacion'
  | 'pnc-incapacidad';

/** Configuración del motor: lecturas abiertas por id y escenario económico por defecto. */
export interface ConfiguracionMotor {
  readonly lecturas?: ConfiguracionLecturas;
  readonly escenario?: Escenario;
}

// --- Entradas -------------------------------------------------------------------------------------
export interface EntradaJubilacion {
  readonly carrera: Carrera;
  readonly nacimiento: string;
  readonly fechaJubilacion: string;
  readonly modalidad: Modalidad;
  readonly opciones?: OpcionesJubilacion;
}
export interface EntradaIncapacidad {
  readonly carrera: Carrera;
  readonly nacimiento: string;
  readonly fechaHechoCausante: string;
  readonly grado: GradoIncapacidad;
  readonly origen: OrigenIncapacidad;
  readonly opciones?: OpcionesIncapacidad;
}
export interface EntradaViudedad {
  readonly causante: Causante;
  readonly viudos: readonly BeneficiarioViudedad[];
  readonly opciones?: OpcionesSupervivencia;
}
export interface EntradaOrfandad {
  readonly causante: Causante;
  readonly huerfanos: readonly Huerfano[];
  readonly opciones?: OpcionesSupervivencia;
}
export interface EntradaFavorFamiliares {
  readonly causante: Causante;
  readonly familiares: readonly Familiar[];
  readonly opciones?: OpcionesSupervivencia;
}
export interface EntradaSupervivencia {
  readonly causante: Causante;
  readonly beneficiarios: Beneficiarios;
  readonly opciones?: OpcionesSupervivencia;
}
export interface EntradaPNC {
  readonly solicitante: SolicitantePNC;
  readonly opciones?: OpcionesPNC;
}
export interface EntradaMEI {
  readonly anio: number;
  readonly retribucionMensual: number;
  readonly opciones?: OpcionesMEI;
}

export type Entrada =
  | ({ readonly tipo: 'jubilacion' } & EntradaJubilacion)
  | ({ readonly tipo: 'incapacidad-permanente' } & EntradaIncapacidad)
  | ({ readonly tipo: 'viudedad' } & EntradaViudedad)
  | ({ readonly tipo: 'orfandad' } & EntradaOrfandad)
  | ({ readonly tipo: 'favor-familiares' } & EntradaFavorFamiliares)
  | ({ readonly tipo: 'pnc-jubilacion' } & EntradaPNC)
  | ({ readonly tipo: 'pnc-incapacidad' } & EntradaPNC);

// --- Salidas --------------------------------------------------------------------------------------
export type CodigoError = 'NoImplementada' | 'DatoNoDisponible' | 'EntradaInvalida';

export interface ErrorMotor {
  readonly codigo: CodigoError;
  readonly mensaje: string;
  /** Regla que no se implementa (solo `NoImplementada`). */
  readonly regla?: string;
  /** Error original, para volver a lanzarlo con `desenvolver`. */
  readonly original: Error;
}

/** Una prestación de la salida unificada (una por beneficiario en supervivencia). */
export interface PrestacionUnificada {
  /** `jubilacion`, `incapacidad-permanente`, `viudedad`, `prestacion-temporal-viudedad`, `orfandad`, `favor-familiares`, `pnc-jubilacion` o `pnc-incapacidad`. */
  readonly clase: string;
  /** Posición del beneficiario en la entrada (0 si solo hay uno). */
  readonly indice: number;
  readonly cumpleRequisitos: boolean;
  /** Estado propio del motor (contributiva, mínima, máxima, reducida…). */
  readonly estado: string;
  /** Importe de cada paga (euros nominales del año de la normativa). */
  readonly pensionMensual: number;
  readonly pensionAnual: number;
  readonly pagas: number;
  readonly requisitos: readonly Requisito[];
  readonly pasos: readonly Paso[];
}

export interface DetallePorTipo {
  readonly jubilacion: ResultadoJubilacion;
  readonly 'incapacidad-permanente': ResultadoIncapacidad;
  readonly viudedad: ResultadoSupervivencia;
  readonly orfandad: ResultadoSupervivencia;
  readonly 'favor-familiares': ResultadoSupervivencia;
  readonly supervivencia: ResultadoSupervivencia;
  readonly 'pnc-jubilacion': ResultadoPNC;
  readonly 'pnc-incapacidad': ResultadoPNC;
}

export interface ResultadoOk<T extends keyof DetallePorTipo> {
  readonly ok: true;
  readonly tipo: T;
  readonly anioNormativa: number;
  readonly prestaciones: readonly PrestacionUnificada[];
  /** Suma de las pagas de todas las prestaciones con derecho. */
  readonly pensionMensualTotal: number;
  readonly pensionAnualTotal: number;
  /** Pasos comunes (causante, límite conjunto…) además de los de cada prestación. */
  readonly pasos: readonly Paso[];
  readonly avisos: readonly string[];
  /** Resultado completo del motor. */
  readonly detalle: DetallePorTipo[T];
}
export interface ResultadoError {
  readonly ok: false;
  readonly error: ErrorMotor;
}
export type Resultado<T extends keyof DetallePorTipo> = ResultadoOk<T> | ResultadoError;

export function errorDe(e: unknown): ErrorMotor {
  if (e instanceof NoImplementada) {
    return { codigo: 'NoImplementada', mensaje: e.message, regla: e.regla, original: e };
  }
  if (e instanceof DatoNoDisponible)
    return { codigo: 'DatoNoDisponible', mensaje: e.message, original: e };
  if (e instanceof RangeError || e instanceof TypeError) {
    return { codigo: 'EntradaInvalida', mensaje: e.message, original: e };
  }
  throw e;
}

/** Devuelve el resultado o vuelve a lanzar el error original del motor. */
export function desenvolver<T extends keyof DetallePorTipo>(r: Resultado<T>): ResultadoOk<T> {
  if (!r.ok) throw r.error.original;
  return r;
}

function ejecutar<T extends keyof DetallePorTipo>(f: () => ResultadoOk<T>): Resultado<T> {
  try {
    return f();
  } catch (e) {
    return { ok: false, error: errorDe(e) };
  }
}

const suma = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

function deSupervivencia(
  tipo: 'viudedad' | 'orfandad' | 'favor-familiares' | 'supervivencia',
  r: ResultadoSupervivencia,
): ResultadoOk<typeof tipo> {
  const conv = (p: ResultadoPrestacion): PrestacionUnificada => ({
    clase: p.clase,
    indice: p.indice,
    cumpleRequisitos: p.cumpleRequisitos,
    estado: p.estado,
    pensionMensual: p.pensionMensual,
    pensionAnual: p.pensionAnual,
    pagas: p.pagas,
    requisitos: p.requisitos,
    pasos: p.pasos,
  });
  const lista =
    tipo === 'viudedad'
      ? r.viudedad
      : tipo === 'orfandad'
        ? r.orfandad
        : tipo === 'favor-familiares'
          ? r.favorFamiliares
          : [...r.viudedad, ...r.orfandad, ...r.favorFamiliares];
  const prestaciones = lista.map(conv);
  return {
    ok: true,
    tipo,
    anioNormativa: r.anioNormativa,
    prestaciones,
    pensionMensualTotal: suma(prestaciones.map((p) => p.pensionMensual)),
    pensionAnualTotal: suma(prestaciones.map((p) => p.pensionAnual)),
    pasos: r.pasos,
    avisos: r.avisos,
    detalle: r,
  };
}

function dePNC(
  tipo: 'pnc-jubilacion' | 'pnc-incapacidad',
  r: ResultadoPNC,
): ResultadoOk<typeof tipo> {
  const p: PrestacionUnificada = {
    clase: tipo,
    indice: 0,
    cumpleRequisitos: r.cumpleRequisitos,
    estado: r.estado,
    pensionMensual: r.pensionMensual,
    pensionAnual: r.pensionAnual + r.complementoTerceraPersonaAnual,
    pagas: r.pagas,
    requisitos: r.requisitos,
    pasos: r.pasos,
  };
  return {
    ok: true,
    tipo,
    anioNormativa: r.anioNormativa,
    prestaciones: [p],
    pensionMensualTotal: r.pensionMensual,
    pensionAnualTotal: r.totalAnual,
    pasos: [],
    avisos: r.avisos,
    detalle: r,
  };
}

export interface Motor {
  readonly configuracion: ConfiguracionMotor;
  /** Valor efectivo de cada lectura abierta (por defecto + configuración). */
  readonly lecturas: Readonly<Record<string, string>>;
  jubilacion(entrada: EntradaJubilacion): Resultado<'jubilacion'>;
  incapacidadPermanente(entrada: EntradaIncapacidad): Resultado<'incapacidad-permanente'>;
  viudedad(entrada: EntradaViudedad): Resultado<'viudedad'>;
  orfandad(entrada: EntradaOrfandad): Resultado<'orfandad'>;
  favorFamiliares(entrada: EntradaFavorFamiliares): Resultado<'favor-familiares'>;
  /** Todas las prestaciones de supervivencia de un mismo causante, con el límite conjunto. */
  supervivencia(entrada: EntradaSupervivencia): Resultado<'supervivencia'>;
  pncJubilacion(entrada: EntradaPNC): Resultado<'pnc-jubilacion'>;
  pncIncapacidad(entrada: EntradaPNC): Resultado<'pnc-incapacidad'>;
  /** Función de entrada única: despacha por `tipo`. */
  calcular(entrada: Entrada): Resultado<keyof DetallePorTipo>;
  /** MEI y cotización adicional de solidaridad de una retribución mensual (no es una pensión). */
  cotizacionAdicional(
    entrada: EntradaMEI,
  ): { readonly ok: true; readonly detalle: CotizacionAdicional } | ResultadoError;
}

/** Une `lecturas` por defecto de un motor (de la configuración) con las de la entrada (prioridad a la entrada). */
function fusion<T extends object>(config: Record<string, string>, entrada: T | undefined): T {
  return { ...config, ...entrada } as T;
}

export function crearMotor(leer: LeerDatos, configuracion: ConfiguracionMotor = {}): Motor {
  const lecturas = resolverLecturas(configuracion.lecturas ?? {});
  const cfg = configuracion.lecturas ?? {};
  let pj: ReturnType<typeof construirParametros> | undefined;
  let pi: ReturnType<typeof construirParametrosIncapacidad> | undefined;
  let ps: ReturnType<typeof construirParametrosSupervivencia> | undefined;
  let pp: ReturnType<typeof construirParametrosPNC> | undefined;
  let pm: ReturnType<typeof construirParametrosMEI> | undefined;
  const jub = () => (pj ??= construirParametros(leer));
  const inc = () => (pi ??= construirParametrosIncapacidad(leer));
  const sup = () => (ps ??= construirParametrosSupervivencia(leer));
  const pnc = () => (pp ??= construirParametrosPNC(leer));
  const mei = () => (pm ??= construirParametrosMEI(leer));
  const esc = (o: { escenario?: Escenario } | undefined): { escenario?: Escenario } =>
    o?.escenario !== undefined || configuracion.escenario === undefined
      ? {}
      : { escenario: configuracion.escenario };

  // Las lecturas de la jubilación (contexto común) también rigen en incapacidad y supervivencia.
  const lecJub = lecturasDelMotor('jubilacion', cfg);

  const opcionesJubilacion = (o: OpcionesJubilacion | undefined): OpcionesJubilacion => ({
    ...o,
    ...esc(o),
    lecturas: fusion(lecJub, o?.lecturas),
  });
  const opcionesIncapacidad = (o: OpcionesIncapacidad | undefined): OpcionesIncapacidad => ({
    ...o,
    ...esc(o),
    lecturas: fusion(lecJub, o?.lecturas),
    lecturasIncapacidad: fusion(lecturasDelMotor('incapacidad', cfg), o?.lecturasIncapacidad),
  });
  const opcionesSupervivencia = (o: OpcionesSupervivencia | undefined): OpcionesSupervivencia => ({
    ...o,
    ...esc(o),
    lecturas: fusion(lecJub, o?.lecturas),
    lecturasSupervivencia: fusion(lecturasDelMotor('supervivencia', cfg), o?.lecturasSupervivencia),
  });
  const opcionesPNC = (o: OpcionesPNC | undefined): OpcionesPNC => ({
    ...o,
    lecturasPNC: fusion(lecturasDelMotor('no-contributivas', cfg), o?.lecturasPNC),
  });

  const jubilacion: Motor['jubilacion'] = (e) =>
    ejecutar(() => {
      const r = calcularJubilacionConParametros(
        jub(),
        e.carrera,
        e.nacimiento,
        e.fechaJubilacion,
        e.modalidad,
        opcionesJubilacion(e.opciones),
      );
      const p: PrestacionUnificada = {
        clase: 'jubilacion',
        indice: 0,
        cumpleRequisitos: r.cumpleRequisitos,
        estado: r.estado,
        pensionMensual: r.pensionMensual,
        pensionAnual: r.pensionAnual,
        pagas: r.pagas,
        requisitos: r.requisitos,
        pasos: r.pasos,
      };
      return {
        ok: true,
        tipo: 'jubilacion',
        anioNormativa: r.anioNormativa,
        prestaciones: [p],
        pensionMensualTotal: r.pensionMensual,
        pensionAnualTotal: r.pensionAnual,
        pasos: [],
        avisos: r.avisos,
        detalle: r,
      };
    });
  const incapacidadPermanente: Motor['incapacidadPermanente'] = (e) =>
    ejecutar(() => {
      const r = calcularIncapacidadPermanenteConParametros(
        inc(),
        e.carrera,
        e.nacimiento,
        e.fechaHechoCausante,
        e.grado,
        e.origen,
        opcionesIncapacidad(e.opciones),
      );
      const p: PrestacionUnificada = {
        clase: 'incapacidad-permanente',
        indice: 0,
        cumpleRequisitos: r.cumpleRequisitos,
        estado: r.estado,
        pensionMensual: r.pensionMensual,
        pensionAnual: r.pensionAnual,
        pagas: r.pagas,
        requisitos: r.requisitos,
        pasos: r.pasos,
      };
      return {
        ok: true,
        tipo: 'incapacidad-permanente',
        anioNormativa: r.anioNormativa,
        prestaciones: [p],
        pensionMensualTotal: r.pensionMensual,
        pensionAnualTotal: r.pensionAnual,
        pasos: [],
        avisos: r.avisos,
        detalle: r,
      };
    });
  const superv = (b: Beneficiarios, e: { causante: Causante; opciones?: OpcionesSupervivencia }) =>
    calcularSupervivenciaConParametros(sup(), e.causante, b, opcionesSupervivencia(e.opciones));
  const pnc_ = (clase: ClasePNC, e: EntradaPNC) =>
    calcularPNCConParametros(pnc(), clase, e.solicitante, opcionesPNC(e.opciones));

  const motor: Motor = {
    configuracion,
    lecturas,
    jubilacion,
    incapacidadPermanente,
    viudedad: (e) =>
      ejecutar(
        () =>
          deSupervivencia('viudedad', superv({ viudos: e.viudos }, e)) as ResultadoOk<'viudedad'>,
      ),
    orfandad: (e) =>
      ejecutar(
        () =>
          deSupervivencia(
            'orfandad',
            superv({ huerfanos: e.huerfanos }, e),
          ) as ResultadoOk<'orfandad'>,
      ),
    favorFamiliares: (e) =>
      ejecutar(
        () =>
          deSupervivencia(
            'favor-familiares',
            superv({ familiares: e.familiares }, e),
          ) as ResultadoOk<'favor-familiares'>,
      ),
    supervivencia: (e) =>
      ejecutar(
        () =>
          deSupervivencia(
            'supervivencia',
            superv(e.beneficiarios, e),
          ) as ResultadoOk<'supervivencia'>,
      ),
    pncJubilacion: (e) =>
      ejecutar(
        () => dePNC('pnc-jubilacion', pnc_('jubilacion', e)) as ResultadoOk<'pnc-jubilacion'>,
      ),
    pncIncapacidad: (e) =>
      ejecutar(
        () => dePNC('pnc-incapacidad', pnc_('incapacidad', e)) as ResultadoOk<'pnc-incapacidad'>,
      ),
    calcular: (e) => {
      switch (e.tipo) {
        case 'jubilacion':
          return jubilacion(e);
        case 'incapacidad-permanente':
          return incapacidadPermanente(e);
        case 'viudedad':
          return motor.viudedad(e);
        case 'orfandad':
          return motor.orfandad(e);
        case 'favor-familiares':
          return motor.favorFamiliares(e);
        case 'pnc-jubilacion':
          return motor.pncJubilacion(e);
        case 'pnc-incapacidad':
          return motor.pncIncapacidad(e);
      }
    },
    cotizacionAdicional: (e) => {
      try {
        const detalle = cotizacionAdicionalMensual(mei(), e.anio, e.retribucionMensual, {
          ...e.opciones,
          ...esc(e.opciones),
          lecturasMEI: fusion(lecturasDelMotor('mei', cfg), e.opciones?.lecturasMEI),
        });
        return { ok: true, detalle };
      } catch (err) {
        return { ok: false, error: errorDe(err) };
      }
    },
  };
  return motor;
}
