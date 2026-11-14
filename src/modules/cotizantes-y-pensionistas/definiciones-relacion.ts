/**
 * Las seis definiciones de la relación entre afiliados y pensiones o pensionistas: qué cuenta el
 * denominador, qué es el numerador y a qué fecha se refiere cada cifra. Solo texto y claves de
 * serie; las cifras salen de /data. Las fechas se escriben con palabras, sin cifras (regla a).
 *
 * «mismaFecha» marca las parejas cuyo numerador y denominador se miden en fechas contiguas (el
 * último día de diciembre y el primer día de enero siguiente). Es una descripción de las fechas:
 * no jerarquiza las definiciones. Las demás combinan un promedio (del mes o del año) con un
 * valor puntual, o un valor puntual con otro de fecha distinta.
 */
import type { DatosCotizantes } from '../historico/datos-cotizantes';

export const MARCA_MISMA_FECHA = 'Misma fecha de referencia (fechas contiguas)';
export const MARCA_FECHAS_DISTINTAS = 'Fechas distintas';

export interface DefinicionRelacion {
  readonly serie: keyof DatosCotizantes['relacion'];
  readonly definicion: string;
  /** Qué cuenta el denominador: pensiones o personas. */
  readonly cuenta: 'Pensiones' | 'Personas (pensionistas)';
  readonly numerador: string;
  readonly fechaNumerador: string;
  readonly denominador: string;
  readonly fechaDenominador: string;
  readonly mismaFecha: boolean;
}

export const DEFINICIONES_RELACION: readonly DefinicionRelacion[] = [
  {
    serie: 'porPensionDiciembre',
    definicion: 'Afiliados de diciembre por pensión',
    cuenta: 'Pensiones',
    numerador: 'Afiliados medios en alta del mes de diciembre',
    fechaNumerador: 'Promedio del mes de diciembre',
    denominador: 'Pensiones contributivas en vigor',
    fechaDenominador: 'Primer día de diciembre',
    mismaFecha: false,
  },
  {
    serie: 'porPensionMediaAnual',
    definicion: 'Afiliados medios del año por pensión',
    cuenta: 'Pensiones',
    numerador: 'Media de los afiliados medios mensuales del año',
    fechaNumerador: 'Promedio de los doce meses del año',
    denominador: 'Pensiones contributivas en vigor',
    fechaDenominador: 'Primer día de diciembre',
    mismaFecha: false,
  },
  {
    serie: 'porPensionUltimoDia',
    definicion: 'Afiliados a último día de diciembre por pensión',
    cuenta: 'Pensiones',
    numerador: 'Afiliados en alta',
    fechaNumerador: 'Último día de diciembre',
    denominador: 'Pensiones contributivas en vigor',
    fechaDenominador: 'Primer día de enero siguiente',
    mismaFecha: true,
  },
  {
    serie: 'porPensionistaDiciembre',
    definicion: 'Afiliados de diciembre por pensionista',
    cuenta: 'Personas (pensionistas)',
    numerador: 'Afiliados medios en alta del mes de diciembre',
    fechaNumerador: 'Promedio del mes de diciembre',
    denominador: 'Pensionistas (personas con al menos una pensión contributiva)',
    fechaDenominador: 'Diciembre (cifra de diciembre de la serie histórica)',
    mismaFecha: false,
  },
  {
    serie: 'porPensionistaMediaAnual',
    definicion: 'Afiliados medios del año por pensionista',
    cuenta: 'Personas (pensionistas)',
    numerador: 'Media de los afiliados medios mensuales del año',
    fechaNumerador: 'Promedio de los doce meses del año',
    denominador: 'Pensionistas (personas con al menos una pensión contributiva)',
    fechaDenominador: 'Diciembre (cifra de diciembre de la serie histórica)',
    mismaFecha: false,
  },
  {
    serie: 'porPensionistaUltimoDia',
    definicion: 'Afiliados a último día de diciembre por pensionista',
    cuenta: 'Personas (pensionistas)',
    numerador: 'Afiliados en alta',
    fechaNumerador: 'Último día de diciembre',
    denominador: 'Pensionistas (personas con al menos una pensión contributiva)',
    fechaDenominador: 'Primer día de enero siguiente',
    mismaFecha: true,
  },
];
