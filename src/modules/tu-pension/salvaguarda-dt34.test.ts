/**
 * Salvaguarda de la DT 34.ª.1 en el panel de lecturas: la nota «Afecta a tu resultado» sale cuando
 * la lectura cambia la pensión del caso (anticipada voluntaria con la pensión por encima del límite)
 * y no sale cuando no la cambia. El formulario de «Tu pensión» solo ofrece la jubilación ordinaria:
 * se prueba con la entrada del motor, igual que la construye la receta.
 */
import { describe, expect, it } from 'vitest';
import type { EntradaJubilacion } from '../../engine/fachada';
import { ejecutarJubilacion } from '../../engine/comparar-lecturas';
import { afectaSalvaguardaDT34, dosLecturasDT34 } from '../../engine/jubilacion/salvaguarda-dt34';
import { formatearEuros } from '../../engine/formato';
import { calcularTuPension } from './calcular';
import { crearMotorDelRepositorio, leerReferenciaDeRepositorio } from './motor';
import { FRASE_DT34, presentarResultado } from './presentador';
import { FORMULARIO_BASE } from './pruebas';
import { catalogoPorDefecto } from './referencias-datos';
import { efectoPorLectura, filasDelPanel } from './supuestos';

const configuracion = { escenario: { ipc: 0.02 } } as const;
const entradaCon = (baseMensual: number): EntradaJubilacion => ({
  carrera: [{ desde: '1985-01', hasta: '2026-12', baseMensual }],
  nacimiento: '1963-01-01',
  fechaJubilacion: '2027-01-01',
  modalidad: 'anticipada-voluntaria',
  opciones: { aplicarMinimos: false, usarOpcion25Anos: false },
});

function efecto(baseMensual: number) {
  const entrada = entradaCon(baseMensual);
  const base = ejecutarJubilacion(crearMotorDelRepositorio(configuracion), entrada);
  if (!base.ok) throw new Error('el caso no se calcula');
  const efectos = efectoPorLectura(entrada, configuracion, base, crearMotorDelRepositorio);
  return efectos.get('jubilacion.salvaguardaDT34');
}

describe('nota de la lectura salvaguardaDT34', () => {
  it('con la pensión por encima del límite la lectura cambia el resultado y la nota lo dice', () => {
    const e = efecto(20000);
    expect(e?.afecta).toBe(true);
    expect(e?.texto).toMatch(/Sin comparación adicional/);
    expect(e?.texto).toMatch(/pensión mensual sería/);
  });

  it('con la pensión por debajo del límite no cambia nada y la nota lo dice', () => {
    const e = efecto(2000);
    expect(e?.afecta).toBe(false);
    expect(e?.texto).toMatch(/no cambia el resultado/);
  });

  it('el panel muestra la lectura pendiente con sus dos opciones y el valor por defecto', () => {
    const fila = filasDelPanel().find((l) => l.id === 'jubilacion.salvaguardaDT34');
    expect(fila?.estado).toBe('pendiente');
    expect(fila?.valorActual).toBe('A');
    expect(fila?.opciones.map((o) => o.valor)).toEqual(['A', 'B']);
    expect(fila?.opciones.every((o) => o.queCambia.length > 20)).toBe(true);
  });
});

describe('rango de la salvaguarda de la DT 34.ª en el resultado (Ajustes actuariales 4, punto 4)', () => {
  const motor = crearMotorDelRepositorio(configuracion);
  const contexto = {
    sexo: 'hombre',
    aplicarMinimos: false,
    aplicarPensionMaxima: true,
    leerReferencia: leerReferenciaDeRepositorio,
    factorMinimo: 'suelo-1',
  } as const;
  const modelo = (baseMensual: number) => {
    const entrada = entradaCon(baseMensual);
    const r = ejecutarJubilacion(motor, entrada);
    if (!r.ok) throw new Error('el caso no se calcula');
    const dos = afectaSalvaguardaDT34(r.detalle.pasos)
      ? dosLecturasDT34((l) => {
          const x = ejecutarJubilacion(
            crearMotorDelRepositorio({
              ...configuracion,
              lecturas: { 'jubilacion.salvaguardaDT34': l },
            }),
            entrada,
          );
          if (!x.ok) throw new Error('el caso no se calcula');
          return x.detalle;
        })
      : undefined;
    return {
      dos,
      m: presentarResultado(r, { ...contexto, ...(dos ? { dosLecturasDT34: dos } : {}) }),
    };
  };
  const euros = (v: number) => formatearEuros(v, { decimales: 2 });

  it('anticipada voluntaria por encima de la máxima: «entre X (lectura B) y Y (lectura A)» con la frase', () => {
    const { dos, m } = modelo(20000);
    expect(dos).toBeDefined();
    if (!dos) return;
    const mensual = m.cifras.find((c) => c.etiqueta.startsWith('Pensión mensual'));
    expect(mensual?.valor).toBe(
      `entre ${euros(dos.lecturaB)} (lectura B) y ${euros(dos.lecturaA)} (lectura A)`,
    );
    expect(mensual?.detalle).toBe(FRASE_DT34);
    expect(FRASE_DT34).toBe(
      'La norma no precisa con qué pensión máxima se compara; falta un criterio de la entidad gestora.',
    );
    const resultado = m.pasos.find((p) => p.id === 'resultado');
    expect(resultado?.parrafos.join(' ')).toContain(FRASE_DT34);
  });

  it('por debajo de la máxima no cambia nada: una sola cifra, sin la frase', () => {
    const { dos, m } = modelo(2000);
    expect(dos).toBeUndefined();
    const mensual = m.cifras.find((c) => c.etiqueta.startsWith('Pensión mensual'));
    expect(mensual?.valor).not.toMatch(/lectura/);
    expect(JSON.stringify(m)).not.toContain(FRASE_DT34);
  });

  it('el formulario de «Tu pensión» (jubilación ordinaria) no muestra el rango', () => {
    const r = calcularTuPension(FORMULARIO_BASE, {
      fabricaMotor: crearMotorDelRepositorio,
      leerReferencia: leerReferenciaDeRepositorio,
      catalogo: catalogoPorDefecto(),
    });
    expect(r.tipo).toBe('resultado');
    expect(JSON.stringify(r)).not.toContain(FRASE_DT34);
  });
});
