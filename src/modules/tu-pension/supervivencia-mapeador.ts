/**
 * Mapeador del formulario de «Tu pensión» a la entrada del motor de supervivencia (Fase 3-C2):
 * viudedad y orfandad. Como los demás, solo traduce y valida; no calcula nada de la pensión.
 *
 * Convenciones (docs/INVENTARIO_3C2.md y docs/DECISIONES.md):
 * - El hecho causante es el fallecimiento: mes y año, con el día 1 del mes (como en las demás
 *   prestaciones). La carrera del causante cotiza hasta el mes anterior.
 * - La causa de la muerte es el campo `origen` del formulario y la base reguladora escrita por la
 *   persona es `baseReguladora`: contingencia profesional del fallecimiento o, si el causante es
 *   pensionista, base reguladora de su pensión.
 * - El motor calcula siempre con la fachada `supervivencia` (el límite conjunto del art. 229 afecta
 *   a las pensiones del mismo causante); la persona que pregunta es el primer beneficiario de su
 *   lista (`quien`).
 */
import { normalizarEleccion } from '../../engine/comparar-lecturas.ts';
import type { ConfiguracionMotor, EntradaSupervivencia } from '../../engine/fachada.ts';
import type { Carrera } from '../../engine/jubilacion/tipos.ts';
import type {
  BeneficiarioViudedad,
  Causante,
  Huerfano,
  OpcionesSupervivencia,
} from '../../engine/supervivencia/tipos.ts';
import { esOrigenProfesional, BASE_REGULADORA_MAXIMA } from './incapacidad-mapeador.ts';
import { leerEntero, leerNumero } from './lectura.ts';
import {
  absoluto,
  analizarTramos,
  carreraSimple,
  claveMes,
  validarFormulario,
  type NombresFecha,
  type ResultadoMapeo,
} from './mapeador.ts';
import type { CatalogoReferencias } from './referencias.ts';
import type {
  FormularioHuerfano,
  FormularioViudo,
  QuienSupervivencia,
  SituacionCausanteFormulario,
} from './supervivencia-tipos.ts';
import type { ErroresFormulario, FormularioTuPension } from './tipos.ts';

export const NOMBRES_FALLECIMIENTO: NombresFecha = {
  de: 'del fallecimiento',
  a: 'el fallecimiento',
};

/** Entrada del motor más quién pregunta: el primer beneficiario de la lista de su prestación. */
export interface EntradaTuSupervivencia extends EntradaSupervivencia {
  readonly quien: QuienSupervivencia;
}

export interface OpcionVinculo {
  readonly valor: BeneficiarioViudedad['vinculo'];
  readonly etiqueta: string;
}

export const VINCULOS: readonly OpcionVinculo[] = [
  { valor: 'conyuge', etiqueta: 'Cónyuge' },
  { valor: 'pareja-hecho', etiqueta: 'Pareja de hecho' },
  { valor: 'excónyuge', etiqueta: 'Excónyuge' },
  { valor: 'expareja-hecho', etiqueta: 'Expareja de hecho' },
];

export const SITUACIONES: readonly {
  readonly valor: SituacionCausanteFormulario;
  readonly etiqueta: string;
}[] = [
  { valor: 'alta', etiqueta: 'En alta o situación asimilada' },
  { valor: 'sin-alta', etiqueta: 'Sin alta' },
  { valor: 'pensionista', etiqueta: 'Pensionista de jubilación o de incapacidad permanente' },
];

export const esVinculoDeCony = (v: string): boolean => v === 'conyuge';
export const esVinculoDePareja = (v: string): boolean => v === 'pareja-hecho';
export const esVinculoDeEx = (v: string): boolean => v === 'excónyuge' || v === 'expareja-hecho';

/** Importe anual o mensual escrito por una persona: vacío es cero; lo demás, un número no negativo. */
const importeOpcional = (texto: string): number | undefined => {
  if (texto.trim() === '') return 0;
  const n = leerNumero(texto);
  return n !== undefined && n >= 0 && n <= BASE_REGULADORA_MAXIMA * 12 ? n : undefined;
};

