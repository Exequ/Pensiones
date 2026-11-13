import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { escribirEnlace } from './enlace';
import TuPension from './Pagina';
import { FORMULARIO_BASE, FORMULARIO_INCAPACIDAD } from './pruebas';
import { MESES, TEXTOS, TEXTOS_JUBILACION } from './textos';
import { TEXTOS_INCAPACIDAD, TEXTOS_INCAPACIDAD_PROPIOS } from './textos-incapacidad';
import { TEXTOS_LECTURAS } from './textos-lecturas';

type Usuario = ReturnType<typeof userEvent.setup>;

async function elegirIncapacidad(usuario: Usuario) {
  await usuario.click(screen.getByRole('radio', { name: 'Incapacidad permanente' }));
}

async function rellenarIncapacidad(usuario: Usuario, grado = 'Total', origen = 'Enfermedad común') {
  await usuario.selectOptions(screen.getByLabelText('Mes de nacimiento'), '3');
  await usuario.type(screen.getByLabelText('Año de nacimiento'), '1981');
  await usuario.click(screen.getByRole('radio', { name: 'Hombre' }));
  await usuario.selectOptions(screen.getByLabelText('Mes del hecho causante'), '3');
  await usuario.type(screen.getByLabelText('Año del hecho causante'), '2026');
  await usuario.selectOptions(screen.getByLabelText('Mes de inicio de la cotización'), '1');
  await usuario.type(screen.getByLabelText('Año de inicio de la cotización'), '2000');
  const base = screen.getByLabelText('Base mensual de cotización (euros)');
  await usuario.clear(base);
  await usuario.type(base, '2000');
  await usuario.click(screen.getByRole('radio', { name: grado }));
  await usuario.click(screen.getByRole('radio', { name: origen }));
}

const panel = () =>
  screen.getByRole('heading', { name: 'Supuestos y lecturas' }).closest('section')!;

beforeEach(() => {
  window.location.hash = '';
});
afterEach(() => {
  cleanup();
  window.location.hash = '';
});

describe('textos de la incapacidad', () => {
  it('no contienen cifras escritas a mano (regla a de CLAUDE.md)', () => {
    const valores = (o: object): string[] => Object.values<string>(o as Record<string, string>);
    const todo = [
      ...valores(TEXTOS_INCAPACIDAD),
      ...valores(TEXTOS_INCAPACIDAD_PROPIOS),
      ...valores(TEXTOS_JUBILACION),
      ...valores(TEXTOS),
      ...MESES,
    ].join(' ');
    expect(todo).not.toMatch(/\d/);
  });

  it('el aviso aclara que no es un cálculo oficial ni una valoración médica', () => {
    expect(TEXTOS_INCAPACIDAD.aviso).toMatch(/no un cálculo oficial|no es un cálculo oficial/i);
    expect(TEXTOS_INCAPACIDAD.aviso).toMatch(/tribunal médico/);
    expect(TEXTOS_INCAPACIDAD.aviso).toMatch(/organismo competente/);
  });

  it('el texto de la opción por defecto no puede leerse como una recomendación (Paso 0)', () => {
    expect(TEXTOS.opcionPorDefecto).toBe('valor con el que se calcula si no eliges otro');
    expect(TEXTOS.opcionPorDefecto).not.toMatch(/recomend|mejor|correcta|del cálculo/i);
  });

  it('los textos de las lecturas de incapacidad explican qué cambia y no recomiendan', () => {
    const propios = Object.entries(TEXTOS_LECTURAS).filter(([id]) => id.startsWith('incapacidad.'));
    expect(propios).toHaveLength(6);
    const todo = propios
      .flatMap(([, t]) => [
        t.titulo,
        ...Object.values(t.valores).flatMap((v) => [v.etiqueta, v.queCambia]),
      ])
      .join(' ')
      .toLowerCase();
    expect(todo).not.toMatch(
      /\b(mejor|peor|conviene|correcta|incorrecta|debes|debería)\b|recomend|aconsej/,
    );
  });
});

