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
