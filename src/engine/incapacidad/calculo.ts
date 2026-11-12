/**
 * Pensión de incapacidad permanente contributiva del Régimen General (arts. 193 a 198 y DT 26.ª
 * TRLGSS y normativa de desarrollo), con desglose por pasos. Todas las cifras legales salen de
 * /data (`incapacidad-permanente-reglas` y los parámetros de la jubilación).
 *
 * Pasos: requisitos (alta, periodo mínimo, exclusión por jubilación) → base reguladora según el
 * origen → porcentaje del art. 197.1.b) con los años que faltan hasta la edad ordinaria →
 * porcentaje del grado e incremento de la total cualificada → complemento de gran incapacidad →
 * límite de pensión máxima → suelo de la total por enfermedad común → complemento a mínimos →
 * complemento de brecha de género → trabajo (art. 198). La revalorización está en `revalorizacion.ts`.
 */
import {
  basePeriodoElegido,
  basesDeVentana,
  integracionEnDosTramos,
  type EntradaBases,
} from '../comun/base-reguladora.ts';
import { procesarCarrera, mesesCotizadosAntesDe } from '../jubilacion/carrera.ts';
import { crearContexto, type Contexto } from '../jubilacion/contexto.ts';
import { NoImplementada } from '../jubilacion/errores.ts';
import { parametro, ref, valorEn } from '../jubilacion/parametros.ts';
import { porcentajeEscala, versionEscala } from '../jubilacion/porcentajes.ts';
import {
  anioDeMes,
  compararFechas,
  diasDelMes,
  mesAbsDe,
  mesDelAnio,
  mesesCumplidos,
  parsearFecha,
  parsearMes,
  sumarMeses,
  type Fecha,
  type MesAbs,
} from '../jubilacion/tiempo.ts';
import type { EstadoPension, Paso, Requisito } from '../jubilacion/tipos.ts';
import {
  refIP,
  reglaGranIncapacidadDelAnio,
  reglaIP,
  textoIP,
  type ParametrosIncapacidad,
} from './parametros.ts';
import {
  LECTURAS_INCAPACIDAD_POR_DEFECTO,
  type Carrera,
  type GradoIncapacidad,
  type LecturasIncapacidad,
  type OpcionesIncapacidad,
  type OrigenIncapacidad,
  type ResultadoIncapacidad,
} from './tipos.ts';

const FRB = 'complemento-brecha-genero-reglas';
const ART = {
  requisitos: 'art. 195 TRLGSS',
  br: 'art. 197 TRLGSS',
  prestaciones: 'art. 196 TRLGSS',
  compat: 'art. 198 TRLGSS',
};

function req(
  id: string,
  descripcion: string,
  valor: number,
  exigido: number,
  unidad: string,
  parametros: readonly string[],
  articulo: string,
  cumple: boolean = valor >= exigido,
): Requisito {
  return { id, descripcion, cumple, valor, exigido, unidad, parametros, articulo };
}

function claveSituacion(opciones: OpcionesIncapacidad): string {
  return {
    unipersonal: 'unipersonal',
    'conyuge-a-cargo': 'conyuge-cargo',
    'conyuge-no-a-cargo': 'conyuge-no-cargo',
  }[opciones.situacionFamiliar ?? 'unipersonal'];
}

const esContingenciaComun = (o: OrigenIncapacidad): boolean =>
  o === 'enfermedad-comun' || o === 'accidente-no-laboral';

/** Edad ordinaria de jubilación del año (art. 205.1.a y DT 7.ª) con `mesesCotizados`. */
function edadOrdinaria(
  ctx: Contexto,
  anio: number,
  mesesCotizados: number,
): { readonly meses: number; readonly refs: readonly string[] } {
  const p = ctx.params;
  const carrera = valorEn(p.carrera65, anio);
  const tabla = valorEn(p.edadOrdinaria, anio);
  if (mesesCotizados >= carrera.valor) {
    return {
      meses: p.edad65Meses,
      refs: [carrera.ref, ref('jubilacion-edad-65', '2013-carrera-larga-meses')],
    };
  }
  return { meses: tabla.valor, refs: [carrera.ref, tabla.ref] };
}

/** Meses cotizados en `[desde, hasta]`. */
function mesesEntre(bases: ReadonlyMap<MesAbs, number>, desde: MesAbs, hasta: MesAbs): number {
  let n = 0;
  for (const m of bases.keys()) if (m >= desde && m <= hasta) n++;
  return n;
}

