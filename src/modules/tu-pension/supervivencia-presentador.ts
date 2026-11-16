/**
 * Presentador de la viudedad y la orfandad (Fase 3-C2): resultado del motor → modelo de vista con
 * las cifras formateadas (es-ES). No calcula nada de la pensión: lee los pasos y los requisitos de
 * la fachada y los formatea con `src/engine/formato.ts`. Las cifras de reglas (porcentajes, plazos,
 * edades) se leen de /data con la referencia de cada paso del motor. Los textos no llevan cifras
 * propias (las referencias normativas son las del propio motor).
 */
import {
  formatearDuracion,
  formatearEuros,
  formatearNumero,
  formatearPorcentaje,
} from '../../engine/formato';
import type { Paso, Requisito } from '../../engine/jubilacion/tipos';
import type { ResultadoPrestacion } from '../../engine/supervivencia/tipos';
import type {
  Cifra,
  EstadoVista,
  FilaReparto,
  LeerReferencia,
  ModeloResultado,
  PasoVista,
  RepartoVista,
} from './presentador';
import type { ResultadoTuSupervivencia } from './supervivencia-ejecutor';
import type { FormularioTuPension } from './tipos';

export interface ContextoSupervivencia {
  readonly aplicarMinimos: boolean;
  readonly aplicarPensionMaxima: boolean;
  readonly leerReferencia: LeerReferencia;
}

const NOMBRE_CAUSA = {
  'enfermedad-comun': 'enfermedad común',
  'accidente-no-laboral': 'accidente no laboral',
  'accidente-trabajo': 'accidente de trabajo',
  'enfermedad-profesional': 'enfermedad profesional',
} as const;

const NOMBRE_PRESTACION = { viudedad: 'la viudedad', orfandad: 'la orfandad' } as const;

const TEXTO_ESTADO: Record<'viudedad' | 'orfandad', Record<EstadoVista, string>> = {
  viudedad: {
    contributiva:
      'Pensión de viudedad calculada con la base reguladora y el porcentaje que corresponde.',
    minima:
      'La pensión contributiva queda por debajo de la cuantía mínima: se añade el complemento a mínimos.',
    maxima: 'La pensión calculada supera el límite máximo: se aplica el límite.',
    'no-causa-derecho': 'Con estos datos no se cumplen los requisitos de la viudedad.',
  },
  orfandad: {
    contributiva:
      'Pensión de orfandad calculada con la base reguladora y el porcentaje que corresponde.',
    minima:
      'La pensión contributiva queda por debajo de la cuantía mínima: se añade el complemento a mínimos.',
    maxima: 'La pensión calculada supera el límite máximo: se aplica el límite.',
    'no-causa-derecho': 'Con estos datos no se cumplen los requisitos de la orfandad.',
  },
};

const euros = (v: number): string => formatearEuros(v, { decimales: 2 });
const eurosMes = (v: number): string => `${euros(v)} al mes`;
const porc = (v: number): string => formatearPorcentaje(v / 100, { decimales: 2 });

const paso = (pasos: readonly Paso[], id: string): Paso | undefined =>
  pasos.find((p) => p.id === id);
const numeroDe = (p: Paso | undefined): number | undefined =>
  typeof p?.valor === 'number' ? p.valor : undefined;

/** `«Suma 48000.00 euros entre 28; 0 meses sin cotizar a cero (ventana: …).»`. Formato fijado por un test. */
export function leerBaseCausante(
  p: Paso | undefined,
): { suma: number; divisor: number; lagunas: number } | undefined {
  const m = /^Suma ([\d.]+) euros entre ([\d.]+); (\d+) meses sin cotizar a cero/.exec(
    p?.detalle ?? '',
  );
  return m ? { suma: Number(m[1]), divisor: Number(m[2]), lagunas: Number(m[3]) } : undefined;
}

/** `«Base de la pensión 2500.00 euros/mes (2023-03-01) × revalorización acumulada 1.095680.»`. */
export function leerBasePensionista(
  p: Paso | undefined,
): { base: number; fecha: string; factor: number } | undefined {
  const m =
    /^Base de la pensión ([\d.]+) euros\/mes \((\d{4}-\d{2}-\d{2})\) × revalorización acumulada ([\d.]+)\.?$/.exec(
      p?.detalle ?? '',
    );
  return m ? { base: Number(m[1]), fecha: m[2] ?? '', factor: Number(m[3]) } : undefined;
}