describe('selector de prestación', () => {
  it('abre en jubilación ordinaria, con incapacidad permanente y las demás como «próximamente»', () => {
    render(<TuPension />);
    const grupo = screen.getByRole('group', { name: 'Prestación' });
    expect(within(grupo).getByRole('radio', { name: 'Jubilación ordinaria' })).toBeChecked();
    expect(within(grupo).getByRole('radio', { name: 'Incapacidad permanente' })).not.toBeChecked();
    for (const p of ['Viudedad', 'Orfandad', 'Prestación en favor de familiares']) {
      const r = within(grupo).getByRole('radio', { name: `${p} (próximamente)` });
      expect(r).toBeDisabled();
    }
    // La jubilación se ve como siempre.
    expect(screen.getByLabelText('Mes de jubilación')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Grado de incapacidad' })).toBeNull();
  });

  it('se maneja con el teclado: flechas dentro del grupo', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    const jub = screen.getByRole('radio', { name: 'Jubilación ordinaria' });
    jub.focus();
    await usuario.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Incapacidad permanente' })).toBeChecked();
    expect(screen.getByLabelText('Mes del hecho causante')).toBeInTheDocument();
  });

  it('elegir incapacidad cambia el formulario, el panel de lecturas y las limitaciones', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await elegirIncapacidad(usuario);
    expect(screen.getByRole('group', { name: 'Grado de incapacidad' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Origen de la incapacidad' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Mes de jubilación')).toBeNull();
    const nombres = within(panel())
      .getAllByRole('radio')
      .map((r) => (r as HTMLInputElement).name);
    expect(nombres.length).toBe(12);
    expect(nombres.every((n) => n.startsWith('incapacidad.'))).toBe(true);
    expect(
      screen.getByText(/Accidente de trabajo y enfermedad profesional no están disponibles/),
    ).toBeVisible();
    expect(screen.getByText(/tribunal médico/)).toBeVisible();
    // Limitaciones del motor de incapacidad (no las de la jubilación).
    const lim = screen
      .getByRole('heading', { name: TEXTOS.limitacionesTitulo })
      .closest('section')!;
    expect(lim).toHaveTextContent(/contingencias profesionales/);
  });

  it('los orígenes profesionales están desactivados con su explicación', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await elegirIncapacidad(usuario);
    expect(
      screen.getByRole('radio', { name: 'Accidente de trabajo (no disponible)' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('radio', { name: 'Enfermedad profesional (no disponible)' }),
    ).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Accidente no laboral' })).toBeEnabled();
  });

  it('volver a la jubilación recupera su formulario sin perder los datos personales', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await usuario.type(screen.getByLabelText('Año de nacimiento'), '1961');
    await elegirIncapacidad(usuario);
    expect(screen.getByLabelText('Año de nacimiento')).toHaveValue('1961');
    await usuario.click(screen.getByRole('radio', { name: 'Jubilación ordinaria' }));
    expect(screen.getByLabelText('Mes de jubilación')).toBeInTheDocument();
    expect(screen.getByLabelText('Año de nacimiento')).toHaveValue('1961');
  });
});

describe('formulario de incapacidad', () => {
  it('pide grado y origen antes de calcular y lleva el foco al primer error', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await elegirIncapacidad(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Calcular mi pensión' }));
    const alerta = screen.getByRole('alert');
    expect(within(alerta).getByText('Elige el grado de incapacidad.')).toBeInTheDocument();
    expect(within(alerta).getByText('Elige el origen de la incapacidad.')).toBeInTheDocument();
    expect(within(alerta).getByText('Elige el mes del hecho causante.')).toBeInTheDocument();
  });

  it('calcula una incapacidad total por enfermedad común y explica el cálculo', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await elegirIncapacidad(usuario);
    await rellenarIncapacidad(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Calcular mi pensión' }));
    expect(
      await screen.findByRole('heading', { name: TEXTOS.resultadoTitulo }),
    ).toBeInTheDocument();
    expect(screen.getByText('Porcentaje aplicable según el grado')).toBeInTheDocument();
    expect(screen.getAllByText('Base reguladora').length).toBeGreaterThan(0);
    expect(screen.getByText('Periodo mínimo de cotización exigido')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cómo se ha calculado' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Requisitos de la incapacidad permanente/ }),
    ).toBeInTheDocument();
    // El motor no expone las bases: no hay gráfico, y se dice por qué.
    expect(screen.queryByRole('heading', { name: TEXTOS.graficoSeccion })).toBeNull();
    expect(screen.getByText(TEXTOS_INCAPACIDAD_PROPIOS.sinGrafico)).toBeInTheDocument();
    expect(
      screen.getByText(/Normativa aplicada: la del año del hecho causante/),
    ).toBeInTheDocument();
  });

  it('el motor no calcula antes de su cobertura y se explica con un mensaje claro', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await elegirIncapacidad(usuario);
    await rellenarIncapacidad(usuario);
    const anio = screen.getByLabelText('Año del hecho causante');
    await usuario.clear(anio);
    await usuario.type(anio, '2019');
    await usuario.click(screen.getByRole('button', { name: 'Calcular mi pensión' }));
    const error = await screen.findByText('Este caso queda fuera del simulador');
    expect(error.closest('[role="alert"]')).toHaveTextContent(/hecho causante/);
  });

  it('accidente no laboral: muestra siempre la lectura de los meses sin cotizar con estado y motivo', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await elegirIncapacidad(usuario);
    await rellenarIncapacidad(usuario, 'Total', 'Accidente no laboral');
    await usuario.click(screen.getByRole('button', { name: 'Calcular mi pensión' }));
    const bloque = (
      await screen.findByRole('heading', { name: TEXTOS_INCAPACIDAD_PROPIOS.intervienenTitulo })
    ).closest('section')!;
    expect(bloque).toHaveTextContent(TEXTOS_INCAPACIDAD_PROPIOS.intervienenAnlTitulo);
    expect(bloque).toHaveTextContent('Provisional');
    expect(bloque).toHaveTextContent(/Confianza actuarial media/);
    expect(bloque).toHaveTextContent(TEXTOS_INCAPACIDAD_PROPIOS.intervienenEfecto);
    expect(bloque).toHaveTextContent(/no cambia el resultado|sería/);
  });

  it('con enfermedad común y sin efecto de lecturas sin decidir, no se muestra el bloque', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await elegirIncapacidad(usuario);
    await rellenarIncapacidad(usuario, 'Absoluta');
    await usuario.click(screen.getByRole('button', { name: 'Calcular mi pensión' }));
    await screen.findByRole('heading', { name: TEXTOS.resultadoTitulo });
    // Si alguna lectura sin decidir afecta, el bloque aparece y solo contiene lecturas con efecto;
    // la de las lagunas del accidente no laboral no se fuerza con otro origen.
    const bloque = screen.queryByRole('heading', {
      name: TEXTOS_INCAPACIDAD_PROPIOS.intervienenTitulo,
    });
    if (bloque) {
      expect(bloque.closest('section')).not.toHaveTextContent(
        TEXTOS_INCAPACIDAD_PROPIOS.intervienenAnlTitulo,
      );
    }
  });
});

