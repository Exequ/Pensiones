import { describe, expect, it } from 'vitest';
import { LECTURAS_ABIERTAS } from '../../engine/lecturas';
import {
  escribirEnlace,
  leerEnlace,
  LIMITES_ENLACE,
  tramosParaEnlace,
  VERSION_ENLACE,
  type ContextoEnlace,
} from './enlace';
import { FORMULARIO_BASE } from './pruebas';
import type { FormularioTuPension } from './tipos';
import type { TramoFormulario } from './tramos';

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
  definicionesMedia: ['media-cotizacion-rg', 'media-eaes'],
  personas: ['persona-a', 'persona-b'],
};

/** Los identificadores de tramo son aleatorios: se comparan sin ellos. */
const sinIds = (f: FormularioTuPension) => ({
  ...f,
  tramos: f.tramos.map(({ id: _id, ...resto }) => resto),
});

function tramo(
  i: number,
  desde: [string, string],
  hasta: [string, string],
  referencia: TramoFormulario['referencia'],
  importe = '',
): TramoFormulario {
  return {
    id: `t${String(i)}`,
    desdeMes: desde[0],
    desdeAnio: desde[1],
    hastaMes: hasta[0],
    hastaAnio: hasta[1],
    referencia,
    importe,
  };
}

function ida(f: FormularioTuPension, personaId?: string) {
  const busqueda = escribirEnlace(f, personaId);
  const r = leerEnlace(busqueda, CONTEXTO);
  if (!r) throw new Error('el enlace debería leerse');
  return { busqueda, r };
}

describe('ida y vuelta: estado → enlace → estado idéntico', () => {
  it('modo simple, con sexo, hijos, lagunas, base, opciones e IPC', () => {
    const f: FormularioTuPension = {
      ...FORMULARIO_BASE,
      sexo: 'mujer',
      hijos: '2',
      mesesSinCotizar: '18',
      ubicacionLagunas: 'final',
      baseMensual: '2.500,75',
      aplicarMinimos: false,
      aplicarPensionMaxima: false,
      ipcSupuesto: '2,5',
    };
    const { busqueda, r } = ida(f);
    expect(busqueda.startsWith(`?v=${VERSION_ENLACE}&`)).toBe(true);
    expect(r.avisos).toEqual([]);
    expect(r.aplicado).toBe(true);
    expect(sinIds(r.formulario)).toEqual(sinIds(f));
  });

  it('modo simple con IPC vacío (sin escenario) se conserva vacío, no el valor por defecto', () => {
    const { r } = ida({ ...FORMULARIO_BASE, ipcSupuesto: '' });
    expect(r.formulario.ipcSupuesto).toBe('');
    expect(DEFECTO.ipcSupuesto).not.toBe('');
  });

  it('modo tramos, con importes y referencias, definición de la media y persona-ejemplo', () => {
    const f: FormularioTuPension = {
      ...FORMULARIO_BASE,
      tipoCarrera: 'tramos',
      definicionMedia: 'media-eaes',
      tramos: [
        tramo(1, ['11', '1986'], ['12', '2005'], 'importe', '1.200,50'),
        tramo(2, ['1', '2007'], ['6', '2015'], 'media'),
        tramo(3, ['7', '2015'], ['10', '2026'], 'maxima'),
        tramo(4, ['1', '2006'], ['12', '2006'], 'minima'),
      ],
    };
    const { r } = ida(f, 'persona-b');
    expect(r.avisos).toEqual([]);
    expect(r.personaId).toBe('persona-b');
    expect(sinIds(r.formulario)).toEqual(sinIds(f));
  });

  it('con lecturas alternativas (solo las que difieren del valor por defecto)', () => {
    const f: FormularioTuPension = {
      ...FORMULARIO_BASE,
      lecturas: {
        'jubilacion.actualizacionFactorMinimo': 'sin-suelo',
        'jubilacion.interpolacionIPC': 'escalon-anual',
        'jubilacion.baseMaxima': 'sobre-cifra-inicial',
      },
    };
    const { busqueda, r } = ida(f);
    expect(busqueda).toContain('lec=');
    expect(r.avisos).toEqual([]);
    expect(r.formulario.lecturas).toEqual(f.lecturas);
  });

  it('con las lecturas por defecto no escribe `lec` y vuelve vacío', () => {
    const porDefecto = Object.fromEntries(
      LECTURAS_ABIERTAS.filter((l) => l.motor === 'jubilacion').map((l) => [l.id, l.porDefecto]),
    );
    const { busqueda, r } = ida({ ...FORMULARIO_BASE, lecturas: porDefecto });
    expect(busqueda).not.toContain('lec=');
    expect(r.formulario.lecturas).toEqual({});
  });

  it('un formulario con carrera simple y tramos guardados conserva ambos', () => {
    const f: FormularioTuPension = {
      ...FORMULARIO_BASE,
      tipoCarrera: 'simple',
      tramos: [tramo(1, ['1', '2000'], ['12', '2010'], 'importe', '1500')],
    };
    expect(sinIds(ida(f).r.formulario)).toEqual(sinIds(f));
  });

  it('un formulario a medias no produce avisos: lo incompleto simplemente no se escribe', () => {
    const f: FormularioTuPension = {
      ...DEFECTO,
      nacimientoAnio: '19',
      tramos: [tramo(1, ['3', '2000'], ['', '2010'], 'importe', '1500')],
    };
    const { r } = ida(f);
    expect(r.avisos).toEqual([]);
    expect(r.formulario.nacimientoAnio).toBe('');
    expect(r.formulario.tramos).toEqual([]);
  });
});

