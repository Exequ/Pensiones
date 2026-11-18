import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { formatearNumero } from '../../engine/formato';
import {
  apoyoFinancieroDelEstado,
  posicionIlustrativa,
  posicionNeta,
} from '../../engine/transferencias';
import { expectFuente } from '../../test/fuentes';
import { datosHucha } from '../historico/datos-hucha';
import Hucha from './Pagina';

function pintar() {
  return render(
    <MemoryRouter>
      <Hucha />
    </MemoryRouter>,
  );
}

const entero = (v: number) => formatearNumero(v, { decimales: 0 });

/** Figura cuyo título contiene el texto dado. */
function figura(contenedor: HTMLElement, titulo: string): HTMLElement {
  const encontrada = [...contenedor.querySelectorAll('figure.grafico')].find((f) =>
    f.querySelector('.grafico-titulo')?.textContent.includes(titulo),
  );
  if (!(encontrada instanceof HTMLElement)) throw new Error(`Sin figura «${titulo}»`);
  return encontrada;
}

/** Última fila de la tabla de datos de una figura, como texto de celdas. */
function ultimaFila(f: HTMLElement): string[] {
  const filas = f.querySelectorAll('tbody tr');
  const ultima = filas[filas.length - 1];
  return [...(ultima?.querySelectorAll('th, td') ?? [])].map((c) => c.textContent);
}

