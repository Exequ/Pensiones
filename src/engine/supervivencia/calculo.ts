/**
 * Prestaciones de muerte y supervivencia contributivas del Régimen General (arts. 216 a 229
 * TRLGSS y normativa de desarrollo), con desglose por pasos. Todas las cifras legales salen de
 * /data (`supervivencia-reglas`, `smi-anual` y los parámetros de la jubilación).
 *
 * Pasos: causante (periodo previo y base reguladora) → viudedad (beneficiarios, prestación
 * temporal, porcentaje del 52, 60 o 70 %, pensión máxima, reparto entre varios beneficiarios y
 * pensión compensatoria) → orfandad (edad, 20 % e incremento de la orfandad absoluta) → favor de
 * familiares (requisitos por parentesco, 20 % e incremento) → límite conjunto del art. 229 → mínimos
 * → complemento de brecha (viudedad). La revalorización está en `revalorizacion.ts`.
 */
import { crearContexto, type Contexto } from '../jubilacion/contexto.ts';
import { DatoNoDisponible, NoImplementada } from '../jubilacion/errores.ts';
import { parametro, ref, valorEn } from '../jubilacion/parametros.ts';
import { compararFechas, mesesCumplidos, parsearFecha, type Fecha } from '../jubilacion/tiempo.ts';
import type { EstadoPension, Paso, Requisito } from '../jubilacion/tipos.ts';
import {
  esAccidenteOEP,
  esProfesional,
  prepararCausante,
  requisitosCausante,
  type CausantePreparado,
} from './causante.ts';
import {
  desdeMotorSupervivencia,
  refSV,
  reglaSV,
  type ParametrosSupervivencia,
} from './parametros.ts';
import {
  LECTURAS_SUPERVIVENCIA_POR_DEFECTO,
  type BeneficiarioViudedad,
  type Beneficiarios,
  type Causante,
  type ClasePrestacion,
  type Familiar,
  type Huerfano,
  type LecturasSupervivencia,
  type OpcionesSupervivencia,
  type ParentescoFamiliar,
  type ResultadoPrestacion,
  type ResultadoSupervivencia,
} from './tipos.ts';

const FRB = 'complemento-brecha-genero-reglas';

/** Prestación en construcción (importes en euros/mes por paga). */
interface Borrador {
  readonly clase: ClasePrestacion;
  readonly indice: number;
  readonly requisitos: Requisito[];
  readonly pasos: Paso[];
  readonly edadMeses: number;
  cumple: boolean;
  porcentaje: number;
  pension: number;
  estado: EstadoPension;
  duracionMeses?: number;
  /** Grupo de preferencia del art. 229.2 (familiares). */
  grupo?: number;
  /** Clase de la cuantía mínima (sin el año) y rentas del beneficiario. */
  claseMinima?: string;
  incrementoMinima?: { valor: number; refs: readonly string[] };
  rentas: number;
  brecha: number;
  refsBrecha: readonly string[];
}

const edadEn = (nacimiento: string, hc: Fecha): number => {
  const nac = parsearFecha(nacimiento);
  if (compararFechas(hc, nac) <= 0) {
    throw new RangeError('El fallecimiento debe ser posterior al nacimiento del beneficiario');
  }
  return mesesCumplidos(nac, hc);
};

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

const indicador = (
  id: string,
  descripcion: string,
  cumple: boolean,
  parametros: readonly string[],
  articulo: string,
): Requisito => req(id, descripcion, cumple, cumple ? 1 : 0, 1, 'indicador', parametros, articulo);

function smiAnual(p: ParametrosSupervivencia, anio: number): { valor: number; ref: string } {
  if (anio > p.smiAnual.ultimo) {
    throw new DatoNoDisponible(
      `parametros/smi-anual.json#${anio}: el SMI anual posterior a ${p.smiAnual.ultimo} no está en /data`,
    );
  }
  const v = valorEn(p.smiAnual, anio);
  return { valor: v.valor, ref: v.ref };
}

/** SMI anual sin dos pagas extraordinarias (art. 31.2 Decreto 3158/1966; art. 8.2 RD 1647/1997). */
function smiSinPagasExtra(p: ParametrosSupervivencia, anio: number) {
  const a = smiAnual(p, anio);
  const m = valorEn(p.smiMensual, anio);
  const n = reglaSV(p, 'viudedad-cargas-pagas-extra-excluidas');
  return {
    valor: a.valor - n * m.valor,
    refs: [a.ref, m.ref, refSV('viudedad-cargas-pagas-extra-excluidas')],
  };
}

/** Clase de la mínima de viudedad por edad (sin cargas): 65 o discapacidad, 60 a 64, menos de 60. */
function claseViudedadPorEdad(p: ParametrosSupervivencia, edad: number, disc: boolean): string {
  if (edad >= p.edad65MinimasMeses || disc) return 'viud-65-o-discapacidad65';
  if (edad >= reglaSV(p, 'minima-viudedad-edad-60-meses')) return 'viud-60-64';
  return 'viud-menor60';
}

