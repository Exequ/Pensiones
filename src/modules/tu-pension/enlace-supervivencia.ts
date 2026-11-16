/**
 * Parte del enlace compartible de «Tu pensión» propia de la viudedad y la orfandad (Fase 3-C2).
 * Lógica pura. Los parámetros nuevos solo existen con `p=viu` o `p=orf`; el formato `v=1` y los
 * enlaces de jubilación y de incapacidad no cambian.
 *
 * | Parámetro | Contenido                                                                          |
 * | --------- | ---------------------------------------------------------------------------------- |
 * | `p`       | `viu` (viudedad) u `orf` (orfandad).                                               |
 * | `hc`      | Fecha del fallecimiento, `AAAA-MM`. `or`: causa de la muerte (`ec`, `anl`, `at`, `ep`). |
 * | `br`      | Base reguladora escrita (contingencia profesional o causante pensionista).         |
 * | `sit`     | Situación del causante: `alt` (en alta), `sin` (sin alta) o `pen` (pensionista).   |
 * | `pcl`, `pfe` | Causante pensionista: clase de su pensión (`jub` o `inc`) y su fecha, `AAAA-MM`. |
 * | `vin`     | Vínculo de la persona viuda: `con`, `par`, `exc` o `exp`.                          |
 * | `vnc`, `vsx`, `vhj` | Nacimiento (`AAAA-MM`), sexo (`h` o `m`) y número de hijos de la persona viuda. |
 * | `vmt`, `vcp`, `vea`, `vhc` | Cónyuge: matrimonio (`AAAA-MM`), meses de convivencia previa, enfermedad anterior y hijos comunes (`1` o `0`). |
 * | `vcv`, `vrg` | Pareja de hecho: meses de convivencia e inscripción (`AAAA-MM`).                |
 * | `vpc`, `vvg`, `vnv`, `vsa` | Excónyuge o expareja: compensatoria anual, violencia de género, nuevo vínculo y separación anterior a la DT 13.ª. |
 * | `vop`, `vdi`, `vho`, `vbo` | Otra pensión pública, discapacidad, hijo con orfandad y complemento por hijos en otra pensión (`1` o `0`). |
 * | `vrt`, `vrc`, `vre`, `vra` | Rentas del trabajo, del capital, rendimientos totales y del ejercicio anterior (euros al año). |
 * | `vcg`, `vcm`, `vcu` | Cargas familiares (`1` o `0`), miembros de la unidad y sus rendimientos.     |
 * | `hn`, `hi`, `hd`, `hrt`, `hre` | Huérfano: nacimiento, incapacitado, discapacidad, rentas del trabajo y rendimientos. |
 * | `oh`      | Otros huérfanos, `AAAA-MM:1` o `AAAA-MM:0` (incapacitado) separados por `~`.        |
 * | `hv`, `oa` | Orfandad: sobrevive una persona viuda con derecho; orfandad absoluta (`1` o `0`). |
 */
import {
  LIMITES_ENLACE,
  enteroValido,
  fechaATexto,
  fechaValida,
  numeroValido,
} from './enlace-validadores.ts';
import {
  nuevoHuerfano,
  type ClasePensionCausante,
  type FormularioHuerfano,
  type FormularioSupervivencia,
  type FormularioViudo,
  type QuienSupervivencia,
  type SituacionCausanteFormulario,
  type VinculoViudedad,
} from './supervivencia-tipos.ts';
import type { FormularioTuPension } from './tipos.ts';

/** Otros huérfanos que admite el enlace (límite de sensatez, no una regla de la norma). */
export const HUERFANOS_MAXIMO_ENLACE = 20;

const SEPARADOR_HUERFANOS = '~';

type ClaveDe<T, V> = { [K in keyof T]: T[K] extends V ? K : never }[keyof T];

interface CampoEnlace<T> {
  readonly clave: string;
  /** «la fecha de nacimiento», para el aviso de «se ha ignorado …». */
  readonly nombre: string;
  /** Solo se escribe si aplica al estado del formulario (el resto queda por defecto al leer). */
  readonly aplica?: (o: T) => boolean;
  escribir(o: T): string | undefined;
  leer(texto: string): Partial<T> | undefined;
}

const importeCero = (texto: string): number | undefined =>
  numeroValido(texto, 0, LIMITES_ENLACE.importeMaximo * 12);

