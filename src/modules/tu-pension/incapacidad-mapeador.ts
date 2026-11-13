/**
 * Mapeador del formulario de «Tu pensión» a la entrada del motor de incapacidad permanente
 * (Fase 3-C1). Como el de la jubilación, solo traduce y valida; no calcula nada de la pensión.
 *
 * Convenciones (docs/SIMULADOR.md y docs/DECISIONES.md):
 * - El hecho causante se guarda en los campos `jubilacionMes` y `jubilacionAnio` del formulario
 *   (fecha en que termina la carrera) y se usa el día 1 del mes, como en la jubilación.
 * - La carrera es la misma que la de la jubilación (simple o por tramos) y termina el mes anterior
 *   al hecho causante.
 * - El grado lo reconoce el organismo competente: aquí es un dato que elige la persona.
 */
import { normalizarEleccion } from '../../engine/comparar-lecturas.ts';
import type { ConfiguracionMotor, EntradaIncapacidad } from '../../engine/fachada.ts';
import type {
  GradoIncapacidad,
  OpcionesIncapacidad,
  OrigenIncapacidad,
} from '../../engine/incapacidad/tipos.ts';
import type { Carrera } from '../../engine/jubilacion/tipos.ts';
import { leerEntero, leerNumero } from './lectura.ts';
import {
  analizarTramos,
  carreraSimple,
  claveMes,
  validarFormulario,
  type NombresFecha,
  type ResultadoMapeo,
} from './mapeador.ts';
import type { CatalogoReferencias } from './referencias.ts';
import type { ErroresFormulario, FormularioTuPension } from './tipos.ts';

export const NOMBRES_HECHO_CAUSANTE: NombresFecha = {
  de: 'del hecho causante',
  a: 'el hecho causante',
};

export interface OpcionGrado {
  readonly valor: GradoIncapacidad;
  readonly etiqueta: string;
  /** Qué es, en lenguaje llano y sin cifras. */
  readonly descripcion: string;
}

/** Grados que calcula el motor (DT 26.ª del texto refundido). */
export const GRADOS: readonly OpcionGrado[] = [
  {
    valor: 'parcial',
    etiqueta: 'Parcial',
    descripcion:
      'Disminución del rendimiento normal para la profesión habitual, sin impedir las tareas fundamentales. Da una cantidad a tanto alzado, no una pensión.',
  },
  {
    valor: 'total',
    etiqueta: 'Total',
    descripcion: 'Inhabilita para la profesión habitual, pero permite otra distinta.',
  },
  {
    valor: 'absoluta',
    etiqueta: 'Absoluta',
    descripcion: 'Inhabilita para toda profesión u oficio.',
  },
  {
    valor: 'gran-incapacidad',
    etiqueta: 'Gran incapacidad',
    descripcion:
      'Además de la incapacidad absoluta, la persona necesita la asistencia de otra para los actos esenciales de la vida.',
  },
];

export interface OpcionOrigen {
  readonly valor: OrigenIncapacidad;
  readonly etiqueta: string;
  /** `false`: el motor no puede calcular este origen sin datos que la interfaz no recoge. */
  readonly disponible: boolean;
}

/** Contingencias de las que puede derivar la incapacidad, con las que el motor soporta. */
export const ORIGENES: readonly OpcionOrigen[] = [
  { valor: 'enfermedad-comun', etiqueta: 'Enfermedad común', disponible: true },
  { valor: 'accidente-no-laboral', etiqueta: 'Accidente no laboral', disponible: true },
  { valor: 'accidente-trabajo', etiqueta: 'Accidente de trabajo', disponible: false },
  { valor: 'enfermedad-profesional', etiqueta: 'Enfermedad profesional', disponible: false },
];

export const esOrigenDisponible = (o: string): o is OrigenIncapacidad =>
  ORIGENES.some((x) => x.valor === o && x.disponible);

export const esGrado = (g: string): g is GradoIncapacidad => GRADOS.some((x) => x.valor === g);

/** Valida el formulario de incapacidad. Un objeto vacío significa que se puede calcular. */
export function validarFormularioIncapacidad(f: FormularioTuPension): ErroresFormulario {
  const errores = validarFormulario(f, NOMBRES_HECHO_CAUSANTE);
  if (f.grado === '') errores.grado = 'Elige el grado de incapacidad.';
  if (f.origen === '') errores.origen = 'Elige el origen de la incapacidad.';
  else if (!esOrigenDisponible(f.origen)) {
    errores.origen =
      'Este origen no está disponible en el simulador: elige enfermedad común o accidente no laboral.';
  }
  return errores;
}

/** Entrada del motor y su configuración a partir del formulario, o los errores de validación. */
export function formularioAEntradaIncapacidad(
  f: FormularioTuPension,
  catalogo?: CatalogoReferencias,
): ResultadoMapeo<EntradaIncapacidad> {
  const errores = validarFormularioIncapacidad(f);
  if (f.tipoCarrera === 'tramos' && catalogo === undefined) {
    throw new Error('La carrera por tramos necesita el catálogo de referencias de base.');
  }
  const tramos = f.tipoCarrera === 'tramos' && catalogo ? analizarTramos(f, catalogo) : undefined;
  if (Object.keys(errores).length > 0 || (tramos && tramos.errores.length > 0)) {
    return { ok: false, errores, erroresTramos: tramos?.errores ?? [] };
  }
  const nac = { anio: Number(f.nacimientoAnio), mes: Number(f.nacimientoMes) };
  const hc = { anio: Number(f.jubilacionAnio), mes: Number(f.jubilacionMes) };
  const sexo = f.sexo === 'mujer' ? 'mujer' : 'hombre';
  const opciones: OpcionesIncapacidad = {
    sexo,
    // Como en la jubilación: los hijos solo cuentan para el complemento por hijos, que se pide a mujeres.
    hijos: f.sexo === 'mujer' ? (leerEntero(f.hijos) ?? 0) : 0,
    aplicarMinimos: f.aplicarMinimos,
    aplicarPensionMaxima: f.aplicarPensionMaxima,
    enAlta: f.enAlta,
    trabaja: f.trabaja,
  };
  const ipc = leerNumero(f.ipcSupuesto);
  const lecturas = normalizarEleccion(f.lecturas, 'incapacidad');
  const carrera: Carrera =
    tramos?.carrera ??
    carreraSimple(
      { anio: Number(f.inicioAnio), mes: Number(f.inicioMes) },
      hc,
      leerNumero(f.baseMensual) ?? 0,
      leerEntero(f.mesesSinCotizar) ?? 0,
      f.ubicacionLagunas,
    );
  const configuracion: ConfiguracionMotor = {
    ...(ipc === undefined ? {} : { escenario: { ipc: ipc / 100 } }),
    ...(Object.keys(lecturas).length === 0 ? {} : { lecturas }),
  };
  return {
    ok: true,
    entrada: {
      carrera,
      nacimiento: `${claveMes(nac.anio, nac.mes)}-01`,
      fechaHechoCausante: `${claveMes(hc.anio, hc.mes)}-01`,
      grado: f.grado as GradoIncapacidad,
      origen: f.origen as OrigenIncapacidad,
      opciones,
    },
    configuracion,
    resumenTramos: tramos?.resumen,
    avisosTramos: tramos?.avisos ?? [],
  };
}