/** Edad en meses para el periodo mínimo (art. 195.3), con la lectura del redondeo a medios años. */
function edadParaCarencia(
  nac: Fecha,
  hc: Fecha,
  lecturas: LecturasIncapacidad,
  medioAnio: number,
): number {
  const meses = mesesCumplidos(nac, hc);
  if (lecturas.redondeoEdadCarencia === 'sin-redondeo') return meses;
  // RD 1799/1985, art. 4.1: fracciones inferiores a medio año no cuentan; superiores, medio año.
  const anios = Math.floor(meses / 12);
  const fraccion = meses - anios * 12;
  return anios * 12 + (fraccion >= medioAnio ? medioAnio : 0);
}

export function calcularIncapacidadPermanenteConParametros(
  params: ParametrosIncapacidad,
  carrera: Carrera,
  nacimiento: string,
  fechaHechoCausante: string,
  grado: GradoIncapacidad,
  origen: OrigenIncapacidad,
  opciones: OpcionesIncapacidad = {},
): ResultadoIncapacidad {
  const nac = parsearFecha(nacimiento);
  const hc = parsearFecha(fechaHechoCausante);
  if (compararFechas(hc, nac) <= 0)
    throw new RangeError('El hecho causante debe ser posterior al nacimiento');
  const anio = hc.anio;
  const primerAnio = desdeMotor(params);
  if (anio < primerAnio) {
    throw new NoImplementada(
      `Incapacidad permanente con hecho causante en ${anio}`,
      `El motor cubre hechos causantes desde ${primerAnio} (reglas de /data verificadas para esas fechas).`,
    );
  }
  const lecturas: LecturasIncapacidad = {
    ...LECTURAS_INCAPACIDAD_POR_DEFECTO,
    ...opciones.lecturasIncapacidad,
  };
  const comun = esContingenciaComun(origen);
  const profesional = !comun;
  const ctx = crearContexto(params, opciones);
  const pagas = parametro(params.reglasBrecha, 'pagas-anuales', FRB);
  const mesHC = mesAbsDe(hc);
  const pasos: Paso[] = [];
  const requisitos: Requisito[] = [];
  const paso = (
    id: string,
    titulo: string,
    valor: number | string | boolean,
    unidad: string,
    parametros: readonly string[],
    articulo: string,
    detalle?: string,
  ): void => {
    pasos.push(
      detalle === undefined
        ? { id, titulo, valor, unidad, parametros, articulo }
        : { id, titulo, valor, unidad, parametros, articulo, detalle },
    );
  };
  const r = (id: string): number => reglaIP(params, id);

  // 0. Ramas no implementadas (antes de calcular nada) ----------------------------------------------
  const enAlta = opciones.enAlta ?? true;
  if (profesional && grado !== 'parcial' && opciones.baseReguladoraProfesional === undefined) {
    throw new NoImplementada(
      'Base reguladora de las pensiones por accidente de trabajo o enfermedad profesional',
      'Se calcula con el salario real del Reglamento de accidentes de trabajo de 1956 (art. 15.2.b de la Orden de 15/04/1969), no descargado (docs/DESCARGAS_MANUALES.md). Puede pasarse calculada fuera en opciones.baseReguladoraProfesional.',
    );
  }
  if (profesional && grado === 'parcial' && opciones.baseReguladoraIT === undefined) {
    throw new NoImplementada(
      'Base reguladora de la incapacidad temporal por contingencias profesionales',
      'Incluye conceptos (horas extraordinarias) que la carrera del motor no recoge; puede pasarse en opciones.baseReguladoraIT.',
    );
  }
  if (!enAlta && profesional) {
    throw new NoImplementada(
      'Incapacidad permanente por contingencias profesionales sin alta',
      'El art. 195.4 solo regula el acceso sin alta de la absoluta y la gran incapacidad por contingencias comunes.',
    );
  }
  const trabaja = opciones.trabaja ?? false;
  const fechaNum = hc.anio * 10000 + hc.mes * 100 + hc.dia;
  if (
    trabaja &&
    (grado === 'absoluta' || grado === 'gran-incapacidad') &&
    fechaNum < r('compatibilidad-absoluta-suspension-desde')
  ) {
    throw new NoImplementada(
      'Trabajo de un pensionista de absoluta o gran incapacidad antes del 22/12/2024',
      'La redacción del art. 198.2 anterior a la Ley 7/2024 no se ha transcrito en /data.',
    );
  }

  // 1. Carrera ------------------------------------------------------------------------------------
  const carreraP = procesarCarrera(carrera, ctx, opciones.topeBases ?? true);
  const bases = carreraP.bases;
  const mesesCot = mesesCotizadosAntesDe(bases, mesHC);
  const edadMeses = mesesCumplidos(nac, hc);
  paso(
    'meses-cotizados',
    'Meses cotizados hasta el hecho causante',
    mesesCot,
    'meses',
    [],
    ART.requisitos,
  );
  if (carreraP.mesesTopados > 0) {
    ctx.avisos.add(
      `${carreraP.mesesTopados} meses con base superior a la base máxima: se han reducido a la base máxima de cada mes.`,
    );
  }

  // 2. Requisitos -----------------------------------------------------------------------------------
  let mesesExigidos = 0;
  if (!enAlta) {
    requisitos.push(
      req(
        'alta',
        'Sin alta: solo absoluta o gran incapacidad por contingencias comunes',
        grado === 'absoluta' || grado === 'gran-incapacidad' ? 1 : 0,
        1,
        'indicador',
        [refIP('carencia-sin-alta-meses')],
        'art. 195.4 TRLGSS',
      ),
    );
  }
  if (grado === 'parcial') {
    if (origen === 'enfermedad-comun') {
      // 1.800 días en los diez años anteriores a la extinción de la IT (se toma el hecho causante).
      const ventana = r('carencia-parcial-ventana-meses');
      let dias = 0;
      for (let m = mesHC - ventana; m < mesHC; m++) {
        if (!bases.has(m)) continue;
        dias +=
          lecturas.diasCotizadosParcial === 'naturales'
            ? diasDelMes(anioDeMes(m), mesDelAnio(m))
            : 30;
      }
      requisitos.push(
        req(
          'carencia-parcial',
          'Días cotizados en los diez años anteriores',
          dias,
          r('carencia-parcial-dias'),
          'días',
          [refIP('carencia-parcial-dias'), refIP('carencia-parcial-ventana-meses')],
          'art. 195.2 TRLGSS',
        ),
      );
      ctx.avisos.add(
        'Parcial: la ventana de diez años se cuenta desde el hecho causante, que se toma como fecha de extinción de la incapacidad temporal.',
      );
    } else {
      paso(
        'carencia',
        'Sin periodo mínimo de cotización (accidente o enfermedad profesional)',
        0,
        'meses',
        [refIP('carencia-exenta-accidente-ep')],
        'art. 195.1 TRLGSS',
      );
    }
  } else if (!enAlta) {
    mesesExigidos = r('carencia-sin-alta-meses');
  } else if (origen === 'enfermedad-comun') {
    const edadC = edadParaCarencia(nac, hc, lecturas, r('carencia-redondeo-edad-medio-anio-meses'));
    if (edadMeses < r('carencia-joven-edad-limite-meses')) {
      mesesExigidos = Math.floor(
        Math.max(0, edadC - r('carencia-joven-desde-edad-meses')) / r('carencia-joven-divisor'),
      );
    } else {
      mesesExigidos = Math.max(
        r('carencia-general-minimo-meses'),
        Math.floor(
          Math.max(0, edadC - r('carencia-general-desde-edad-meses')) /
            r('carencia-general-divisor'),
        ),
      );
    }
  } else {
    paso(
      'carencia',
      'Sin periodo mínimo de cotización (accidente o enfermedad profesional)',
      0,
      'meses',
      [refIP('carencia-exenta-accidente-ep')],
      'art. 195.1 TRLGSS',
    );
  }
  const asimilados = opciones.mesesAsimiladosIT ?? 0;
  if (grado !== 'parcial' && mesesExigidos > 0) {
    const refsC = !enAlta
      ? [refIP('carencia-sin-alta-meses')]
      : edadMeses < r('carencia-joven-edad-limite-meses')
        ? [
            refIP('carencia-joven-edad-limite-meses'),
            refIP('carencia-joven-desde-edad-meses'),
            refIP('carencia-joven-divisor'),
          ]
        : [
            refIP('carencia-general-desde-edad-meses'),
            refIP('carencia-general-divisor'),
            refIP('carencia-general-minimo-meses'),
          ];
    requisitos.push(
      req(
        'carencia',
        'Periodo mínimo de cotización',
        mesesCot + asimilados,
        mesesExigidos,
        'meses cotizados',
        [
          ...refsC,
          refIP('carencia-redondeo-fracciones-mes'),
          ...(asimilados > 0 ? [refIP('carencia-dias-it-asimilados')] : []),
        ],
        enAlta ? 'art. 195.3 TRLGSS; art. 4 RD 1799/1985' : 'art. 195.4 TRLGSS',
      ),
    );
    // La quinta parte, en los diez años anteriores (al hecho causante o al cese de la obligación de cotizar).
    if (!enAlta || edadMeses >= r('carencia-joven-edad-limite-meses')) {
      const finVentana =
        opciones.finObligacionCotizar === undefined
          ? mesHC
          : mesAbsDe(parsearFecha(opciones.finObligacionCotizar));
      const ventana = r('carencia-reciente-ventana-meses');
      const exigidosRecientes = Math.ceil(mesesExigidos / r('carencia-reciente-divisor') - 1e-9);
      requisitos.push(
        req(
          'carencia-reciente',
          'Quinta parte del periodo exigido en los diez años anteriores',
          mesesEntre(bases, finVentana - ventana, finVentana - 1),
          exigidosRecientes,
          'meses cotizados en la ventana',
          [refIP('carencia-reciente-divisor'), refIP('carencia-reciente-ventana-meses')],
          enAlta ? 'art. 195.3.b) TRLGSS' : 'art. 195.4 TRLGSS',
        ),
      );
    }
  }
  // Exclusión: edad ordinaria y requisitos de la jubilación (contingencias comunes).
  const edadReal = edadOrdinaria(ctx, anio, mesesCot);
  let reuneJubilacion = false;
  if (comun) {
    const carencia = valorEn(params.carencia, anio);
    const previo = mesesEntre(bases, mesHC - params.periodoPrevioVentana, mesHC - 1);
    reuneJubilacion =
      edadMeses >= edadReal.meses &&
      mesesCot >= carencia.valor &&
      previo >= params.periodoPrevioMeses;
    requisitos.push(
      req(
        'no-reune-jubilacion',
        'No tener la edad ordinaria y los requisitos de la jubilación',
        reuneJubilacion ? 0 : 1,
        1,
        'indicador',
        [refIP('excluida-si-reune-jubilacion'), ...edadReal.refs, carencia.ref],
        'art. 195.1, párrafo 2.º, TRLGSS',
      ),
    );
  }
  const cumple = requisitos.every((q) => q.cumple);
  const vacio = {
    grado,
    origen,
    fechaHechoCausante,
    anioNormativa: anio,
    requisitos,
    pagas,
    edadMeses,
    mesesCotizados: mesesCot,
    pasos,
  };
  if (!cumple && opciones.calcularAunqueNoCumpla !== true) {
    return {
      ...vacio,
      cumpleRequisitos: false,
      estado: 'no-causa-derecho',
      pensionMensual: 0,
      pensionAnual: 0,
      complementoGranIncapacidad: 0,
      incrementoTotalCualificada: 0,
      importeEnSuspenso: 0,
      cantidadTantoAlzado: 0,
      baseReguladora: 0,
      porcentajeGrado: 0,
      avisos: [...ctx.avisos],
    };
  }

  const entrada: EntradaBases = {
    bases,
    primerMesAlta: carreraP.primerMes,
    mesHechoCausante: mesHC,
    actualizar: opciones.actualizarBases ?? true,
  };

  // 3. Parcial: cantidad a tanto alzado ----------------------------------------------------------------
  if (grado === 'parcial') {
    let brIT = opciones.baseReguladoraIT;
    if (brIT === undefined) {
      const inicio =
        opciones.inicioIncapacidadTemporal === undefined
          ? mesHC
          : parsearMes(opciones.inicioIncapacidadTemporal);
      if (opciones.inicioIncapacidadTemporal === undefined) {
        ctx.avisos.add(
          'Parcial: sin inicio de la incapacidad temporal, se usa la base del mes anterior al hecho causante (opciones.inicioIncapacidadTemporal).',
        );
      }
      brIT = bases.get(inicio - 1) ?? 0;
    }
    const n = r('parcial-mensualidades');
    const cantidad = brIT * n;
    paso(
      'base-reguladora-it',
      'Base reguladora mensual de la incapacidad temporal',
      brIT,
      'euros/mes',
      [],
      'art. 13 Decreto 1646/1972',
      'Base de cotización del mes anterior al inicio de la incapacidad temporal.',
    );
    paso(
      'parcial-tanto-alzado',
      'Cantidad a tanto alzado',
      cantidad,
      'euros',
      [refIP('parcial-mensualidades'), refIP('parcial-tanto-alzado')],
      'art. 196.1 TRLGSS; art. 9 Decreto 1646/1972',
      `${n} mensualidades de la base reguladora de la incapacidad temporal.`,
    );
    return {
      ...vacio,
      cumpleRequisitos: cumple,
      estado: 'contributiva',
      pensionMensual: 0,
      pensionAnual: 0,
      complementoGranIncapacidad: 0,
      incrementoTotalCualificada: 0,
      importeEnSuspenso: 0,
      cantidadTantoAlzado: cantidad,
      baseReguladora: brIT,
      porcentajeGrado: 0,
      avisos: [...ctx.avisos],
    };
  }

  // 4. Base reguladora según el origen --------------------------------------------------------------
  const art1965 = comun && edadMeses >= r('edad-ip-sin-jubilacion-meses');
  let br: number;
  if (profesional) {
    br = opciones.baseReguladoraProfesional ?? 0;
    paso(
      'base-reguladora',
      'Base reguladora (contingencias profesionales, facilitada)',
      br,
      'euros/mes',
      [refIP('br-profesional-salario-real')],
      'art. 15.2.b) Orden de 15/04/1969',
      'Calculada fuera del motor con el salario real; el motor no la comprueba.',
    );
    ctx.avisos.add(
      'Contingencia profesional: la base reguladora la ha facilitado el usuario; el motor no la calcula.',
    );
  } else if (origen === 'accidente-no-laboral' && enAlta) {
    const integrar = lecturas.lagunasAccidenteNoLaboral === 'integrar';
    const d = basePeriodoElegido(
      ctx,
      entrada,
      {
        meses: r('br-anl-meses'),
        ventanaMeses: r('br-anl-ventana-meses'),
        divisor: r('br-anl-divisor'),
        refs: [
          refIP('br-anl-meses'),
          refIP('br-anl-ventana-meses'),
          refIP('br-anl-divisor'),
          refIP('br-anl-alta-normas-anteriores'),
        ],
        ...(integrar
          ? {
              integrarLaguna: integracionEnDosTramos(
                r('br-ec-lagunas-tramo1-meses'),
                r('br-ec-lagunas-tramo1-pct'),
                r('br-ec-lagunas-tramo2-pct'),
                [refIP('br-ec-lagunas-tramo1-meses')],
              ),
            }
          : {}),
      },
      opciones.periodoElegidoDesde === undefined
        ? undefined
        : parsearMes(opciones.periodoElegidoDesde),
    );
    br = d.baseReguladora;
    paso(
      'base-reguladora',
      'Base reguladora (accidente no laboral: 24 meses elegidos en siete años)',
      br,
      'euros/mes',
      d.refs,
      'art. 7.1 Decreto 1646/1972; art. 5.4 RD 1799/1985',
      `Suma ${d.sumaBases.toFixed(2)} euros; ${d.lagunas} meses sin cotización en el periodo elegido.`,
    );
  } else {
    // Enfermedad común (art. 197.1) o accidente no laboral sin alta (art. 197.3).
    let ventana = r('br-ec-meses');
    let divisor = r('br-ec-divisor');
    const refsBR = [
      refIP('br-ec-meses'),
      refIP('br-ec-divisor'),
      refIP('br-ec-meses-nominales'),
      refIP('br-ec-mes-indice-referencia'),
      refIP('br-ec-lagunas-tramo1-meses'),
      refIP('br-ec-lagunas-tramo1-pct'),
      refIP('br-ec-lagunas-tramo2-pct'),
    ];
    if (mesesExigidos > 0 && mesesExigidos < r('br-periodo-corto-umbral-meses')) {
      ventana = mesesExigidos;
      divisor =
        lecturas.divisorPeriodoCorto === 'coeficiente-rd-1799-1985'
          ? mesesExigidos * r('br-periodo-corto-coeficiente-divisor')
          : (mesesExigidos * r('br-ec-divisor')) / r('br-ec-meses');
      refsBR.push(
        refIP('br-periodo-corto-umbral-meses'),
        refIP('br-periodo-corto-coeficiente-divisor'),
      );
    }
    const d = basesDeVentana(
      ctx,
      entrada,
      {
        ventana,
        nBases: ventana,
        divisor,
        mesesNominales: r('br-ec-meses-nominales'),
        mesIndiceReferencia: r('br-ec-mes-indice-referencia'),
        integrarLaguna: integracionEnDosTramos(
          r('br-ec-lagunas-tramo1-meses'),
          r('br-ec-lagunas-tramo1-pct'),
          r('br-ec-lagunas-tramo2-pct'),
          [],
        ),
        refs: refsBR,
      },
      anio,
    );
    paso(
      'base-reguladora-bases',
      'Cociente de las bases de cotización',
      d.baseReguladora,
      'euros/mes',
      d.refs,
      origen === 'enfermedad-comun' ? 'art. 197.1.a) y 197.2 TRLGSS' : 'art. 197.3 TRLGSS',
      `${ventana} bases entre ${divisor.toFixed(4)}; ${d.lagunas} lagunas integradas.`,
    );
    br = d.baseReguladora;
    if (origen === 'enfermedad-comun' && !art1965) {
      // Porcentaje por años cotizados con los años que faltan hasta la edad ordinaria (art. 197.1.b).
      const cotProyectada = mesesCot + Math.max(0, params.edad65Meses - edadMeses);
      const edad =
        lecturas.edadFiccion === 'carrera-proyectada'
          ? edadOrdinaria(ctx, anio, cotProyectada)
          : {
              meses: valorEn(params.edadOrdinaria, anio).valor,
              refs: [valorEn(params.edadOrdinaria, anio).ref],
            };
      const fechaEdad = sumarMeses(nac, edad.meses);
      let faltan = compararFechas(fechaEdad, hc) > 0 ? mesesCumplidos(hc, fechaEdad) : 0;
      if (lecturas.computoFiccion === 'anios-completos') faltan = Math.floor(faltan / 12) * 12;
      const total = mesesCot + faltan;
      const v = versionEscala(params, anio);
      const pct =
        total < v.baseMeses ? r('br-ec-porcentaje-sin-15-anios') : porcentajeEscala(v, total);
      paso(
        'anios-hasta-edad',
        'Meses que faltan hasta la edad ordinaria (se consideran cotizados)',
        faltan,
        'meses',
        [refIP('br-ec-escala-con-anios-hasta-edad'), ...edad.refs],
        'art. 197.1.b) TRLGSS',
        `Edad ordinaria tomada: ${edad.meses} meses (${lecturas.edadFiccion}); cómputo: ${lecturas.computoFiccion}.`,
      );
      paso(
        'porcentaje-cotizacion',
        'Porcentaje por años de cotización (con los años añadidos)',
        pct,
        '%',
        [
          ref('escala-jubilacion-tramos', `${v.desde}-tramo1-pct`),
          refIP('br-ec-porcentaje-sin-15-anios'),
        ],
        'art. 197.1.b) y 210.1 TRLGSS',
        `${total} meses computados.`,
      );
      br = (br * pct) / 100;
    }
    paso('base-reguladora', 'Base reguladora', br, 'euros/mes', [], ART.br);
  }

  // 5. Porcentaje del grado e incremento de la total cualificada ------------------------------------------
  const pctGrado =
    grado === 'total'
      ? r('total-porcentaje')
      : grado === 'absoluta'
        ? r('absoluta-porcentaje')
        : r('gran-incapacidad-porcentaje');
  let pension: number;
  let pctAplicado = pctGrado;
  if (art1965) {
    // Art. 196.5: 67 o más años sin derecho a jubilación: porcentaje de la carencia de la jubilación.
    const v = versionEscala(params, anio);
    const carencia = valorEn(params.carencia, anio);
    pctAplicado = porcentajeEscala(v, carencia.valor);
    pension = (br * pctAplicado) / 100;
    paso(
      'porcentaje-196-5',
      'Porcentaje de la carencia de la jubilación (67 o más años)',
      pctAplicado,
      '%',
      [refIP('edad-ip-sin-jubilacion-meses'), carencia.ref],
      'art. 196.5 TRLGSS',
      'Sustituye al porcentaje del grado (lectura literal: véase REVISION_ACTUARIAL.md).',
    );
  } else {
    pension = (br * pctGrado) / 100;
    paso(
      'porcentaje-grado',
      `Porcentaje del grado (${grado})`,
      pctGrado,
      '%',
      [
        refIP(
          grado === 'total'
            ? 'total-porcentaje'
            : grado === 'absoluta'
              ? 'absoluta-porcentaje'
              : 'gran-incapacidad-porcentaje',
        ),
      ],
      grado === 'total'
        ? 'art. 15.2 Orden de 15/04/1969'
        : grado === 'absoluta'
          ? 'art. 17 Orden de 15/04/1969'
          : 'art. 18 Orden de 15/04/1969',
    );
  }
  let incremento = 0;
  if (grado === 'total') {
    const edadMin = r('total-cualificada-edad-minima-meses');
    const aplica = (opciones.totalCualificada ?? edadMeses >= edadMin) && edadMeses >= edadMin;
    if (aplica && trabaja) {
      paso(
        'total-cualificada-suspendida',
        'Incremento de la total cualificada en suspenso (trabaja)',
        0,
        'euros/mes',
        [refIP('total-cualificada-suspension-empleo')],
        'art. 6.Cuatro Decreto 1646/1972',
      );
    } else if (aplica) {
      incremento = (br * r('total-cualificada-pct')) / 100;
      paso(
        'total-cualificada',
        'Incremento de la total cualificada',
        incremento,
        'euros/mes',
        [
          refIP('total-cualificada-pct'),
          refIP('total-cualificada-edad-minima-meses'),
          refIP('total-cualificada-condiciones'),
        ],
        'art. 196.2 TRLGSS; art. 6 Decreto 1646/1972',
      );
      if (opciones.totalCualificada === undefined) {
        ctx.avisos.add(
          'Total cualificada: se presume la dificultad de obtener empleo por la edad (opciones.totalCualificada para indicarlo).',
        );
      }
    }
  }
  pension += incremento;

  // 6. Límite de pensión máxima (sin el complemento de gran incapacidad) ------------------------------------
  let estado: EstadoPension = 'contributiva';
  const maxima = ctx.pensionMaxima(anio);
  if ((opciones.aplicarPensionMaxima ?? true) && pension > maxima.valor) {
    const refsGI =
      grado === 'gran-incapacidad'
        ? [reglaGranIncapacidadDelAnio(params, anio, 'limite-sin-complemento').ref]
        : [];
    paso(
      'limite-maximo',
      'Límite de la pensión máxima',
      maxima.valor,
      'euros/mes',
      [...maxima.refs, ...refsGI],
      'art. 57 TRLGSS',
    );
    // Si el tope recorta la pensión, el incremento de la cualificada queda dentro del tope.
    incremento = Math.max(0, Math.min(incremento, maxima.valor - (pension - incremento)));
    pension = maxima.valor;
    estado = 'maxima';
  }

  // 7. Complemento de gran incapacidad (art. 196.4) -----------------------------------------------------
  let complementoGI = 0;
  if (grado === 'gran-incapacidad') {
    const bm = ctx.baseMinima(anio);
    let ultima = opciones.ultimaBaseCotizacion;
    if (ultima === undefined) {
      const meses = [...bases.keys()].filter((m) => m < mesHC);
      ultima = meses.length === 0 ? 0 : (bases.get(Math.max(...meses)) ?? 0);
      ctx.avisos.add(
        'Gran incapacidad: se toma como última base de cotización la del último mes cotizado de la carrera (opciones.ultimaBaseCotizacion).',
      );
    }
    const calculado =
      (r('gran-incapacidad-complemento-pct-base-minima') * bm.valor) / 100 +
      (r('gran-incapacidad-complemento-pct-ultima-base') * ultima) / 100;
    const minimo = (r('gran-incapacidad-complemento-minimo-pct') * pension) / 100;
    complementoGI = Math.max(calculado, minimo);
    paso(
      'complemento-gran-incapacidad',
      'Complemento de gran incapacidad',
      complementoGI,
      'euros/mes',
      [
        refIP('gran-incapacidad-complemento-pct-base-minima'),
        refIP('gran-incapacidad-complemento-pct-ultima-base'),
        refIP('gran-incapacidad-complemento-minimo-pct'),
        ...bm.refs,
      ],
      'art. 196.4 TRLGSS',
      calculado >= minimo
        ? `Base mínima ${bm.valor.toFixed(2)} y última base ${ultima.toFixed(2)} euros/mes.`
        : 'Se aplica el mínimo: 45 % de la pensión sin el complemento.',
    );
  }

  // 8. Suelo de la total por enfermedad común (art. 196.2, párrafo 3.º) -------------------------------------
  if (grado === 'total' && origen === 'enfermedad-comun') {
    const clase = textoIP(params, 'total-ec-suelo-clase-minima');
    const suelo = ctx.pensionMinimaAnual(anio, clase);
    const sueloMensual = suelo.valor / pagas;
    if (pension < sueloMensual) {
      paso(
        'suelo-total-ec',
        'Suelo de la total por enfermedad común',
        sueloMensual,
        'euros/mes',
        [refIP('total-ec-suelo-clase-minima'), ...suelo.refs],
        'art. 196.2, párrafo 3.º, TRLGSS',
        'No depende de las rentas.',
      );
      pension = sueloMensual;
      estado = 'minima';
    }
  }
  paso(
    'pension-contributiva',
    'Pensión contributiva por paga (sin complementos)',
    pension,
    'euros/mes',
    [],
    ART.prestaciones,
  );

  // 9. Complemento a mínimos (art. 59) --------------------------------------------------------------
  if (opciones.aplicarMinimos ?? true) {
    const situacion = claveSituacion(opciones);
    let clase: string | undefined;
    if (grado === 'gran-incapacidad') clase = 'ip-gran-invalidez';
    else if (grado === 'absoluta') clase = 'ip-absoluta';
    else if (edadMeses >= params.edad65MinimasMeses) clase = 'ip-total-65';
    else if (edadMeses >= r('minima-total-edad-60-meses')) clase = 'ip-total-60-64';
    else if (origen === 'enfermedad-comun') clase = 'ip-total-enf-comun-menor60';
    if (clase === undefined) {
      paso(
        'sin-minima',
        'Sin cuantía mínima para esta clase (total menor de 60 años no derivada de enfermedad común)',
        0,
        'euros/mes',
        [],
        'Anexo I de la norma de revalorización',
      );
    } else {
      const minima = ctx.pensionMinimaAnual(anio, `${clase}-${situacion}`);
      const limite = ctx.limiteIngresosMinimos(anio);
      const rentas = opciones.rentasAnuales ?? 0;
      const minimaMensual = minima.valor / pagas;
      // En la gran incapacidad, la mínima comprende la pensión y el complemento.
      const comparada = pension + complementoGI;
      const refsGI =
        grado === 'gran-incapacidad'
          ? [reglaGranIncapacidadDelAnio(params, anio, 'minimo-incluye-complemento').ref]
          : [];
      if (opciones.situacionFamiliar === 'conyuge-a-cargo' && rentas > 0) {
        ctx.avisos.add(
          'Complemento a mínimos con cónyuge a cargo y rentas: el límite de ingresos con cónyuge a cargo no está en /data; no se aplica el complemento (no implementada).',
        );
      } else if (rentas > limite.valor) {
        paso(
          'minimos-limite-ingresos',
          'Sin complemento a mínimos: rentas por encima del límite',
          limite.valor,
          'euros/año',
          limite.refs,
          'art. 59.1 TRLGSS',
        );
      } else if (comparada < minimaMensual) {
        paso(
          'complemento-minimos',
          'Complemento a mínimos',
          minimaMensual - comparada,
          'euros/mes',
          [...minima.refs, ...refsGI],
          'art. 59 TRLGSS',
          `Cuantía mínima anual ${minima.valor.toFixed(2)} euros (${clase}, ${situacion}).`,
        );
        pension = minimaMensual - complementoGI;
        estado = 'minima';
      }
    }
  }

  // 10. Complemento de brecha de género (art. 60) ----------------------------------------------------
  let brecha = 0;
  const hijos = opciones.hijos ?? 0;
  const tieneDerecho =
    opciones.sexo === 'mujer' ||
    (opciones.sexo === 'hombre' && opciones.hombreCumpleArt60 === true);
  if (hijos >= parametro(params.reglasBrecha, 'hijos-minimo', FRB) && tieneDerecho) {
    const importe = ctx.importeBrechaPorHijo(anio);
    const multiplo = parametro(params.reglasBrecha, 'hijos-maximo-multiplo', FRB);
    brecha = importe.valor * Math.min(hijos, multiplo);
    paso(
      'complemento-brecha',
      'Complemento para la reducción de la brecha de género',
      brecha,
      'euros/mes',
      [...importe.refs, ref(FRB, 'hijos-maximo-multiplo'), refIP('brecha-incluye-incapacidad')],
      'art. 60 TRLGSS',
    );
  }

  // 11. Trabajo (art. 198) -----------------------------------------------------------------------------
  let enSuspenso = 0;
  const pensionMensual = pension + complementoGI + brecha;
  if (trabaja && (grado === 'absoluta' || grado === 'gran-incapacidad')) {
    enSuspenso = pensionMensual - complementoGI;
    paso(
      'suspension-por-trabajo',
      'Importe en suspenso mientras trabaje',
      enSuspenso,
      'euros/mes',
      [
        refIP('compatibilidad-absoluta-suspension-desde'),
        refIP('compatibilidad-complemento-gi-no-se-suspende'),
      ],
      'art. 198.2 TRLGSS',
      'El complemento de gran incapacidad no se suspende.',
    );
  } else if (trabaja && grado === 'total') {
    paso(
      'compatibilidad-total',
      'Pensión compatible con el salario en funciones distintas',
      true,
      'indicador',
      [refIP('compatibilidad-total-salario')],
      'art. 198.1 TRLGSS',
    );
  }
  paso(
    'pension-final',
    'Pensión de incapacidad permanente inicial por paga',
    pensionMensual,
    'euros/mes',
    [],
    ART.prestaciones,
    `${pagas} pagas; importe anual ${(pensionMensual * pagas).toFixed(2)} euros.`,
  );

  return {
    ...vacio,
    cumpleRequisitos: cumple,
    estado,
    pensionMensual,
    pensionAnual: pensionMensual * pagas,
    complementoGranIncapacidad: complementoGI,
    incrementoTotalCualificada: incremento,
    importeEnSuspenso: enSuspenso,
    cantidadTantoAlzado: 0,
    baseReguladora: br,
    porcentajeGrado: pctAplicado,
    avisos: [...ctx.avisos],
  };
}

/**
 * Primer año de hecho causante que cubre el motor: el de la primera norma de revalorización con
 * reglas de la gran incapacidad en /data (las reglas del BOE se verificaron para esas fechas).
 */
export function desdeMotor(params: ParametrosIncapacidad): number {
  const anios = [...params.reglasIP.keys()]
    .map((k) => /^(\d{4})-gran-incapacidad-/.exec(k)?.[1])
    .filter((a): a is string => a !== undefined)
    .map(Number);
  return Math.min(...anios);
}