function fecha<T>(
  clave: string,
  nombre: string,
  mes: ClaveDe<T, string>,
  anio: ClaveDe<T, string>,
  aplica?: (o: T) => boolean,
): CampoEnlace<T> {
  return {
    clave,
    nombre,
    ...(aplica ? { aplica } : {}),
    escribir: (o) => fechaATexto(String(o[mes]), String(o[anio])),
    leer: (texto) => {
      const f = fechaValida(texto);
      return f ? ({ [mes]: f.mes, [anio]: f.anio } as unknown as Partial<T>) : undefined;
    },
  };
}

function entero<T>(
  clave: string,
  nombre: string,
  k: ClaveDe<T, string>,
  maximo: number,
  aplica?: (o: T) => boolean,
): CampoEnlace<T> {
  return {
    clave,
    nombre,
    ...(aplica ? { aplica } : {}),
    escribir: (o) => {
      const t = String(o[k]).trim();
      return enteroValido(t, maximo) === undefined ? undefined : t;
    },
    leer: (texto) =>
      enteroValido(texto, maximo) === undefined
        ? undefined
        : ({ [k]: texto } as unknown as Partial<T>),
  };
}

function importe<T>(
  clave: string,
  nombre: string,
  k: ClaveDe<T, string>,
  aplica?: (o: T) => boolean,
): CampoEnlace<T> {
  return {
    clave,
    nombre,
    ...(aplica ? { aplica } : {}),
    escribir: (o) => {
      const t = String(o[k]).trim();
      return t !== '' && importeCero(t) !== undefined ? t : undefined;
    },
    leer: (texto) =>
      importeCero(texto) === undefined ? undefined : ({ [k]: texto } as unknown as Partial<T>),
  };
}

function booleano<T>(
  clave: string,
  nombre: string,
  k: ClaveDe<T, boolean>,
  aplica?: (o: T) => boolean,
): CampoEnlace<T> {
  return {
    clave,
    nombre,
    ...(aplica ? { aplica } : {}),
    escribir: (o) => (o[k] ? '1' : '0'),
    leer: (texto) =>
      texto === '1' || texto === '0'
        ? ({ [k]: texto === '1' } as unknown as Partial<T>)
        : undefined,
  };
}

function enumerado<T, V extends string>(
  clave: string,
  nombre: string,
  k: ClaveDe<T, V | ''>,
  codigos: Readonly<Record<V, string>>,
  aplica?: (o: T) => boolean,
): CampoEnlace<T> {
  const deCodigo = new Map(Object.entries(codigos).map(([v, c]) => [c as string, v as V]));
  return {
    clave,
    nombre,
    ...(aplica ? { aplica } : {}),
    escribir: (o) => {
      const v = o[k] as V | '';
      return v === '' ? undefined : codigos[v];
    },
    leer: (texto) => {
      const v = deCodigo.get(texto);
      return v === undefined ? undefined : ({ [k]: v } as unknown as Partial<T>);
    },
  };
}

const COD_VINCULO: Record<VinculoViudedad, string> = {
  conyuge: 'con',
  'pareja-hecho': 'par',
  excónyuge: 'exc',
  'expareja-hecho': 'exp',
};
const COD_SEXO = { hombre: 'h', mujer: 'm' } as const;
const COD_SITUACION: Record<SituacionCausanteFormulario, string> = {
  alta: 'alt',
  'sin-alta': 'sin',
  pensionista: 'pen',
};
const COD_CLASE: Record<ClasePensionCausante, string> = {
  jubilacion: 'jub',
  'incapacidad-permanente': 'inc',
};

const conyuge = (v: FormularioViudo): boolean => v.vinculo === 'conyuge';
const pareja = (v: FormularioViudo): boolean => v.vinculo === 'pareja-hecho';
const ex = (v: FormularioViudo): boolean =>
  v.vinculo === 'excónyuge' || v.vinculo === 'expareja-hecho';