/** Mes y año del formulario como mes absoluto, o `undefined` si no son válidos. */
function mesDe(mes: string, anio: string): number | undefined {
  const m = leerEntero(mes);
  const a = leerEntero(anio);
  return m !== undefined && m >= 1 && m <= 12 && a !== undefined && anio.trim().length === 4
    ? absoluto(a, m)
    : undefined;
}

const fechaIso = (mes: string, anio: string): string => `${claveMes(Number(anio), Number(mes))}-01`;

/** Aviso con el que el formulario pide un dato de fecha válido. */
function fechaConError(
  errores: ErroresFormulario,
  mes: string,
  anio: string,
  campoMes: keyof ErroresFormulario,
  campoAnio: keyof ErroresFormulario,
  nombre: string,
): number | undefined {
  const m = leerEntero(mes);
  const a = leerEntero(anio);
  const mesOk = m !== undefined && m >= 1 && m <= 12;
  const anioOk = a !== undefined && anio.trim().length === 4;
  if (!mesOk) errores[campoMes] = `Elige el mes ${nombre}.`;
  if (!anioOk) errores[campoAnio] = `Escribe el año ${nombre} con cuatro cifras.`;
  return mesOk && anioOk ? absoluto(a, m) : undefined;
}

function validarViudo(
  v: FormularioViudo,
  hechoCausante: number | undefined,
  errores: ErroresFormulario,
  mensajeVinculo: string,
): void {
  if (v.vinculo === '') errores.viudoVinculo = mensajeVinculo;
  const nac = fechaConError(
    errores,
    v.nacimientoMes,
    v.nacimientoAnio,
    'viudoNacimientoMes',
    'viudoNacimientoAnio',
    'de nacimiento',
  );
  if (nac !== undefined && hechoCausante !== undefined && nac >= hechoCausante) {
    errores.viudoNacimientoAnio = 'El nacimiento debe ser anterior a la fecha del fallecimiento.';
  }
  if (v.sexo === '') {
    errores.viudoSexo = 'Indica el sexo: el cálculo lo usa para el complemento por hijos.';
  }
  const hijos = leerEntero(v.hijos);
  if (hijos === undefined || hijos < 0) {
    errores.viudoHijos = 'Escribe el número de hijos como un entero (0 si no hay).';
  }
  if (v.vinculo === 'conyuge') {
    const mat = fechaConError(
      errores,
      v.matrimonioMes,
      v.matrimonioAnio,
      'viudoMatrimonioMes',
      'viudoMatrimonioAnio',
      'del matrimonio',
    );
    if (mat !== undefined && hechoCausante !== undefined && mat > hechoCausante) {
      errores.viudoMatrimonioAnio =
        'El matrimonio debe ser anterior o igual a la fecha del fallecimiento.';
    }
    const previa = leerEntero(v.convivenciaPreviaMeses);
    if (previa === undefined || previa < 0) {
      errores.viudoConvivenciaPrevia =
        'Escribe los meses de convivencia previa como un entero (0 si no hubo).';
    }
  }
  if (v.vinculo === 'pareja-hecho') {
    const conv = leerEntero(v.convivenciaMeses);
    if (conv === undefined || conv < 0) {
      errores.viudoConvivencia = 'Escribe los meses de convivencia como un entero (0 si no hubo).';
    }
    if (v.registroMes !== '' || v.registroAnio.trim() !== '') {
      const reg = fechaConError(
        errores,
        v.registroMes,
        v.registroAnio,
        'viudoRegistroMes',
        'viudoRegistroAnio',
        'de la inscripción',
      );
      if (reg !== undefined && hechoCausante !== undefined && reg > hechoCausante) {
        errores.viudoRegistroAnio =
          'La inscripción debe ser anterior o igual a la fecha del fallecimiento.';
      }
    }
  }
  if (esVinculoDeEx(v.vinculo) && importeOpcional(v.compensatoriaAnual) === undefined) {
    errores.viudoCompensatoria =
      'Escribe la pensión compensatoria anual como un importe en euros (vacío si no hay).';
  }
  const rentas: [string, keyof ErroresFormulario, string][] = [
    [v.rentasTrabajo, 'viudoRentasTrabajo', 'las rentas del trabajo'],
    [v.rentasCapital, 'viudoRentasCapital', 'las rentas del capital'],
    [v.rendimientos, 'viudoRendimientos', 'los rendimientos totales'],
    [
      v.rendimientosAnterior,
      'viudoRendimientosAnterior',
      'los rendimientos del ejercicio anterior',
    ],
  ];
  for (const [texto, campo, nombre] of rentas) {
    if (importeOpcional(texto) === undefined) {
      errores[campo] = `Escribe ${nombre} como un importe anual en euros (0 si no hay).`;
    }
  }
  if (v.cargas) {
    const miembros = leerEntero(v.miembros);
    if (miembros === undefined || miembros < 1) {
      errores.viudoMiembros = 'Escribe cuántas personas forman la unidad familiar (al menos una).';
    }
    const unidad = leerNumero(v.rendimientosUnidad);
    if (v.rendimientosUnidad.trim() === '' || unidad === undefined || unidad < 0) {
      errores.viudoRendimientosUnidad =
        'Escribe los rendimientos anuales de toda la unidad familiar, en euros.';
    }
  }
}

