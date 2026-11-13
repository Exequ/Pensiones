// @vitest-environment node
/**
 * Casos de oro de Sergio: data-raw/casos-oro/casos-sergio.md (formato en docs/CASOS_SERGIO_PLANTILLA.md).
 *
 * - Si el fichero no existe, no se comprueba nada (nada falla).
 * - Si existe, un validador del formato da el error con su línea y columna y, si el formato es
 *   correcto, cada fila se ejecuta como un test con la fachada del motor.
 * - Con datos sintéticos se comprueba siempre el propio lector y el ejecutor.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { crearMotor } from '../src/engine/fachada.ts';
import { COLUMNAS, ejecutarCaso, leerCasosSergio } from './lib/casos-sergio.ts';
import { RAIZ, leerParametroDeDisco } from './lib/motor-jubilacion.ts';

const FICHERO = path.join(RAIZ, 'data-raw/casos-oro/casos-sergio.md');
const PLANTILLA = path.join(RAIZ, 'docs/CASOS_SERGIO_PLANTILLA.md');

describe('casos de oro de Sergio (casos-sergio.md)', () => {
  if (existsSync(FICHERO)) {
    const { casos, errores } = leerCasosSergio(readFileSync(FICHERO, 'utf8'));
    it('el fichero tiene el formato de docs/CASOS_SERGIO_PLANTILLA.md', () => {
      expect(
        errores,
        `Formato no válido en data-raw/casos-oro/casos-sergio.md:\n  - ${errores.join('\n  - ')}`,
      ).toEqual([]);
    });
    for (const c of casos) {
      it(`${c.id} (${c.tipo}, línea ${c.linea}): ${c.fuente.slice(0, 60)}`, () => {
        const r = ejecutarCaso(c, leerParametroDeDisco);
        // Con la marca «diferenciaConocida» y sin coincidir, el caso pasa con una advertencia.
        for (const a of r.advertencias ?? []) console.warn(`[${c.id}] ${a}`);
        expect(r.mensajes, r.mensajes.join('\n')).toEqual([]);
        expect(r.ok).toBe(true);
      });
    }
  } else {
    it('sin fichero no hay nada que comprobar', () => {
      expect(existsSync(FICHERO)).toBe(false);
    });
  }
});

const cab = `| ${COLUMNAS.join(' | ')} |\n| ${COLUMNAS.map(() => '--').join(' | ')} |\n`;
const fila = (...c: string[]) => `| ${c.join(' | ')} |\n`;

describe('lector y ejecutor de casos (datos sintéticos)', () => {
  it('la tabla de ejemplo de la plantilla tiene un formato válido', () => {
    const t = readFileSync(PLANTILLA, 'utf8');
    // Solo la última tabla (la de ejemplo): desde su cabecera.
    const i = [...t.matchAll(/^\|\s*id\s*\|\s*tipo\s*\|/gm)].at(-1)?.index ?? -1;
    expect(i).toBeGreaterThan(0);
    const r = leerCasosSergio(t.slice(i));
    expect(r.errores).toEqual([]);
    expect(r.casos.map((c) => c.id)).toEqual([
      'ejemplo-mei-2026',
      'ejemplo-pnc-2026',
      'ejemplo-jubilacion',
    ]);
  });

  it('ejecuta un caso de cada clase y compara con el motor', () => {
    const motor = crearMotor(leerParametroDeDisco);
    const mei = motor.cotizacionAdicional({ anio: 2026, retribucionMensual: 2000 });
    const texto =
      cab +
      fila(
        'mei-1',
        'mei',
        '2026-06-01',
        '`{}`',
        '`{"retribucionMensual": 2000}`',
        `\`{"cuotaTotal": ${mei.ok ? mei.detalle.cuotaTotal : 0}}\``,
        'cálculo a mano de prueba',
      ) +
      fila(
        'pnc-1',
        'pnc-jubilacion',
        '2026-03-10',
        '`{"nacimiento":"1955-03-03","residenciaLegalMeses":240,"residenciaRecienteMeses":60,"rentasAnuales":0}`',
        '-',
        '`{"pensionMensual": 628.8}`',
        'guía del IMSERSO de 2026 (prueba)',
      ) +
      fila(
        'pnc-error',
        'pnc-jubilacion',
        '2027-03-10',
        '`{"nacimiento":"1955-03-03","residenciaLegalMeses":240,"residenciaRecienteMeses":60,"rentasAnuales":0}`',
        '-',
        '`{"error":"DatoNoDisponible"}`',
        'el motor no tiene la cuantía de 2027',
      ) +
      fila(
        'sup-1',
        'supervivencia',
        '2026-03-15',
        '`{"causa":"enfermedad-comun","situacion":"alta","viudos":[{"vinculo":"conyuge","nacimiento":"1976-05-01","fechaMatrimonio":"2005-06-01"}],"huerfanos":[{"nacimiento":"2014-01-01"}]}`',
        '`[{"desde":"2010-01","hasta":"2026-02","baseMensual":2000}]`',
        '`{"prestaciones":[{"clase":"viudedad","indice":0,"pensionMensual":891.43},{"clase":"orfandad","indice":0,"pensionMensual":342.86}]}`',
        'cálculo a mano (prueba)',
      );
    const { casos, errores } = leerCasosSergio(texto);
    expect(errores).toEqual([]);
    expect(casos.length).toBe(4);
    for (const c of casos) {
      const r = ejecutarCaso(c, leerParametroDeDisco);
      expect(r.mensajes, c.id).toEqual([]);
    }
  });

  it('una diferencia con el motor se explica con las dos cifras', () => {
    const t =
      cab +
      fila(
        'pnc-mal',
        'pnc-jubilacion',
        '2026-03-10',
        '`{"nacimiento":"1955-03-03","residenciaLegalMeses":240,"residenciaRecienteMeses":60,"rentasAnuales":0}`',
        '-',
        '`{"pensionMensual": 700}`',
        'valor erróneo a propósito',
      );
    const { casos } = leerCasosSergio(t);
    const r = ejecutarCaso(casos[0]!, leerParametroDeDisco);
    expect(r.ok).toBe(false);
    expect(r.mensajes[0]).toMatch(/el motor da 628\.8000 y el caso espera 700/);
  });

  describe('marca «diferenciaConocida»', () => {
    const pnc = (esperado: string) =>
      cab +
      fila(
        'pnc-marca',
        'pnc-jubilacion',
        '2026-03-10',
        '`{"nacimiento":"1955-03-03","residenciaLegalMeses":240,"residenciaRecienteMeses":60,"rentasAnuales":0}`',
        '-',
        `\`${esperado}\``,
        'valor de prueba para la marca',
      );
    const MOTIVO = 'IPC mensual aproximado por interpolación anual (prueba)';

    it('un caso con la marca que no coincide da una advertencia y no falla', () => {
      const { casos, errores } = leerCasosSergio(
        pnc(`{"pensionMensual": 700, "diferenciaConocida": "${MOTIVO}"}`),
      );
      expect(errores).toEqual([]);
      const r = ejecutarCaso(casos[0]!, leerParametroDeDisco);
      expect(r.ok).toBe(true);
      expect(r.estado).toBe('diferencia-conocida');
      expect(r.mensajes).toEqual([]);
      expect(r.advertencias?.[0]).toContain(MOTIVO);
      expect(r.advertencias?.[0]).toMatch(/el motor da 628\.8000 y el caso espera 700/);
    });

    it('un caso con la marca que sí coincide FALLA, para obligar a retirarla', () => {
      const { casos } = leerCasosSergio(
        pnc(`{"pensionMensual": 628.8, "diferenciaConocida": "${MOTIVO}"}`),
      );
      const r = ejecutarCaso(casos[0]!, leerParametroDeDisco);
      expect(r.ok).toBe(false);
      expect(r.estado).toBe('falla');
      expect(r.mensajes[0]).toMatch(/retire la marca/);
    });

    it('sin la marca, una diferencia falla y un acierto coincide', () => {
      const mal = ejecutarCaso(
        leerCasosSergio(pnc('{"pensionMensual": 700}')).casos[0]!,
        leerParametroDeDisco,
      );
      expect(mal.ok).toBe(false);
      expect(mal.estado).toBe('falla');
      const bien = ejecutarCaso(
        leerCasosSergio(pnc('{"pensionMensual": 628.8}')).casos[0]!,
        leerParametroDeDisco,
      );
      expect(bien.ok).toBe(true);
      expect(bien.estado).toBe('coincide');
    });

    it('la marca respeta la tolerancia del caso', () => {
      // 628,80 frente a 628,85: con tolerancia 0,10 coincide, y entonces la marca sobra.
      const r = ejecutarCaso(
        leerCasosSergio(
          pnc(`{"pensionMensual": 628.85, "tolerancia": 0.1, "diferenciaConocida": "${MOTIVO}"}`),
        ).casos[0]!,
        leerParametroDeDisco,
      );
      expect(r.ok).toBe(false);
      expect(r.mensajes[0]).toMatch(/retire la marca/);
    });

    it('la marca debe ser un texto con el motivo', () => {
      const a = leerCasosSergio(pnc('{"pensionMensual": 700, "diferenciaConocida": true}'));
      expect(a.errores.join('\n')).toMatch(/«diferenciaConocida» debe ser un texto con el motivo/);
      const b = leerCasosSergio(pnc('{"pensionMensual": 700, "diferenciaConocida": "x"}'));
      expect(b.errores.join('\n')).toMatch(/«diferenciaConocida» debe ser un texto/);
    });
  });

  it('los errores de formato dicen línea, columna y qué corregir', () => {
    const t =
      cab +
      fila('a', 'pension-rara', '2026/03/10', '`{"nacimiento"`', '-', '`{}`', 'x') +
      fila(
        'a',
        'jubilacion',
        '2026-03-10',
        '`{}`',
        'no es json',
        '`{"pensionMensual": 1}`',
        'fuente suficiente',
      ) +
      '| solo | tres | columnas |\n';
    const { casos, errores } = leerCasosSergio(t);
    expect(casos).toEqual([]);
    const todo = errores.join('\n');
    expect(todo).toMatch(/Línea 3, columna «tipo»: «pension-rara» no es válido/);
    expect(todo).toMatch(
      /Línea 3, columna «fecha del hecho causante»: «2026\/03\/10» debe tener el formato AAAA-MM-DD/,
    );
    expect(todo).toMatch(/Línea 3, columna «datos personales»: JSON no válido/);
    expect(todo).toMatch(/Línea 3, columna «resultado esperado»: indique al menos/);
    expect(todo).toMatch(/Línea 3, columna «fuente o método»: indique de dónde sale/);
    expect(todo).toMatch(/Línea 4, columna «id»: «a» está repetido/);
    expect(todo).toMatch(/Línea 4, columna «carrera o bases»: JSON no válido/);
    expect(todo).toMatch(/Línea 5: la fila tiene 3 columnas y deben ser 7/);
  });

  it('una tabla con otra cabecera o sin tabla da un mensaje claro', () => {
    expect(leerCasosSergio('| a | b |\n| -- | -- |\n| 1 | 2 |\n').errores[0]).toMatch(
      /la cabecera de la tabla debe ser/,
    );
    expect(leerCasosSergio('texto sin tabla').errores[0]).toMatch(
      /No se ha encontrado ninguna tabla/,
    );
    expect(leerCasosSergio(cab).errores[0]).toMatch(/no tiene ningún caso/);
  });
});
