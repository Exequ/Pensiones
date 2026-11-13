import { describe, expect, it } from 'vitest';
import { formatearEuros } from '../../engine/formato';
import { calcularTuPension, type Dependencias } from './calcular';
import { crearMotorDelRepositorio, leerReferenciaDeRepositorio } from './motor';
import { leerOpcion25, leerPeriodoCalculo } from './presentador';
import { catalogoPorDefecto } from './referencias-datos';
import { FORMULARIO_BASE } from './pruebas';
import type { FormularioTuPension } from './tipos';

const deps: Dependencias = {
  fabricaMotor: crearMotorDelRepositorio,
  leerReferencia: leerReferenciaDeRepositorio,
  catalogo: catalogoPorDefecto(),
};

function modeloDe(f: FormularioTuPension) {
  const r = calcularTuPension(f, deps);
  if (r.tipo !== 'resultado') throw new Error(`no es un resultado: ${r.tipo}`);
  return r;
}

const cifra = (m: ReturnType<typeof modeloDe>, etiqueta: string) =>
  m.modelo.cifras.find((c) => c.etiqueta.startsWith(etiqueta))?.valor;

describe('formato de los pasos del motor que lee el presentador', () => {
  it('periodo-calculo y opción de 25 años', () => {
    expect(
      leerPeriodoCalculo({
        id: 'periodo-calculo',
        titulo: '',
        valor: '302 bases de 304 meses ÷ 352.33',
        unidad: 'regla',
        parametros: [],
        articulo: '',
        detalle: '287 meses con base y 17 lagunas en la ventana.',
      }),
    ).toEqual({ nBases: 302, ventana: 304, divisor: 352.33, mesesConBase: 287, lagunas: 17 });
    expect(
      leerOpcion25({
        id: 'x',
        titulo: '',
        valor: 1,
        unidad: '',
        parametros: [],
        articulo: '',
        detalle: '300 meses ÷ 350',
      }),
    ).toEqual({ ventana: 300, divisor: 350 });
  });

  it('el motor real sigue produciendo ese formato', () => {
    const r = calcularTuPension(FORMULARIO_BASE, deps);
    expect(r.tipo).toBe('resultado');
    const pasos = deps.fabricaMotor({}).jubilacion({
      carrera: [{ desde: '1986-11', hasta: '2026-10', baseMensual: 2500 }],
      nacimiento: '1961-11-01',
      fechaJubilacion: '2026-11-01',
      modalidad: 'ordinaria',
    });
    if (!pasos.ok) throw new Error('error');
    const p = pasos.prestaciones[0]!.pasos;
    expect(leerPeriodoCalculo(p.find((x) => x.id === 'periodo-calculo'))).toEqual({
      nBases: 302,
      ventana: 304,
      divisor: 352.33,
      mesesConBase: 304,
      lagunas: 0,
    });
    expect(leerOpcion25(p.find((x) => x.id === 'base-reguladora-opcion-25'))).toBeDefined();
  });
});

