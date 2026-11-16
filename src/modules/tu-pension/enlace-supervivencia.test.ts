import { describe, expect, it } from 'vitest';
import { escribirEnlace, leerEnlace, VERSION_ENLACE, type ContextoEnlace } from './enlace';
import {
  FORMULARIO_BASE,
  FORMULARIO_INCAPACIDAD,
  FORMULARIO_ORFANDAD,
  FORMULARIO_VIUDEDAD,
} from './pruebas';
import { SUPERVIVENCIA_VACIA, VIUDO_VACIO, nuevoHuerfano } from './supervivencia-tipos';
import type { FormularioTuPension } from './tipos';

const DEFECTO: FormularioTuPension = {
  ...FORMULARIO_BASE,
  nacimientoMes: '',
  nacimientoAnio: '',
  hechoCausanteMes: '',
  hechoCausanteAnio: '',
  inicioMes: '',
  inicioAnio: '',
  sexo: '',
  baseMensual: '2286,22',
  supervivencia: SUPERVIVENCIA_VACIA,
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

/** El formulario que vuelve de un enlace con los campos que el enlace no lleva puestos por defecto. */
const ida = (f: FormularioTuPension): FormularioTuPension => {
  const r = leer(escribirEnlace(f));
  expect(r.avisos).toEqual([]);
  return r.formulario;
};

/** Ids de huérfanos y de tramos se generan al leer: se comparan sin ellos. */
const sinIds = (f: FormularioTuPension) => ({
  ...f,
  supervivencia: {
    ...f.supervivencia,
    otrosHuerfanos: f.supervivencia.otrosHuerfanos.map((h) => ({ ...h, id: '' })),
  },
});

describe('los enlaces antiguos no cambian (formato v=1)', () => {
  it('jubilación e incapacidad se escriben exactamente igual que antes de la Fase 3-C2', () => {
    // Textos obtenidos con el código de `origin/main` (565df58), antes de esta fase.
    const jubilacion = {
      ...FORMULARIO_BASE,
      sexo: 'mujer' as const,
      hijos: '2',
      lecturas: { 'jubilacion.baseMaxima': 'sobre-cifra-inicial' },
    };
    expect(escribirEnlace(jubilacion, 'persona-a')).toBe(
      '?v=1&nac=1961-11&jub=2026-11&sex=m&hij=2&car=s&ini=1986-11&lag=0&ubi=m&base=2500&med=media-cotizacion-rg&pe=persona-a&min=1&max=1&ipc=2&lec=jubilacion.baseMaxima:sobre-cifra-inicial',
    );
    const incapacidad = {
      ...FORMULARIO_INCAPACIDAD,
      origen: 'accidente-trabajo' as const,
      baseReguladora: '2500',
      grado: 'gran-incapacidad' as const,
    };
    expect(escribirEnlace(incapacidad)).toBe(
      '?v=1&p=inc&nac=1981-03&hc=2026-03&gr=gin&or=at&alt=1&trb=0&br=2500&sex=h&car=s&ini=2000-01&lag=0&ubi=m&base=2000&med=media-cotizacion-rg&min=1&max=1&ipc=2',
    );
  });

  it('un enlace v=1 sin p sigue siendo de jubilación y se lee igual', () => {
    const r = leer(
      '?v=1&nac=1961-11&jub=2026-11&sex=m&hij=2&car=s&ini=1986-11&lag=0&ubi=m&base=2500&min=1&max=1&ipc=2',
    );
    expect(r.avisos).toEqual([]);
    expect(r.formulario.prestacion).toBe('jubilacion');
    expect(r.formulario).toMatchObject({
      hechoCausanteMes: '11',
      hechoCausanteAnio: '2026',
      sexo: 'mujer',
      hijos: '2',
    });
    expect(r.formulario.supervivencia).toEqual(SUPERVIVENCIA_VACIA);
  });

  it('el parámetro de prestación de jubilación no existe: la versión sigue siendo la misma', () => {
    expect(VERSION_ENLACE).toBe('1');
    expect(escribirEnlace(FORMULARIO_BASE)).not.toContain('p=');
  });
});

describe('viudedad (p=viu): ida y vuelta', () => {
  it('cónyuge con el caso completo', () => {
    const b = escribirEnlace(FORMULARIO_VIUDEDAD);
    expect(b.startsWith('?v=1&p=viu&hc=2026-03&or=ec&')).toBe(true);
    expect(b).toContain('sit=alt');
    expect(b).toContain('vin=con');
    expect(b).toContain('vnc=1976-05');
    expect(b).toContain('vmt=2005-06');
    expect(b).not.toContain('nac=');
    expect(b).not.toContain('jub=');
    expect(sinIds(ida(FORMULARIO_VIUDEDAD))).toEqual(sinIds(FORMULARIO_VIUDEDAD));
  });

  it('pareja de hecho, con cargas, rentas, hijos y otros huérfanos', () => {
    const f: FormularioTuPension = {
      ...FORMULARIO_VIUDEDAD,
      lecturas: { 'supervivencia.reduccionLimiteConjunto': 'proporcional' },
      supervivencia: {
        ...FORMULARIO_VIUDEDAD.supervivencia,
        viudo: {
          ...VIUDO_VACIO,
          vinculo: 'pareja-hecho',
          nacimientoMes: '2',
          nacimientoAnio: '1980',
          sexo: 'hombre',
          hijos: '2',
          hijoConOrfandad: true,
          otraPensionPublica: true,
          brechaEnOtraPension: true,
          convivenciaMeses: '72',
          registroMes: '4',
          registroAnio: '2019',
          hijosComunes: true,
          discapacidad65: true,
          rentasTrabajo: '1.000,50',
          rentasCapital: '200',
          rendimientos: '5000',
          rendimientosAnterior: '6000',
          cargas: true,
          miembros: '3',
          rendimientosUnidad: '10000',
        },
        otrosHuerfanos: [
          { ...nuevoHuerfano(), nacimientoMes: '6', nacimientoAnio: '2012', incapacitado: true },
          { ...nuevoHuerfano(), nacimientoMes: '1', nacimientoAnio: '2015' },
        ],
      },
    };
    expect(sinIds(ida(f))).toEqual(sinIds(f));
    expect(escribirEnlace(f)).toContain('oh=2012-06:1~2015-01:0');
    expect(escribirEnlace(f)).toContain('lec=supervivencia.reduccionLimiteConjunto:proporcional');
  });

  it('excónyuge, causante pensionista y base escrita', () => {
    const f: FormularioTuPension = {
      ...FORMULARIO_VIUDEDAD,
      baseReguladora: '2.500',
      supervivencia: {
        ...FORMULARIO_VIUDEDAD.supervivencia,
        situacion: 'pensionista',
        clasePension: 'incapacidad-permanente',
        pensionMes: '3',
        pensionAnio: '2023',
        viudo: {
          ...FORMULARIO_VIUDEDAD.supervivencia.viudo,
          vinculo: 'excónyuge',
          // Los datos del matrimonio no existen para un excónyuge: el enlace no los lleva.
          matrimonioMes: '',
          matrimonioAnio: '',
          compensatoriaAnual: '6000',
          violenciaGenero: true,
          nuevoVinculo: false,
          separacionAnterior: false,
        },
      },
    };
    const b = escribirEnlace(f);
    expect(b).toContain('sit=pen');
    expect(b).toContain('pcl=inc');
    expect(b).toContain('pfe=2023-03');
    expect(b).toContain('br=2.500');
    expect(b).toContain('vpc=6000');
    expect(sinIds(ida(f))).toEqual(sinIds(f));
  });

  it('la causa de la muerte reutiliza el parámetro `or` con los mismos códigos que la incapacidad', () => {
    for (const [origen, codigo] of [
      ['enfermedad-comun', 'ec'],
      ['accidente-no-laboral', 'anl'],
      ['accidente-trabajo', 'at'],
      ['enfermedad-profesional', 'ep'],
    ] as const) {
      const f = { ...FORMULARIO_VIUDEDAD, origen, baseReguladora: '3000' };
      expect(escribirEnlace(f)).toContain(`or=${codigo}`);
      expect(ida(f).origen).toBe(origen);
    }
  });
});

describe('orfandad (p=orf): ida y vuelta', () => {
  it('huérfano que pregunta', () => {
    const b = escribirEnlace(FORMULARIO_ORFANDAD);
    expect(b).toContain('p=orf');
    expect(b).toContain('hn=2016-01');
    expect(b).toContain('hi=0');
    expect(b).toContain('hv=0');
    expect(b).not.toContain('vin=');
    expect(sinIds(ida(FORMULARIO_ORFANDAD))).toEqual(sinIds(FORMULARIO_ORFANDAD));
  });

  it('con orfandad absoluta, cónyuge superviviente y otros huérfanos', () => {
    const f: FormularioTuPension = {
      ...FORMULARIO_ORFANDAD,
      lecturas: { 'supervivencia.carenciaOrfandad': 'rd-1647-1997' },
      supervivencia: {
        ...FORMULARIO_ORFANDAD.supervivencia,
        orfandadAbsoluta: true,
        hayViudo: true,
        huerfano: {
          ...FORMULARIO_ORFANDAD.supervivencia.huerfano,
          incapacitado: true,
          discapacidad65: true,
          rentasTrabajo: '1200',
          rendimientos: '3000',
        },
        viudo: {
          ...VIUDO_VACIO,
          vinculo: 'conyuge',
          nacimientoMes: '1',
          nacimientoAnio: '1981',
          sexo: 'mujer',
          hijos: '3',
          matrimonioMes: '6',
          matrimonioAnio: '2005',
        },
        otrosHuerfanos: [{ ...nuevoHuerfano(), nacimientoMes: '9', nacimientoAnio: '2013' }],
      },
    };
    expect(sinIds(ida(f))).toEqual(sinIds(f));
    // El enlace de la viudedad ignora lo propio de la orfandad, y viceversa.
    const viudedad = leer(escribirEnlace(f).replace('p=orf', 'p=viu'));
    expect(viudedad.avisos.join(' ')).toMatch(/solo existe en los enlaces de la orfandad/);
  });
});

describe('qué se ignora al leer un enlace de supervivencia', () => {
  it('lo que no es válido se ignora con aviso y el resto se aplica', () => {
    const r = leer(
      '?v=1&p=viu&hc=2026-03&or=ec&sit=alt&vin=con&vnc=1976-13&vsx=x&vhj=cuatro&vmt=2005-06&vrt=-5&oh=2012-06:1~xx~2015-01:7',
    );
    expect(r.formulario.prestacion).toBe('viudedad');
    expect(r.formulario.supervivencia.viudo).toMatchObject({
      vinculo: 'conyuge',
      matrimonioMes: '6',
      matrimonioAnio: '2005',
      nacimientoMes: '',
      sexo: '',
      hijos: '0',
      rentasTrabajo: '0',
    });
    const avisos = r.avisos.join(' | ');
    expect(avisos).toMatch(/fecha de nacimiento de la persona viuda/);
    expect(avisos).toMatch(/el sexo de la persona viuda/);
    expect(avisos).toMatch(/el número de hijos/);
    expect(avisos).toMatch(/las rentas del trabajo/);
    expect(avisos).toMatch(/el huérfano 2/);
    expect(avisos).toMatch(/el huérfano 3/);
    expect(r.formulario.supervivencia.otrosHuerfanos).toHaveLength(1);
  });

  it('los parámetros de jubilación no valen en viudedad y los de supervivencia no valen en jubilación', () => {
    const r = leer('?v=1&p=viu&nac=1961-11&sex=m&hc=2026-03');
    expect(r.avisos.join(' ')).toMatch(/«nac»/);
    expect(r.avisos.join(' ')).toMatch(/«sex»/);
    const j = leer('?v=1&nac=1961-11&jub=2026-11&vin=con&sit=alt');
    expect(j.avisos.join(' ')).toMatch(/«vin»[^|]*viudedad y de la orfandad/);
    expect(j.avisos.join(' ')).toMatch(/«sit»/);
  });

  it('una lectura de otra prestación se ignora', () => {
    const r = leer('?v=1&p=viu&hc=2026-03&lec=supervivencia.carenciaOrfandad:rd-1647-1997');
    expect(r.avisos.join(' ')).toMatch(/carenciaOrfandad/);
    expect(r.formulario.lecturas).toEqual({});
  });

  it('un código de prestación desconocido se ignora y cae en jubilación', () => {
    const r = leer('?v=1&p=fam&nac=1961-11');
    expect(r.formulario.prestacion).toBe('jubilacion');
    expect(r.avisos.join(' ')).toMatch(/no es una prestación que esta página calcule/);
  });

  it('un enlace con muchos huérfanos admite un número limitado', () => {
    const lista = Array.from({ length: 25 }, () => '2012-06:0').join('~');
    const r = leer(`?v=1&p=viu&hc=2026-03&oh=${lista}`);
    expect(r.formulario.supervivencia.otrosHuerfanos).toHaveLength(20);
    expect(r.avisos.join(' ')).toMatch(/a partir del 21/);
  });
});