/** `«Suma antes del límite 1200.00; después 1000.00 euros/mes (excepción del art. 229.3).»`. */
export function leerLimiteConjunto(
  p: Paso | undefined,
): { antes: number; despues: number; excepcion: boolean } | undefined {
  const m =
    /^Suma antes del límite ([\d.]+); después ([\d.]+) euros\/mes( \(excepción del art\. 229\.3\))?\.?$/.exec(
      p?.detalle ?? '',
    );
  return m
    ? { antes: Number(m[1]), despues: Number(m[2]), excepcion: m[3] !== undefined }
    : undefined;
}

function valorRequisito(r: Requisito, valor: number): string {
  if (r.unidad === 'indicador') return valor === 0 ? 'No' : 'Sí';
  if (r.unidad.startsWith('meses cotizados') || r.unidad === 'meses') {
    return formatearDuracion(Math.max(0, Math.round(valor)));
  }
  if (r.unidad === 'días') return `${formatearNumero(valor)} días`;
  if (r.unidad.startsWith('euros')) return euros(valor);
  return formatearNumero(valor);
}

const ref = (leer: LeerReferencia, id: string): number | undefined =>
  leer(`parametros/supervivencia-reglas.json#${id}`);

const REQUISITOS_PERIODO = ['carencia-alta', 'carencia-sin-alta', 'causante-pensionista'];

function pasoCausante(
  r: ResultadoTuSupervivencia,
  f: FormularioTuPension,
  ctx: ContextoSupervivencia,
): PasoVista {
  const d = r.detalle;
  const q = d.tu.requisitos.find((x) => REQUISITOS_PERIODO.includes(x.id));
  const parrafos: string[] = [];
  const ventana = ref(ctx.leerReferencia, 'carencia-alta-ventana-meses');
  if (q?.id === 'carencia-alta') {
    parrafos.push(
      `La persona fallecida estaba en alta o situación asimilada: se exigen ${valorRequisito(q, q.exigido)} cotizados dentro de los ${ventana === undefined ? 'años' : formatearDuracion(ventana)} anteriores al fallecimiento. Se acreditan ${valorRequisito(q, q.valor)} (${q.cumple ? 'se cumple' : 'no se cumple'}). Cómo se cuentan los días es una lectura abierta (véase «Supuestos y lecturas»).`,
    );
  } else if (q?.id === 'carencia-sin-alta') {
    parrafos.push(
      `La persona fallecida no estaba en alta: se exigen ${valorRequisito(q, q.exigido)} de cotización a lo largo de su vida laboral. Se acreditan ${valorRequisito(q, q.valor)} (${q.cumple ? 'se cumple' : 'no se cumple'}).`,
    );
  } else if (q?.id === 'causante-pensionista') {
    parrafos.push(
      'La persona fallecida era pensionista de jubilación o de incapacidad permanente: no se exige un periodo previo de cotización.',
    );
  } else if (f.origen !== '' && f.origen !== 'enfermedad-comun') {
    parrafos.push(
      `No se exige un periodo previo de cotización: la causa de la muerte, ${NOMBRE_CAUSA[f.origen]}, lo exime.`,
    );
  } else {
    parrafos.push(
      'Con la lectura elegida para la orfandad no se exige a la persona fallecida un periodo previo de cotización (véase «Supuestos y lecturas»).',
    );
  }
  return {
    id: 'causante',
    titulo: 'Periodo previo de la persona fallecida',
    parrafos,
    articulo: q?.articulo ?? (d.quien === 'orfandad' ? 'art. 224.1 TRLGSS' : 'art. 219.1 TRLGSS'),
  };
}