describe('enlaces no válidos: la página no falla y dice qué se ha ignorado', () => {
  const leer = (busqueda: string) => {
    const r = leerEnlace(busqueda, CONTEXTO);
    if (!r) throw new Error('debería haber resultado');
    return r;
  };

  it('sin parámetros no hay enlace', () => {
    expect(leerEnlace('', CONTEXTO)).toBeUndefined();
    expect(leerEnlace('?', CONTEXTO)).toBeUndefined();
  });

  it('malformado (sin versión): se descarta entero, valores por defecto y aviso', () => {
    for (const mal of ['?basura', '?nac=1961-11&jub=2026-11', '?=&&=', '?%E0%A4%A']) {
      const r = leer(mal);
      expect(r.aplicado).toBe(false);
      expect(r.formulario).toEqual(DEFECTO);
      expect(r.avisos).toHaveLength(1);
      expect(r.avisos[0]).toMatch(/ignorado entero/);
    }
  });

  it('versión desconocida: se descarta entero y se nombra la versión', () => {
    const r = leer('?v=99&nac=1961-11');
    expect(r.aplicado).toBe(false);
    expect(r.formulario).toEqual(DEFECTO);
    expect(r.avisos[0]).toMatch(/versión .*«99»/);
  });

  it('demasiado largo: se descarta entero', () => {
    const r = leer(`?v=1&tr=${'x'.repeat(LIMITES_ENLACE.longitudMaxima)}`);
    expect(r.aplicado).toBe(false);
    expect(r.avisos[0]).toMatch(/demasiado largo/);
  });

  it('valores fuera de rango: se ignoran uno a uno, se mantienen los válidos y cada uno tiene aviso', () => {
    const r = leer(
      '?v=1&nac=1961-13&jub=2026-11&sex=m&hij=999&lag=-3&base=99999999&ipc=500&min=2&car=x&ubi=z',
    );
    expect(r.aplicado).toBe(true);
    // Lo válido se carga.
    expect(r.formulario.jubilacionMes).toBe('11');
    expect(r.formulario.jubilacionAnio).toBe('2026');
    expect(r.formulario.sexo).toBe('mujer');
    // Lo no válido queda con el valor por defecto.
    expect(r.formulario.nacimientoMes).toBe(DEFECTO.nacimientoMes);
    expect(r.formulario.hijos).toBe(DEFECTO.hijos);
    expect(r.formulario.mesesSinCotizar).toBe(DEFECTO.mesesSinCotizar);
    expect(r.formulario.baseMensual).toBe(DEFECTO.baseMensual);
    expect(r.formulario.ipcSupuesto).toBe(DEFECTO.ipcSupuesto);
    expect(r.formulario.aplicarMinimos).toBe(DEFECTO.aplicarMinimos);
    expect(r.formulario.tipoCarrera).toBe(DEFECTO.tipoCarrera);
    expect(r.formulario.ubicacionLagunas).toBe(DEFECTO.ubicacionLagunas);
    expect(r.avisos).toHaveLength(8);
    expect(r.avisos.join(' ')).toMatch(/nacimiento/);
    expect(r.avisos.join(' ')).toMatch(/hijos/);
    expect(r.avisos.join(' ')).toMatch(/IPC/);
  });

  it('años fuera del rango admitido', () => {
    const r = leer('?v=1&nac=1800-01&jub=3000-01&ini=19-01');
    expect(r.formulario.nacimientoAnio).toBe('');
    expect(r.formulario.jubilacionAnio).toBe('');
    expect(r.avisos).toHaveLength(3);
  });

  it('lectura inexistente, valor desconocido e item sin valor: se ignoran con aviso', () => {
    const r = leer(
      '?v=1&lec=jubilacion.noExiste:x,jubilacion.baseMaxima:inventado,jubilacion.fraccionDemora,jubilacion.actualizacionFactorMinimo:sin-suelo,incapacidad.edadFiccion:edad-general',
    );
    expect(r.formulario.lecturas).toEqual({
      'jubilacion.actualizacionFactorMinimo': 'sin-suelo',
    });
    expect(r.avisos).toHaveLength(4);
    expect(r.avisos.join('\n')).toMatch(/jubilacion\.noExiste.*no existe en el registro/);
    expect(r.avisos.join('\n')).toMatch(/«inventado».*no es una de sus alternativas/);
    expect(r.avisos.join('\n')).toMatch(/falta el valor elegido/);
    // Una lectura de otra prestación existe en el registro pero el simulador no la ofrece.
    expect(r.avisos.join('\n')).toMatch(/incapacidad\.edadFiccion/);
  });

  it('un valor por defecto en `lec` no cuenta como lectura cambiada', () => {
    const r = leer('?v=1&lec=jubilacion.baseMaxima:compuesto');
    expect(r.formulario.lecturas).toEqual({});
    expect(r.avisos).toEqual([]);
  });

  it('definición de la media o persona-ejemplo desconocidas', () => {
    const r = leer('?v=1&med=inventada&pe=nadie');
    expect(r.formulario.definicionMedia).toBe(DEFECTO.definicionMedia);
    expect(r.personaId).toBeUndefined();
    expect(r.avisos).toHaveLength(2);
  });

  it('tramos mal formados o fuera de rango: se omiten solo esos', () => {
    const r = leer(
      '?v=1&car=t&tr=1986-11:2005-12:1200~2007-13:2010-01:max~2007-01:2010-01:-5~2011-01:2012-12:xyz~2013-01:2015-12:med~2016-01:2017-12',
    );
    expect(r.formulario.tipoCarrera).toBe('tramos');
    expect(r.formulario.tramos.map((t) => [t.desdeAnio, t.referencia])).toEqual([
      ['1986', 'importe'],
      ['2013', 'media'],
    ]);
    expect(r.avisos).toHaveLength(4);
    expect(r.avisos[0]).toMatch(/tramo 2/);
  });

  it('parámetros desconocidos y repetidos: aviso, y se usa el primer valor', () => {
    const r = leer('?v=1&foo=1&nac=1961-11&nac=1970-01');
    expect(r.formulario.nacimientoAnio).toBe('1961');
    expect(r.avisos).toHaveLength(2);
    expect(r.avisos.join(' ')).toMatch(/«foo»/);
  });

  it('más tramos de los admitidos: se cargan los primeros y se avisa', () => {
    const tr = Array.from({ length: LIMITES_ENLACE.tramosMaximo + 5 }, () => '2000-01:2000-12:max');
    const r = leer(`?v=1&tr=${tr.join('~')}`);
    expect(r.formulario.tramos).toHaveLength(LIMITES_ENLACE.tramosMaximo);
    expect(r.avisos).toHaveLength(1);
  });

  it('un importe con texto no numérico o con caracteres peligrosos no pasa', () => {
    const r = leer('?v=1&base=2500%3Cscript%3E&ipc=javascript');
    expect(r.formulario.baseMensual).toBe(DEFECTO.baseMensual);
    expect(r.avisos).toHaveLength(2);
  });
});

