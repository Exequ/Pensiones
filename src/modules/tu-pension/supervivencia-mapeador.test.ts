import { describe, expect, it } from 'vitest';
import { calcularTuPension, type Dependencias } from './calcular';
import { crearMotorDelRepositorio, leerReferenciaDeRepositorio } from './motor';
import { FORMULARIO_ORFANDAD, FORMULARIO_VIUDEDAD } from './pruebas';
import { catalogoPorDefecto } from './referencias-datos';
import {
  formularioAEntradaSupervivencia,
  validarFormularioSupervivencia,
} from './supervivencia-mapeador';
import { SUPERVIVENCIA_VACIA, nuevoHuerfano, type FormularioViudo } from './supervivencia-tipos';
import type { FormularioTuPension } from './tipos';

const deps: Dependencias = {
  fabricaMotor: crearMotorDelRepositorio,
  leerReferencia: leerReferenciaDeRepositorio,
  catalogo: catalogoPorDefecto(),
};

const conViudo = (f: FormularioTuPension, v: Partial<FormularioViudo>): FormularioTuPension => ({
  ...f,
  supervivencia: { ...f.supervivencia, viudo: { ...f.supervivencia.viudo, ...v } },
});

describe('validación del formulario de viudedad', () => {
  it('un formulario completo no tiene errores', () => {
    expect(validarFormularioSupervivencia(FORMULARIO_VIUDEDAD, 'viudedad')).toEqual({});
  });

  it('pide la causa, la situación, el vínculo y las fechas, en español', () => {
    const f: FormularioTuPension = {
      ...FORMULARIO_VIUDEDAD,
      origen: '',
      hechoCausanteMes: '',
      hechoCausanteAnio: '26',
      supervivencia: SUPERVIVENCIA_VACIA,
    };
    const e = validarFormularioSupervivencia(f, 'viudedad');
    expect(e.origen).toBe('Elige la causa de la muerte.');
    expect(e.situacion).toBe('Elige la situación de la persona fallecida.');
    expect(e.hechoCausanteMes).toBe('Elige el mes del fallecimiento.');
    expect(e.hechoCausanteAnio).toBe('Escribe el año del fallecimiento con cuatro cifras.');
    expect(e.viudoVinculo).toBe('Elige tu vínculo con la persona fallecida.');
    expect(e.viudoNacimientoMes).toBe('Elige el mes de nacimiento.');
    expect(e.viudoSexo).toMatch(/Indica el sexo/);
  });

  it('las preguntas del vínculo solo se validan cuando el vínculo las necesita', () => {
    // Cónyuge: pide el matrimonio; pareja de hecho: pide la convivencia; excónyuge: la compensatoria.
    expect(
      validarFormularioSupervivencia(
        conViudo(FORMULARIO_VIUDEDAD, { matrimonioMes: '', matrimonioAnio: '' }),
        'viudedad',
      ).viudoMatrimonioMes,
    ).toBe('Elige el mes del matrimonio.');
    const pareja = conViudo(FORMULARIO_VIUDEDAD, {
      vinculo: 'pareja-hecho',
      matrimonioMes: '',
      matrimonioAnio: '',
      convivenciaMeses: '',
    });
    const e = validarFormularioSupervivencia(pareja, 'viudedad');
    expect(e.viudoMatrimonioMes).toBeUndefined();
    expect(e.viudoConvivencia).toMatch(/meses de convivencia/);
    const ex = conViudo(FORMULARIO_VIUDEDAD, { vinculo: 'excónyuge', compensatoriaAnual: 'mucho' });
    expect(validarFormularioSupervivencia(ex, 'viudedad').viudoCompensatoria).toMatch(
      /pensión compensatoria/,
    );
  });

  it('las cargas familiares piden los miembros y los rendimientos de la unidad', () => {
    const f = conViudo(FORMULARIO_VIUDEDAD, {
      cargas: true,
      miembros: '0',
      rendimientosUnidad: '',
    });
    const e = validarFormularioSupervivencia(f, 'viudedad');
    expect(e.viudoMiembros).toMatch(/unidad familiar/);
    expect(e.viudoRendimientosUnidad).toMatch(/unidad familiar/);
  });

  it('el nacimiento y el matrimonio no pueden ser posteriores al fallecimiento', () => {
    const f = conViudo(FORMULARIO_VIUDEDAD, {
      nacimientoAnio: '2030',
      matrimonioAnio: '2030',
    });
    const e = validarFormularioSupervivencia(f, 'viudedad');
    expect(e.viudoNacimientoAnio).toBe(
      'El nacimiento debe ser anterior a la fecha del fallecimiento.',
    );
    expect(e.viudoMatrimonioAnio).toMatch(/matrimonio debe ser anterior/);
  });

  it('con accidente de trabajo hace falta la base reguladora; con pensionista, la base y la fecha de su pensión', () => {
    const profesional = { ...FORMULARIO_VIUDEDAD, origen: 'accidente-trabajo' as const };
    expect(validarFormularioSupervivencia(profesional, 'viudedad').baseReguladora).toBe(
      'Escribe la base reguladora mensual, en euros.',
    );
    const pensionista: FormularioTuPension = {
      ...FORMULARIO_VIUDEDAD,
      supervivencia: { ...FORMULARIO_VIUDEDAD.supervivencia, situacion: 'pensionista' },
    };
    const e = validarFormularioSupervivencia(pensionista, 'viudedad');
    expect(e.baseReguladora).toBeDefined();
    expect(e.pensionMes).toBe('Elige el mes de la pensión de la persona fallecida.');
    // Con un causante pensionista no se pide la carrera.
    expect(e.inicioAnio).toBeUndefined();
  });

  it('lista los otros huérfanos con problemas', () => {
    const f: FormularioTuPension = {
      ...FORMULARIO_VIUDEDAD,
      supervivencia: {
        ...FORMULARIO_VIUDEDAD.supervivencia,
        otrosHuerfanos: [nuevoHuerfano()],
      },
    };
    expect(validarFormularioSupervivencia(f, 'viudedad').otrosHuerfanos).toMatch(/Huérfano 1/);
  });
});