describe('página «Hucha»: secciones de transferencias', () => {
  it('muestra las cuatro secciones nuevas con su encabezado', () => {
    pintar();
    for (const nombre of [
      /De dónde procede el dinero/,
      /transferencias del Estado a la Seguridad Social en el tiempo/,
      /El Fondo de Reserva frente a las transferencias/,
      /dos lecturas separadas/,
    ]) {
      expect(screen.getByRole('heading', { level: 2, name: nombre })).toBeInTheDocument();
    }
  });

  it('las construcciones llevan el aviso de «no son cifras oficiales» y un título propio cada una', () => {
    const { container } = pintar();
    expect(screen.getAllByText(/no cifras oficiales/i).length).toBeGreaterThanOrEqual(1);
    expect(figura(container, 'Fondo menos deuda: valor del Fondo de Reserva')).toBeTruthy();
    expect(figura(container, 'Apoyo financiero del Estado: deuda más transferencias')).toBeTruthy();
  });

  it('el texto dice que préstamos, transferencias y Fondo no son aditivos y de qué naturaleza es cada uno', () => {
    const { container } = pintar();
    const seccion = container.querySelector('#posicion')?.closest('section')?.textContent ?? '';
    expect(seccion).toMatch(/no son\s+partidas aditivas/);
    expect(seccion).toMatch(/pasivo a devolver/);
    expect(seccion).toMatch(/flujo no reembolsable/);
    expect(seccion).toMatch(/activo acumulado/);
  });

  it('cada gráfico nuevo tiene tabla, línea de fuente y «Cómo leerlo»', () => {
    const { container } = pintar();
    for (const titulo of [
      'Transferencias corrientes del Estado y organismos autónomos a la Seguridad Social, por año',
      'por trimestre',
      'Transferencias acumuladas desde',
      'El valor del Fondo de Reserva, en meses de transferencias',
      'Fondo menos deuda: valor del Fondo de Reserva',
      'Apoyo financiero del Estado: deuda más transferencias',
      'Deuda PDE de las Administraciones de Seguridad Social',
    ]) {
      const f = figura(container, titulo);
      expect(f.querySelector('table'), titulo).not.toBeNull();
      expectFuente(f, titulo);
      expect(f.closest('.bloque-grafico')?.querySelector('.como-leerlo'), titulo).not.toBeNull();
    }
  });

  it('la suma conjunta es una opción desactivada por defecto, con aviso reforzado cuando se activa', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    const casilla = screen.getByRole('checkbox', { name: /Mostrar la suma conjunta/ });
    expect(casilla).not.toBeChecked();
    expect(() => figura(container, 'Suma conjunta')).toThrow();
    expect(screen.queryByRole('checkbox', { name: /Deuda con el Estado/ })).toBeNull();
    await usuario.click(casilla);
    expect(casilla).toBeChecked();
    expect(figura(container, 'Suma conjunta, no aditiva')).toBeTruthy();
    const aviso = screen.getByText(
      /esta suma junta un activo \(el Fondo\), un pasivo \(la deuda\)/,
    );
    expect(aviso.textContent).toMatch(/no son aditivas/);
    expect(aviso.textContent).toMatch(/un flujo/);
    await usuario.click(casilla);
    expect(() => figura(container, 'Suma conjunta')).toThrow();
  });

  it('las casillas de la suma conjunta son casillas con etiqueta, accesibles por teclado, y recalculan la suma', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    const d = datosHucha();
    await usuario.click(screen.getByRole('checkbox', { name: /Mostrar la suma conjunta/ }));
    const grafico = () => figura(container, 'Suma conjunta, no aditiva');
    const esperada = (seleccion: { fondo: boolean; deuda: boolean; transferencias: boolean }) => {
      const filas = posicionIlustrativa(
        {
          fondo: d.valor.puntos,
          deuda: d.deuda.finAno.puntos,
          transferenciasAnuales: d.transferenciasAnuales.puntos,
        },
        d.transferenciasAnuales.puntos[0]?.anio ?? 0,
        seleccion,
      );
      return filas.at(-1)?.suma ?? null;
    };

    const casillaDeuda = screen.getByRole('checkbox', { name: /Deuda con el Estado/ });
    expect(casillaDeuda).toBeChecked();
    // La última columna de la tabla es el documento de origen de las transferencias; el resultado es la anterior.
    const resultado = () => ultimaFila(grafico()).at(-2);
    expect(resultado()).toBe(
      entero(esperada({ fondo: true, deuda: true, transferencias: true }) ?? 0),
    );

    // Se marca con el teclado (foco y barra espaciadora).
    casillaDeuda.focus();
    await usuario.keyboard(' ');
    expect(casillaDeuda).not.toBeChecked();
    expect(resultado()).toBe(
      entero(esperada({ fondo: true, deuda: false, transferencias: true }) ?? 0),
    );

    await usuario.click(screen.getByRole('checkbox', { name: /Fondo de Reserva/ }));
    await usuario.click(screen.getByRole('checkbox', { name: /Transferencias acumuladas/ }));
    expect(resultado()).toBe('—');
    expect(grafico().querySelector('svg')?.textContent).toMatch(/Ningún componente seleccionado/);
  });

  it('«Fondo menos deuda»: la tabla lleva Fondo, deuda y su diferencia con el signo', () => {
    const { container } = pintar();
    const d = datosHucha();
    const esperada = posicionNeta(d.valor.puntos, d.deuda.finAno.puntos).at(-1);
    const f = figura(container, 'Fondo menos deuda: valor del Fondo de Reserva');
    const fila = ultimaFila(f);
    expect(fila[0]).toBe(String(esperada?.anio));
    expect(fila[1]).toBe(entero(esperada?.fondo ?? 0));
    expect(fila[2]).toBe(entero(esperada?.deuda ?? 0));
    expect(fila[3]).toBe(entero(esperada?.neta ?? 0));
    // El signo es explícito: la cabecera lo dice y, si la diferencia es negativa, la celda lleva «−».
    expect(f.querySelector('thead')?.textContent).toMatch(/negativo si la deuda supera al Fondo/);
    if ((esperada?.neta ?? 0) < 0) expect(fila[3]).toMatch(/^[−-]/);
    const bloque = f.closest('.bloque-grafico')?.textContent ?? '';
    expect(bloque).toMatch(/Cómo leerlo/);
    expect(bloque).toMatch(
      /compara un activo con un pasivo|diferencia entre un activo y un pasivo/i,
    );
  });

  it('«Apoyo financiero del Estado»: deuda y transferencias por separado y su suma, según el año de inicio', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    const d = datosHucha();
    const anios = d.transferenciasAnuales.puntos.map((p) => p.anio);
    const calcular = (inicio: number) =>
      apoyoFinancieroDelEstado(
        {
          deuda: d.deuda.finAno.puntos,
          transferenciasAnuales: d.transferenciasAnuales.puntos,
        },
        inicio,
      ).at(-1);
    const titulo = 'Apoyo financiero del Estado: deuda más transferencias';
    const primera = calcular(anios[0] ?? 0);
    let fila = ultimaFila(figura(container, titulo));
    expect(fila[1]).toBe(entero(primera?.deuda ?? 0));
    expect(fila[2]).toBe(entero(primera?.transferencias ?? 0));
    expect(fila[3]).toBe(entero(primera?.apoyo ?? 0));

    const otro = anios[3] ?? 0;
    await usuario.selectOptions(
      screen.getByLabelText('Año de inicio de las transferencias acumuladas'),
      String(otro),
    );
    const segunda = calcular(otro);
    fila = ultimaFila(figura(container, titulo));
    expect(fila[3]).toBe(entero(segunda?.apoyo ?? 0));
    // La deuda no cambia con el año de inicio; las transferencias acumuladas, sí.
    expect(fila[1]).toBe(entero(primera?.deuda ?? 0));
    expect(fila[2]).not.toBe(entero(primera?.transferencias ?? 0));
    expect(figura(container, titulo).querySelector('thead')?.textContent).toContain(
      `desde ${otro}`,
    );
  });

  it('los meses de gasto del Fondo usan la referencia con complemento, el contraste de catorce pagas y avisan del precio de adquisición', () => {
    const { container } = pintar();
    const f = figura(container, 'Meses de gasto en pensiones que equivale el valor del Fondo');
    const cabecera = f.querySelector('thead')?.textContent ?? '';
    // La referencia tiene dos tramos (liquidación y ejecución) con la misma definición.
    expect(cabecera).toMatch(/Referencia, liquidación/);
    expect(cabecera).toMatch(/Referencia, ejecución/);
    expect(cabecera).toMatch(/Contraste: catorce pagas/);
    expect(container.textContent).toMatch(/El Fondo se valora a precio de adquisición/);
  });

  it('los meses de transferencias presentan el año completo como medida principal y el cuarto trimestre como secundaria', () => {
    const { container } = pintar();
    const f = figura(container, 'en meses de transferencias');
    const cabecera = f.querySelector('thead')?.textContent ?? '';
    expect(cabecera).toMatch(/Principal, liquidación/);
    expect(cabecera).toMatch(/Principal, ejecución/);
    expect(cabecera).toMatch(/Secundaria: cuarto trimestre/);
    const seccion =
      container.querySelector('#fondo-transferencias')?.closest('section')?.textContent ?? '';
    expect(seccion).toMatch(/son diferencias entre\s+acumulados/);
    expect(seccion).toMatch(/no se reparten por igual/);
  });

  it('el selector de unidad pasa de meses a trimestres de transferencias', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    const meses = ultimaFila(figura(container, 'en meses de transferencias'));
    await usuario.click(screen.getByRole('radio', { name: 'Trimestres de transferencias' }));
    const trimestres = ultimaFila(figura(container, 'en trimestres de transferencias'));
    // La última fila es de un año de la ejecución: la columna de la liquidación está vacía.
    expect(meses[1]).toBe('—');
    expect(trimestres[1]).toBe('—');
    // Un trimestre son tres meses: el valor en trimestres es un tercio del valor en meses.
    const aNumero = (t: string | undefined) =>
      Number((t ?? '').replace(/\./g, '').replace(',', '.'));
    expect(aNumero(trimestres[2])).toBeCloseTo(aNumero(meses[2]) / 3, 1);
  });

  it('el desglose por finalidad aparece y lo no disponible se marca como pendiente de datos', () => {
    const { container } = pintar();
    expect(container.textContent).toMatch(/Pendiente de datos: desglose anual/);
    const tabla = within(container).getByRole('table', {
      name: /por finalidad, según el Tribunal de Cuentas/,
      hidden: true,
    });
    expect(tabla.querySelectorAll('tbody tr').length).toBeGreaterThanOrEqual(5);
  });

  it('explica que la ejecución clasifica por origen y el Tribunal de Cuentas por finalidad, y que la causa completa no está verificada', () => {
    const { container } = pintar();
    const nota = container.querySelector('#origen-clasificacion')?.textContent ?? '';
    expect(nota).toMatch(/clasifica las transferencias por su origen/);
    expect(nota).toMatch(/Tribunal de Cuentas las cifra\s+por su finalidad/);
    expect(nota).toMatch(/causa completa de la diferencia[\s\S]*no está verificada/);
    // La sección no atribuye la diferencia a una causa concreta no verificada.
    const seccion = container.querySelector('#origen')?.closest('section')?.textContent ?? '';
    expect(seccion).not.toMatch(/No coinciden, porque/);
  });

  it('las anotaciones de la deuda dicen que no consta cancelación ni conversión', () => {
    const { container } = pintar();
    expect(container.textContent).toMatch(/no consta\s+ninguna cancelación ni conversión/);
    expect(container.textContent).toMatch(/no es una cancelación ni una conversión/);
  });
});

