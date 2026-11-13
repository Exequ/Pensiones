/**
 * Mapeador del formulario de «Tu pensión» a la entrada del motor de jubilación ordinaria.
 *
 * Solo traduce y valida lo que la persona escribe; no calcula nada de la pensión (eso es del
 * motor, `src/engine`). Las únicas reglas propias son de forma: fechas y periodos bien formados.
 *
 * Convenciones (documentadas en docs/SIMULADOR.md y docs/DECISIONES.md):
 * - Nacimiento y jubilación son mes y año; se usa el día 1 de cada mes, de modo que quien
 *   cumple la edad el mismo mes en que se jubila cumple el requisito.
 * - La carrera cotiza cada mes desde el inicio hasta el mes anterior a la jubilación, con una
 *   base mensual constante. Los meses sin cotizar forman un único bloque, en la mitad de la
 *   carrera o justo antes de la jubilación.
 */
import type { ConfiguracionMotor, EntradaJubilacion } from '../../engine/fachada.ts';
import { normalizarEleccion } from '../../engine/comparar-lecturas.ts';
import type { Carrera, OpcionesJubilacion } from '../../engine/jubilacion/tipos.ts';
import { leerEntero, leerNumero, numeroATexto } from './lectura.ts';
import type { CatalogoReferencias } from './referencias.ts';
import type { ErroresFormulario, FormularioTuPension } from './tipos.ts';
import {
  mesAbsoluto,
  nuevoIdTramo,
  procesarTramos,
  type AvisoTramo,
  type ErrorTramo,
  type ResultadoTramos,
  type ResumenCarrera,
  type TramoFormulario,
} from './tramos.ts';

export { leerNumero, numeroATexto };

export type ResultadoMapeo =
  | {
      readonly ok: true;
      readonly entrada: EntradaJubilacion;
      readonly configuracion: ConfiguracionMotor;
      /** Resumen y avisos de la carrera por tramos (vacíos en la carrera simple). */
      readonly resumenTramos: ResumenCarrera | undefined;
      readonly avisosTramos: readonly AvisoTramo[];
    }
  | {
      readonly ok: false;
      readonly errores: ErroresFormulario;
      /** Errores de la tabla de tramos (solo con la carrera por tramos). */
      readonly erroresTramos: readonly ErrorTramo[];
    };

const mes2 = (m: number): string => String(m).padStart(2, '0');
const claveMes = (anio: number, mes: number): string => `${String(anio)}-${mes2(mes)}`;
/** Meses absolutos (año × 12 + mes − 1) para sumar y restar meses sin tocar fechas. */
const absoluto = (anio: number, mes: number): number => anio * 12 + mes - 1;
function deAbsoluto(abs: number): string {
  return claveMes(Math.floor(abs / 12), (abs % 12) + 1);
}

interface MesAnio {
  readonly anio: number;
  readonly mes: number;
}

function leerMesAnio(
  mesTexto: string,
  anioTexto: string,
  errores: ErroresFormulario,
  campoMes: 'nacimientoMes' | 'jubilacionMes' | 'inicioMes',
  campoAnio: 'nacimientoAnio' | 'jubilacionAnio' | 'inicioAnio',
  nombre: string,
): MesAnio | undefined {
  const mes = leerEntero(mesTexto);
  const anio = leerEntero(anioTexto);
  let ok = true;
  if (mes === undefined || mes < 1 || mes > 12) {
    errores[campoMes] = `Elige el mes de ${nombre}.`;
    ok = false;
  }
  if (anio === undefined || anioTexto.trim().length !== 4) {
    errores[campoAnio] = `Escribe el año de ${nombre} con cuatro cifras.`;
    ok = false;
  }
  return ok && mes !== undefined && anio !== undefined ? { anio, mes } : undefined;
}