describe('tamaño del enlace con una carrera larga por tramos', () => {
  const carreraLarga = (n: number): TramoFormulario[] =>
    Array.from({ length: n }, (_, i) => {
      const anio = 1980 + Math.floor(i / 2);
      return i % 2 === 0
        ? tramo(i, ['1', String(anio)], ['6', String(anio)], 'importe', '2.345,67')
        : tramo(i, ['7', String(anio)], ['12', String(anio)], 'media');
    });

  it('un tramo ocupa pocas decenas de caracteres y cien tramos caben en pocos kilobytes', () => {
    const f: FormularioTuPension = {
      ...FORMULARIO_BASE,
      tipoCarrera: 'tramos',
      tramos: carreraLarga(LIMITES_ENLACE.tramosMaximo),
      lecturas: Object.fromEntries(
        LECTURAS_ABIERTAS.filter((l) => l.motor === 'jubilacion').map((l) => [
          l.id,
          l.alternativas.find((a) => a !== l.porDefecto) ?? l.porDefecto,
        ]),
      ),
    };
    const busqueda = escribirEnlace(f);
    // Límite práctico documentado en docs/SIMULADOR.md: por debajo de lo que admiten los navegadores
    // y servidores habituales (varios kilobytes), con todas las lecturas cambiadas.
    expect(busqueda.length).toBeLessThan(3000);
    const r = leerEnlace(busqueda, CONTEXTO);
    expect(r?.avisos).toEqual([]);
    expect(r?.formulario.tramos).toHaveLength(LIMITES_ENLACE.tramosMaximo);
  });

  it('con más tramos de los que admite, los últimos se omiten y se cuenta cuántos', () => {
    const { escritos, omitidosPorLimite } = tramosParaEnlace(
      carreraLarga(LIMITES_ENLACE.tramosMaximo + 7),
    );
    expect(escritos).toHaveLength(LIMITES_ENLACE.tramosMaximo);
    expect(omitidosPorLimite).toBe(7);
  });
});
