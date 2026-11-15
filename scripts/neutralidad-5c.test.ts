// @vitest-environment node
/** Neutralidad verificable de la comparación internacional (Fase 5-C). */
import { describe, expect, it } from 'vitest';
import { valoracionesEn } from './lib/valoraciones.ts';

describe('términos de ranking valorativo y de juicio sobre otros sistemas (Fase 5-C)', () => {
  it.each([
    ['España tiene el mejor sistema de Europa', ['mejor sistema']],
    ['Es un modelo a seguir y un ejemplo a imitar', ['modelo a seguir', 'ejemplo a imitar']],
    ['Portugal queda a la cola y Polonia, rezagada', ['a la cola', 'rezagad']],
    ['Italia es la líder y Suecia, ganadora', ['lider', 'ganador']],
    ['El fracaso del sistema alemán', ['fracas']],
    ['Un sistema más sostenible y menos eficiente', ['mas sostenible', 'menos eficiente']],
    ['Habría que copiar el modelo; se debería imitar', ['habria que', 'copiar', 'imitar']],
    ['España debería adoptar su modelo', ['deberia adoptar']],
  ])('detecta «%s»', (texto, esperadas) => {
    const halladas = valoracionesEn(texto);
    for (const e of esperadas) expect(halladas).toContain(e);
  });

  it('no marca la descripción neutral de una comparación calculada', () => {
    expect(
      valoracionesEn(
        'Los países se ordenan por el valor de la medida mostrada, de mayor a menor; la diferencia con España es de unas décimas de punto.',
      ),
    ).toEqual([]);
    expect(
      valoracionesEn(
        'Perímetro no verificado en las fuentes descargadas. La media de la OCDE y la UE-27.',
      ),
    ).toEqual([]);
    expect(valoracionesEn('Sostenibilidad financiera: definición de la fuente')).toEqual([]);
    // «deberían» en una cita literal de una fuente no es una recomendación propia.
    expect(valoracionesEn('costes que deberían financiarse con la fiscalidad general')).toEqual([]);
  });
});
