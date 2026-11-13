import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { escribirEnlace } from './enlace';
import TuPension from './Pagina';
import { FORMULARIO_BASE } from './pruebas';
import { TEXTOS } from './textos';

async function rellenar(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.selectOptions(screen.getByLabelText('Mes de nacimiento'), '11');
  await usuario.type(screen.getByLabelText('Año de nacimiento'), '1961');
  await usuario.click(screen.getByRole('radio', { name: 'Hombre' }));
  await usuario.selectOptions(screen.getByLabelText('Mes de jubilación'), '11');
  await usuario.type(screen.getByLabelText('Año de jubilación'), '2026');
  await usuario.selectOptions(screen.getByLabelText('Mes de inicio de la cotización'), '11');
  await usuario.type(screen.getByLabelText('Año de inicio de la cotización'), '1986');
  const base = screen.getByLabelText('Base mensual de cotización (euros)');
  await usuario.clear(base);
  await usuario.type(base, '2500');
}

const panel = () =>
  screen.getByRole('heading', { name: 'Supuestos y lecturas' }).closest('section')!;
const grupo = (titulo: string) =>
  within(panel()).getByRole('group', { name: `Cómo se lee: ${titulo}` });
const FACTOR = 'Factor de actualización de las bases cuando los precios han bajado';
const INTERPOLACION = 'Índice de precios de cada mes';

beforeEach(() => {
  window.location.hash = '';
});
afterEach(() => {
  cleanup();
  window.location.hash = '';
});

