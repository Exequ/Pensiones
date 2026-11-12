/**
 * Causante de las prestaciones de muerte y supervivencia: periodo previo de cotización (arts. 219.1,
 * 224.1 y 226.1 TRLGSS; art. 22 Orden de 13/02/1967) y base reguladora (art. 228 TRLGSS; art. 7
 * Decreto 1646/1972; art. 9 Orden de 13/02/1967).
 */
import { basePeriodoElegido, type EntradaBases } from '../comun/base-reguladora.ts';
import { procesarCarrera, mesesCotizadosAntesDe } from '../jubilacion/carrera.ts';
import type { Contexto } from '../jubilacion/contexto.ts';
import { NoImplementada } from '../jubilacion/errores.ts';
import { ref } from '../jubilacion/parametros.ts';
import {
  anioDeMes,
  diasDelMes,
  mesAbsDe,
  mesDelAnio,
  parsearFecha,
  parsearMes,
  type Fecha,
  type MesAbs,
} from '../jubilacion/tiempo.ts';
import type { Paso, Requisito } from '../jubilacion/tipos.ts';
import { refSV, reglaSV, type ParametrosSupervivencia } from './parametros.ts';
import type { Causante, LecturasSupervivencia, OpcionesSupervivencia } from './tipos.ts';

export interface CausantePreparado {
  readonly hc: Fecha;
  readonly anio: number;
  readonly bases: ReadonlyMap<MesAbs, number>;
  readonly baseReguladora: number;
  readonly pasos: readonly Paso[];
}

export const esAccidenteOEP = (c: Causante): boolean => c.causa !== 'enfermedad-comun';
export const esProfesional = (c: Causante): boolean =>
  c.causa === 'accidente-trabajo' || c.causa === 'enfermedad-profesional';

/** Días cotizados en los meses `[desde, hasta]`. */
function diasCotizados(
  bases: ReadonlyMap<MesAbs, number>,
  desde: MesAbs,
  hasta: MesAbs,
  lectura: LecturasSupervivencia['diasCotizados'],
): number {
  let dias = 0;
  for (let m = desde; m <= hasta; m++) {
    if (!bases.has(m)) continue;
    dias += lectura === 'naturales' ? diasDelMes(anioDeMes(m), mesDelAnio(m)) : 30;
  }
  return dias;
}

/**
 * Periodo previo de cotización del causante para una prestación. `exentoPorCausa`: la causa de la
 * muerte exime de los 500 días (art. 219.1: cualquier accidente o enfermedad profesional; art. 22
 * Orden de 1967: accidente de trabajo o enfermedad profesional). `exigeQuinientos`: falso en la
 * orfandad con la lectura del art. 224.1.
 */
export function requisitosCausante(
  p: ParametrosSupervivencia,
  causante: Causante,
  prep: CausantePreparado,
  lecturas: LecturasSupervivencia,
  exentoPorCausa: boolean,
  exigeQuinientos: boolean,
  refsQuinientos: readonly string[],
  articulo: string,
): Requisito[] {
  const r = (id: string): number => reglaSV(p, id);
  const mesHC = mesAbsDe(prep.hc);
  if (causante.situacion === 'pensionista') {
    return [
      {
        id: 'causante-pensionista',
        descripcion: 'Causante pensionista de jubilación o incapacidad permanente',
        cumple: true,
        valor: 1,
        exigido: 1,
        unidad: 'indicador',
        parametros: [refSV('causante-pensionista')],
        articulo: 'art. 217.1.c) TRLGSS',
      },
    ];
  }
  if (causante.situacion === 'sin-alta') {
    const meses = mesesCotizadosAntesDe(prep.bases, mesHC);
    return [
      {
        id: 'carencia-sin-alta',
        descripcion: 'Causante sin alta: periodo mínimo de cotización',
        cumple: meses >= r('carencia-sin-alta-meses'),
        valor: meses,
        exigido: r('carencia-sin-alta-meses'),
        unidad: 'meses cotizados',
        parametros: [refSV('carencia-sin-alta-meses')],
        articulo: 'art. 219.1, párr. 2.º, TRLGSS',
      },
    ];
  }
  if (exentoPorCausa || !exigeQuinientos) return [];
  let fin = mesHC - 1;
  if (causante.situacion === 'alta-sin-obligacion') {
    if (causante.finObligacionCotizar === undefined) {
      throw new RangeError('Alta sin obligación de cotizar: falta finObligacionCotizar');
    }
    fin = mesAbsDe(parsearFecha(causante.finObligacionCotizar)) - 1;
  }
  const ventana = r('carencia-alta-ventana-meses');
  const dias = diasCotizados(prep.bases, fin - ventana + 1, fin, lecturas.diasCotizados);
  return [
    {
      id: 'carencia-alta',
      descripcion: 'Días cotizados en los cinco años anteriores',
      cumple: dias >= r('carencia-alta-dias'),
      valor: dias,
      exigido: r('carencia-alta-dias'),
      unidad: 'días',
      parametros: [
        ...refsQuinientos,
        refSV('carencia-alta-ventana-meses'),
        ...(causante.situacion === 'alta-sin-obligacion'
          ? [refSV('carencia-sin-obligacion-desde-cese')]
          : []),
      ],
      articulo,
    },
  ];
}