function validarHuerfano(
  h: FormularioHuerfano,
  hechoCausante: number | undefined,
  errores: ErroresFormulario,
): void {
  const nac = fechaConError(
    errores,
    h.nacimientoMes,
    h.nacimientoAnio,
    'huerfanoNacimientoMes',
    'huerfanoNacimientoAnio',
    'de nacimiento',
  );
  if (nac !== undefined && hechoCausante !== undefined && nac >= hechoCausante) {
    errores.huerfanoNacimientoAnio =
      'El nacimiento debe ser anterior a la fecha del fallecimiento.';
  }
  if (importeOpcional(h.rentasTrabajo) === undefined) {
    errores.huerfanoRentasTrabajo =
      'Escribe las rentas del trabajo como un importe anual en euros (0 si no hay).';
  }
  if (importeOpcional(h.rendimientos) === undefined) {
    errores.huerfanoRendimientos =
      'Escribe los rendimientos totales como un importe anual en euros (0 si no hay).';
  }
}

function validarOtrosHuerfanos(
  otros: readonly FormularioHuerfano[],
  hechoCausante: number | undefined,
  errores: ErroresFormulario,
): void {
  const mensajes: string[] = [];
  otros.forEach((h, i) => {
    const n = String(i + 1);
    const nac = mesDe(h.nacimientoMes, h.nacimientoAnio);
    if (nac === undefined) {
      mensajes.push(
        `Huérfano ${n}: elige el mes y escribe el año de nacimiento con cuatro cifras.`,
      );
    } else if (hechoCausante !== undefined && nac >= hechoCausante) {
      mensajes.push(`Huérfano ${n}: el nacimiento debe ser anterior a la fecha del fallecimiento.`);
    }
    if (
      importeOpcional(h.rentasTrabajo) === undefined ||
      importeOpcional(h.rendimientos) === undefined
    ) {
      mensajes.push(
        `Huérfano ${n}: los importes anuales deben ser números en euros (0 si no hay).`,
      );
    }
  });
  if (mensajes.length > 0) errores.otrosHuerfanos = mensajes.join(' ');
}