export function calcularSupervivenciaConParametros(
  params: ParametrosSupervivencia,
  causante: Causante,
  beneficiarios: Beneficiarios,
  opciones: OpcionesSupervivencia = {},
): ResultadoSupervivencia {
  const lecturas: LecturasSupervivencia = {
    ...LECTURAS_SUPERVIVENCIA_POR_DEFECTO,
    ...opciones.lecturasSupervivencia,
  };
  const hc = parsearFecha(causante.fechaFallecimiento);
  const anio = hc.anio;
  const primer = desdeMotorSupervivencia(params);
  if (anio < primer) {
    throw new NoImplementada(
      `Prestaciones de muerte y supervivencia con hecho causante en ${anio}`,
      `El motor cubre hechos causantes desde ${primer} (redacciones de /data comprobadas desde esa fecha).`,
    );
  }
  const r = (id: string): number => reglaSV(params, id);
  const ctx: Contexto = crearContexto(params, opciones);
  const pagas = parametro(params.reglasBrecha, 'pagas-anuales', FRB);
  const fechaNum = hc.anio * 10000 + hc.mes * 100 + hc.dia;
  const viudos = beneficiarios.viudos ?? [];
  const huerfanos = beneficiarios.huerfanos ?? [];
  const familiares = beneficiarios.familiares ?? [];

  for (const v of viudos) {
    if (v.separacionAnteriorA2008 === true) {
      throw new NoImplementada(
        'Viudedad de personas separadas o divorciadas antes del 01/01/2008 (DT 13.ª TRLGSS)',
        'La regla transitoria (y su redacción del RDL 31/2026) no se ha estructurado en /data.',
      );
    }
  }

  // 1. Causante ------------------------------------------------------------------------------
  const prep: CausantePreparado = prepararCausante(params, ctx, causante, opciones, lecturas);
  const br = prep.baseReguladora;
  const pasos: Paso[] = [...prep.pasos];
  const exentoViudedad = esAccidenteOEP(causante);
  const reqViudedad = requisitosCausante(
    params,
    causante,
    prep,
    lecturas,
    exentoViudedad,
    true,
    [refSV('carencia-alta-dias'), refSV('carencia-exenta-accidente-ep')],
    'art. 219.1 TRLGSS',
  );
  const causanteCumple = reqViudedad.every((q) => q.cumple);
  const exentoFamiliares =
    esProfesional(causante) ||
    (causante.causa === 'accidente-no-laboral' &&
      lecturas.carenciaFamiliaresAccidenteNoLaboral === 'exenta');
  const reqFamiliares = requisitosCausante(
    params,
    causante,
    prep,
    lecturas,
    exentoFamiliares,
    true,
    [refSV('familiares-carencia-alta-dias')],
    'art. 22.1 Orden de 13/02/1967; art. 226.1 TRLGSS',
  );
  const reqOrfandad = requisitosCausante(
    params,
    causante,
    prep,
    lecturas,
    exentoViudedad,
    lecturas.carenciaOrfandad === 'rd-1647-1997',
    [refSV('orfandad-carencia-rd-1647-1997-dias')],
    'art. 9.1 RD 1647/1997 (lectura carenciaOrfandad)',
  );

  const nuevo = (
    clase: ClasePrestacion,
    indice: number,
    edadMeses: number,
    reqCausante: readonly Requisito[],
  ): Borrador => ({
    clase,
    indice,
    requisitos: [...reqCausante],
    pasos: [],
    edadMeses,
    cumple: true,
    porcentaje: 0,
    pension: 0,
    estado: 'contributiva',
    rentas: 0,
    brecha: 0,
    refsBrecha: [],
  });
  const pasoB = (
    b: Borrador,
    id: string,
    titulo: string,
    valor: number | string | boolean,
    unidad: string,
    parametros: readonly string[],
    articulo: string,
    detalle?: string,
  ): void => {
    b.pasos.push(
      detalle === undefined
        ? { id, titulo, valor, unidad, parametros, articulo }
        : { id, titulo, valor, unidad, parametros, articulo, detalle },
    );
  };
  const maxima = ctx.pensionMaxima(anio);
  const aplicarMaxima = (b: Borrador): void => {
    if ((opciones.aplicarPensionMaxima ?? true) && b.pension > maxima.valor) {
      pasoB(
        b,
        'limite-maximo',
        'Límite de la pensión máxima',
        maxima.valor,
        'euros/mes',
        maxima.refs,
        'art. 57 TRLGSS',
      );
      b.pension = maxima.valor;
      b.estado = 'maxima';
    }
  };

  // 2. Viudedad --------------------------------------------------------------------------------
  const borradoresV: Borrador[] = viudos.map((v, i) => viudedad(v, i));
  function viudedad(v: BeneficiarioViudedad, i: number): Borrador {
    const edad = edadEn(v.nacimiento, hc);
    const b = nuevo('viudedad', i, edad, reqViudedad);
    let temporal = false;
    if (v.vinculo === 'conyuge') {
      if (v.fechaMatrimonio === undefined) throw new RangeError('Cónyuge: falta fechaMatrimonio');
      const meses = mesesCumplidos(parsearFecha(v.fechaMatrimonio), hc);
      const exigeDuracion =
        causante.causa === 'enfermedad-comun' && v.enfermedadAnteriorAlVinculo === true;
      if (exigeDuracion) {
        const conv = (v.convivenciaPreviaMeses ?? 0) + meses;
        const ok =
          meses >= r('matrimonio-antelacion-meses') ||
          v.hijosComunes === true ||
          conv > r('matrimonio-convivencia-total-meses');
        b.requisitos.push(
          req(
            'duracion-matrimonio',
            'Matrimonio de al menos un año, hijos comunes o convivencia previa de más de dos años',
            ok,
            meses,
            r('matrimonio-antelacion-meses'),
            'meses',
            [refSV('matrimonio-antelacion-meses'), refSV('matrimonio-convivencia-total-meses')],
            'art. 219.2 TRLGSS',
          ),
        );
        if (!ok) temporal = true;
      } else if (
        meses < r('matrimonio-antelacion-meses') &&
        causante.causa === 'enfermedad-comun'
      ) {
        ctx.avisos.add(
          'Viudedad: matrimonio de menos de un año; se supone que la enfermedad sobrevino tras el vínculo (beneficiario.enfermedadAnteriorAlVinculo para indicarlo).',
        );
      }
    } else if (v.vinculo === 'pareja-hecho') {
      const conv = v.convivenciaMeses ?? 0;
      const registro =
        v.fechaRegistroPareja === undefined
          ? -1
          : mesesCumplidos(parsearFecha(v.fechaRegistroPareja), hc);
      const red2026 = fechaNum >= r('pareja-redaccion-2026-desde');
      const hijos = v.hijosComunes === true;
      const refsP = [
        refSV('pareja-convivencia-meses'),
        refSV('pareja-registro-antelacion-meses'),
        refSV('pareja-redaccion-2026-desde'),
      ];
      let convOk: boolean;
      let regOk: boolean;
      if (hijos && red2026) {
        convOk = conv >= r('2026-pareja-hijos-comunes-convivencia-meses');
        regOk = true;
        refsP.push(refSV('2026-pareja-hijos-comunes-convivencia-meses'));
      } else if (hijos) {
        convOk = true;
        regOk = registro >= r('pareja-registro-antelacion-meses');
        refsP.push(refSV('2022-pareja-hijos-comunes-solo-constitucion'));
      } else {
        convOk = conv >= r('pareja-convivencia-meses');
        regOk = registro >= r('pareja-registro-antelacion-meses');
      }
      b.requisitos.push(
        req(
          'pareja-convivencia',
          'Convivencia estable e ininterrumpida inmediatamente anterior',
          convOk,
          conv,
          hijos && red2026
            ? r('2026-pareja-hijos-comunes-convivencia-meses')
            : hijos
              ? 0
              : r('pareja-convivencia-meses'),
          'meses',
          refsP,
          'art. 221.2 TRLGSS',
        ),
      );
      if (convOk && !regOk) {
        // Art. 222: la inscripción no llega a dos años: prestación temporal.
        temporal = true;
        b.requisitos.push(
          req(
            'pareja-registro',
            'Inscripción o documento público con dos años de antelación',
            false,
            Math.max(registro, 0),
            r('pareja-registro-antelacion-meses'),
            'meses',
            refsP,
            'art. 221.2 y 222 TRLGSS',
          ),
        );
      } else if (!convOk) b.cumple = false;
    } else {
      // Excónyuge o expareja de hecho: compensatoria que se extingue, o violencia de género.
      const comp = (v.pensionCompensatoriaAnual ?? 0) > 0;
      const ok = (comp || v.victimaViolenciaGenero === true) && v.nuevoVinculo !== true;
      const id =
        v.vinculo === 'excónyuge'
          ? 'divorcio-requiere-compensatoria'
          : 'expareja-requiere-compensatoria';
      b.requisitos.push(
        indicador(
          'compensatoria',
          'Acreedor de pensión compensatoria (o víctima de violencia de género) sin nuevo vínculo',
          ok,
          [
            refSV(id),
            refSV('divorcio-violencia-genero-sin-compensatoria'),
            refSV('divorcio-sin-nuevas-nupcias'),
          ],
          v.vinculo === 'excónyuge' ? 'art. 220.1 TRLGSS' : 'art. 221.3 TRLGSS',
        ),
      );
      if (!ok) b.cumple = false;
    }
    if (!reqViudedad.every((q) => q.cumple)) b.cumple = false;
    if (!b.cumple) {
      b.estado = 'no-causa-derecho';
      return b;
    }

    // Porcentaje: 52 %; 60 % (65 años sin otras rentas, RD 900/2018); 70 % (cargas familiares).
    const pct52 = r('viudedad-pct');
    let pct = pct52;
    const rend = v.rendimientosAnuales ?? 0;
    const lim = ctx.limiteIngresosMinimos(anio);
    const refs: string[] = [refSV('viudedad-pct')];
    const cumple60 =
      edad >= r('viudedad-65-edad-meses') &&
      v.otraPensionPublica !== true &&
      (v.rentasTrabajoAnuales ?? 0) <= 0 &&
      (v.rentasCapitalAnuales ?? 0) <= lim.valor;
    let pension60 = 0;
    if (cumple60) pension60 = (br * r('viudedad-65-pct')) / 100;
    let pension70 = 0;
    if (v.cargasFamiliares !== undefined && v.cargasFamiliares.miembrosUnidadFamiliar > 0) {
      const smi = smiSinPagasExtra(params, anio);
      const porMiembro =
        v.cargasFamiliares.rendimientosUnidadFamiliar / v.cargasFamiliares.miembrosUnidadFamiliar;
      const cargas = porMiembro <= (r('viudedad-cargas-smi-pct') / 100) * smi.valor;
      const minEdad = ctx.pensionMinimaAnual(
        anio,
        `${claseViudedadPorEdad(params, edad, false)}-unipersonal`,
      );
      const limite70 = lim.valor + minEdad.valor;
      const p70 = (br * r('viudedad-cargas-pct')) / 100;
      const minCargas = ctx.pensionMinimaAnual(anio, 'viud-cargas-familiares-unipersonal');
      const computable = Math.max(p70 * pagas, rend <= lim.valor ? minCargas.valor : 0);
      const principal =
        computable >= (r('viudedad-cargas-principal-fuente-pct') / 100) * (computable + rend);
      if (cargas && principal && rend <= limite70) {
        pension70 = p70;
        const reducida = (limite70 - rend) / pagas;
        if (p70 > reducida) {
          const suelo = lecturas.reduccionViudedad70 === 'no-inferior-52' ? (br * pct52) / 100 : 0;
          pension70 = Math.max(reducida, suelo);
          pasoB(
            b,
            'reduccion-70',
            'Reducción del 70 % por el límite de rendimientos',
            pension70,
            'euros/mes',
            [refSV('viudedad-cargas-reduccion-limite'), ...lim.refs, ...minEdad.refs],
            'art. 31.3 Decreto 3158/1966',
            `Pensión anual + rendimientos no pueden superar ${limite70.toFixed(2)} euros (lectura ${lecturas.reduccionViudedad70}).`,
          );
        }
        pasoB(
          b,
          'cargas-familiares',
          'Cargas familiares y pensión como principal fuente de ingresos',
          true,
          'indicador',
          [
            refSV('viudedad-cargas-smi-pct'),
            refSV('viudedad-cargas-hijos-edad-meses'),
            refSV('viudedad-cargas-principal-fuente-pct'),
            refSV('viudedad-cargas-limite-rendimientos'),
            ...smi.refs,
            ...minCargas.refs,
          ],
          'art. 31.2 Decreto 3158/1966',
        );
      }
    }
    const base52 = (br * pct52) / 100;
    if (pension70 > 0 || pension60 > 0) {
      if (pension70 >= pension60 && pension70 > base52) {
        pct = (pension70 / br) * 100;
        refs.push(refSV('viudedad-cargas-pct'), refSV('viudedad-65-incompatible-70'));
      } else if (pension60 > base52) {
        pct = r('viudedad-65-pct');
        refs.push(
          refSV('viudedad-65-pct'),
          refSV('viudedad-65-edad-meses'),
          refSV('viudedad-65-requisitos'),
          ...lim.refs,
        );
      }
    }
    b.porcentaje = pct;
    b.pension = (br * pct) / 100;
    pasoB(
      b,
      'porcentaje',
      'Porcentaje de la base reguladora',
      pct,
      '%',
      refs,
      pct === pct52
        ? 'art. 31.1 Decreto 3158/1966'
        : pct === r('viudedad-65-pct')
          ? 'art. 3 RD 900/2018'
          : 'art. 31.2 Decreto 3158/1966',
    );
    aplicarMaxima(b);
    if (temporal) {
      b.duracionMeses = r('prestacion-temporal-meses');
      pasoB(
        b,
        'prestacion-temporal',
        'Prestación temporal de viudedad (misma cuantía, duración limitada)',
        b.duracionMeses,
        'meses',
        [refSV('prestacion-temporal-meses')],
        'art. 222 TRLGSS',
      );
    }
    b.rentas = rend;
    b.claseMinima =
      v.cargasFamiliares !== undefined && pension70 > 0
        ? 'viud-cargas-familiares'
        : claseViudedadPorEdad(params, edad, v.discapacidad65 === true);
    // Brecha de género (art. 60): mujeres con hijos; hombres si algún hijo común tiene orfandad.
    const hijosB = v.hijos ?? 0;
    const derecho = v.sexo === 'mujer' || (v.sexo === 'hombre' && v.hijoConOrfandad === true);
    if (
      hijosB >= parametro(params.reglasBrecha, 'hijos-minimo', FRB) &&
      derecho &&
      v.brechaEnOtraPension !== true
    ) {
      const imp = ctx.importeBrechaPorHijo(anio);
      b.brecha =
        imp.valor * Math.min(hijosB, parametro(params.reglasBrecha, 'hijos-maximo-multiplo', FRB));
      b.refsBrecha = [
        ...imp.refs,
        ref(FRB, 'hijos-maximo-multiplo'),
        refSV('brecha-incluye-viudedad'),
        ...(v.sexo === 'hombre' ? [refSV('brecha-hombre-viudedad-con-orfandad')] : []),
      ];
    }
    return b;
  }
  // Prestación temporal de viudedad: clase propia.
  const temporales = new Set(
    borradoresV.filter((b) => b.duracionMeses !== undefined).map((b) => b.indice),
  );

  // Reparto entre varios beneficiarios con derecho (art. 220.2) y límite de la compensatoria.
  const conDerechoV = borradoresV.filter((b) => b.cumple && !temporales.has(b.indice));
  if (conDerechoV.length > 1) {
    const meses = conDerechoV.map((b) => {
      const m = viudos[b.indice]?.mesesConvividos;
      if (m === undefined || m <= 0) {
        throw new RangeError('Varios beneficiarios de viudedad: falta mesesConvividos de cada uno');
      }
      return m;
    });
    const total = meses.reduce((a, c) => a + c, 0);
    let cuotas = meses.map((m) => m / total);
    const iActual = conDerechoV.findIndex((b) => {
      const v = viudos[b.indice];
      return v?.vinculo === 'conyuge' || v?.vinculo === 'pareja-hecho';
    });
    const garantia = r('concurrencia-garantia-pct') / 100;
    const cActual = iActual >= 0 ? cuotas[iActual] : undefined;
    if (cActual !== undefined && cActual < garantia) {
      const restoOtros = 1 - cActual;
      cuotas = cuotas.map((c, k) => (k === iActual ? garantia : (c / restoOtros) * (1 - garantia)));
    }
    conDerechoV.forEach((b, k) => {
      const c = cuotas[k] ?? 0;
      b.pension *= c;
      b.porcentaje *= c;
      pasoB(
        b,
        'reparto-tiempo-convivido',
        'Parte de la pensión proporcional al tiempo vivido con el causante',
        c * 100,
        '%',
        [refSV('concurrencia-garantia-pct')],
        'art. 220.2 TRLGSS',
      );
    });
  }
  for (const b of borradoresV) {
    const v = viudos[b.indice];
    if (
      !b.cumple ||
      v === undefined ||
      (v.vinculo !== 'excónyuge' && v.vinculo !== 'expareja-hecho')
    )
      continue;
    const comp = v.pensionCompensatoriaAnual ?? 0;
    if (comp <= 0) continue;
    // Anual: la viudedad anual (14 pagas) no supera la compensatoria anual; mensual: paga frente a compensatoria / 12.
    const tope = lecturas.comparacionCompensatoria === 'anual' ? comp / pagas : comp / 12;
    if (b.pension > tope) {
      b.porcentaje *= tope / b.pension;
      b.pension = tope;
      pasoB(
        b,
        'limite-compensatoria',
        'Reducida hasta la pensión compensatoria',
        tope,
        'euros/mes',
        [refSV('divorcio-limite-compensatoria')],
        'art. 220.1 y 221.3 TRLGSS',
        `Comparación ${lecturas.comparacionCompensatoria}.`,
      );
    }
  }

  // 3. Orfandad --------------------------------------------------------------------------------
  const smiRef = (): { valor: number; ref: string } => smiAnual(params, anio);
  const borradoresO: Borrador[] = huerfanos.map((h: Huerfano, i) => {
    const edad = edadEn(h.nacimiento, hc);
    const b = nuevo('orfandad', i, edad, reqOrfandad);
    const refsEdad = [refSV('orfandad-edad-limite-meses'), refSV('orfandad-alta-o-pensionista')];
    let ok = edad < r('orfandad-edad-limite-meses') || h.incapacitado === true;
    if (!ok && edad < r('orfandad-edad-ampliada-meses')) {
      const s = smiRef();
      ok = (h.rentasTrabajoAnuales ?? 0) < s.valor;
      refsEdad.push(refSV('orfandad-edad-ampliada-meses'), s.ref);
    }
    b.requisitos.push(
      req(
        'edad-orfandad',
        'Menor de 21 años o incapacitado (menor de 25 sin trabajo o con ingresos inferiores al SMI)',
        ok,
        edad,
        r('orfandad-edad-limite-meses'),
        'meses',
        refsEdad,
        'art. 224.1 y 224.3 TRLGSS',
      ),
    );
    b.cumple = b.requisitos.every((q) => q.cumple);
    b.rentas = h.rendimientosAnuales ?? 0;
    if (!b.cumple) {
      b.estado = 'no-causa-derecho';
      return b;
    }
    b.porcentaje = r('orfandad-pct');
    b.pension = (br * b.porcentaje) / 100;
    pasoB(
      b,
      'porcentaje',
      'Porcentaje de orfandad',
      b.porcentaje,
      '%',
      [refSV('orfandad-pct'), refSV('orfandad-pct-contraste-orden-1967')],
      'art. 36.Uno Decreto 3158/1966',
    );
    b.claseMinima =
      edad < r('minima-orfandad-discapacidad-edad-meses') && h.discapacidad65 === true
        ? 'orf-discapacidad65'
        : 'orf';
    return b;
  });
  const orfConDerecho = borradoresO.filter((b) => b.cumple);
  if (opciones.orfandadAbsoluta === true && orfConDerecho.length > 0) {
    // Art. 38.1: sin beneficiario de pensión de viudedad, el 52 %; con él, el porcentaje no asignado.
    const pensionesV = borradoresV.filter((b) => b.cumple && !temporales.has(b.indice));
    const asignado = pensionesV.reduce((a, b) => a + b.porcentaje, 0);
    const pctIncr =
      pensionesV.length === 0
        ? r('orfandad-absoluta-incremento-pct')
        : Math.max(0, r('viudedad-pct') - asignado);
    const porHuerfano = pctIncr / orfConDerecho.length;
    for (const b of orfConDerecho) {
      b.porcentaje += porHuerfano;
      b.pension = (br * b.porcentaje) / 100;
      pasoB(
        b,
        'incremento-orfandad-absoluta',
        'Incremento de la orfandad absoluta (parte de este huérfano)',
        porHuerfano,
        '% de la base reguladora',
        [
          refSV(
            pensionesV.length === 0
              ? 'orfandad-absoluta-incremento-pct'
              : 'orfandad-absoluta-porcentaje-no-asignado',
          ),
          refSV('orfandad-absoluta-reparto-iguales'),
          refSV('orfandad-absoluta-progenitor-desconocido'),
        ],
        'art. 38.1 Decreto 3158/1966',
      );
      b.incrementoMinima = { valor: 1 / orfConDerecho.length, refs: [] };
    }
  }
  for (const b of orfConDerecho) aplicarMaxima(b);

  // 4. Favor de familiares ---------------------------------------------------------------------
  const GRUPO: Record<ParentescoFamiliar, number> = {
    nieto: r('limite-orden-nietos-hermanos'),
    hermano: r('limite-orden-nietos-hermanos'),
    madre: r('limite-orden-padres'),
    padre: r('limite-orden-padres'),
    abuela: r('limite-orden-abuelos'),
    abuelo: r('limite-orden-abuelos'),
    'hijo-de-pensionista': r('limite-orden-hijos-hermanos-pensionista'),
    'hermano-de-pensionista': r('limite-orden-hijos-hermanos-pensionista'),
  };
  const borradoresF: Borrador[] = familiares.map((f, i) => familiar(f, i));
  function familiar(f: Familiar, i: number): Borrador {
    const edad = edadEn(f.nacimiento, hc);
    const b = nuevo('favor-familiares', i, edad, reqFamiliares);
    b.grupo = GRUPO[f.parentesco];
    const art = 'art. 22.1 Orden de 13/02/1967';
    const ingresos = f.rendimientosAnuales ?? 0;
    const trabajo = f.rentasTrabajoAnuales ?? 0;
    const s = smiRef();
    const smi = s.valor;
    const refSmi = [s.ref];
    const conviv = f.convivenciaMeses >= r('familiares-convivencia-meses');
    const comunes = (): void => {
      b.requisitos.push(
        req(
          'convivencia',
          'Convivencia con el causante y a sus expensas',
          conviv,
          f.convivenciaMeses,
          r('familiares-convivencia-meses'),
          'meses',
          [refSV('familiares-convivencia-meses')],
          `${art}.c)`,
        ),
        indicador(
          'sin-pension-publica',
          'Sin derecho a pensión pública',
          f.pensionPublica !== true,
          [refSV('familiares-sin-pension-publica')],
          `${art}.d)`,
        ),
        req(
          'medios-subsistencia',
          'Ingresos anuales iguales o inferiores al SMI anual',
          ingresos <= (r('familiares-medios-subsistencia-smi-pct') / 100) * smi,
          ingresos,
          (r('familiares-medios-subsistencia-smi-pct') / 100) * smi,
          'euros/año',
          [refSV('familiares-medios-subsistencia-smi-pct'), ...refSmi],
          `${art}.e)`,
        ),
        indicador(
          'sin-obligados-alimentos',
          'Sin familiares con obligación y posibilidad de prestarle alimentos',
          f.familiaresObligadosAlimentos !== true,
          [refSV('familiares-medios-subsistencia-smi-pct')],
          `${art}.e)`,
        ),
      );
    };
    if (f.parentesco === 'nieto' || f.parentesco === 'hermano') {
      let ok = edad < r('familiares-nietos-hermanos-edad-meses') || f.incapacitado === true;
      if (!ok && edad < r('familiares-nietos-hermanos-edad-ampliada-meses'))
        ok = trabajo < (r('familiares-trabajo-smi-pct') / 100) * smi;
      b.requisitos.push(
        req(
          'edad',
          'Menor de 18 años o incapacitado (menor de 22 sin trabajo o con ingresos del trabajo inferiores al 75 % del SMI)',
          ok,
          edad,
          r('familiares-nietos-hermanos-edad-meses'),
          'meses',
          [
            refSV('familiares-nietos-hermanos-edad-meses'),
            refSV('familiares-nietos-hermanos-edad-ampliada-meses'),
            refSV('familiares-trabajo-smi-pct'),
            ...refSmi,
          ],
          `${art}.a)`,
        ),
        indicador(
          'huerfano-padre-y-madre',
          'Huérfano de padre y madre',
          f.huerfanoDePadreYMadre === true,
          [refSV('familiares-nietos-hermanos-huerfanos')],
          `${art}.b)`,
        ),
      );
      if (edad >= r('familiares-nietos-hermanos-edad-meses') && trabajo > 0) {
        b.requisitos.push(
          req(
            'ingresos-trabajo',
            'Ingresos del trabajo no superiores al 75 % del SMI',
            trabajo <= (r('familiares-trabajo-mayor-18-smi-pct') / 100) * smi,
            trabajo,
            (r('familiares-trabajo-mayor-18-smi-pct') / 100) * smi,
            'euros/año',
            [refSV('familiares-trabajo-mayor-18-smi-pct'), ...refSmi],
            `${art}.e)`,
          ),
        );
      }
      comunes();
    } else if (f.parentesco === 'madre' || f.parentesco === 'abuela') {
      b.requisitos.push(
        indicador(
          'estado-civil',
          'Viuda, soltera o casada con marido incapacitado para el trabajo',
          f.estadoCivilCumple === true,
          [refSV('familiares-madre-abuelas-estado-civil')],
          'art. 22.1.2) Orden de 13/02/1967',
        ),
      );
      comunes();
    } else if (f.parentesco === 'padre' || f.parentesco === 'abuelo') {
      const ok = edad >= r('familiares-padre-abuelos-edad-meses') || f.incapacitado === true;
      b.requisitos.push(
        req(
          'edad',
          'Sesenta años cumplidos o incapacitado para el trabajo',
          ok,
          edad,
          r('familiares-padre-abuelos-edad-meses'),
          'meses',
          [refSV('familiares-padre-abuelos-edad-meses')],
          'art. 22.1.3) Orden de 13/02/1967',
        ),
      );
      comunes();
    } else {
      const refs226 = [refSV('familiares-hijos-hermanos-pensionista-edad-meses')];
      b.requisitos.push(
        indicador(
          'causante-pensionista',
          'Causante pensionista de jubilación o incapacidad permanente',
          causante.situacion === 'pensionista',
          refs226,
          'art. 226.2 TRLGSS',
        ),
        req(
          'edad',
          'Mayor de cuarenta y cinco años',
          edad > r('familiares-hijos-hermanos-pensionista-edad-meses'),
          edad,
          r('familiares-hijos-hermanos-pensionista-edad-meses'),
          'meses',
          refs226,
          'art. 226.2.b) TRLGSS',
        ),
        indicador(
          'estado-civil',
          'Soltero, divorciado o viudo',
          f.solteroDivorciadoOViudo === true,
          refs226,
          'art. 226.2.b) TRLGSS',
        ),
        indicador(
          'convivencia-a-cargo',
          'Convivencia con el causante y a su cargo',
          conviv,
          refs226,
          'art. 226.2.a) TRLGSS',
        ),
        indicador(
          'dedicacion',
          'Dedicación prolongada al cuidado del causante',
          f.dedicacionCuidado === true,
          refs226,
          'art. 226.2.c) TRLGSS',
        ),
        req(
          'medios',
          'Carece de medios propios de vida (ingresos no superiores al SMI anual)',
          ingresos <= smi,
          ingresos,
          smi,
          'euros/año',
          [...refs226, ...refSmi],
          'art. 226.2.d) TRLGSS',
        ),
      );
    }
    b.cumple = b.requisitos.every((q) => q.cumple);
    b.rentas = ingresos;
    if (!b.cumple) {
      b.estado = 'no-causa-derecho';
      return b;
    }
    b.porcentaje = r('orfandad-pct');
    b.pension = (br * b.porcentaje) / 100;
    pasoB(
      b,
      'porcentaje',
      'Porcentaje de favor de familiares (el de la orfandad)',
      b.porcentaje,
      '%',
      [refSV('familiares-cuantia-igual-orfandad'), refSV('orfandad-pct')],
      'art. 39.Uno Decreto 3158/1966; art. 23.1 Orden de 13/02/1967',
    );
    b.claseMinima = 'fam';
    return b;
  }
  const famConDerecho = borradoresF.filter((b) => b.cumple);
  const hayPensionV = borradoresV.some((b) => b.cumple && !temporales.has(b.indice));
  const hayHuerfanos = orfConDerecho.length > 0;
  if (
    lecturas.incrementoFamiliares === 'porcentaje-viudedad' &&
    !hayPensionV &&
    opciones.hayViudoOHuerfanosPensionistas !== true
  ) {
    const nietos = famConDerecho.filter((b) => b.grupo === r('limite-orden-nietos-hermanos'));
    const ascend = famConDerecho.filter(
      (b) => b.grupo === r('limite-orden-padres') || b.grupo === r('limite-orden-abuelos'),
    );
    const destino = nietos.length > 0 ? nietos : !hayHuerfanos ? ascend : [];
    for (const b of destino) {
      const inc = r('viudedad-pct') / destino.length;
      b.porcentaje += inc;
      b.pension = (br * b.porcentaje) / 100;
      pasoB(
        b,
        'incremento-familiares',
        'Incremento sin cónyuge superviviente (parte de este familiar)',
        inc,
        '% de la base reguladora',
        [refSV('familiares-incremento-sin-viudo'), refSV('viudedad-pct')],
        'art. 23.2 Orden de 13/02/1967',
        'Lectura incrementoFamiliares: porcentaje de viudedad.',
      );
    }
  }
  for (const b of famConDerecho) aplicarMaxima(b);

  // 5. Límite conjunto (art. 229) ------------------------------------------------------------------
  const sujetas = (): number =>
    [
      ...borradoresV.filter((b) => b.cumple && !temporales.has(b.indice)),
      ...orfConDerecho,
      ...famConDerecho,
    ].reduce((a, b) => a + b.pension, 0);
  const sumaInicial = sujetas();
  const limite = (br * r('limite-conjunto-pct-br')) / 100;
  const vPens = borradoresV.filter((b) => b.cumple && !temporales.has(b.indice));
  const V = vPens.reduce((a, b) => a + b.pension, 0);
  const O = orfConDerecho.reduce((a, b) => a + b.pension, 0);
  const pctMaxV = Math.max(0, ...vPens.map((b) => b.porcentaje));
  const excepcion = pctMaxV > r('limite-excepcion-viudedad-umbral-pct') && orfConDerecho.length > 1;
  const escalar = (
    bs: readonly Borrador[],
    factor: number,
    motivo: string,
    refs: readonly string[],
  ): void => {
    for (const b of bs) {
      b.pension *= factor;
      b.porcentaje *= factor;
      pasoB(b, 'limite-conjunto', motivo, factor * 100, '% de la cuantía', refs, 'art. 229 TRLGSS');
    }
  };
  const refsLim = [refSV('limite-conjunto-pct-br'), refSV('limite-viudedad-orfandad-orden-1967')];
  if (lecturas.reduccionLimiteConjunto === 'proporcional' && V + O > limite && !excepcion) {
    escalar(
      [...vPens, ...orfConDerecho],
      limite / (V + O),
      'Reducción proporcional por el límite conjunto',
      refsLim,
    );
  } else {
    const hueco = excepcion
      ? Math.max(limite - V, (br * r('limite-orfandad-max-pct')) / 100)
      : Math.max(0, limite - V);
    if (O > hueco + 1e-9) {
      escalar(orfConDerecho, hueco / O, 'Reducción de la orfandad por el límite conjunto', [
        ...refsLim,
        refSV('limite-preferencia-orfandad'),
        refSV('orfandad-absoluta-dentro-limite'),
        ...(excepcion
          ? [refSV('limite-excepcion-viudedad-umbral-pct'), refSV('limite-orfandad-max-pct')]
          : []),
      ]);
    }
  }
  let restante = Math.max(
    0,
    limite -
      vPens.reduce((a, b) => a + b.pension, 0) -
      orfConDerecho.reduce((a, b) => a + b.pension, 0),
  );
  const grupos = [...new Set(famConDerecho.map((b) => b.grupo ?? 0))].sort((a, b) => a - b);
  for (const g of grupos) {
    const bs = famConDerecho.filter((b) => b.grupo === g);
    const suma = bs.reduce((a, b) => a + b.pension, 0);
    if (suma > restante + 1e-9) {
      escalar(
        bs,
        suma > 0 ? restante / suma : 0,
        'Reducción de favor de familiares por el límite conjunto (orden de preferencia)',
        [
          refSV('limite-conjunto-pct-br'),
          refSV('limite-preferencia-orfandad'),
          refSV(
            g === r('limite-orden-nietos-hermanos')
              ? 'limite-orden-nietos-hermanos'
              : g === r('limite-orden-padres')
                ? 'limite-orden-padres'
                : g === r('limite-orden-abuelos')
                  ? 'limite-orden-abuelos'
                  : 'limite-orden-hijos-hermanos-pensionista',
          ),
        ],
      );
    }
    restante = Math.max(0, restante - bs.reduce((a, b) => a + b.pension, 0));
  }
  pasos.push({
    id: 'limite-conjunto',
    titulo: 'Límite conjunto de las pensiones de muerte y supervivencia',
    valor: limite,
    unidad: 'euros/mes',
    parametros: [
      refSV('limite-conjunto-pct-br'),
      refSV('limite-solo-inicial'),
      ...(excepcion
        ? [refSV('limite-excepcion-viudedad-umbral-pct'), refSV('limite-orfandad-max-pct')]
        : []),
    ],
    articulo: 'art. 229 TRLGSS',
    detalle: `Suma antes del límite ${sumaInicial.toFixed(2)}; después ${sujetas().toFixed(2)} euros/mes${excepcion ? ' (excepción del art. 229.3)' : ''}.`,
  });

  // 6. Mínimos y brecha --------------------------------------------------------------------------
  const lim = ctx.limiteIngresosMinimos(anio);
  const sinViudoNiHuerfanos =
    !hayPensionV && !hayHuerfanos && opciones.hayViudoOHuerfanosPensionistas !== true;
  const cerrar = (b: Borrador): ResultadoPrestacion => {
    let complemento = 0;
    const esTemporal = temporales.has(b.indice) && b.clase === 'viudedad';
    if (
      b.cumple &&
      (opciones.aplicarMinimos ?? true) &&
      !esTemporal &&
      b.claseMinima !== undefined
    ) {
      let minimaAnual = 0;
      const refs: string[] = [];
      let clase = b.claseMinima;
      if (b.clase === 'favor-familiares' && sinViudoNiHuerfanos) {
        if (famConDerecho.length === 1) {
          clase = b.edadMeses >= params.edad65MinimasMeses ? 'fam1-65' : 'fam1-menor65';
        } else {
          const inc = ctx.pensionMinimaAnual(anio, 'fam-varios-incremento-unico');
          minimaAnual += inc.valor / famConDerecho.length;
          refs.push(...inc.refs);
        }
        refs.push(refSV('minima-familiares-sin-viudo-ni-huerfanos'));
      }
      const m = ctx.pensionMinimaAnual(
        anio,
        `${clase}-${b.clase === 'viudedad' ? 'unipersonal' : 'unico'}`,
      );
      minimaAnual += m.valor;
      refs.push(...m.refs);
      if (b.incrementoMinima !== undefined) {
        const inc = ctx.pensionMinimaAnual(anio, 'orf-absoluta-incremento-unico');
        minimaAnual += inc.valor * b.incrementoMinima.valor;
        refs.push(...inc.refs);
      }
      const minimaMensual = minimaAnual / pagas;
      if (b.rentas > lim.valor) {
        pasoB(
          b,
          'minimos-limite-ingresos',
          'Sin complemento a mínimos: rentas por encima del límite',
          lim.valor,
          'euros/año',
          lim.refs,
          'art. 59.1 TRLGSS',
        );
      } else if (b.pension < minimaMensual) {
        complemento = minimaMensual - b.pension;
        pasoB(
          b,
          'complemento-minimos',
          'Complemento a mínimos',
          complemento,
          'euros/mes',
          [...refs, ...lim.refs],
          'art. 59 TRLGSS',
          `Cuantía mínima anual ${minimaAnual.toFixed(2)} euros (${clase}).`,
        );
        b.estado = 'minima';
      }
    }
    if (b.brecha > 0)
      pasoB(
        b,
        'complemento-brecha',
        'Complemento para la reducción de la brecha de género',
        b.brecha,
        'euros/mes',
        b.refsBrecha,
        'art. 60 TRLGSS',
      );
    const mensual = b.cumple ? b.pension + complemento + b.brecha : 0;
    if (b.cumple)
      pasoB(
        b,
        'pension-final',
        'Importe inicial por paga',
        mensual,
        'euros/mes',
        [],
        'arts. 219 a 229 TRLGSS',
        `${pagas} pagas; importe anual ${(mensual * pagas).toFixed(2)} euros.`,
      );
    const res: ResultadoPrestacion = {
      clase: esTemporal ? 'prestacion-temporal-viudedad' : b.clase,
      indice: b.indice,
      cumpleRequisitos: b.cumple,
      requisitos: b.requisitos,
      estado: b.cumple ? b.estado : 'no-causa-derecho',
      porcentaje: b.cumple ? b.porcentaje : 0,
      pensionContributiva: b.cumple ? b.pension : 0,
      complementoMinimos: complemento,
      complementoBrecha: b.cumple ? b.brecha : 0,
      pensionMensual: mensual,
      pensionAnual: mensual * pagas,
      pagas,
      edadMeses: b.edadMeses,
      pasos: b.pasos,
    };
    return b.duracionMeses === undefined ? res : { ...res, duracionMeses: b.duracionMeses };
  };

  return {
    fechaHechoCausante: causante.fechaFallecimiento,
    anioNormativa: anio,
    causanteCumpleRequisitos: causanteCumple,
    requisitosCausante: reqViudedad,
    baseReguladora: br,
    viudedad: borradoresV.map(cerrar),
    orfandad: borradoresO.map(cerrar),
    favorFamiliares: borradoresF.map(cerrar),
    sumaSujetaAlLimite: sujetas(),
    limiteConjunto: limite,
    pasos,
    avisos: [...ctx.avisos],
  };
}
