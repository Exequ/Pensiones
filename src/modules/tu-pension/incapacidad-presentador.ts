/**
 * Presentador de la incapacidad permanente (Fase 3-C1): resultado del motor → modelo de vista con
 * las cifras formateadas (es-ES). No calcula nada de la pensión: lee los pasos y los requisitos de
 * la fachada y los formatea con `src/engine/formato.ts`. Las cifras de reglas se leen de /data con
 * la referencia que cada paso del motor ya trae. Los textos no llevan cifras propias.
 */
import type { ResultadoOk } from '../../engine/fachada';
import {
  formatearDuracion,
  formatearEuros,
  formatearNumero,
  formatearPorcentaje,
} from '../../engine/formato';
import type { Paso, Requisito } from '../../engine/jubilacion/tipos';
import type { EstadoVista, LeerReferencia, ModeloResultado, PasoVista, Cifra } from './presentador';

export interface ContextoIncapacidad {
  readonly aplicarMinimos: boolean;
  readonly aplicarPensionMaxima: boolean;
  readonly leerReferencia: LeerReferencia;
}

const TEXTO_ESTADO: Record<EstadoVista, string> = {
  contributiva:
    'Prestación contributiva calculada con la base reguladora y el porcentaje del grado.',
  minima:
    'La pensión calculada queda por debajo de la cuantía mínima que corresponde: se aplica la cuantía mínima.',
  maxima: 'La pensión calculada supera el límite máximo: se aplica el límite.',
  'no-causa-derecho':
    'Con estos datos no se cumplen los requisitos de la incapacidad permanente que el simulador comprueba.',
};

const NOMBRE_GRADO = {
  parcial: 'parcial',
  total: 'total',
  absoluta: 'absoluta',
  'gran-incapacidad': 'gran incapacidad',
} as const;

const NOMBRE_ORIGEN = {
  'enfermedad-comun': 'enfermedad común',
  'accidente-no-laboral': 'accidente no laboral',
  'accidente-trabajo': 'accidente de trabajo',
  'enfermedad-profesional': 'enfermedad profesional',
} as const;

const euros = (v: number): string => formatearEuros(v, { decimales: 2 });
const eurosMes = (v: number): string => `${euros(v)} al mes`;
const porc = (v: number): string => formatearPorcentaje(v / 100, { decimales: 2 });

const paso = (pasos: readonly Paso[], id: string): Paso | undefined =>
  pasos.find((p) => p.id === id);
const numeroDe = (p: Paso | undefined): number | undefined =>
  typeof p?.valor === 'number' ? p.valor : undefined;

/** `«96 bases entre 112.0000; 0 lagunas integradas.»` → sus tres números. Formato fijado por un test. */
export function leerBasesIncapacidad(
  p: Paso | undefined,
): { bases: number; divisor: number; lagunas: number } | undefined {
  const m = /^(\d+) bases entre ([\d.]+); (\d+) lagunas integradas\.?$/.exec(p?.detalle ?? '');
  return m ? { bases: Number(m[1]), divisor: Number(m[2]), lagunas: Number(m[3]) } : undefined;
}

/** `«Suma 48000.00 euros; 0 meses sin cotización en el periodo elegido.»`. */
export function leerPeriodoElegido(
  p: Paso | undefined,
): { suma: number; lagunas: number } | undefined {
  const m = /^Suma ([\d.]+) euros; (\d+) meses sin cotización en el periodo elegido\.?$/.exec(
    p?.detalle ?? '',
  );
  return m ? { suma: Number(m[1]), lagunas: Number(m[2]) } : undefined;
}

/** `«Edad ordinaria tomada: 802 meses (carrera-proyectada); cómputo: meses.»`. */
export function leerEdadFiccion(p: Paso | undefined): number | undefined {
  const m = /^Edad ordinaria tomada: (\d+) meses/.exec(p?.detalle ?? '');
  return m ? Number(m[1]) : undefined;
}

/** `«418 meses computados.»`. */
export function leerMesesComputados(p: Paso | undefined): number | undefined {
  const m = /^(\d+) meses computados/.exec(p?.detalle ?? '');
  return m ? Number(m[1]) : undefined;
}