describe('validación del formulario de orfandad', () => {
  it('un formulario completo no tiene errores y el cónyuge superviviente solo se valida si hay', () => {
    expect(validarFormularioSupervivencia(FORMULARIO_ORFANDAD, 'orfandad')).toEqual({});
    const sinDatos: FormularioTuPension = {
      ...FORMULARIO_ORFANDAD,
      supervivencia: { ...FORMULARIO_ORFANDAD.supervivencia, hayViudo: true },
    };
    expect(validarFormularioSupervivencia(sinDatos, 'orfandad').viudoVinculo).toBe(
      'Elige el vínculo del cónyuge o pareja superviviente.',
    );
  });

  it('pide el nacimiento del huérfano', () => {
    const f: FormularioTuPension = {
      ...FORMULARIO_ORFANDAD,
      supervivencia: {
        ...FORMULARIO_ORFANDAD.supervivencia,
        huerfano: {
          ...FORMULARIO_ORFANDAD.supervivencia.huerfano,
          nacimientoMes: '',
          nacimientoAnio: '',
        },
      },
    };
    const e = validarFormularioSupervivencia(f, 'orfandad');
    expect(e.huerfanoNacimientoMes).toBe('Elige el mes de nacimiento.');
  });
});

describe('entrada del motor', () => {
  it('viudedad: la persona viuda es la primera de la lista y los hijos son los otros huérfanos', () => {
    const m = formularioAEntradaSupervivencia(
      {
        ...FORMULARIO_VIUDEDAD,
        supervivencia: {
          ...FORMULARIO_VIUDEDAD.supervivencia,
          otrosHuerfanos: [
            { ...nuevoHuerfano(), nacimientoMes: '6', nacimientoAnio: '2014', incapacitado: true },
          ],
        },
      },
      'viudedad',
    );
    expect(m.ok).toBe(true);
    if (!m.ok) return;
    expect(m.entrada.causante).toMatchObject({
      fechaFallecimiento: '2026-03-01',
      causa: 'enfermedad-comun',
      situacion: 'alta',
    });
    expect(m.entrada.beneficiarios.viudos).toHaveLength(1);
    expect(m.entrada.beneficiarios.viudos?.[0]).toMatchObject({
      vinculo: 'conyuge',
      nacimiento: '1976-05-01',
      fechaMatrimonio: '2005-06-01',
    });
    expect(m.entrada.beneficiarios.huerfanos).toEqual([
      expect.objectContaining({ nacimiento: '2014-06-01', incapacitado: true }),
    ]);
  });

  it('orfandad: el huérfano que pregunta va primero y la orfandad absoluta es una opción', () => {
    const m = formularioAEntradaSupervivencia(
      {
        ...FORMULARIO_ORFANDAD,
        supervivencia: { ...FORMULARIO_ORFANDAD.supervivencia, orfandadAbsoluta: true },
      },
      'orfandad',
    );
    expect(m.ok).toBe(true);
    if (!m.ok) return;
    expect(m.entrada.quien).toBe('orfandad');
    expect(m.entrada.beneficiarios.viudos).toEqual([]);
    expect(m.entrada.beneficiarios.huerfanos?.[0]?.nacimiento).toBe('2016-01-01');
    expect(m.entrada.opciones?.orfandadAbsoluta).toBe(true);
  });

  it('las rentas del ejercicio anterior y las cargas llegan al motor con su nombre', () => {
    const m = formularioAEntradaSupervivencia(
      conViudo(FORMULARIO_VIUDEDAD, {
        cargas: true,
        miembros: '3',
        rendimientosUnidad: '10.000,50',
        rendimientosAnterior: '5000',
        rendimientos: '4000',
      }),
      'viudedad',
    );
    expect(m.ok).toBe(true);
    if (!m.ok) return;
    expect(m.entrada.beneficiarios.viudos?.[0]).toMatchObject({
      rendimientosAnuales: 4000,
      rendimientosEjercicioAnteriorAnuales: 5000,
      cargasFamiliares: {
        miembrosUnidadFamiliar: 3,
        rendimientosEjercicioAnteriorUnidadFamiliar: 10000.5,
      },
    });
  });

  it('los enfoques no soportados no llegan al motor: devuelve los errores de validación', () => {
    const m = formularioAEntradaSupervivencia({ ...FORMULARIO_VIUDEDAD, origen: '' }, 'viudedad');
    expect(m.ok).toBe(false);
  });
});

