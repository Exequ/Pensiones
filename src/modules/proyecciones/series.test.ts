import { describe, expect, it } from 'vitest';
import { datosProyecciones } from './datos-proyecciones';
import {
  anioFinDe,
  anioInicioDe,
  anioPrimeroDe,
  filasDeTabla,
  leyendaDeTipos,
  type SerieProyectada,
} from './grafico-proyeccion';
import { COL } from './ids-datos';
import {
  aniosDe,
  escalarPuntos,
  pensionesPorEdadYSexo,
  puntosDeColumna,
  totalDeClase,
  valoresDe,
} from './series';

const fila = (o: Record<string, string | number>) => o;

describe('series de las salidas de los modelos (casos calculados a mano)', () => {
  const filas = [
    fila({ anio: 2027, clase: 'a', sexo: 'hombres', grupo_edad: '0-4', pensiones: 10 }),
    fila({ anio: 2027, clase: 'a', sexo: 'mujeres', grupo_edad: '0-4', pensiones: 20 }),
    fila({ anio: 2027, clase: 'b', sexo: 'hombres', grupo_edad: '0-4', pensiones: 1 }),
    fila({ anio: 2027, clase: 'b', sexo: 'mujeres', grupo_edad: '0-4', pensiones: 2 }),
    fila({ anio: 2027, clase: 'a', sexo: 'hombres', grupo_edad: '5-9', pensiones: 30 }),
    fila({ anio: 2027, clase: 'a', sexo: 'mujeres', grupo_edad: '5-9', pensiones: 40 }),
    fila({ anio: 2026, clase: 'a', sexo: 'hombres', grupo_edad: '0-4', pensiones: 100 }),
  ];

  it('puntosDeColumna filtra y ordena por año', () => {
    expect(
      puntosDeColumna(
        filas,
        'pensiones',
        (f) => f['clase'] === 'a' && f['sexo'] === 'hombres' && f['grupo_edad'] === '0-4',
      ),
    ).toEqual([
      { anio: 2026, valor: 100 },
      { anio: 2027, valor: 10 },
    ]);
  });

  it('valoresDe y aniosDe conservan el orden de aparición o el orden numérico', () => {
    expect(valoresDe(filas, 'grupo_edad')).toEqual(['0-4', '5-9']);
    expect(aniosDe(filas)).toEqual([2026, 2027]);
  });

  it('pensionesPorEdadYSexo reparte una clase por grupo y sexo, y suma las clases con «total»', () => {
    const a = pensionesPorEdadYSexo(filas, 'a', 2027);
    expect(a.grupos).toEqual(['0-4', '5-9']);
    expect(a.hombres).toEqual([10, 30]);
    expect(a.mujeres).toEqual([20, 40]);
    const total = pensionesPorEdadYSexo(filas, 'total', 2027);
    expect(total.hombres).toEqual([11, 30]); // 10 + 1 y 30
    expect(total.mujeres).toEqual([22, 40]); // 20 + 2 y 40
    expect(totalDeClase(filas, 'a', 2027)).toBe(100); // 10 + 20 + 30 + 40
    expect(totalDeClase(filas, 'total', 2027)).toBe(103);
  });

  it('falla con una columna no numérica y escala los puntos', () => {
    expect(() => puntosDeColumna(filas, 'clase')).toThrow(TypeError);
    expect(escalarPuntos([{ anio: 2026, valor: 2 }], 1000)).toEqual([{ anio: 2026, valor: 2000 }]);
  });
});

describe('maquetación del gráfico de observado y proyección', () => {
  const series: SerieProyectada[] = [
    {
      clave: 'a',
      etiqueta: 'A',
      observado: [
        { anio: 2024, valor: 1 },
        { anio: 2025, valor: 2 },
      ],
      proyeccion: [
        { anio: 2026, valor: 3 },
        { anio: 2051, valor: 4 },
      ],
      origen: 'modelo',
    },
    {
      clave: 'b',
      etiqueta: 'B',
      proyeccion: [{ anio: 2026, valor: 30 }],
      origen: 'publicada',
    },
  ];

  it('calcula el año de inicio, el primero y el último', () => {
    expect(anioInicioDe(series)).toBe(2026);
    expect(anioPrimeroDe(series)).toBe(2024);
    expect(anioFinDe(series)).toBe(2051);
    expect(
      anioInicioDe([{ clave: 'x', etiqueta: 'X', proyeccion: [], origen: 'modelo' }]),
    ).toBeUndefined();
  });

  it('las filas de la tabla rotulan lo observado, lo proyectado y lo ilustrativo', () => {
    const filas = filasDeTabla(series, 2026, 2050);
    expect(filas.map((f) => [f['anio'], f['tipo']])).toEqual([
      ['2024', 'Observado'],
      ['2025', 'Observado'],
      ['2026', 'Proyección'],
      ['2051', 'Proyección (ilustrativa)'],
    ]);
    expect(filas[0]?.['a']).toBe(1);
    expect(filas[0]?.['b']).toBeNull();
    expect(filas[2]?.['b']).toBe(30);
    // Sin horizonte, nada es ilustrativo.
    expect(filasDeTabla(series, 2026, undefined).at(-1)?.['tipo']).toBe('Proyección');
  });

  it('la leyenda solo incluye los tipos de línea presentes, con glifos distintos', () => {
    const l = leyendaDeTipos(series, true);
    expect(l.map((x) => x.texto)).toEqual([
      'Observado',
      'Proyección del modelo',
      'Proyección publicada',
      'Ilustrativo',
    ]);
    expect(new Set(l.map((x) => x.glifo)).size).toBe(4);
    expect(leyendaDeTipos([series[1]!], false).map((x) => x.texto)).toEqual([
      'Proyección publicada',
    ]);
  });
});

