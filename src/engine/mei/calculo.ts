/**
 * MEI (art. 127 bis y DT 43.ª TRLGSS) y cotización adicional de solidaridad (art. 19 bis y DT 42.ª):
 * tipo por año, reparto entre empresa y trabajador y cuotas mensuales, con desglose por pasos.
 * Sin proyecciones: cada función calcula un año; fuera del periodo que fija la ley lanza
 * `NoImplementada`.
 */
import { crearContexto } from '../jubilacion/contexto.ts';
import { DatoNoDisponible, NoImplementada } from '../jubilacion/errores.ts';
import { ref, valorExacto } from '../jubilacion/parametros.ts';
import type { Paso } from '../jubilacion/tipos.ts';
import { refMEI, reglaMEI, type ParametrosMEI } from './parametros.ts';
import {
  LECTURAS_MEI_POR_DEFECTO,
  type ContingenciaMEI,
  type CotizacionAdicional,
  type CuotaMEI,
  type CuotaSolidaridad,
  type LecturasMEI,
  type OpcionesMEI,
  type TipoMEI,
} from './tipos.ts';

const redondeo = (x: number): number => Math.round(x * 1e9) / 1e9;

/** Tipo del MEI del año (puntos porcentuales) y su reparto. */
export function tipoMEI(
  params: ParametrosMEI,
  anio: number,
  contingencia: ContingenciaMEI = 'comunes',
): TipoMEI {
  const primero = reglaMEI(params, 'primer-anio');
  const ultimo = reglaMEI(params, 'ultimo-anio');
  const pasos: Paso[] = [];
  const cero = (titulo: string, parametros: readonly string[]): TipoMEI => {
    pasos.push({
      id: 'tipo-mei',
      titulo,
      valor: 0,
      unidad: 'puntos porcentuales',
      parametros,
      articulo: 'art. 127 bis TRLGSS',
    });
    return { anio, contingencia, total: 0, empresa: 0, trabajador: 0, pasos };
  };
  if (contingencia === 'profesionales') {
    return cero(
      'El MEI solo se cotiza en las situaciones en que se cotiza por la contingencia de jubilación (comunes)',
      [refMEI('aplicable-contingencia-jubilacion')],
    );
  }
  if (anio < primero) {
    return cero(`El MEI tiene efectos desde ${primero}: sin cotización`, [refMEI('primer-anio')]);
  }
  if (anio > ultimo) {
    throw new NoImplementada(
      `Tipo del MEI de ${anio}`,
      `La DT 43.ª solo fija el tipo hasta el 31/12/${ultimo}; el motor no proyecta.`,
    );
  }
  let total: number;
  let empresa: number;
  let trabajador: number;
  let refs: string[];
  const t = valorExacto(params.meiTotal, anio);
  if (t !== undefined) {
    total = t;
    empresa = valorExacto(params.meiEmpresa, anio) ?? NaN;
    trabajador = valorExacto(params.meiTrabajador, anio) ?? NaN;
    refs = [
      ref(params.meiTotal.fichero, anio),
      ref(params.meiEmpresa.fichero, anio),
      ref(params.meiTrabajador.fichero, anio),
    ];
  } else {
    total = reglaMEI(params, 'tipo-total-2030-2050');
    empresa = reglaMEI(params, 'tipo-empresa-2030-2050');
    trabajador = reglaMEI(params, 'tipo-trabajador-2030-2050');
    refs = [
      refMEI('tipo-total-2030-2050'),
      refMEI('tipo-empresa-2030-2050'),
      refMEI('tipo-trabajador-2030-2050'),
    ];
  }
  if (!Number.isFinite(empresa) || !Number.isFinite(trabajador)) {
    throw new DatoNoDisponible(
      `reparto del MEI de ${anio} en parametros/mei-tipo-empresa.json y mei-tipo-trabajador.json`,
    );
  }
  pasos.push({
    id: 'tipo-mei',
    titulo: `Tipo del MEI de ${anio} y su reparto`,
    valor: total,
    unidad: 'puntos porcentuales',
    parametros: [...refs, refMEI('primer-anio'), refMEI('ultimo-anio')],
    articulo: 'art. 127 bis y DT 43.ª TRLGSS',
    detalle: `Empresa ${empresa} y trabajador ${trabajador}.`,
  });
  return { anio, contingencia, total, empresa, trabajador, pasos };
}

