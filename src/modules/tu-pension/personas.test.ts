import { describe, expect, it } from 'vitest';
import { ArchivoPersonas } from '../../engine/esquema-datos';
import { formularioAEntrada } from './mapeador';
import { describirPersona, cargarPersona, type PersonaEjemplo } from './personas';
import { personasDeRepositorio } from './personas-datos';
import { crearMotorDelRepositorio } from './motor';
import { FORMULARIO_BASE } from './pruebas';
import { catalogoPorDefecto } from './referencias-datos';

const catalogo = catalogoPorDefecto();
const { personas } = personasDeRepositorio();
const persona = (id: string): PersonaEjemplo => {
  const p = personas.find((x) => x.id === id);
  if (!p) throw new Error(`falta la persona ${id}`);
  return p;
};
const CTX = {
  nacimiento: { anio: 1961, mes: 11 },
  jubilacion: { anio: 2026, mes: 11 },
  catalogo,
  definicionMedia: catalogo.mediaPorDefecto,
};

describe('personas-ejemplo de /data', () => {
  it('hay entre tres y cinco, todas ilustrativas y de elaboración propia', () => {
    expect(personas.length).toBeGreaterThanOrEqual(3);
    expect(personas.length).toBeLessThanOrEqual(5);
    for (const p of personas) {
      expect(p.ilustrativo).toBe(true);
      expect(p.source.publisher).toContain('elaboración propia');
      expect(p.confidence).not.toBe('alta');
    }
  });

  it('el nombre y la descripción no llevan cifras: los números viven en los campos de /data', () => {
    for (const p of personas) {
      expect(p.nombre).not.toMatch(/\d/);
      expect(p.descripcion).not.toMatch(/\d/);
    }
  });

  it('no llevan bases ni importes: solo referencias a series', () => {
    for (const p of personas) {
      expect(JSON.stringify(p.tramos)).not.toMatch(/base(Mensual|s)|importe/);
      for (const t of p.tramos)
        expect(['minima', 'media', 'maxima', 'sin-cotizar']).toContain(t.referencia);
    }
  });

  it('el esquema rechaza una persona no ilustrativa, sin fuente o con tramos mal formados', () => {
    const base = ArchivoPersonas.parse({
      tipo: 'personas',
      id: 'x',
      title: 't',
      description: 'd',
      personas: personas.slice(0, 3),
    });
    expect(base.personas).toHaveLength(3);
    const mala = (cambio: Record<string, unknown>) =>
      ArchivoPersonas.safeParse({
        tipo: 'personas',
        id: 'x',
        title: 't',
        description: 'd',
        personas: [{ ...personas[0], ...cambio }, personas[1], personas[2]],
      }).success;
    expect(mala({})).toBe(true);
    expect(mala({ ilustrativo: false })).toBe(false);
    expect(mala({ source: undefined })).toBe(false);
    expect(mala({ tramos: [{ referencia: 'media', anios: 5, hastaJubilacion: true }] })).toBe(
      false,
    );
    expect(mala({ tramos: [{ referencia: 'sin-cotizar', hastaJubilacion: true }] })).toBe(false);
    expect(
      mala({
        tramos: [
          { referencia: 'media', hastaJubilacion: true },
          { referencia: 'media', anios: 3 },
        ],
      }),
    ).toBe(false);
  });

  it('describirPersona compone el texto con las cifras del fichero', () => {
    const p = persona('interrupcion-larga');
    const d = describirPersona(p);
    expect(d).toContain(`a los ${String(p.edadInicio)} años`);
    expect(d).toContain('sin cotizar durante');
    expect(d).toContain('hasta el mes anterior a la jubilación');
  });
});

