import { describe, expect, it } from 'vitest';
import contraste from '../../../data/internacional/contraste-espana.json';
import { ArchivoDatos } from '../../engine/esquema-datos';
import { encontrarSerie, puntosAnuales, valorEn } from '../../engine/series-historicas';
import { CLASES_PENSION, gastoAproximadoPensiones } from '../../engine/sistema-historico';
import { datosCotizantes } from './datos-cotizantes';
import { datosFinanciacion, PRIMER_EJERCICIO, ULTIMO_EJERCICIO } from './datos-financiacion';
import { datosHucha } from './datos-hucha';

const anios = (p: readonly { anio: number }[]) => p.map((x) => x.anio);
const rango = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

describe('datos de «Financiación y déficit»', () => {
  const d = datosFinanciacion();

  it('todas las series de la ejecución cubren cada ejercicio, sin huecos', () => {
    const esperado = rango(PRIMER_EJERCICIO, ULTIMO_EJERCICIO);
    for (const [nombre, serie] of Object.entries(d.ejecucion)) {
      expect(anios(serie.puntos), nombre).toEqual(esperado);
    }
  });

  it('las cotizaciones de la ejecución coinciden con las que cierran el saldo derivado', () => {
    // resto = no financieros − cotizaciones − transferencias del Estado debe ser positivo cada año.
    for (const p of d.presupuesto.derechosNoFinancieros.puntos) {
      const cot = valorEn(d.ejecucion.cotizaciones.puntos, p.anio) ?? Number.NaN;
      const transf = valorEn(d.presupuesto.transferenciasEstado.puntos, p.anio) ?? Number.NaN;
      expect(p.valor - cot - transf, `resto de ingresos ${p.anio}`).toBeGreaterThan(0);
    }
  });

  it('el saldo no financiero publicado es derechos menos obligaciones', () => {
    for (const saldo of d.presupuesto.saldoNoFinanciero.puntos) {
      const dr = valorEn(d.presupuesto.derechosNoFinancieros.puntos, saldo.anio) ?? Number.NaN;
      const ob = valorEn(d.presupuesto.obligacionesNoFinancieras.puntos, saldo.anio) ?? Number.NaN;
      expect(saldo.valor).toBeCloseTo(dr - ob, 1);
    }
  });

  it('las cinco clases suman la fila «suma de pensiones» (salvo las pensiones por la DANA, de importe mínimo)', () => {
    for (const p of d.ejecucion.sumaPensiones.puntos) {
      const clases = [
        d.ejecucion.jubilacion,
        d.ejecucion.incapacidad,
        d.ejecucion.viudedad,
        d.ejecucion.orfandad,
        d.ejecucion.favorFamiliares,
      ].reduce((acc, s) => acc + (valorEn(s.puntos, p.anio) ?? 0), 0);
      expect(Math.abs(p.valor - clases), `diferencia en ${p.anio}`).toBeLessThan(2);
    }
  });

  it('el gasto propio sobre el PIB coincide con la serie derivada de data/internacional/contraste-espana', () => {
    const archivo = ArchivoDatos.parse(contraste);
    const publicada = puntosAnuales(
      encontrarSerie(archivo, 'gasto-pensiones-contributivas-sobre-pib'),
    );
    expect(publicada.length).toBeGreaterThan(5);
    for (const p of publicada) {
      const gasto = valorEn(d.ejecucion.sumaPensiones.puntos, p.anio) ?? Number.NaN;
      const pib = valorEn(d.pib.puntos, p.anio) ?? Number.NaN;
      expect((gasto / pib) * 100, `año ${p.anio}`).toBeCloseTo(p.valor, 2);
    }
  });

  it('las definiciones de saldo y las previsiones traen su fuente', () => {
    expect(d.definiciones.length).toBeGreaterThanOrEqual(3);
    expect(d.previsiones.length).toBe(4);
    for (const x of [...d.definiciones, ...d.previsiones]) {
      expect(x.dato.source.url).toMatch(/^https?:\/\//);
      expect(x.dato.fetchedAt).toBeTruthy();
      expect(['alta', 'media', 'baja']).toContain(x.dato.confidence);
    }
  });
});

describe('datos de «Cotizantes y pensionistas»', () => {
  const d = datosCotizantes();

  it('hay afiliados, pensiones y pensionistas en el último año y razones coherentes', () => {
    const ultimo = d.pensiones.puntos.at(-1);
    expect(ultimo?.anio).toBe(d.pensionistas.puntos.at(-1)?.anio);
    const razon =
      (d.afiliados.diciembreTotal.puntos.find((p) => p.anio === ultimo?.anio)?.valor ?? 0) /
      (ultimo?.valor ?? 1);
    const publicada =
      d.relacion.porPensionDiciembre.puntos.find((p) => p.anio === ultimo?.anio)?.valor ?? 0;
    expect(razon).toBeCloseTo(publicada, 2);
  });

  it('el total de pensiones por clase suma el total del sistema', () => {
    for (const p of d.numeroTotal.puntos) {
      const suma = CLASES_PENSION.reduce(
        (acc, c) => acc + (valorEn(d.numeroPorClase[c].puntos, p.anio) ?? 0),
        0,
      );
      // Documentado en docs/DISCREPANCIAS.md: unas pocas pensiones sin clase en 2008.
      expect(Math.abs(suma - p.valor), `diferencia en ${p.anio}`).toBeLessThan(100);
    }
  });

  it('la tabla por edad tiene la foto de un solo mes y todos los grupos de edad', () => {
    expect(d.edad.mes).toMatch(/^\d{4}-\d{2}$/);
    expect(new Set(d.edad.filas.map((f) => f.grupoEdad)).size).toBeGreaterThan(15);
  });

  it('el último año de altas y bajas tiene ambos movimientos para todas las clases', () => {
    const ultimo = Math.max(...d.altasBajas.filas.map((f) => f.anio));
    for (const clase of ['total', ...CLASES_PENSION]) {
      for (const mov of ['alta-inicial', 'baja-definitiva']) {
        expect(
          d.altasBajas.filas.some(
            (f) =>
              f.anio === ultimo &&
              f.clase === clase &&
              f.movimiento === mov &&
              f.sexo === 'ambos' &&
              f.numero !== null,
          ),
          `${clase} ${mov}`,
        ).toBe(true);
      }
    }
  });
});

describe('datos de «Hucha»', () => {
  const d = datosHucha();
  const f = datosFinanciacion();

  it('el valor del Fondo coincide con la columna de la tabla en cada año', () => {
    for (const p of d.valor.puntos) {
      expect(d.flujos.filas.find((x) => x.anio === p.anio)?.valor).toBe(p.valor);
    }
  });

  it('el gasto aproximado queda cerca de las obligaciones reconocidas (diferencia documentada de hasta el 8 %)', () => {
    const aproximado = gastoAproximadoPensiones(
      Object.fromEntries(CLASES_PENSION.map((c) => [c, d.numeroPorClase[c].puntos])) as never,
      Object.fromEntries(CLASES_PENSION.map((c) => [c, d.pensionMediaPorClase[c].puntos])) as never,
    );
    for (const p of f.ejecucion.sumaPensiones.puntos) {
      const aprox = valorEn(aproximado, p.anio);
      expect(aprox, `año ${p.anio}`).toBeDefined();
      expect(Math.abs((aprox ?? 0) / p.valor - 1), `año ${p.anio}`).toBeLessThan(0.08);
    }
  });

  it('el límite de desembolso es creciente en sus primeros años y está en puntos de PIB', () => {
    const l = d.limiteDesembolso.puntos;
    expect(l.length).toBeGreaterThan(10);
    expect(l[1]?.valor ?? 0).toBeGreaterThan(l[0]?.valor ?? 1);
    expect(Math.max(...l.map((p) => p.valor))).toBeLessThan(5);
  });

  it('las normas del Fondo traen fuente, fecha y confianza', () => {
    expect(d.normas.length).toBeGreaterThanOrEqual(3);
    for (const n of d.normas) {
      expect(n.source.url).toMatch(/^https?:\/\//);
      expect(n.fetchedAt).toBeTruthy();
      expect(n.confidence).toBeTruthy();
    }
  });
});
