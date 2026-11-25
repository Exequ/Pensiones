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

  it('quita también la cita con el nombre de la norma dentro del paréntesis (Fase R6)', () => {
    expect(quitarCitas('según circunstancias familiares (art. 12.1 RD 1131/2002).')).toBe(
      'según circunstancias familiares.',
    );
    expect(quitarCitas('Sin complemento a mínimos (art. 6.4 RD 416/2026). Otra frase.')).toBe(
      'Sin complemento a mínimos. Otra frase.',
    );
    // Varias citas, números con «bis» y rangos, párrafos y normas sin número de decreto.
    expect(
      quitarCitas(
        'Jubilación anticipada por actividades penosas (arts. 206, 206 bis; DT 4.ª.2). Otra.',
      ),
    ).toBe('Jubilación anticipada por actividades penosas. Otra.');
    expect(quitarCitas('Subsidio (arts. 25 a 27 de la Orden de 1967). Otra.')).toBe(
      'Subsidio. Otra.',
    );
    expect(quitarCitas('Incremento (art. 36.Uno, párr. 2.º, Decreto 3158/1966) y tope.')).toBe(
      'Incremento y tope.',
    );
    expect(quitarCitas('Límite (art. 209.2-4). Depende del convenio.')).toBe(
      'Límite. Depende del convenio.',
    );
    // Cuando la cita es parte del sentido, se reescribe con lo que dicen los propios textos.
    expect(quitarCitas('sin aplicar coeficientes reductores de los arts. 206 y 206 bis.')).toBe(
      'sin aplicar los coeficientes reductores de la edad por actividad.',
    );
    expect(quitarCitas('Salvaguarda de la DT 34.ª.1 (no inferior).')).toBe(
      'Salvaguarda de la disposición transitoria (no inferior).',
    );
    expect(quitarCitas('ni en la jubilación flexible del art. 213.1 párrafo 2.º, ni cuando')).toBe(
      'ni en la jubilación flexible, ni cuando',
    );
    // El nombre de la norma como hecho se conserva.
    expect(quitarCitas('el divisor lo fija el RD 1799/1985')).toBe(
      'el divisor lo fija el RD 1799/1985',
    );
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

describe('disposiciones adicionales abreviadas (fase R8)', () => {
  it('quita «D.A. 9ª», «DA 2.ª» y los artículos de los nombres de norma del anexo del Tribunal', () => {
    expect(
      quitarCitas('Ley 3/2017, de Presupuestos Generales del Estado para 2017 (D.A. 9ª).'),
    ).toBe('Ley 3/2017, de Presupuestos Generales del Estado para 2017.');
    expect(
      quitarCitas('Ley 31/2022 de Presupuestos Generales del Estado para 2023 (D.A. 3ª)'),
    ).toBe('Ley 31/2022 de Presupuestos Generales del Estado para 2023');
    expect(
      quitarCitas('Ley 39/1992, de Presupuestos Generales del Estado para 1993 (artículo 11).'),
    ).toBe('Ley 39/1992, de Presupuestos Generales del Estado para 1993.');
    expect(
      quitarCitas('Ley 21/1993, de Presupuestos Generales del Estado para 1994 (artículo 11.4).'),
    ).toBe('Ley 21/1993, de Presupuestos Generales del Estado para 1994.');
  });

  it('quita «(artículo único)» de una norma de un solo artículo', () => {
    expect(quitarCitas('Real Decreto-Ley 17/1996, de 22 de noviembre (artículo único).')).toBe(
      'Real Decreto-Ley 17/1996, de 22 de noviembre.',
    );
  });

  it('las cita en orden de aparición', () => {
    expect(citasDeTexto('Ley 6/2018 (D.A. 4ª)')).toEqual(['D.A. 4ª']);
    expect(citasDeTexto('Ley 12/1996 (artículo 11.3).')).toEqual(['artículo 11.3']);
    expect(citasDeTexto('Aplica la DA 2.ª y la DT 7.ª')).toEqual(['DA 2.ª', 'DT 7.ª']);
  });
});