describe('selector de lecturas', () => {
  it('cada lectura es un grupo de opciones etiquetadas, con la de por defecto marcada y señalada', () => {
    render(<TuPension />);
    const g = grupo(FACTOR);
    const opciones = within(g).getAllByRole('radio');
    expect(opciones).toHaveLength(2);
    const porDefecto = within(g).getByRole('radio', { name: /Con suelo igual a uno/ });
    expect(porDefecto).toBeChecked();
    expect(g).toHaveTextContent(TEXTOS.opcionPorDefecto);
    // Cada opción describe qué cambia en el cálculo.
    expect(within(g).getByRole('radio', { name: /Sin suelo/ })).toHaveAccessibleDescription(
      /la base se reduce/,
    );
    // Conserva lo que ya mostraba: estado en texto, motivo y descripción en lenguaje llano.
    const item = g.closest('li')!;
    expect(item).toHaveTextContent(/Estado: Provisional/);
    expect(item).toHaveTextContent(/Motivo del registro/);
  });

  it('solo se ofrecen lecturas de la jubilación, sin alternativas inventadas', () => {
    render(<TuPension />);
    const nombres = within(panel())
      .getAllByRole('radio')
      .map((r) => (r as HTMLInputElement).name);
    expect(nombres.length).toBeGreaterThan(10);
    expect(nombres.every((n) => n.startsWith('jubilacion.'))).toBe(true);
    // La interpolación del IPC tiene tres valores en el registro: se ofrecen los tres.
    expect(within(grupo(INTERPOLACION)).getAllByRole('radio')).toHaveLength(3);
  });

  it('sin resultado, elegir guarda la elección; el bloque de comparación aparece al calcular', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await usuario.click(within(grupo(FACTOR)).getByRole('radio', { name: /Sin suelo/ }));
    expect(within(grupo(FACTOR)).getByRole('radio', { name: /Sin suelo/ })).toBeChecked();
    expect(screen.queryByRole('heading', { name: TEXTOS.comparacionTitulo })).toBeNull();
    await rellenar(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Calcular mi pensión' }));
    expect(
      await screen.findByRole('heading', { name: TEXTOS.comparacionTitulo }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Has cambiado una lectura/)).toBeInTheDocument();
  });

  it('cambiar una lectura con resultado muestra la comparación, anuncia el cambio y no mueve el foco', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await rellenar(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Calcular mi pensión' }));
    await screen.findByRole('heading', { name: 'Tu pensión estimada' });
    // Con las lecturas por defecto no hay diferencia que mostrar.
    const bloque = screen
      .getByRole('heading', { name: TEXTOS.comparacionTitulo })
      .closest('section')!;
    expect(bloque).toHaveTextContent(TEXTOS.comparacionSinCambios);
    expect(within(bloque).queryByRole('table')).toBeNull();
    const estado = within(bloque).getByRole('status');
    expect(estado).toHaveAttribute('aria-live', 'polite');

    const alternativa = within(grupo(INTERPOLACION)).getByRole('radio', {
      name: /Medias anuales en escalones/,
    });
    await usuario.click(alternativa);
    expect(alternativa).toBeChecked();
    expect(alternativa).toHaveFocus();
    await waitFor(() => {
      expect(within(bloque).getByRole('status')).toHaveTextContent(/Has cambiado una lectura/);
    });
    expect(within(bloque).getByRole('status')).toHaveTextContent(
      /«Índice de precios de cada mes» \(de «Índice mensual publicado por el INE» a «Medias anuales en escalones»\)/,
    );
    const tabla = within(bloque).getByRole('table');
    expect(
      within(tabla)
        .getAllByRole('columnheader')
        .map((c) => c.textContent),
    ).toEqual([
      TEXTOS.comparacionConcepto,
      TEXTOS.comparacionConTusLecturas,
      TEXTOS.comparacionPorDefecto,
      TEXTOS.comparacionDiferenciaEuros,
      TEXTOS.comparacionDiferenciaPorcentaje,
    ]);
    const filas = within(tabla).getAllByRole('row').slice(1);
    expect(filas).toHaveLength(2);
    const celdas = within(filas[0]!).getAllByRole('cell');
    expect(celdas).toHaveLength(4);
    expect(celdas[1]?.textContent).toMatch(/2\.721,39\s€/); // pensión con las lecturas por defecto
    expect(celdas[2]?.textContent).toMatch(/^[+-]\d.*€$/); // diferencia con signo
    expect(bloque).toHaveTextContent(TEXTOS.comparacionNota);
  });

  it('restablecer devuelve todas las lecturas al valor por defecto y quita la diferencia', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await rellenar(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Calcular mi pensión' }));
    await screen.findByRole('heading', { name: 'Tu pensión estimada' });
    const pensionInicial = document.querySelector('.tp-cifra-principal dd')?.textContent;
    await usuario.click(within(grupo(INTERPOLACION)).getByRole('radio', { name: /escalones/ }));
    await usuario.click(within(grupo(FACTOR)).getByRole('radio', { name: /Sin suelo/ }));
    const bloque = screen
      .getByRole('heading', { name: TEXTOS.comparacionTitulo })
      .closest('section')!;
    await waitFor(() => {
      expect(within(bloque).getByRole('status')).toHaveTextContent(/Has cambiado 2 lecturas/);
    });
    await usuario.click(screen.getByRole('button', { name: TEXTOS.restablecerLecturas }));
    expect(
      within(grupo(INTERPOLACION)).getByRole('radio', { name: /Índice mensual/ }),
    ).toBeChecked();
    expect(
      within(grupo(FACTOR)).getByRole('radio', { name: /Con suelo igual a uno/ }),
    ).toBeChecked();
    await waitFor(() => {
      expect(within(bloque).getByRole('status')).toHaveTextContent(TEXTOS.lecturasRestablecidas);
    });
    expect(within(bloque).queryByRole('table')).toBeNull();
    expect(document.querySelector('.tp-cifra-principal dd')?.textContent).toBe(pensionInicial);
  });

  it('el estado de la lectura se muestra como información, sin lenguaje de consejo', () => {
    render(<TuPension />);
    expect(panel()).toHaveTextContent(TEXTOS.supuestosEstadoNota);
    const lecturas = panel().querySelector('.tp-lecturas')!.textContent.toLowerCase();
    expect(lecturas).not.toMatch(/\b(correcta|recomendada|aconsejable|mejor|peor)\b/);
  });
});