describe('página «Hucha» (Fase 5-A3): series ampliadas con ruptura de serie rotulada', () => {
  const titulos = {
    transferencias:
      'Transferencias corrientes del Estado y organismos autónomos a la Seguridad Social, por año',
    acumuladas: 'Transferencias acumuladas desde',
    mesesTransferencias: 'en meses de transferencias',
    mesesGasto: 'Meses de gasto en pensiones que equivale el valor del Fondo',
  };

  it('las series de transferencias empiezan en el primer año de la liquidación y cubren hasta la ejecución sin huecos', () => {
    const d = datosHucha();
    const anios = d.transferenciasAnuales.puntos.map((p) => p.anio);
    expect(anios[0]).toBe(d.liquidacion.delEstado.puntos[0]?.anio);
    expect(anios.at(-1)).toBe(d.transferencias.delEstado.puntos.at(-1)?.anio);
    for (let i = 1; i < anios.length; i++) expect(anios[i]).toBe((anios[i - 1] ?? 0) + 1);
    expect(d.transferenciasAnuales.rupturas).toEqual([d.transferencias.delEstado.puntos[0]?.anio]);
  });

  it('el gráfico y la tabla de transferencias por año rotulan los dos tramos y la ruptura', () => {
    const { container } = pintar();
    const f = figura(container, titulos.transferencias);
    const cabecera = f.querySelector('thead')?.textContent ?? '';
    expect(cabecera).toMatch(/Liquidación \(\d{4}-\d{4}\)/);
    expect(cabecera).toMatch(/Ejecución \(\d{4}-\d{4}\)/);
    // Cada año tiene cifra en uno solo de los tramos: el otro es una celda vacía.
    for (const fila of f.querySelectorAll('tbody tr')) {
      const celdas = [...fila.querySelectorAll('td')].map((c) => c.textContent);
      expect(celdas.filter((c) => c === '—').length).toBe(1);
    }
    expect(f.querySelector('svg')?.textContent).toMatch(/Liquidación/);
    expect(f.querySelector('svg')?.textContent).toMatch(/Ejecución/);
    expect(f.closest('.bloque-grafico')?.textContent).toMatch(/Ruptura de serie/);
    expect(container.querySelector('#transferencias')?.closest('section')?.textContent).toMatch(
      /no comparten ningún ejercicio/,
    );
  });

  it('el último año de la liquidación y el primero de la ejecución están en columnas distintas de la tabla', () => {
    const { container } = pintar();
    const d = datosHucha();
    const f = figura(container, titulos.transferencias);
    const filas = [...f.querySelectorAll('tbody tr')].map((tr) =>
      [...tr.querySelectorAll('th, td')].map((c) => c.textContent),
    );
    const ultimaLiquidacion = d.liquidacion.delEstado.puntos.at(-1)?.anio;
    const primeraEjecucion = d.transferencias.delEstado.puntos[0]?.anio;
    const a = filas.find((x) => x[0] === String(ultimaLiquidacion));
    const b = filas.find((x) => x[0] === String(primeraEjecucion));
    expect(a?.[1]).not.toBe('—');
    expect(a?.[2]).toBe('—');
    expect(b?.[1]).toBe('—');
    expect(b?.[2]).not.toBe('—');
  });

  it('la suma acumulada desde un año anterior a la ruptura lo avisa y la desde un año posterior, no', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    const d = datosHucha();
    const f = () => figura(container, titulos.acumuladas).closest('.bloque-grafico');
    expect(f()?.textContent).toMatch(/cruza la ruptura de serie/);
    await usuario.selectOptions(
      screen.getByLabelText('Año de inicio de la suma acumulada'),
      String(d.transferencias.delEstado.puntos[0]?.anio),
    );
    // La nota sigue explicando la ruptura, pero el gráfico solo muestra el tramo de la ejecución.
    const cabecera =
      figura(container, titulos.acumuladas).querySelector('thead')?.textContent ?? '';
    expect(cabecera).toMatch(/años de la ejecución/);
    expect(cabecera).not.toMatch(/años de la liquidación/);
  });

  it('los meses de transferencias distinguen el tramo de la liquidación y el de la ejecución, y la secundaria solo existe para la ejecución', () => {
    const { container } = pintar();
    const f = figura(container, titulos.mesesTransferencias);
    const cabecera = f.querySelector('thead')?.textContent ?? '';
    expect(cabecera).toMatch(/liquidación \(\d{4}-\d{4}\)/);
    expect(cabecera).toMatch(/ejecución \(\d{4}-\d{4}\)/);
    const primera = [...(f.querySelector('tbody tr')?.querySelectorAll('td') ?? [])].map(
      (c) => c.textContent,
    );
    // El primer año es de la liquidación y no tiene medida secundaria (no hay acumulados trimestrales).
    expect(primera[0]).not.toBe('—');
    expect(primera.at(-1)).toBe('—');
  });

  it('los meses de gasto muestran la referencia en dos tramos con una ruptura rotulada en el gráfico', () => {
    const { container } = pintar();
    const f = figura(container, titulos.mesesGasto);
    expect(f.querySelector('svg')?.textContent).toMatch(/Ruptura de serie/);
    const bloque = f.closest('.bloque-grafico')?.textContent ?? '';
    expect(bloque).toMatch(/dos tramos con la misma definición/);
    const d = datosHucha();
    expect(bloque).toContain(`desde ${d.liquidacion.primerAnioComplementoAparte}`);
    // La referencia (tramo de la liquidación) empieza en el primer año de ese tramo; el contraste de catorce pagas
    // puede empezar antes y deja la celda de la referencia vacía.
    const filas = [...f.querySelectorAll('tbody tr')].map((tr) =>
      [...tr.querySelectorAll('th, td')].map((c) => c.textContent),
    );
    const primeraConReferencia = filas.find((x) => x[1] !== '—');
    expect(primeraConReferencia?.[0]).toBe(String(d.liquidacion.gastoPensiones.puntos[0]?.anio));
  });

  it('las construcciones de posición llevan una columna con el documento de origen de las transferencias y la ruptura', async () => {
    const { container } = pintar();
    const d = datosHucha();
    const f = figura(container, 'Apoyo financiero del Estado: deuda más transferencias');
    const cabecera = f.querySelector('thead')?.textContent ?? '';
    expect(cabecera).toMatch(/Documento de origen de las transferencias del año/);
    const filas = [...f.querySelectorAll('tbody tr')].map((tr) =>
      [...tr.querySelectorAll('th, td')].map((c) => c.textContent),
    );
    expect(filas[0]?.at(-1)).toMatch(/^Liquidación/);
    expect(filas.at(-1)?.at(-1)).toMatch(/^Ejecución/);
    expect(f.querySelector('svg')?.textContent).toMatch(/Ruptura de serie/);
    expect(f.closest('.bloque-grafico')?.textContent).toMatch(/cruzan la ruptura de serie/);
    // Con el año de inicio posterior a la ruptura desaparece la regla del gráfico.
    const usuario = userEvent.setup();
    await usuario.selectOptions(
      screen.getByLabelText('Año de inicio de las transferencias acumuladas'),
      String(d.transferencias.delEstado.puntos[0]?.anio),
    );
    const despues = figura(container, 'Apoyo financiero del Estado: deuda más transferencias');
    expect(despues.querySelector('svg')?.textContent).not.toMatch(/Ruptura de serie/);
  });
});

