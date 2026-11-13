/**
 * Enlace compartible de «Tu pensión» (Fase 3-B2). Lógica pura, sin React ni DOM.
 *
 * La web usa HashRouter: el estado de la simulación va en los parámetros de la parte de hash de la
 * URL (`#/tu-pension?v=1&nac=1961-11&…`), nunca en el servidor: todo es local y el enlace es la única
 * forma de compartir. El formato está versionado (`v=1`) y es legible a ojo:
 *
 * | Parámetro | Contenido                                                                 |
 * | --------- | ------------------------------------------------------------------------- |
 * | `v`       | Versión del formato (`1`). Obligatorio.                                   |
 * | `nac`     | Nacimiento, `AAAA-MM`.                                                    |
 * | `jub`     | Jubilación, `AAAA-MM`.                                                    |
 * | `sex`     | `h` (hombre) o `m` (mujer). `hij`: número de hijos (solo con `m`).        |
 * | `car`     | Tipo de carrera: `s` (simple) o `t` (tramos).                             |
 * | `ini`     | Inicio de la cotización de la carrera simple, `AAAA-MM`.                  |
 * | `lag`     | Meses sin cotizar de la carrera simple. `ubi`: `m` (mitad) o `f` (final). |
 * | `base`    | Base mensual de la carrera simple, tal como se escribió (`2500`, `2286,22`). |
 * | `tr`      | Tramos separados por `~`; cada uno, `desde:hasta:base` con fechas `AAAA-MM` y la base como importe o `min`, `med`, `max`. |
 * | `med`     | Definición de la «base media» (id del catálogo de referencias).           |
 * | `pe`      | Persona-ejemplo cargada (id de `data/ejemplos/personas.json`).            |
 * | `min`, `max` | Complemento a mínimos y límite de pensión máxima: `1` aplicar, `0` no. |
 * | `ipc`     | IPC anual supuesto en %, tal como se escribió (vacío: sin escenario).     |
 * | `lec`     | Lecturas cambiadas, `id:valor` separadas por comas.                       |
 * | `p`       | Prestación (Fase 3-C1): `inc` (incapacidad permanente). Sin `p`: jubilación; el enlace de jubilación no cambia. |
 * | `hc`      | Solo incapacidad: fecha del hecho causante, `AAAA-MM` (en jubilación se usa `jub`). |
 * | `gr`      | Solo incapacidad: grado, `par`, `tot`, `abs` o `gin`.                     |
 * | `or`      | Solo incapacidad: origen, `ec` (enfermedad común) o `anl` (accidente no laboral). |
 * | `alt`, `trb` | Solo incapacidad: en alta y trabaja tras el reconocimiento (`1` o `0`). |
 *
 * Al leer un enlace todo se valida: lo que no es válido (fechas o números fuera de rango, lecturas o
 * valores que no están en el registro, ids desconocidos, tramos mal formados) se **ignora** y se
 * devuelve un aviso que dice qué se ha ignorado; la página no falla. Un enlace sin versión o de una
 * versión desconocida se descarta entero (valores por defecto y aviso).
 *
 * Al escribir un enlace se omite lo que no es válido o está incompleto (un tramo a medias, un año de
 * tres cifras): no se puede calcular y así el enlace propio nunca produce avisos.
 */
import { lecturasOfrecidas, normalizarEleccion } from '../../engine/comparar-lecturas.ts';
import type { GradoIncapacidad, OrigenIncapacidad } from '../../engine/incapacidad/tipos.ts';
import { esOrigenDisponible } from './incapacidad-mapeador.ts';
import { leerEntero, leerNumero } from './lectura.ts';
import type { FormularioTuPension, IdPrestacion } from './tipos.ts';
import { nuevoIdTramo, type ReferenciaTramo, type TramoFormulario } from './tramos.ts';

export const VERSION_ENLACE = '1';

/**
 * Límites de sensatez para aceptar valores de un enlace. No son reglas de la norma (eso es del
 * motor): solo descartan valores absurdos o maliciosos antes de ponerlos en el formulario.
 */
