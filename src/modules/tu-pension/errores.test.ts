import { describe, expect, it } from 'vitest';
import { DatoNoDisponible, NoImplementada } from '../../engine/jubilacion/errores';
import { errorDe, type ErrorMotor } from '../../engine/fachada';
import { crearMotorDelRepositorio } from './motor';
import { traducirError } from './errores';
import { formularioAEntrada } from './mapeador';
import { FORMULARIO_BASE } from './pruebas';

const desde = (e: unknown): ErrorMotor => errorDe(e);

describe('traducirError', () => {
  it('EntradaInvalida: fechas incoherentes', () => {
    const m = traducirError(
      desde(new RangeError('La jubilación debe ser posterior al nacimiento')),
    );
    expect(m.codigo).toBe('EntradaInvalida');
    expect(m.titulo).toMatch(/fechas/i);
    expect(m.accion).toMatch(/Revisa/);
    expect(m.campo).toBe('jubilacionAnio');
  });

  it('EntradaInvalida: carrera mal formada', () => {
    const m = traducirError(
      desde(new RangeError('Periodo 2000-01..1999-01: el fin es anterior al inicio')),
    );
    expect(m.codigo).toBe('EntradaInvalida');
    expect(m.campo).toBe('inicioAnio');
  });

  it('EntradaInvalida: cualquier otro caso conserva el detalle técnico y una acción', () => {
    const m = traducirError(desde(new TypeError('algo raro')));
    expect(m.mensaje).toContain('algo raro');
    expect(m.accion).toMatch(/Revisa/);
  });

  it('DatoNoDisponible: falta el IPC supuesto', () => {
    const m = traducirError(
      desde(
        new DatoNoDisponible(
          'el IPC de 2026 no está en /data y no se ha indicado un escenario (opciones.escenario.ipc)',
        ),
      ),
    );
    expect(m.codigo).toBe('DatoNoDisponible');
    expect(m.titulo).toMatch(/IPC/);
    expect(m.accion).toMatch(/Escenario económico/);
    expect(m.campo).toBe('ipcSupuesto');
  });

  it('DatoNoDisponible: año sin reglas cargadas', () => {
    const m = traducirError(
      desde(new DatoNoDisponible('escala-jubilacion-tramos: sin versión de la regla para 1995')),
    );
    expect(m.titulo).toMatch(/reglas/);
    expect(m.accion).toMatch(/otra fecha/);
    expect(m.campo).toBe('jubilacionAnio');
  });

  it('DatoNoDisponible: otro dato', () => {
    const m = traducirError(desde(new DatoNoDisponible('parametros/x.json#y')));
    expect(m.mensaje).toContain('parametros/x.json#y');
    expect(m.accion.length).toBeGreaterThan(10);
  });

  it('NoImplementada: nombra la regla y propone una acción', () => {
    const m = traducirError(
      desde(new NoImplementada('Hechos causantes anteriores a 2013', 'sin escala')),
    );
    expect(m.codigo).toBe('NoImplementada');
    expect(m.mensaje).toContain('Hechos causantes anteriores a 2013');
    expect(m.accion).toMatch(/fecha/);
  });

  it('ningún mensaje queda vacío', () => {
    for (const e of [
      new RangeError('x'),
      new DatoNoDisponible('y'),
      new NoImplementada('z', 'w'),
    ]) {
      const m = traducirError(desde(e));
      expect(m.titulo && m.mensaje && m.accion).toBeTruthy();
    }
  });
});

describe('errores reales del motor con datos del formulario', () => {
  const motor = (cfg = {}) => crearMotorDelRepositorio(cfg);
  const llamar = (f: typeof FORMULARIO_BASE, conIpc = true) => {
    const r = formularioAEntrada({ ...f, ...(conIpc ? {} : { ipcSupuesto: '' }) });
    if (!r.ok) throw new Error('formulario inválido');
    return motor(r.configuracion).jubilacion(r.entrada);
  };

  it('jubilación lejana sin IPC supuesto → DatoNoDisponible traducido a «Falta un IPC supuesto»', () => {
    const r = llamar(
      { ...FORMULARIO_BASE, nacimientoAnio: '1965', jubilacionAnio: '2031', inicioAnio: '1990' },
      false,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.codigo).toBe('DatoNoDisponible');
    expect(traducirError(r.error).campo).toBe('ipcSupuesto');
  });

  it('jubilación anterior a las reglas cargadas → DatoNoDisponible o NoImplementada, con acción', () => {
    const r = llamar({
      ...FORMULARIO_BASE,
      nacimientoAnio: '1930',
      jubilacionAnio: '1995',
      inicioAnio: '1960',
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    const m = traducirError(r.error);
    expect(['DatoNoDisponible', 'NoImplementada']).toContain(m.codigo);
    expect(m.accion).toMatch(/fecha/);
  });
});

describe('traducirError en la incapacidad permanente', () => {
  it('habla del hecho causante, no de la jubilación', () => {
    const m = traducirError(
      desde(new RangeError('El hecho causante debe ser posterior al nacimiento')),
      'incapacidad',
    );
    expect(m.mensaje).toBe('La fecha del hecho causante debe ser posterior a la de nacimiento.');
    expect(m.accion).toMatch(/hecho causante/);
    expect(m.accion).not.toMatch(/jubilación/);
  });

  it('NoImplementada (hecho causante anterior a la cobertura): mensaje claro y acción', () => {
    const m = traducirError(
      desde(new NoImplementada('Incapacidad permanente con hecho causante en 2019', 'No cubierto')),
      'incapacidad',
    );
    expect(m.codigo).toBe('NoImplementada');
    expect(m.titulo).toBe('Este caso queda fuera del simulador');
    expect(m.mensaje).toContain('hecho causante en 2019');
    expect(m.accion).toMatch(/hecho causante/);
  });

  it('DatoNoDisponible: falta el IPC supuesto, con el hecho causante', () => {
    const m = traducirError(
      desde(
        new DatoNoDisponible('el IPC de 2027 no está en /data y no se ha indicado un escenario'),
      ),
      'incapacidad',
    );
    expect(m.campo).toBe('ipcSupuesto');
    expect(m.mensaje).toMatch(/hecho causante/);
  });

  it('para la jubilación no cambia nada (valor por defecto)', () => {
    const m = traducirError(
      desde(new RangeError('La jubilación debe ser posterior al nacimiento')),
    );
    expect(m.mensaje).toBe('La fecha de jubilación debe ser posterior a la de nacimiento.');
  });
});