describe('página «Hucha» (Fase 5-A3): finalidad, préstamos y Fondo según el Tribunal de Cuentas', () => {
  it('la tabla por finalidad recoge las dos declaraciones, define origen frente a finalidad y tiene «Cómo leerlo»', () => {
    const { container } = pintar();
    const tabla = within(container).getByRole('table', {
      name: /por finalidad, según el Tribunal de Cuentas/,
      hidden: true,
    });
    const declaraciones = new Set(
      [...tabla.querySelectorAll('tbody tr')].map((tr) => tr.querySelector('th, td')?.textContent),
    );
    expect(declaraciones.size).toBe(2);
    const bloque = container.querySelector('#finalidad-definicion')?.closest('.hist-definiciones');
    expect(bloque?.textContent).toMatch(/clasifica las transferencias por su origen/);
    expect(bloque?.textContent).toMatch(/Tribunal de Cuentas las cifra por su finalidad/);
    expect(bloque?.querySelector('.como-leerlo')).not.toBeNull();
    expectFuente(bloque ?? null);
    // No se afirma la periodicidad de las transferencias.
    expect(container.textContent).toMatch(/no la\s+afirma/);
    expect(container.textContent).not.toMatch(
      /transferencias (se efectúan|se abonan) (cada|mensual|trimestral)/i,
    );
  });

  it('la sección de préstamos tiene gráfico con tabla, fuente, nota y «Cómo leerlo», y los pasivos financieros llevan los dos tramos', () => {
    const { container } = pintar();
    expect(
      screen.getByRole('heading', { level: 2, name: /Préstamos del Estado y Fondo de Reserva/ }),
    ).toBeInTheDocument();
    const f = figura(container, 'Préstamos concedidos por el Estado y pasivos financieros');
    expect(f.querySelector('table')).not.toBeNull();
    expectFuente(f);
    expect(f.closest('.bloque-grafico')?.querySelector('.como-leerlo')).not.toBeNull();
    const cabecera = f.querySelector('thead')?.textContent ?? '';
    expect(cabecera).toMatch(/Préstamos, Tribunal \(\d{4}-\d{4}\)/);
    expect(cabecera).toMatch(/Pasivos, liquidación \(\d{4}-\d{4}\)/);
    expect(cabecera).toMatch(/Pasivos, ejecución \(\d{4}-\d{4}\)/);
    expect(f.closest('.bloque-grafico')?.textContent).toMatch(/ruptura de serie/);
    expect(f.closest('.bloque-grafico')?.textContent).toMatch(
      /no son sinónimo de préstamos del Estado/,
    );
  });

  it('el Anexo 10 se muestra línea a línea con subtotales y total, y dice que el año se deduce del plazo de cancelación y no es una fecha publicada', () => {
    const { container } = pintar();
    const d = datosHucha();
    const tabla = within(container).getByRole('table', {
      name: /Préstamos otorgados por el Estado a la Seguridad Social/,
      hidden: true,
    });
    expect(tabla.querySelectorAll('tbody tr').length).toBe(d.anexoPrestamos.filas.length);
    const filas = [...tabla.querySelectorAll('tbody tr')].map((tr) => tr.textContent);
    expect(filas.filter((t) => /Subtotal del bloque/.test(t)).length).toBe(4);
    expect(filas.filter((t) => /Total del anexo/.test(t)).length).toBe(1);
    const seccion = container.querySelector('#prestamos')?.closest('section')?.textContent ?? '';
    expect(seccion).toMatch(/registra el préstamo como pasivo financiero de ingresos/);
    expect(seccion).toMatch(/no es una fecha publicada en el anexo/);
    expect(seccion).toMatch(/no dice si un préstamo se ha devuelto, prorrogado o cancelado/);
  });

  it('la tabla del Fondo pone la serie de la Seguridad Social junto a las cifras del Tribunal y no atribuye causa a la diferencia', () => {
    const { container } = pintar();
    const tabla = within(container).getByRole('table', {
      name: /El Fondo de Reserva a fin de año según la serie de la Seguridad Social y según el Tribunal/,
      hidden: true,
    });
    expect(tabla.querySelectorAll('tbody tr').length).toBe(4);
    const bloque = tabla.closest('.hist-definiciones');
    expectFuente(bloque ?? null);
    expect(bloque?.querySelector('.como-leerlo')).not.toBeNull();
    expect(bloque?.textContent).toMatch(/no afirma que esa partida explique toda\s+la diferencia/);
  });

  it('la tabla de clasificaciones incluye las filas de la declaración más reciente', () => {
    const { container } = pintar();
    const tabla = within(container).getByRole('table', {
      name: /Importes del mismo periodo según la clasificación de cada fuente/,
      hidden: true,
    });
    const texto = [...tabla.querySelectorAll('tbody tr')].map((tr) => tr.textContent);
    expect(
      texto.filter((t) => /Tribunal de Cuentas, declaración más reciente\)/.test(t)).length,
    ).toBe(2);
    expect(texto.length).toBeGreaterThanOrEqual(9);
  });
});

