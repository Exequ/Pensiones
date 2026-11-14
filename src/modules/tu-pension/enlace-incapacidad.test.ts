import { describe, expect, it } from 'vitest';
import { valoresElegidos } from '../../engine/comparar-lecturas';
import { escribirEnlace, leerEnlace, VERSION_ENLACE, type ContextoEnlace } from './enlace';
import { FORMULARIO_BASE, FORMULARIO_INCAPACIDAD } from './pruebas';
import type { FormularioTuPension } from './tipos';

const DEFECTO: FormularioTuPension = {
  ...FORMULARIO_BASE,
  nacimientoMes: '',
  nacimientoAnio: '',
  jubilacionMes: '',
  jubilacionAnio: '',
  inicioMes: '',
  inicioAnio: '',
  sexo: '',
  baseMensual: '2286,22',
};
const CONTEXTO: ContextoEnlace = {
  defecto: DEFECTO,
  definicionesMedia: ['media-cotizacion-rg'],
  personas: ['persona-a'],
};

const leer = (busqueda: string) => {
  const r = leerEnlace(busqueda, CONTEXTO);
  if (!r) throw new Error('el enlace debería leerse');
  return r;
};

describe('enlace de la incapacidad permanente (p=inc)', () => {
  it('ida y vuelta: estado → enlace → estado idéntico', () => {
    const f: FormularioTuPension = {
      ...FORMULARIO_INCAPACIDAD,
      sexo: 'mujer',
      hijos: '2',
      grado: 'gran-incapacidad',
      origen: 'accidente-no-laboral',
      enAlta: false,
      trabaja: true,
      mesesSinCotizar: '12',
      lecturas: { 'incapacidad.lagunasAccidenteNoLaboral': 'integrar' },
    };
    const busqueda = escribirEnlace(f);
    expect(busqueda.startsWith(`?v=${VERSION_ENLACE}&p=inc&`)).toBe(true);
    expect(busqueda).toContain('hc=2026-03');
    expect(busqueda).not.toContain('jub=');
    expect(busqueda).toContain('gr=gin');
    expect(busqueda).toContain('or=anl');
    expect(busqueda).toContain('lec=incapacidad.lagunasAccidenteNoLaboral:integrar');
    const r = leer(busqueda);
    expect(r.avisos).toEqual([]);
    expect(r.formulario).toEqual({ ...f, tramos: [] });
  });

  describe('lagunas del accidente no laboral: el valor por defecto pasó a «sin-integrar» (14-11-2026)', () => {
    const ID = 'incapacidad.lagunasAccidenteNoLaboral';
    const base =
      '?v=1&p=inc&nac=1981-03&hc=2026-03&gr=tot&or=anl&sex=h&car=s&ini=2000-01&base=2000';

    it('el enlace solo guarda la lectura si difiere del valor por defecto: «integrar» se escribe y «sin-integrar» no', () => {
      const f = {
        ...FORMULARIO_INCAPACIDAD,
        grado: 'total',
        origen: 'accidente-no-laboral',
      } as const;
      expect(escribirEnlace({ ...f, lecturas: { [ID]: 'integrar' } })).toContain(
        `lec=${ID}:integrar`,
      );
      expect(escribirEnlace({ ...f, lecturas: { [ID]: 'sin-integrar' } })).not.toContain('lec=');
    });

    it('un enlace antiguo sin `lec` (que significaba «integrar») se lee ahora con el valor por defecto «sin-integrar»', () => {
      const r = leer(base);
      expect(r.avisos).toEqual([]);
      expect(r.formulario.lecturas).toEqual({});
      expect(valoresElegidos(r.formulario.lecturas, 'incapacidad')[ID]).toBe('sin-integrar');
    });

    it('un enlace antiguo con «sin-integrar» (alternativa entonces, valor por defecto ahora) se lee sin avisos y sin lectura cambiada', () => {
      const r = leer(`${base}&lec=${ID}:sin-integrar`);
      expect(r.avisos).toEqual([]);
      expect(r.formulario.lecturas).toEqual({});
    });

    it('un enlace con «integrar» explícito conserva esa lectura', () => {
      const r = leer(`${base}&lec=${ID}:integrar`);
      expect(r.avisos).toEqual([]);
      expect(r.formulario.lecturas).toEqual({ [ID]: 'integrar' });
      expect(valoresElegidos(r.formulario.lecturas, 'incapacidad')[ID]).toBe('integrar');
    });
  });

  describe('contingencias profesionales (or=at / or=ep) y base reguladora (br)', () => {
    const base = '?v=1&p=inc&nac=1981-03&hc=2026-03&gr=tot&sex=h&car=s&ini=2000-01&base=2000';

    it.each([
      ['accidente-trabajo', 'at'],
      ['enfermedad-profesional', 'ep'],
    ] as const)('ida y vuelta de %s con su base reguladora', (origen, codigo) => {
      const f: FormularioTuPension = {
        ...FORMULARIO_INCAPACIDAD,
        origen,
        baseReguladora: '2286,22',
      };
      const busqueda = escribirEnlace(f);
      expect(busqueda).toContain(`or=${codigo}`);
      expect(busqueda).toContain('br=2286,22');
      const r = leer(busqueda);
      expect(r.avisos).toEqual([]);
      expect(r.formulario).toEqual({ ...f, tramos: [] });
    });

    it('la base reguladora solo se escribe con origen profesional y si es un importe válido', () => {
      for (const origen of ['enfermedad-comun', 'accidente-no-laboral'] as const)
        expect(
          escribirEnlace({ ...FORMULARIO_INCAPACIDAD, origen, baseReguladora: '2500' }),
        ).not.toContain('br=');
      expect(
        escribirEnlace({
          ...FORMULARIO_INCAPACIDAD,
          origen: 'accidente-trabajo',
          baseReguladora: 'abc',
        }),
      ).not.toContain('br=');
    });

    it('un `br` mal formado se ignora con aviso y no rompe la lectura', () => {
      const r = leer(`${base}&or=at&br=abc`);
      expect(r.formulario.origen).toBe('accidente-trabajo');
      expect(r.formulario.baseReguladora).toBe('');
      expect(r.avisos.join(' ')).toMatch(/base reguladora/);
    });

    it('`br` y los orígenes profesionales no existen en un enlace de jubilación', () => {
      const r = leer('?v=1&nac=1961-11&jub=2026-11&br=2500');
      expect(r.avisos.join(' ')).toMatch(/«br»/);
      expect(r.formulario.baseReguladora).toBe('');
    });

    it('los enlaces de incapacidad anteriores (sin `br`) se leen igual que antes', () => {
      const r = leer(`${base}&or=ec`);
      expect(r.avisos).toEqual([]);
      expect(r.formulario.origen).toBe('enfermedad-comun');
      expect(r.formulario.baseReguladora).toBe('');
    });
  });

  it('cada grado y origen disponible se conserva', () => {
    for (const grado of ['parcial', 'total', 'absoluta', 'gran-incapacidad'] as const) {
      for (const origen of ['enfermedad-comun', 'accidente-no-laboral'] as const) {
        const f = { ...FORMULARIO_INCAPACIDAD, grado, origen };
        const r = leer(escribirEnlace(f));
        expect(r.formulario.grado).toBe(grado);
        expect(r.formulario.origen).toBe(origen);
        expect(r.formulario.prestacion).toBe('incapacidad');
      }
    }
  });

  it('las lecturas de jubilación no se guardan ni se aceptan en un enlace de incapacidad', () => {
    const f = {
      ...FORMULARIO_INCAPACIDAD,
      lecturas: { 'jubilacion.baseMaxima': 'sobre-cifra-inicial' },
    };
    expect(escribirEnlace(f)).not.toContain('lec=');
    const r = leer('?v=1&p=inc&lec=jubilacion.baseMaxima:sobre-cifra-inicial');
    expect(r.formulario.lecturas).toEqual({});
    expect(r.avisos.join(' ')).toMatch(/no existe en el registro/);
  });

  it('ignora con aviso un origen desconocido, un grado inválido y parámetros ajenos', () => {
    // `at` y `ep` (contingencias profesionales) son válidos desde los ajustes actuariales 1: aquí, un código que no existe.
    const r = leer('?v=1&p=inc&or=zz&gr=xx&jub=2026-03&alt=2');
    expect(r.aplicado).toBe(true);
    expect(r.formulario.prestacion).toBe('incapacidad');
    expect(r.formulario.origen).toBe('');
    expect(r.formulario.grado).toBe('');
    expect(r.avisos.join(' ')).toMatch(/origen de la incapacidad/);
    expect(r.avisos.join(' ')).toMatch(/grado de incapacidad/);
    expect(r.avisos.join(' ')).toMatch(/hecho causante/);
    expect(r.avisos.join(' ')).toMatch(/estar en alta/);
  });

  it('una prestación desconocida se ignora y se trata como jubilación', () => {
    const r = leer('?v=1&p=viudedad&nac=1961-11&jub=2026-11');
    expect(r.formulario.prestacion).toBe('jubilacion');
    expect(r.formulario.jubilacionAnio).toBe('2026');
    expect(r.avisos.join(' ')).toMatch(/prestación/);
  });
});