function pasoBase(
  r: ResultadoTuSupervivencia,
  f: FormularioTuPension,
  ctx: ContextoSupervivencia,
): PasoVista {
  const d = r.detalle;
  const p = paso(d.pasos, 'base-reguladora');
  const parrafos: string[] = [];
  const profesional = f.origen === 'accidente-trabajo' || f.origen === 'enfermedad-profesional';
  if (profesional) {
    parrafos.push(
      `En el ${NOMBRE_CAUSA[f.origen as 'accidente-trabajo']} la base reguladora se calcula con el salario real. Este simulador no la calcula: usa la que has introducido, ${eurosMes(d.baseReguladora)}, sin comprobarla.`,
    );
  } else if (f.supervivencia.situacion === 'pensionista') {
    const l = leerBasePensionista(p);
    parrafos.push(
      l
        ? `La base reguladora es la de la pensión de la persona fallecida (${eurosMes(l.base)}, hecho causante en ${l.fecha}) con las revalorizaciones generales de cada año posterior hasta el fallecimiento (factor acumulado ${formatearNumero(l.factor, { decimales: 6 })}): ${eurosMes(d.baseReguladora)}.`
        : `La base reguladora es la de la pensión de la persona fallecida, con las revalorizaciones posteriores: ${eurosMes(d.baseReguladora)}.`,
    );
  } else {
    const l = leerBaseCausante(p);
    const n = ref(ctx.leerReferencia, 'br-meses');
    const v = ref(ctx.leerReferencia, 'br-ventana-meses');
    parrafos.push(
      `Se eligen los ${n === undefined ? 'meses' : formatearDuracion(n)} ininterrumpidos que dan la base más favorable dentro de los ${v === undefined ? 'años' : formatearDuracion(v)} anteriores al mes previo al fallecimiento (hasta qué mes llega la ventana es una lectura abierta). Las bases van por su valor nominal.`,
    );
    if (l) {
      parrafos.push(
        `Suma de las bases elegidas: ${euros(l.suma)}, dividida entre ${formatearNumero(l.divisor, { decimales: 0 })}. ${l.lagunas === 0 ? 'Todos los meses del periodo elegido tienen base.' : `Hay ${formatearNumero(l.lagunas)} meses sin cotizar en el periodo elegido: cuentan como cero.`} Base reguladora: ${eurosMes(d.baseReguladora)}.`,
      );
    }
  }
  return {
    id: 'base',
    titulo: 'Base reguladora de la persona fallecida',
    parrafos,
    articulo: p?.articulo ?? 'art. 228 TRLGSS',
  };
}

