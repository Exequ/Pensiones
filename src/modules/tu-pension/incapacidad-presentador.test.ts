import { describe, expect, it } from 'vitest';
import { calcularTuPension, type Dependencias } from './calcular';
import {
  leerBasesIncapacidad,
  leerEdadFiccion,
  leerMesesComputados,
  leerPeriodoElegido,
} from './incapacidad-presentador';
import { crearMotorDelRepositorio, leerReferenciaDeRepositorio } from './motor';
import { FORMULARIO_INCAPACIDAD as F } from './pruebas';
import { catalogoPorDefecto } from './referencias-datos';
import type { FormularioTuPension } from './tipos';

const deps: Dependencias = {
  fabricaMotor: crearMotorDelRepositorio,
  leerReferencia: leerReferenciaDeRepositorio,
  catalogo: catalogoPorDefecto(),
};

function resultado(f: FormularioTuPension) {
  const r = calcularTuPension(f, deps);
  if (r.tipo !== 'resultado') throw new Error(`no es un resultado: ${r.tipo}`);
  return r;
}
const cifra = (r: ReturnType<typeof resultado>, etiqueta: string) =>
  r.modelo.cifras.find((c) => c.etiqueta.startsWith(etiqueta))?.valor;

describe('formato de los pasos del motor que lee el presentador de incapacidad', () => {
  const base = { id: 'x', titulo: '', valor: 0, unidad: '', parametros: [], articulo: '' };
  it('bases, periodo elegido, edad y meses computados', () => {
    expect(
      leerBasesIncapacidad({ ...base, detalle: '96 bases entre 112.0000; 3 lagunas integradas.' }),
    ).toEqual({ bases: 96, divisor: 112, lagunas: 3 });
    expect(
      leerPeriodoElegido({
        ...base,
        detalle: 'Suma 48000.00 euros; 2 meses sin cotización en el periodo elegido.',
      }),
    ).toEqual({ suma: 48000, lagunas: 2 });
    expect(
      leerEdadFiccion({
        ...base,
        detalle: 'Edad ordinaria tomada: 802 meses (carrera-proyectada); cómputo: meses.',
      }),
    ).toBe(802);
    expect(leerMesesComputados({ ...base, detalle: '418 meses computados.' })).toBe(418);
    expect(leerBasesIncapacidad({ ...base, detalle: 'otro formato' })).toBeUndefined();
  });
});

describe('resultado de la incapacidad permanente', () => {
  it('total por enfermedad común: cifras, pasos y sin gráfico de bases', () => {
    const r = resultado(F);
    expect(r.prestacion).toBe('incapacidad');
    expect(r.bases).toBeUndefined();
    expect(r.modelo.cumpleRequisitos).toBe(true);
    expect(cifra(r, 'Pensión mensual bruta')).toMatch(/€$/);
    expect(cifra(r, 'Base reguladora')).toMatch(/al mes$/);
    expect(cifra(r, 'Porcentaje aplicable según el grado')).toMatch(/%$/);
    expect(cifra(r, 'Periodo mínimo de cotización exigido')).toBeDefined();
    expect(cifra(r, 'Meses añadidos hasta la edad ordinaria')).toBeDefined();
    expect(r.modelo.momentoNormativa).toBe('del hecho causante');
    expect(r.modelo.tituloRequisitos).toMatch(/grado total, enfermedad común/);
    const ids = r.modelo.pasos.map((p) => p.id);
    expect(ids).toEqual(['carrera', 'requisitos', 'base', 'grado', 'limites', 'resultado']);
    // Los pasos llevan las cifras reales del motor.
    const base = r.modelo.pasos.find((p) => p.id === 'base')!;
    expect(base.parrafos.join(' ')).toMatch(/\d/);
    expect(base.parrafos.join(' ')).toMatch(/lectura abierta/);
  });

  it('gran incapacidad: muestra el complemento como cifra y como paso', () => {
    const r = resultado({ ...F, grado: 'gran-incapacidad' });
    expect(cifra(r, 'Complemento de gran incapacidad')).toMatch(/al mes$/);
    expect(r.modelo.pasos.find((p) => p.id === 'limites')!.parrafos.join(' ')).toMatch(
      /complemento de gran incapacidad/,
    );
  });

  it('parcial: cantidad a tanto alzado en vez de pensión', () => {
    const r = resultado({ ...F, grado: 'parcial' });
    expect(cifra(r, 'Cantidad a tanto alzado')).toMatch(/€$/);
    expect(cifra(r, 'Pensión mensual')).toBeUndefined();
    expect(r.modelo.pasos.map((p) => p.id)).toEqual(['carrera', 'requisitos', 'parcial']);
  });

  it('trabajar suspende el pago de la absoluta y lo cuenta', () => {
    const r = resultado({ ...F, grado: 'absoluta', trabaja: true });
    expect(cifra(r, 'Importe en suspenso')).toBeDefined();
    expect(r.modelo.pasos.some((p) => p.id === 'trabajo')).toBe(true);
  });

  it('sin alta y con otro grado que absoluta o gran incapacidad no causa derecho', () => {
    const r = resultado({ ...F, enAlta: false });
    expect(r.modelo.cumpleRequisitos).toBe(false);
    expect(r.modelo.estado).toBe('no-causa-derecho');
    expect(r.modelo.requisitos.some((q) => !q.cumple)).toBe(true);
    expect(r.modelo.pasos.map((p) => p.id)).toEqual(['carrera', 'requisitos']);
  });

  it('el accidente no laboral explica el periodo elegido y la lectura de las lagunas', () => {
    const r = resultado({
      ...F,
      origen: 'accidente-no-laboral',
      mesesSinCotizar: '70',
      ubicacionLagunas: 'final',
    });
    const base = r.modelo.pasos.find((p) => p.id === 'base')!;
    expect(base.parrafos.join(' ')).toMatch(/periodo ininterrumpido/);
    expect(base.parrafos.join(' ')).toMatch(/lectura abierta/);
  });

  it('los textos de los pasos no contienen más cifras que las que salen del motor y de /data', () => {
    const r = resultado(F);
    // Todo dígito de un paso procede de una cifra formateada: no hay números escritos a mano en
    // los textos fijos (comprobado también por el test de textos).
    for (const p of r.modelo.pasos) expect(p.titulo).not.toMatch(/\d/);
  });

  it('un hecho causante anterior a la cobertura del motor se traduce a un mensaje claro', () => {
    const r = calcularTuPension({ ...F, jubilacionAnio: '2019', nacimientoAnio: '1970' }, deps);
    expect(r.tipo).toBe('error-motor');
    if (r.tipo === 'error-motor') {
      expect(r.prestacion).toBe('incapacidad');
      expect(r.error.codigo).toBe('NoImplementada');
      expect(r.error.accion).toMatch(/hecho causante/);
    }
  });

  it('con el hecho causante antes del nacimiento, la validación del formulario lo detecta', () => {
    const r = calcularTuPension({ ...F, jubilacionAnio: '1975' }, deps);
    expect(r.tipo).toBe('errores-formulario');
  });
});

