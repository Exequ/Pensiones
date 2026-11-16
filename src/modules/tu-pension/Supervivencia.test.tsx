import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { formatearEuros } from '../../engine/formato';
import { escribirEnlace } from './enlace';
import TuPension from './Pagina';
import { FORMULARIO_ORFANDAD, FORMULARIO_VIUDEDAD } from './pruebas';
import { MESES, TEXTOS } from './textos';
import { TEXTOS_ORFANDAD, TEXTOS_SUPERVIVENCIA, TEXTOS_VIUDEDAD } from './textos-supervivencia';

type Usuario = ReturnType<typeof userEvent.setup>;

/** El texto de la pantalla se normaliza (el espacio de no separación pasa a espacio): el patrón también. */
const euros = (v: number): string => formatearEuros(v, { decimales: 2 }).replace(/\u00a0/g, ' ');
const grupo = (nombre: string) => screen.getByRole('group', { name: nombre });
const panel = () =>
  screen.getByRole('heading', { name: 'Supuestos y lecturas' }).closest('section')!;

async function elegirPrestacion(usuario: Usuario, nombre: 'Viudedad' | 'Orfandad') {
  await usuario.click(screen.getByRole('radio', { name: nombre }));
}

async function rellenarCausante(usuario: Usuario, anio = '2026') {
  await usuario.selectOptions(screen.getByLabelText('Mes del fallecimiento'), '3');
  await usuario.type(screen.getByLabelText('Año del fallecimiento'), anio);
  await usuario.click(
    within(grupo('Causa de la muerte')).getByRole('radio', { name: 'Enfermedad común' }),
  );
  await usuario.click(
    within(grupo('Situación de la persona fallecida')).getByRole('radio', {
      name: 'En alta o situación asimilada',
    }),
  );
  await usuario.selectOptions(screen.getByLabelText('Mes de inicio de la cotización'), '1');
  await usuario.type(screen.getByLabelText('Año de inicio de la cotización'), '2010');
  const base = screen.getByLabelText('Base mensual de cotización (euros)');
  await usuario.clear(base);
  await usuario.type(base, '2000');
}

async function rellenarViudo(usuario: Usuario) {
  await usuario.click(
    within(grupo('Vínculo con la persona fallecida')).getByRole('radio', { name: 'Cónyuge' }),
  );
  await usuario.selectOptions(screen.getByLabelText('Mes de nacimiento de la persona viuda'), '5');
  await usuario.type(screen.getByLabelText('Año de nacimiento de la persona viuda'), '1976');
  await usuario.click(
    within(grupo('Sexo de la persona viuda')).getByRole('radio', { name: 'Hombre' }),
  );
  await usuario.selectOptions(screen.getByLabelText('Mes del matrimonio'), '6');
  await usuario.type(screen.getByLabelText('Año del matrimonio'), '2005');
}

async function rellenarHuerfano(usuario: Usuario) {
  await usuario.selectOptions(screen.getByLabelText('Mes de nacimiento'), '1');
  await usuario.type(screen.getByLabelText('Año de nacimiento'), '2016');
}

beforeEach(() => {
  window.location.hash = '';
});
afterEach(() => {
  cleanup();
  window.location.hash = '';
});