function pasoPorcentaje(
  r: ResultadoTuSupervivencia,
  f: FormularioTuPension,
  ctx: ContextoSupervivencia,
): PasoVista {
  const d = r.detalle;
  const tu = d.tu;
  const pasos = tu.pasos;
  const p = paso(pasos, 'porcentaje');
  const pct = numeroDe(p);
  const parrafos: string[] = [];
  let articulo = p?.articulo ?? 'art. 31 Decreto 3158/1966';
  if (d.quien === 'orfandad') {
    parrafos.push(
      pct === undefined
        ? 'No se ha podido leer el porcentaje.'
        : `Cada huérfano con derecho recibe el ${porc(pct)} de la base reguladora.`,
    );
    const inc = paso(pasos, 'incremento-orfandad-absoluta');
    const incV = numeroDe(inc);
    if (incV !== undefined) {
      parrafos.push(
        `Orfandad absoluta: se añade ${porc(incV)} de la base reguladora, parte de este huérfano del incremento que se reparte a partes iguales entre los huérfanos con derecho; con viudedad reconocida el incremento es el porcentaje de viudedad no asignado.`,
      );
    }
  } else {
    const p52 = ref(ctx.leerReferencia, 'viudedad-pct');
    const p60 = ref(ctx.leerReferencia, 'viudedad-65-pct');
    const p70 = ref(ctx.leerReferencia, 'viudedad-cargas-pct');
    const reduccion = paso(pasos, 'reduccion-70');
    const cargas = paso(pasos, 'cargas-familiares');
    const temporal = paso(pasos, 'prestacion-temporal');
    if (pct === undefined) {
      parrafos.push('No se ha podido leer el porcentaje.');
    } else if (cargas !== undefined && reduccion === undefined) {
      parrafos.push(
        `Se cumplen las condiciones de las cargas familiares (renta por miembro de la unidad, pensión como principal fuente de ingresos y límite de rendimientos del ejercicio anterior): se aplica el ${porc(pct)} de la base reguladora.`,
      );
    } else if (reduccion !== undefined) {
      parrafos.push(
        `Con cargas familiares correspondería el ${p70 === undefined ? 'porcentaje de las cargas' : porc(p70)}, pero la pensión más los rendimientos del ejercicio anterior superan el límite que fija la norma: se reduce el porcentaje hasta ${porc(pct)} de la base reguladora (el suelo depende de una lectura abierta, véase «Supuestos y lecturas»).`,
      );
    } else if (p60 !== undefined && pct === p60) {
      parrafos.push(
        `Se cumplen las condiciones del ${porc(p60)}: edad de ${formatearDuracion(ref(ctx.leerReferencia, 'viudedad-65-edad-meses') ?? 0)} o más, sin otra pensión pública, sin rentas del trabajo y con rentas del capital por debajo del límite. Se aplica el ${porc(pct)} de la base reguladora, más favorable que el general.`,
      );
    } else {
      parrafos.push(
        `Corresponde el porcentaje general, el ${porc(pct)} de la base reguladora.${p52 !== undefined && pct !== p52 ? ' Esa cifra es la que queda tras repartir la pensión entre varios beneficiarios.' : ''}`,
      );
      if (f.supervivencia.viudo.cargas) {
        parrafos.push(
          'Se han comprobado las cargas familiares que has indicado y no se cumplen todas las condiciones de la norma para el porcentaje mayor.',
        );
      }
    }
    if (temporal !== undefined && typeof temporal.valor === 'number') {
      parrafos.push(
        `Es una prestación temporal de viudedad: la misma cuantía durante ${formatearDuracion(temporal.valor)}, sin complemento a mínimos y fuera del límite conjunto.`,
      );
      articulo = `${articulo}; art. 222 TRLGSS`;
    }
  }
  return { id: 'porcentaje', titulo: 'Porcentaje de la base reguladora', parrafos, articulo };
}

function pasoLimites(r: ResultadoTuSupervivencia, ctx: ContextoSupervivencia): PasoVista {
  const d = r.detalle;
  const pasos = d.tu.pasos;
  const parrafos: string[] = [];
  const maximo = numeroDe(paso(pasos, 'limite-maximo'));
  if (maximo !== undefined) {
    parrafos.push(
      `La pensión calculada supera el límite máximo de ${eurosMes(maximo)}: se aplica ese límite.`,
    );
  } else if (!ctx.aplicarPensionMaxima) {
    parrafos.push('No se ha aplicado el límite de pensión máxima (opción desactivada).');
  } else {
    parrafos.push('La pensión calculada no supera el límite de pensión máxima.');
  }
  const comp = paso(pasos, 'limite-compensatoria');
  if (comp !== undefined && typeof comp.valor === 'number') {
    parrafos.push(
      `Como persona separada o divorciada, la pensión no puede superar la pensión compensatoria que se extingue con la muerte: queda en ${eurosMes(comp.valor)} (la forma de compararlas es una lectura abierta).`,
    );
  }
  const global = leerLimiteConjunto(paso(d.pasos, 'limite-conjunto'));
  const limite = numeroDe(paso(d.pasos, 'limite-conjunto'));
  const escalado = paso(pasos, 'limite-conjunto');
  if (limite !== undefined) {
    if (global && global.antes - global.despues > 0.005) {
      parrafos.push(
        `La suma de las pensiones de muerte y supervivencia no puede superar la base reguladora, ${eurosMes(limite)}: la suma antes del límite era ${eurosMes(global.antes)} y queda en ${eurosMes(global.despues)}${global.excepcion ? ' (con la excepción de la norma para las orfandades cuando la viudedad supera el porcentaje general)' : ''}. Qué pensiones se reducen es una lectura abierta (véase «Supuestos y lecturas»).`,
      );
      if (escalado === undefined) {
        parrafos.push('La pensión de esta prestación no se reduce por ese límite.');
      }
    } else {
      parrafos.push(
        `La suma de las pensiones de muerte y supervivencia (${global ? eurosMes(global.despues) : 'las del mismo causante'}) no supera la base reguladora, ${eurosMes(limite)}: el límite conjunto no se aplica.`,
      );
    }
  }
  return {
    id: 'limites',
    titulo: 'Límites',
    parrafos,
    articulo: 'arts. 57 y 229 TRLGSS',
  };
}

