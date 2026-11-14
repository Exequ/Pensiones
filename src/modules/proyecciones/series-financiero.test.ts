import { describe, expect, it } from 'vitest';
import { tasaReal } from '../../engine/proyecciones';
import { valorEn } from '../../engine/series-historicas';
import { datosFinanciero } from './datos-financiero';
import { COL4 } from './ids-financiero';
import {
  aMilMillones,
  anioBaseConstante,
  columnaM4,
  contrasteAgeing,
  crecimientoAnualMedio,
  filasCandidatos,
  filasLimite,
  filasPibDeTramo,
  limiteEnEuros,
  rentabilidadImplicita,
  seriesFinanciacionAdicional,
  seriesFondoFlujos,
  seriesFondoValor,
  seriesGasto,
  seriesIngresosYGasto,
  seriesPensionMedia,
  seriesSaldos,
} from './series-financiero';

const d = datosFinanciero();
const MIL = 1000;
const anios = (puntos: readonly { anio: number }[]) => puntos.map((p) => p.anio);

describe('datos del bloque financiero', () => {
  it('M4 empieza en el año siguiente al último observado y llega a su último año', () => {
    expect(d.anioInicio).toBe(2026);
    expect(anios(columnaM4(d, COL4.gasto))).toEqual(Array.from({ length: 25 }, (_, i) => 2026 + i));
    expect(d.escenario.g).toBeCloseTo(0.01, 12);
    expect(d.escenario.ipc).toBeCloseTo(0.02, 12);
  });

  it('cada serie lleva su naturaleza: observado, derivado, proyección de modelo o proyección publicada', () => {
    expect(d.m4.dato.naturaleza).toBe('proyeccion-de-modelo');
    expect(d.observado.gastoPensiones.dato.naturaleza).toBe('observado');
    expect(d.observado.saldoCotizacionesMenosPensiones.dato.naturaleza).toBe('derivado');
    expect(d.observado.saldoSinTransferencias.dato.naturaleza).toBe('derivado');
    expect(d.observado.fondoDisposiciones.dato.naturaleza).toBe('derivado');
    expect(d.ageing.gastoPensionesPib.dato.naturaleza).toBe('proyeccion-publicada');
    for (const dato of [
      d.m4.dato,
      d.observado.gastoPensiones.dato,
      d.observado.fondoValor.dato,
      d.limiteDisposicion.dato,
      d.ageing.saldoSistemaPensiones.dato,
    ]) {
      expect(dato.source.url).toMatch(/^https?:\/\//);
      expect(dato.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(['alta', 'media', 'baja']).toContain(dato.confidence);
    }
  });

  it('el histórico es anterior al año de inicio y el MEI solo existe desde su creación', () => {
    expect(Math.max(...anios(d.observado.gastoPensiones.puntos))).toBe(d.anioInicio - 1);
    expect(d.observado.mei.puntos.length).toBeGreaterThan(0);
    expect(d.observado.mei.puntos.length).toBeLessThan(d.observado.gastoPensiones.puntos.length);
  });

  it('las disposiciones observadas están en valor absoluto', () => {
    expect(d.observado.fondoDisposiciones.puntos.every((p) => p.valor >= 0)).toBe(true);
    expect(d.observado.fondoDisposiciones.puntos.some((p) => p.valor > 0)).toBe(true);
  });
});

describe('a) gasto en pensiones', () => {
  it('en euros: miles de millones, con lo observado y lo proyectado en listas separadas sin años comunes', () => {
    const [s] = seriesGasto(d, 'euros');
    const obs = anios(s!.observado ?? []);
    const proy = anios(s!.proyeccion);
    expect(Math.max(...obs)).toBeLessThan(Math.min(...proy));
    expect(valorEn(s!.proyeccion, 2026)).toBeCloseTo(
      valorEn(columnaM4(d, COL4.gasto), 2026)! / MIL,
      9,
    );
    expect(valorEn(s!.observado ?? [], 2025)).toBeCloseTo(
      valorEn(d.observado.gastoPensiones.puntos, 2025)! / MIL,
      9,
    );
  });

  it('en porcentaje del PIB: lo observado con el PIB del INE y lo proyectado con el de M4', () => {
    const [s] = seriesGasto(d, 'pib');
    const gasto = valorEn(d.observado.gastoPensiones.puntos, 2025)!;
    const pibIne = valorEn(d.observado.pibIne.puntos, 2025)!;
    expect(valorEn(s!.observado ?? [], 2025)).toBeCloseTo((gasto / pibIne) * 100, 9);
    expect(valorEn(s!.proyeccion, 2030)).toBeCloseTo(
      valorEn(columnaM4(d, COL4.gastoPctPib), 2030)!,
      9,
    );
    // Cálculo independiente del porcentaje proyectado con el PIB aproximado.
    expect(valorEn(s!.proyeccion, 2030)).toBeCloseTo(
      (100 * valorEn(columnaM4(d, COL4.gasto), 2030)!) / valorEn(columnaM4(d, COL4.pib), 2030)!,
      9,
    );
  });

  it('la tabla del PIB distingue la definición de cada tramo y no repite años', () => {
    const filas = filasPibDeTramo(d);
    const porAnio = new Set(filas.map((f) => f.anio));
    expect(porAnio.size).toBe(filas.length);
    expect(filas.find((f) => f.anio === '2025')?.definicion).toMatch(/INE/);
    expect(filas.find((f) => f.anio === '2026')?.definicion).toMatch(/aproximado/);
  });
});

describe('b) pensión media', () => {
  it('en euros corrientes coincide con las columnas de M4 y con la pensión media observada', () => {
    const [total, jub] = seriesPensionMedia(d, 'corrientes');
    expect(valorEn(total!.proyeccion, 2026)).toBeCloseTo(
      valorEn(columnaM4(d, COL4.pensionMediaTotal), 2026)!,
      9,
    );
    expect(valorEn(jub!.proyeccion, 2040)).toBeCloseTo(
      valorEn(columnaM4(d, COL4.pensionMediaJubilacion), 2040)!,
      9,
    );
    expect(valorEn(total!.observado ?? [], 2025)).toBeCloseTo(
      valorEn(d.observado.pensionMediaTotal.puntos, 2025)!,
      9,
    );
  });

  it('en euros constantes: el año base no cambia y la proyección se descuenta con el IPC supuesto', () => {
    expect(anioBaseConstante(d)).toBe(2025);
    const [total] = seriesPensionMedia(d, 'constantes');
    // El último año observado es el año base: su valor no cambia con el IPC observado.
    expect(valorEn(total!.observado ?? [], 2025)).toBeCloseTo(
      valorEn(d.observado.pensionMediaTotal.puntos, 2025)!,
      9,
    );
    // Cálculo a mano: el valor de 2027 se divide entre (1 + IPC)² con el IPC del escenario.
    const ipc = d.escenario.ipc;
    expect(valorEn(total!.proyeccion, 2027)).toBeCloseTo(
      valorEn(columnaM4(d, COL4.pensionMediaTotal), 2027)! / (1 + ipc) ** 2,
      9,
    );
    // Los años observados anteriores a la base se revalorizan: valen más en euros de la base.
    const antes = valorEn(d.observado.pensionMediaTotal.puntos, 2015)!;
    expect(valorEn(total!.observado ?? [], 2015)!).toBeGreaterThan(antes);
  });

  it('el crecimiento anual medio compuesto: de 100 a 121 en dos años es un 10 %', () => {
    expect(
      crecimientoAnualMedio([
        { anio: 2026, valor: 100 },
        { anio: 2028, valor: 121 },
      ]),
    ).toBeCloseTo(0.1, 12);
    expect(crecimientoAnualMedio([{ anio: 2026, valor: 100 }])).toBeNull();
  });
});

describe('c) y d) ingresos, gasto y saldos', () => {
  it('cotizaciones, gasto y MEI en miles de millones', () => {
    const s = seriesIngresosYGasto(d);
    expect(s.map((x) => x.clave)).toEqual(['cotizaciones', 'gasto', 'mei']);
    expect(valorEn(s[0]!.proyeccion, 2030)).toBeCloseTo(
      valorEn(columnaM4(d, COL4.cotizaciones), 2030)! / MIL,
      9,
    );
    // El MEI forma parte de las cotizaciones: nunca las supera.
    for (const p of s[2]!.proyeccion) {
      expect(p.valor).toBeLessThan(valorEn(s[0]!.proyeccion, p.anio)!);
    }
  });

  it('las tres medidas en euros y en porcentaje del PIB; el Ageing Report solo en porcentaje', () => {
    const euros = seriesSaldos(d, 'euros');
    expect(euros.map((x) => x.clave)).toEqual([
      'cotizacionesPensiones',
      'sinTransferencias',
      'noFinanciero',
    ]);
    expect(valorEn(euros[2]!.proyeccion, 2035)).toBeCloseTo(
      valorEn(columnaM4(d, COL4.saldoNoFinanciero), 2035)! / MIL,
      9,
    );
    const pib = seriesSaldos(d, 'pib');
    expect(pib.map((x) => x.clave)).toContain('ageing');
    expect(valorEn(pib[0]!.proyeccion, 2035)).toBeCloseTo(
      valorEn(columnaM4(d, COL4.saldoCotizacionesPensionesPctPib), 2035)!,
      9,
    );
    // El saldo sin transferencias en porcentaje: importe entre el PIB aproximado, por cien.
    expect(valorEn(pib[1]!.proyeccion, 2035)).toBeCloseTo(
      (100 * valorEn(columnaM4(d, COL4.saldoSinTransferencias), 2035)!) /
        valorEn(columnaM4(d, COL4.pib), 2035)!,
      9,
    );
    const ageing = pib.find((x) => x.clave === 'ageing')!;
    expect(ageing.origen).toBe('publicada');
    expect(ageing.proyeccion[0]?.anio).toBe(d.anioInicio);
    // No pasa del último año que calcula M4, aunque el Ageing Report llegue más lejos.
    expect(ageing.proyeccion.at(-1)?.anio).toBe(columnaM4(d, COL4.pib).at(-1)?.anio);
    expect(Math.max(...anios(d.ageing.saldoSistemaPensiones.puntos))).toBeGreaterThan(2050);
    expect(ageing.observado).toBeUndefined();
  });

  it('lo observado de las medidas se calcula con la ejecución: cotizaciones menos pensiones en 2025', () => {
    const esperado =
      valorEn(d.observado.cotizaciones.puntos, 2025)! -
      valorEn(d.observado.gastoPensiones.puntos, 2025)!;
    expect(valorEn(d.observado.saldoCotizacionesMenosPensiones.puntos, 2025)).toBeCloseTo(
      esperado,
      6,
    );
    // El saldo sin transferencias no es mayor que el de cotizaciones menos pensiones (resta el resto de gastos).
    expect(valorEn(d.observado.saldoSinTransferencias.puntos, 2025)!).toBeLessThan(esperado);
  });
});

describe('e) Fondo de Reserva', () => {
  it('valor del Fondo: histórico y proyección separados', () => {
    const [s] = seriesFondoValor(d);
    expect(valorEn(s!.observado ?? [], 2025)).toBeCloseTo(
      valorEn(d.observado.fondoValor.puntos, 2025)! / MIL,
      9,
    );
    expect(Math.max(...anios(s!.observado ?? []))).toBeLessThan(Math.min(...anios(s!.proyeccion)));
  });

  it('el límite en euros es el porcentaje del PIB aproximado y solo existe en los años de la norma', () => {
    const limite = limiteEnEuros(d);
    expect(anios(limite)[0]).toBe(d.limiteDisposicion.puntos[0]?.anio);
    // Cálculo a mano del primer año: porcentaje ÷ 100 × PIB aproximado.
    const primero = d.limiteDisposicion.puntos[0]!;
    expect(limite[0]!.valor).toBeCloseTo(
      (primero.valor / 100) * valorEn(columnaM4(d, COL4.pib), primero.anio)!,
      6,
    );
    const flujos = seriesFondoFlujos(d);
    expect(flujos.map((x) => x.clave)).toEqual(['dotaciones', 'disposiciones', 'limite']);
    expect(flujos[2]!.observado).toBeUndefined();
    expect(flujos[2]!.proyeccion.length).toBeLessThan(flujos[1]!.proyeccion.length);
  });

  it('la disposición del modelo nunca supera el límite y coincide con él en los años con disposición', () => {
    const filas = filasLimite(d);
    expect(filas.length).toBeGreaterThan(0);
    for (const f of filas) {
      expect(f.disposicion).toBeLessThanOrEqual(f.limiteEuros * (1 + 1e-9));
      if (f.disposicion > 0) expect(f.disposicionSobreLimite).toBeCloseTo(100, 6);
    }
  });

  it('la rentabilidad implícita es la misma todos los años', () => {
    const r = rentabilidadImplicita(d);
    expect(r.maxima - r.minima).toBeLessThan(1e-6);
    expect(r.minima).toBeGreaterThan(0);
    // Cálculo a mano del primer año.
    const f26 = valorEn(columnaM4(d, COL4.fondo), 2026)!;
    const f25 = valorEn(d.observado.fondoValor.puntos, 2025)!;
    const dot = valorEn(columnaM4(d, COL4.dotacion), 2026)!;
    const disp = valorEn(columnaM4(d, COL4.disposicion), 2026)!;
    expect(r.minima).toBeCloseTo((f26 - f25 - dot + disp) / f25, 9);
  });

  it('financiación adicional y disposición solo tienen proyección', () => {
    const s = seriesFinanciacionAdicional(d);
    expect(s.every((x) => x.observado === undefined)).toBe(true);
    expect(anios(s[1]!.proyeccion)).toEqual(anios(columnaM4(d, COL4.gasto)));
  });
});

describe('f) contraste con el Ageing Report', () => {
  it('el índice parte de cien en el año base en las dos series y la diferencia es modelo menos Ageing Report', () => {
    const c = contrasteAgeing(d);
    expect(c.anioBase).toBe(2026);
    expect(c.indiceM4[0]?.valor).toBeCloseTo(100, 9);
    expect(c.indiceAgeing[0]?.valor).toBeCloseTo(100, 9);
    expect(c.diferencias).toHaveLength(25);
    for (const f of c.diferencias) expect(f.diferencia).toBeCloseTo(f.a - f.b, 9);
    // Cálculo a mano del índice del último año.
    const nivel = columnaM4(d, COL4.gastoPctPib);
    expect(c.indiceM4.at(-1)?.valor).toBeCloseTo((nivel.at(-1)!.valor / nivel[0]!.valor) * 100, 9);
    const ageing = d.ageing.gastoPensionesPib.puntos;
    expect(c.indiceAgeing.at(-1)?.valor).toBeCloseTo(
      (valorEn(ageing, 2050)! / valorEn(ageing, 2026)!) * 100,
      9,
    );
  });

  it('los niveles de cada serie se conservan aparte (no son comparables)', () => {
    const c = contrasteAgeing(d);
    expect(c.nivelM4).toHaveLength(25);
    expect(c.nivelAgeing[0]?.valor).not.toBeCloseTo(c.nivelM4[0]!.valor, 1);
  });

  it('magnitudes de los candidatos: crecimiento real del PIB aproximado con el IPC supuesto', () => {
    const filas = filasCandidatos(d);
    expect(filas).toHaveLength(25);
    expect(filas[0]?.crecimientoPibModelo).toBeNull();
    const pib = columnaM4(d, COL4.pib);
    const nominal = pib[2]!.valor / pib[1]!.valor - 1;
    expect(filas[2]?.crecimientoPibModelo).toBeCloseTo(tasaReal(nominal, d.escenario.ipc) * 100, 9);
    expect(filas.every((f) => f.tasaReposicionAgeing !== null)).toBe(true);
    expect(filas.every((f) => f.crecimientoPibAgeing !== null)).toBe(true);
  });
});

describe('unidades', () => {
  it('aMilMillones divide entre mil', () => {
    expect(aMilMillones([{ anio: 2026, valor: 2500 }])[0]?.valor).toBe(2.5);
  });
});