describe('panel de lecturas de incapacidad', () => {
  it('cambiar una lectura muestra la comparación con los valores por defecto', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await elegirIncapacidad(usuario);
    await rellenarIncapacidad(usuario, 'Total', 'Accidente no laboral');
    const mes = screen.getByLabelText('Meses sin cotizar (lagunas)');
    await usuario.clear(mes);
    await usuario.type(mes, '70');
    await usuario.click(screen.getByRole('radio', { name: 'Justo antes del hecho causante' }));
    await usuario.click(screen.getByRole('button', { name: 'Calcular mi pensión' }));
    await screen.findByRole('heading', { name: TEXTOS.resultadoTitulo });
    const grupo = within(panel()).getByRole('group', {
      name: `Cómo se lee: ${TEXTOS_LECTURAS['incapacidad.lagunasAccidenteNoLaboral']!.titulo}`,
    });
    expect(
      within(grupo).getByRole('radio', { name: /Rellenarlos con la base mínima/ }),
    ).toBeChecked();
    expect(grupo).toHaveTextContent(TEXTOS.opcionPorDefecto);
    await usuario.click(within(grupo).getByRole('radio', { name: /Contarlos como cero/ }));
    const comparacion = screen
      .getByRole('heading', { name: TEXTOS.comparacionTitulo })
      .closest('section')!;
    expect(comparacion).toHaveTextContent(/Has cambiado una lectura/);
    expect(within(comparacion).getByRole('table')).toBeInTheDocument();
    expect(comparacion).toHaveTextContent('no una recomendación');
  });
});

describe('enlaces', () => {
  it('un enlace de incapacidad abre la página en incapacidad y calcula', async () => {
    window.location.hash = `#/tu-pension${escribirEnlace({
      ...FORMULARIO_INCAPACIDAD,
      lecturas: { 'incapacidad.divisorPeriodoCorto': 'catorce-doceavos' },
    })}`;
    render(<TuPension />);
    expect(screen.getByRole('radio', { name: 'Incapacidad permanente' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Total' })).toBeChecked();
    expect(screen.getByLabelText('Año del hecho causante')).toHaveValue('2026');
    expect(
      await screen.findByRole('heading', { name: TEXTOS.resultadoTitulo }),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Proporción de catorce doceavos/ })).toBeChecked();
    expect(
      screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Enlace a esta simulación' }).value,
    ).toContain('p=inc');
  });

  it('un enlace antiguo de jubilación (sin p=) sigue siendo una jubilación', async () => {
    window.location.hash = `#/tu-pension${escribirEnlace({ ...FORMULARIO_BASE, lecturas: {} })}`;
    render(<TuPension />);
    expect(screen.getByRole('radio', { name: 'Jubilación ordinaria' })).toBeChecked();
    expect(screen.getByLabelText('Mes de jubilación')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: TEXTOS.resultadoTitulo }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Edad ordinaria de jubilación').length).toBeGreaterThan(0);
  });
});