function pasoComplementos(r: ResultadoTuSupervivencia, ctx: ContextoSupervivencia): PasoVista {
  const d = r.detalle;
  const pasos = d.tu.pasos;
  const parrafos: string[] = [];
  const minimos = numeroDe(paso(pasos, 'complemento-minimos'));
  if (minimos !== undefined) {
    parrafos.push(
      `La pensión queda por debajo de la cuantía mínima que corresponde: se añade un complemento a mínimos de ${eurosMes(minimos)}.`,
    );
  } else if (paso(pasos, 'minimos-limite-ingresos')) {
    parrafos.push('No hay complemento a mínimos porque las rentas superan el límite de ingresos.');
  } else if (d.tu.clase === 'prestacion-temporal-viudedad') {
    parrafos.push('La prestación temporal no lleva complemento a mínimos.');
  } else if (!ctx.aplicarMinimos) {
    parrafos.push('No se ha aplicado el complemento a mínimos (opción desactivada).');
  } else {
    parrafos.push(
      'La pensión alcanza la cuantía mínima que corresponde: no hay complemento a mínimos.',
    );
  }
  const brecha = numeroDe(paso(pasos, 'complemento-brecha'));
  if (brecha !== undefined) {
    parrafos.push(
      `Se suma el complemento por hijos, ${eurosMes(brecha)}, que no cuenta para el límite máximo.`,
    );
  }
  return {
    id: 'complementos',
    titulo: 'Complementos',
    parrafos,
    articulo: 'arts. 59 y 60 TRLGSS',
  };
}

function nombreFila(
  r: ResultadoTuSupervivencia,
  p: ResultadoPrestacion,
  orfandad: boolean,
): string {
  const quien = r.detalle.quien;
  if (!orfandad) {
    return quien === 'viudedad' && p.indice === 0
      ? 'Tu viudedad'
      : 'Viudedad del cónyuge o pareja superviviente';
  }
  if (quien === 'orfandad') {
    return p.indice === 0
      ? 'Tu orfandad'
      : `Orfandad de otro huérfano (n.º ${formatearNumero(p.indice)})`;
  }
  return `Orfandad de un hijo del causante (n.º ${formatearNumero(p.indice + 1)})`;
}

function reparto(r: ResultadoTuSupervivencia): RepartoVista | undefined {
  const d = r.detalle;
  const todas: { p: ResultadoPrestacion; orfandad: boolean }[] = [
    ...d.viudedad.map((p) => ({ p, orfandad: false })),
    ...d.orfandad.map((p) => ({ p, orfandad: true })),
  ];
  if (todas.length < 2) return undefined;
  const filas: FilaReparto[] = todas.map(({ p, orfandad }) => ({
    beneficiario: nombreFila(r, p, orfandad),
    porcentaje: p.cumpleRequisitos ? porc(p.porcentaje) : '—',
    pension: p.cumpleRequisitos ? eurosMes(p.pensionMensual) : 'Sin derecho',
    nota:
      p.clase === 'prestacion-temporal-viudedad'
        ? 'Prestación temporal'
        : p.cumpleRequisitos
          ? p.estado === 'minima'
            ? 'Con complemento a mínimos'
            : ''
          : 'No cumple los requisitos',
  }));
  return {
    titulo: 'Reparto entre los beneficiarios del mismo causante',
    intro:
      'El límite conjunto de las pensiones de muerte y supervivencia se aplica al conjunto de beneficiarios del mismo causante. Estas son las pensiones que el cálculo ha tenido en cuenta con los datos que has introducido; los importes son por paga.',
    filas,
  };
}

