import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { interpretacionPorId } from '../contenido/interpretaciones';
import { MUESTRA } from '../design-lab/muestra';
import {
  etiquetaGrado,
  GRADOS_INTERPRETACION,
  Interpretacion,
  type ResolverDato,
} from '../engine/interpretaciones';
import { formatearEuros } from '../engine/formato';
import { InterpretationBox, SELECTOR_INTERPRETACION } from './InterpretationBox';
import { problemasDeOrden, textoSinInterpretaciones } from '../test/interpretaciones';

const resolver: ResolverDato = (ref) => {
  const m = /^muestra#(\d+)$/.exec(ref);
  return m?.[1] === undefined ? undefined : MUESTRA.fuentes[Number(m[1])];
};

describe('InterpretationBox', () => {
  it('caja del autor: región con nombre accesible, rótulo «Interpretación», cifra resuelta, criterio y grado', () => {
    const r = interpretacionPorId('ejemplo-autor');
    render(<InterpretationBox interpretacion={r} resolver={resolver} />);
    const region = screen.getByRole('region', { name: `Interpretación: ${r.titulo}` });
    expect(within(region).getByText('Interpretación')).toBeInTheDocument();
    // La cifra entra por el marcador, resuelta desde el dato (aquí, ficticio).
    expect(region.textContent).toContain(formatearEuros(Number(MUESTRA.fuentes[1]?.value)));
    expect(region.textContent).not.toContain('{{');
    // Cada criterio se ve debajo del texto.
    const dl = region.querySelector('dl');
    expect(dl?.textContent).toContain('tensión financiera');
    expect(region).toHaveTextContent(
      `Grado de confianza (escala provisional): ${etiquetaGrado(r.grado)}`,
    );
    // El estado de revisión se guarda en el registro, pero no se muestra.
    expect(region.textContent).not.toMatch(/pendiente de revisi/i);
    // Fuente accesible igual que la de un gráfico.
    expect(
      within(region).getByRole('button', { name: /^Fuentes?: Interpretación: / }),
    ).toBeInTheDocument();
    expect(region.getAttribute('data-interpretacion')).toBe(r.id);
    expect(region.getAttribute('data-ejemplo')).toBe('true');
  });

  it('caja atribuida: rótulo con autores y año, texto «Según…», hipótesis y fuente de la publicación', () => {
    const r = interpretacionPorId('ejemplo-atribuida');
    render(<InterpretationBox interpretacion={r} resolver={resolver} />);
    const region = screen.getByRole('region', { name: `Interpretación: ${r.titulo}` });
    const a = r.atribucion;
    if (a === undefined) throw new Error('sin atribución');
    expect(
      within(region).getByText(`Interpretación de ${a.autores} (${String(a.anio)})`),
    ).toBeInTheDocument();
    expect(region.querySelector('.interpretacion-texto')?.textContent).toMatch(/^Según /);
    expect(region).toHaveTextContent('Hipótesis:');
    expect(region).toHaveTextContent(a.fuentePrimaria ?? '');
  });

  it('una proyección con sensibilidades muestra su rango desde los datos', () => {
    const base = interpretacionPorId('ejemplo-autor');
    const r = Interpretacion.parse({
      ...base,
      id: 'prueba-rango',
      texto: 'Texto de prueba.',
      marcadores: {
        bajo: { ref: 'muestra#0', formato: 'fraccion-porcentaje' },
        alto: { ref: 'muestra#1', formato: 'euros' },
      },
      criterios: [],
      datosQueLaSostienen: ['muestra#0', 'muestra#1'],
      proyeccion: {
        hipotesis: 'Legislación congelada.',
        sensibilidades: true,
        rango: { desde: 'bajo', hasta: 'alto' },
      },
    });
    render(<InterpretationBox interpretacion={r} resolver={resolver} />);
    const region = screen.getByRole('region', { name: `Interpretación: ${r.titulo}` });
    expect(region).toHaveTextContent('Hipótesis: Legislación congelada.');
    expect(region).toHaveTextContent(/Rango: entre .+ y .+\./);
    expect(region.querySelector('.interpretacion-criterios')).toBeNull();
  });

  it('la escala del grado es provisional y tiene tres niveles con etiqueta neutra', () => {
    expect(GRADOS_INTERPRETACION.map((g) => g.etiqueta)).toEqual([
      'Respaldada por fuentes institucionales o literatura publicada',
      'Juicio profesional',
      'Juicio del autor',
    ]);
  });
});

