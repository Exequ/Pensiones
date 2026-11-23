import { TITULO_MODALIDADES } from '../como-se-calcula/anclas-modalidades';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { formatearEuros, formatearNumero, formatearPorcentaje } from '../../engine/formato';
import { abrirFuente, cerrarFuente, leerFuentes, textoDeFuentes } from '../../test/fuentes';
import { quitarCitas } from '../../engine/citas-normativas';
import { buscarSeccion } from '../secciones';
import { datosTipos } from './datos-tipos';
import { FICHAS } from './ids-datos';
import TiposDePension from './Pagina';

function pintar() {
  return render(
    <MemoryRouter>
      <TiposDePension />
    </MemoryRouter>,
  );
}

const euros2 = (v: number) => formatearEuros(v, { decimales: 2 });
const entero = (v: number) => formatearNumero(v, { decimales: 0 });

function ficha(contenedor: HTMLElement, ancla: string): HTMLElement {
  const f = contenedor.querySelector(`#ficha-${ancla}`);
  if (!(f instanceof HTMLElement)) throw new Error(`Sin ficha «${ancla}»`);
  return f;
}

function tabla(f: HTMLElement, titulo: RegExp): HTMLElement {
  const t = within(f)
    .getAllByRole('table', { hidden: true })
    .find((x) => titulo.test(x.querySelector('caption')?.textContent ?? ''));
  if (!t) throw new Error(`Sin tabla ${titulo}`);
  return t;
}

/** Artículos, normas abreviadas y citas que no deben verse en el cuerpo de la página. */
const RESIDUO_CITA =
  /\barts?\.|\bartículos?\s+\d|\bDT\s*\d|\bTRLGSS\b|disposición transitoria|\bDecreto\b|\bOrden de\b|\bRD\s*\d|\bAnexo I\b|BOE-A-/;

/** Línea de fuente cuyo botón tiene ese nombre accesible. */
function lineaDe(contenedor: HTMLElement, nombre: RegExp): HTMLElement {
  const boton = [...contenedor.querySelectorAll('.linea-fuente-boton')].find((b) =>
    nombre.test(b.getAttribute('aria-label') ?? ''),
  );
  const linea = boton?.closest('.linea-fuente');
  if (!(linea instanceof HTMLElement)) throw new Error(`Sin línea de fuente ${nombre}`);
  return linea;
}

const filas = (t: HTMLElement) =>
  [...t.querySelectorAll('tbody tr')].map((tr) =>
    [...tr.querySelectorAll('th, td')].map((c) => c.textContent),
  );

