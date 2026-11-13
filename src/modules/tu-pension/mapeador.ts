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
import type { Carrera, OpcionesJubilacion } from '../../engine/jubilacion/tipos.ts';
import type { ErroresFormulario, FormularioTuPension } from './tipos.ts';

export type ResultadoMapeo =
  | {
      readonly ok: true;
      readonly entrada: EntradaJubilacion;
      readonly configuracion: ConfiguracionMotor;
    }
  | { readonly ok: false; readonly errores: ErroresFormulario };

/**
 * Número escrito por una persona, con la convención española: la coma es el separador decimal y el
 * punto agrupa miles («2.500» es dos mil quinientos; «2.5» es dos coma cinco). `undefined` si no
 * es un número.
 */
export function leerNumero(texto: string): number | undefined {
  const t = texto.trim().replace(/\s/g, '');
  let limpio: string;
  if (t.includes(',')) limpio = t.replace(/\./g, '').replace(',', '.');
  else if (/^[+-]?\d{1,3}(\.\d{3})+$/.test(t)) limpio = t.replace(/\./g, '');
  else limpio = t;
  if (limpio === '' || !/^[+-]?\d+(\.\d+)?$/.test(limpio)) return undefined;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : undefined;
}

/** Número como texto editable (coma decimal, sin agrupar miles). */
export function numeroATexto(n: number): string {
  return String(n).replace('.', ',');
}

function leerEntero(texto: string): number | undefined {
  const n = leerNumero(texto);
  return n !== undefined && Number.isInteger(n) ? n : undefined;
}

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
  const ini = leerMesAnio(
    f.inicioMes,
    f.inicioAnio,
    errores,
    'inicioMes',
    'inicioAnio',
    'inicio de la cotización',
  );
  if (f.sexo === '')
    errores.sexo =
      'Indica el sexo: el cálculo lo usa para integrar lagunas y para el complemento por hijos.';

  if (f.sexo === 'mujer') {
    const h = leerEntero(f.hijos);
    if (h === undefined || h < 0)
      errores.hijos = 'Escribe el número de hijos como un entero (0 si no tienes).';
  }

  const lagunas = leerEntero(f.mesesSinCotizar);
  if (lagunas === undefined || lagunas < 0) {
    errores.mesesSinCotizar = 'Escribe los meses sin cotizar como un entero (0 si no hay).';
  }

  const base = leerNumero(f.baseMensual);
  if (base === undefined || base <= 0) {
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

/** Entrada del motor y su configuración a partir del formulario, o los errores de validación. */
export function formularioAEntrada(f: FormularioTuPension): ResultadoMapeo {
  const errores = validarFormulario(f);
  if (Object.keys(errores).length > 0) return { ok: false, errores };
  const nac = { anio: Number(f.nacimientoAnio), mes: Number(f.nacimientoMes) };
  const jub = { anio: Number(f.jubilacionAnio), mes: Number(f.jubilacionMes) };
  const ini = { anio: Number(f.inicioAnio), mes: Number(f.inicioMes) };
  const sexo = f.sexo === 'mujer' ? 'mujer' : 'hombre';
  const opciones: OpcionesJubilacion = {
    sexo,
    // El motor solo computa hijos para el complemento de brecha de género, que se pide a mujeres.
    hijos: f.sexo === 'mujer' ? (leerEntero(f.hijos) ?? 0) : 0,
    aplicarMinimos: f.aplicarMinimos,
    aplicarPensionMaxima: f.aplicarPensionMaxima,
  };
  const ipc = leerNumero(f.ipcSupuesto);
  return {
    ok: true,
    entrada: {
      carrera: carreraSimple(
        ini,
        jub,
        leerNumero(f.baseMensual) ?? 0,
        leerEntero(f.mesesSinCotizar) ?? 0,
        f.ubicacionLagunas,
      ),
      nacimiento: `${claveMes(nac.anio, nac.mes)}-01`,
      fechaJubilacion: `${claveMes(jub.anio, jub.mes)}-01`,
      modalidad: 'ordinaria',
      opciones,
    },
    // El IPC se escribe en % y el motor lo recibe como fracción.
    configuracion: ipc === undefined ? {} : { escenario: { ipc: ipc / 100 } },
  };
}