describe('presentarResultado', () => {
  it('carrera completa: cifras principales formateadas en es-ES', () => {
    const r = modeloDe(FORMULARIO_BASE);
    expect(r.modelo.cumpleRequisitos).toBe(true);
    expect(r.modelo.estado).toBe('contributiva');
    expect(cifra(r, 'Pensión mensual')).toBe(formatearEuros(2721.39, { decimales: 2 }));
    expect(cifra(r, 'Pensión anual')).toBe(formatearEuros(2721.3917 * 14, { decimales: 2 }));
    expect(cifra(r, 'Tiempo cotizado')).toBe('40 años');
    expect(cifra(r, 'Edad ordinaria')).toBe('65 años');
    expect(cifra(r, 'Porcentaje')).toMatch(/100,00\s%/);
    expect(r.modelo.requisitos.every((q) => q.cumple)).toBe(true);
    expect(r.modelo.pasos.map((p) => p.id)).toEqual([
      'carrera',
      'periodo',
      'actualizacion',
      'lagunas',
      'porcentaje',
      'limites',
      'resultado',
    ]);
  });

  it('los pasos explican la regla general, la opción de 25 años y cuál se aplica', () => {
    const r = modeloDe(FORMULARIO_BASE);
    const periodo = r.modelo.pasos.find((p) => p.id === 'periodo')!.parrafos.join(' ');
    expect(periodo).toMatch(
      /Regla general: se toman las 302 bases de mayor importe de los últimos 304 meses \(se descartan 2\)/,
    );
    expect(periodo).toMatch(/Opción de 25 años: .* 300 meses .* 350/);
    expect(periodo).toMatch(/Se aplica la regla general/);
    const act = r.modelo.pasos.find((p) => p.id === 'actualizacion')!.parrafos.join(' ');
    expect(act).toMatch(/24 meses más recientes/);
    expect(act).toMatch(/mes 25/);
  });

  it('pensión máxima: el estado y el paso de límites lo dicen', () => {
    const r = modeloDe({ ...FORMULARIO_BASE, baseMensual: '9000' });
    expect(r.modelo.estado).toBe('maxima');
    expect(r.modelo.pasos.find((p) => p.id === 'limites')!.parrafos.join(' ')).toMatch(
      /límite máximo/,
    );
  });

  it('complemento a mínimos con base baja', () => {
    const r = modeloDe({ ...FORMULARIO_BASE, baseMensual: '800' });
    expect(r.modelo.estado).toBe('minima');
    expect(r.modelo.pasos.find((p) => p.id === 'limites')!.parrafos.join(' ')).toMatch(
      /complemento a mínimos de/,
    );
  });

  it('sin aplicar mínimos ni máxima lo dice', () => {
    const r = modeloDe({
      ...FORMULARIO_BASE,
      baseMensual: '800',
      aplicarMinimos: false,
      aplicarPensionMaxima: false,
    });
    expect(r.modelo.estado).toBe('contributiva');
    const texto = r.modelo.pasos.find((p) => p.id === 'limites')!.parrafos.join(' ');
    expect(texto).toMatch(/opción desactivada/);
  });

  it('lagunas al final: se cuentan e integran (el mes previo a la jubilación queda fuera de la ventana)', () => {
    const r = modeloDe({ ...FORMULARIO_BASE, mesesSinCotizar: '18', ubicacionLagunas: 'final' });
    const texto = r.modelo.pasos.find((p) => p.id === 'lagunas')!.parrafos.join(' ');
    expect(texto).toMatch(/17 meses sin base/);
    expect(texto).toMatch(/48 meses/);
    expect(texto).toMatch(/100\s%.*50\s%/);
    expect(cifra(r, 'Tiempo cotizado')).toBe('38 años y 6 meses');
  });

  it('mujer con hijos: complemento y nota de integración reforzada', () => {
    const r = modeloDe({
      ...FORMULARIO_BASE,
      sexo: 'mujer',
      hijos: '2',
      mesesSinCotizar: '18',
      ubicacionLagunas: 'final',
    });
    const lim = r.modelo.pasos.find((p) => p.id === 'limites')!.parrafos.join(' ');
    expect(lim).toMatch(/complemento por hijos/);
    expect(r.modelo.pasos.find((p) => p.id === 'lagunas')!.parrafos.join(' ')).toMatch(/reforzada/);
  });

  it('sin requisitos: no hay pensión y se explica qué falla', () => {
    const r = modeloDe({
      ...FORMULARIO_BASE,
      inicioAnio: '2024',
      jubilacionAnio: '2026',
      nacimientoAnio: '1955',
    });
    expect(r.modelo.cumpleRequisitos).toBe(false);
    expect(r.modelo.estado).toBe('no-causa-derecho');
    expect(cifra(r, 'Pensión mensual')).toBeUndefined();
    expect(r.modelo.requisitos.some((q) => !q.cumple)).toBe(true);
    expect(r.modelo.pasos.some((p) => p.id === 'resultado')).toBe(false);
  });

  it('un error de entrada se devuelve como errores de formulario y no como excepción', () => {
    const r = calcularTuPension({ ...FORMULARIO_BASE, baseMensual: '' }, deps);
    expect(r.tipo).toBe('errores-formulario');
  });
});

describe('panel de lecturas', () => {
  it('lista solo las lecturas de la jubilación con estado, motivo y efecto', () => {
    const r = modeloDe(FORMULARIO_BASE);
    expect(r.lecturas.length).toBeGreaterThan(5);
    for (const l of r.lecturas) {
      expect(l.id.startsWith('jubilacion.')).toBe(true);
      expect(['decidida', 'provisional', 'pendiente']).toContain(l.estado);
      expect(l.etiquetaEstado.length).toBeGreaterThan(3);
      if (l.estado === 'pendiente') expect(l.motivo).toBeNull();
      else expect(l.motivo).toBeTruthy();
      expect(l.efecto).toBeTruthy();
    }
  });

  it('indica qué lectura cambia el resultado y cuál no', () => {
    const r = modeloDe({ ...FORMULARIO_BASE, mesesSinCotizar: '18', ubicacionLagunas: 'final' });
    const por = Object.fromEntries(r.lecturas.map((l) => [l.id, l]));
    expect(por['jubilacion.referenciaBaseMinimaLagunas']?.afectaAlResultado).toBe(true);
    expect(por['jubilacion.fraccionDemora']?.afectaAlResultado).toBe(false);
    expect(por['jubilacion.fraccionDemora']?.efecto).toMatch(/no cambia el resultado/);
  });

  it('no cambia ningún valor por defecto de las lecturas', () => {
    const r = modeloDe(FORMULARIO_BASE);
    const por = Object.fromEntries(r.lecturas.map((l) => [l.id, l.valorActual]));
    expect(por['jubilacion.interpolacionIPC']).toBe('mensual-ine');
    expect(por['jubilacion.actualizacionFactorMinimo']).toBe('suelo-1');
  });
});
