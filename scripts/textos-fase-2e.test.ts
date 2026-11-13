// @vitest-environment node
/**
 * Textos incorporados en la Fase 2-E, comprobados por código:
 *  - arts. 17 y 18 de la Orden de 13/02/1967 (BOE-A-1967-2876) frente al control recibido de Sergio;
 *  - capítulo V del Reglamento de accidentes del trabajo de 1956 (OCR, confianza media) frente a la
 *    capa de texto bruta del PDF del BOE: las cifras clave coinciden en los dos ficheros;
 *  - art. 130 de la Ley 6/2018 (BOE-A-2018-9268): base máxima de 3.803,70 desde el 1 de agosto de
 *    2018, y la cita literal de `base-maxima-rg` de 2018.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ = path.resolve(import.meta.dirname, '..');
const leer = (ruta: string): string => readFileSync(path.join(RAIZ, ruta), 'utf8');
const plano = (s: string): string =>
  s
    .replaceAll('­', '')
    .replace(/-\s*\n\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();

describe('Orden de 13/02/1967, arts. 17 y 18', () => {
  const texto = leer('data-raw/boe/orden-1967-arts-17-18.txt');
  const art17 = texto.slice(texto.indexOf('Artículo 17.'), texto.indexOf('Artículo 18.'));
  const control = leer('data-raw/boe/orden-1967-art17-control-sergio.txt')
    .split('\n\n')
    .slice(1)
    .join('\n\n');
  const consolidado = leer('data-raw/boe/orden-13-02-1967.txt');

  it('el art. 17 descargado coincide palabra por palabra con el control de Sergio (salvo el título)', () => {
    const sinTitulo = art17.replace('Artículo 17. Cuantía.', '');
    expect(plano(sinTitulo)).toBe(plano(control));
  });

  it('el art. 17 coincide con el bloque a17 del texto consolidado ya guardado', () => {
    const bloque = consolidado.slice(
      consolidado.indexOf('Artículo 17. Cuantía.'),
      consolidado.indexOf('[Bloque a18'),
    );
    expect(plano(art17)).toBe(plano(bloque));
  });

  it('el art. 17 contiene las cifras de orfandad: 20 por 100, 250 pesetas, 100 por 100', () => {
    for (const cifra of [
      '20 por 100',
      '250 pesetas mensuales',
      '100 por 100 de su respectiva base',
    ])
      expect(plano(art17)).toContain(cifra);
  });

  it('ni el art. 17 ni el art. 18 dicen qué pensión se reduce al superar el límite conjunto', () => {
    const art18 = texto.slice(texto.indexOf('Artículo 18.'));
    const todo = plano(`${art17} ${art18}`).toLowerCase();
    expect(todo).not.toMatch(/se reducir[áa]n? (la|las) pensi/);
    expect(art18).toContain('la suma de las pensiones de viudedad y de orfandad no podrá exceder');
  });
});

describe('Reglamento de accidentes del trabajo de 1956, capítulo V (OCR)', () => {
  const cap5 = plano(leer('data-raw/boe/reglamento-at-1956-cap5.txt'));
  const bruta = plano(leer('data-raw/boe/reglamento-at-1956-capa-texto-bruta.txt'));
  // Cada cifra se busca con una expresión tolerante a los errores del OCR de cada fichero.
  const CIFRAS: readonly (readonly [string, RegExp])[] = [
    ['40.000 pesetas anuales', /40\.000 pesetas anua/],
    ['111 pesetas diarias', /111 pesetas diarias/],
    ['5 pesetas diarias', /5 pe\w* dia/],
    ['150 pesetas mensuales', /150 pesetas mensuales/],
    ['290 días', /multiplicar[áa] por 290/],
    ['365 días', /365 d.as|trescientos sesenta y cinco/],
    ['25 por 100', /25 por 100/],
    ['10 y 20 por 100', /10 por 100 y 20 por 100|diez,? y veinte por ciento/],
    ['doscientos noventa', /doscientos noventa/],
  ];

  it('cada cifra clave está en el fichero OCR del capítulo V y en la capa de texto bruta', () => {
    for (const [nombre, patron] of CIFRAS) {
      expect(patron.test(cap5), `cap5: ${nombre}`).toBe(true);
      expect(patron.test(bruta), `bruta: ${nombre}`).toBe(true);
    }
  });

  it('el fichero declara que es OCR y contiene los arts. 58 a 63', () => {
    const t = leer('data-raw/boe/reglamento-at-1956-cap5.txt');
    expect(t).toContain('Texto obtenido por OCR');
    for (const n of ['58', '59', '60', '61', '62', '63'])
      expect(new RegExp(`Art[.,]? ?${n}`).test(t), `art. ${n}`).toBe(true);
  });
});

describe('Ley 6/2018, art. 130 (base máxima de 2018)', () => {
  const ley = leer('data-raw/boe/ley-6-2018.txt');
  const baseMaxima = JSON.parse(leer('data/parametros/base-maxima-rg.json')) as {
    data: { id: string; value: number; quote: string; crossCheck?: { notes: string } }[];
  };
  const d2018 = baseMaxima.data.find((d) => d.id === '2018');

  it('el art. 130.Dos.1.b fija 3.803,70 euros mensuales desde el día primero del mes siguiente a la entrada en vigor', () => {
    expect(ley).toContain(
      'Las bases máximas, cualquiera que sea la categoría profesional y grupo de cotización, a partir del día primero del mes siguiente al de la entrada en vigor de la presente norma, serán de 3.803,70 euros mensuales',
    );
  });

  it('la entrada en vigor es al día siguiente de la publicación (4/7/2018): el mes siguiente es agosto', () => {
    expect(ley).toContain(
      'Uno. La presente Ley entrará en vigor al día siguiente de su publicación',
    );
    expect(ley).toContain('vigente desde 20180705 · norma BOE-A-2018-9268');
    const publicacion = new Date(Date.UTC(2018, 6, 4));
    const vigor = new Date(publicacion.getTime() + 86_400_000);
    const primeroDelMesSiguiente = new Date(
      Date.UTC(vigor.getUTCFullYear(), vigor.getUTCMonth() + 1, 1),
    );
    expect(primeroDelMesSiguiente.toISOString().slice(0, 10)).toBe('2018-08-01');
  });

  it('la serie anual de /data conserva 3.751,20 (Orden ESS/55/2018, 1 de enero) y su contraste cita la cifra de la ley, literal', () => {
    expect(d2018?.value).toBe(3751.2);
    expect(d2018?.quote).toContain('3.751,20');
    const nota = d2018?.crossCheck?.notes ?? '';
    const cita = /Cita: «([^»]+)»/.exec(nota)?.[1] ?? '';
    expect(cita).toContain('3.803,70');
    expect(plano(ley)).toContain(plano(cita));
  });
});
