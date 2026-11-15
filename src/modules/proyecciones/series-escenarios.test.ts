/**
 * Ajustes de M4: escenarios de sensibilidad y factor de calibración en la capa de datos y de series del
 * bloque financiero. Los valores se comprueban con cálculos independientes a partir de los CSV y de
 * los ficheros de /data (`scripts/verificacion-m4.ts` los lee por su cuenta).
 */
import { describe, expect, it } from 'vitest';
import ejecucionCsv from '../../../data/sistema/presupuesto-ss-ejecucion.csv?raw';
import numeroJson from '../../../data/sistema/pensiones-vigor-numero.json';
import mediaJson from '../../../data/sistema/pensiones-vigor-pension-media.json';
import { aEurosConstantesConIpcSupuesto } from '../../engine/proyecciones';
import { filasCsv, valorEn } from '../../engine/series-historicas';
import { datosFinanciero } from './datos-financiero';
import { COL4, ESCENARIO_BASE } from './ids-financiero';
import {
  columnaM4,
  comparacionEscenarios,
  descripcionCambio,
  rentabilidadImplicita,
  rentabilidadReal,
  tituloConEscenario,
} from './series-financiero';

const base = datosFinanciero();
const MIL = 1000;

describe('datosFinanciero(escenario)', () => {
  it('por defecto es el escenario base y lo observado es el mismo en todos', () => {
    expect(base.escenarioActivo.id).toBe(ESCENARIO_BASE);
    expect(datosFinanciero(ESCENARIO_BASE)).toBe(base);
    const g0 = datosFinanciero('g0');
    expect(g0.escenarioActivo.id).toBe('g0');
    expect(g0.escenario.g).toBe(0);
    expect(g0.escenario.ipc).toBeCloseTo(0.02, 12);
    expect(g0.observado).toBe(base.observado);
    expect(g0.calibracion).toBe(base.calibracion);
    expect(g0.anioInicio).toBe(base.anioInicio);
  });

  it('cada escenario trae solo sus filas, todos los años, y la fila observada no entra en ellas', () => {
    for (const e of base.escenarios) {
      const d = datosFinanciero(e.id);
      expect(d.m4.filas).toHaveLength(25);
      expect(d.m4.filas.every((f) => f[COL4.escenario] === e.id)).toBe(true);
      expect(columnaM4(d, COL4.gasto)[0]?.anio).toBe(2026);
      expect(d.escenario).toEqual({ g: e.g, ipc: e.ipc });
    }
  });

  it('cambiar de escenario cambia las series de M4', () => {
    const gasto = (id: string) => valorEn(columnaM4(datosFinanciero(id), COL4.gastoPctPib), 2050)!;
    expect(gasto('g0')).toBeGreaterThan(gasto('base'));
    expect(gasto('g2')).toBeLessThan(gasto('base'));
  });

  it('un escenario desconocido falla', () => {
    expect(() => datosFinanciero('inexistente')).toThrow(RangeError);
  });

  it('la fila observada es la de 2025 y la dota el último año observado', () => {
    expect(base.filaObservada.anio).toBe(base.anioInicio - 1);
    expect(base.filaObservada.valores['fondo_reserva']).toBe(
      valorEn(base.observado.fondoValor.puntos, 2025),
    );
  });

  it('el rótulo del escenario sale de sus valores y el título del gráfico lo recoge', () => {
    expect(base.escenarios.map((e) => e.etiqueta)).toEqual([
      expect.stringMatching(/^base: g 1\s%, IPC 2\s%$/),
      expect.stringMatching(/^g 0\s%, IPC 2\s%$/),
      expect.stringMatching(/^g 2\s%, IPC 2\s%$/),
      expect.stringMatching(/^g 1\s%, IPC 1\s%$/),
      expect.stringMatching(/^g 1\s%, IPC 3\s%$/),
    ]);
    expect(tituloConEscenario(datosFinanciero('ipc3'), 'Gráfico')).toMatch(
      /^Gráfico · escenario g 1\s%, IPC 3\s%$/,
    );
  });
});

describe('descripcionCambio', () => {
  const por = (id: string) => base.escenarios.find((e) => e.id === id)!;
  it('el base es el de referencia y los demás dicen qué hipótesis cambian', () => {
    expect(descripcionCambio(por('base'), por('base'))).toMatch(/referencia/);
    expect(descripcionCambio(por('g0'), por('base'))).toMatch(
      /solo el crecimiento real de los salarios: 0\s% en lugar de 1\s%/,
    );
    expect(descripcionCambio(por('ipc3'), por('base'))).toMatch(
      /solo el IPC: 3\s% en lugar de 2\s%/,
    );
    expect(descripcionCambio(por('ipc3'), por('base'))).not.toMatch(/salarios/);
  });
});