describe('lecturas de la incapacidad', () => {
  it('ofrece las seis lecturas de incapacidad con estado y motivo, y no las de jubilación', () => {
    const r = resultado(F);
    expect(r.lecturas.map((l) => l.id)).toEqual([
      'incapacidad.edadFiccion',
      'incapacidad.computoFiccion',
      'incapacidad.divisorPeriodoCorto',
      'incapacidad.lagunasAccidenteNoLaboral',
      'incapacidad.redondeoEdadCarencia',
      'incapacidad.diasCotizadosParcial',
    ]);
    for (const l of r.lecturas) expect(l.opciones.length).toBeGreaterThanOrEqual(2);
    const anl = r.lecturas.find((l) => l.id === 'incapacidad.lagunasAccidenteNoLaboral')!;
    // Decisión de Sergio del 14-11-2026: vuelve a «sin-integrar» y queda pendiente, con su motivo.
    expect(anl.estado).toBe('pendiente');
    expect(anl.valorPorDefecto).toBe('sin-integrar');
    expect(anl.motivo).toBeTruthy();
  });

  describe.each(['sin-integrar', 'integrar'] as const)(
    'lagunas del accidente no laboral con la lectura «%s» puesta explícitamente',
    (valor) => {
      const f: FormularioTuPension = {
        ...F,
        origen: 'accidente-no-laboral',
        mesesSinCotizar: '70',
        ubicacionLagunas: 'final',
      };
      const elegido = resultado({
        ...f,
        lecturas: { 'incapacidad.lagunasAccidenteNoLaboral': valor },
      });
      const defecto = resultado(f);

      it('solo se compara con los valores por defecto si la lectura elegida difiere de «sin-integrar»', () => {
        if (valor === 'sin-integrar') {
          // Es el valor por defecto: el resultado es el mismo y no hay comparación.
          expect(elegido.comparacion.tipo).toBe('sin-cambios');
          expect(elegido.modelo).toEqual(defecto.modelo);
        } else {
          expect(elegido.comparacion.tipo).toBe('comparado');
          if (elegido.comparacion.tipo === 'comparado') {
            expect(Math.abs(elegido.comparacion.diferencia.pension.euros)).toBeGreaterThan(0.005);
          }
        }
      });

      it('el efecto de la alternativa se mide frente a la elegida y nombra la otra opción', () => {
        const anl = elegido.lecturas.find((l) => l.id === 'incapacidad.lagunasAccidenteNoLaboral')!;
        expect(anl.afectaAlResultado).toBe(true);
        expect(anl.efecto).toMatch(
          valor === 'sin-integrar' ? /Rellenarlos con la base mínima/ : /Contarlos como cero/,
        );
      });
    },
  );
});