describe('textos de la viudedad y la orfandad', () => {
  it('no contienen cifras escritas a mano (regla a de CLAUDE.md)', () => {
    const valores = (o: unknown): string[] => {
      if (typeof o === 'string') return [o];
      if (typeof o === 'object' && o !== null) return Object.values(o).flatMap(valores);
      return [];
    };
    const todo = [
      ...valores(TEXTOS_SUPERVIVENCIA),
      ...valores(TEXTOS_VIUDEDAD),
      ...valores(TEXTOS_ORFANDAD),
      ...valores(TEXTOS),
      ...MESES,
    ].join(' ');
    expect(todo).not.toMatch(/\d/);
  });

  it('el aviso aclara que no es un cálculo oficial y que los datos los escribe la persona', () => {
    expect(TEXTOS_VIUDEDAD.aviso).toMatch(/no un cálculo oficial|no es un cálculo oficial/i);
    expect(TEXTOS_ORFANDAD.aviso).toMatch(/aquí son datos que escribes tú/);
  });

  it('no usan lenguaje de consejo ni de lectura correcta', () => {
    const textos: string[] = [];
    for (const v of Object.values(TEXTOS_SUPERVIVENCIA)) if (typeof v === 'string') textos.push(v);
    textos.push(TEXTOS_VIUDEDAD.supuestosIntro, TEXTOS_ORFANDAD.supuestosIntro);
    const todo = textos.join(' ').toLowerCase();
    expect(todo).not.toMatch(/\b(mejor|peor|conviene|debes|debería)\b|recomend|aconsej/);
  });
});

describe('selector de prestación con viudedad y orfandad', () => {
  it('viudedad y orfandad son opciones activas y el resto sigue como «próximamente»', () => {
    render(<TuPension />);
    const g = screen.getByRole('group', { name: 'Prestación' });
    expect(within(g).getByRole('radio', { name: 'Viudedad' })).toBeEnabled();
    expect(within(g).getByRole('radio', { name: 'Orfandad' })).toBeEnabled();
    expect(
      within(g).getByRole('radio', { name: 'Prestación en favor de familiares (próximamente)' }),
    ).toBeDisabled();
  });

  it('elegir viudedad cambia el formulario, el panel de lecturas y las limitaciones', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await elegirPrestacion(usuario, 'Viudedad');
    expect(screen.getByLabelText('Mes del fallecimiento')).toBeInTheDocument();
    expect(screen.queryByLabelText('Mes de jubilación')).toBeNull();
    expect(screen.queryByLabelText('Mes de nacimiento')).toBeNull();
    expect(
      screen.getByRole('group', { name: 'Vínculo con la persona fallecida' }),
    ).toBeInTheDocument();
    const nombres = [
      ...new Set(
        within(panel())
          .getAllByRole('radio')
          .map((r) => (r as HTMLInputElement).name),
      ),
    ];
    // Cinco lecturas de supervivencia que cambian la viudedad (las de familiares no se ofrecen).
    expect(nombres).toHaveLength(5);
    expect(nombres.every((n) => n.startsWith('supervivencia.'))).toBe(true);
    expect(nombres).not.toContain('supervivencia.carenciaOrfandad');
    const lim = screen
      .getByRole('heading', { name: TEXTOS.limitacionesTitulo })
      .closest('section')!;
    expect(lim).toHaveTextContent(/DT 13\.ª/);
    expect(lim).not.toHaveTextContent(/anticipada/);
  });

  it('elegir orfandad ofrece las lecturas de la orfandad y el formulario del huérfano', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await elegirPrestacion(usuario, 'Orfandad');
    expect(
      screen.getByRole('group', { name: '¿Estás incapacitado para el trabajo?' }),
    ).toBeInTheDocument();
    const nombres = [
      ...new Set(
        within(panel())
          .getAllByRole('radio')
          .map((r) => (r as HTMLInputElement).name),
      ),
    ];
    expect(nombres).toHaveLength(4);
    expect(nombres).toContain('supervivencia.carenciaOrfandad');
    expect(nombres).not.toContain('supervivencia.reduccionViudedad70');
  });
});