export const LIMITES_ENLACE = {
  anioMinimo: 1900,
  anioMaximo: 2100,
  hijosMaximo: 30,
  mesesMaximo: 1200,
  importeMaximo: 1_000_000,
  ipcMinimo: -20,
  ipcMaximo: 50,
  /** Tramos que admite el enlace; con más, la web avisa y el enlace los omite. */
  tramosMaximo: 100,
  /** Longitud máxima de la parte de búsqueda que se lee (protege de enlaces enormes). */
  longitudMaxima: 12_000,
} as const;

/** Referencias que el enlace conoce (ids del catálogo y de las personas). */
export interface ContextoEnlace {
  /** Formulario con los valores por defecto de la página. */
  readonly defecto: FormularioTuPension;
  readonly definicionesMedia: readonly string[];
  readonly personas: readonly string[];
}

export interface ResultadoEnlace {
  /** Valores por defecto sobrescritos por los del enlace que son válidos. */
  readonly formulario: FormularioTuPension;
  readonly personaId: string | undefined;
  /** Qué se ha ignorado y por qué (vacío si todo era válido). */
  readonly avisos: readonly string[];
  /** `false` si el enlace entero se descartó (sin versión o versión desconocida). */
  readonly aplicado: boolean;
}

const PARAMETROS = [
  'v',
  'nac',
  'jub',
  'sex',
  'hij',
  'car',
  'ini',
  'lag',
  'ubi',
  'base',
  'tr',
  'med',
  'pe',
  'min',
  'max',
  'ipc',
  'lec',
  'p',
  'hc',
  'gr',
  'or',
  'alt',
  'trb',
] as const;

/** Parámetros que solo existen en el enlace de la incapacidad permanente. */
const SOLO_INCAPACIDAD = ['hc', 'gr', 'or', 'alt', 'trb'] as const;
/** Código de cada prestación en `p` (la jubilación no lo escribe: es la ausencia de `p`). */
const CODIGO_PRESTACION: Record<Exclude<IdPrestacion, 'jubilacion'>, string> = {
  incapacidad: 'inc',
};
const CODIGO_GRADO: Record<GradoIncapacidad, string> = {
  parcial: 'par',
  total: 'tot',
  absoluta: 'abs',
  'gran-incapacidad': 'gin',
};
const CODIGO_ORIGEN: Partial<Record<OrigenIncapacidad, string>> = {
  'enfermedad-comun': 'ec',
  'accidente-no-laboral': 'anl',
};
const invertir = <T extends string>(r: Partial<Record<T, string>>): Map<string, T> =>
  new Map(Object.entries(r).map(([k, v]) => [v as string, k as T]));
const GRADO_DE_CODIGO = invertir<GradoIncapacidad>(CODIGO_GRADO);
const ORIGEN_DE_CODIGO = invertir<OrigenIncapacidad>(CODIGO_ORIGEN);

const SEPARADOR_TRAMOS = '~';
const SEPARADOR_CAMPOS = ':';
const REFERENCIAS_ENLACE = { min: 'minima', med: 'media', max: 'maxima' } as const;
const CODIGO_REFERENCIA = { minima: 'min', media: 'med', maxima: 'max' } as const;

const dos = (n: number): string => String(n).padStart(2, '0');

// --- Validadores de un campo (devuelven el texto canónico o `undefined`) ---------------------------

function anioValido(texto: string): number | undefined {
  if (!/^\d{4}$/.test(texto)) return undefined;
  const n = Number(texto);
  return n >= LIMITES_ENLACE.anioMinimo && n <= LIMITES_ENLACE.anioMaximo ? n : undefined;
}

function mesValido(texto: string): number | undefined {
  if (!/^\d{1,2}$/.test(texto)) return undefined;
  const n = Number(texto);
  return n >= 1 && n <= 12 ? n : undefined;
}

/** Texto numérico escrito por una persona, con solo cifras, puntos y comas (y signo opcional). */
function numeroValido(texto: string, minimo: number, maximo: number): number | undefined {
  if (!/^[-+]?[0-9.,]+$/.test(texto)) return undefined;
  const n = leerNumero(texto);
  return n !== undefined && n >= minimo && n <= maximo ? n : undefined;
}

function enteroValido(texto: string, maximo: number): number | undefined {
  if (!/^\d+$/.test(texto)) return undefined;
  const n = leerEntero(texto);
  return n !== undefined && n >= 0 && n <= maximo ? n : undefined;
}