describe('enlace compartible', () => {
  it('muestra un campo con el enlace, la frase de privacidad y el botón «Copiar enlace»', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await rellenar(usuario);
    await usuario.click(within(grupo(FACTOR)).getByRole('radio', { name: /Sin suelo/ }));
    const campo = screen.getByLabelText<HTMLTextAreaElement>(TEXTOS.enlaceCampo);
    expect(campo).toHaveAttribute('readonly');
    expect(campo.value).toMatch(/#\/tu-pension\?v=1&nac=1961-11&jub=2026-11/);
    expect(campo.value).toContain('lec=jubilacion.actualizacionFactorMinimo:sin-suelo');
    expect(campo).toHaveAccessibleDescription(TEXTOS.enlacePrivacidad);
  });

  it('«Copiar enlace» lo copia y lo confirma en una región aria-live', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await rellenar(usuario);
    await usuario.click(screen.getByRole('button', { name: TEXTOS.enlaceCopiar }));
    expect(await navigator.clipboard.readText()).toBe(
      screen.getByLabelText<HTMLTextAreaElement>(TEXTOS.enlaceCampo).value,
    );
    const estado = await screen.findByText(TEXTOS.enlaceCopiado);
    expect(estado.closest('[aria-live]')).toHaveAttribute('aria-live', 'polite');
  });

  it('si el portapapeles falla, lo dice y deja el enlace seleccionado', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    const original = Object.getOwnPropertyDescriptor(navigator.clipboard, 'writeText');
    Object.defineProperty(navigator.clipboard, 'writeText', {
      configurable: true,
      value: () => Promise.reject(new Error('sin permiso')),
    });
    await usuario.click(screen.getByRole('button', { name: TEXTOS.enlaceCopiar }));
    expect(await screen.findByText(TEXTOS.enlaceNoCopiado)).toBeInTheDocument();
    if (original) Object.defineProperty(navigator.clipboard, 'writeText', original);
  });

  it('al abrir un enlace válido, el formulario se rellena y se calcula', async () => {
    window.location.hash = `#/tu-pension${escribirEnlace({ ...FORMULARIO_BASE, lecturas: {} })}`;
    render(<TuPension />);
    expect(screen.getByLabelText('Año de nacimiento')).toHaveValue('1961');
    expect(screen.getByLabelText('Base mensual de cotización (euros)')).toHaveValue('2500');
    expect(await screen.findByRole('heading', { name: 'Tu pensión estimada' })).toBeInTheDocument();
    expect(screen.getAllByText(/2\.721,39/).length).toBeGreaterThan(0);
    expect(screen.queryByText(TEXTOS.enlaceAvisoTitulo)).toBeNull();
  });

  it('al abrir un enlace con lecturas alternativas, las marca y muestra la comparación', async () => {
    window.location.hash = `#/tu-pension${escribirEnlace({
      ...FORMULARIO_BASE,
      lecturas: { 'jubilacion.interpolacionIPC': 'escalon-anual' },
    })}`;
    render(<TuPension />);
    await screen.findByRole('heading', { name: 'Tu pensión estimada' });
    expect(
      within(grupo(INTERPOLACION)).getByRole('radio', { name: /Medias anuales en escalones/ }),
    ).toBeChecked();
    expect(screen.getByText(/Has cambiado una lectura/)).toBeInTheDocument();
  });

  it('enlace inválido: la página carga con los valores por defecto y avisa de qué se ignoró', () => {
    window.location.hash = '#/tu-pension?v=1&nac=1961-13&lec=jubilacion.noExiste:x&base=abc';
    render(<TuPension />);
    const aviso = screen.getByRole('heading', { name: TEXTOS.enlaceAvisoTitulo }).closest('aside')!;
    expect(within(aviso).getAllByRole('listitem')).toHaveLength(3);
    expect(aviso).toHaveTextContent(/fecha de nacimiento/);
    expect(aviso).toHaveTextContent(/jubilacion\.noExiste.*no existe en el registro/);
    expect(aviso).toHaveTextContent(/base mensual/);
    // Valores por defecto en lo ignorado y sin resultado (faltan fechas).
    expect(screen.getByLabelText('Año de nacimiento')).toHaveValue('');
    expect(screen.getByLabelText('Base mensual de cotización (euros)')).toHaveValue('2286,22');
    expect(screen.queryByRole('heading', { name: 'Tu pensión estimada' })).toBeNull();
    expect(screen.getByText(TEXTOS.sinResultado)).toBeInTheDocument();
  });

  it('pegar otro enlace en la misma pestaña lo aplica sin recargar', async () => {
    render(<TuPension />);
    expect(screen.getByLabelText('Año de nacimiento')).toHaveValue('');
    act(() => {
      window.location.hash = `#/tu-pension${escribirEnlace({ ...FORMULARIO_BASE, lecturas: {} })}`;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(await screen.findByRole('heading', { name: 'Tu pensión estimada' })).toBeInTheDocument();
    expect(screen.getByLabelText('Año de nacimiento')).toHaveValue('1961');
  });

  it('versión desconocida: se ignora el enlace entero y se avisa', () => {
    window.location.hash = '#/tu-pension?v=9&nac=1961-11&jub=2026-11';
    render(<TuPension />);
    expect(screen.getByRole('heading', { name: TEXTOS.enlaceAvisoTitulo })).toBeInTheDocument();
    expect(screen.getByText(/versión del formato que esta página no conoce/)).toBeInTheDocument();
    expect(screen.getByLabelText('Año de nacimiento')).toHaveValue('');
    expect(screen.queryByRole('heading', { name: 'Tu pensión estimada' })).toBeNull();
  });
});