const CAMPOS_VIUDO: readonly CampoEnlace<FormularioViudo>[] = [
  enumerado('vin', 'el vínculo', 'vinculo', COD_VINCULO),
  fecha('vnc', 'la fecha de nacimiento de la persona viuda', 'nacimientoMes', 'nacimientoAnio'),
  enumerado('vsx', 'el sexo de la persona viuda', 'sexo', COD_SEXO),
  entero('vhj', 'el número de hijos', 'hijos', LIMITES_ENLACE.hijosMaximo),
  fecha('vmt', 'la fecha del matrimonio', 'matrimonioMes', 'matrimonioAnio', conyuge),
  entero(
    'vcp',
    'los meses de convivencia previa',
    'convivenciaPreviaMeses',
    LIMITES_ENLACE.mesesMaximo,
    conyuge,
  ),
  booleano('vea', 'la enfermedad anterior al matrimonio', 'enfermedadAnterior', conyuge),
  booleano('vhc', 'los hijos en común', 'hijosComunes', (v) => conyuge(v) || pareja(v)),
  entero(
    'vcv',
    'los meses de convivencia de la pareja',
    'convivenciaMeses',
    LIMITES_ENLACE.mesesMaximo,
    pareja,
  ),
  fecha('vrg', 'la fecha de inscripción de la pareja', 'registroMes', 'registroAnio', pareja),
  importe('vpc', 'la pensión compensatoria', 'compensatoriaAnual', ex),
  booleano('vvg', 'la violencia de género', 'violenciaGenero', ex),
  booleano('vnv', 'el nuevo vínculo', 'nuevoVinculo', ex),
  booleano('vsa', 'la separación anterior', 'separacionAnterior', ex),
  booleano('vop', 'la otra pensión pública', 'otraPensionPublica'),
  booleano('vdi', 'la discapacidad', 'discapacidad65'),
  importe('vrt', 'las rentas del trabajo', 'rentasTrabajo'),
  importe('vrc', 'las rentas del capital', 'rentasCapital'),
  importe('vre', 'los rendimientos totales', 'rendimientos'),
  importe('vra', 'los rendimientos del ejercicio anterior', 'rendimientosAnterior'),
  booleano('vho', 'el hijo con derecho a orfandad', 'hijoConOrfandad', (v) => v.sexo === 'hombre'),
  booleano(
    'vbo',
    'el complemento por hijos en otra pensión',
    'brechaEnOtraPension',
    (v) => v.otraPensionPublica,
  ),
  booleano('vcg', 'las cargas familiares', 'cargas'),
  entero(
    'vcm',
    'los miembros de la unidad familiar',
    'miembros',
    LIMITES_ENLACE.hijosMaximo,
    (v) => v.cargas,
  ),
  importe('vcu', 'los rendimientos de la unidad familiar', 'rendimientosUnidad', (v) => v.cargas),
];

const CAMPOS_HUERFANO: readonly CampoEnlace<FormularioHuerfano>[] = [
  fecha('hn', 'la fecha de nacimiento del huérfano', 'nacimientoMes', 'nacimientoAnio'),
  booleano('hi', 'la incapacitación del huérfano', 'incapacitado'),
  booleano('hd', 'la discapacidad del huérfano', 'discapacidad65'),
  importe('hrt', 'las rentas del trabajo del huérfano', 'rentasTrabajo'),
  importe('hre', 'los rendimientos del huérfano', 'rendimientos'),
];

const CAMPOS_RAIZ: readonly CampoEnlace<FormularioSupervivencia>[] = [
  enumerado('sit', 'la situación de la persona fallecida', 'situacion', COD_SITUACION),
  {
    clave: 'pcl',
    nombre: 'la clase de pensión de la persona fallecida',
    aplica: (s) => s.situacion === 'pensionista',
    escribir: (s) => COD_CLASE[s.clasePension],
    leer: (texto) => {
      const clase = (Object.entries(COD_CLASE) as [ClasePensionCausante, string][]).find(
        ([, c]) => c === texto,
      )?.[0];
      return clase === undefined ? undefined : { clasePension: clase };
    },
  },
  fecha(
    'pfe',
    'la fecha de la pensión de la persona fallecida',
    'pensionMes',
    'pensionAnio',
    (s) => s.situacion === 'pensionista',
  ),
];

const CAMPOS_ORFANDAD: readonly CampoEnlace<FormularioSupervivencia>[] = [
  booleano('hv', 'si sobrevive una persona viuda con derecho', 'hayViudo'),
  booleano('oa', 'la orfandad absoluta', 'orfandadAbsoluta'),
];

/** Todos los parámetros de este módulo. */
export const CLAVES_SUPERVIVENCIA: readonly string[] = [
  ...CAMPOS_RAIZ.map((c) => c.clave),
  ...CAMPOS_VIUDO.map((c) => c.clave),
  ...CAMPOS_HUERFANO.map((c) => c.clave),
  ...CAMPOS_ORFANDAD.map((c) => c.clave),
  'oh',
];