describe('comparacionEscenarios', () => {
  const c = comparacionEscenarios(base);
  const fila = (id: string) => c.filas.find((f) => f.id === id)!;

  it('compara en el último año de la salida y el año base de los euros constantes es el último observado', () => {
    expect(c.anio).toBe(2050);
    expect(c.anioBase).toBe(2025);
    expect(c.filas.map((f) => f.id)).toEqual(base.escenarios.map((e) => e.id));
  });

  it('las diferencias con el base son exactas y la del base es cero', () => {
    expect(fila('base').gastoDiferencia).toBe(0);
    expect(fila('base').saldoDiferencia).toBe(0);
    for (const f of c.filas) {
      expect(f.gastoDiferencia).toBeCloseTo(f.gastoPib! - fila('base').gastoPib!, 12);
      expect(f.saldoDiferencia).toBeCloseTo(f.saldoPib! - fila('base').saldoPib!, 12);
    }
  });

  it('el valor del Fondo va en miles de millones y la pensión media en euros constantes con el IPC de cada escenario', () => {
    for (const e of base.escenarios) {
      const d = datosFinanciero(e.id);
      expect(fila(e.id).fondo).toBeCloseTo(valorEn(columnaM4(d, COL4.fondo), 2050)! / MIL, 9);
      const nominal = valorEn(columnaM4(d, COL4.pensionMediaTotal), 2050)!;
      expect(fila(e.id).pensionMediaConstante).toBeCloseTo(
        nominal / (1 + e.ipc) ** (2050 - 2025),
        6,
      );
      expect(fila(e.id).pensionMediaConstante).toBeCloseTo(
        valorEn(
          aEurosConstantesConIpcSupuesto(columnaM4(d, COL4.pensionMediaTotal), e.ipc, 2025),
          2050,
        )!,
        6,
      );
    }
  });

  it('con otro IPC, la pensión media nominal sube pero en euros constantes casi no cambia respecto a g', () => {
    expect(fila('g0').pensionMediaConstante!).toBeLessThan(fila('base').pensionMediaConstante!);
    expect(fila('g2').pensionMediaConstante!).toBeGreaterThan(fila('base').pensionMediaConstante!);
  });
});

describe('rentabilidad del Fondo por escenario', () => {
  it('la nominal implícita es la misma en los cinco y la real depende del IPC', () => {
    const nominal = rentabilidadImplicita(base).minima;
    for (const e of base.escenarios) {
      const r = rentabilidadImplicita(base, e.id);
      expect(r.minima).toBeCloseTo(nominal, 9);
      expect(r.maxima).toBeCloseTo(nominal, 9);
    }
    expect(rentabilidadReal(nominal, 0.01)).toBeGreaterThan(rentabilidadReal(nominal, 0.02));
    expect(rentabilidadReal(nominal, 0.03)).toBeLessThan(0);
  });

  it('un cero numérico no sale con signo', () => {
    expect(Object.is(rentabilidadReal(0.02, 0.02), 0)).toBe(true);
  });
});

describe('factor de calibración calculado con los datos descargados', () => {
  const c = base.calibracion;
  // Cálculo independiente: filas del CSV de la ejecución y de los JSON, sin pasar por datos-financiero.
  const ejecucion = (tabla: string, concepto: string): number => {
    const fila = filasCsv(ejecucionCsv).find(
      (f) =>
        f['periodo'] === '2025-T4' &&
        f['columna'] === 'principal' &&
        f['tabla'] === tabla &&
        f['concepto'] === concepto,
    );
    return Number(fila?.['derechos_u_obligaciones_meur']);
  };
  const dato = (json: unknown, id: string): number =>
    (json as { series: { id: string; points: { period: string; value: number }[] }[] }).series
      .find((s) => s.id === id)!
      .points.find((p) => p.period === '2025')!.value;
  const factorIndependiente = (clave: string, concepto: string): number =>
    ejecucion('gastos-cap4', concepto) /
    ((dato(numeroJson, `${clave}-ambos`) * dato(mediaJson, `${clave}-ambos`) * 14) / 1e6);

  it('coincide con el cociente calculado con el CSV de la ejecución y los JSON, en conjunto y por clase', () => {
    expect(c.anio).toBe(2025);
    expect(c.total.factor).toBeCloseTo(factorIndependiente('total', 'SUMA DE PENSIONES'), 12);
    const conceptos = [
      'JUBILACIÓN',
      'VIUDEDAD',
      'INCAPACIDAD PERMANENTE',
      'ORFANDAD',
      'A FAVOR DE FAMILIARES',
    ];
    const claves = ['jubilacion', 'viudedad', 'incapacidad', 'orfandad', 'favor-familiares'];
    expect(c.clases).toHaveLength(conceptos.length);
    c.clases.forEach((f, i) => {
      expect(f.clave).toBe(claves[i]);
      expect(f.factor).toBeCloseTo(factorIndependiente(claves[i]!, conceptos[i]!), 12);
      expect(f.factor).toBeLessThan(1);
    });
    expect(c.total.factor).toBeCloseTo(0.948, 3);
  });

  it('lo que la ejecución trae fuera de las cinco clases es el gasto sin clase', () => {
    const suma = c.clases.reduce((a, f) => a + f.gastoEjecucion, 0);
    expect(c.gastoSinClase).toBeCloseTo(c.total.gastoEjecucion - suma, 9);
    expect(c.gastoSinClase).toBeGreaterThanOrEqual(0);
  });

  it('los complementos a mínimos son una partida aparte y con ellos el cociente se acerca a uno', () => {
    expect(c.complementos.importe).toBeCloseTo(
      ejecucion('gastos-cap4-no-contributivas', 'COMPL. A MÍNIMOS PENSIONES CONTRIBUTIVAS'),
      6,
    );
    expect(c.complementos.factorConComplementos).toBeCloseTo(
      (ejecucion('gastos-cap4', 'SUMA DE PENSIONES') + c.complementos.importe) /
        c.total.gastoNominal,
      12,
    );
    expect(c.complementos.factorConComplementos).toBeGreaterThan(c.total.factor);
  });

  it('el cociente de la salida de M4 en 2026 en adelante es casi el calculado con 2025', () => {
    for (const e of base.escenarios) {
      const d = datosFinanciero(e.id);
      const f = d.m4.filas[0]!;
      const cociente =
        (f[COL4.gasto] as number) /
        (((f[COL4.pensiones] as number) * (f[COL4.pensionMediaTotal] as number) * 14) / 1e6);
      expect(Math.abs(cociente - c.total.factor)).toBeLessThan(0.001);
    }
  });
});