function valorRequisito(r: Requisito, valor: number): string {
  if (r.unidad === 'indicador') return valor === 0 ? 'No' : 'Sí';
  return r.unidad.startsWith('meses')
    ? formatearDuracion(Math.max(0, Math.round(valor)))
    : formatearNumero(valor);
}

const ref = (leer: LeerReferencia, id: string): number | undefined =>
  leer(`parametros/incapacidad-permanente-reglas.json#${id}`);

function pasoBase(
  r: ResultadoOk<'incapacidad-permanente'>,
  pasos: readonly Paso[],
  ctx: ContextoIncapacidad,
): PasoVista {
  const d = r.detalle;
  const parrafos: string[] = [];
  const bases = paso(pasos, 'base-reguladora-bases');
  const elegido = paso(pasos, 'base-reguladora');
  const periodo = leerPeriodoElegido(elegido);
  if (d.origen === 'accidente-no-laboral' && periodo) {
    const n = ref(ctx.leerReferencia, 'br-anl-meses');
    const v = ref(ctx.leerReferencia, 'br-anl-ventana-meses');
    parrafos.push(
      `En el accidente no laboral con alta se elige el periodo ininterrumpido de ${n === undefined ? 'varios meses' : formatearDuracion(n)} más favorable dentro de los ${v === undefined ? 'años' : formatearDuracion(v)} anteriores al mes previo al hecho causante, y se divide la suma de sus bases (${euros(periodo.suma)}) entre el divisor que fija la norma.`,
    );
    parrafos.push(
      periodo.lagunas === 0
        ? 'Todos los meses del periodo elegido tienen base: no hay lagunas que tratar.'
        : `En el periodo elegido hay ${formatearNumero(periodo.lagunas)} meses sin cotizar. Su tratamiento depende de una lectura abierta (véase «Supuestos y lecturas»).`,
    );
    const br = numeroDe(elegido);
    if (br !== undefined) parrafos.push(`Base reguladora: ${eurosMes(br)}.`);
  } else {
    const l = leerBasesIncapacidad(bases);
    const ventana = ref(ctx.leerReferencia, 'br-ec-meses');
    const nominales = ref(ctx.leerReferencia, 'br-ec-meses-nominales');
    const indice = ref(ctx.leerReferencia, 'br-ec-mes-indice-referencia');
    const brBases = numeroDe(bases);
    if (l) {
      const corto = ventana !== undefined && l.bases < ventana;
      parrafos.push(
        corto
          ? `Como el periodo mínimo exigido es corto, se toman solo las ${formatearNumero(l.bases)} bases de los meses anteriores al mes previo al hecho causante y se dividen entre ${formatearNumero(l.divisor, { decimales: 2 })}, que depende de una lectura abierta (véase «Supuestos y lecturas»).`
          : `Se toman las ${formatearNumero(l.bases)} bases de los meses anteriores al mes previo al hecho causante y se dividen entre ${formatearNumero(l.divisor, { decimales: 0 })}.`,
      );
      if (nominales !== undefined && indice !== undefined) {
        parrafos.push(
          `Los ${formatearNumero(nominales)} meses más recientes entran por su valor nominal; las bases anteriores se actualizan con el IPC hasta el índice del mes ${formatearNumero(indice)} anterior al previo al hecho causante.`,
        );
      }
      parrafos.push(
        l.lagunas === 0
          ? 'Todos los meses de la ventana tienen base: no hay lagunas que integrar.'
          : `Hay ${formatearNumero(l.lagunas)} meses sin base (lagunas), que se integran con una parte de la base mínima de cotización.`,
      );
      if (brBases !== undefined) parrafos.push(`Resultado: ${eurosMes(brBases)}.`);
    }
    const anios = paso(pasos, 'anios-hasta-edad');
    const pct = paso(pasos, 'porcentaje-cotizacion');
    const faltan = numeroDe(anios);
    const pctV = numeroDe(pct);
    const edadF = leerEdadFiccion(anios);
    const computados = leerMesesComputados(pct);
    if (faltan !== undefined && pctV !== undefined && computados !== undefined) {
      parrafos.push(
        `En la enfermedad común se suman a los ${formatearDuracion(d.mesesCotizados)} cotizados los ${formatearDuracion(faltan)} que faltan hasta la edad ordinaria de jubilación${edadF === undefined ? '' : ` (${formatearDuracion(edadF)}; lectura abierta, véase «Supuestos y lecturas»)`}: ${formatearDuracion(computados)} computados, que dan el ${porc(pctV)} de la base. Base reguladora resultante: ${eurosMes(d.baseReguladora)}.`,
      );
    } else if (d.origen === 'accidente-no-laboral') {
      parrafos.push(`Base reguladora: ${eurosMes(d.baseReguladora)}.`);
    }
  }
  return {
    id: 'base',
    titulo: 'Base reguladora',
    parrafos,
    articulo:
      d.origen === 'accidente-no-laboral' && periodo
        ? 'art. 7.1 Decreto 1646/1972 y art. 197.3 TRLGSS'
        : 'arts. 197.1 a 197.4 TRLGSS',
  };
}