describe('cargarPersona: cobertura de los datos', () => {
  const cargar = (id: string, ctx = CTX) => {
    const r = cargarPersona(persona(id), ctx);
    if (!r.ok) throw new Error(r.mensaje);
    return r;
  };

  it('base máxima: los datos empiezan en el primer año de la serie y se explica', () => {
    const r = cargar('carrera-bases-maximas');
    const maxima = catalogo.referencias.find((x) => x.id === 'base-maxima');
    expect(r.tramos).toHaveLength(1);
    expect(r.tramos[0]).toMatchObject({
      desdeMes: '1',
      desdeAnio: String(maxima?.primerAnio),
      hastaMes: '10',
      hastaAnio: '2026',
      referencia: 'maxima',
      importe: '',
    });
    expect(r.notas.join(' ')).toContain(`solo tiene datos desde ${String(maxima?.primerAnio)}`);
  });

  it('base media con la definición por defecto: empieza en su primer año y termina en el último', () => {
    const r = cargar('carrera-completa-base-media');
    const media = catalogo.referencias.find((x) => x.id === catalogo.mediaPorDefecto);
    expect(r.tramos[0]?.desdeAnio).toBe(String(media?.primerAnio));
    expect(r.tramos[0]?.hastaAnio).toBe(String(media?.ultimoAnio));
    expect(r.tramos[0]?.hastaMes).toBe('12');
    const notas = r.notas.join(' ');
    expect(notas).toContain('solo tiene datos desde');
    expect(notas).toContain('quedan sin tramo');
  });

  it('con otra definición de la base media cambia la cobertura', () => {
    const cn = catalogo.referencias.find((x) => x.id === 'media-cn');
    const r = cargar('carrera-completa-base-media', { ...CTX, definicionMedia: 'media-cn' });
    expect(r.tramos[0]?.desdeAnio).toBe(String(cn?.primerAnio));
  });

  it('la interrupción larga deja el hueco entre los dos tramos', () => {
    const p = persona('interrupcion-larga');
    const r = cargar('interrupcion-larga', { ...CTX, definicionMedia: 'media-cn' });
    expect(r.tramos).toHaveLength(2);
    // El segundo tramo empieza tras los años con base media y los años sin cotizar de /data.
    const [a, b] = p.tramos;
    const inicio = 1961 * 12 + 10 + p.edadInicio * 12;
    const empieza2 = inicio + ((a?.anios ?? 0) + (b?.anios ?? 0)) * 12;
    expect(r.tramos[1]?.desdeAnio).toBe(String(Math.floor(empieza2 / 12)));
    expect(r.tramos[1]?.desdeMes).toBe(String((empieza2 % 12) + 1));
  });

  it('inicio tardío: empieza más tarde que la carrera completa', () => {
    const tardio = cargar('inicio-tardio', { ...CTX, definicionMedia: 'media-cn' });
    const completa = cargar('carrera-completa-base-media', { ...CTX, definicionMedia: 'media-cn' });
    const abs = (t?: { desdeAnio: string; desdeMes: string }) =>
      Number(t?.desdeAnio) * 12 + Number(t?.desdeMes);
    expect(abs(tardio.tramos[0])).toBeGreaterThanOrEqual(abs(completa.tramos[0]));
  });

  it('si la persona empezaría después de jubilarse, lo dice', () => {
    const r = cargarPersona(persona('carrera-base-minima'), {
      ...CTX,
      nacimiento: { anio: 2010, mes: 1 },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.mensaje).toContain('después del mes anterior a la jubilación');
  });

  it('si los datos no cubren ninguna fecha de la persona, no se inventa nada', () => {
    const r = cargarPersona(persona('carrera-completa-base-media'), {
      ...CTX,
      nacimiento: { anio: 1950, mes: 1 },
      jubilacion: { anio: 2015, mes: 1 },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.mensaje).toContain('no cubren');
  });
});

describe('las personas, de extremo a extremo con el motor', () => {
  it('cada persona carga, valida, se mapea al motor y da un resultado coherente', () => {
    for (const p of personas) {
      const carga = cargarPersona(p, { ...CTX, definicionMedia: 'media-cn' });
      expect(carga.ok, p.id).toBe(true);
      if (!carga.ok) continue;
      const mapeo = formularioAEntrada(
        {
          ...FORMULARIO_BASE,
          tipoCarrera: 'tramos',
          tramos: carga.tramos,
          definicionMedia: 'media-cn',
        },
        catalogo,
      );
      expect(
        mapeo.ok,
        `${p.id}: ${JSON.stringify(mapeo.ok ? [] : [mapeo.errores, mapeo.erroresTramos])}`,
      ).toBe(true);
      if (!mapeo.ok) continue;
      const r = crearMotorDelRepositorio(mapeo.configuracion).jubilacion(mapeo.entrada);
      expect(r.ok, p.id).toBe(true);
    }
  });
});