function escribirCampos<T>(
  campos: readonly CampoEnlace<T>[],
  o: T,
  salida: [string, string][],
): void {
  for (const c of campos) {
    if (c.aplica && !c.aplica(o)) continue;
    const v = c.escribir(o);
    if (v !== undefined) salida.push([c.clave, v]);
  }
}

function huerfanoATexto(h: FormularioHuerfano): string | undefined {
  const f = fechaATexto(h.nacimientoMes, h.nacimientoAnio);
  return f === undefined ? undefined : `${f}:${h.incapacitado ? '1' : '0'}`;
}

/** Parámetros de supervivencia del enlace para un formulario de viudedad u orfandad. */
export function escribirSupervivencia(f: FormularioTuPension): [string, string][] {
  const sv = f.supervivencia;
  const orfandad = f.prestacion === 'orfandad';
  const salida: [string, string][] = [];
  escribirCampos(CAMPOS_RAIZ, sv, salida);
  if (orfandad) escribirCampos(CAMPOS_HUERFANO, sv.huerfano, salida);
  if (!orfandad || sv.hayViudo) escribirCampos(CAMPOS_VIUDO, sv.viudo, salida);
  if (orfandad) escribirCampos(CAMPOS_ORFANDAD, sv, salida);
  const otros = sv.otrosHuerfanos.flatMap((h) => {
    const t = huerfanoATexto(h);
    return t === undefined ? [] : [t];
  });
  if (otros.length > 0) {
    salida.push(['oh', otros.slice(0, HUERFANOS_MAXIMO_ENLACE).join(SEPARADOR_HUERFANOS)]);
  }
  return salida;
}

function leerCampos<T>(
  campos: readonly CampoEnlace<T>[],
  dato: (clave: string) => string | undefined,
  ignorar: (que: string, motivo: string) => void,
  base: T,
): T {
  let actual = base;
  for (const c of campos) {
    const texto = dato(c.clave);
    if (texto === undefined) continue;
    const cambio = c.leer(texto);
    if (cambio === undefined) ignorar(c.nombre, 'el valor no es válido o está fuera de rango');
    else actual = { ...actual, ...cambio };
  }
  return actual;
}

/** Aplica los parámetros de supervivencia del enlace sobre los valores por defecto. */
export function leerSupervivencia(
  dato: (clave: string) => string | undefined,
  ignorar: (que: string, motivo: string) => void,
  defecto: FormularioSupervivencia,
): FormularioSupervivencia {
  const ignorarParam = ignorar;
  let sv = leerCampos(CAMPOS_RAIZ, dato, ignorarParam, defecto);
  sv = leerCampos(CAMPOS_ORFANDAD, dato, ignorarParam, sv);
  sv = { ...sv, huerfano: leerCampos(CAMPOS_HUERFANO, dato, ignorarParam, sv.huerfano) };
  sv = { ...sv, viudo: leerCampos(CAMPOS_VIUDO, dato, ignorarParam, sv.viudo) };
  const oh = dato('oh');
  if (oh !== undefined && oh !== '') {
    const partes = oh.split(SEPARADOR_HUERFANOS);
    const otros: FormularioHuerfano[] = [];
    partes.forEach((parte, i) => {
      if (otros.length >= HUERFANOS_MAXIMO_ENLACE) return;
      const [nac = '', inc = '', ...resto] = parte.split(':');
      const f = fechaValida(nac);
      if (f === undefined || resto.length > 0 || (inc !== '1' && inc !== '0')) {
        ignorar(`el huérfano ${String(i + 1)}`, 'está mal formado o fuera de rango');
        return;
      }
      otros.push({
        ...nuevoHuerfano(),
        nacimientoMes: f.mes,
        nacimientoAnio: f.anio,
        incapacitado: inc === '1',
      });
    });
    if (partes.length > HUERFANOS_MAXIMO_ENLACE) {
      ignorar(
        `los huérfanos a partir del ${String(HUERFANOS_MAXIMO_ENLACE + 1)}`,
        'el enlace admite un número limitado de huérfanos',
      );
    }
    sv = { ...sv, otrosHuerfanos: otros };
  }
  return sv;
}

export type { QuienSupervivencia };