/** Cuota mensual del MEI sobre la base de cotización por contingencias comunes. */
export function calcularMEI(
  params: ParametrosMEI,
  anio: number,
  baseCotizacionMensual: number,
  contingencia: ContingenciaMEI = 'comunes',
): CuotaMEI {
  if (!(baseCotizacionMensual >= 0))
    throw new RangeError('La base de cotización no puede ser negativa');
  const tipo = tipoMEI(params, anio, contingencia);
  const pasos: Paso[] = [...tipo.pasos];
  const cuotaTotal = redondeo((baseCotizacionMensual * tipo.total) / 100);
  const cuotaEmpresa = redondeo((baseCotizacionMensual * tipo.empresa) / 100);
  const cuotaTrabajador = redondeo((baseCotizacionMensual * tipo.trabajador) / 100);
  pasos.push({
    id: 'cuota-mei',
    titulo: 'Cuota mensual del MEI',
    valor: cuotaTotal,
    unidad: 'euros/mes',
    parametros: [
      refMEI('sin-beneficios-en-cotizacion'),
      refMEI('aplicable-contingencia-jubilacion'),
    ],
    articulo: 'art. 127 bis TRLGSS',
    detalle: `Base ${baseCotizacionMensual.toFixed(2)} euros/mes; sin bonificación, reducción, exención ni deducción; no computa para prestaciones.`,
  });
  return {
    anio,
    base: baseCotizacionMensual,
    tipo,
    cuotaTotal,
    cuotaEmpresa,
    cuotaTrabajador,
    pasos,
  };
}

/** Cuota mensual de la cotización adicional de solidaridad sobre la retribución por encima de la base máxima. */
export function cuotaSolidaridad(
  params: ParametrosMEI,
  anio: number,
  retribucionMensual: number,
  opciones: OpcionesMEI = {},
): CuotaSolidaridad {
  if (!(retribucionMensual >= 0)) throw new RangeError('La retribución no puede ser negativa');
  const avisos = new Set<string>();
  const pasos: Paso[] = [];
  const primero = reglaMEI(params, 'solidaridad-primer-anio');
  const ultimoCal = reglaMEI(params, 'solidaridad-ultimo-anio-calendario');
  const ctx = crearContexto(params, opciones);
  const baseMax = opciones.baseMaximaMensual ?? ctx.baseMaxima(anio).valor;
  const refsBase = opciones.baseMaximaMensual === undefined ? ctx.baseMaxima(anio).refs : [];
  const exceso = Math.max(0, retribucionMensual - baseMax);
  const vacio: CuotaSolidaridad = {
    anio,
    retribucionMensual,
    baseMaximaMensual: baseMax,
    exceso,
    tramos: [],
    cuotaTotal: 0,
    cuotaEmpresa: 0,
    cuotaTrabajador: 0,
    pasos,
    avisos: [...ctx.avisos],
  };
  if (anio < primero) {
    pasos.push({
      id: 'solidaridad',
      titulo: `La cotización adicional de solidaridad rige desde ${primero}`,
      valor: 0,
      unidad: 'euros/mes',
      parametros: [refMEI('solidaridad-primer-anio')],
      articulo: 'art. 19 bis TRLGSS',
    });
    return vacio;
  }
  const l1 = reglaMEI(params, 'solidaridad-tramo-1-limite-pct') / 100;
  const l2 = reglaMEI(params, 'solidaridad-tramo-2-limite-pct') / 100;
  const importes = {
    a: Math.min(exceso, l1 * baseMax),
    b: Math.min(Math.max(exceso - l1 * baseMax, 0), (l2 - l1) * baseMax),
    c: Math.max(exceso - l2 * baseMax, 0),
  };
  const tipos: Record<'a' | 'b' | 'c', { valor: number; ref: string }> = (() => {
    const o = {} as Record<'a' | 'b' | 'c', { valor: number; ref: string }>;
    for (const t of ['a', 'b', 'c'] as const) {
      if (anio <= ultimoCal) {
        const id = `${anio}-tramo-${t}`;
        const v = params.calendarioSolidaridad.get(id);
        if (v === undefined)
          throw new DatoNoDisponible(`parametros/cuota-solidaridad-calendario.json#${id}`);
        o[t] = { valor: v, ref: ref('cuota-solidaridad-calendario', id) };
      } else {
        o[t] = {
          valor: reglaMEI(params, `solidaridad-tipo-final-tramo-${t}`),
          ref: refMEI(`solidaridad-tipo-final-tramo-${t}`),
        };
      }
    }
    return o;
  })();
  const tramos = (['a', 'b', 'c'] as const).map((t) => ({
    tramo: t,
    importe: importes[t],
    tipo: tipos[t].valor,
    cuota: redondeo((importes[t] * tipos[t].valor) / 100),
  }));
  const cuotaTotal = redondeo(tramos.reduce((s, t) => s + t.cuota, 0));
  pasos.push({
    id: 'exceso-sobre-base-maxima',
    titulo: 'Retribución por encima de la base máxima',
    valor: exceso,
    unidad: 'euros/mes',
    parametros: [
      ...refsBase,
      refMEI('solidaridad-tramo-1-limite-pct'),
      refMEI('solidaridad-tramo-2-limite-pct'),
    ],
    articulo: 'art. 19 bis TRLGSS',
    detalle: `Base máxima ${baseMax.toFixed(2)} euros/mes; tramos a ${importes.a.toFixed(2)}, b ${importes.b.toFixed(2)} y c ${importes.c.toFixed(2)}.`,
  });
  pasos.push({
    id: 'cuota-solidaridad',
    titulo: 'Cuota de solidaridad',
    valor: cuotaTotal,
    unidad: 'euros/mes',
    parametros: tramos.map((t) => tipos[t.tramo].ref),
    articulo: anio <= ultimoCal ? 'DT 42.ª TRLGSS' : 'art. 19 bis TRLGSS',
    detalle: tramos.map((t) => `${t.tramo}: ${t.importe.toFixed(2)} × ${t.tipo} %`).join('; '),
  });
  // Reparto: la misma proporción que el tipo de contingencias comunes.
  const cc =
    opciones.tiposContingenciasComunes ??
    (() => {
      const e = valorExacto(params.tipoCCEmpresa, anio);
      const t = valorExacto(params.tipoCCTrabajador, anio);
      if (e === undefined || t === undefined) {
        throw new DatoNoDisponible(
          `tipos de contingencias comunes de ${anio} (parametros/tipo-cc-empresa.json y tipo-cc-trabajador.json); puede indicarlos en opciones.tiposContingenciasComunes`,
        );
      }
      return { empresa: e, trabajador: t };
    })();
  const parteEmpresa = cc.empresa / (cc.empresa + cc.trabajador);
  const cuotaEmpresa = redondeo(cuotaTotal * parteEmpresa);
  const cuotaTrabajador = redondeo(cuotaTotal - cuotaEmpresa);
  pasos.push({
    id: 'reparto-solidaridad',
    titulo: 'Reparto entre empresa y trabajador (proporción del tipo de contingencias comunes)',
    valor: parteEmpresa * 100,
    unidad: '% a cargo de la empresa',
    parametros: [refMEI('solidaridad-reparto-como-contingencias-comunes')],
    articulo: 'art. 19 bis y DT 42.ª TRLGSS',
    detalle: `Tipos de contingencias comunes: empresa ${cc.empresa} y trabajador ${cc.trabajador}.`,
  });
  return {
    anio,
    retribucionMensual,
    baseMaximaMensual: baseMax,
    exceso,
    tramos,
    cuotaTotal,
    cuotaEmpresa,
    cuotaTrabajador,
    pasos,
    avisos: [...ctx.avisos, ...avisos],
  };
}