function pasoGrado(r: ResultadoOk<'incapacidad-permanente'>, pasos: readonly Paso[]): PasoVista {
  const d = r.detalle;
  const p196 = paso(pasos, 'porcentaje-196-5');
  const cual = paso(pasos, 'total-cualificada');
  const cualSusp = paso(pasos, 'total-cualificada-suspendida');
  const parrafos: string[] = [];
  if (p196) {
    parrafos.push(
      `Con la edad del hecho causante se aplica el porcentaje que corresponde a la carencia de la jubilación, ${porc(d.porcentajeGrado)} de la base reguladora, en lugar del porcentaje del grado.`,
    );
  } else {
    parrafos.push(
      `Para el grado ${NOMBRE_GRADO[d.grado]} corresponde el ${porc(d.porcentajeGrado)} de la base reguladora.`,
    );
  }
  const inc = numeroDe(cual);
  if (inc !== undefined) {
    parrafos.push(
      `Se suma el incremento de la incapacidad total cualificada, ${eurosMes(inc)}: se presume la dificultad de obtener empleo por la edad.`,
    );
  } else if (cualSusp) {
    parrafos.push(
      'El incremento de la incapacidad total cualificada queda en suspenso porque se ha indicado que trabajas.',
    );
  }
  return {
    id: 'grado',
    titulo: 'Porcentaje del grado',
    parrafos,
    articulo: p196 ? 'art. 196.5 TRLGSS' : 'art. 196.2 TRLGSS y Orden de 15 de abril de 1969',
  };
}

function pasoLimites(
  pasos: readonly Paso[],
  ctx: ContextoIncapacidad,
  d: ResultadoOk<'incapacidad-permanente'>['detalle'],
): PasoVista {
  const parrafos: string[] = [];
  const maximo = paso(pasos, 'limite-maximo');
  const gi = paso(pasos, 'complemento-gran-incapacidad');
  const suelo = paso(pasos, 'suelo-total-ec');
  const minimos = paso(pasos, 'complemento-minimos');
  const sinLimite = paso(pasos, 'minimos-limite-ingresos');
  const brecha = paso(pasos, 'complemento-brecha');
  if (typeof maximo?.valor === 'number') {
    parrafos.push(
      `La pensión calculada supera el límite máximo de ${eurosMes(maximo.valor)}: se aplica ese límite.`,
    );
  } else if (!ctx.aplicarPensionMaxima) {
    parrafos.push('No se ha aplicado el límite de pensión máxima (opción desactivada).');
  } else {
    parrafos.push('La pensión calculada no supera el límite de pensión máxima.');
  }
  const importeGI = numeroDe(gi);
  if (importeGI !== undefined) {
    parrafos.push(
      `Se suma el complemento de gran incapacidad, ${eurosMes(importeGI)}, que no cuenta para el límite máximo.`,
    );
  }
  const importeSuelo = numeroDe(suelo);
  if (importeSuelo !== undefined) {
    parrafos.push(
      `En la incapacidad total por enfermedad común, la pensión no puede ser inferior a una cuantía mínima de ${eurosMes(importeSuelo)}, sin depender de las rentas.`,
    );
  }
  const importeMinimos = numeroDe(minimos);
  if (importeMinimos !== undefined) {
    parrafos.push(
      `La pensión queda por debajo de la cuantía mínima que corresponde: se añade un complemento a mínimos de ${eurosMes(importeMinimos)}.`,
    );
  } else if (sinLimite) {
    parrafos.push('No hay complemento a mínimos porque las rentas superan el límite de ingresos.');
  } else if (!ctx.aplicarMinimos) {
    parrafos.push('No se ha aplicado el complemento a mínimos (opción desactivada).');
  } else if (paso(pasos, 'sin-minima')) {
    parrafos.push(
      'Para esta clase de incapacidad no existe cuantía mínima: no hay complemento a mínimos.',
    );
  } else if (importeSuelo === undefined && d.estado !== 'maxima') {
    parrafos.push(
      'La pensión alcanza la cuantía mínima que corresponde: no hay complemento a mínimos.',
    );
  }
  const importeBrecha = numeroDe(brecha);
  if (importeBrecha !== undefined) {
    parrafos.push(
      `Se suma el complemento por hijos, ${eurosMes(importeBrecha)}, que no cuenta para el límite máximo.`,
    );
  }
  return {
    id: 'limites',
    titulo: 'Límites y complementos',
    parrafos,
    articulo: 'arts. 57, 59, 60 y 196 TRLGSS',
  };
}

