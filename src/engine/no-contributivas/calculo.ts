/**
 * Pensiones no contributivas de jubilación y de incapacidad (arts. 363 a 372 TRLGSS), con desglose
 * por pasos. Todas las cifras legales salen de /data (`pnc-reglas`, `pnc-importe-anual`,
 * `pnc-complemento-alquiler`, `iprem-mensual`).
 *
 * Pasos: efectos económicos y año → requisitos (edad, residencia, discapacidad, carencia de
 * rentas) → cuantía por beneficiario de la unidad económica → reducción por rentas propias (35 %)
 * → reducción por el límite de acumulación → mínimo del 25 % → reducción por trabajo (art. 366) →
 * complemento de tercera persona → complemento de alquiler.
 */
import { NoImplementada } from '../jubilacion/errores.ts';
import {
  compararFechas,
  formatearFecha,
  parsearFecha,
  sumarMeses,
  type Fecha,
} from '../jubilacion/tiempo.ts';
import type { Paso, Requisito } from '../jubilacion/tipos.ts';
import { desdeMotorPNC, refPNC, reglaPNC, valorDelAnio, type ParametrosPNC } from './parametros.ts';
import {
  LECTURAS_PNC_POR_DEFECTO,
  type ClasePNC,
  type EstadoPNC,
  type LecturasPNC,
  type OpcionesPNC,
  type ResultadoPNC,
  type SolicitantePNC,
} from './tipos.ts';

function req(
  id: string,
  descripcion: string,
  cumple: boolean,
  valor: number,
  exigido: number,
  unidad: string,
  parametros: readonly string[],
  articulo: string,
): Requisito {
  return { id, descripcion, cumple, valor, exigido, unidad, parametros, articulo };
}

/** Primer día del mes siguiente al de la solicitud (arts. 365 y 371). */
function fechaEfectos(solicitud: Fecha): Fecha {
  const mes = solicitud.mes === 12 ? 1 : solicitud.mes + 1;
  const anio = solicitud.mes === 12 ? solicitud.anio + 1 : solicitud.anio;
  return { anio, mes, dia: 1 };
}