/** Modelo de vista del resultado de la viudedad o de la orfandad. */
export function presentarSupervivencia(
  r: ResultadoTuSupervivencia,
  f: FormularioTuPension,
  ctx: ContextoSupervivencia,
): ModeloResultado {
  const d = r.detalle;
  const tu = d.tu;
  const quien = d.quien;
  const cumple = tu.cumpleRequisitos;
  const temporal = tu.clase === 'prestacion-temporal-viudedad';
  const cifras: Cifra[] = [];
  if (cumple) {
    cifras.push(
      {
        etiqueta: temporal
          ? 'Prestación temporal mensual bruta (por paga)'
          : 'Pensión mensual bruta (por paga)',
        valor: euros(tu.pensionMensual),
      },
      {
        etiqueta: 'Pensión anual bruta',
        valor: euros(tu.pensionAnual),
        detalle: `${formatearNumero(tu.pagas)} pagas`,
      },
      { etiqueta: 'Porcentaje aplicado de la base reguladora', valor: porc(tu.porcentaje) },
    );
  }
  const origenBase =
    f.origen === 'accidente-trabajo' || f.origen === 'enfermedad-profesional'
      ? 'la que has introducido; el simulador no la calcula ni la comprueba'
      : f.supervivencia.situacion === 'pensionista'
        ? 'la de la pensión de la persona fallecida, revalorizada'
        : 'los meses más favorables de los últimos años de cotización de la persona fallecida';
  cifras.push({
    etiqueta: 'Base reguladora de la persona fallecida',
    valor: eurosMes(d.baseReguladora),
    detalle: origenBase,
  });
  if (cumple) {
    if (tu.pensionContributiva > 0 && (tu.complementoMinimos > 0 || tu.complementoBrecha > 0)) {
      cifras.push({
        etiqueta: 'Pensión contributiva (antes de los complementos, por paga)',
        valor: eurosMes(tu.pensionContributiva),
      });
    }
    if (tu.complementoMinimos > 0) {
      cifras.push({
        etiqueta: 'Complemento a mínimos (por paga)',
        valor: eurosMes(tu.complementoMinimos),
      });
    }
    if (tu.complementoBrecha > 0) {
      cifras.push({
        etiqueta: 'Complemento por hijos (por paga)',
        valor: eurosMes(tu.complementoBrecha),
      });
    }
    if (tu.duracionMeses !== undefined) {
      cifras.push({
        etiqueta: 'Duración de la prestación temporal',
        valor: formatearDuracion(tu.duracionMeses),
      });
    }
  }
  cifras.push({
    etiqueta: 'Límite conjunto de las pensiones del mismo causante',
    valor: eurosMes(d.limiteConjunto),
    detalle: `suma sujeta al límite: ${eurosMes(d.sumaSujetaAlLimite)}`,
  });
  cifras.push({ etiqueta: 'Edad en el fallecimiento', valor: formatearDuracion(tu.edadMeses) });

  const pasosVista: PasoVista[] = [pasoCausante(r, f, ctx), pasoBase(r, f, ctx)];
  if (cumple) {
    pasosVista.push(pasoPorcentaje(r, f, ctx), pasoLimites(r, ctx), pasoComplementos(r, ctx), {
      id: 'resultado',
      titulo: 'Pensión inicial',
      parrafos: [
        `${eurosMes(tu.pensionMensual)} en cada una de las ${formatearNumero(tu.pagas)} pagas, es decir, ${euros(tu.pensionAnual)} al año, en euros del año del fallecimiento.`,
      ],
      articulo: 'arts. 219 a 229 TRLGSS',
    });
  }
  const estado: EstadoVista = tu.estado;
  const repartoVista = reparto(r);
  return {
    cumpleRequisitos: cumple,
    estado,
    textoEstado: temporal
      ? 'Prestación temporal de viudedad: la misma cuantía que la pensión, con duración limitada.'
      : TEXTO_ESTADO[quien][estado],
    cifras,
    requisitos: tu.requisitos.map((q) => ({
      descripcion: q.descripcion,
      acreditado: valorRequisito(q, q.valor),
      exigido: valorRequisito(q, q.exigido),
      cumple: q.cumple,
      articulo: q.articulo,
    })),
    pasos: pasosVista,
    avisos: r.avisos,
    anioNormativa: String(r.anioNormativa),
    momentoNormativa: 'del fallecimiento',
    tituloRequisitos: `Requisitos de ${NOMBRE_PRESTACION[quien]}`,
    ...(repartoVista === undefined ? {} : { reparto: repartoVista }),
  };
}