function pasoTrabajo(pasos: readonly Paso[]): PasoVista | undefined {
  const susp = paso(pasos, 'suspension-por-trabajo');
  const comp = paso(pasos, 'compatibilidad-total');
  if (susp && typeof susp.valor === 'number') {
    return {
      id: 'trabajo',
      titulo: 'Trabajo y pensión',
      parrafos: [
        `Como se ha indicado que trabajas, se suspende el pago de ${eurosMes(susp.valor)}; el complemento de gran incapacidad, si lo hay, no se suspende.`,
      ],
      articulo: 'art. 198.2 TRLGSS',
    };
  }
  if (comp) {
    return {
      id: 'trabajo',
      titulo: 'Trabajo y pensión',
      parrafos: [
        'La pensión de incapacidad total es compatible con el salario de un trabajo en funciones distintas de las de la profesión habitual.',
      ],
      articulo: 'art. 198.1 TRLGSS',
    };
  }
  return undefined;
}

/** Modelo de vista del resultado de la incapacidad permanente. */
export function presentarIncapacidad(
  r: ResultadoOk<'incapacidad-permanente'>,
  ctx: ContextoIncapacidad,
): ModeloResultado {
  const d = r.detalle;
  const prestacion = r.prestaciones[0];
  const pasos = prestacion?.pasos ?? d.pasos;
  const estado = d.estado;
  const cumple = d.cumpleRequisitos;
  const parcial = d.grado === 'parcial';
  const cifras: Cifra[] = [];
  if (cumple && parcial) {
    cifras.push({
      etiqueta: 'Cantidad a tanto alzado (pago único)',
      valor: euros(d.cantidadTantoAlzado),
    });
  } else if (cumple) {
    cifras.push(
      { etiqueta: 'Pensión mensual bruta (por paga)', valor: euros(d.pensionMensual) },
      {
        etiqueta: 'Pensión anual bruta',
        valor: euros(d.pensionAnual),
        detalle: `${formatearNumero(d.pagas)} pagas`,
      },
    );
  }
  if (cumple) {
    cifras.push({
      etiqueta: parcial ? 'Base reguladora de la incapacidad temporal' : 'Base reguladora',
      valor: eurosMes(d.baseReguladora),
    });
    if (!parcial) {
      cifras.push({
        etiqueta: 'Porcentaje aplicable según el grado',
        valor: porc(d.porcentajeGrado),
        detalle: `grado ${NOMBRE_GRADO[d.grado]}`,
      });
      if (d.incrementoTotalCualificada > 0) {
        cifras.push({
          etiqueta: 'Incremento de la total cualificada (por paga)',
          valor: eurosMes(d.incrementoTotalCualificada),
        });
      }
      if (d.complementoGranIncapacidad > 0) {
        cifras.push({
          etiqueta: 'Complemento de gran incapacidad (por paga)',
          valor: eurosMes(d.complementoGranIncapacidad),
        });
      }
      if (d.importeEnSuspenso > 0) {
        cifras.push({
          etiqueta: 'Importe en suspenso mientras trabajes (por paga)',
          valor: eurosMes(d.importeEnSuspenso),
        });
      }
    }
  }
  cifras.push({ etiqueta: 'Tiempo cotizado', valor: formatearDuracion(d.mesesCotizados) });
  const carencia = d.requisitos.find((q) => q.id === 'carencia' || q.id === 'carencia-parcial');
  if (carencia) {
    cifras.push({
      etiqueta: 'Periodo mínimo de cotización exigido',
      valor: valorRequisito(carencia, carencia.exigido),
      detalle: `acreditado: ${valorRequisito(carencia, carencia.valor)}`,
    });
  }
  const faltan = numeroDe(paso(pasos, 'anios-hasta-edad'));
  if (faltan !== undefined) {
    cifras.push({
      etiqueta: 'Meses añadidos hasta la edad ordinaria (se consideran cotizados)',
      valor: formatearDuracion(faltan),
    });
  }
  cifras.push({ etiqueta: 'Edad en el hecho causante', valor: formatearDuracion(d.edadMeses) });

  const mesesCotizados = numeroDe(paso(pasos, 'meses-cotizados')) ?? d.mesesCotizados;
  const pasosVista: PasoVista[] = [
    {
      id: 'carrera',
      titulo: 'Tiempo cotizado',
      parrafos: [
        `Hasta el hecho causante se cuentan ${formatearDuracion(mesesCotizados)} de cotización. Cada mes con base cuenta como un mes cotizado; los meses sin cotizar no suman.`,
      ],
      articulo: paso(pasos, 'meses-cotizados')?.articulo ?? 'art. 195 TRLGSS',
    },
  ];
  const requisitosPrincipales = d.requisitos.filter(
    (q) => q.id === 'carencia' || q.id === 'carencia-parcial' || q.id === 'carencia-reciente',
  );
  const hayCarencia = paso(pasos, 'carencia');
  pasosVista.push({
    id: 'requisitos',
    titulo: 'Periodo mínimo de cotización',
    parrafos:
      requisitosPrincipales.length > 0
        ? requisitosPrincipales.map(
            (q) =>
              `${q.descripcion}: ${valorRequisito(q, q.valor)} acreditados frente a ${valorRequisito(q, q.exigido)} exigidos (${q.cumple ? 'se cumple' : 'no se cumple'}).`,
          )
        : [
            hayCarencia
              ? 'En el accidente no laboral no se exige periodo mínimo de cotización.'
              : 'Para este caso el simulador no exige un periodo mínimo de cotización.',
          ],
    articulo: 'art. 195 TRLGSS',
  });
  if (cumple && parcial) {
    const tanto = paso(pasos, 'parcial-tanto-alzado');
    pasosVista.push({
      id: 'parcial',
      titulo: 'Cantidad a tanto alzado',
      parrafos: [
        `La incapacidad permanente parcial no da una pensión periódica sino una cantidad única: ${tanto?.detalle ?? 'varias mensualidades de la base reguladora.'} Con una base de ${eurosMes(d.baseReguladora)} resulta ${euros(d.cantidadTantoAlzado)}.`,
      ],
      articulo: 'art. 196.1 TRLGSS',
    });
  } else if (cumple) {
    pasosVista.push(pasoBase(r, pasos, ctx), pasoGrado(r, pasos), pasoLimites(pasos, ctx, d));
    const trabajo = pasoTrabajo(pasos);
    if (trabajo) pasosVista.push(trabajo);
    pasosVista.push({
      id: 'resultado',
      titulo: 'Pensión inicial',
      parrafos: [
        `${eurosMes(d.pensionMensual)} en cada una de las ${formatearNumero(d.pagas)} pagas, es decir, ${euros(d.pensionAnual)} al año, en euros del año del hecho causante.`,
      ],
      articulo: 'art. 196 TRLGSS',
    });
  }
  return {
    cumpleRequisitos: cumple,
    estado,
    textoEstado: TEXTO_ESTADO[estado],
    cifras,
    requisitos: (prestacion?.requisitos ?? d.requisitos).map((q) => ({
      descripcion: q.descripcion,
      acreditado: valorRequisito(q, q.valor),
      exigido: valorRequisito(q, q.exigido),
      cumple: q.cumple,
      articulo: q.articulo,
    })),
    pasos: pasosVista,
    avisos: r.avisos,
    anioNormativa: String(r.anioNormativa),
    momentoNormativa: 'del hecho causante',
    tituloRequisitos: `Requisitos de la incapacidad permanente (grado ${NOMBRE_GRADO[d.grado]}, ${NOMBRE_ORIGEN[d.origen]})`,
  };
}
