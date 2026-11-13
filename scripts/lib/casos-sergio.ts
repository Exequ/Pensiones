/**
 * Casos de oro de Sergio: lectura, validación y ejecución de data-raw/casos-oro/casos-sergio.md.
 *
 * El fichero es una tabla Markdown con las columnas de docs/CASOS_SERGIO_PLANTILLA.md:
 *
 *   | id | tipo | fecha del hecho causante | datos personales | carrera o bases | resultado esperado | fuente o método |
 *
 * `datos personales`, `carrera o bases` y `resultado esperado` son JSON (con o sin comillas
 * invertidas alrededor). Este módulo convierte cada fila en un caso ejecutable con la fachada del
 * motor (`src/engine/fachada.ts`) y da mensajes claros: fila, columna y qué falta o sobra.
 */
import {
  crearMotor,
  type ConfiguracionMotor,
  type Entrada,
  type Motor,
  type PrestacionUnificada,
} from '../../src/engine/fachada.ts';
import type { LeerDatos } from '../../src/engine/jubilacion/parametros.ts';

export const TIPOS_CASO = [
  'jubilacion',
  'incapacidad-permanente',
  'viudedad',
  'orfandad',
  'favor-familiares',
  'supervivencia',
  'pnc-jubilacion',
  'pnc-incapacidad',
  'mei',
] as const;
export type TipoCaso = (typeof TIPOS_CASO)[number];

export const COLUMNAS = [
  'id',
  'tipo',
  'fecha del hecho causante',
  'datos personales',
  'carrera o bases',
  'resultado esperado',
  'fuente o método',
] as const;

type Json = Record<string, unknown>;

export interface CasoSergio {
  readonly id: string;
  readonly tipo: TipoCaso;
  readonly fecha: string;
  readonly datos: Json;
  /** Carrera (lista de periodos) o, en el MEI, `{ "retribucionMensual": n }`; `-` si no procede. */
  readonly carrera: unknown;
  readonly esperado: Json;
  readonly fuente: string;
  /** Número de línea del fichero (para los mensajes). */
  readonly linea: number;
}