/** `AAAA-MM` → mes y año como los guardan los selectores (mes sin ceros a la izquierda). */
function fechaValida(texto: string): { mes: string; anio: string } | undefined {
  const m = /^(\d{4})-(\d{1,2})$/.exec(texto);
  if (!m?.[1] || !m[2]) return undefined;
  const anio = anioValido(m[1]);
  const mes = mesValido(m[2]);
  return anio === undefined || mes === undefined ? undefined : { mes: String(mes), anio: m[1] };
}

const importeValido = (texto: string): number | undefined =>
  numeroValido(texto, Number.MIN_VALUE, LIMITES_ENLACE.importeMaximo);

// --- Escritura ---------------------------------------------------------------------------------------

const fechaATexto = (mes: string, anio: string): string | undefined => {
  const m = mesValido(mes.trim());
  return m !== undefined && anioValido(anio.trim()) !== undefined
    ? `${anio.trim()}-${dos(m)}`
    : undefined;
};

function tramoATexto(t: TramoFormulario): string | undefined {
  const desde = fechaATexto(t.desdeMes, t.desdeAnio);
  const hasta = fechaATexto(t.hastaMes, t.hastaAnio);
  if (desde === undefined || hasta === undefined) return undefined;
  if (t.referencia !== 'importe') {
    return [desde, hasta, CODIGO_REFERENCIA[t.referencia]].join(SEPARADOR_CAMPOS);
  }
  const importe = t.importe.trim();
  return importeValido(importe) === undefined
    ? undefined
    : [desde, hasta, importe].join(SEPARADOR_CAMPOS);
}

/** Tramos que se escribirán en el enlace (los completos) y cuántos no caben por el límite. */
export function tramosParaEnlace(tramos: readonly TramoFormulario[]): {
  readonly escritos: readonly string[];
  readonly omitidosPorLimite: number;
} {
  const completos = tramos.flatMap((t) => {
    const texto = tramoATexto(t);
    return texto === undefined ? [] : [texto];
  });
  return {
    escritos: completos.slice(0, LIMITES_ENLACE.tramosMaximo),
    omitidosPorLimite: Math.max(0, completos.length - LIMITES_ENLACE.tramosMaximo),
  };
}

const codificar = (texto: string): string =>
  encodeURIComponent(texto).replace(/%2C/gi, ',').replace(/%3A/gi, ':');

/**
 * Parte de búsqueda del enlace (`?v=1&…`) para un formulario. Solo escribe lo válido; lo vacío se
 * omite salvo el IPC, donde «vacío» significa «sin escenario» y se escribe `ipc=`.
 */
export function escribirEnlace(f: FormularioTuPension, personaId?: string): string {
  const partes: [string, string][] = [['v', VERSION_ENLACE]];
  const poner = (clave: string, valor: string | undefined): void => {
    if (valor !== undefined) partes.push([clave, valor]);
  };
  const incapacidad = f.prestacion === 'incapacidad';
  if (incapacidad) poner('p', CODIGO_PRESTACION.incapacidad);
  poner('nac', fechaATexto(f.nacimientoMes, f.nacimientoAnio));
  // La fecha en que termina la carrera: jubilación (`jub`) o hecho causante (`hc`).
  poner(incapacidad ? 'hc' : 'jub', fechaATexto(f.jubilacionMes, f.jubilacionAnio));
  if (incapacidad) {
    if (f.grado !== '') poner('gr', CODIGO_GRADO[f.grado]);
    if (f.origen !== '') poner('or', CODIGO_ORIGEN[f.origen]);
    poner('alt', f.enAlta ? '1' : '0');
    poner('trb', f.trabaja ? '1' : '0');
  }
  if (f.sexo !== '') poner('sex', f.sexo === 'mujer' ? 'm' : 'h');
  if (
    f.sexo === 'mujer' &&
    enteroValido(f.hijos.trim(), LIMITES_ENLACE.hijosMaximo) !== undefined
  ) {
    poner('hij', f.hijos.trim());
  }
  poner('car', f.tipoCarrera === 'tramos' ? 't' : 's');
  poner('ini', fechaATexto(f.inicioMes, f.inicioAnio));
  if (enteroValido(f.mesesSinCotizar.trim(), LIMITES_ENLACE.mesesMaximo) !== undefined) {
    poner('lag', f.mesesSinCotizar.trim());
  }
  poner('ubi', f.ubicacionLagunas === 'final' ? 'f' : 'm');
  if (importeValido(f.baseMensual.trim()) !== undefined) poner('base', f.baseMensual.trim());
  const { escritos } = tramosParaEnlace(f.tramos);
  if (escritos.length > 0) poner('tr', escritos.join(SEPARADOR_TRAMOS));
  poner('med', codificar(f.definicionMedia));
  if (personaId !== undefined && personaId !== '') poner('pe', codificar(personaId));
  poner('min', f.aplicarMinimos ? '1' : '0');
  poner('max', f.aplicarPensionMaxima ? '1' : '0');
  const ipc = f.ipcSupuesto.trim();
  if (ipc === '') poner('ipc', '');
  else if (numeroValido(ipc, LIMITES_ENLACE.ipcMinimo, LIMITES_ENLACE.ipcMaximo) !== undefined) {
    poner('ipc', ipc);
  }
  const lecturas = Object.entries(
    normalizarEleccion(f.lecturas, incapacidad ? 'incapacidad' : 'jubilacion'),
  );
  if (lecturas.length > 0) {
    poner('lec', lecturas.map(([id, valor]) => `${id}${SEPARADOR_CAMPOS}${valor}`).join(','));
  }
  return `?${partes.map(([k, v]) => `${k}=${v}`).join('&')}`;
}