describe('compatibilidad con los enlaces de la jubilación (v=1 sin p=)', () => {
  const ANTIGUO =
    '?v=1&nac=1961-11&jub=2026-11&sex=h&car=s&ini=1986-11&lag=0&ubi=m&base=2500&med=media-cotizacion-rg&min=1&max=1&ipc=2&lec=jubilacion.actualizacionFactorMinimo:sin-suelo';

  it('un enlace sin p= es una jubilación y se lee igual que antes', () => {
    const r = leer(ANTIGUO);
    expect(r.avisos).toEqual([]);
    expect(r.aplicado).toBe(true);
    expect(r.formulario).toMatchObject({
      prestacion: 'jubilacion',
      nacimientoMes: '11',
      nacimientoAnio: '1961',
      jubilacionMes: '11',
      jubilacionAnio: '2026',
      inicioAnio: '1986',
      baseMensual: '2500',
      sexo: 'hombre',
      ipcSupuesto: '2',
      lecturas: { 'jubilacion.actualizacionFactorMinimo': 'sin-suelo' },
    });
  });

  it('escribir una jubilación no añade p= ni ningún parámetro de incapacidad: el formato no cambia', () => {
    const busqueda = escribirEnlace({
      ...FORMULARIO_BASE,
      lecturas: { 'jubilacion.actualizacionFactorMinimo': 'sin-suelo' },
    });
    expect(busqueda).toBe(
      '?v=1&nac=1961-11&jub=2026-11&sex=h&car=s&ini=1986-11&lag=0&ubi=m&base=2500&med=media-cotizacion-rg&min=1&max=1&ipc=2&lec=jubilacion.actualizacionFactorMinimo:sin-suelo',
    );
  });

  it('en un enlace de jubilación, los parámetros de incapacidad se ignoran con aviso', () => {
    const r = leer('?v=1&nac=1961-11&jub=2026-11&gr=tot&hc=2026-03');
    expect(r.formulario.prestacion).toBe('jubilacion');
    expect(r.formulario.grado).toBe('');
    expect(r.formulario.jubilacionMes).toBe('11');
    expect(r.avisos.join(' ')).toMatch(/solo existe en los enlaces de la incapacidad/);
  });

  it('las lecturas de incapacidad no valen en un enlace de jubilación', () => {
    const r = leer('?v=1&lec=incapacidad.edadFiccion:edad-general');
    expect(r.formulario.lecturas).toEqual({});
    expect(r.avisos.join(' ')).toMatch(/no existe en el registro/);
  });
});