/** Revalorización acumulada entre el año de la pensión del causante y el del fallecimiento. */
function revalorizacionAcumulada(ctx: Contexto, desde: number, hasta: number): number {
  let f = 1;
  for (let t = desde + 1; t <= hasta; t++) f *= 1 + ctx.revalorizacionPct(t) / 100;
  return f;
}

/** Carrera procesada y base reguladora del causante. */
export function prepararCausante(
  p: ParametrosSupervivencia,
  ctx: Contexto,
  causante: Causante,
  opciones: OpcionesSupervivencia,
  lecturas: LecturasSupervivencia,
): CausantePreparado {
  const hc = parsearFecha(causante.fechaFallecimiento);
  const anio = hc.anio;
  const mesHC = mesAbsDe(hc);
  const pasos: Paso[] = [];
  const bases =
    causante.carrera === undefined
      ? new Map<MesAbs, number>()
      : procesarCarrera(causante.carrera, ctx, opciones.topeBases ?? true).bases;

  if (esProfesional(causante)) {
    if (causante.baseReguladoraProfesional === undefined) {
      throw new NoImplementada(
        'Base reguladora de las prestaciones de muerte y supervivencia por accidente de trabajo o enfermedad profesional',
        'Se calcula con el salario real del Reglamento de accidentes de trabajo de 1956 (art. 9.d de la Orden de 13/02/1967), no descargado (docs/DESCARGAS_MANUALES.md). Puede pasarse calculada fuera en causante.baseReguladoraProfesional.',
      );
    }
    pasos.push({
      id: 'base-reguladora',
      titulo: 'Base reguladora (contingencias profesionales, calculada fuera del motor)',
      valor: causante.baseReguladoraProfesional,
      unidad: 'euros/mes',
      parametros: [refSV('br-profesional-salario-real')],
      articulo: 'art. 9.d) Orden de 13/02/1967',
    });
    return { hc, anio, bases, baseReguladora: causante.baseReguladoraProfesional, pasos };
  }

  if (causante.situacion === 'pensionista') {
    const pen = causante.pension;
    if (pen === undefined) {
      throw new RangeError('Causante pensionista: falta la base reguladora de su pensión');
    }
    const hcPension = parsearFecha(pen.fechaHechoCausante);
    if (hcPension.anio > anio) {
      throw new RangeError('La pensión del causante no puede ser posterior al fallecimiento');
    }
    const factor = revalorizacionAcumulada(ctx, hcPension.anio, anio);
    const refsReval: string[] = [];
    for (let t = hcPension.anio + 1; t <= anio; t++) {
      if (t <= ctx.params.revalorizacion.ultimo) refsReval.push(ref('revalorizacion-general', t));
    }
    pasos.push({
      id: 'base-reguladora',
      titulo: 'Base reguladora de la pensión del causante, con las revalorizaciones posteriores',
      valor: pen.baseReguladora * factor,
      unidad: 'euros/mes',
      parametros: [
        refSV('br-pensionista-misma-base'),
        refSV('br-pensionista-revalorizaciones'),
        ...refsReval,
      ],
      articulo: 'art. 7.3 Decreto 1646/1972',
      detalle: `Base de la pensión ${pen.baseReguladora.toFixed(2)} euros/mes (${pen.fechaHechoCausante}) × revalorización acumulada ${factor.toFixed(6)}.`,
    });
    return { hc, anio, bases, baseReguladora: pen.baseReguladora * factor, pasos };
  }

  if (causante.carrera === undefined) {
    throw new RangeError('Causante no pensionista: falta la carrera de cotización');
  }
  // 24 meses ininterrumpidos elegidos en los 15 años anteriores, entre 28; meses sin cotizar a cero.
  const ultimoExcluido =
    lecturas.ventanaBaseReguladora === 'anterior-al-mes-previo' ? mesHC - 1 : mesHC;
  const entrada: EntradaBases = {
    bases,
    primerMesAlta: undefined,
    mesHechoCausante: ultimoExcluido,
    actualizar: false,
  };
  const d = basePeriodoElegido(
    ctx,
    entrada,
    {
      meses: reglaSV(p, 'br-meses'),
      ventanaMeses: reglaSV(p, 'br-ventana-meses'),
      divisor: reglaSV(p, 'br-divisor'),
      refs: [
        refSV('br-meses'),
        refSV('br-ventana-meses'),
        refSV('br-divisor'),
        refSV('br-anterior-mes-previo'),
        refSV('br-lapsos-sin-obligacion'),
      ],
    },
    opciones.periodoElegidoDesde === undefined
      ? undefined
      : parsearMes(opciones.periodoElegidoDesde),
  );
  pasos.push({
    id: 'base-reguladora',
    titulo: 'Base reguladora: 24 meses ininterrumpidos elegidos en los quince años anteriores',
    valor: d.baseReguladora,
    unidad: 'euros/mes',
    parametros: d.refs,
    articulo: 'art. 228 TRLGSS; art. 7.2 Decreto 1646/1972',
    detalle: `Suma ${d.sumaBases.toFixed(2)} euros entre ${reglaSV(p, 'br-divisor')}; ${d.lagunas} meses sin cotizar a cero (ventana: ${lecturas.ventanaBaseReguladora}).`,
  });
  if (d.lagunas > 0) {
    ctx.avisos.add(
      'Base reguladora: hay meses sin cotización dentro del periodo elegido; cuentan como cero (art. 9.a de la Orden de 13/02/1967).',
    );
  }
  return { hc, anio, bases, baseReguladora: d.baseReguladora, pasos };
}
