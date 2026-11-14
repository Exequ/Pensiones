import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { datosFinanciacion } from '../historico/datos-financiacion';
import Financiacion from './Pagina';
import { ROTULO_SALDO_SIN_TRANSFERENCIAS } from './Saldos';

function pintar() {
  return render(
    <MemoryRouter>
      <Financiacion />
    </MemoryRouter>,
  );
}

function figura(contenedor: HTMLElement, titulo: string): HTMLElement {
  const encontrada = [...contenedor.querySelectorAll('figure.grafico')].find((f) =>
    f.querySelector('.grafico-titulo')?.textContent.includes(titulo),
  );
  if (!(encontrada instanceof HTMLElement)) throw new Error(`Sin figura «${titulo}»`);
  return encontrada;
}

const cabeceras = (f: HTMLElement) =>
  [...f.querySelectorAll('thead th')].map((th) => th.textContent);

describe('«Financiación y déficit»: ingresos', () => {
  it('rotula el resto como «resto (por diferencia)» y aclara que son derechos reconocidos netos, no caja', () => {
    const { container } = pintar();
    const f = figura(container, 'De dónde proceden los ingresos no financieros');
    expect(cabeceras(f)).toContain('Resto (por diferencia)');
    expect(cabeceras(f).join(' ')).not.toMatch(/Resto de ingresos no financieros/);
    expect(f.textContent).toMatch(/derechos reconocidos netos, no en caja/);
    expect(container.textContent).toMatch(/no cobros ni pagos/);
  });

  it('aclara que «transferencias del Estado y organismos autónomos» no equivale a «aportación del Estado»', () => {
    const { container } = pintar();
    const texto = container.textContent;
    expect(texto).toMatch(/No equivale a «aportación del Estado»/);
    expect(texto).toMatch(/clasificada por origen y no por\s+finalidad/);
    expect(texto).toMatch(/no se pueden conciliar una a una/);
  });

  it('describe la fila del complemento a mínimos según la ejecución', () => {
    const { container } = pintar();
    const f = figura(container, 'Gasto en pensiones contributivas por clase');
    expect(f.textContent).toMatch(/fila propia/);
    expect(f.textContent).toMatch(/no forma parte de la fila «suma de pensiones»/);
  });
});

describe('«Financiación y déficit»: saldos', () => {
  it('rotula el saldo sin transferencias sin las palabras «ajustado» ni «contributivo» y lo avisa', () => {
    const { container } = pintar();
    expect(ROTULO_SALDO_SIN_TRANSFERENCIAS).toBe(
      'Saldo no financiero menos transferencias corrientes del Estado y OO. AA. (cálculo propio)',
    );
    expect(ROTULO_SALDO_SIN_TRANSFERENCIAS).not.toMatch(/ajustad|contributiv/i);
    const f = figura(container, 'menos transferencias corrientes del Estado y OO. AA. (cálculo propio)');
    expect(f.querySelector('.grafico-titulo')?.textContent).not.toMatch(/ajustad|contributiv/i);
    expect(cabeceras(f).join(' ')).not.toMatch(/ajustad|contributiv/i);
    const aviso = screen.getByText(/Advertencia: la resta quita también la financiación/);
    expect(aviso.textContent).toMatch(/no son pensiones\s+contributivas/);
    expect(aviso.textContent).toMatch(/no equivale al saldo del sistema contributivo/);
    expect(container.textContent).not.toMatch(/saldo contributivo ajustado/i);
  });

  it('la definición del SEC no afirma lo que no se ha verificado (perímetro con SEPE o FOGASA, base devengo)', () => {
    const { container } = pintar();
    const texto = container.textContent;
    expect(texto).not.toMatch(/SEPE|FOGASA|Servicio Público de Empleo|Fondo de Garantía Salarial/);
    expect(texto).not.toMatch(/devengo/i);
    expect(texto).toMatch(/no afirma que su perímetro coincida/);
  });

  it('retira las lecturas que suman gastos impropios y deja solo su cifra como estimación, no dato observado', () => {
    const { container } = pintar();
    const texto = container.textContent;
    expect(texto).not.toMatch(/Cuatro lecturas del saldo/);
    expect(texto).not.toMatch(/Sin transferencias del Estado y sin los gastos impropios previstos/);
    expect(texto).not.toMatch(/cálculo ilustrativo que suma una previsión/);
    const tablas = screen.getAllByRole('table', { hidden: true });
    const tablaImpropios = tablas.filter((t) =>
      t.querySelector('caption')?.textContent.includes('Gastos impropios'),
    );
    expect(tablaImpropios).toHaveLength(1);
    const filas = tablaImpropios[0]?.querySelectorAll('tbody tr') ?? [];
    expect(filas).toHaveLength(1);
    const celdas = [...(filas[0]?.querySelectorAll('th, td') ?? [])].map((c) => c.textContent);
    expect(celdas[0]).toMatch(/estimación de \d{4}, no dato observado/);
    // No hay filas de las otras cifras de la fuente secundaria.
    expect(texto).not.toMatch(/Déficit estimado en la misma previsión/);
    expect(texto).not.toMatch(/Transferencia prevista en el proyecto de presupuestos/);
    expect(texto).not.toMatch(/Ageing Report de la Comisión Europea/);
    // La cifra es la del fichero y no se suma a ninguna serie de ejecución.
    const dato = datosFinanciacion().previsiones.find((p) => p.id.startsWith('gastos-impropios'));
    expect(dato).toBeDefined();
    expect(texto).toMatch(/No se suma ni se compara con\s+ninguna serie de ejecución/);
    expect(texto).toMatch(/pendiente de contrastar con el Informe\s+de evaluación y reforma del Pacto de Toledo/);
  });
});

describe('«Financiación y déficit»: gasto sobre el PIB', () => {
  it('nombra la serie de Eurostat como ESSPROS, advierte de que no es comparable con el gasto contributivo y usa el complemento como referencia', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    const titulo = 'Gasto en pensiones sobre el PIB según varias medidas';
    let f = figura(container, titulo);
    let cab = cabeceras(f);
    expect(cab).toContain('ESSPROS (Eurostat): vejez');
    expect(cab).toContain('ESSPROS (Eurostat): vejez y supervivientes');
    expect(cab).not.toContain('Eurostat: vejez');
    // Referencia por defecto: con complemento; la variante sin complemento no se muestra.
    expect(cab).toContain('Contributivas con complemento (referencia)');
    expect(cab).not.toContain('Contributivas sin complemento');
    const texto = container.textContent;
    expect(texto).toMatch(/No es comparable con el gasto contributivo propio/);
    expect(texto).toMatch(/incapacidad permanente/);
    expect(texto).toMatch(/no delimitan qué administraciones o regímenes entran en la serie/);
    expect(texto).toMatch(/fila propia del\s+capítulo de transferencias corrientes/);

    const grupo = screen.getByRole('group', {
      name: 'Gasto contributivo propio (obligaciones reconocidas)',
    });
    expect(within(grupo).getByRole('radio', { name: 'Con complemento a mínimos' })).toBeChecked();
    await usuario.click(within(grupo).getByRole('radio', { name: 'Con y sin complemento' }));
    f = figura(container, titulo);
    cab = cabeceras(f);
    expect(cab).toContain('Contributivas con complemento (referencia)');
    expect(cab).toContain('Contributivas sin complemento');
    await usuario.click(within(grupo).getByRole('radio', { name: 'Sin complemento a mínimos' }));
    cab = cabeceras(figura(container, titulo));
    expect(cab).toContain('Contributivas sin complemento');
    expect(cab).not.toContain('Contributivas con complemento (referencia)');
  });
});