describe('datos de la página', () => {
  const d = datosProyecciones();

  it('cada salida de modelo lleva naturaleza «proyección de modelo» en su Dato', () => {
    for (const t of [
      d.m1.contraste,
      d.m1.backtest,
      d.m1.escenarios,
      d.m2.cotizantes,
      d.m2.relacion,
      d.m3.pensiones,
      d.m3.resumen,
    ]) {
      expect(t.dato.naturaleza).toBe('proyeccion-de-modelo');
      expect(t.dato.source.publisher).toBe('Elaboración propia: modelo de proyección');
    }
  });

  it('el Ageing Report y el INE se rotulan como proyecciones publicadas, y lo agregado como derivado', () => {
    expect(d.ageing.pensionistas.dato.naturaleza).toBe('proyeccion-publicada');
    expect(d.ageing.apoyo.dato.naturaleza).toBe('proyeccion-publicada');
    expect(d.datoProyeccionIne.naturaleza).toBe('proyeccion-publicada');
    expect(d.observado.poblacion.mayores.dato.naturaleza).toBe('derivado');
    expect(d.observado.cotizantesRg.dato.naturaleza).toBe('derivado');
  });

  it('la población observada de 65 años o más a 1 de enero de 2026 es la de partida del modelo salvo diferencias de la fuente (menos de una diezmilésima)', () => {
    const observada = d.observado.poblacion.mayores.puntos.find((p) => p.anio === 2026)?.valor;
    const modelo = puntosDeColumna(d.m1.contraste.filas, COL.mayoresM1).find(
      (p) => p.anio === 2026,
    )?.valor;
    expect(observada).toBeDefined();
    expect(Math.abs((observada ?? 0) - (modelo ?? 0)) / (modelo ?? 1)).toBeLessThan(1e-4);
  });

  it('los cotizantes observados solo incluyen años con los doce meses y la base real coincide con la corriente en el año base', () => {
    const anioBase = d.m2.cotizantes.archivo.modelo.anioBaseReal ?? 0;
    const corriente = d.observado.baseTotalCorrientes.puntos.find(
      (p) => p.anio === anioBase,
    )?.valor;
    const real = d.observado.baseTotalReales.puntos.find((p) => p.anio === anioBase)?.valor;
    expect(corriente).toBeDefined();
    expect(real).toBeCloseTo(corriente ?? 0, 6);
    // El último año con los doce meses es anterior al año del primer valor proyectado.
    const ultimo = d.observado.cotizantesRg.puntos.at(-1)?.anio ?? 0;
    expect(ultimo).toBeLessThan(
      puntosDeColumna(d.m2.cotizantes.filas, COL.cotizantesRg)[0]?.anio ?? 0,
    );
    // Cálculo a mano de un año: la media de cotizantes de 2018 está entre el mínimo y el máximo mensual.
    expect(d.observado.cotizantesRg.puntos[0]?.valor).toBeGreaterThan(14_000_000);
  });
});

describe('los contrastes reproducen las cifras que declaran las descripciones de los modelos', () => {
  const d = datosProyecciones();

  it('M2: diferencias de índice con el Ageing Report de -2,1, -2,0, -1,0 y +3,6 puntos en 2030, 2035, 2040 y 2050', () => {
    const modelo = puntosDeColumna(d.m2.relacion.filas, COL.afiliadosPorPension);
    const base = modelo.find((p) => p.anio === 2026)!.valor;
    const ageing = d.ageing.apoyo.puntos;
    const baseAgeing = ageing.find((p) => p.anio === 2026)!.valor;
    const dif = (anio: number) =>
      (modelo.find((p) => p.anio === anio)!.valor / base) * 100 -
      (ageing.find((p) => p.anio === anio)!.valor / baseAgeing) * 100;
    expect(dif(2030)).toBeCloseTo(-2.1, 1);
    expect(dif(2035)).toBeCloseTo(-2.0, 1);
    expect(dif(2040)).toBeCloseTo(-1.0, 1);
    expect(dif(2050)).toBeCloseTo(3.6, 1);
  });

  it('M3: crecimiento de las pensiones de 9,7 %, 33,4 % y 49,5 % hasta 2030, 2040 y 2050 (descripción: 10 %, 33 % y 49,5 %)', () => {
    const total = puntosDeColumna(d.m3.resumen.filas, COL.total);
    const base = total.find((p) => p.anio === 2026)!.valor;
    const crecimiento = (anio: number) =>
      (total.find((p) => p.anio === anio)!.valor / base - 1) * 100;
    expect(crecimiento(2030)).toBeCloseTo(9.7, 1);
    expect(crecimiento(2040)).toBeCloseTo(33.4, 1);
    expect(crecimiento(2050)).toBeCloseTo(49.5, 1);
  });

  it('M1: relación de dependencia en 2050 de 0,523 en el escenario base y 0,698 sin migración', () => {
    const f = d.m1.escenarios.filas;
    const dep = (e: string, anio: number) =>
      Number(f.find((r) => r['escenario'] === e && r['anio'] === anio)?.['dep_65']);
    expect(dep('INE (base)', 2050)).toBeCloseTo(0.523, 3);
    expect(dep('sin migración', 2050)).toBeCloseTo(0.698, 3);
    expect(dep('sin migración', 2076)).toBeCloseTo(0.907, 3);
  });
});