/** Valida el formulario de viudedad o de orfandad. Un objeto vacío significa que se puede calcular. */
export function validarFormularioSupervivencia(
  f: FormularioTuPension,
  quien: QuienSupervivencia,
): ErroresFormulario {
  const sv = f.supervivencia;
  const pensionista = sv.situacion === 'pensionista';
  const profesional = f.origen !== '' && esOrigenProfesional(f.origen);
  const errores = validarFormulario(f, NOMBRES_FALLECIMIENTO, {
    personales: false,
    carrera: !pensionista,
  });
  const hc = mesDe(f.hechoCausanteMes, f.hechoCausanteAnio);
  if (f.origen === '') errores.origen = 'Elige la causa de la muerte.';
  if (sv.situacion === '') errores.situacion = 'Elige la situación de la persona fallecida.';
  if (profesional || pensionista) {
    const base = leerNumero(f.baseReguladora);
    if (f.baseReguladora.trim() === '') {
      errores.baseReguladora = 'Escribe la base reguladora mensual, en euros.';
    } else if (base === undefined || base <= 0 || base > BASE_REGULADORA_MAXIMA) {
      errores.baseReguladora = 'La base reguladora debe ser un importe mensual positivo, en euros.';
    }
  }
  if (pensionista && !profesional) {
    const pen = fechaConError(
      errores,
      sv.pensionMes,
      sv.pensionAnio,
      'pensionMes',
      'pensionAnio',
      'de la pensión de la persona fallecida',
    );
    if (pen !== undefined && hc !== undefined && pen > hc) {
      errores.pensionAnio =
        'La pensión de la persona fallecida no puede ser posterior a su fallecimiento.';
    }
  }
  if (quien === 'viudedad') {
    validarViudo(sv.viudo, hc, errores, 'Elige tu vínculo con la persona fallecida.');
    validarOtrosHuerfanos(sv.otrosHuerfanos, hc, errores);
  } else {
    validarHuerfano(sv.huerfano, hc, errores);
    validarOtrosHuerfanos(sv.otrosHuerfanos, hc, errores);
    if (sv.hayViudo) {
      validarViudo(sv.viudo, hc, errores, 'Elige el vínculo del cónyuge o pareja superviviente.');
    }
  }
  return errores;
}

const euros = (texto: string): number => importeOpcional(texto) ?? 0;

function aViudo(v: FormularioViudo): BeneficiarioViudedad {
  const hijos = leerEntero(v.hijos) ?? 0;
  const conyuge = v.vinculo === 'conyuge';
  const pareja = v.vinculo === 'pareja-hecho';
  const ex = esVinculoDeEx(v.vinculo);
  const anterior = v.rendimientosAnterior.trim() === '' ? undefined : euros(v.rendimientosAnterior);
  const unidad = leerNumero(v.rendimientosUnidad);
  const miembros = leerEntero(v.miembros);
  return {
    vinculo: v.vinculo as BeneficiarioViudedad['vinculo'],
    nacimiento: fechaIso(v.nacimientoMes, v.nacimientoAnio),
    ...(v.sexo === '' ? {} : { sexo: v.sexo }),
    ...(conyuge
      ? {
          fechaMatrimonio: fechaIso(v.matrimonioMes, v.matrimonioAnio),
          convivenciaPreviaMeses: leerEntero(v.convivenciaPreviaMeses) ?? 0,
          enfermedadAnteriorAlVinculo: v.enfermedadAnterior,
        }
      : {}),
    ...(conyuge || pareja ? { hijosComunes: v.hijosComunes } : {}),
    ...(pareja
      ? {
          convivenciaMeses: leerEntero(v.convivenciaMeses) ?? 0,
          ...(v.registroMes === '' || v.registroAnio.trim() === ''
            ? {}
            : { fechaRegistroPareja: fechaIso(v.registroMes, v.registroAnio) }),
        }
      : {}),
    ...(ex
      ? {
          pensionCompensatoriaAnual: euros(v.compensatoriaAnual),
          victimaViolenciaGenero: v.violenciaGenero,
          nuevoVinculo: v.nuevoVinculo,
          separacionAnteriorA2008: v.separacionAnterior,
        }
      : {}),
    otraPensionPublica: v.otraPensionPublica,
    discapacidad65: v.discapacidad65,
    rentasTrabajoAnuales: euros(v.rentasTrabajo),
    rentasCapitalAnuales: euros(v.rentasCapital),
    rendimientosAnuales: euros(v.rendimientos),
    ...(anterior === undefined ? {} : { rendimientosEjercicioAnteriorAnuales: anterior }),
    hijos,
    ...(v.sexo === 'hombre' ? { hijoConOrfandad: v.hijoConOrfandad } : {}),
    ...(v.otraPensionPublica ? { brechaEnOtraPension: v.brechaEnOtraPension } : {}),
    ...(v.cargas && miembros !== undefined && unidad !== undefined
      ? {
          cargasFamiliares: {
            miembrosUnidadFamiliar: miembros,
            rendimientosEjercicioAnteriorUnidadFamiliar: unidad,
          },
        }
      : {}),
  };
}