export function calcularPNCConParametros(
  params: ParametrosPNC,
  clase: ClasePNC,
  solicitante: SolicitantePNC,
  opciones: OpcionesPNC = {},
): ResultadoPNC {
  const lecturas: LecturasPNC = { ...LECTURAS_PNC_POR_DEFECTO, ...opciones.lecturasPNC };
  const nac = parsearFecha(solicitante.nacimiento);
  const sol = parsearFecha(solicitante.fechaSolicitud);
  if (compararFechas(sol, nac) <= 0) {
    throw new RangeError('La solicitud debe ser posterior al nacimiento');
  }
  const efectos = fechaEfectos(sol);
  const anio = opciones.anio ?? efectos.anio;
  const primero = desdeMotorPNC(params);
  if (anio < primero) {
    throw new NoImplementada(
      `Pensión no contributiva con efectos en ${anio}`,
      `El motor cubre años desde ${primero} (citas de /data comprobadas en las redacciones vigentes desde 2022).`,
    );
  }
  const r = (id: string): number => reglaPNC(params, id);
  const avisos = new Set<string>();
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
  const incapacidad = clase === 'incapacidad';
  const pagas = r('pagas-anuales');
  const importe = valorDelAnio(
    params.importeAnual,
    anio,
    'Cuantía anual de la pensión no contributiva',
  );
  const C = importe.valor;

  paso(
    'efectos',
    'Efectos económicos: primer día del mes siguiente al de la solicitud',
    formatearFecha(efectos),
    'fecha',
    [
      refPNC(
        incapacidad ? 'efectos-incapacidad-mes-siguiente' : 'efectos-jubilacion-mes-siguiente',
      ),
    ],
    incapacidad ? 'art. 365 TRLGSS' : 'art. 371 TRLGSS',
    `Se aplican las cuantías de ${anio}.`,
  );
  paso(
    'cuantia-integra',
    'Cuantía íntegra anual de la pensión',
    C,
    'euros/año',
    [importe.ref],
    'art. 364.1 TRLGSS; norma de revalorización del año',
  );

  // 1. Requisitos ---------------------------------------------------------------------------------
  const nacMas = (meses: number): Fecha => sumarMeses(nac, meses);
  const edadMeses = (() => {
    let n = (sol.anio - nac.anio) * 12 + (sol.mes - nac.mes);
    while (compararFechas(sumarMeses(nac, n), sol) > 0) n--;
    return n;
  })();
  if (incapacidad) {
    const minE = r('incapacidad-edad-minima-meses');
    const maxE = r('incapacidad-edad-maxima-meses');
    requisitos.push(
      req(
        'edad',
        'Mayor de 18 y menor de 65 años en la solicitud',
        compararFechas(nacMas(minE), sol) < 0 && compararFechas(sol, nacMas(maxE)) < 0,
        edadMeses,
        minE,
        'meses cumplidos',
        [refPNC('incapacidad-edad-minima-meses'), refPNC('incapacidad-edad-maxima-meses')],
        'art. 363.1.a) TRLGSS',
      ),
      req(
        'residencia',
        'Residencia legal en España durante cinco años',
        solicitante.residenciaLegalMeses >= r('incapacidad-residencia-total-meses'),
        solicitante.residenciaLegalMeses,
        r('incapacidad-residencia-total-meses'),
        'meses',
        [refPNC('incapacidad-residencia-total-meses')],
        'art. 363.1.b) TRLGSS',
      ),
      req(
        'residencia-reciente',
        'De ellos, dos años inmediatamente anteriores a la solicitud',
        solicitante.residenciaRecienteMeses >= r('incapacidad-residencia-reciente-meses'),
        solicitante.residenciaRecienteMeses,
        r('incapacidad-residencia-reciente-meses'),
        'meses',
        [refPNC('incapacidad-residencia-reciente-meses')],
        'art. 363.1.b) TRLGSS',
      ),
      req(
        'discapacidad',
        'Discapacidad o enfermedad crónica de al menos el 65 %',
        (solicitante.gradoDiscapacidad ?? 0) >= r('incapacidad-grado-minimo-pct'),
        solicitante.gradoDiscapacidad ?? 0,
        r('incapacidad-grado-minimo-pct'),
        '%',
        [refPNC('incapacidad-grado-minimo-pct')],
        'art. 363.1.c) TRLGSS',
      ),
    );
  } else {
    const minE = r('jubilacion-edad-minima-meses');
    requisitos.push(
      req(
        'edad',
        'Haber cumplido 65 años en la solicitud',
        compararFechas(nacMas(minE), sol) <= 0,
        edadMeses,
        minE,
        'meses cumplidos',
        [refPNC('jubilacion-edad-minima-meses')],
        'art. 369.1 TRLGSS',
      ),
      req(
        'residencia',
        'Residencia legal de diez años entre los 16 años y la edad de devengo',
        solicitante.residenciaLegalMeses >= r('jubilacion-residencia-total-meses'),
        solicitante.residenciaLegalMeses,
        r('jubilacion-residencia-total-meses'),
        'meses',
        [
          refPNC('jubilacion-residencia-total-meses'),
          refPNC('jubilacion-residencia-desde-edad-meses'),
        ],
        'art. 369.1 TRLGSS',
      ),
      req(
        'residencia-reciente',
        'De ellos, dos años consecutivos inmediatamente anteriores a la solicitud',
        solicitante.residenciaRecienteMeses >= r('jubilacion-residencia-reciente-meses'),
        solicitante.residenciaRecienteMeses,
        r('jubilacion-residencia-reciente-meses'),
        'meses',
        [refPNC('jubilacion-residencia-reciente-meses')],
        'art. 369.1 TRLGSS',
      ),
    );
  }

  const unidad = opciones.unidadEconomica ?? { convivientes: 1 };
  const n = unidad.convivientes;
  const B = unidad.beneficiarios ?? 1;
  if (!Number.isInteger(n) || n < 1)
    throw new RangeError('convivientes debe ser un entero de al menos 1');
  if (!Number.isInteger(B) || B < 1 || B > n)
    throw new RangeError('beneficiarios debe estar entre 1 y convivientes');
  if (solicitante.rentasAnuales < 0) throw new RangeError('Las rentas no pueden ser negativas');
  // Incapacidad con actividad en los cuatro primeros años: «salvo lo dispuesto en el artículo 366».
  const trabajoEnCuatroAnios =
    incapacidad &&
    opciones.trabajo !== undefined &&
    opciones.trabajo.mesesDesdeInicio <= r('compatibilidad-trabajo-anios-meses');
  const sustituye =
    trabajoEnCuatroAnios && lecturas.rentasConTrabajoEnCuatroAnios === 'sustituye-364-2';
  const rentas = sustituye
    ? Math.max(0, solicitante.rentasAnuales - (opciones.trabajo?.ingresosActividadAnuales ?? 0))
    : solicitante.rentasAnuales;
  const f = r('unidad-economica-limite-pct-convivientes') / 100;
  const factorAscDesc =
    unidad.convivenciaAscendientesDescendientes === true
      ? r('unidad-economica-ascendientes-descendientes-multiplo')
      : 1;
  const limite = n > 1 ? (C + f * C * (n - 1)) * factorAscDesc : 0;
  const rentasUnidad =
    (unidad.rentasUnidadAnuales ?? solicitante.rentasAnuales) -
    (solicitante.rentasAnuales - rentas);
  if (n > 1 && unidad.rentasUnidadAnuales === undefined) {
    avisos.add(
      'Unidad económica: no se han indicado las rentas de la unidad; se toman solo las del solicitante (opciones.unidadEconomica.rentasUnidadAnuales).',
    );
  }
  requisitos.push(
    req(
      'carencia-rentas',
      'Rentas propias inferiores a la cuantía anual de la pensión',
      rentas < C,
      rentas,
      C,
      'euros/año',
      [refPNC('rentas-insuficientes-menor-que-cuantia'), importe.ref],
      'art. 363.1.d) TRLGSS',
    ),
  );
  if (n > 1) {
    requisitos.push(
      req(
        'limite-acumulacion',
        'Rentas de la unidad económica inferiores al límite de acumulación de recursos',
        rentasUnidad < limite,
        rentasUnidad,
        limite,
        'euros/año',
        [
          refPNC('unidad-economica-limite-pct-convivientes'),
          refPNC('unidad-economica-ascendientes-descendientes-multiplo'),
          refPNC('unidad-economica-parentesco-grado'),
        ],
        'art. 363.1.d), 363.2 y 363.3 TRLGSS',
      ),
    );
    paso(
      'limite-acumulacion',
      'Límite de acumulación de recursos de la unidad económica',
      limite,
      'euros/año',
      [
        refPNC('unidad-economica-limite-pct-convivientes'),
        refPNC('unidad-economica-ascendientes-descendientes-multiplo'),
        importe.ref,
      ],
      'art. 363.2 y 363.3 TRLGSS',
      `${n} convivientes${factorAscDesc !== 1 ? ' con ascendientes o descendientes en primer grado' : ''}.`,
    );
  }
  const cumple = requisitos.every((q) => q.cumple);
  const base: Omit<
    ResultadoPNC,
    | 'estado'
    | 'pensionAnual'
    | 'complementoTerceraPersonaAnual'
    | 'complementoAlquilerAnual'
    | 'pensionMensual'
    | 'totalAnual'
    | 'reduccionPorRentas'
    | 'reduccionPorLimite'
    | 'reduccionPorTrabajo'
    | 'cuantiaPorBeneficiarioAnual'
  > = {
    clase,
    anioNormativa: anio,
    fechaEfectos: formatearFecha(efectos),
    cumpleRequisitos: cumple,
    requisitos,
    cuantiaIntegraAnual: C,
    limiteAcumulacionAnual: limite,
    pagas,
    pasos,
    avisos: [],
  };
  if (!cumple) {
    return {
      ...base,
      estado: 'no-causa-derecho',
      cuantiaPorBeneficiarioAnual: 0,
      reduccionPorRentas: 0,
      reduccionPorLimite: 0,
      reduccionPorTrabajo: 0,
      pensionAnual: 0,
      complementoTerceraPersonaAnual: 0,
      complementoAlquilerAnual: 0,
      pensionMensual: 0,
      totalAnual: 0,
      avisos: [...avisos],
    };
  }

  // 2. Cuantía por beneficiario y reducción por rentas propias --------------------------------------
  const porBenef = (C + f * C * (B - 1)) / B;
  paso(
    'cuantia-por-beneficiario',
    'Cuantía por beneficiario de la unidad económica',
    porBenef,
    'euros/año',
    [
      refPNC('cuantia-unidad-economica-pct'),
      refPNC('cuantia-unidad-economica-reparto-igual'),
      importe.ref,
    ],
    'art. 364.1 TRLGSS',
    `${B} beneficiario${B === 1 ? '' : 's'}.`,
  );
  const baseRentas = lecturas.baseRentasCompatibles === 'cuantia-integra' ? C : porBenef;
  const umbralRentas = (r('rentas-compatibles-pct') / 100) * baseRentas;
  const reduccionRentas = Math.max(0, rentas - umbralRentas);
  let pension = porBenef - reduccionRentas;
  paso(
    'reduccion-rentas',
    'Reducción por las rentas propias que exceden del 35 %',
    reduccionRentas,
    'euros/año',
    [refPNC('rentas-compatibles-pct')],
    'art. 364.2 TRLGSS',
    `Umbral ${umbralRentas.toFixed(2)} euros/año (lectura ${lecturas.baseRentasCompatibles}).`,
  );

  // 3. Límite de acumulación con personas no beneficiarias --------------------------------------------
  let reduccionLimite = 0;
  if (n > B) {
    const exceso = rentasUnidad + B * pension - limite;
    if (exceso > 0) {
      reduccionLimite = exceso / B;
      pension -= reduccionLimite;
    }
    if (B > 1)
      avisos.add(
        'Varios beneficiarios con personas no beneficiarias: se supone la misma pensión para todos los beneficiarios (art. 364.3).',
      );
    paso(
      'reduccion-limite',
      'Reducción por el límite de acumulación (convivencia con no beneficiarios)',
      reduccionLimite,
      'euros/año por beneficiario',
      [refPNC('reduccion-por-limite-acumulacion')],
      'art. 364.3 TRLGSS',
    );
  }

  // 4. Mínimo del 25 % -----------------------------------------------------------------------------
  const minimo = (r('cuantia-minima-pct') / 100) * C;
  let estado: EstadoPNC =
    reduccionRentas > 0 || reduccionLimite > 0 || porBenef < C ? 'reducida' : 'cuantia-integra';
  if (pension < minimo) {
    pension = minimo;
    estado = 'minimo-25';
    paso(
      'minimo-25',
      'Cuantía mínima: el 25 % de la cuantía íntegra',
      minimo,
      'euros/año',
      [refPNC('cuantia-minima-pct')],
      'art. 364.4 TRLGSS',
    );
  }

  // 5. Trabajo (art. 366, solo incapacidad) -------------------------------------------------------------
  let reduccionTrabajo = 0;
  if (opciones.trabajo !== undefined) {
    if (!incapacidad) {
      avisos.add(
        'El art. 366 (compatibilidad con el trabajo) solo regula la pensión de incapacidad: se ignora el trabajo en la de jubilación.',
      );
    } else if (opciones.trabajo.mesesDesdeInicio <= r('compatibilidad-trabajo-anios-meses')) {
      const iprem = valorDelAnio(params.iprem, anio, 'IPREM mensual');
      const limiteTrabajo =
        iprem.valor * 12 + (lecturas.limiteTrabajo === 'cuantia-integra' ? C : pension);
      const exceso = pension + opciones.trabajo.ingresosActividadAnuales - limiteTrabajo;
      if (exceso > 0) {
        reduccionTrabajo = Math.min(exceso, pension);
        pension -= reduccionTrabajo;
      }
      paso(
        'reduccion-trabajo',
        'Reducción por ingresos de la actividad en los cuatro primeros años',
        reduccionTrabajo,
        'euros/año',
        [
          refPNC('compatibilidad-trabajo-anios-meses'),
          refPNC('compatibilidad-trabajo-limite-iprem'),
          iprem.ref,
        ],
        'art. 366 TRLGSS',
        `Límite ${limiteTrabajo.toFixed(2)} euros/año (IPREM anual sin pagas extra más ${lecturas.limiteTrabajo === 'cuantia-integra' ? 'la cuantía íntegra' : 'la pensión reconocida'}).`,
      );
    }
  }

  // 6. Complemento de tercera persona (art. 364.6, solo incapacidad) ---------------------------------------
  let tercera = 0;
  if (
    incapacidad &&
    solicitante.necesitaTerceraPersona === true &&
    (solicitante.gradoDiscapacidad ?? 0) >= r('complemento-tercera-persona-grado-minimo-pct')
  ) {
    tercera = (r('complemento-tercera-persona-pct') / 100) * C;
    paso(
      'complemento-tercera-persona',
      'Complemento por necesitar el concurso de otra persona',
      tercera,
      'euros/año',
      [
        refPNC('complemento-tercera-persona-pct'),
        refPNC('complemento-tercera-persona-grado-minimo-pct'),
        ...(reduccionTrabajo > 0 ? [refPNC('compatibilidad-no-reduce-complemento')] : []),
      ],
      'art. 364.6 TRLGSS',
    );
  }

  // 7. Complemento de alquiler (RD 1191/2012) -----------------------------------------------------------
  let alquiler = 0;
  const a = opciones.alquiler;
  if (a !== undefined) {
    const ok =
      a.sinViviendaEnPropiedad &&
      a.titularDelContrato &&
      !a.arrendadorFamiliarOPareja &&
      a.mesesVigenciaContrato >= r('alquiler-contrato-minimo-meses') &&
      a.diasResidenciaEnLaVivienda >= r('alquiler-residencia-dias') &&
      a.otroPensionistaEsTitular !== true;
    if (ok) {
      const v = valorDelAnio(
        params.complementoAlquiler,
        anio,
        'Complemento de alquiler de vivienda',
      );
      alquiler = v.valor;
      paso(
        'complemento-alquiler',
        'Complemento de alquiler de vivienda',
        alquiler,
        'euros/año',
        [
          v.ref,
          refPNC('alquiler-sin-vivienda-propiedad'),
          refPNC('alquiler-titular-contrato'),
          refPNC('alquiler-arrendador-parentesco-grado'),
          refPNC('alquiler-contrato-minimo-meses'),
          refPNC('alquiler-residencia-dias'),
          refPNC('alquiler-un-titular-por-vivienda'),
        ],
        'RD 1191/2012; norma de revalorización del año',
        'Se informa aparte de la pensión (no se incluye en la paga mensual).',
      );
    } else
      avisos.add(
        'No se cumplen los requisitos del complemento de alquiler (RD 1191/2012, art. 2).',
      );
  }

  const total = pension + tercera + alquiler;
  paso(
    'pension-final',
    'Pensión no contributiva inicial',
    (pension + tercera) / pagas,
    'euros/mes por paga',
    [],
    incapacidad ? 'arts. 363 a 366 TRLGSS' : 'arts. 369 y 370 TRLGSS',
    `${pagas} pagas; pensión anual ${pension.toFixed(2)} euros${tercera > 0 ? ` más complemento de tercera persona ${tercera.toFixed(2)}` : ''}${alquiler > 0 ? ` más complemento de alquiler ${alquiler.toFixed(2)}` : ''}.`,
  );
  return {
    ...base,
    estado,
    cuantiaPorBeneficiarioAnual: porBenef,
    reduccionPorRentas: reduccionRentas,
    reduccionPorLimite: reduccionLimite,
    reduccionPorTrabajo: reduccionTrabajo,
    pensionAnual: pension,
    complementoTerceraPersonaAnual: tercera,
    complementoAlquilerAnual: alquiler,
    pensionMensual: (pension + tercera) / pagas,
    totalAnual: total,
    avisos: [...avisos],
  };
}

export function calcularPNCJubilacionConParametros(
  params: ParametrosPNC,
  solicitante: SolicitantePNC,
  opciones: OpcionesPNC = {},
): ResultadoPNC {
  return calcularPNCConParametros(params, 'jubilacion', solicitante, opciones);
}

export function calcularPNCInvalidezConParametros(
  params: ParametrosPNC,
  solicitante: SolicitantePNC,
  opciones: OpcionesPNC = {},
): ResultadoPNC {
  return calcularPNCConParametros(params, 'incapacidad', solicitante, opciones);
}
