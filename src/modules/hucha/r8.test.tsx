/**
 * Fase R8: «La hucha» con las citas, los artículos y los rótulos de la fuente solo en «Fuentes», las
 * definiciones del módulo, las fórmulas de los cálculos propios coherentes con los datos y los
 * criterios actuariales del 19-11-2026 comprobados contra los datos y la norma del repositorio.
 */
import { render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { definicionPorId } from '../../contenido/definiciones';
import { anclaDefinicion } from '../../engine/definiciones';
import type { ExprFormula } from '../../engine/esquema-datos';
import { filasCsv, type PuntoAnual } from '../../engine/series-historicas';
import { mesesDeGasto } from '../../engine/sistema-historico';
import { suma } from '../../engine/series-historicas';
import { apoyoFinancieroDelEstado, mesesDeFlujo, posicionNeta } from '../../engine/transferencias';
import { abrirFuente, cerrarFuente, leerFuentes } from '../../test/fuentes';
import normaTxt from '../../../data-raw/boe/trlgss-2015-consolidado.txt?raw';
import desembolsoJson from '../../../data/parametros/fondo-reserva-desembolso-maximo.json';
import meiDestinoJson from '../../../data/parametros/mei-destino.json';
import plazoAmpliadoJson from '../../../data/parametros/prestamos-plazo-ampliado-2026.json';
import ejecucionCsv from '../../../data/sistema/presupuesto-ss-ejecucion.csv?raw';
import fondoCsv from '../../../data/sistema/fondo-reserva-anual.csv?raw';
import fondoTablaJson from '../../../data/sistema/fondo-reserva-anual.json';
import anexoCsv from '../../../data/sistema/tribunal-cuentas-cge2023-prestamos.csv?raw';
import { datosHucha } from '../historico/datos-hucha';
import Hucha from './Pagina';
import { DEFINICIONES_DE_ESTA_PAGINA, fuentesDefinicionHucha } from './fuentes-hucha';
import { ROTULO_FUENTE } from './ids-datos';
import { PARAFRASIS_LITERALES, literalesDe, reglaSinLiterales } from './normas';

/** Texto de la norma descargada, con los espacios (también los de no separación) normalizados. */
const norma = (): string => normaTxt.replace(/[\s\u00a0]+/g, ' ');

const pintar = () =>
  render(
    <MemoryRouter>
      <Hucha />
    </MemoryRouter>,
  );

/** Normaliza espacios para comparar texto de la página con frases del test. */
const plano = (t: string): string => t.replace(/\s+/g, ' ');

/** Artículo, norma abreviada, anexo, hoja o fichero: lo que no debe verse en el cuerpo. */
const CITA_VISIBLE =
  /\barts?\.\s*\d|artículos?\s+\d|\bDT\s*\d|\bD\.?A\.\s*\d|\bDA\s*\d|TRLGSS|\bRDL?\s*\d|Anexo\s*\d|\.xlsx|\.json|\.csv|Org\.\s*Aut|«Del Estado|«De Organismos|«suma de pensiones|MECANISMO DE EQUIDAD/;

const IDS_NUEVAS = DEFINICIONES_DE_ESTA_PAGINA;

/** Todas las citas literales de los datos que la página maneja (las que no pueden verse en el cuerpo). */
function citasDeLaPagina(): string[] {
  const d = datosHucha();
  const citas: string[] = [
    ...Object.values(d.trlgss).map((x) => x.cita),
    ...Object.values(d.tribunal).map((x) => x.cita),
    ...Object.values(d.tribunal2023).map((x) => x.cita),
    ...Object.values(d.prestamosLeyes).map((x) => x.cita),
    ...Object.values(d.prestamosPlazo).map((x) => x.cita),
    d.limiteDesembolso.dato.quote ?? '',
    d.destinoMei.dato.quote ?? '',
    ...Object.values(ROTULO_FUENTE),
    ...d.normas.flatMap((n) =>
      n.cambios.flatMap((c) => (c.parametro === 'fondo-reserva' ? literalesDe(c.despues) : [])),
    ),
  ];
  return citas.filter((c) => c.length > 14);
}

describe('citas, artículos y rótulos de la fuente fuera del cuerpo', () => {
  it('ningún artículo, norma abreviada, anexo ni rótulo de la fuente en el cuerpo (desplegables cerrados)', () => {
    const { container } = pintar();
    expect(container.querySelectorAll('dialog')).toHaveLength(0);
    expect(container.textContent).not.toMatch(CITA_VISIBLE);
  });

  it('ninguna cita literal de los datos aparece en el cuerpo ni en las tablas', () => {
    const { container } = pintar();
    const cuerpo = plano(container.textContent);
    const citas = citasDeLaPagina();
    expect(citas.length).toBeGreaterThan(20);
    for (const c of citas) expect(cuerpo, c).not.toContain(plano(c));
    // Tampoco las notas de los datos del límite y del destino del MEI, que llevan artículos.
    const d = datosHucha();
    expect(cuerpo).not.toContain(plano(d.limiteDesembolso.nota));
    expect(cuerpo).not.toContain(plano(d.destinoMei.nota));
  });

  it('los fragmentos literales de las normas tienen paráfrasis y la regla del cuerpo no los repite', () => {
    const d = datosHucha();
    const literales = d.normas.flatMap((n) =>
      n.cambios.flatMap((c) => (c.parametro === 'fondo-reserva' ? literalesDe(c.despues) : [])),
    );
    expect(literales.length).toBeGreaterThan(0);
    for (const l of literales) expect(Object.keys(PARAFRASIS_LITERALES)).toContain(l);
    const r = reglaSinLiterales('Excedentes destinados «prioritaria y mayoritariamente» al Fondo.');
    expect(r.texto).toBe(
      'Excedentes destinados con carácter prioritario y en su mayor parte al Fondo.',
    );
    expect(r.literales).toEqual(['prioritaria y mayoritariamente']);
    expect(() => reglaSinLiterales('Un texto con «otra frase» literal')).toThrow(/Sin paráfrasis/);
  });

  it('los artículos y los literales de las normas, las reglas y el anexo están en «Fuentes»', () => {
    const { container } = pintar();
    const d = datosHucha();
    // Tabla de normas: la ubicación (artículos) y el literal de la ley.
    const tabla = [...container.querySelectorAll('table')].find((t) =>
      /Normas que regulan el Fondo de Reserva/.test(t.querySelector('caption')?.textContent ?? ''),
    );
    expect(tabla?.textContent).not.toMatch(/Artículos?\b/);
    const bloque = tabla?.closest('.hist-definiciones');
    const fuentes = leerFuentes(bloque ?? null).texto;
    const articulos = d.normas
      .flatMap((n) => n.cambios.filter((c) => c.parametro === 'fondo-reserva'))
      .map((c) => c.articulos);
    expect(articulos.length).toBeGreaterThan(0);
    for (const a of articulos) expect(fuentes, a).toContain(a);
    expect(fuentes).toContain('prioritaria y mayoritariamente');
    // Anexo de préstamos: la ubicación «Anexo 10» y los artículos de cada línea.
    const anexo = [...container.querySelectorAll('table')].find((t) =>
      /Préstamos otorgados por el Estado/.test(t.querySelector('caption')?.textContent ?? ''),
    );
    expect(anexo?.textContent).not.toMatch(/artículo|D\.A\./);
    const fuentesAnexo = leerFuentes(anexo?.closest('.hist-definiciones') ?? null).texto;
    expect(fuentesAnexo).toContain(d.anexoPrestamos.nombre);
    expect(fuentesAnexo).toMatch(/artículo 11\.4/);
    expect(fuentesAnexo).toMatch(/D\.A\. 9ª/);
    // Anotaciones de la deuda: la recomendación del Tribunal, con su literal.
    const anotaciones = [...container.querySelectorAll('table')].find((t) =>
      /Anotaciones de la serie de deuda/.test(t.querySelector('caption')?.textContent ?? ''),
    );
    const literalTribunal = d.tribunal['recomendacion-amortizacion-insalud']?.cita ?? '—';
    expect(leerFuentes(anotaciones?.closest('.hist-definiciones') ?? null).texto).toContain(
      literalTribunal,
    );
  });

  it('«Fuentes» de las transferencias muestra los rótulos literales de la liquidación y de la ejecución', () => {
    const { container } = pintar();
    const figura = [...container.querySelectorAll('figure.grafico')].find(
      (f) =>
        /por año/.test(f.querySelector('.grafico-titulo')?.textContent ?? '') &&
        /Transferencias corrientes del Estado y organismos autónomos a la Seguridad Social/.test(
          f.querySelector('.grafico-titulo')?.textContent ?? '',
        ),
    );
    const texto = leerFuentes(figura ?? null).texto;
    expect(texto).toContain(ROTULO_FUENTE.transferenciasLiquidacion);
    expect(texto).toContain(ROTULO_FUENTE.transferenciasEjecucion);
  });
});

describe('definiciones del módulo en la página', () => {
  it('cada definición nueva y la de derechos reconocidos están una vez, con su ancla, término y texto', () => {
    const { container } = pintar();
    for (const id of [
      ...IDS_NUEVAS,
      'derechos-reconocidos-netos',
      'gasto-pensiones-contributivas-con-complemento',
    ]) {
      const bloques = container.querySelectorAll(`#${anclaDefinicion(id)}`);
      expect(bloques, id).toHaveLength(1);
      const def = definicionPorId(id);
      expect(bloques[0]?.querySelector('dfn')?.textContent).toBe(def.termino);
      for (const p of def.texto) expect(bloques[0]?.textContent).toContain(p);
    }
  });

  it('el desplegable de cada definición nueva se abre y muestra su fuente', () => {
    const { container } = pintar();
    for (const id of IDS_NUEVAS) {
      const bloque = container.querySelector(`#${anclaDefinicion(id)}`);
      const boton = within(bloque as HTMLElement).getByRole('button', {
        name: new RegExp(
          `Fuentes?: Definición: ${definicionPorId(id).termino.replace(/[()]/g, '.')}`,
        ),
      });
      const linea = abrirFuente(boton.closest('.linea-fuente'));
      expect(linea.textContent, id).toMatch(/Organismo/);
      cerrarFuente(linea);
    }
  });

  it('las reglas de dotación y de disposición muestran su literal y su ubicación en «Fuentes»', () => {
    const { container } = pintar();
    const d = datosHucha();
    const dotacion = container.querySelector(`#${anclaDefinicion('fondo-de-reserva')}`);
    const textoDotacion = leerFuentes(dotacion).texto;
    expect(textoDotacion).toContain(d.destinoMei.dato.quote ?? '—');
    expect(textoDotacion).toContain(d.destinoMei.dato.location ?? '—');
    const disposicion = container.querySelector(
      `#${anclaDefinicion('fondo-de-reserva-limite-de-desembolso')}`,
    );
    const textoDisposicion = leerFuentes(disposicion).texto;
    expect(textoDisposicion).toContain(d.limiteDesembolso.dato.quote ?? '—');
    expect(textoDisposicion).toContain(d.limiteDesembolso.dato.location ?? '—');
    // Ni el literal ni el artículo están en el cuerpo de esas definiciones.
    expect(dotacion?.textContent).not.toContain(d.destinoMei.dato.quote ?? '—');
  });

  it('el gasto contributivo con complemento sustituye al párrafo propio y su fuente nombra las dos filas', () => {
    const { container } = pintar();
    expect(container.textContent).not.toContain('SUMA DE PENSIONES');
    const bloque = container.querySelector(
      `#${anclaDefinicion('gasto-pensiones-contributivas-con-complemento')}`,
    );
    const texto = leerFuentes(bloque).texto;
    expect(texto).toContain('SUMA DE PENSIONES');
    expect(texto).toContain('COMPL. A MÍNIMOS PENSIONES CONTRIBUTIVAS');
  });

  it('cada referencia de las definiciones nuevas tiene su fuente en la página', () => {
    for (const id of IDS_NUEVAS) {
      for (const ref of definicionPorId(id).datos)
        expect(fuentesDefinicionHucha(ref, id), `${id} → ${ref}`).toBeDefined();
    }
  });

  it('«derechos reconocidos» se define una vez y la frase del «nacer el derecho de cobro» no está', () => {
    const { container } = pintar();
    expect(container.textContent).not.toMatch(/nacer el derecho de cobro/);
    expect(
      container.querySelectorAll(`#${anclaDefinicion('derechos-reconocidos-netos')}`),
    ).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Criterios actuariales del 19-11-2026 (tanda B) contra los datos y la norma
// ---------------------------------------------------------------------------

const filasFondo = () => filasCsv(fondoCsv);
const num = (v: string | undefined) => Number(v);

describe('criterio 1: no existe un «Fondo MEI» separado', () => {
  it('ningún texto de la página ni de las definiciones lo nombra como entidad separada', () => {
    const { container } = pintar();
    expect(container.textContent).not.toMatch(/\bFondo(?: del)? MEI\b/i);
    for (const id of IDS_NUEVAS) {
      for (const t of definicionPorId(id).texto) expect(t).not.toMatch(/\bFondo(?: del)? MEI\b/i);
    }
    expect(plano(definicionPorId('fondo-de-reserva').texto.join(' '))).toMatch(
      /Es uno solo: no existe un fondo separado/,
    );
  });

  it('los datos tienen un único valor del Fondo y el MEI solo es una columna de dotaciones', () => {
    const ids = fondoTablaJson.columnas.map((c) => c.id);
    expect(ids.filter((i) => i.startsWith('valor_'))).toEqual(['valor_fondo_meur']);
    for (const i of ids.filter((x) => x.includes('mei'))) expect(i).toMatch(/^dotaciones_mei/);
    const mei = meiDestinoJson.data.find((x) => x.id === 'destino-fondo-reserva');
    expect(mei?.quote).toMatch(/nutrirá el Fondo de Reserva de la Seguridad Social/);
    // La norma descargada: la cotización finalista se ingresa en el Fondo de Reserva (art. 118.4).
    expect(norma()).toMatch(
      /cotización finalista fijada en el artículo 127 bis\. 1 se ingresarán en el Fondo de Reserva/,
    );
  });
});

describe('criterio 2: «desde» el primer año con límite son desembolsos anuales con tope', () => {
  const limites = desembolsoJson.data;
  const primer = Number(limites[0]?.id);

  it('el primer año con límite de los datos es el que dice la norma («desde …, el desembolso anual»)', () => {
    const texto = norma();
    const m = /desde (\d{4}), el desembolso anual a efectuar por el Fondo de Reserva/.exec(texto);
    expect(Number(m?.[1])).toBe(primer);
    expect(texto).toMatch(/con el límite máximo que se establece seguidamente/);
    expect(texto).toMatch(
      /con carácter exclusivo a la financiación de las pensiones de carácter contributivo/,
    );
    for (const l of limites) expect(l.value).toBeGreaterThan(0);
  });

  it('el texto de la página da el primer año de los datos y la definición no habla de agotamiento ni de uso libre', () => {
    const { container } = pintar();
    const texto = plano(container.textContent);
    expect(texto).toContain(`en ${String(primer)} y llega al`);
    const def = plano(definicionPorId('fondo-de-reserva-limite-de-desembolso').texto.join(' '));
    expect(def).toMatch(
      /no es el año en que el Fondo se quede sin recursos ni un año a partir del cual pueda usarse sin límite/,
    );
    expect(def).toMatch(/El límite es un tope y no una previsión de uso/);
  });

  it('las disposiciones anteriores a ese año salen de la serie del Fondo', () => {
    const { container } = pintar();
    const anios = filasFondo()
      .filter((f) => num(f['disposiciones_anuales_meur']) < 0)
      .map((f) => num(f['anio']));
    expect(anios.length).toBeGreaterThan(0);
    for (const a of anios) expect(a).toBeLessThan(primer);
    expect(plano(container.textContent)).toContain(
      `registran disposiciones entre ${String(Math.min(...anios))} y ${String(Math.max(...anios))}, antes del primer año con límite`,
    );
  });
});

describe('criterio 3: tres componentes de dotación', () => {
  const filas = filasFondo();
  const acum = (campo: string) => filas.map((f) => ({ anio: num(f['anio']), v: num(f[campo]) }));
  const entidades = acum('dotaciones_excedentes_entidades_acum_meur');
  const mutuas = acum('dotaciones_excedentes_mutuas_acum_meur');
  const mei = acum('dotaciones_mei_acum_meur');
  const variacion = (s: { anio: number; v: number }[]) =>
    s.slice(1).map((p, i) => ({ anio: p.anio, dv: p.v - (s[i]?.v ?? 0) }));

  it('la dotación acumulada es la suma de los tres componentes en todos los años', () => {
    for (const f of filas) {
      const total = num(f['dotaciones_acumuladas_meur']);
      const partes =
        num(f['dotaciones_excedentes_entidades_acum_meur']) +
        num(f['dotaciones_excedentes_mutuas_acum_meur']) +
        num(f['dotaciones_mei_acum_meur']);
      expect(Math.abs(partes - total), f['anio']).toBeLessThanOrEqual(1);
    }
  });

  it('la norma descargada declara esos tres componentes (excedentes, mutuas y cotización finalista)', () => {
    const texto = norma();
    const i = texto.indexOf('Artículo 118. Dotación del Fondo.');
    const art = texto.slice(i, i + 2400);
    expect(art).toMatch(
      /excedentes de ingresos que financian las prestaciones de carácter contributivo/,
    );
    expect(art).toMatch(/mutuas colaboradoras con la Seguridad Social/);
    expect(art).toMatch(/cotización finalista/);
  });

  it('los años de la página son los de los datos: entidades hasta un año, MEI desde otro, mutuas no todos los años', () => {
    const { container } = pintar();
    const ultimoEntidades = Math.max(
      ...variacion(entidades)
        .filter((p) => p.dv > 0)
        .map((p) => p.anio),
    );
    const primerMei = Math.min(
      ...variacion(mei)
        .filter((p) => p.dv > 0)
        .map((p) => p.anio),
    );
    const sinMutuas = variacion(mutuas)
      .filter((p) => p.dv <= 0)
      .map((p) => p.anio);
    const conMutuas = variacion(mutuas)
      .filter((p) => p.dv > 0)
      .map((p) => p.anio);
    // Criterio: «mutuas cada año». Los datos lo contradicen: hay años consecutivos sin aportación.
    const huecos = sinMutuas.filter(
      (a) => a > Math.min(...conMutuas) && a < Math.max(...conMutuas),
    );
    expect(huecos.length).toBeGreaterThan(0);
    const texto = plano(container.textContent);
    expect(texto).toContain(`dotan el Fondo hasta ${String(ultimoEntidades)}`);
    expect(texto).toContain(`lo dota desde ${String(primerMei)}`);
    expect(texto).toContain(
      `no hay ninguna entre ${String(Math.min(...huecos))} y ${String(Math.max(...huecos))}`,
    );
    expect(texto).toContain('no se producen todos los años');
  });

  it('la definición del Fondo declara los tres componentes y los rendimientos aparte, sin cifras', () => {
    const d = definicionPorId('fondo-de-reserva');
    const t = plano(d.texto.join(' '));
    expect(t).toMatch(/entidades gestoras y servicios comunes/);
    expect(t).toMatch(/mutuas colaboradoras/);
    expect(t).toMatch(/cotización finalista del Mecanismo de Equidad Intergeneracional/);
    expect(t).toMatch(/rendimientos de las inversiones/);
    expect(t).not.toMatch(/\d/);
  });
});

describe('criterio 4: préstamos recientes aún sin vencer y antiguos sin devolver', () => {
  const lineas = filasCsv(anexoCsv).filter((f) => f['tipo_linea'] === 'prestamo');
  const recientes = lineas.filter((f) => f['anio_concesion'] !== '');
  const antiguos = lineas.filter((f) => f['anio_concesion'] === '');
  const hasta = (v: string | undefined) => {
    const m = /(\d+) años (?:a )?partir de (\d{4})/.exec(v ?? '');
    return m === null ? null : Number(m[2]) + Number(m[1]) - 1;
  };

  it('a fin del año de la declaración, ninguno de los de 2017 a 2023 había agotado su plazo máximo', () => {
    const { container } = pintar();
    const d = datosHucha();
    const anioDeclaracion = Number(d.tribunal2023['deuda-ss-con-estado-2023']?.periodo);
    const fines = recientes.map((f) => hasta(f['vencimiento']) ?? Number.NaN);
    expect(fines.every((x) => x > anioDeclaracion)).toBe(true);
    const anios = recientes.map((f) => num(f['anio_concesion']));
    expect(plano(container.textContent)).toContain(
      `ninguno de los préstamos concedidos entre ${String(Math.min(...anios))} y ${String(Math.max(...anios))} había llegado al fin de su plazo máximo: el del primero de ellos termina en ${String(Math.min(...fines))}`,
    );
    // Las leyes de presupuestos: plazo máximo contado desde el 1 de enero del año siguiente.
    for (const id of ['2021', '2022', '2023'])
      expect(d.prestamosLeyes[`${id}-plazo-maximo-anios`]?.cita).toMatch(
        /plazo máximo de diez años contados a partir del 1 de enero del año siguiente al de su concesión/,
      );
  });

  it('el plazo ampliado de 2026 es de los préstamos antiguos, no de los de 2017 a 2023', () => {
    const importes = plazoAmpliadoJson.data.filter((x) => x.id.endsWith('-importe'));
    expect(importes.length).toBeGreaterThan(0);
    const importesAntiguos = new Set(antiguos.map((f) => num(f['importe'])));
    const importesRecientes = new Set(recientes.map((f) => num(f['importe'])));
    for (const i of importes) {
      const meur = Math.round((i.value / 1_000_000) * 10) / 10;
      expect(importesAntiguos.has(meur), i.id).toBe(true);
      expect(importesRecientes.has(meur), i.id).toBe(false);
    }
  });

  it('según el Tribunal, los antiguos no se han devuelto (los sin plazo, sin reintegrar; los demás, prorrogados)', () => {
    const d = datosHucha();
    expect(d.tribunal['prestamos-sin-devolver-y-prorrogados']?.cita).toMatch(
      /no han sido devueltos/,
    );
    const t = plano(definicionPorId('prestamos-del-estado-a-la-seguridad-social').texto.join(' '));
    expect(t).toMatch(
      /Los préstamos más antiguos no se han devuelto, según el Tribunal de Cuentas/,
    );
    expect(antiguos.some((f) => f['vencimiento'] === 'No se indica')).toBe(true);
    expect(antiguos.some((f) => hasta(f['vencimiento']) !== null)).toBe(true);
  });

  it('la ejecución no publica la recaudación del MEI (columna vacía en todas sus filas)', () => {
    const filas = filasCsv(ejecucionCsv).filter(
      (f) => f['concepto'] === ROTULO_FUENTE.meiEjecucion,
    );
    expect(filas.length).toBeGreaterThan(0);
    for (const f of filas) expect(f['recaudacion_o_pagos_meur'], f['periodo']).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Coherencia de las fórmulas con los datos
// ---------------------------------------------------------------------------

type Serie = ReadonlyMap<number, number>;
interface Entorno {
  readonly escalares: Record<string, number>;
  readonly series: Record<string, Serie>;
}

/** Evalúa una expresión de símbolos (suma, resta, cociente y sumatorio con símbolos). */
function evaluar(e: ExprFormula, env: Entorno): number {
  switch (e.tipo) {
    case 'simbolo': {
      if (e.subindice !== undefined) {
        const s = env.series[e.id];
        const indice = evaluar(e.subindice, env);
        const v = s?.get(indice);
        if (v === undefined) throw new Error(`Sin valor para ${e.id}[${String(indice)}]`);
        return v;
      }
      const v = env.escalares[e.id];
      if (v === undefined) throw new Error(`Sin valor para ${e.id}`);
      return v;
    }
    case 'suma':
      return e.terminos.reduce((a, t) => a + evaluar(t, env), 0);
    case 'resta':
      return evaluar(e.minuendo, env) - evaluar(e.sustraendo, env);
    case 'cociente':
      return evaluar(e.numerador, env) / evaluar(e.denominador, env);
    case 'sumatorio': {
      if (e.desde === undefined) throw new Error('Sumatorio sin inicio');
      const desde = evaluar(e.desde, env);
      const hasta = evaluar(e.hasta, env);
      let total = 0;
      for (let i = desde; i <= hasta; i++)
        total += evaluar(e.cuerpo, {
          ...env,
          escalares: { ...env.escalares, [e.variable]: i },
        });
      return total;
    }
    default:
      throw new Error(`Nodo no previsto en estas fórmulas: ${e.tipo}`);
  }
}

/** Aplica las ecuaciones de una definición en orden (cada una puede usar el resultado de la anterior). */
function resolver(id: string, env: Entorno, resultado: string): number {
  const f = definicionPorId(id).formula;
  if (f === undefined) throw new Error(`${id} sin fórmula`);
  const escalares = { ...env.escalares };
  // Las ecuaciones intermedias se evalúan primero (las que no son el resultado).
  for (const ec of [...f.ecuaciones].reverse()) {
    if (ec.izquierda.tipo !== 'simbolo') continue;
    escalares[ec.izquierda.id] = evaluar(ec.derecha, { ...env, escalares });
  }
  const v = escalares[resultado];
  if (v === undefined) throw new Error(`${id}: sin resultado ${resultado}`);
  return v;
}

const porAnio = (p: readonly PuntoAnual[]): Serie => new Map(p.map((x) => [x.anio, x.valor]));

describe('fórmulas de los cálculos propios coherentes con los datos', () => {
  const d = datosHucha();

  it('Fondo menos deuda = Fondo − deuda (lo que dibuja la lectura)', () => {
    const filas = posicionNeta(d.valor.puntos, d.deuda.finAno.puntos);
    expect(filas.length).toBeGreaterThan(10);
    for (const f of filas) {
      const v = resolver(
        'fondo-menos-deuda',
        { escalares: { f: f.fondo, d: f.deuda }, series: {} },
        'p',
      );
      expect(v, String(f.anio)).toBe(f.neta);
    }
  });

  it('deuda más transferencias acumuladas = deuda + suma de las transferencias desde el año de inicio', () => {
    const anuales = d.transferenciasAnuales.puntos;
    const serie = porAnio(anuales);
    for (const inicio of [anuales[0]?.anio ?? 0, anuales.at(-3)?.anio ?? 0]) {
      const filas = apoyoFinancieroDelEstado(
        { deuda: d.deuda.finAno.puntos, transferenciasAnuales: anuales },
        inicio,
      );
      expect(filas.length).toBeGreaterThan(1);
      for (const f of filas) {
        const v = resolver(
          'deuda-mas-transferencias-acumuladas',
          { escalares: { d: f.deuda, a: inicio, t: f.anio }, series: { tr: serie } },
          'a-t',
        );
        expect(v, `${String(inicio)}-${String(f.anio)}`).toBeCloseTo(f.apoyo, 6);
      }
    }
  });

  it('Fondo en meses de gasto = Fondo ÷ (gasto ÷ meses del año), con la referencia y con el contraste', () => {
    const gastoReferencia = suma(d.gastoEjecucion.puntos, d.complementoMinimos.puntos);
    for (const gasto of [gastoReferencia, d.liquidacion.gastoPensiones.puntos]) {
      const esperado = mesesDeGasto(d.valor.puntos, gasto);
      expect(esperado.length).toBeGreaterThan(3);
      const g = porAnio(gasto);
      const fondo = porAnio(d.valor.puntos);
      for (const e of esperado) {
        const v = resolver(
          'fondo-en-meses-de-gasto',
          {
            escalares: {
              f: fondo.get(e.anio) ?? Number.NaN,
              gasto: g.get(e.anio) ?? Number.NaN,
              n: 12,
            },
            series: {},
          },
          'm-g',
        );
        expect(v, String(e.anio)).toBeCloseTo(e.valor, 9);
      }
    }
  });

  it('Fondo en meses de transferencias = Fondo ÷ (transferencias del periodo ÷ meses del periodo)', () => {
    const fondo = porAnio(d.valor.puntos);
    const casos: [readonly PuntoAnual[], number][] = [
      [d.transferenciasAnuales.puntos, 12],
      [d.transferencias.cuartoTrimestre, 3],
    ];
    for (const [flujo, meses] of casos) {
      const esperado = mesesDeFlujo(d.valor.puntos, flujo, meses);
      expect(esperado.length).toBeGreaterThan(3);
      const t = porAnio(flujo);
      for (const e of esperado) {
        const v = resolver(
          'fondo-en-meses-de-transferencias',
          {
            escalares: {
              f: fondo.get(e.anio) ?? Number.NaN,
              tr: t.get(e.anio) ?? Number.NaN,
              n: meses,
            },
            series: {},
          },
          'm-t',
        );
        expect(v, String(e.anio)).toBeCloseTo(e.valor, 9);
      }
    }
  });

  it('la página muestra las cuatro fórmulas con su leyenda y sin cifras', () => {
    const { container } = pintar();
    const formulas = [...container.querySelectorAll('figure.formula')];
    expect(formulas).toHaveLength(4);
    for (const f of formulas) {
      expect(f.textContent).toContain('Qué significa cada símbolo');
      expect(f.querySelectorAll('math[role="math"][aria-label]').length).toBeGreaterThan(0);
      expect(f.textContent).not.toMatch(/\d/);
    }
  });
});
