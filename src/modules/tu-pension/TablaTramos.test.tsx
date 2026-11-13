import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import TuPension from './Pagina';
import { TablaTramos } from './TablaTramos';
import { tramoVacio, type ErrorTramo, type TramoFormulario } from './tramos';

function Envoltorio({
  inicial = [],
  errores = [],
}: {
  inicial?: TramoFormulario[];
  errores?: ErrorTramo[];
}) {
  const [tramos, setTramos] = useState<readonly TramoFormulario[]>(inicial);
  return <TablaTramos tramos={tramos} errores={errores} onCambio={setTramos} />;
}

describe('TablaTramos', () => {
  it('sin tramos lo dice y deja añadir; cada fila tiene controles con etiqueta', async () => {
    const usuario = userEvent.setup();
    render(<Envoltorio />);
    expect(screen.getByText('Todavía no hay tramos. Añade el primero.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Añadir tramo' }));
    expect(screen.queryByText('Todavía no hay tramos. Añade el primero.')).toBeNull();
    for (const etiqueta of [
      'Tramo 1, Desde: mes',
      'Tramo 1, Desde: año',
      'Tramo 1, Hasta: mes',
      'Tramo 1, Hasta: año',
      'Tramo 1, Base: referencia',
      'Tramo 1, Base: importe en euros',
    ]) {
      expect(screen.getByLabelText(etiqueta)).toBeInTheDocument();
    }
    // Tras añadir, el foco va al primer control del tramo nuevo.
    expect(screen.getByLabelText('Tramo 1, Desde: mes')).toHaveFocus();
  });

  it('añadir, duplicar y quitar con el teclado, y el foco sigue al tramo', async () => {
    const usuario = userEvent.setup();
    render(<Envoltorio inicial={[{ ...tramoVacio(), desdeAnio: '2000', importe: '1500' }]} />);
    await usuario.tab(); // primer control
    expect(screen.getByLabelText('Tramo 1, Desde: mes')).toHaveFocus();
    screen.getByRole('button', { name: 'Duplicar el tramo 1' }).focus();
    await usuario.keyboard('{Enter}');
    expect(screen.getAllByRole('row').filter((f) => f.classList.contains('tp-tramo'))).toHaveLength(
      2,
    );
    // La copia conserva los valores y recibe el foco.
    expect(screen.getByLabelText('Tramo 2, Desde: año')).toHaveValue('2000');
    expect(screen.getByLabelText('Tramo 2, Desde: mes')).toHaveFocus();
    screen.getByRole('button', { name: 'Quitar el tramo 2' }).focus();
    await usuario.keyboard(' ');
    expect(screen.queryByLabelText('Tramo 2, Desde: mes')).toBeNull();
    // Se quita el último: el foco pasa al tramo anterior.
    expect(screen.getByLabelText('Tramo 1, Desde: mes')).toHaveFocus();
    screen.getByRole('button', { name: 'Quitar el tramo 1' }).focus();
    await usuario.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Añadir tramo' })).toHaveFocus();
  });

  it('con una referencia a serie desaparece el campo de importe', async () => {
    const usuario = userEvent.setup();
    render(<Envoltorio inicial={[tramoVacio()]} />);
    await usuario.selectOptions(screen.getByLabelText('Tramo 1, Base: referencia'), 'maxima');
    expect(screen.queryByLabelText('Tramo 1, Base: importe en euros')).toBeNull();
    expect(screen.getByText(/Según la serie de los datos/)).toBeInTheDocument();
  });

  it('los errores del tramo van en una región aria-live y marcan el control', () => {
    const t = tramoVacio();
    render(
      <Envoltorio
        inicial={[t]}
        errores={[
          { tramoId: t.id, numero: 1, campo: 'desdeAnio', mensaje: 'Tramo 1: escribe el año.' },
        ]}
      />,
    );
    const mensaje = screen.getByText(/Tramo 1: escribe el año\./);
    expect(mensaje.closest('[aria-live]')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByLabelText('Tramo 1, Desde: año')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Tramo 1, Hasta: año')).toHaveAttribute('aria-invalid', 'false');
  });
});

async function pasarATramos(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.selectOptions(screen.getByLabelText('Mes de nacimiento'), '11');
  await usuario.type(screen.getByLabelText('Año de nacimiento'), '1961');
  await usuario.click(screen.getByRole('radio', { name: 'Hombre' }));
  await usuario.selectOptions(screen.getByLabelText('Mes de jubilación'), '11');
  await usuario.type(screen.getByLabelText('Año de jubilación'), '2026');
  await usuario.click(screen.getByRole('radio', { name: 'Carrera por tramos' }));
}

async function rellenarTramo(
  usuario: ReturnType<typeof userEvent.setup>,
  n: number,
  d: [string, string],
  h: [string, string],
  importe: string,
) {
  await usuario.selectOptions(screen.getByLabelText(`Tramo ${String(n)}, Desde: mes`), d[0]);
  await usuario.clear(screen.getByLabelText(`Tramo ${String(n)}, Desde: año`));
  await usuario.type(screen.getByLabelText(`Tramo ${String(n)}, Desde: año`), d[1]);
  await usuario.selectOptions(screen.getByLabelText(`Tramo ${String(n)}, Hasta: mes`), h[0]);
  await usuario.clear(screen.getByLabelText(`Tramo ${String(n)}, Hasta: año`));
  await usuario.type(screen.getByLabelText(`Tramo ${String(n)}, Hasta: año`), h[1]);
  const base = screen.getByLabelText(`Tramo ${String(n)}, Base: importe en euros`);
  await usuario.clear(base);
  await usuario.type(base, importe);
}

