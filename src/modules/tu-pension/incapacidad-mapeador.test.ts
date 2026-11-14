import { describe, expect, it } from 'vitest';
import {
  esOrigenDisponible,
  esOrigenProfesional,
  formularioAEntradaIncapacidad,
  GRADOS,
  ORIGENES,
  validarFormularioIncapacidad,
} from './incapacidad-mapeador';
import { catalogoPorDefecto } from './referencias-datos';
import { FORMULARIO_INCAPACIDAD as F } from './pruebas';

describe('validación del formulario de incapacidad', () => {
  it('el formulario base es válido', () => {
    expect(validarFormularioIncapacidad(F)).toEqual({});
  });

  it('exige grado y origen', () => {
    const e = validarFormularioIncapacidad({ ...F, grado: '', origen: '' });
    expect(e.grado).toMatch(/grado/);
    expect(e.origen).toMatch(/origen/);
  });

  // Ajustes actuariales 1: los orígenes profesionales se activan pidiendo la base reguladora.
  it('los cuatro orígenes están disponibles; los profesionales exigen la base reguladora', () => {
    for (const origen of ['accidente-trabajo', 'enfermedad-profesional'] as const) {
      expect(esOrigenDisponible(origen)).toBe(true);
      expect(esOrigenProfesional(origen)).toBe(true);
      const sin = validarFormularioIncapacidad({ ...F, origen, baseReguladora: '' });
      expect(sin.baseReguladora).toBe('Escribe la base reguladora mensual, en euros.');
      expect(sin.origen).toBeUndefined();
      for (const mala of ['abc', '0', '-5', '2000000'])
        expect(
          validarFormularioIncapacidad({ ...F, origen, baseReguladora: mala }).baseReguladora,
          mala,
        ).toMatch(/importe mensual positivo/);
      expect(validarFormularioIncapacidad({ ...F, origen, baseReguladora: '2.500,50' })).toEqual(
        {},
      );
    }
    expect(ORIGENES.filter((o) => o.disponible).map((o) => o.valor)).toEqual([
      'enfermedad-comun',
      'accidente-no-laboral',
      'accidente-trabajo',
      'enfermedad-profesional',
    ]);
    expect(esOrigenProfesional('enfermedad-comun')).toBe(false);
    expect(esOrigenProfesional('accidente-no-laboral')).toBe(false);
  });

  it('con origen común o accidente no laboral el formulario sigue como antes: la base reguladora no se pide', () => {
    for (const origen of ['enfermedad-comun', 'accidente-no-laboral'] as const)
      expect(validarFormularioIncapacidad({ ...F, origen, baseReguladora: '' })).toEqual({});
  });

  it('con origen profesional solo se calcula en alta o situación asimilada', () => {
    const e = validarFormularioIncapacidad({
      ...F,
      origen: 'accidente-trabajo',
      baseReguladora: '2500',
      enAlta: false,
    });
    expect(e.enAlta).toMatch(/en alta o situación asimilada/);
  });

  it('los mensajes de fecha hablan del hecho causante, no de la jubilación', () => {
    const e = validarFormularioIncapacidad({ ...F, jubilacionMes: '', jubilacionAnio: '' });
    expect(e.jubilacionMes).toBe('Elige el mes del hecho causante.');
    expect(e.jubilacionAnio).toBe('Escribe el año del hecho causante con cuatro cifras.');
    const antes = validarFormularioIncapacidad({ ...F, jubilacionAnio: '1970' });
    expect(antes.jubilacionAnio).toBe(
      'La fecha del hecho causante debe ser posterior a la de nacimiento.',
    );
    const lagunas = validarFormularioIncapacidad({ ...F, mesesSinCotizar: '400' });
    expect(lagunas.mesesSinCotizar).toMatch(/entre el inicio y el hecho causante/);
  });

  it('describe cada grado con texto y sin cifras', () => {
    expect(GRADOS.map((g) => g.valor)).toEqual([
      'parcial',
      'total',
      'absoluta',
      'gran-incapacidad',
    ]);
    for (const g of GRADOS) expect(`${g.etiqueta}${g.descripcion}`).not.toMatch(/\d/);
  });
});

