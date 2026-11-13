/** Utilidades de los tests de «Tu pensión» (no se incluyen en la compilación de la web). */
import type { FormularioTuPension } from './tipos.ts';

/** Formulario válido: carrera completa de 40 años, base constante, jubilación en noviembre de 2026. */
export const FORMULARIO_BASE: FormularioTuPension = {
  prestacion: 'jubilacion',
  nacimientoMes: '11',
  nacimientoAnio: '1961',
  sexo: 'hombre',
  hijos: '0',
  jubilacionMes: '11',
  jubilacionAnio: '2026',
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
  lecturas: {},
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
  jubilacionMes: '3',
  jubilacionAnio: '2026',
  inicioMes: '1',
  inicioAnio: '2000',
  baseMensual: '2000',
  grado: 'total',
  origen: 'enfermedad-comun',
};