// --- Lectura -----------------------------------------------------------------------------------------

type Cambios = { -readonly [K in keyof FormularioTuPension]?: FormularioTuPension[K] };

/**
 * Lee la parte de búsqueda de la URL (`?v=1&…`, con o sin el `?`). Devuelve `undefined` si no hay
 * parámetros (la página sin enlace); si los hay, siempre un resultado: nunca lanza.
 */
export function leerEnlace(search: string, contexto: ContextoEnlace): ResultadoEnlace | undefined {
  const texto = search.startsWith('?') ? search.slice(1) : search;
  if (texto.trim() === '') return undefined;
  const defecto = contexto.defecto;
  const descartado = (aviso: string): ResultadoEnlace => ({
    formulario: defecto,
    personaId: undefined,
    avisos: [aviso],
    aplicado: false,
  });
  if (texto.length > LIMITES_ENLACE.longitudMaxima) {
    return descartado(
      'El enlace es demasiado largo para leerlo y se ha ignorado entero: se muestran los valores por defecto.',
    );
  }
  let parametros: URLSearchParams;
  try {
    parametros = new URLSearchParams(texto);
  } catch {
    return descartado(
      'El enlace está mal formado y se ha ignorado entero: se muestran los valores por defecto.',
    );
  }
  const version = parametros.get('v');
  if (version === null) {
    return descartado(
      'El enlace no indica la versión del formato y se ha ignorado entero: se muestran los valores por defecto.',
    );
  }
  if (version !== VERSION_ENLACE) {
    return descartado(
      `El enlace es de una versión del formato que esta página no conoce («${version}») y se ha ignorado entero: se muestran los valores por defecto.`,
    );
  }

  const avisos: string[] = [];
  const cambios: Cambios = {};
  const ignorar = (que: string, motivo: string): void => {
    avisos.push(`Se ha ignorado ${que} del enlace: ${motivo}.`);
  };
  // Prestación: sin `p` es la jubilación (los enlaces anteriores a la Fase 3-C1 no lo llevan).
  let prestacion: IdPrestacion = 'jubilacion';
  const codigoPrestacion = parametros.get('p');
  if (codigoPrestacion !== null) {
    if (codigoPrestacion === CODIGO_PRESTACION.incapacidad) prestacion = 'incapacidad';
    else
      ignorar(
        'la prestación',
        `«${codigoPrestacion}» no es una prestación que esta página calcule`,
      );
  }
  cambios.prestacion = prestacion;
  const incapacidad = prestacion === 'incapacidad';
  const repetidos = new Set<string>();
  for (const clave of parametros.keys()) {
    if (!(PARAMETROS as readonly string[]).includes(clave)) {
      ignorar(`el parámetro «${clave}»`, 'no existe en este formato');
    } else if (!incapacidad && (SOLO_INCAPACIDAD as readonly string[]).includes(clave)) {
      ignorar(`el parámetro «${clave}»`, 'solo existe en los enlaces de la incapacidad permanente');
    } else if (incapacidad && clave === 'jub') {
      ignorar(
        'el parámetro «jub»',
        'en la incapacidad permanente la fecha es la del hecho causante («hc»)',
      );
    } else if (parametros.getAll(clave).length > 1 && !repetidos.has(clave)) {
      repetidos.add(clave);
      ignorar(`las repeticiones del parámetro «${clave}»`, 'solo se usa el primer valor');
    }
  }
  const dato = (clave: string): string | undefined => parametros.get(clave) ?? undefined;

  const fecha = (
    clave: string,
    nombre: string,
    poner: (f: { mes: string; anio: string }) => void,
  ): void => {
    const valor = dato(clave);
    if (valor === undefined) return;
    const f = fechaValida(valor);
    if (f === undefined) ignorar(`la fecha de ${nombre}`, 'no es un mes y un año válidos');
    else poner(f);
  };
  fecha('nac', 'nacimiento', (f) => {
    cambios.nacimientoMes = f.mes;
    cambios.nacimientoAnio = f.anio;
  });
  fecha(incapacidad ? 'hc' : 'jub', incapacidad ? 'hecho causante' : 'jubilación', (f) => {
    cambios.jubilacionMes = f.mes;
    cambios.jubilacionAnio = f.anio;
  });
  if (incapacidad) {
    const grado = dato('gr');
    if (grado !== undefined) {
      const g = GRADO_DE_CODIGO.get(grado);
      if (g === undefined) ignorar('el grado de incapacidad', 'el valor no es válido');
      else cambios.grado = g;
    }
    const origen = dato('or');
    if (origen !== undefined) {
      const o = ORIGEN_DE_CODIGO.get(origen);
      if (o === undefined || !esOrigenDisponible(o)) {
        ignorar('el origen de la incapacidad', 'el valor no es válido o no está disponible');
      } else cambios.origen = o;
    }
    for (const [clave, nombre, campo] of [
      ['alt', 'la opción de estar en alta', 'enAlta'],
      ['trb', 'la opción de trabajar', 'trabaja'],
    ] as const) {
      const valor = dato(clave);
      if (valor === undefined) continue;
      if (valor === '1') cambios[campo] = true;
      else if (valor === '0') cambios[campo] = false;
      else ignorar(nombre, 'el valor no es válido');
    }
  }
  fecha('ini', 'inicio de la cotización', (f) => {
    cambios.inicioMes = f.mes;
    cambios.inicioAnio = f.anio;
  });

  const sexo = dato('sex');
  if (sexo !== undefined) {
    if (sexo === 'h') cambios.sexo = 'hombre';
    else if (sexo === 'm') cambios.sexo = 'mujer';
    else ignorar('el sexo', 'el valor no es válido');
  }
  const hijos = dato('hij');
  if (hijos !== undefined) {
    if (enteroValido(hijos, LIMITES_ENLACE.hijosMaximo) === undefined) {
      ignorar('el número de hijos', 'no es un entero en el rango admitido');
    } else cambios.hijos = hijos;
  }
  const carrera = dato('car');
  if (carrera !== undefined) {
    if (carrera === 's') cambios.tipoCarrera = 'simple';
    else if (carrera === 't') cambios.tipoCarrera = 'tramos';
    else ignorar('el tipo de carrera', 'el valor no es válido');
  }
  const lagunas = dato('lag');
  if (lagunas !== undefined) {
    if (enteroValido(lagunas, LIMITES_ENLACE.mesesMaximo) === undefined) {
      ignorar('los meses sin cotizar', 'no son un entero en el rango admitido');
    } else cambios.mesesSinCotizar = lagunas;
  }
  const ubicacion = dato('ubi');
  if (ubicacion !== undefined) {
    if (ubicacion === 'm') cambios.ubicacionLagunas = 'mitad';
    else if (ubicacion === 'f') cambios.ubicacionLagunas = 'final';
    else ignorar('la ubicación de los meses sin cotizar', 'el valor no es válido');
  }
  const base = dato('base');
  if (base !== undefined) {
    if (importeValido(base) === undefined) {
      ignorar('la base mensual', 'no es un importe válido dentro del rango admitido');
    } else cambios.baseMensual = base;
  }
  for (const [clave, nombre, campo] of [
    ['min', 'la opción del complemento a mínimos', 'aplicarMinimos'],
    ['max', 'la opción del límite de pensión máxima', 'aplicarPensionMaxima'],
  ] as const) {
    const valor = dato(clave);
    if (valor === undefined) continue;
    if (valor === '1') cambios[campo] = true;
    else if (valor === '0') cambios[campo] = false;
    else ignorar(nombre, 'el valor no es válido');
  }
  const ipc = dato('ipc');
  if (ipc !== undefined) {
    if (ipc === '') cambios.ipcSupuesto = '';
    else if (numeroValido(ipc, LIMITES_ENLACE.ipcMinimo, LIMITES_ENLACE.ipcMaximo) === undefined) {
      ignorar('el IPC supuesto', 'no es un número dentro del rango admitido');
    } else cambios.ipcSupuesto = ipc;
  }
  const media = dato('med');
  if (media !== undefined) {
    if (contexto.definicionesMedia.includes(media)) cambios.definicionMedia = media;
    else ignorar('la definición de la base media', `«${media}» no existe en el catálogo de datos`);
  }
  const persona = dato('pe');
  let personaId: string | undefined;
  if (persona !== undefined) {
    if (contexto.personas.includes(persona)) personaId = persona;
    else ignorar('la persona-ejemplo', `«${persona}» no existe en los datos`);
  }

  const tramos = dato('tr');
  if (tramos !== undefined && tramos !== '') {
    const partes = tramos.split(SEPARADOR_TRAMOS);
    const validos: TramoFormulario[] = [];
    partes.forEach((parte, i) => {
      if (validos.length >= LIMITES_ENLACE.tramosMaximo) return;
      const t = leerTramo(parte);
      if (t === undefined)
        ignorar(`el tramo ${String(i + 1)}`, 'está mal formado o fuera de rango');
      else validos.push(t);
    });
    if (partes.length > LIMITES_ENLACE.tramosMaximo) {
      ignorar(
        `los tramos a partir del ${String(LIMITES_ENLACE.tramosMaximo + 1)}`,
        'el enlace admite un número limitado de tramos',
      );
    }
    cambios.tramos = validos;
  }

  const lecturas = dato('lec');
  if (lecturas !== undefined && lecturas !== '') {
    const ofrecidas = new Map(
      lecturasOfrecidas(incapacidad ? 'incapacidad' : 'jubilacion').map((l) => [l.id, l]),
    );
    const elegidas: Record<string, string> = {};
    for (const par of lecturas.split(',')) {
      const corte = par.indexOf(SEPARADOR_CAMPOS);
      const id = corte < 0 ? par : par.slice(0, corte);
      const valor = corte < 0 ? '' : par.slice(corte + 1);
      const lectura = ofrecidas.get(id);
      if (corte < 0) ignorar(`la lectura «${par}»`, 'falta el valor elegido');
      else if (lectura === undefined) ignorar(`la lectura «${id}»`, 'no existe en el registro');
      else if (!lectura.alternativas.includes(valor)) {
        ignorar(`el valor «${valor}» de la lectura «${id}»`, 'no es una de sus alternativas');
      } else if (valor !== lectura.porDefecto) elegidas[id] = valor;
    }
    cambios.lecturas = elegidas;
  }

  return {
    formulario: { ...defecto, ...cambios, tramos: cambios.tramos ?? [] },
    personaId,
    avisos,
    aplicado: true,
  };
}

/** `desde:hasta:base` → tramo del formulario, o `undefined` si algo no es válido. */
function leerTramo(texto: string): TramoFormulario | undefined {
  const campos = texto.split(SEPARADOR_CAMPOS);
  if (campos.length !== 3) return undefined;
  const [d, h, b] = campos as [string, string, string];
  const desde = fechaValida(d);
  const hasta = fechaValida(h);
  if (desde === undefined || hasta === undefined) return undefined;
  const base = { id: nuevoIdTramo(), desdeMes: desde.mes, desdeAnio: desde.anio } as const;
  const comunes = { ...base, hastaMes: hasta.mes, hastaAnio: hasta.anio };
  if (b in REFERENCIAS_ENLACE) {
    const referencia: ReferenciaTramo = REFERENCIAS_ENLACE[b as keyof typeof REFERENCIAS_ENLACE];
    return { ...comunes, referencia, importe: '' };
  }
  if (importeValido(b) === undefined) return undefined;
  return { ...comunes, referencia: 'importe', importe: b };
}
