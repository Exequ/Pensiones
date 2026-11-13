import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Field } from '../../components/Field';
import { SECCIONES } from '../secciones';
import TuPension from './Pagina';
import { MESES, TEXTOS } from './textos';

async function rellenar(usuario: ReturnType<typeof userEvent.setup>, anioJubilacion = '2026') {
  await usuario.selectOptions(screen.getByLabelText('Mes de nacimiento'), '11');
  await usuario.type(screen.getByLabelText('Año de nacimiento'), '1961');
  await usuario.click(screen.getByRole('radio', { name: 'Hombre' }));
  await usuario.selectOptions(screen.getByLabelText('Mes de jubilación'), '11');
  await usuario.type(screen.getByLabelText('Año de jubilación'), anioJubilacion);
  await usuario.selectOptions(screen.getByLabelText('Mes de inicio de la cotización'), '11');
  await usuario.type(screen.getByLabelText('Año de inicio de la cotización'), '1986');
  const base = screen.getByLabelText('Base mensual de cotización (euros)');
  await usuario.clear(base);
  await usuario.type(base, '2500');
}

describe('textos de la página', () => {
  it('no contienen cifras escritas a mano', () => {
    const textos = [...Object.values(TEXTOS), ...MESES].join(' ');
    expect(textos).not.toMatch(/\d/);
    const seccion = SECCIONES.find((s) => s.slug === 'tu-pension')!;
    expect([seccion.resumen, ...seccion.previsto].join(' ')).not.toMatch(/\d/);
  });
});

describe('Field', () => {
  it('asocia etiqueta, ayuda y error al control y anuncia el error', () => {
    render(
      <Field etiqueta="Edad" ayuda="Ayuda breve" error="Escribe un número">
        {(a) => <input {...a} />}
      </Field>,
    );
    const control = screen.getByLabelText('Edad');
    expect(control).toHaveAttribute('aria-invalid', 'true');
    expect(control).toHaveAccessibleDescription(/Ayuda breve.*Escribe un número/);
    expect(screen.getByText(/Escribe un número/).closest('[aria-live]')).toHaveAttribute(
      'aria-live',
      'polite',
    );
  });
});

describe('página «Tu pensión»', () => {
  it('muestra el aviso, el IPC supuesto con su fuente y la base sugerida con su fuente', () => {
    render(<TuPension />);
    expect(screen.getByRole('heading', { level: 1, name: 'Tu pensión' })).toBeInTheDocument();
    expect(screen.getByText(/estimación divulgativa, no un cálculo oficial/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Supuesto del usuario/).length).toBeGreaterThan(0);
    // Valores iniciales que salen de /data (coma decimal, sin cifras escritas en el código).
    expect(screen.getByLabelText('IPC anual supuesto (%)')).toHaveValue('2');
    expect(screen.getByLabelText('Base mensual de cotización (euros)')).toHaveValue('2286,22');
    expect(screen.getAllByText(/descargado el/).length).toBe(2);
    expect(
      screen.getByText(/Próximamente: jubilación anticipada, demorada y parcial/),
    ).toBeVisible();
  });

  it('el campo de hijos aparece solo para mujeres', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    expect(screen.queryByLabelText('Número de hijos')).toBeNull();
    await usuario.click(screen.getByRole('radio', { name: 'Mujer' }));
    expect(screen.getByLabelText('Número de hijos')).toBeInTheDocument();
  });

  it('el panel de supuestos se ve antes de calcular, con estados en texto', () => {
    render(<TuPension />);
    const panel = screen.getByRole('heading', { name: 'Supuestos y lecturas' }).closest('section')!;
    const estados = within(panel).getAllByText(/^Estado: /);
    expect(estados.length).toBeGreaterThan(5);
    const textos = new Set(estados.map((e) => e.textContent));
    expect(textos).toContain('Estado: Provisional');
    expect(textos).toContain('Estado: Pendiente de decidir');
    expect(textos).toContain('Estado: Decidida');
    // Desde la Fase 3-B2 cada lectura es un grupo de opciones con una elegida (la de por defecto).
    const grupos = within(panel).getAllByRole('group');
    expect(grupos.length).toBeGreaterThan(5);
    for (const g of grupos) {
      expect(
        within(g)
          .getAllByRole('radio')
          .filter((r) => (r as HTMLInputElement).checked),
      ).toHaveLength(1);
    }
  });

  it('muestra las limitaciones del motor sin esconderlas', () => {
    render(<TuPension />);
    const sec = screen
      .getByRole('heading', { name: 'Qué no tiene en cuenta el cálculo' })
      .closest('section')!;
    expect(within(sec).getAllByRole('listitem').length).toBeGreaterThan(3);
  });

  it('formulario vacío: errores con role=alert y el foco en el primer campo con error', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await usuario.click(screen.getByRole('button', { name: 'Calcular mi pensión' }));
    const alerta = await screen.findByRole('alert');
    expect(within(alerta).getAllByRole('listitem').length).toBeGreaterThan(3);
    expect(screen.getByLabelText('Mes de nacimiento')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('heading', { name: 'Tu pensión estimada' })).toBeNull();
  });

  it('flujo completo: rellenar, ver el resultado y la explicación paso a paso', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await rellenar(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Calcular mi pensión' }));
    expect(await screen.findByRole('heading', { name: 'Tu pensión estimada' })).toBeInTheDocument();
    expect(screen.getAllByText(/2\.721,39/).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Cómo se ha calculado' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Periodo de cálculo y base reguladora' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /Requisitos/ })).toBeInTheDocument();
    // Con resultado, cada lectura indica su efecto en el cálculo.
    expect(screen.getAllByText('Efecto en tu resultado').length).toBeGreaterThan(5);
  });

  it('error del motor: mensaje claro con la acción a seguir', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await rellenar(usuario, '2031');
    await usuario.clear(screen.getByLabelText('IPC anual supuesto (%)'));
    await usuario.click(screen.getByRole('button', { name: 'Calcular mi pensión' }));
    const alerta = await screen.findByRole('alert');
    expect(
      within(alerta).getByRole('heading', { name: 'Falta un IPC supuesto' }),
    ).toBeInTheDocument();
    expect(alerta).toHaveTextContent(/Qué puedes hacer/);
  });

  it('una jubilación que no cumple requisitos no muestra pensión', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await rellenar(usuario);
    await usuario.clear(screen.getByLabelText('Año de inicio de la cotización'));
    await usuario.type(screen.getByLabelText('Año de inicio de la cotización'), '2024');
    await usuario.click(screen.getByRole('button', { name: 'Calcular mi pensión' }));
    expect(await screen.findByRole('heading', { name: 'Tu pensión estimada' })).toBeInTheDocument();
    expect(screen.queryByText('Pensión mensual bruta (por paga)')).toBeNull();
    expect(screen.getByText(/no se cumplen los requisitos/i)).toBeInTheDocument();
  });
});