describe('página «Hucha»: liquidación frente a ejecución (Fase 5-A4)', () => {
  const seccion = (c: HTMLElement): HTMLElement => {
    const s = c.querySelector('section[aria-labelledby="contraste-liquidacion"]');
    if (!(s instanceof HTMLElement)) throw new Error('Sin la sección de contraste');
    return s;
  };

  it('tiene su encabezado, su fuente y un «Cómo leerlo» que no une las series', () => {
    const { container } = pintar();
    const s = seccion(container);
    expect(within(s).getByRole('heading', { level: 2 })).toHaveTextContent(
      /la liquidación frente a la ejecución/,
    );
    expectFuente(s);
    const total = datosHucha().contraste2025.filas.find(
      (f) => !f.coincide && /^TOTAL PRESTACIONES CONTRIBUTIVAS/.test(f.partida),
    );
    expect(s.textContent).toContain(
      `difiere en ${formatearNumero(total?.diferencia ?? Number.NaN, { decimales: 2 })} millones de euros`,
    );
    expect(s.querySelector('.como-leerlo')?.textContent).toMatch(
      /no une la liquidación a las de los ejercicios anteriores/,
    );
    expect(s.querySelector('.como-leerlo')?.textContent).toMatch(/ruptura de serie sigue rotulada/);
  });

  it('la tabla del último ejercicio tiene diferencia cero en todas las partidas', () => {
    const { container } = pintar();
    const s = seccion(container);
    const t = s.querySelector('table');
    const filasT = [...(t?.querySelectorAll('tbody tr') ?? [])].map((tr) =>
      [...tr.querySelectorAll('th, td')].map((c) => c.textContent),
    );
    expect(filasT.length).toBeGreaterThanOrEqual(8);
    for (const f of filasT) expect(f[3]).toBe('0,00');
    expect(filasT.map((f) => f[0])).toContain('Total de gastos');
  });

  it('el selector pasa al ejercicio anterior, donde hay diferencias en el capítulo 4', async () => {
    const user = userEvent.setup();
    const { container } = pintar();
    const s = seccion(container);
    const c = datosHucha().contraste2025;
    const anios = [...new Set(c.filas.map((f) => f.ejercicio))].sort();
    await user.click(within(s).getByRole('radio', { name: String(anios[0]) }));
    expect(s.querySelector('caption')?.textContent).toContain(String(anios[0]));
    expect(c.filas.filter((f) => f.ejercicio === anios[0] && !f.coincide)).toHaveLength(5);
    expect(c.filas.filter((f) => f.ejercicio === anios[1] && !f.coincide)).toHaveLength(0);
  });

  it('el Mecanismo de Equidad Intergeneracional enfrenta derechos reconocidos y dotaciones sin atribuir causa', () => {
    const { container } = pintar();
    const s = seccion(container);
    const mei = datosHucha().contraste2025.mei;
    expect(mei).toHaveLength(2);
    const t = [...s.querySelectorAll('table')].find((x) =>
      /Mecanismo de Equidad Intergeneracional/.test(x.querySelector('caption')?.textContent ?? ''),
    );
    const f = [...(t?.querySelectorAll('tbody tr') ?? [])].map((tr) =>
      [...tr.querySelectorAll('th, td')].map((c) => c.textContent),
    );
    expect(f).toHaveLength(2);
    expect(f[1]?.[1]).toBe(formatearNumero(mei[1]?.derechos ?? Number.NaN, { decimales: 2 }));
    expect(t?.closest('section')?.textContent).toMatch(/no atribuye la diferencia a ninguna causa/);
    expect(s.textContent).toMatch(/no muestra la recaudación de caja de cada mes/);
  });
});
