// @vitest-environment node
/**
 * Ajustes actuariales 4: la tabla de aplicación de la cuarta tanda
 * (`docs/revision-actuarial/aplicacion-tanda4.json`) y su coherencia con el repositorio.
 *
 * - Paso 2 del encargo: cada cita literal («…») de la columna «que» de una norma descargada en
 *   `data-raw/boe/` consta en ese texto (con los espacios normalizados). Lo que no consta no se aplica.
 * - Cada fichero citado existe.
 * - Cada afirmación de la lista tiene en `docs/claims.json` el estado de la tabla, con su respuesta
 *   (revisada) o su pregunta reducida (pendiente).
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { RegistroAfirmaciones } from '../src/engine/esquema-datos.ts';

const RAIZ = path.resolve(import.meta.dirname, '..');
const leer = (r: string) => readFileSync(path.join(RAIZ, r), 'utf8');

interface Verificado {
  fichero: string;
  ubicacion: string;
  que: string;
}
interface Punto {
  punto: number;
  tema: string;
  aplica: string;
  verificado: Verificado[];
  noAplica: string;
}
interface Afirmacion {
  id: string;
  destino: 'claims' | 'claims-web' | 'mitos';
  mito?: string;
  punto: number;
  estado: 'revisada' | 'pendiente';
  respuestaActuarial?: string;
  preguntaReducida?: string;
  comprobado: string;
}
const tabla = JSON.parse(leer('docs/revision-actuarial/aplicacion-tanda4.json')) as {
  puntos: Punto[];
  afirmaciones: Afirmacion[];
};
const normaliza = (t: string) => t.replace(/\s+/g, ' ').toLowerCase();

describe('aplicación de la cuarta tanda (docs/revision-actuarial/aplicacion-tanda4.json)', () => {
  it('tiene los ocho puntos, cada uno con lo que se aplica, lo verificado y lo que no se aplica', () => {
    expect(tabla.puntos.map((p) => p.punto)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (const p of tabla.puntos) {
      expect(p.aplica.length, String(p.punto)).toBeGreaterThan(40);
      expect(p.noAplica.length, String(p.punto)).toBeGreaterThan(5);
      expect(p.verificado.length, String(p.punto)).toBeGreaterThan(0);
    }
  });

  it('cada cita de una norma de data-raw/boe consta en su texto descargado', () => {
    let citas = 0;
    for (const p of tabla.puntos) {
      for (const v of p.verificado) {
        if (!v.fichero.startsWith('data-raw/boe/')) continue;
        const texto = normaliza(leer(v.fichero));
        for (const m of v.que.matchAll(/«([^»]+)»/g)) {
          const cita = m[1] ?? '';
          expect(texto.includes(normaliza(cita)), `${v.fichero} (${v.ubicacion}): «${cita}»`).toBe(
            true,
          );
          citas++;
        }
      }
    }
    expect(citas).toBeGreaterThan(15);
  });

  it('los ficheros citados existen', () => {
    for (const p of tabla.puntos)
      for (const v of p.verificado)
        for (const f of v.fichero.split(/, | y /)) {
          const ruta = f.trim();
          if (!ruta.includes('/')) continue;
          expect(existsSync(path.join(RAIZ, ruta)), ruta).toBe(true);
        }
  });

  it('cada afirmación tiene en docs/claims.json el estado de la tabla', () => {
    const claims = RegistroAfirmaciones.parse(JSON.parse(leer('docs/claims.json')));
    const porId = new Map(claims.claims.map((c) => [c.id, c]));
    for (const f of tabla.afirmaciones) {
      const c = porId.get(f.id);
      expect(c, f.id).toBeDefined();
      expect(c?.revisionActuarial, f.id).toBe(f.estado);
      expect(f.comprobado.length, f.id).toBeGreaterThan(40);
      if (f.estado === 'revisada') {
        expect(f.respuestaActuarial, f.id).toMatch(/^Tanda 4, parte A, n\.º [1-8]/);
        expect(c?.respuestaActuarial, f.id).toBe(f.respuestaActuarial);
        expect(c?.preguntaActuarial, f.id).toBeUndefined();
      } else {
        expect(c?.preguntaActuarial, f.id).toBe(f.preguntaReducida);
      }
    }
  });

  it('las de los textos de la web y del catálogo constan también en sus ficheros de origen', () => {
    const web = (
      JSON.parse(leer('docs/claims-web.json')) as {
        claims: { id: string; revisionActuarial?: string; respuestaActuarial?: string }[];
      }
    ).claims;
    const catalogo = (
      JSON.parse(leer('data/mitos/afirmaciones-circulantes.json')) as {
        mitos: { id: string; revisionActuarial: string; respuestaActuarial?: string }[];
      }
    ).mitos;
    for (const f of tabla.afirmaciones) {
      if (f.destino === 'claims-web') {
        const c = web.find((x) => x.id === f.id);
        expect(c?.revisionActuarial, f.id).toBe(f.estado);
        expect(c?.respuestaActuarial, f.id).toBe(f.respuestaActuarial);
      }
      if (f.mito !== undefined) {
        const m = catalogo.find((x) => x.id === f.mito);
        expect(m?.revisionActuarial, f.mito).toBe(f.estado);
        expect(m?.respuestaActuarial, f.mito).toBe(f.respuestaActuarial);
      }
    }
  });
});