export interface LecturaCasos {
  readonly casos: readonly CasoSergio[];
  readonly errores: readonly string[];
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function celdas(linea: string): string[] {
  // Parte por « | » respetando las barras que haya dentro de comillas invertidas.
  const t = linea.trim().replace(/^\|/, '').replace(/\|$/, '');
  const salida: string[] = [];
  let actual = '';
  let enCodigo = false;
  for (const ch of t) {
    if (ch === '`') enCodigo = !enCodigo;
    if (ch === '|' && !enCodigo) {
      salida.push(actual.trim());
      actual = '';
    } else actual += ch;
  }
  salida.push(actual.trim());
  return salida;
}

const quitarCodigo = (s: string): string => s.replace(/^`+|`+$/g, '').trim();

function json(texto: string, donde: string, errores: string[]): unknown {
  const t = quitarCodigo(texto);
  if (t === '-' || t === '') return undefined;
  try {
    return JSON.parse(t) as unknown;
  } catch (e) {
    errores.push(`${donde}: JSON no válido (${(e as Error).message}). Texto: ${t.slice(0, 80)}`);
    return undefined;
  }
}

/** Lee y valida el texto de casos-sergio.md. No lanza: devuelve los errores con su fila y columna. */
export function leerCasosSergio(texto: string): LecturaCasos {
  const errores: string[] = [];
  const casos: CasoSergio[] = [];
  const lineas = texto.split('\n');
  let cabecera: number | undefined;
  const vistos = new Set<string>();
  lineas.forEach((l, i) => {
    if (!l.trim().startsWith('|')) return;
    const c = celdas(l);
    if (c.every((x) => /^:?-{2,}:?$/.test(x))) return; // separador de la tabla
    if (cabecera === undefined) {
      cabecera = i;
      const esperadas = COLUMNAS.join(' | ');
      const reales = c.map((x) => x.toLowerCase()).join(' | ');
      if (reales !== esperadas) {
        errores.push(
          `Línea ${i + 1}: la cabecera de la tabla debe ser «${COLUMNAS.join(' | ')}» (docs/CASOS_SERGIO_PLANTILLA.md); es «${c.join(' | ')}».`,
        );
      }
      return;
    }
    const fila = `Línea ${i + 1}`;
    if (c.length !== COLUMNAS.length) {
      errores.push(
        `${fila}: la fila tiene ${c.length} columnas y deben ser ${COLUMNAS.length} (¿hay una barra «|» dentro de un JSON sin comillas invertidas?).`,
      );
      return;
    }
    const [
      id = '',
      tipo = '',
      fecha = '',
      datosT = '',
      carreraT = '',
      esperadoT = '',
      fuente = '',
    ] = c;
    const sinErroresPrevios = errores.length;
    const idc = quitarCodigo(id);
    if (idc === '') errores.push(`${fila}, columna «id»: está vacía.`);
    else if (vistos.has(idc)) errores.push(`${fila}, columna «id»: «${idc}» está repetido.`);
    vistos.add(idc);
    const tp = quitarCodigo(tipo) as TipoCaso;
    if (!TIPOS_CASO.includes(tp))
      errores.push(
        `${fila}, columna «tipo»: «${tp}» no es válido; use uno de: ${TIPOS_CASO.join(', ')}.`,
      );
    const f = quitarCodigo(fecha);
    if (!FECHA.test(f))
      errores.push(
        `${fila}, columna «fecha del hecho causante»: «${f}» debe tener el formato AAAA-MM-DD.`,
      );
    const datos = json(datosT, `${fila}, columna «datos personales»`, errores);
    if (datos === undefined || typeof datos !== 'object' || Array.isArray(datos)) {
      if (!errores.some((e) => e.startsWith(`${fila}, columna «datos personales»`)))
        errores.push(
          `${fila}, columna «datos personales»: debe ser un objeto JSON (use {} si no hay datos).`,
        );
    }
    const carrera = json(carreraT, `${fila}, columna «carrera o bases»`, errores);
    const esperado = json(esperadoT, `${fila}, columna «resultado esperado»`, errores);
    if (esperado === undefined || typeof esperado !== 'object' || Array.isArray(esperado)) {
      if (!errores.some((e) => e.startsWith(`${fila}, columna «resultado esperado»`)))
        errores.push(
          `${fila}, columna «resultado esperado»: debe ser un objeto JSON, p. ej. {"pensionMensual": 1234.56}.`,
        );
    } else {
      const e = esperado as Json;
      const tieneCifra = [
        'pensionMensual',
        'pensionAnual',
        'cuotaTotal',
        'cuotaEmpresa',
        'cuotaTrabajador',
        'prestaciones',
        'error',
        'cumpleRequisitos',
      ].some((k) => k in e);
      if (!tieneCifra)
        errores.push(
          `${fila}, columna «resultado esperado»: indique al menos pensionMensual, pensionAnual, cuotaTotal, prestaciones, cumpleRequisitos o error.`,
        );
      if ('diferenciaConocida' in e) {
        const m = e['diferenciaConocida'];
        if (typeof m !== 'string' || m.trim().length < 10)
          errores.push(
            `${fila}, columna «resultado esperado»: «diferenciaConocida» debe ser un texto con el motivo (al menos diez caracteres).`,
          );
      }
    }
    const fu = fuente.trim();
    if (fu.length < 10)
      errores.push(
        `${fila}, columna «fuente o método»: indique de dónde sale el resultado esperado (resolución, simulador, cálculo a mano…); tiene «${fu}».`,
      );
    if (
      tp !== 'mei' &&
      TIPOS_CASO.includes(tp) &&
      !['pnc-jubilacion', 'pnc-incapacidad'].includes(tp) &&
      (carrera === undefined || !Array.isArray(carrera)) &&
      !(datos && typeof datos === 'object' && (datos as Json)['pension'] !== undefined) &&
      !(datos && typeof datos === 'object' && (datos as Json)['situacion'] === 'pensionista')
    ) {
      if (!errores.some((e) => e.startsWith(`${fila}, columna «carrera o bases»`)))
        errores.push(
          `${fila}, columna «carrera o bases»: debe ser una lista JSON de periodos [{"desde":"AAAA-MM","hasta":"AAAA-MM","baseMensual":n}] (o un causante pensionista).`,
        );
    }
    if (errores.length === sinErroresPrevios && datos !== undefined && esperado !== undefined) {
      casos.push({
        id: idc,
        tipo: tp,
        fecha: f,
        datos: datos as Json,
        carrera,
        esperado: esperado as Json,
        fuente: fu,
        linea: i + 1,
      });
    }
  });
  if (cabecera === undefined)
    errores.push(
      'No se ha encontrado ninguna tabla Markdown con las columnas de docs/CASOS_SERGIO_PLANTILLA.md.',
    );
  else if (casos.length === 0 && errores.length === 0)
    errores.push('La tabla no tiene ningún caso (solo la cabecera).');
  return { casos, errores };
}

/** Entrada de la fachada para un caso. Lanza `Error` con un mensaje claro si falta un dato. */
export function entradaDeCaso(
  caso: CasoSergio,
): Entrada | { tipo: 'mei'; anio: number; retribucionMensual: number } {
  const d = caso.datos;
  const need = (k: string): unknown => {
    if (d[k] === undefined)
      throw new Error(
        `caso «${caso.id}» (línea ${caso.linea}): falta «${k}» en «datos personales».`,
      );
    return d[k];
  };
  const opciones = d['opciones'] as Record<string, unknown> | undefined;
  const carrera = (Array.isArray(caso.carrera) ? caso.carrera : []) as never;
  switch (caso.tipo) {
    case 'jubilacion':
      return {
        tipo: 'jubilacion',
        carrera,
        nacimiento: need('nacimiento') as string,
        fechaJubilacion: caso.fecha,
        modalidad: (d['modalidad'] ?? 'ordinaria') as never,
        opciones: opciones as never,
      };
    case 'incapacidad-permanente':
      return {
        tipo: 'incapacidad-permanente',
        carrera,
        nacimiento: need('nacimiento') as string,
        fechaHechoCausante: caso.fecha,
        grado: need('grado') as never,
        origen: need('origen') as never,
        opciones: opciones as never,
      };
    case 'viudedad':
    case 'orfandad':
    case 'favor-familiares':
    case 'supervivencia': {
      const causante = {
        fechaFallecimiento: caso.fecha,
        causa: need('causa'),
        situacion: need('situacion'),
        carrera,
        ...(d['causante'] as Json | undefined),
      } as never;
      if (caso.tipo === 'viudedad')
        return {
          tipo: 'viudedad',
          causante,
          viudos: need('viudos') as never,
          opciones: opciones as never,
        };
      if (caso.tipo === 'orfandad')
        return {
          tipo: 'orfandad',
          causante,
          huerfanos: need('huerfanos') as never,
          opciones: opciones as never,
        };
      if (caso.tipo === 'favor-familiares')
        return {
          tipo: 'favor-familiares',
          causante,
          familiares: need('familiares') as never,
          opciones: opciones as never,
        };
      // Supervivencia conjunta: se ejecuta como viudedad+orfandad+familiares (ver ejecutarCaso).
      return {
        tipo: 'viudedad',
        causante,
        viudos: (d['viudos'] ?? []) as never,
        opciones: opciones as never,
      };
    }
    case 'pnc-jubilacion':
    case 'pnc-incapacidad': {
      const resto: Json = { ...d };
      delete resto['opciones'];
      return {
        tipo: caso.tipo,
        solicitante: { ...resto, fechaSolicitud: caso.fecha } as never,
        opciones: opciones as never,
      };
    }
    case 'mei': {
      const c = (caso.carrera ?? {}) as Json;
      return {
        tipo: 'mei',
        anio: Number(caso.fecha.slice(0, 4)),
        retribucionMensual: Number(c['retribucionMensual']),
      };
    }
  }
}

export interface ResultadoCaso {
  readonly ok: boolean;
  readonly mensajes: readonly string[];
  /**
   * Avisos que no hacen fallar el caso: con la marca `diferenciaConocida`, la diferencia con el
   * resultado esperado (el caso no coincide, pero se sabe por qué).
   */
  readonly advertencias?: readonly string[];
  /** `coincide`, `diferencia-conocida` (marca y no coincide) o `falla`. */
  readonly estado?: 'coincide' | 'diferencia-conocida' | 'falla';
}

/** Motivo de la clave opcional «diferenciaConocida» del resultado esperado, si la lleva. */
export function diferenciaConocida(esperado: Json): string | undefined {
  const d = esperado['diferenciaConocida'];
  return typeof d === 'string' && d.trim() !== '' ? d.trim() : undefined;
}

const tol = (e: Json): number => (typeof e['tolerancia'] === 'number' ? e['tolerancia'] : 0.01);

function comparar(
  nombre: string,
  real: number,
  esperado: unknown,
  tolerancia: number,
  mensajes: string[],
): void {
  if (typeof esperado !== 'number') return;
  if (Math.abs(real - esperado) > tolerancia)
    mensajes.push(
      `${nombre}: el motor da ${real.toFixed(4)} y el caso espera ${esperado} (tolerancia ${tolerancia}).`,
    );
}

/**
 * Ejecuta un caso con el motor y compara con el resultado esperado.
 *
 * Marca «diferenciaConocida» (texto con el motivo, dentro de «resultado esperado»): un caso con la
 * marca que no coincide da una advertencia y no falla; un caso con la marca que sí coincide FALLA,
 * para obligar a retirarla. Una marca nunca sustituye a un error de ejecución del motor distinto
 * de una diferencia de cifras: si el motor lanza una excepción, el caso falla igualmente.
 */
export function ejecutarCaso(caso: CasoSergio, leer: LeerDatos): ResultadoCaso {
  const r = ejecutarCasoSinMarca(caso, leer);
  const motivo = diferenciaConocida(caso.esperado);
  if (motivo === undefined) return { ...r, estado: r.ok ? 'coincide' : 'falla' };
  if (r.ok)
    return {
      ok: false,
      estado: 'falla',
      mensajes: [
        `el caso coincide con el motor y lleva la marca «diferenciaConocida» («${motivo}»): retire la marca de «resultado esperado».`,
      ],
    };
  return {
    ok: true,
    estado: 'diferencia-conocida',
    mensajes: [],
    advertencias: [`diferencia conocida (${motivo}): ${r.mensajes.join(' ')}`],
  };
}

function ejecutarCasoSinMarca(caso: CasoSergio, leer: LeerDatos): ResultadoCaso {
  const d = caso.datos;
  const cfg = (d['configuracion'] ?? {}) as ConfiguracionMotor;
  const motor: Motor = crearMotor(leer, cfg);
  const e = caso.esperado;
  const mensajes: string[] = [];
  const entrada = entradaDeCaso(caso);
  if (entrada.tipo === 'mei') {
    const r = motor.cotizacionAdicional({
      anio: entrada.anio,
      retribucionMensual: entrada.retribucionMensual,
    });
    if (!r.ok) return esperadoError(e, r.error.codigo, r.error.mensaje);
    comparar('cuotaTotal', r.detalle.cuotaTotal, e['cuotaTotal'], tol(e), mensajes);
    comparar('cuotaEmpresa', r.detalle.cuotaEmpresa, e['cuotaEmpresa'], tol(e), mensajes);
    comparar('cuotaTrabajador', r.detalle.cuotaTrabajador, e['cuotaTrabajador'], tol(e), mensajes);
    return { ok: mensajes.length === 0, mensajes };
  }
  let resultado;
  if (caso.tipo === 'supervivencia') {
    resultado = motor.supervivencia({
      causante: (entrada as Extract<Entrada, { tipo: 'viudedad' }>).causante,
      beneficiarios: {
        viudos: (d['viudos'] ?? []) as never,
        huerfanos: (d['huerfanos'] ?? []) as never,
        familiares: (d['familiares'] ?? []) as never,
      },
      opciones: d['opciones'] as never,
    });
  } else resultado = motor.calcular(entrada);
  if (!resultado.ok) return esperadoError(e, resultado.error.codigo, resultado.error.mensaje);
  if (typeof e['error'] === 'string')
    return {
      ok: false,
      mensajes: [`se esperaba el error ${e['error']} y el motor calculó una pensión.`],
    };
  if (typeof e['cumpleRequisitos'] === 'boolean') {
    const real = resultado.prestaciones.every((p) => p.cumpleRequisitos);
    if (real !== e['cumpleRequisitos'])
      mensajes.push(
        `cumpleRequisitos: el motor da ${String(real)} y el caso espera ${String(e['cumpleRequisitos'])}.`,
      );
  }
  const prestaciones: readonly PrestacionUnificada[] = resultado.prestaciones;
  if (Array.isArray(e['prestaciones'])) {
    for (const esp of e['prestaciones'] as Json[]) {
      const p = prestaciones.find(
        (x) => x.clase === esp['clase'] && x.indice === (esp['indice'] ?? 0),
      );
      if (p === undefined) {
        mensajes.push(
          `no hay prestación «${String(esp['clase'])}» con índice ${typeof esp['indice'] === 'number' ? esp['indice'] : 0} en el resultado.`,
        );
        continue;
      }
      comparar(
        `${p.clase}[${p.indice}].pensionMensual`,
        p.pensionMensual,
        esp['pensionMensual'],
        tol(e),
        mensajes,
      );
      comparar(
        `${p.clase}[${p.indice}].pensionAnual`,
        p.pensionAnual,
        esp['pensionAnual'],
        tol(e),
        mensajes,
      );
    }
  }
  comparar('pensionMensual', resultado.pensionMensualTotal, e['pensionMensual'], tol(e), mensajes);
  comparar('pensionAnual', resultado.pensionAnualTotal, e['pensionAnual'], tol(e), mensajes);
  return { ok: mensajes.length === 0, mensajes };
}

function esperadoError(e: Json, codigo: string, mensaje: string): ResultadoCaso {
  if (e['error'] === codigo) return { ok: true, mensajes: [] };
  return {
    ok: false,
    mensajes: [
      `el motor devuelve el error ${codigo}: ${mensaje}${typeof e['error'] === 'string' ? ` (se esperaba ${e['error']})` : ''}`,
    ],
  };
}
