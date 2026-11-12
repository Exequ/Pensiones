/**
 * Cálculo de la pensión de jubilación contributiva del Régimen General (TRLGSS).
 *
 * `calcularJubilacionConParametros` es la función de alto nivel: recibe la carrera, la fecha de
 * nacimiento, la fecha de jubilación (hecho causante), la modalidad y las opciones, y devuelve la
 * pensión mensual y anual (14 pagas) con un desglose en pasos. Todas las cifras legales salen de
 * `ParametrosJubilacion` (data/parametros); el motor no contiene ninguna.
 *
 * Convenciones:
 * - La normativa aplicable es la del año del hecho causante.
 * - La carrera se da por meses con base de cotización; un mes sin base es un mes sin obligación de cotizar.
 *   Se supone cotización efectiva (sin parte proporcional de pagas extraordinarias) en todos los meses.
 * - El «mes previo» al hecho causante no se computa (art. 209.1): la ventana empieza en el mes anterior.
 */
import { mesesCotizadosAntesDe, mesesCotizadosEntre, procesarCarrera } from './carrera.ts';
import {
  calcularBaseReguladora,
  reglaGeneral,
  reglaOpcion25,
  type DetalleBR,
} from './base-reguladora.ts';
import { crearContexto, type Contexto } from './contexto.ts';
import {
  aniosDePagoUnico,
  pagoUnicoPorAnio,
  porcentajeAdicional,
  REFS_DEMORA,
  repartoMixto,
  tiempoDemora,
} from './demora.ts';
import { NoImplementada } from './errores.ts';
import { parametro, ref, valorEn, type ParametrosJubilacion } from './parametros.ts';
import {
  coeficienteReductor,
  coeficienteSobreLimite,
  porcentajeEscala,
  tramoCotizacion,
  versionEscala,
} from './porcentajes.ts';
import {
  anioDeMes,
  compararFechas,
  mesAbsDe,
  mesesCumplidos,
  mesesHastaRedondeandoArriba,
  parsearFecha,
  sumarMeses,
  type Fecha,
} from './tiempo.ts';
import type {
  Carrera,
  EstadoPension,
  Modalidad,
  OpcionesJubilacion,
  Paso,
  Requisito,
  ResultadoJubilacion,
} from './tipos.ts';

const FRB = 'complemento-brecha-genero-reglas';
const FAN = 'jubilacion-anticipada-reglas';

interface LegalEdad {
  readonly meses: number;
  readonly usa65: boolean;
  readonly refs: readonly string[];
}

/** Edad ordinaria de jubilación del año (art. 205.1.a y DT 7.ª) según los meses cotizados. */
function edadLegal(ctx: Contexto, anio: number, mesesCotizados: number): LegalEdad {
  const p = ctx.params;
  const carrera = valorEn(p.carrera65, anio);
  const tabla = valorEn(p.edadOrdinaria, anio);
  if (mesesCotizados >= carrera.valor) {
    return {
      meses: p.edad65Meses,
      usa65: true,
      refs: [carrera.ref, ref('jubilacion-edad-65', '2013-carrera-larga-meses')],
    };
  }
  return { meses: tabla.valor, usa65: false, refs: [carrera.ref, tabla.ref] };
}

function claveSituacion(opciones: OpcionesJubilacion): string {
  return {
    unipersonal: 'unipersonal',
    'conyuge-a-cargo': 'conyuge-cargo',
    'conyuge-no-a-cargo': 'conyuge-no-cargo',
  }[opciones.situacionFamiliar ?? 'unipersonal'];
}

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

/** Fecha más temprana en que se cumple la edad ordinaria (con la carrera dada), a partir de los 60 años. */
export function fechaEdadOrdinaria(
  params: ParametrosJubilacion,
  carrera: Carrera,
  nacimiento: string,
  opciones: OpcionesJubilacion = {},
): string | undefined {
  const nac = parsearFecha(nacimiento);
  const ctx = crearContexto(params, opciones);
  const { bases } = procesarCarrera(carrera, ctx, opciones.topeBases ?? true);
  for (let k = 60 * 12; k <= 75 * 12; k++) {
    const f = sumarMeses(nac, k);
    if (mesesCumplidos(nac, f) !== k) continue; // 29-31 de un mes corto: se salta
    const legal = edadLegal(ctx, f.anio, mesesCotizadosAntesDe(bases, mesAbsDe(f)));
    if (k >= legal.meses)
      return `${f.anio}-${String(f.mes).padStart(2, '0')}-${String(f.dia).padStart(2, '0')}`;
  }
  return undefined;
}