describe('página con carrera por tramos', () => {
  it('construir tramos, ver el resumen vivo, el resultado y el gráfico con su tabla', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await pasarATramos(usuario);
    // Sin carrera simple completa, parte de un tramo vacío.
    await rellenarTramo(usuario, 1, ['11', '1986'], ['12', '2005'], '1200');
    await usuario.click(screen.getByRole('button', { name: 'Añadir tramo' }));
    await rellenarTramo(usuario, 2, ['1', '2007'], ['10', '2026'], '2500');
    const resumen = screen
      .getByRole('heading', { name: 'Resumen de la carrera' })
      .closest('section')!;
    expect(within(resumen).getByText('Meses cotizados').nextSibling).toHaveTextContent('468');
    expect(within(resumen).getByText('Meses sin cotizar (lagunas)').nextSibling).toHaveTextContent(
      '12',
    );
    expect(
      within(resumen).getByText(/de enero de 2006 a diciembre de 2006 \(12 meses\)/),
    ).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Calcular mi pensión' }));
    expect(await screen.findByRole('heading', { name: 'Tu pensión estimada' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Las bases del periodo de cálculo, mes a mes' }),
    ).toBeInTheDocument();
    const figura = screen.getByRole('figure');
    expect(within(figura).getByRole('img')).toBeInTheDocument();
    expect(within(figura).getByRole('table')).toBeInTheDocument();
  });

  it('un solape se anuncia con el mensaje y no hay resultado', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await pasarATramos(usuario);
    await rellenarTramo(usuario, 1, ['1', '2000'], ['12', '2010'], '1500');
    await usuario.click(screen.getByRole('button', { name: 'Añadir tramo' }));
    await rellenarTramo(usuario, 2, ['6', '2008'], ['12', '2012'], '1800');
    await usuario.click(screen.getByRole('button', { name: 'Calcular mi pensión' }));
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(
      'Los tramos 1 y 2 se solapan entre junio de 2008 y diciembre de 2010',
    );
    expect(screen.queryByRole('heading', { name: 'Tu pensión estimada' })).toBeNull();
    expect(screen.getByLabelText('Tramo 2, Desde: año')).toHaveAttribute('aria-invalid', 'true');
  });

  it('elegir una persona-ejemplo carga sus tramos, los deja editables y muestra el resultado', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await usuario.selectOptions(screen.getByLabelText('Mes de nacimiento'), '11');
    await usuario.type(screen.getByLabelText('Año de nacimiento'), '1961');
    await usuario.click(screen.getByRole('radio', { name: 'Hombre' }));
    await usuario.selectOptions(screen.getByLabelText('Mes de jubilación'), '11');
    await usuario.type(screen.getByLabelText('Año de jubilación'), '2026');
    await usuario.click(screen.getByRole('radio', { name: 'Carrera por tramos' }));
    await usuario.click(
      screen.getByRole('button', { name: /Cargar la persona «Carrera con bases máximas»/ }),
    );
    expect(await screen.findByRole('heading', { name: 'Tu pensión estimada' })).toBeInTheDocument();
    expect(screen.getByText(/Persona-ejemplo cargada:/)).toBeInTheDocument();
    expect(screen.getAllByText('Ilustrativo').length).toBeGreaterThanOrEqual(5);
    // Editable: se puede cambiar la referencia del tramo cargado.
    const ref = screen.getByLabelText('Tramo 1, Base: referencia');
    expect(ref).toHaveValue('maxima');
    await usuario.selectOptions(ref, 'minima');
    expect(ref).toHaveValue('minima');
  });

  it('una persona-ejemplo pide antes las fechas', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await usuario.click(screen.getByRole('radio', { name: 'Carrera por tramos' }));
    await usuario.click(
      screen.getByRole('button', { name: /Cargar la persona «Carrera con base mínima»/ }),
    );
    expect(screen.getByText(/Indica antes tu fecha de nacimiento/)).toBeInTheDocument();
  });

  it('la definición de la base media se muestra con su fuente, sin recomendar ninguna', async () => {
    const usuario = userEvent.setup();
    render(<TuPension />);
    await usuario.click(screen.getByRole('radio', { name: 'Carrera por tramos' }));
    const selector = screen.getByLabelText(/Definición de la «base media»/);
    expect((selector as HTMLSelectElement).options.length).toBe(4);
    expect(screen.getByText(/no son intercambiables/)).toBeInTheDocument();
    expect(screen.getAllByText(/descargado el/).length).toBeGreaterThan(0);
    await usuario.selectOptions(selector, 'media-cn');
    expect(screen.getByText(/Contabilidad Nacional/, { selector: 'a' })).toBeInTheDocument();
  });
});