/** Valida el formulario. Un objeto vacío significa que se puede calcular. */
export function validarFormulario(f: FormularioTuPension): ErroresFormulario {
  const errores: ErroresFormulario = {};
  const nac = leerMesAnio(
    f.nacimientoMes,
    f.nacimientoAnio,
    errores,
    'nacimientoMes',
    'nacimientoAnio',
    'nacimiento',
  );
  const jub = leerMesAnio(
    f.jubilacionMes,
    f.jubilacionAnio,
    errores,
    'jubilacionMes',
    'jubilacionAnio',
    'jubilación',
  );
  const simple = f.tipoCarrera === 'simple';
  // El inicio de la cotización, los meses sin cotizar y la base solo existen en la carrera simple.
  const ini = simple
    ? leerMesAnio(
        f.inicioMes,
        f.inicioAnio,
        errores,
        'inicioMes',
        'inicioAnio',
        'inicio de la cotización',
      )
    : undefined;
  if (f.sexo === '')
    errores.sexo =
      'Indica el sexo: el cálculo lo usa para integrar lagunas y para el complemento por hijos.';

  if (f.sexo === 'mujer') {
    const h = leerEntero(f.hijos);
    if (h === undefined || h < 0)
      errores.hijos = 'Escribe el número de hijos como un entero (0 si no tienes).';
  }

  const lagunas = simple ? leerEntero(f.mesesSinCotizar) : undefined;
  if (simple && (lagunas === undefined || lagunas < 0)) {
    errores.mesesSinCotizar = 'Escribe los meses sin cotizar como un entero (0 si no hay).';
  }

  const base = leerNumero(f.baseMensual);
  if (simple && (base === undefined || base <= 0)) {
    errores.baseMensual =
      'Escribe una base mensual de cotización mayor que cero (por ejemplo, 2.000,50).';
  }

  if (f.ipcSupuesto.trim() !== '' && leerNumero(f.ipcSupuesto) === undefined) {
    errores.ipcSupuesto =
      'Escribe el IPC supuesto como un número (por ejemplo, 2 o 2,5), o déjalo vacío.';
  }

  if (nac && jub && absoluto(jub.anio, jub.mes) <= absoluto(nac.anio, nac.mes)) {
    errores.jubilacionAnio = 'La fecha de jubilación debe ser posterior a la de nacimiento.';
  }
  if (ini && nac && absoluto(ini.anio, ini.mes) <= absoluto(nac.anio, nac.mes)) {
    errores.inicioAnio = 'El inicio de la cotización debe ser posterior al nacimiento.';
  }
  if (
    ini &&
    jub &&
    !errores.inicioAnio &&
    absoluto(ini.anio, ini.mes) >= absoluto(jub.anio, jub.mes)
  ) {
    errores.inicioAnio = 'El inicio de la cotización debe ser anterior a la jubilación.';
  } else if (ini && jub && lagunas !== undefined && lagunas >= 0) {
    const meses = absoluto(jub.anio, jub.mes) - absoluto(ini.anio, ini.mes);
    if (lagunas >= meses) {
      errores.mesesSinCotizar =
        'Los meses sin cotizar deben ser menos que los meses entre el inicio y la jubilación.';
    }
  }
  return errores;
}

/** Carrera simple: una base constante, con un bloque de meses sin cotizar. */
export function carreraSimple(
  inicio: MesAnio,
  jubilacion: MesAnio,
  baseMensual: number,
  mesesSinCotizar: number,
  ubicacion: FormularioTuPension['ubicacionLagunas'],
): Carrera {
  const primero = absoluto(inicio.anio, inicio.mes);
  const ultimo = absoluto(jubilacion.anio, jubilacion.mes) - 1;
  const periodo = (desde: number, hasta: number) => ({
    desde: deAbsoluto(desde),
    hasta: deAbsoluto(hasta),
    baseMensual,
  });
  if (mesesSinCotizar === 0) return [periodo(primero, ultimo)];
  const cotizados = ultimo - primero + 1 - mesesSinCotizar;
  if (ubicacion === 'final') return [periodo(primero, primero + cotizados - 1)];
  const antes = Math.floor(cotizados / 2);
  const tramos: Carrera[number][] = [];
  if (antes > 0) tramos.push(periodo(primero, primero + antes - 1));
  tramos.push(periodo(primero + antes + mesesSinCotizar, ultimo));
  return tramos;
}

/** Mes de nacimiento y mes anterior a la jubilación (meses absolutos), si esos campos son válidos. */
function fechasClave(f: FormularioTuPension): {
  nacimiento: number | undefined;
  mesPrevio: number | undefined;
} {
  const mes = (m: string, a: string): number | undefined => {
    const mm = leerEntero(m);
    const aa = leerEntero(a);
    return mm !== undefined && mm >= 1 && mm <= 12 && aa !== undefined && a.trim().length === 4
      ? mesAbsoluto(aa, mm)
      : undefined;
  };
  const jub = mes(f.jubilacionMes, f.jubilacionAnio);
  return {
    nacimiento: mes(f.nacimientoMes, f.nacimientoAnio),
    mesPrevio: jub === undefined ? undefined : jub - 1,
  };
}

/**
 * Tramos equivalentes a la carrera simple del formulario, para partir de ella al pasar a la carrera
 * por tramos. `undefined` si la carrera simple no está completa o es inválida.
 */