describe('excepción acotada de valoraciones: solo dentro de las cajas, identificadas por el componente', () => {
  it('el texto que recorren las pruebas de valoraciones excluye la caja y solo la caja', () => {
    const r = interpretacionPorId('ejemplo-atribuida');
    const { container } = render(
      <div>
        <p id="diseno-interpretado">Dato descriptivo fuera de la caja.</p>
        <InterpretationBox interpretacion={r} resolver={resolver} />
        <p>Otro párrafo neutral.</p>
      </div>,
    );
    expect(container.textContent).toContain('insostenible');
    const fuera = textoSinInterpretaciones(container);
    expect(fuera).not.toContain('insostenible');
    expect(fuera).toContain('Dato descriptivo fuera de la caja.');
    expect(fuera).toContain('Otro párrafo neutral.');
    expect(container.querySelectorAll(SELECTOR_INTERPRETACION)).toHaveLength(1);
  });

  it('un término de valoración fuera de una caja sigue detectándose (aunque haya una caja al lado)', async () => {
    const { valoracionesEn, veredictosEn } = await import('../../scripts/lib/valoraciones.ts');
    const r = interpretacionPorId('ejemplo-autor');
    const { container } = render(
      <div>
        <p id="diseno-interpretado">Un gasto insostenible que la realidad es otra.</p>
        <InterpretationBox interpretacion={r} resolver={resolver} />
      </div>,
    );
    const fuera = textoSinInterpretaciones(container);
    expect(valoracionesEn(fuera)).toContain('insostenible');
    expect(veredictosEn(fuera)).toContain('la realidad es');
  });

  it('una caja con un término de valoración «idéntico» al de fuera no oculta el de fuera (no se filtra por texto)', async () => {
    const { valoracionesEn } = await import('../../scripts/lib/valoraciones.ts');
    const r = interpretacionPorId('ejemplo-atribuida');
    const { container } = render(
      <div>
        <p id="diseno-interpretado">Sistema insostenible.</p>
        <InterpretationBox interpretacion={r} resolver={resolver} />
      </div>,
    );
    expect(valoracionesEn(textoSinInterpretaciones(container))).toEqual(['insostenible']);
  });
});

describe('orden: la caja va después de lo que interpreta', () => {
  const r = interpretacionPorId('ejemplo-autor');
  it('después: sin problemas', () => {
    const { container } = render(
      <div>
        <table id="diseno-interpretado" />
        <InterpretationBox interpretacion={r} resolver={resolver} />
      </div>,
    );
    expect(problemasDeOrden(container)).toEqual([]);
  });
  it('antes, sola o dentro del elemento interpretado: falla', () => {
    const antes = render(
      <div>
        <InterpretationBox interpretacion={r} resolver={resolver} />
        <table id="diseno-interpretado" />
      </div>,
    );
    expect(problemasDeOrden(antes.container)).toEqual([
      `${r.id}: la caja va antes del elemento que interpreta`,
    ]);
    antes.unmount();
    const sola = render(<InterpretationBox interpretacion={r} resolver={resolver} />);
    expect(problemasDeOrden(sola.container)[0]).toMatch(/no existe el elemento interpretado/);
    sola.unmount();
    const dentro = render(
      <div id="diseno-interpretado">
        <InterpretationBox interpretacion={r} resolver={resolver} />
      </div>,
    );
    expect(problemasDeOrden(dentro.container)[0]).toMatch(/se contienen/);
  });
});
