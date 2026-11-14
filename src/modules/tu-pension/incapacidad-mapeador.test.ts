import { describe, expect, it } from 'vitest';
import {
  esOrigenDisponible,
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

  it('los orígenes profesionales no están disponibles y se explica', () => {
    for (const origen of ['accidente-trabajo', 'enfermedad-profesional'] as const) {
      expect(esOrigenDisponible(origen)).toBe(false);
      expect(validarFormularioIncapacidad({ ...F, origen }).origen).toMatch(/no está disponible/);
    }
    expect(ORIGENES.filter((o) => o.disponible).map((o) => o.valor)).toEqual([
      'enfermedad-comun',
      'accidente-no-laboral',
    ]);
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