describe('mapeo a la entrada del motor', () => {
  it('traduce fechas, grado, origen y opciones', () => {
    const m = formularioAEntradaIncapacidad({ ...F, sexo: 'mujer', hijos: '2', trabaja: true });
    if (!m.ok) throw new Error('inválido');
    expect(m.entrada.nacimiento).toBe('1981-03-01');
    expect(m.entrada.fechaHechoCausante).toBe('2026-03-01');
    expect(m.entrada.grado).toBe('total');
    expect(m.entrada.origen).toBe('enfermedad-comun');
    expect(m.entrada.carrera).toEqual([{ desde: '2000-01', hasta: '2026-02', baseMensual: 2000 }]);
    expect(m.entrada.opciones).toMatchObject({
      sexo: 'mujer',
      hijos: 2,
      enAlta: true,
      trabaja: true,
      aplicarMinimos: true,
      aplicarPensionMaxima: true,
    });
    expect(m.configuracion).toEqual({ escenario: { ipc: 0.02 } });
  });

  it('los hijos solo cuentan para las mujeres', () => {
    const m = formularioAEntradaIncapacidad({ ...F, sexo: 'hombre', hijos: '3' });
    if (!m.ok) throw new Error('inválido');
    expect(m.entrada.opciones?.hijos).toBe(0);
  });

  it('solo pasa al motor las lecturas de incapacidad que difieren del valor por defecto', () => {
    const m = formularioAEntradaIncapacidad({
      ...F,
      lecturas: {
        'incapacidad.lagunasAccidenteNoLaboral': 'integrar',
        'incapacidad.edadFiccion': 'carrera-proyectada', // el valor por defecto: se omite
        'jubilacion.baseMaxima': 'sobre-cifra-inicial', // de otra prestación: se omite
      },
    });
    if (!m.ok) throw new Error('inválido');
    expect(m.configuracion.lecturas).toEqual({
      'incapacidad.lagunasAccidenteNoLaboral': 'integrar',
    });
  });

  it.each(['sin-integrar', 'integrar'] as const)(
    'las lagunas del accidente no laboral «%s»: solo se pasa al motor la que difiere del valor por defecto («sin-integrar»)',
    (valor) => {
      const m = formularioAEntradaIncapacidad({
        ...F,
        lecturas: { 'incapacidad.lagunasAccidenteNoLaboral': valor },
      });
      if (!m.ok) throw new Error('inválido');
      expect(m.configuracion.lecturas).toEqual(
        valor === 'integrar' ? { 'incapacidad.lagunasAccidenteNoLaboral': 'integrar' } : undefined,
      );
    },
  );

  describe('contingencias profesionales: la base reguladora introducida pasa al motor', () => {
    it.each(['accidente-trabajo', 'enfermedad-profesional'] as const)(
      '%s, grado total: baseReguladoraProfesional (con coma decimal) y sin tocar el resto',
      (origen) => {
        const m = formularioAEntradaIncapacidad({
          ...F,
          origen,
          baseReguladora: '2.286,22',
        });
        if (!m.ok) throw new Error(JSON.stringify(m.errores));
        expect(m.entrada.origen).toBe(origen);
        expect(m.entrada.opciones?.baseReguladoraProfesional).toBe(2286.22);
        expect(m.entrada.opciones?.baseReguladoraIT).toBeUndefined();
      },
    );

    it('en la incapacidad parcial la base introducida es la de la incapacidad temporal (baseReguladoraIT)', () => {
      const m = formularioAEntradaIncapacidad({
        ...F,
        origen: 'accidente-trabajo',
        grado: 'parcial',
        baseReguladora: '2500',
      });
      if (!m.ok) throw new Error(JSON.stringify(m.errores));
      expect(m.entrada.opciones?.baseReguladoraIT).toBe(2500);
      expect(m.entrada.opciones?.baseReguladoraProfesional).toBeUndefined();
    });

    it('con origen común o accidente no laboral la base reguladora del formulario no llega al motor', () => {
      for (const origen of ['enfermedad-comun', 'accidente-no-laboral'] as const) {
        const m = formularioAEntradaIncapacidad({ ...F, origen, baseReguladora: '2500' });
        if (!m.ok) throw new Error(JSON.stringify(m.errores));
        expect(m.entrada.opciones?.baseReguladoraProfesional).toBeUndefined();
        expect(m.entrada.opciones?.baseReguladoraIT).toBeUndefined();
      }
    });

    it('sin base reguladora no se llama al motor y el error es del campo', () => {
      const m = formularioAEntradaIncapacidad({ ...F, origen: 'enfermedad-profesional' });
      expect(m.ok).toBe(false);
      if (!m.ok) expect(m.errores.baseReguladora).toBeDefined();
    });
  });

  it('devuelve los errores del formulario sin llamar al motor', () => {
    const m = formularioAEntradaIncapacidad({ ...F, grado: '' });
    expect(m.ok).toBe(false);
    if (!m.ok) expect(m.errores.grado).toBeDefined();
  });

  it('con la carrera por tramos, los errores de tramos hablan del hecho causante', () => {
    const catalogo = catalogoPorDefecto();
    const m = formularioAEntradaIncapacidad(
      {
        ...F,
        tipoCarrera: 'tramos',
        tramos: [
          {
            id: 't1',
            desdeMes: '1',
            desdeAnio: '2000',
            hastaMes: '12',
            hastaAnio: '2026',
            referencia: 'importe',
            importe: '2000',
          },
        ],
      },
      catalogo,
    );
    expect(m.ok).toBe(false);
    if (!m.ok) {
      expect(m.erroresTramos.map((e) => e.mensaje).join(' ')).toMatch(/anterior al hecho causante/);
    }
  });
});
