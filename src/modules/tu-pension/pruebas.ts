/** Utilidades de los tests de «Tu pensión» (no se incluyen en la compilación de la web). */
import { HUERFANO_VACIO, SUPERVIVENCIA_VACIA, VIUDO_VACIO } from './supervivencia-tipos.ts';
import type { FormularioTuPension } from './tipos.ts';

/** Formulario válido: carrera completa de 40 años, base constante, jubilación en noviembre de 2026. */
export const FORMULARIO_BASE: FormularioTuPension = {
  prestacion: 'jubilacion',
  nacimientoMes: '11',
  nacimientoAnio: '1961',
  sexo: 'hombre',
  hijos: '0',
  hechoCausanteMes: '11',
  hechoCausanteAnio: '2026',
  inicioMes: '11',
  inicioAnio: '1986',
  mesesSinCotizar: '0',
  ubicacionLagunas: 'mitad',
  baseMensual: '2500',
  tipoCarrera: 'simple',
  tramos: [],
  definicionMedia: 'media-cotizacion-rg',
  aplicarMinimos: true,
  aplicarPensionMaxima: true,
  ipcSupuesto: '2',
  grado: '',
  origen: '',
  enAlta: true,
  trabaja: false,
  baseReguladora: '',
  lecturas: {},
  supervivencia: SUPERVIVENCIA_VACIA,
};

/**
 * Formulario válido de incapacidad: total por enfermedad común, carrera simple de 25 años a 2.000
 * euros, hecho causante en marzo de 2026 (los campos `jubilacion*` son la fecha final de la carrera).
 */
export const FORMULARIO_INCAPACIDAD: FormularioTuPension = {
  ...FORMULARIO_BASE,
  prestacion: 'incapacidad',
  nacimientoMes: '3',
  nacimientoAnio: '1981',
  hechoCausanteMes: '3',
  hechoCausanteAnio: '2026',
  inicioMes: '1',
  inicioAnio: '2000',
  baseMensual: '2000',
  grado: 'total',
  origen: 'enfermedad-comun',
};

/**
 * Formulario válido de viudedad: la persona fallecida estaba en alta (enfermedad común), con una
 * carrera simple de 2.000 euros desde enero de 2010 hasta el mes anterior al fallecimiento (marzo de
 * 2026); la persona viuda es el cónyuge, nacido en mayo de 1976 y casado en junio de 2005. Es el caso
 * de oro «viudedad-52» del motor: base reguladora 24 × 2.000 / 28 = 1.714,29; 52 % = 891,43.
 */
export const FORMULARIO_VIUDEDAD: FormularioTuPension = {
  ...FORMULARIO_BASE,
  prestacion: 'viudedad',
  nacimientoMes: '',
  nacimientoAnio: '',
  sexo: '',
  hechoCausanteMes: '3',
  hechoCausanteAnio: '2026',
  inicioMes: '1',
  inicioAnio: '2010',
  baseMensual: '2000',
  origen: 'enfermedad-comun',
  supervivencia: {
    ...SUPERVIVENCIA_VACIA,
    situacion: 'alta',
    viudo: {
      ...VIUDO_VACIO,
      vinculo: 'conyuge',
      nacimientoMes: '5',
      nacimientoAnio: '1976',
      sexo: 'hombre',
      matrimonioMes: '6',
      matrimonioAnio: '2005',
    },
  },
};

/**
 * Formulario válido de orfandad: la misma persona fallecida; el huérfano nació en enero de 2016, no
 * está incapacitado y no hay otros huérfanos ni cónyuge superviviente. 20 % de 1.714,29 = 342,86.
 */
export const FORMULARIO_ORFANDAD: FormularioTuPension = {
  ...FORMULARIO_VIUDEDAD,
  prestacion: 'orfandad',
  supervivencia: {
    ...SUPERVIVENCIA_VACIA,
    situacion: 'alta',
    huerfano: { ...HUERFANO_VACIO, nacimientoMes: '1', nacimientoAnio: '2016' },
  },
};