export function tramosDeCarreraSimple(f: FormularioTuPension): TramoFormulario[] | undefined {
  const errores = validarFormulario({ ...f, tipoCarrera: 'simple' });
  const campos = [
    'jubilacionMes',
    'jubilacionAnio',
    'inicioMes',
    'inicioAnio',
    'mesesSinCotizar',
    'baseMensual',
  ] as const;
  if (campos.some((c) => errores[c] !== undefined)) return undefined;
  const periodos = carreraSimple(
    { anio: Number(f.inicioAnio), mes: Number(f.inicioMes) },
    { anio: Number(f.jubilacionAnio), mes: Number(f.jubilacionMes) },
    leerNumero(f.baseMensual) ?? 0,
    leerEntero(f.mesesSinCotizar) ?? 0,
    f.ubicacionLagunas,
  );
  return periodos.flatMap((p) => {
    if (!('baseMensual' in p)) return [];
    const [da = '', dm = ''] = p.desde.split('-');
    const [ha = '', hm = ''] = p.hasta.split('-');
    return [
      {
        id: nuevoIdTramo(),
        desdeMes: String(Number(dm)),
        desdeAnio: da,
        hastaMes: String(Number(hm)),
        hastaAnio: ha,
        referencia: 'importe' as const,
        importe: numeroATexto(p.baseMensual),
      },
    ];
  });
}

/** Mes y año de nacimiento y de jubilación del formulario, si son válidos. */
export function leerFechasFormulario(f: FormularioTuPension): {
  nacimiento: MesAnio | undefined;
  jubilacion: MesAnio | undefined;
} {
  const leer = (m: string, a: string): MesAnio | undefined => {
    const mes = leerEntero(m);
    const anio = leerEntero(a);
    return mes !== undefined && mes >= 1 && mes <= 12 && anio !== undefined && a.trim().length === 4
      ? { anio, mes }
      : undefined;
  };
  return {
    nacimiento: leer(f.nacimientoMes, f.nacimientoAnio),
    jubilacion: leer(f.jubilacionMes, f.jubilacionAnio),
  };
}

/** Valida y traduce la carrera por tramos del formulario (con las fechas del propio formulario). */
export function analizarTramos(
  f: FormularioTuPension,
  catalogo: CatalogoReferencias,
): ResultadoTramos {
  return procesarTramos(f.tramos, {
    catalogo,
    definicionMedia: f.definicionMedia,
    ...fechasClave(f),
  });
}

/** Entrada del motor y su configuración a partir del formulario, o los errores de validación. */
export function formularioAEntrada(
  f: FormularioTuPension,
  catalogo?: CatalogoReferencias,
): ResultadoMapeo {
  const errores = validarFormulario(f);
  if (f.tipoCarrera === 'tramos' && catalogo === undefined) {
    throw new Error('La carrera por tramos necesita el catálogo de referencias de base.');
  }
  const tramos = f.tipoCarrera === 'tramos' && catalogo ? analizarTramos(f, catalogo) : undefined;
  if (Object.keys(errores).length > 0 || (tramos && tramos.errores.length > 0)) {
    return { ok: false, errores, erroresTramos: tramos?.errores ?? [] };
  }
  const nac = { anio: Number(f.nacimientoAnio), mes: Number(f.nacimientoMes) };
  const jub = { anio: Number(f.jubilacionAnio), mes: Number(f.jubilacionMes) };
  const sexo = f.sexo === 'mujer' ? 'mujer' : 'hombre';
  const opciones: OpcionesJubilacion = {
    sexo,
    // El motor solo computa hijos para el complemento de brecha de género, que se pide a mujeres.
    hijos: f.sexo === 'mujer' ? (leerEntero(f.hijos) ?? 0) : 0,
    aplicarMinimos: f.aplicarMinimos,
    aplicarPensionMaxima: f.aplicarPensionMaxima,
  };
  const ipc = leerNumero(f.ipcSupuesto);
  const lecturas = normalizarEleccion(f.lecturas);
  const carrera: Carrera =
    tramos?.carrera ??
    carreraSimple(
      { anio: Number(f.inicioAnio), mes: Number(f.inicioMes) },
      jub,
      leerNumero(f.baseMensual) ?? 0,
      leerEntero(f.mesesSinCotizar) ?? 0,
      f.ubicacionLagunas,
    );
  return {
    ok: true,
    entrada: {
      carrera,
      nacimiento: `${claveMes(nac.anio, nac.mes)}-01`,
      fechaJubilacion: `${claveMes(jub.anio, jub.mes)}-01`,
      modalidad: 'ordinaria',
      opciones,
    },
    // El IPC se escribe en % y el motor lo recibe como fracción. Las lecturas son las elegidas.
    configuracion: {
      ...(ipc === undefined ? {} : { escenario: { ipc: ipc / 100 } }),
      ...(Object.keys(lecturas).length === 0 ? {} : { lecturas }),
    },
    resumenTramos: tramos?.resumen,
    avisosTramos: tramos?.avisos ?? [],
  };
}