describe('casos que el simulador no calcula: mensaje con la fecha y el motivo', () => {
  it('pareja de hecho con fallecimiento anterior al primer año del motor', () => {
    const r = calcularTuPension(
      {
        ...conViudo(FORMULARIO_VIUDEDAD, {
          vinculo: 'pareja-hecho',
          convivenciaMeses: '80',
          registroMes: '1',
          registroAnio: '2010',
        }),
        hechoCausanteAnio: '2018',
        inicioAnio: '2000',
      },
      deps,
    );
    expect(r.tipo).toBe('error-motor');
    if (r.tipo !== 'error-motor') return;
    expect(r.error.codigo).toBe('NoImplementada');
    expect(r.error.titulo).toBe('Fallecimiento anterior al periodo que calcula el simulador');
    // La fecha que has indicado y el primer año que cubre el cálculo (leído del motor) aparecen en el texto.
    expect(r.error.mensaje).toContain('2018');
    expect(r.error.mensaje).toContain('2022');
    expect(r.error.mensaje).toMatch(/parejas de hecho/);
    expect(r.error.mensaje).toMatch(/no los sustituye por otros ni los estima/);
    expect(r.error.accion).toMatch(/posterior/);
  });

  it('separación o divorcio anteriores a la disposición transitoria: mensaje del motor', () => {
    const r = calcularTuPension(
      conViudo(FORMULARIO_VIUDEDAD, {
        vinculo: 'excónyuge',
        compensatoriaAnual: '6000',
        separacionAnterior: true,
      }),
      deps,
    );
    expect(r.tipo).toBe('error-motor');
    if (r.tipo !== 'error-motor') return;
    expect(r.error.titulo).toMatch(/disposición transitoria decimotercera/);
    expect(r.error.mensaje).toMatch(/DT 13/);
  });

  it('accidente de trabajo sin base: lo detecta el formulario, no el motor', () => {
    const r = calcularTuPension({ ...FORMULARIO_ORFANDAD, origen: 'accidente-trabajo' }, deps);
    expect(r.tipo).toBe('errores-formulario');
    if (r.tipo !== 'errores-formulario') return;
    expect(r.errores.baseReguladora).toBeDefined();
  });
});