/** Una función por año: MEI y solidaridad de una retribución mensual. */
export function cotizacionAdicionalMensual(
  params: ParametrosMEI,
  anio: number,
  retribucionMensual: number,
  opciones: OpcionesMEI = {},
): CotizacionAdicional {
  const lecturas: LecturasMEI = { ...LECTURAS_MEI_POR_DEFECTO, ...opciones.lecturasMEI };
  tipoMEI(params, anio); // falla antes (NoImplementada) si la ley no fija el tipo del año
  const ctx = crearContexto(params, opciones);
  const baseMax = opciones.baseMaximaMensual ?? ctx.baseMaxima(anio).valor;
  const baseCotizacion = Math.min(retribucionMensual, baseMax);
  const baseMEI = lecturas.baseMEI === 'base-cotizacion' ? baseCotizacion : retribucionMensual;
  const mei = calcularMEI(params, anio, baseMEI);
  const solidaridad = cuotaSolidaridad(params, anio, retribucionMensual, {
    ...opciones,
    baseMaximaMensual: baseMax,
  });
  return {
    anio,
    retribucionMensual,
    baseCotizacion,
    mei,
    solidaridad,
    cuotaTotal: redondeo(mei.cuotaTotal + solidaridad.cuotaTotal),
    cuotaEmpresa: redondeo(mei.cuotaEmpresa + solidaridad.cuotaEmpresa),
    cuotaTrabajador: redondeo(mei.cuotaTrabajador + solidaridad.cuotaTrabajador),
  };
}
