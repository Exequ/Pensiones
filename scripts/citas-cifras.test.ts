// @vitest-environment node
/**
 * La cita literal de cada dato de cuantías debe contener la cifra que respalda (regla de la Fase
 * 2-B-2/2-B-3): se extraen los números del texto de la cita (con separador de miles, espacio o sin
 * él) y alguno debe coincidir con el valor del dato.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ArchivoDatos } from '../src/engine/esquema-datos.ts';

const DATA = path.resolve(import.meta.dirname, '../data/parametros');

/** Ficheros de cuantías en euros o tipos en porcentaje, de todos los años (desde 2000). */
const FICHEROS = [
  'pension-minima-jubilacion',
  'pension-minima-incapacidad',
  'pension-minima-viudedad',
  'pension-minima-orfandad-familiares',
  'pnc-importe-anual',
  'pnc-complemento-alquiler',
  'cuota-solidaridad-calendario',
  'mei-tipo-total',
  'mei-tipo-empresa',
  'mei-tipo-trabajador',
  'smi-mensual',
  'smi-anual',
  'pension-maxima',
  'limite-ingresos-complementos-minimos',
  'complemento-brecha-genero',
];

function numerosDe(texto: string): number[] {
  const res: number[] = [];
  // 1.234,56 | 1 234,56 | 1234,56 | 1234 | 0,5
  for (const m of texto.matchAll(/\d{1,3}(?:[. \u00a0]\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g)) {
    res.push(Number(m[0].replace(/[. \u00a0]/g, '').replace(',', '.')));
  }
  return res;
}

describe('la cita contiene la cifra del dato', () => {
  for (const f of FICHEROS) {
    it(f, () => {
      const archivo = ArchivoDatos.parse(
        JSON.parse(readFileSync(path.join(DATA, `${f}.json`), 'utf8')) as unknown,
      );
      const malos: string[] = [];
      for (const d of archivo.data ?? []) {
        if (typeof d.value !== 'number' || Number(d.period) < 2000) continue;
        const q = d.quote ?? '';
        if (!numerosDe(q).some((n) => Math.abs(n - (d.value as number)) < 0.005)) malos.push(d.id);
      }
      expect(malos).toEqual([]);
    });
  }
});
