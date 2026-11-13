import { describe, expect, it } from 'vitest';
import {
  carreraSimple,
  formularioAEntrada,
  leerNumero,
  numeroATexto,
  validarFormulario,
} from './mapeador';
import { FORMULARIO_BASE } from './pruebas';

describe('leerNumero', () => {
  it('admite coma y punto decimal y rechaza texto', () => {
    expect(leerNumero('2000,5')).toBe(2000.5);
    expect(leerNumero(' 2000.5 ')).toBe(2000.5);
    expect(leerNumero('-1,5')).toBe(-1.5);
    expect(leerNumero('')).toBeUndefined();
    expect(leerNumero('abc')).toBeUndefined();
    expect(leerNumero('1.000,5')).toBe(1000.5);
    expect(leerNumero('2.500')).toBe(2500);
    expect(leerNumero('2.5')).toBe(2.5);
    expect(leerNumero('1.2.3')).toBeUndefined();
  });
});

describe('numeroATexto', () => {
  it('usa coma decimal y no agrupa miles', () => {
    expect(numeroATexto(2286.22)).toBe('2286,22');
    expect(numeroATexto(2500)).toBe('2500');
    expect(leerNumero(numeroATexto(2286.22))).toBe(2286.22);
  });
});

describe('validarFormulario', () => {
  it('el formulario base es válido', () => {
    expect(validarFormulario(FORMULARIO_BASE)).toEqual({});
  });

  it('pide cada campo obligatorio con un mensaje en español', () => {
    const e = validarFormulario({
      ...FORMULARIO_BASE,
      nacimientoMes: '',
      nacimientoAnio: '19',
      sexo: '',
      jubilacionMes: '13',
      inicioAnio: '',
      mesesSinCotizar: '-3',
      baseMensual: '0',
      ipcSupuesto: 'dos',
    });
    expect(Object.keys(e).sort()).toEqual(
      [
        'baseMensual',
        'inicioAnio',
        'ipcSupuesto',
        'jubilacionMes',
        'mesesSinCotizar',
        'nacimientoAnio',
        'nacimientoMes',
        'sexo',
      ].sort(),
    );
    for (const mensaje of Object.values(e)) expect(mensaje).toMatch(/[a-záéíóú]/i);
  });

  it('pide los hijos solo a las mujeres', () => {
    expect(validarFormulario({ ...FORMULARIO_BASE, hijos: 'x' }).hijos).toBeUndefined();
    expect(
      validarFormulario({ ...FORMULARIO_BASE, sexo: 'mujer', hijos: 'x' }).hijos,
    ).toBeDefined();
  });

  it('comprueba el orden de las fechas', () => {
    expect(
      validarFormulario({ ...FORMULARIO_BASE, jubilacionAnio: '1961' }).jubilacionAnio,
    ).toMatch(/posterior/);
    expect(validarFormulario({ ...FORMULARIO_BASE, inicioAnio: '2026' }).inicioAnio).toMatch(
      /anterior a la jubilación/,
    );
    expect(validarFormulario({ ...FORMULARIO_BASE, inicioAnio: '1950' }).inicioAnio).toMatch(
      /posterior al nacimiento/,
    );
  });

  it('los meses sin cotizar no pueden cubrir toda la carrera', () => {
    expect(
      validarFormulario({ ...FORMULARIO_BASE, mesesSinCotizar: '480' }).mesesSinCotizar,
    ).toMatch(/menos que/);
    expect(validarFormulario({ ...FORMULARIO_BASE, mesesSinCotizar: '479' })).toEqual({});
  });

  it('el IPC supuesto puede quedar vacío', () => {
    expect(validarFormulario({ ...FORMULARIO_BASE, ipcSupuesto: '' })).toEqual({});
  });
});

describe('carreraSimple', () => {
  const ini = { anio: 2000, mes: 1 };
  const jub = { anio: 2010, mes: 1 };
  it('sin lagunas: un periodo hasta el mes anterior a la jubilación', () => {
    expect(carreraSimple(ini, jub, 1000, 0, 'mitad')).toEqual([
      { desde: '2000-01', hasta: '2009-12', baseMensual: 1000 },
    ]);
  });
  it('lagunas en la mitad: dos periodos con el hueco en medio', () => {
    // 120 meses, 20 sin cotizar: 50 antes, 20 de hueco, 50 después.
    expect(carreraSimple(ini, jub, 1000, 20, 'mitad')).toEqual([
      { desde: '2000-01', hasta: '2004-02', baseMensual: 1000 },
      { desde: '2005-11', hasta: '2009-12', baseMensual: 1000 },
    ]);
  });
  it('lagunas al final: el periodo termina antes de la jubilación', () => {
    expect(carreraSimple(ini, jub, 1000, 20, 'final')).toEqual([
      { desde: '2000-01', hasta: '2008-04', baseMensual: 1000 },
    ]);
  });
  it('la cotización total es siempre meses − lagunas', () => {
    const contar = (c: ReturnType<typeof carreraSimple>): number =>
      c.reduce((n, p) => {
        const [a1, m1] = p.desde.split('-').map(Number) as [number, number];
        const [a2, m2] = p.hasta.split('-').map(Number) as [number, number];
        return n + (a2 * 12 + m2 - (a1 * 12 + m1) + 1);
      }, 0);
    for (const l of [0, 1, 7, 50, 119]) {
      for (const u of ['mitad', 'final'] as const) {
        expect(contar(carreraSimple(ini, jub, 1000, l, u))).toBe(120 - l);
      }
    }
  });
});

describe('formularioAEntrada', () => {
  it('devuelve los errores si el formulario no es válido', () => {
    const r = formularioAEntrada({ ...FORMULARIO_BASE, baseMensual: '' });
    expect(r.ok).toBe(false);
  });

  it('traduce el formulario base a una jubilación ordinaria con el día 1 de cada mes', () => {
    const r = formularioAEntrada(FORMULARIO_BASE);
    if (!r.ok) throw new Error('debía ser válido');
    expect(r.entrada.modalidad).toBe('ordinaria');
    expect(r.entrada.nacimiento).toBe('1961-11-01');
    expect(r.entrada.fechaJubilacion).toBe('2026-11-01');
    expect(r.entrada.carrera).toEqual([{ desde: '1986-11', hasta: '2026-10', baseMensual: 2500 }]);
    expect(r.entrada.opciones).toMatchObject({
      sexo: 'hombre',
      hijos: 0,
      aplicarMinimos: true,
      aplicarPensionMaxima: true,
    });
    expect(r.configuracion).toEqual({ escenario: { ipc: 0.02 } });
  });

  it('el IPC vacío no crea escenario; los hijos solo cuentan si es mujer', () => {
    const sin = formularioAEntrada({ ...FORMULARIO_BASE, ipcSupuesto: '', hijos: '3' });
    if (!sin.ok) throw new Error('inválido');
    expect(sin.configuracion).toEqual({});
    expect(sin.entrada.opciones?.hijos).toBe(0);
    const mujer = formularioAEntrada({ ...FORMULARIO_BASE, sexo: 'mujer', hijos: '3' });
    if (!mujer.ok) throw new Error('inválido');
    expect(mujer.entrada.opciones?.hijos).toBe(3);
  });

  it('no toca ninguna lectura abierta', () => {
    const r = formularioAEntrada(FORMULARIO_BASE);
    if (!r.ok) throw new Error('inválido');
    expect(r.configuracion.lecturas).toBeUndefined();
    expect(r.entrada.opciones?.lecturas).toBeUndefined();
  });
});
