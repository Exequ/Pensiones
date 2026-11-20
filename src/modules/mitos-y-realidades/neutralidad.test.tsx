/**
 * Neutralidad verificable (regla c de CLAUDE.md) de «Mitos y realidades»: la página no da veredictos.
 * El texto renderizado (incluidas las fuentes y las tablas de datos), los textos del catálogo de
 * afirmaciones y la entrada de la sección no contienen términos de veredicto ni palabras de
 * valoración (`scripts/lib/valoraciones.ts`). Las afirmaciones entrecomilladas, tal como circulan,
 * pueden llevar palabras de valoración propias de la afirmación («insostenibles»), pero no
 * términos de veredicto: se comprueban aparte.
 */
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import {
  PALABRAS_DE_VEREDICTO,
  valoracionesEn,
  veredictosEn,
} from '../../../scripts/lib/valoraciones.ts';
import { buscarSeccion } from '../secciones';
import { catalogo } from './datos-mitos';
import MitosYRealidades from './Pagina';
import { textoSinInterpretaciones } from '../../test/interpretaciones';

const seccion = buscarSeccion('mitos-y-realidades');

/** Todos los textos de una estructura JSON (valores de cadena). */
function textos(valor: unknown): string[] {
  if (typeof valor === 'string') return [valor];
  if (Array.isArray(valor)) return valor.flatMap(textos);
  if (valor !== null && typeof valor === 'object') return Object.values(valor).flatMap(textos);
  return [];
}

describe('detector de términos de veredicto', () => {
  it('encuentra los términos de veredicto y admite el nombre de la sección', () => {
    expect(veredictosEn('Este dato desmiente la afirmación')).toEqual(['desmient']);
    expect(veredictosEn('La afirmación es falsa')).toContain('falsa');
    expect(veredictosEn('Resulta confirmado por los datos')).toContain('confirmad');
    expect(veredictosEn('Es un bulo')).toContain('bulo');
    expect(veredictosEn('tiene razón')).toContain('tiene razon');
    expect(veredictosEn('Mitos y realidades')).toEqual([]);
    expect(valoracionesEn(seccion.titulo)).toEqual([]);
  });
  it('los términos de veredicto también forman parte de la lista general de valoración', () => {
    expect(valoracionesEn('un mito')).toContain('mito');
    expect(PALABRAS_DE_VEREDICTO.length).toBeGreaterThan(20);
  });
});

describe('neutralidad de la página «Mitos y realidades»', () => {
  const mitos = catalogo().mitos;

  it('el texto renderizado no contiene términos de veredicto ni palabras de valoración', () => {
    const { container } = render(
      <MemoryRouter>
        <MitosYRealidades />
      </MemoryRouter>,
    );
    let texto = textoSinInterpretaciones(container);
    expect(texto.length).toBeGreaterThan(5000);
    // Las afirmaciones, tal como circulan, se comprueban aparte.
    for (const m of mitos) texto = texto.replaceAll(m.enunciado, '');
    expect(veredictosEn(texto)).toEqual([]);
    expect(valoracionesEn(texto)).toEqual([]);
  });

  it('las afirmaciones tal como circulan no contienen términos de veredicto', () => {
    for (const m of mitos) expect(veredictosEn(m.enunciado), m.id).toEqual([]);
  });

  it('los textos del catálogo (definiciones, límites y faltantes) no contienen veredictos ni valoraciones', () => {
    for (const m of mitos) {
      const propios = textos([
        m.definiciones,
        m.noSePuedeConcluir,
        m.faltan ?? [],
        m.preguntaActuarial,
      ]).join(' ');
      expect(veredictosEn(propios), m.id).toEqual([]);
      expect(valoracionesEn(propios), m.id).toEqual([]);
    }
  });

  it('la entrada de la sección en `secciones.ts` no contiene veredictos ni valoraciones', () => {
    const texto = textos([seccion.resumen, seccion.previsto]).join(' ');
    expect(veredictosEn(texto)).toEqual([]);
    expect(valoracionesEn(texto)).toEqual([]);
  });
});