export function calcularJubilacionConParametros(
  params: ParametrosJubilacion,
  carrera: Carrera,
  nacimiento: string,
  fechaJubilacion: string,
  modalidad: Modalidad,
  opciones: OpcionesJubilacion = {},
): ResultadoJubilacion {
  const nac = parsearFecha(nacimiento);
  const hc = parsearFecha(fechaJubilacion);
  if (compararFechas(hc, nac) <= 0)
    throw new RangeError('La jubilación debe ser posterior al nacimiento');
  const anio = hc.anio;
  const mesHC = mesAbsDe(hc);
  const ctx = crearContexto(params, opciones);
  const pagas = parametro(params.reglasBrecha, 'pagas-anuales', FRB);
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

  const escalaVersion = versionEscala(params, anio);
  if (modalidad !== 'ordinaria' && anio < params.coeficientesInvoluntaria.desde) {
    throw new NoImplementada(
      `Jubilación ${modalidad} con hecho causante en ${anio}`,
      `Los cuadros de /data rigen desde ${params.coeficientesInvoluntaria.desde}.`,
    );
  }

  // 1. Carrera -------------------------------------------------------------------------------------
  const topeBases = opciones.topeBases ?? true;
  const carreraP = procesarCarrera(carrera, ctx, topeBases);
  const bases = carreraP.bases;
  const mesesCot = mesesCotizadosAntesDe(bases, mesHC);
  const edadMeses = mesesCumplidos(nac, hc);
  paso(
    'meses-cotizados',
    'Meses cotizados hasta el hecho causante',
    mesesCot,
    'meses',
    [],
    'art. 205.1 TRLGSS',
    'Años y meses completos, sin parte proporcional de pagas extraordinarias.',
  );
  if (carreraP.mesesTopados > 0) {
    ctx.avisos.add(
      `${carreraP.mesesTopados} meses con base superior a la base máxima: se han reducido a la base máxima de cada mes.`,
    );
  }

  // 2. Requisitos generales: carencia y periodo previo -----------------------------------------------------
  const carencia = valorEn(params.carencia, anio);
  const previoDesde = mesHC - params.periodoPrevioVentana;
  const mesesPrevio = mesesCotizadosEntre(bases, previoDesde, mesHC - 1);
  requisitos.push(
    req(
      'carencia',
      'Periodo mínimo de cotización',
      mesesCot,
      carencia.valor,
      'meses cotizados',
      [carencia.ref],
      'art. 205.1.b) TRLGSS',
    ),
    req(
      'periodo-previo',
      'Cotización en los años inmediatamente anteriores',
      mesesPrevio,
      params.periodoPrevioMeses,
      'meses cotizados en la ventana',
      [
        ref('jubilacion-periodo-previo', '2013-meses-minimos'),
        ref('jubilacion-periodo-previo', '2013-ventana-meses'),
      ],
      'art. 205.1.b) TRLGSS',
    ),
  );

  // 3. Edad y requisitos de cada modalidad ----------------------------------------------------------------
  const legalReal = edadLegal(ctx, anio, mesesCot);
  const faltaHasta65 = Math.max(0, params.edad65Meses - edadMeses);
  const legalProyectada = edadLegal(ctx, anio, mesesCot + faltaHasta65);
  const reglasAn = params.reglasAnticipada;
  let legal: LegalEdad = legalReal;
  let anticipo = 0;
  let coefTabla: 'voluntaria' | 'involuntaria' | undefined;

  if (modalidad === 'ordinaria') {
    requisitos.push(
      req(
        'edad',
        'Edad ordinaria de jubilación',
        edadMeses,
        legalReal.meses,
        'meses de edad',
        legalReal.refs,
        'art. 205.1.a) y DT 7.ª TRLGSS',
      ),
    );
  } else if (modalidad === 'demorada') {
    requisitos.push(
      req(
        'edad',
        'Edad superior a la ordinaria',
        edadMeses,
        legalReal.meses + 1,
        'meses de edad',
        legalReal.refs,
        'art. 210.2 TRLGSS',
      ),
    );
  } else if (modalidad === 'anticipada-voluntaria' || modalidad === 'anticipada-involuntaria') {
    legal = legalProyectada;
    const fechaLegal = sumarMeses(nac, legal.meses);
    anticipo = mesesHastaRedondeandoArriba(hc, fechaLegal);
    const vol = modalidad === 'anticipada-voluntaria';
    const prefijo = vol ? 'voluntaria' : 'involuntaria';
    const maximo = parametro(reglasAn, `${prefijo}-anticipo-maximo-meses`, FAN);
    const art = vol ? 'art. 208.1 TRLGSS' : 'art. 207.1 TRLGSS';
    requisitos.push(
      req(
        'anticipacion',
        'Anticipación respecto de la edad ordinaria (más de cero meses)',
        anticipo,
        1,
        'meses',
        legal.refs,
        art,
      ),
      req(
        'edad',
        `Anticipación máxima de ${maximo} meses`,
        maximo - anticipo,
        0,
        'meses de margen',
        [ref(FAN, `${prefijo}-anticipo-maximo-meses`), ...legal.refs],
        art + '.a)',
      ),
      req(
        'cotizacion-efectiva',
        'Cotización efectiva mínima',
        mesesCot,
        parametro(reglasAn, `${prefijo}-cotizacion-efectiva-meses`, FAN),
        'meses cotizados',
        [ref(FAN, `${prefijo}-cotizacion-efectiva-meses`)],
        art + (vol ? '.b)' : '.c)'),
      ),
    );
    if (!vol) {
      const exigidos = parametro(reglasAn, 'involuntaria-demandante-empleo-meses', FAN);
      requisitos.push(
        req(
          'demandante-empleo',
          'Inscripción como demandante de empleo',
          opciones.mesesDemandanteEmpleo ?? exigidos,
          exigidos,
          'meses',
          [ref(FAN, 'involuntaria-demandante-empleo-meses')],
          'art. 207.1.b) TRLGSS',
        ),
        req(
          'causa-cese',
          'Cese por una causa no imputable al trabajador',
          (opciones.ceseCausaTasada ?? true) ? 1 : 0,
          1,
          'indicador',
          [],
          'art. 207.1.d) TRLGSS',
        ),
      );
      if (opciones.mesesDemandanteEmpleo === undefined || opciones.ceseCausaTasada === undefined) {
        ctx.avisos.add(
          'No se ha indicado la demanda de empleo ni la causa del cese: se suponen cumplidas (opciones.mesesDemandanteEmpleo, opciones.ceseCausaTasada).',
        );
      }
    }
    coefTabla = vol ? 'voluntaria' : 'involuntaria';
    if (
      vol &&
      (opciones.mesesSubsidioDesempleo ?? 0) >=
        parametro(reglasAn, 'voluntaria-subsidio-desempleo-meses', FAN)
    ) {
      coefTabla = 'involuntaria';
      paso(
        'voluntaria-con-subsidio',
        'Coeficientes de la involuntaria por subsidio de desempleo',
        true,
        'indicador',
        [ref(FAN, 'voluntaria-subsidio-desempleo-meses')],
        'art. 208.3 TRLGSS',
      );
    }
  } else {
    // parcial
    const par = opciones.parcial;
    if (par === undefined) throw new RangeError('La jubilación parcial exige opciones.parcial');
    const minPct = parametro(reglasAn, 'parcial-reduccion-jornada-minima-pct', FAN);
    const maxPct = parametro(reglasAn, 'parcial-reduccion-jornada-maxima-pct', FAN);
    requisitos.push(
      req(
        'reduccion-jornada',
        `Reducción de jornada entre ${minPct} y ${maxPct} %`,
        par.reduccionJornadaPct,
        minPct,
        '%',
        [
          ref(FAN, 'parcial-reduccion-jornada-minima-pct'),
          ref(FAN, 'parcial-reduccion-jornada-maxima-pct'),
        ],
        'art. 215.1 TRLGSS',
        par.reduccionJornadaPct >= minPct && par.reduccionJornadaPct <= maxPct,
      ),
    );
    if (!par.conRelevo) {
      requisitos.push(
        req(
          'edad',
          'Edad ordinaria de jubilación (sin relevo)',
          edadMeses,
          legalReal.meses,
          'meses de edad',
          legalReal.refs,
          'art. 215.1 TRLGSS',
        ),
      );
    } else {
      legal = legalProyectada;
      anticipo = mesesHastaRedondeandoArriba(hc, sumarMeses(nac, legal.meses));
      const maxAnt = parametro(reglasAn, 'parcial-relevo-anticipo-maximo-meses', FAN);
      const cotizacion = parametro(
        reglasAn,
        par.discapacidad33 === true
          ? 'parcial-relevo-cotizacion-discapacidad-meses'
          : 'parcial-relevo-cotizacion-meses',
        FAN,
      );
      const antig = parametro(reglasAn, 'parcial-relevo-antiguedad-empresa-meses', FAN);
      requisitos.push(
        req(
          'edad',
          `Anticipación máxima de ${maxAnt} meses (con relevo)`,
          maxAnt - anticipo,
          0,
          'meses de margen',
          [ref(FAN, 'parcial-relevo-anticipo-maximo-meses'), ...legal.refs],
          'art. 215.2.a) TRLGSS',
        ),
        req(
          'cotizacion-efectiva',
          'Cotización mínima (con relevo)',
          mesesCot,
          cotizacion,
          'meses cotizados',
          [ref(FAN, 'parcial-relevo-cotizacion-meses')],
          'art. 215.2.a) TRLGSS',
        ),
        req(
          'antiguedad-empresa',
          'Antigüedad en la empresa (con relevo)',
          par.antiguedadEmpresaMeses ?? 0,
          antig,
          'meses',
          [ref(FAN, 'parcial-relevo-antiguedad-empresa-meses')],
          'art. 215.2.b) TRLGSS',
        ),
      );
    }
  }
  paso(
    'edad-legal',
    'Edad ordinaria de jubilación aplicable',
    legal.meses,
    'meses de edad',
    legal.refs,
    'art. 205.1.a) y DT 7.ª TRLGSS',
    legal.usa65
      ? 'Carrera suficiente para jubilarse a los 65 años ese año.'
      : 'Carrera inferior a la que permite jubilarse a los 65 años ese año.',
  );

  // 4. Base reguladora y porcentaje (también si no cumple, para informar) ------------------------------------
  const dt41Desde = Math.min(...[...params.lagunasBrecha.keys()].map((k) => Number(k.slice(0, 4))));
  const reforzada =
    anio >= dt41Desde &&
    (opciones.integracionReforzadaLagunas ??
      (opciones.sexo === 'mujer' ||
        (opciones.sexo === 'hombre' && opciones.hombreCumpleArt60 === true)));
  const general = reglaGeneral(ctx, anio, reforzada);
  const primeraVentana = valorEn(params.opcion25Ventana, params.opcion25Ventana.primero).valor;
  const ultimoAnioBase = Math.max(
    ...[...params.opcion25Ventana.valores].filter(([, v]) => v === primeraVentana).map(([a]) => a),
  );
  const esUltimoDiaBase = hc.anio === ultimoAnioBase && hc.mes === 12 && hc.dia === 31;
  const op25 =
    (opciones.usarOpcion25Anos ?? true) ? reglaOpcion25(ctx, anio, esUltimoDiaBase) : undefined;
  const entradaBR = {
    bases,
    primerMesAlta: carreraP.primerMes,
    mesHechoCausante: mesHC,
    actualizar: opciones.actualizarBases ?? true,
  };
  const brGeneral = calcularBaseReguladora(ctx, entradaBR, general, anio);
  const brOpcion25: DetalleBR | undefined = op25
    ? calcularBaseReguladora(ctx, entradaBR, op25, anio)
    : undefined;
  const mejor =
    brOpcion25 !== undefined && brOpcion25.baseReguladora > brGeneral.baseReguladora
      ? brOpcion25
      : brGeneral;
  const br = mejor.baseReguladora;
  paso(
    'periodo-calculo',
    'Regla general: bases de mayor importe de la ventana, entre el divisor',
    `${general.nBases} bases de ${general.ventana} meses ÷ ${general.divisor}`,
    'regla',
    brGeneral.refs,
    'art. 209.1 y DT 8.ª y 40.ª TRLGSS',
    `${brGeneral.mesesConBase} meses con base y ${brGeneral.lagunas} lagunas en la ventana.`,
  );
  paso(
    'base-reguladora-general',
    'Base reguladora (regla general)',
    brGeneral.baseReguladora,
    'euros/mes',
    brGeneral.refs,
    'art. 209.1 TRLGSS',
  );
  if (brOpcion25) {
    paso(
      'base-reguladora-opcion-25',
      'Base reguladora (opción de 25 años)',
      brOpcion25.baseReguladora,
      'euros/mes',
      brOpcion25.refs,
      'DT 4.ª.7 TRLGSS',
      `${brOpcion25.regla.ventana} meses ÷ ${brOpcion25.regla.divisor}`,
    );
  }
  paso(
    'base-reguladora',
    'Base reguladora aplicada',
    br,
    'euros/mes',
    mejor.refs,
    mejor.regla.id === 'general' ? 'art. 209.1 TRLGSS' : 'DT 4.ª.7 TRLGSS',
    mejor.regla.id === 'general' ? 'Regla general.' : 'La opción de 25 años resulta más favorable.',
  );

  let pct = porcentajeEscala(escalaVersion, mesesCot);
  const refEscala = [
    ref('escala-jubilacion-tramos', `${escalaVersion.desde}-tramo1-pct`),
    ref('escala-jubilacion-tramos', `${escalaVersion.desde}-base-pct`),
  ];
  paso(
    'porcentaje',
    'Porcentaje de la base reguladora por meses cotizados',
    pct,
    '%',
    refEscala,
    'art. 210.1 y DT 9.ª TRLGSS',
  );

  // 5. Si no causa derecho, se devuelve el resultado vacío ----------------------------------------------------
  const cumple = requisitos.every((r) => r.cumple);
  const baseVacia = {
    modalidad,
    fechaJubilacion,
    anioNormativa: anio,
    requisitos,
    pagas,
    edadMeses,
    mesesCotizados: mesesCot,
    baseReguladora: br,
    porcentaje: pct,
    pasos,
  };
  if (!cumple && opciones.calcularAunqueNoCumpla !== true) {
    return {
      ...baseVacia,
      cumpleRequisitos: false,
      estado: 'no-causa-derecho',
      pensionMensual: 0,
      pensionAnual: 0,
      pagoUnicoDemora: 0,
      cantidadAnualDemora: 0,
      avisos: [...ctx.avisos],
    };
  }

  // 6. Pensión por modalidad ---------------------------------------------------------------------------------
  const aplicarMax = opciones.aplicarPensionMaxima ?? true;
  const maxima = ctx.pensionMaxima(anio);
  let pension = (br * pct) / 100;
  let estado = 'contributiva' as EstadoPension;
  let pagoUnico = 0;
  let cantidadAnual = 0;
  const limiteMensual = aplicarMax ? maxima.valor : Number.POSITIVE_INFINITY;
  const topar = (
    valor: number,
    tope: number,
    id: string,
    titulo: string,
    articulo: string,
    refs: readonly string[],
  ): number => {
    if (valor > tope) {
      estado = 'maxima';
      paso(
        id,
        titulo,
        tope,
        'euros/mes',
        refs,
        articulo,
        `La pensión calculada (${valor.toFixed(2)}) supera el límite.`,
      );
      return tope;
    }
    return valor;
  };

  if (modalidad === 'ordinaria') {
    pension = topar(
      pension,
      limiteMensual,
      'limite-maximo',
      'Límite de la pensión máxima',
      'art. 57 TRLGSS',
      maxima.refs,
    );
  } else if (modalidad === 'anticipada-voluntaria' || modalidad === 'anticipada-involuntaria') {
    const tabla =
      coefTabla === 'involuntaria'
        ? params.coeficientesInvoluntaria
        : params.coeficientesVoluntaria;
    const coef = coeficienteReductor(tabla, anticipo, mesesCot);
    if (modalidad === 'anticipada-voluntaria' && coefTabla === 'voluntaria') {
      if (pension > limiteMensual) {
        const sobreLimite = coeficienteSobreLimite(params, anio, anticipo, mesesCot);
        paso(
          'coeficiente-sobre-limite',
          'Coeficiente reductor sobre el límite de pensión',
          sobreLimite.pct,
          '%',
          [sobreLimite.ref],
          'art. 210.3, párrafo 2.º, y DT 34.ª TRLGSS',
          `${anticipo} meses de anticipación, tramo de cotización ${sobreLimite.tramo}.`,
        );
        pension = limiteMensual * (1 - sobreLimite.pct / 100);
        estado = 'maxima';
      } else {
        paso(
          'coeficiente-reductor',
          'Coeficiente reductor por anticipación',
          coef.pct,
          '%',
          [coef.ref],
          'art. 208.2 TRLGSS',
          `${anticipo} meses de anticipación, tramo de cotización ${coef.tramo}.`,
        );
        pension = pension * (1 - coef.pct / 100);
      }
    } else {
      paso(
        'coeficiente-reductor',
        'Coeficiente reductor por anticipación',
        coef.pct,
        '%',
        [coef.ref],
        coefTabla === 'involuntaria' && modalidad === 'anticipada-voluntaria'
          ? 'art. 208.3 y 207.2 TRLGSS'
          : 'art. 207.2 TRLGSS',
        `${anticipo} meses de anticipación, tramo de cotización ${coef.tramo}.`,
      );
      pension = pension * (1 - coef.pct / 100);
      const trimestres = Math.ceil(anticipo / 3);
      const pctTrim = parametro(reglasAn, 'involuntaria-tope-pension-pct-trimestre', FAN);
      const tope = limiteMensual * (1 - (pctTrim * trimestres) / 100);
      paso(
        'tope-trimestres',
        'Tope de pensión reducido por trimestre de anticipación',
        tope,
        'euros/mes',
        [ref(FAN, 'involuntaria-tope-pension-pct-trimestre'), ...maxima.refs],
        'art. 210.4 TRLGSS',
        `${trimestres} trimestres o fracción.`,
      );
      pension = topar(
        pension,
        tope,
        'limite-maximo',
        'Límite de la pensión máxima reducido',
        'art. 210.4 TRLGSS',
        maxima.refs,
      );
    }
  } else if (modalidad === 'demorada') {
    const legalDate = fechaEdadOrdinaria(params, carrera, nacimiento, opciones);
    if (legalDate === undefined)
      throw new RangeError('No se cumple la edad ordinaria con la carrera dada');
    const fl = parsearFecha(legalDate);
    const elapsed = Math.max(0, mesesCumplidos(fl, hc));
    const cotizadosDemora = mesesCotizadosEntre(bases, mesAbsDe(fl), mesHC - 1);
    const t = tiempoDemora(
      params.reglasDemora,
      Math.min(elapsed, cotizadosDemora),
      ctx.lecturas.fraccionDemora,
    );
    const mesesALaEdad = mesesCotizadosAntesDe(bases, mesAbsDe(fl));
    requisitos.push(
      req(
        'carencia-a-la-edad-ordinaria',
        'Periodo mínimo cumplido al alcanzar la edad ordinaria',
        mesesALaEdad,
        carencia.valor,
        'meses cotizados',
        [carencia.ref],
        'art. 210.2 TRLGSS',
      ),
      req(
        'demora',
        'Al menos un año completo cotizado tras la edad ordinaria',
        t.aniosCompletos,
        1,
        'años completos',
        [],
        'art. 210.2.a) TRLGSS',
      ),
    );
    if (!requisitos.every((r) => r.cumple)) {
      return {
        ...baseVacia,
        cumpleRequisitos: false,
        estado: 'no-causa-derecho',
        pensionMensual: 0,
        pensionAnual: 0,
        pagoUnicoDemora: 0,
        cantidadAnualDemora: 0,
        avisos: [...ctx.avisos],
      };
    }
    paso(
      'demora-tiempo',
      'Meses cotizados desde la edad ordinaria',
      t.meses,
      'meses',
      [],
      'art. 210.2 TRLGSS',
      `${t.aniosCompletos} años completos${t.fraccionComputable ? ' y una fracción de más de 6 meses' : ''}.`,
    );
    const opcion = opciones.demora?.opcion ?? 'porcentaje';
    const pensionBase = (br * pct) / 100;
    if (opcion === 'porcentaje') {
      const adicional = porcentajeAdicional(params.reglasDemora, t);
      paso(
        'demora-porcentaje-adicional',
        'Porcentaje adicional por demora',
        adicional,
        '%',
        REFS_DEMORA.porcentaje,
        'art. 210.2.a) TRLGSS',
      );
      const total = pct + adicional;
      pct = total;
      const teorica = (br * total) / 100;
      pension = topar(
        teorica,
        limiteMensual,
        'limite-maximo',
        'Límite de la pensión máxima',
        'art. 210.2.a) y 57 TRLGSS',
        maxima.refs,
      );
      if (estado === 'maxima' && adicional > 0) {
        const usado =
          pensionBase >= limiteMensual || br <= 0
            ? 0
            : Math.min(adicional, (limiteMensual / br) * 100 - (total - adicional));
        const noUsado = Math.max(0, adicional - Math.max(0, usado));
        const anual = Math.ceil(limiteMensual * pagas * (noUsado / 100));
        const tope = ctx.baseMaxima(anio).valor * 12 - pension * pagas;
        cantidadAnual = Math.max(0, Math.min(anual, tope));
        paso(
          'demora-cantidad-anual',
          'Cantidad anual por el porcentaje adicional no utilizado',
          cantidadAnual,
          'euros/año',
          [...REFS_DEMORA.porcentaje, ...maxima.refs],
          'art. 210.2.a), párrafo 4.º, TRLGSS',
          `Porcentaje adicional no utilizado: ${noUsado.toFixed(2)} %.`,
        );
      }
    } else if (opcion === 'tanto-alzado') {
      const anual = Math.min(pensionBase, limiteMensual) * pagas;
      const unico = pagoUnicoPorAnio(params.reglasDemora, anual, mesesALaEdad);
      pagoUnico = unico * aniosDePagoUnico(params.reglasDemora, t);
      pension = topar(
        pensionBase,
        limiteMensual,
        'limite-maximo',
        'Límite de la pensión máxima',
        'art. 57 TRLGSS',
        maxima.refs,
      );
      paso(
        'demora-pago-unico',
        'Cantidad a tanto alzado por la demora (pago único)',
        pagoUnico,
        'euros',
        REFS_DEMORA.tantoAlzado,
        'art. 210.2.b) TRLGSS y art. 2 RD 371/2023',
        `${unico.toFixed(2)} euros por año completo.`,
      );
    } else {
      const desde = parametro(
        params.reglasDemora,
        'mixta-vigencia-desde',
        'jubilacion-demora-reglas',
      );
      const fecha = hc.anio * 10000 + hc.mes * 100 + hc.dia;
      if (fecha < desde) {
        throw new NoImplementada(
          'Opción mixta de la demora con hecho causante anterior a 2026-08-28',
          'Rige la redacción original del RD 371/2023, no transcrita en /data.',
        );
      }
      const reparto = repartoMixto(params.reglasDemora, t.meses);
      if (!reparto)
        throw new RangeError(
          'La opción mixta exige al menos dos años completos cotizados tras la edad ordinaria',
        );
      const adicional =
        parametro(params.reglasDemora, 'porcentaje-adicional-anual', 'jubilacion-demora-reglas') *
          reparto.aniosPorcentaje +
        (reparto.tramo === 2 && reparto.semestre
          ? parametro(
              params.reglasDemora,
              'porcentaje-adicional-semestre',
              'jubilacion-demora-reglas',
            )
          : 0);
      pct = pct + adicional;
      pension = topar(
        (br * pct) / 100,
        limiteMensual,
        'limite-maximo',
        'Límite de la pensión máxima',
        'art. 57 TRLGSS',
        maxima.refs,
      );
      const anual = Math.min(pension, limiteMensual) * pagas;
      const unico = pagoUnicoPorAnio(params.reglasDemora, anual, mesesALaEdad);
      const aniosTA =
        reparto.aniosTantoAlzado +
        (reparto.tramo === 1 && reparto.semestre
          ? parametro(
              params.reglasDemora,
              'tanto-alzado-factor-semestre',
              'jubilacion-demora-reglas',
            )
          : 0);
      pagoUnico = unico * aniosTA;
      paso(
        'demora-mixta',
        'Opción mixta: porcentaje adicional y pago único',
        adicional,
        '%',
        REFS_DEMORA.mixta,
        'art. 3 RD 371/2023',
        `${reparto.aniosPorcentaje} años a porcentaje, ${aniosTA} a tanto alzado (${pagoUnico.toFixed(2)} euros).`,
      );
    }
  } else {
    const par = opciones.parcial;
    const reduccion = (par?.reduccionJornadaPct ?? 0) / 100;
    pension =
      topar(
        pension,
        limiteMensual,
        'limite-maximo',
        'Límite de la pensión máxima',
        'art. 57 TRLGSS',
        maxima.refs,
      ) * reduccion;
    paso(
      'parcial-reduccion',
      'Pensión proporcional a la reducción de jornada',
      pension,
      'euros/mes',
      [ref(FAN, 'parcial-reduccion-jornada-minima-pct')],
      'art. 215 TRLGSS; art. 12 RD 1131/2002',
      'Sin coeficientes reductores por edad.',
    );
  }
  if (modalidad === 'anticipada-voluntaria') {
    const min65 = ctx.pensionMinimaAnual(anio, `jub65-${claveSituacion(opciones)}`);
    requisitos.push(
      req(
        'pension-superior-a-la-minima',
        'La pensión reducida supera la mínima que correspondería a los 65 años',
        pension * pagas,
        min65.valor,
        'euros/año',
        min65.refs,
        'art. 208.1.c) TRLGSS',
        pension * pagas > min65.valor,
      ),
    );
    if (!requisitos.every((r) => r.cumple) && opciones.calcularAunqueNoCumpla !== true) {
      return {
        ...baseVacia,
        cumpleRequisitos: false,
        estado: 'no-causa-derecho',
        pensionMensual: 0,
        pensionAnual: 0,
        pagoUnicoDemora: 0,
        cantidadAnualDemora: 0,
        avisos: [...ctx.avisos],
      };
    }
  }
  paso(
    'pension-contributiva',
    'Pensión contributiva por paga',
    pension,
    'euros/mes',
    [],
    'art. 210 TRLGSS',
  );

  // 7. Complemento a mínimos (art. 59) ----------------------------------------------------------------------------
  if (opciones.aplicarMinimos ?? true) {
    const situacion = claveSituacion(opciones);
    const clase = edadMeses >= params.edad65MinimasMeses ? 'jub65' : 'jub-menor65';
    const minima = ctx.pensionMinimaAnual(anio, `${clase}-${situacion}`);
    const limite = ctx.limiteIngresosMinimos(anio);
    const rentas = opciones.rentasAnuales ?? 0;
    const factor = modalidad === 'parcial' ? (opciones.parcial?.reduccionJornadaPct ?? 0) / 100 : 1;
    const minimaMensual = (minima.valor / pagas) * factor;
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
    } else if (pension < minimaMensual) {
      paso(
        'complemento-minimos',
        'Complemento a mínimos',
        minimaMensual - pension,
        'euros/mes',
        minima.refs,
        'art. 59 TRLGSS',
        `Cuantía mínima anual ${minima.valor.toFixed(2)} euros (${clase}, ${situacion}).`,
      );
      pension = minimaMensual;
      estado = 'minima';
    }
  }

  // 8. Complemento de brecha de género (art. 60) ------------------------------------------------------------------
  let complemento = 0;
  const hijos = opciones.hijos ?? 0;
  const tieneDerecho =
    opciones.sexo === 'mujer' ||
    (opciones.sexo === 'hombre' && opciones.hombreCumpleArt60 === true);
  if (
    hijos >= parametro(params.reglasBrecha, 'hijos-minimo', FRB) &&
    tieneDerecho &&
    modalidad !== 'parcial'
  ) {
    const importe = ctx.importeBrechaPorHijo(anio);
    const multiplo = parametro(params.reglasBrecha, 'hijos-maximo-multiplo', FRB);
    complemento = importe.valor * Math.min(hijos, multiplo);
    paso(
      'complemento-brecha',
      'Complemento para la reducción de la brecha de género',
      complemento,
      'euros/mes',
      [...importe.refs, ref(FRB, 'hijos-maximo-multiplo')],
      'art. 60 TRLGSS',
      `${Math.min(hijos, multiplo)} hijos computables; no cuenta para el límite de pensión máxima y se suma a la mínima.`,
    );
  }

  const pensionMensual = pension + complemento;
  const pensionAnual = pensionMensual * pagas + cantidadAnual;
  paso(
    'pension-final',
    'Pensión de jubilación inicial por paga',
    pensionMensual,
    'euros/mes',
    [],
    'art. 205 y ss. TRLGSS',
    `${pagas} pagas; importe anual ${pensionAnual.toFixed(2)} euros.`,
  );

  return {
    ...baseVacia,
    porcentaje: pct,
    cumpleRequisitos: requisitos.every((r) => r.cumple),
    estado,
    pensionMensual,
    pensionAnual,
    pagoUnicoDemora: pagoUnico,
    cantidadAnualDemora: cantidadAnual,
    avisos: [...ctx.avisos],
  };
}

/** Año de un mes absoluto (reexportado para los tests). */
export const anioDe = anioDeMes;
export { tramoCotizacion };
export type { Fecha };
