import { describe, expect, it } from 'vitest';
import { citasDeTexto, quitarCitas, ubicacionDeBloque } from './citas-normativas';

describe('quitarCitas', () => {
  it('quita las citas entre paréntesis y deja el resto de la frase', () => {
    expect(quitarCitas('Vitalicia (art. 219.1).')).toBe('Vitalicia.');
    expect(quitarCitas('Personas del Régimen General (art. 205 TRLGSS).')).toBe(
      'Personas del Régimen General.',
    );
    expect(quitarCitas('Cónyuge (arts. 217 y 219 TRLGSS) y otros.')).toBe('Cónyuge y otros.');
    expect(quitarCitas('Máxima anual (DT 39.ª); límite mensual.')).toBe(
      'Máxima anual; límite mensual.',
    );
    expect(quitarCitas('Pago único (art. 216.1.e)')).toBe('Pago único');
  });

  it('quita las citas que forman parte de la frase sin dejar preposiciones sueltas', () => {
    expect(quitarCitas('Condición general del artículo 165.1 (alta o situación asimilada).')).toBe(
      'Condición general (alta o situación asimilada).',
    );
    expect(quitarCitas('Aplicación gradual según DT 7.ª: en dos años.')).toBe(
      'Aplicación gradual: en dos años.',
    );
    expect(quitarCitas('(requisito general del art. 165.1)')).toBe('(requisito general)');
    expect(quitarCitas('con límite máximo del art. 57 y complemento')).toBe(
      'con límite máximo y complemento',
    );
    expect(quitarCitas('(art. 209.1, texto vigente) = suma')).toBe('(texto vigente) = suma');
    expect(quitarCitas('(en separación o divorcio, art. 220)')).toBe('(en separación o divorcio)');
  });

  it('reescribe las frases cuya cita es parte del sentido sin añadir hechos', () => {
    expect(quitarCitas('tenga la edad del artículo 205.1.a) y reúna los requisitos')).toBe(
      'tenga la edad ordinaria de jubilación y reúna los requisitos',
    );
    expect(quitarCitas('fuera pensionista en los términos del artículo 217.1.c).')).toBe(
      'fuera pensionista de jubilación o de incapacidad permanente contributivas.',
    );
    expect(quitarCitas('en los términos del artículo 221, sobreviviente')).toBe(
      'en los términos legales, sobreviviente',
    );
    expect(quitarCitas('a los límites del artículo 363 y con residencia')).toBe(
      'a los límites legales y con residencia',
    );
    expect(quitarCitas('Rentas compatibles (por remisión al art. 364.2).')).toBe(
      'Rentas compatibles.',
    );
    expect(quitarCitas('no consta en el texto consultado del TRLGSS.')).toBe(
      'no consta en el texto consultado de la Ley General de la Seguridad Social.',
    );
  });

  it('no toca los textos sin citas ni las cifras', () => {
    const texto = 'Haber cumplido 67 años, o 65 años cuando se acrediten 38 años y 6 meses.';
    expect(quitarCitas(texto)).toBe(texto);
    expect(quitarCitas('Compatible salvo disposición expresa.')).toBe(
      'Compatible salvo disposición expresa.',
    );
  });
});

describe('citasDeTexto y ubicacionDeBloque', () => {
  it('reúne las citas en orden y sin repetir', () => {
    expect(
      citasDeTexto(
        'Límite (art. 57) y revalorización del art. 58.2; otra vez (art. 57) y (DT 39.ª).',
      ),
    ).toEqual(['art. 57', 'art. 58.2', 'DT 39.ª']);
    expect(citasDeTexto('Sin citas.')).toEqual([]);
  });

  it('la ubicación del bloque suma lo que declara el dato y las citas del texto que no recoge', () => {
    expect(ubicacionDeBloque('Sin citas.')).toBeUndefined();
    expect(ubicacionDeBloque('Límite (art. 57).')).toBe('art. 57');
    expect(
      ubicacionDeBloque(
        'Alta (art. 165.1) y pensión sin alta (art. 205.3).',
        'art. 165.1 y art. 205.1 y 205.3 TRLGSS',
      ),
    ).toBe('art. 165.1 y art. 205.1 y 205.3 TRLGSS');
    expect(ubicacionDeBloque('Según DT 7.ª.', 'art. 205.1.a) TRLGSS')).toBe(
      'art. 205.1.a) TRLGSS; DT 7.ª',
    );
  });
});