describe('página «Tipos de pensión»', () => {
  it('renderiza el título y sustituye el marcador en construcción', () => {
    pintar();
    expect(
      screen.getByRole('heading', { level: 1, name: buscarSeccion('tipos-de-pension').titulo }),
    ).toBeInTheDocument();
    expect(screen.queryByText('En construcción')).not.toBeInTheDocument();
  });

  it('hay una ficha por prestación, con su título', () => {
    const { container } = pintar();
    for (const c of FICHAS) {
      const f = ficha(container, c.ancla);
      expect(within(f).getByRole('heading', { level: 3, name: c.titulo })).toBeInTheDocument();
    }
    expect(container.querySelectorAll('.tipos-ficha').length).toBe(FICHAS.length);
  });

  it('cada ficha trae requisitos (sin columna de norma), número de pensiones y fuente con enlace', () => {
    const { container } = pintar();
    for (const c of FICHAS) {
      const f = ficha(container, c.ancla);
      const requisitos = tabla(f, /Requisitos principales/);
      expect(filas(requisitos).length).toBeGreaterThan(0);
      // Fase R5: la tabla solo tiene el tipo de requisito y lo que exige; el artículo va en «Fuentes».
      const cabeceras = [...requisitos.querySelectorAll('thead th')].map((th) => th.textContent);
      expect(cabeceras, `cabeceras de los requisitos de ${c.titulo}`).toEqual([
        'Requisito',
        'Qué exige',
      ]);
      for (const fila of filas(requisitos)) expect(fila).toHaveLength(2);
      expect(filas(tabla(f, /Número y pensión media/)).length).toBeGreaterThan(0);
      // La fuente se abre con «Fuente(s)»: título con enlace y organismo; ni fecha ni confianza.
      const { texto, enlaces } = leerFuentes(f);
      expect(texto).toMatch(/Organismo/);
      expect(texto).not.toMatch(/descargad|confianza/i);
      expect(enlaces.some((e) => e.startsWith('https://www.boe.es/'))).toBe(true);
    }
  });

  it('las cuantías mínimas coinciden con /data y la máxima, con la pensión máxima vigente', () => {
    const { container } = pintar();
    const d = datosTipos();
    const jub = d.fichas.find((x) => x.config.ancla === 'jubilacion');
    if (!jub?.maxima) throw new Error('sin máxima');
    const f = ficha(container, 'jubilacion');
    const t = tabla(f, /Cuantías mínimas de jubilación/);
    const primera = jub.cuantias[0];
    if (!primera) throw new Error('sin cuantías');
    const fila = filas(t)[0];
    expect(fila?.[2]).toBe(euros2(primera.anual));
    // Cálculo derivado: importe por paga con catorce pagas.
    expect(fila?.[3]).toBe(euros2(primera.anual / 14));
    expect(f.textContent).toContain(euros2(jub.maxima.mensual));
    expect(f.textContent).toContain(euros2(jub.maxima.anual));
  });

  it('las cuantías de cada ficha contributiva son del año de la pensión máxima', () => {
    const d = datosTipos();
    for (const x of d.fichas.filter((y) => y.config.modalidad === 'contributiva')) {
      expect(x.cuantias.length, x.config.titulo).toBeGreaterThan(0);
      for (const dato of x.datosCuantias) expect(dato.period).toBe(String(d.anioCuantias));
    }
  });

  it('el número de pensiones y la pensión media vienen de las series de /data', () => {
    const { container } = pintar();
    const d = datosTipos();
    const vi = d.fichas.find((x) => x.config.ancla === 'viudedad');
    const ambos = vi?.enVigor[0];
    if (!ambos) throw new Error('sin datos');
    const fila = filas(tabla(ficha(container, 'viudedad'), /Número y pensión media: Viudedad/))[0];
    expect(fila?.[0]).toBe('Ambos sexos');
    expect(fila?.[1]).toBe(entero(ambos.numero));
    expect(fila?.[2]).toBe(euros2(ambos.media ?? 0));
  });

  it('las pensiones no contributivas muestran la cuantía íntegra y la mínima derivada', () => {
    const { container } = pintar();
    const d = datosTipos();
    const p = d.fichas.find((x) => x.config.ancla === 'pnc-jubilacion')?.pnc;
    if (!p) throw new Error('sin PNC');
    const f = ficha(container, 'pnc-jubilacion');
    const t = filas(tabla(f, /Importe de la pensión no contributiva/));
    expect(t[0]?.[1]).toBe(euros2(p.anual));
    expect(t[1]?.[1]).toBe(euros2(p.anual * (p.minimaPorcentaje / 100)));
    expect(t[1]?.[0]).toMatch(/cálculo derivado/);
    // Sin pensión máxima ni cuantías mínimas del Anexo I.
    expect(
      within(f).queryByRole('table', { name: /Cuantías mínimas de/, hidden: true }),
    ).toBeNull();
  });

  it('la viudedad y la orfandad muestran el porcentaje del reglamento, y su cita literal está en «Fuentes»', () => {
    const { container } = pintar();
    const d = datosTipos();
    for (const ancla of ['viudedad', 'orfandad']) {
      const f = ficha(container, ancla);
      const datos = d.fichas.find((x) => x.config.ancla === ancla);
      expect(datos?.porcentajes.length).toBeGreaterThan(0);
      // En el cuerpo: el porcentaje y la situación a la que se aplica; ni la cita ni la ubicación.
      expect(f.querySelectorAll('blockquote')).toHaveLength(0);
      expect(f.textContent).toMatch(/% de la base reguladora/);
      for (const p of datos?.porcentajes ?? []) {
        expect(f.textContent).toContain(p.rotulo);
        expect(f.textContent).not.toContain(p.dato.quote ?? 'sin cita');
        expect(f.textContent).not.toContain(p.dato.location ?? 'sin ubicación');
      }
      // En el desplegable de los porcentajes: la cita, la ubicación y la situación.
      const linea = lineaDe(
        f,
        new RegExp(`Porcentajes de la base reguladora: ${datos?.config.titulo}`),
      );
      const abierta = abrirFuente(linea);
      const texto = abierta.textContent;
      for (const p of datos?.porcentajes ?? []) {
        expect(texto).toContain(p.dato.quote ?? 'sin cita');
        expect(texto).toContain(p.dato.location ?? 'sin ubicación');
        expect(texto).toContain(p.rotulo);
      }
      const enlaces = [...abierta.querySelectorAll('dialog a[href]')].map((a) =>
        a.getAttribute('href'),
      );
      expect(enlaces.some((e) => e?.includes('BOE-A-1966'))).toBe(true);
      cerrarFuente(linea);
    }
  });

  it('enlaza a «Tu pensión» solo en jubilación e incapacidad permanente', () => {
    const { container } = pintar();
    const enlaces = [...container.querySelectorAll('a[href="/tu-pension"]')];
    expect(enlaces.length).toBe(2);
    for (const a of enlaces) {
      expect(['ficha-jubilacion', 'ficha-incapacidad']).toContain(a.closest('article')?.id);
    }
  });

  it('la ficha de jubilación no lista modalidades y remite a «Cómo se calcula»', () => {
    const { container } = pintar();
    const f = ficha(container, 'jubilacion');
    for (const nombre of [
      /Jubilación parcial/,
      /Jubilación flexible/,
      /Jubilación activa/,
      /anticipada involuntaria/i,
      /anticipada voluntaria/i,
      /Jubilación demorada/,
    ]) {
      expect(f.textContent).not.toMatch(nombre);
    }
    // Ninguna lista de modalidades (las notas de la fórmula son otra lista).
    expect(f.querySelectorAll('ul:not(.formula-notas) li')).toHaveLength(0);
    // El enlace lleva al apartado de modalidades de «Cómo se calcula» (Fase R6), con el título del
    // apartado como texto y la ruta de la página; el ancla viaja en el estado de la navegación.
    const enlace = within(f).getByRole('link', { name: `«${TITULO_MODALIDADES}»` });
    expect(enlace.getAttribute('href')).toBe('/como-se-calcula');
    expect(f.textContent).toMatch(
      new RegExp(`se explica en «${TITULO_MODALIDADES}», en «Cómo se calcula»`),
    );
    expect(f.textContent).not.toMatch(/confianza/i);
    // Solo la ficha de jubilación remite.
    expect(container.querySelectorAll('a[href="/como-se-calcula"]')).toHaveLength(1);
  });

  it('ninguna ficha muestra en el cuerpo artículos, normas abreviadas, citas ni ubicaciones (solo en «Fuentes»)', () => {
    const { container } = pintar();
    const d = datosTipos();
    for (const x of d.fichas) {
      const cuerpo = ficha(container, x.config.ancla).textContent;
      expect(cuerpo, x.config.titulo).not.toMatch(RESIDUO_CITA);
      // Los textos de la norma salen de /data sin sus citas, y no se pierde nada más.
      expect(cuerpo).toContain(x.textos.aQuienCubre);
      expect(cuerpo).toContain(x.textos.duracion);
      expect(cuerpo).toContain(x.textos.limites);
      expect(cuerpo).toContain(x.textos.compatibilidades);
      for (const r of x.textos.requisitos) expect(cuerpo).toContain(r.descripcion);
      // Las citas y ubicaciones de los datos que llegan al desplegable no están en el cuerpo. Las
      // filas de las cuantías mínimas conservan solo su rótulo (identifica el importe): su cita
      // completa, con los importes, y su ubicación en el anexo están en «Fuentes».
      for (const p of x.porcentajes) {
        expect(cuerpo).not.toContain(p.dato.quote ?? 'sin cita');
        expect(cuerpo).not.toContain(p.dato.location ?? 'sin ubicación');
      }
      for (const dato of x.datosCuantias) {
        expect(cuerpo).not.toContain(dato.location ?? 'sin ubicación');
      }
    }
    // Ni las notas, ni los textos de la página, ni el pie de la página.
    expect(container.textContent).not.toMatch(RESIDUO_CITA);
    expect(container.textContent).not.toMatch(/Concepto \(literal del Anexo I\)/);
  });

  it('el texto sin citas es el de /data sin los artículos: nada más cambia', () => {
    const d = datosTipos();
    for (const x of d.fichas) {
      const p = x.prestacion;
      expect(x.textos.aQuienCubre).toBe(quitarCitas(p.aQuienCubre));
      expect(x.textos.requisitos.map((r) => r.descripcion)).toEqual(
        p.requisitos.map((r) => quitarCitas(r.descripcion)),
      );
      // Los datos conservan las citas íntegras.
      expect(p.requisitos.every((r) => r.articulo.length > 0)).toBe(true);
      expect(p.calculo.articulos.length).toBeGreaterThan(0);
    }
  });

  it('las citas de cada bloque están en el desplegable «Fuentes» de ese bloque', () => {
    const { container } = pintar();
    const d = datosTipos();
    for (const x of d.fichas) {
      const f = ficha(container, x.config.ancla);
      const p = x.prestacion;
      // Requisitos: el artículo de cada requisito, con la descripción del requisito como rótulo.
      const requisitos = abrirFuente(
        lineaDe(f, new RegExp(`^Fuentes?: Requisitos principales: ${x.config.titulo}$`)),
      );
      for (const [i, r] of p.requisitos.entries()) {
        expect(requisitos.textContent, `${x.config.titulo}: ${r.articulo}`).toContain(r.articulo);
        expect(requisitos.textContent).toContain(x.textos.requisitos[i]?.descripcion ?? 'falta');
      }
      expect(requisitos.textContent).toMatch(/Se refiere a/);
      cerrarFuente(requisitos);
      // Quién puede cobrarla, y el cálculo con sus artículos.
      const quien = abrirFuente(
        lineaDe(f, new RegExp(`^Fuentes?: Quién puede cobrarla: ${x.config.titulo}$`)),
      );
      expect(quien.textContent).toContain('A quién cubre');
      expect(quien.textContent).toMatch(/art\./);
      cerrarFuente(quien);
      const calculo = abrirFuente(
        lineaDe(f, new RegExp(`^Fuentes?: Cálculo de la cuantía y límites: ${x.config.titulo}$`)),
      );
      expect(calculo.textContent).toContain(p.calculo.articulos);
      expect(calculo.textContent).toContain('Límites');
      cerrarFuente(calculo);
    }
  });

  it('la jubilación muestra la fórmula con notación matemática, su leyenda y las cifras de /data', () => {
    const { container } = pintar();
    const d = datosTipos();
    const x = d.fichas.find((y) => y.config.ancla === 'jubilacion');
    if (!x?.formula) throw new Error('la jubilación debe tener fórmula estructurada');
    const f = ficha(container, 'jubilacion');
    const figura = f.querySelector('figure.formula');
    if (!(figura instanceof HTMLElement)) throw new Error('sin fórmula');
    // MathML nativo con nombre accesible (la lectura en palabras de cada ecuación).
    const ecuaciones = [...figura.querySelectorAll('math[display="block"]')];
    expect(ecuaciones).toHaveLength(x.formula.ecuaciones.length);
    expect(ecuaciones[0]?.getAttribute('aria-label')).toBe(x.formula.ecuaciones[0]?.lectura);
    expect(figura.querySelector('mfrac')).not.toBeNull();
    expect(figura.querySelector('munderover')).not.toBeNull();
    // Cada cifra de la fórmula es la del dato referenciado.
    const textoMath = ecuaciones.map((e) => e.textContent).join(' ');
    for (const c of x.formula.cifras) expect(textoMath).toContain(c.texto);
    // Leyenda: cada símbolo con su nombre, su significado y su unidad.
    const leyenda = figura.querySelectorAll('dl.formula-leyenda')[0];
    expect(leyenda?.querySelectorAll('dt')).toHaveLength(x.formula.simbolos.length);
    for (const s of x.formula.simbolos) {
      expect(leyenda?.textContent).toContain(s.nombre);
      expect(leyenda?.textContent).toContain(s.significado);
    }
    // El texto libre con cifras ya no se muestra: lo sustituye la fórmula.
    expect(f.textContent).not.toContain(x.textos.formula);
    // La caja se desplaza dentro de sí misma y se alcanza con el teclado.
    const caja = figura.querySelector('.formula-caja');
    expect(caja?.getAttribute('tabindex')).toBe('0');
    expect(caja?.getAttribute('role')).toBe('region');
  });

  it('la incapacidad permanente muestra el texto y la fórmula del complemento de la gran incapacidad', () => {
    const { container } = pintar();
    const d = datosTipos();
    const x = d.fichas.find((y) => y.config.ancla === 'incapacidad');
    expect(x?.formula?.alcance).toBe('parcial');
    const f = ficha(container, 'incapacidad');
    expect(f.querySelectorAll('figure.formula')).toHaveLength(1);
    expect(f.textContent).toContain(x?.textos.formula ?? 'falta');
    expect(f.querySelector('figure.formula')?.textContent).toContain(
      'Complemento de la gran incapacidad',
    );
  });

  it('las prestaciones sin fórmula cerrada en la norma siguen mostrando la regla en texto', () => {
    const { container } = pintar();
    const d = datosTipos();
    for (const ancla of ['viudedad', 'orfandad', 'familiares', 'pnc-jubilacion', 'pnc-invalidez']) {
      const x = d.fichas.find((y) => y.config.ancla === ancla);
      expect(x?.formula, ancla).toBeNull();
      const f = ficha(container, ancla);
      expect(f.querySelector('figure.formula'), ancla).toBeNull();
      expect(f.textContent).toContain(x?.textos.formula ?? 'falta');
    }
  });

  it('las líneas de fuente de cada ficha tienen nombre accesible único', () => {
    const { container } = pintar();
    const nombres = [...container.querySelectorAll('.linea-fuente-boton')].map((b) =>
      b.getAttribute('aria-label'),
    );
    expect(nombres.every((n) => n !== null && n.length > 0)).toBe(true);
    expect(new Set(nombres).size).toBe(nombres.length);
  });

  it('el cuadro resumen lista todas las prestaciones con su número y su pensión media', () => {
    const { container } = pintar();
    const t = within(container).getByRole('table', {
      name: /Pensiones en vigor y pensión media de cada prestación/,
      hidden: true,
    });
    expect(filas(t).length).toBe(FICHAS.length);
  });

  it('no muestra valores vacíos ni no numéricos', () => {
    const { container } = pintar();
    expect(container.textContent).not.toMatch(/NaN|undefined|Infinity|\[object/);
  });

  it('lista al final lo que cubre y lo que queda fuera', () => {
    pintar();
    for (const punto of buscarSeccion('tipos-de-pension').previsto) {
      expect(screen.getByText(punto)).toBeInTheDocument();
    }
  });
});

describe('«Tipos de pensión»: complementos por brecha de género y por maternidad (Fase 5-A4)', () => {
  const seccion = (c: HTMLElement): HTMLElement => {
    const s = c.querySelector('section[aria-labelledby="complementos"]');
    if (!(s instanceof HTMLElement)) throw new Error('Sin la sección de complementos');
    return s;
  };

  it('tiene su encabezado, fuente con su naturaleza (sin fecha ni confianza), y «Cómo leerlo» que dice qué no mide', () => {
    const { container } = pintar();
    const s = seccion(container);
    expect(within(s).getByRole('heading', { level: 2 })).toHaveTextContent(
      /Complementos por hijos/,
    );
    const linea = s.querySelector('.linea-fuente');
    expect(linea?.textContent).toMatch(/naturaleza: observado/);
    const fuente = textoDeFuentes(s);
    expect(fuente).toMatch(/Organismo/);
    expect(fuente).not.toMatch(/descargad|2026-11-16|confianza/i);
    const como = s.querySelector('.como-leerlo')?.textContent ?? '';
    expect(como).toMatch(/No miden la brecha de género de las pensiones de jubilación/);
    expect(como).toMatch(/tampoco dividen por la población/);
    // Ajustes actuariales 4: la brecha de la DA 37.ª, calculada con las altas iniciales de jubilación
    // (fórmula del motor, brecha-da37.ts) y comparada con el umbral de /data; ninguna cifra a mano.
    const b = datosTipos().brechaDA37;
    expect(como).toContain(
      `fue del ${formatearPorcentaje(b.ultima.brecha, { decimales: 1 })} en ${String(b.ultima.anio)}`,
    );
    expect(como).toContain(`superior al ${formatearPorcentaje(b.umbral, { decimales: 0 })}`);
    expect(como).toMatch(/la norma no precisa si el importe medio incluye complementos/);
  });

  it('la tabla por comunidad empieza por el total nacional y suma las comunidades', () => {
    const { container } = pintar();
    const d = datosTipos().complementos;
    const t = within(seccion(container))
      .getAllByRole('table', { hidden: true })
      .find((x) =>
        /número de pensiones en vigor con el complemento por comunidad/.test(
          x.querySelector('caption')?.textContent ?? '',
        ),
      );
    if (!t) throw new Error('Sin tabla de número por comunidad');
    const f = filas(t);
    const total = d.filas.brecha[0];
    expect(f[0]?.[0]).toBe('Total');
    expect(f[0]?.[1]).toBe(entero(total?.porSexo.ambos.numero ?? Number.NaN));
    // diecinueve comunidades y ciudades autónomas más el total
    expect(f).toHaveLength(d.filas.brecha.filter((x) => x.nivel === 'comunidad').length + 1);
    const suma = d.filas.brecha
      .filter((x) => x.nivel === 'comunidad')
      .reduce((a, x) => a + x.porSexo.ambos.numero, 0);
    expect(suma).toBe(total?.porSexo.ambos.numero);
  });

  it('el importe medio sale con dos decimales y euro', () => {
    const { container } = pintar();
    const d = datosTipos().complementos;
    const t = within(seccion(container))
      .getAllByRole('table', { hidden: true })
      .find((x) =>
        /importe medio mensual del complemento por comunidad/.test(
          x.querySelector('caption')?.textContent ?? '',
        ),
      );
    if (!t) throw new Error('Sin tabla de importe por comunidad');
    expect(filas(t)[0]?.[1]).toBe(
      euros2(d.filas.brecha[0]?.porSexo.ambos.importeMedio ?? Number.NaN),
    );
  });

  it('el selector pasa de la brecha de género a la maternidad y cambia las tablas', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const { container } = pintar();
    const s = seccion(container);
    expect(s.querySelector('caption')?.textContent).toMatch(/brecha de género/);
    await userEvent.click(within(s).getByRole('radio', { name: 'Maternidad' }));
    expect(s.querySelector('caption')?.textContent).toMatch(/Complemento por maternidad/);
    const d = datosTipos().complementos;
    const tramos = [...s.querySelectorAll('table')].find((x) =>
      /por número de hijos/.test(x.querySelector('caption')?.textContent ?? ''),
    );
    expect(tramos?.querySelectorAll('tbody tr')).toHaveLength(d.etiquetasTramos.maternidad.length);
  });

  it('el desglose por hijos declara las pensiones sin número de hijos (total menos tramos)', () => {
    const d = datosTipos().complementos;
    expect(d.sinHijos.brecha.ambos).toBe(d.sinHijos.brecha.hombres + d.sinHijos.brecha.mujeres);
    expect(d.sinHijos.maternidad.ambos).toBe(
      d.sinHijos.maternidad.hombres + d.sinHijos.maternidad.mujeres,
    );
    const { container } = pintar();
    expect(seccion(container).textContent).toContain(
      `en ${entero(d.sinHijos.brecha.ambos)} pensiones de ambos sexos`,
    );
  });

  it('la variación publicada va con su aviso de que no se le atribuye causa', () => {
    const { container } = pintar();
    expect(seccion(container).textContent).toMatch(/no les atribuye una causa/);
  });

  it('las provincias están en un desplegable con las provincias de las comunidades pluriprovinciales', () => {
    const { container } = pintar();
    const d = seccion(container).querySelector('details');
    expect(d).not.toBeNull();
    expect(d?.querySelector('summary')?.textContent).toMatch(/provincias/);
    expect(d?.querySelector('table tbody')?.querySelectorAll('tr')).toHaveLength(
      datosTipos().complementos.filas.brecha.filter((x) => x.nivel === 'provincia').length,
    );
  });

  it('lo previsto de la sección dice que la brecha anual no se publica y que se muestra la calculada con las altas iniciales', () => {
    const previsto = buscarSeccion('tipos-de-pension').previsto.join(' ');
    expect(previsto).toMatch(
      /brecha de género de las pensiones de jubilación que usa la ley no se publica por año/,
    );
    expect(previsto).toMatch(/calculada con la pensión media de las altas iniciales de jubilación/);
  });
});