function aHuerfano(h: FormularioHuerfano): Huerfano {
  return {
    nacimiento: fechaIso(h.nacimientoMes, h.nacimientoAnio),
    incapacitado: h.incapacitado,
    discapacidad65: h.discapacidad65,
    rentasTrabajoAnuales: euros(h.rentasTrabajo),
    rendimientosAnuales: euros(h.rendimientos),
  };
}

/** Entrada del motor y su configuración a partir del formulario, o los errores de validación. */
export function formularioAEntradaSupervivencia(
  f: FormularioTuPension,
  quien: QuienSupervivencia,
  catalogo?: CatalogoReferencias,
): ResultadoMapeo<EntradaTuSupervivencia> {
  const errores = validarFormularioSupervivencia(f, quien);
  if (f.tipoCarrera === 'tramos' && catalogo === undefined) {
    throw new Error('La carrera por tramos necesita el catálogo de referencias de base.');
  }
  const sv = f.supervivencia;
  const pensionista = sv.situacion === 'pensionista';
  const tramos =
    !pensionista && f.tipoCarrera === 'tramos' && catalogo
      ? analizarTramos(f, catalogo)
      : undefined;
  if (Object.keys(errores).length > 0 || (tramos && tramos.errores.length > 0)) {
    return { ok: false, errores, erroresTramos: tramos?.errores ?? [] };
  }
  const hc = { anio: Number(f.hechoCausanteAnio), mes: Number(f.hechoCausanteMes) };
  const profesional = f.origen !== '' && esOrigenProfesional(f.origen);
  const base = leerNumero(f.baseReguladora) ?? 0;
  const carrera: Carrera | undefined = pensionista
    ? undefined
    : (tramos?.carrera ??
      carreraSimple(
        { anio: Number(f.inicioAnio), mes: Number(f.inicioMes) },
        hc,
        leerNumero(f.baseMensual) ?? 0,
        leerEntero(f.mesesSinCotizar) ?? 0,
        f.ubicacionLagunas,
      ));
  const causante: Causante = {
    fechaFallecimiento: `${claveMes(hc.anio, hc.mes)}-01`,
    causa: f.origen as Causante['causa'],
    situacion: sv.situacion as Causante['situacion'],
    ...(carrera === undefined ? {} : { carrera }),
    ...(profesional ? { baseReguladoraProfesional: base } : {}),
    ...(pensionista && !profesional
      ? {
          pension: {
            baseReguladora: base,
            fechaHechoCausante: fechaIso(sv.pensionMes, sv.pensionAnio),
            clase: sv.clasePension,
          },
        }
      : {}),
  };
  const huerfanos: Huerfano[] =
    quien === 'orfandad'
      ? [aHuerfano(sv.huerfano), ...sv.otrosHuerfanos.map(aHuerfano)]
      : sv.otrosHuerfanos.map(aHuerfano);
  const viudos: BeneficiarioViudedad[] =
    quien === 'viudedad' || sv.hayViudo ? [aViudo(sv.viudo)] : [];
  const opciones: OpcionesSupervivencia = {
    aplicarMinimos: f.aplicarMinimos,
    aplicarPensionMaxima: f.aplicarPensionMaxima,
    ...(quien === 'orfandad' && sv.orfandadAbsoluta ? { orfandadAbsoluta: true } : {}),
  };
  const ipc = leerNumero(f.ipcSupuesto);
  const lecturas = normalizarEleccion(f.lecturas, quien);
  const configuracion: ConfiguracionMotor = {
    ...(ipc === undefined ? {} : { escenario: { ipc: ipc / 100 } }),
    ...(Object.keys(lecturas).length === 0 ? {} : { lecturas }),
  };
  return {
    ok: true,
    entrada: { quien, causante, beneficiarios: { viudos, huerfanos }, opciones },
    configuracion,
    resumenTramos: tramos?.resumen,
    avisosTramos: tramos?.avisos ?? [],
  };
}