describe('flujo de la viudedad', () => {
  it('pide los datos antes de calcular y lleva a los errores, en español', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await elegirPrestacion(usuario, 'Viudedad');
    await usuario.click(screen.getByRole('button', { name: 'Calcular mi pensión' }));
    const alerta = screen.getByRole('alert');
    expect(within(alerta).getByText('Elige la causa de la muerte.')).toBeInTheDocument();
    expect(
      within(alerta).getByText('Elige la situación de la persona fallecida.'),
    ).toBeInTheDocument();
    expect(within(alerta).getByText('Elige el mes del fallecimiento.')).toBeInTheDocument();
    expect(
      within(alerta).getByText('Elige tu vínculo con la persona fallecida.'),
    ).toBeInTheDocument();
  });

  it('las preguntas aparecen según el vínculo y la situación', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await elegirPrestacion(usuario, 'Viudedad');
    const vinculo = grupo('Vínculo con la persona fallecida');
    await usuario.click(within(vinculo).getByRole('radio', { name: 'Cónyuge' }));
    expect(screen.getByLabelText('Mes del matrimonio')).toBeInTheDocument();
    expect(screen.queryByLabelText('Meses de convivencia estable e ininterrumpida')).toBeNull();
    await usuario.click(within(vinculo).getByRole('radio', { name: 'Pareja de hecho' }));
    expect(screen.queryByLabelText('Mes del matrimonio')).toBeNull();
    expect(
      screen.getByLabelText('Meses de convivencia estable e ininterrumpida'),
    ).toBeInTheDocument();
    await usuario.click(within(vinculo).getByRole('radio', { name: 'Excónyuge' }));
    expect(
      screen.getByLabelText('Pensión compensatoria anual que se extingue con la muerte (€)'),
    ).toBeInTheDocument();
    // Cargas familiares: los datos de la unidad solo salen al responder que sí.
    expect(screen.queryByLabelText('Personas de la unidad familiar (contigo)')).toBeNull();
    await usuario.click(
      within(grupo('¿Tienes cargas familiares?')).getByRole('radio', { name: 'Sí' }),
    );
    expect(screen.getByLabelText('Personas de la unidad familiar (contigo)')).toBeInTheDocument();
    // Causante pensionista: se pide su pensión y desaparece la carrera.
    expect(screen.getByLabelText('Mes de inicio de la cotización')).toBeInTheDocument();
    await usuario.click(
      within(grupo('Situación de la persona fallecida')).getByRole('radio', {
        name: 'Pensionista de jubilación o de incapacidad permanente',
      }),
    );
    expect(screen.queryByLabelText('Mes de inicio de la cotización')).toBeNull();
    expect(screen.getByLabelText('Base reguladora mensual de su pensión (€)')).toBeInTheDocument();
  });

  it('calcula el cónyuge de 49 años: 52 % y explica el cálculo con la sección de lecturas', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await elegirPrestacion(usuario, 'Viudedad');
    await rellenarCausante(usuario);
    await rellenarViudo(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Calcular mi pensión' }));
    expect(
      await screen.findByRole('heading', { name: TEXTOS.resultadoTitulo }),
    ).toBeInTheDocument();
    // BR 24 × 2.000 / 28 = 1.714,29; 52 % = 891,43.
    expect(screen.getAllByText(euros(891.43)).length).toBeGreaterThan(0);
    expect(screen.getByText('Porcentaje aplicado de la base reguladora')).toBeInTheDocument();
    expect(screen.getAllByText('Base reguladora de la persona fallecida').length).toBeGreaterThan(
      0,
    );
    expect(screen.getByRole('heading', { name: 'Cómo se ha calculado' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Requisitos de la viudedad' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Lecturas abiertas que intervienen en tu resultado' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Ninguna de las lecturas abiertas de esta prestación cambia/),
    ).toBeInTheDocument();
    expect(screen.getByText(/no incluye el gráfico de bases/)).toBeInTheDocument();
  });

  it('muestra la lectura que interviene, con su estado, el motivo y el efecto de la alternativa', async () => {
    const usuario = userEvent.setup();
    window.location.hash = `#/tu-pension${escribirEnlace({
      ...FORMULARIO_VIUDEDAD,
      aplicarMinimos: false,
      supervivencia: {
        ...FORMULARIO_VIUDEDAD.supervivencia,
        viudo: {
          ...FORMULARIO_VIUDEDAD.supervivencia.viudo,
          vinculo: 'excónyuge',
          compensatoriaAnual: '6000',
        },
      },
    })}`;
    render(<TuPension />);
    const bloque = (
      await screen.findByRole('heading', {
        name: 'Lecturas abiertas que intervienen en tu resultado',
      })
    ).closest('section')!;
    expect(
      within(bloque).getByText('Comparación de la viudedad con la pensión compensatoria'),
    ).toBeVisible();
    expect(bloque).toHaveTextContent('Estado');
    expect(bloque).toHaveTextContent('Efecto de la alternativa');
    expect(bloque).toHaveTextContent(/500,00/);
    expect(bloque).not.toHaveTextContent(/\b(mejor|peor|conviene|debes)\b/i);
    // Cambiarla en el panel actualiza el resultado y la comparación.
    const g = within(panel()).getByRole('group', {
      name: 'Cómo se lee: Comparación de la viudedad con la pensión compensatoria',
    });
    await usuario.click(within(g).getByRole('radio', { name: /En importes mensuales/ }));
    expect(screen.getAllByText(euros(500)).length).toBeGreaterThan(0);
    expect(screen.getByText('Con tus lecturas y con las lecturas por defecto')).toBeInTheDocument();
  });

  it('un fallecimiento anterior al primer año que cubre el cálculo da el mensaje, sin cifras', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await elegirPrestacion(usuario, 'Viudedad');
    await rellenarCausante(usuario, '2018');
    await usuario.clear(screen.getByLabelText('Año de inicio de la cotización'));
    await usuario.type(screen.getByLabelText('Año de inicio de la cotización'), '2000');
    await usuario.click(
      within(grupo('Vínculo con la persona fallecida')).getByRole('radio', {
        name: 'Pareja de hecho',
      }),
    );
    await usuario.selectOptions(
      screen.getByLabelText('Mes de nacimiento de la persona viuda'),
      '5',
    );
    await usuario.type(screen.getByLabelText('Año de nacimiento de la persona viuda'), '1976');
    await usuario.click(
      within(grupo('Sexo de la persona viuda')).getByRole('radio', { name: 'Mujer' }),
    );
    await usuario.type(
      screen.getByLabelText('Meses de convivencia estable e ininterrumpida'),
      '80',
    );
    await usuario.click(screen.getByRole('button', { name: 'Calcular mi pensión' }));
    const aviso = await screen.findByRole('alert');
    expect(aviso).toHaveTextContent('Fallecimiento anterior al periodo que calcula el simulador');
    expect(aviso).toHaveTextContent('2018');
    expect(aviso).toHaveTextContent(/parejas de hecho/);
    expect(aviso).toHaveTextContent(/no los sustituye por otros ni los estima/);
    expect(screen.queryByRole('heading', { name: 'Cómo se ha calculado' })).toBeNull();
  });
});

describe('flujo de la orfandad', () => {
  it('calcula un huérfano de 10 años: 20 %', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await elegirPrestacion(usuario, 'Orfandad');
    await rellenarCausante(usuario);
    await rellenarHuerfano(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Calcular mi pensión' }));
    expect(
      await screen.findByRole('heading', { name: TEXTOS.resultadoTitulo }),
    ).toBeInTheDocument();
    // 20 % × 1.714,29 = 342,86.
    expect(screen.getAllByText(euros(342.86)).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Requisitos de la orfandad' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Reparto entre los beneficiarios/ })).toBeNull();
  });

  it('con cónyuge superviviente y otros huérfanos muestra el reparto entre beneficiarios', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await elegirPrestacion(usuario, 'Orfandad');
    await rellenarCausante(usuario);
    await rellenarHuerfano(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Añadir huérfano' }));
    await usuario.selectOptions(screen.getByLabelText('Mes de nacimiento del huérfano 1'), '6');
    await usuario.type(screen.getByLabelText('Año de nacimiento del huérfano 1'), '2013');
    await usuario.click(
      within(grupo('¿Sobrevive un cónyuge o pareja con derecho a viudedad?')).getByRole('radio', {
        name: 'Sí',
      }),
    );
    await rellenarViudo(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Calcular mi pensión' }));
    const reparto = (
      await screen.findByRole('heading', {
        name: 'Reparto entre los beneficiarios del mismo causante',
      })
    ).closest('section')!;
    // Viudedad 52 % = 891,43; orfandades 20 % = 342,86 cada una: suma 1.577,14 ≤ 1.714,29.
    expect(within(reparto).getByText('Tu orfandad')).toBeInTheDocument();
    expect(
      within(reparto).getByText('Viudedad del cónyuge o pareja superviviente'),
    ).toBeInTheDocument();
    expect(within(reparto).getByText('Orfandad de otro huérfano (n.º 1)')).toBeInTheDocument();
    expect(within(reparto).getAllByText(`${euros(342.86)} al mes`)).toHaveLength(2);
  });

  it('un huérfano de 36 años sin incapacidad no cumple la edad: sin pensión y con los requisitos', async () => {
    const usuario = userEvent.setup();
    window.location.hash = `#/tu-pension${escribirEnlace({
      ...FORMULARIO_ORFANDAD,
      supervivencia: {
        ...FORMULARIO_ORFANDAD.supervivencia,
        huerfano: {
          ...FORMULARIO_ORFANDAD.supervivencia.huerfano,
          nacimientoMes: '4',
          nacimientoAnio: '1990',
        },
      },
    })}`;
    render(<TuPension />);
    expect(
      await screen.findByText(/no se cumplen los requisitos de la orfandad/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Requisitos de la orfandad' })).toBeInTheDocument();
    expect(usuario).toBeDefined();
  });
});

describe('enlace compartible de viudedad y orfandad', () => {
  it('un enlace de viudedad rellena el formulario y calcula el resultado', async () => {
    window.location.hash = `#/tu-pension${escribirEnlace(FORMULARIO_VIUDEDAD)}`;
    render(<TuPension />);
    expect(
      await screen.findByRole('heading', { name: TEXTOS.resultadoTitulo }),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Viudedad' })).toBeChecked();
    expect(screen.getByLabelText('Año del fallecimiento')).toHaveValue('2026');
    expect(screen.getAllByText(euros(891.43)).length).toBeGreaterThan(0);
    const campo = screen.getByLabelText<HTMLInputElement>('Enlace a esta simulación');
    expect(campo.value).toContain('#/tu-pension?v=1&p=viu&hc=2026-03');
  });

  it('un enlace de orfandad rellena el formulario y calcula el resultado', async () => {
    window.location.hash = `#/tu-pension${escribirEnlace(FORMULARIO_ORFANDAD)}`;
    render(<TuPension />);
    expect(
      await screen.findByRole('heading', { name: TEXTOS.resultadoTitulo }),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Orfandad' })).toBeChecked();
    expect(screen.getAllByText(euros(342.86)).length).toBeGreaterThan(0);
    const campo = screen.getByLabelText<HTMLInputElement>('Enlace a esta simulación');
    expect(campo.value).toContain('p=orf');
  });

  it('un enlace de supervivencia con valores no válidos avisa de lo ignorado y no falla', async () => {
    window.location.hash =
      '#/tu-pension?v=1&p=viu&hc=2026-03&or=ec&sit=alt&vin=con&vnc=1976-13&vsx=x';
    render(<TuPension />);
    expect(await screen.findByText('Qué se ha ignorado del enlace')).toBeInTheDocument();
    expect(screen.getByText(/fecha de nacimiento de la persona viuda/)).toBeInTheDocument();
  });
});

describe('lecturas de jubilación que rigen en la viudedad', () => {
  it('la nota plegable lista las tres que fijan los límites con su valor y estado', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await elegirPrestacion(usuario, 'Viudedad');
    const nota = screen.getByText('Qué lecturas de jubilación se aplican aquí').closest('details')!;
    expect(within(nota).getAllByRole('listitem')).toHaveLength(3);
    expect(nota).toHaveTextContent('Base máxima de cotización en los años futuros');
    expect(nota).not.toHaveTextContent('Índice de precios de cada mes');
  });
});
