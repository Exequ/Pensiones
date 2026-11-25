/**
 * Fase R7: módulo de definiciones (`src/contenido/definiciones`). Cada registro tiene un id estable
 * igual al nombre de su fichero; su texto no lleva cifras escritas a mano, ni citas de artículos, ni
 * expresiones prohibidas por la guía de voz, ni valoraciones; cada referencia apunta a un fichero (y,
 * si lleva `#id`, a un dato o una serie) que existe en /data y que tiene fuente; las fórmulas son
 * coherentes (símbolos de la ecuación y de la leyenda) y no tienen ninguna cifra.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { citasDeTexto } from '../src/engine/citas-normativas.ts';
import {
  buscarDefinicion,
  leerDefinicion,
  PATRON_REF_DEFINICION,
  type Definicion,
} from '../src/engine/definiciones.ts';
import { ArchivoDatos, ArchivoTabla, Fuente } from '../src/engine/esquema-datos.ts';
import { comprobarFormula, referenciasUsadas } from '../src/engine/formulas.ts';
import { valoracionesEn, veredictosEn } from './lib/valoraciones.ts';
import { vozEn } from './lib/voz.ts';

const RAIZ = path.resolve(import.meta.dirname, '..');
const CARPETA = path.join(RAIZ, 'src/contenido/definiciones');
const ficheros = readdirSync(CARPETA).filter((f) => f.endsWith('.json'));
const leerJson = (ruta: string): unknown => JSON.parse(readFileSync(ruta, 'utf8'));
const DEFINICIONES: Definicion[] = ficheros.map((f) =>
  leerDefinicion(f.replace(/\.json$/, ''), leerJson(path.join(CARPETA, f))),
);

/** Ids que otras páginas y fases usan: no pueden cambiar ni desaparecer. */
const IDS_ESTABLES = [
  'gasto-frente-a-financiacion',
  'gasto-pensiones-contributivas-sin-complemento',
  'gasto-pensiones-contributivas-con-complemento',
  'gasto-pensiones-esspros-vejez',
  'gasto-pensiones-esspros-vejez-supervivientes',
  'gasto-pensiones-ocde',
  'gasto-pensiones-ageing-report',
  'gasto-sobre-pib',
  'saldo-presupuestario-no-financiero',
  'saldo-presupuestario-total',
  'capacidad-necesidad-financiacion-sec',
  'saldo-no-financiero-menos-transferencias',
  'derechos-reconocidos-netos',
  // Fase R8 («La hucha»).
  'fondo-de-reserva',
  'fondo-de-reserva-limite-de-desembolso',
  'prestamos-del-estado-a-la-seguridad-social',
  'transferencias-corrientes-del-estado',
  'fondo-menos-deuda',
  'deuda-mas-transferencias-acumuladas',
  'fondo-en-meses-de-gasto',
  'fondo-en-meses-de-transferencias',
] as const;

/** Todos los textos visibles de una definición (término, párrafos, perímetro, criterio y fórmula). */
function textos(d: Definicion): string[] {
  const t = [d.termino, ...d.texto, d.criterio ?? ''];
  if (d.perimetro) t.push(...d.perimetro.incluye, ...d.perimetro.noIncluye);
  if (d.perimetro?.sinDetalle) t.push(d.perimetro.sinDetalle);
  if (d.formula) {
    t.push(d.formula.titulo, ...(d.formula.notas ?? []));
    for (const s of d.formula.simbolos) t.push(s.notacion, s.nombre, s.significado, s.unidad ?? '');
  }
  return t.filter((x) => x !== '');
}

/** Ids de los datos y las series de un fichero de /data (vacío si es una tabla). */
function idsDe(json: unknown): { ids: Set<string>; tabla: boolean } {
  const tabla = ArchivoTabla.safeParse(json);
  if (tabla.success) return { ids: new Set(), tabla: true };
  const a = ArchivoDatos.parse(json);
  return {
    ids: new Set([...(a.data ?? []).map((x) => x.id), ...(a.series ?? []).map((x) => x.id)]),
    tabla: false,
  };
}

describe('módulo de definiciones', () => {
  it('cada fichero es una definición válida cuyo id coincide con el nombre del fichero', () => {
    expect(ficheros.length).toBe(DEFINICIONES.length);
    expect(new Set(DEFINICIONES.map((d) => d.id)).size).toBe(DEFINICIONES.length);
  });

  it('los ids estables existen (gasto en pensiones, déficit, contabilidad y Fondo de Reserva)', () => {
    const ids = DEFINICIONES.map((d) => d.id);
    for (const id of IDS_ESTABLES) expect(ids, id).toContain(id);
    const grupos = new Set(DEFINICIONES.map((d) => d.grupo));
    expect([...grupos].sort()).toEqual([
      'contabilidad',
      'deficit',
      'fondo-de-reserva',
      'gasto-en-pensiones',
    ]);
  });

  it('el id inexistente falla con un mensaje claro que lista los ids válidos', () => {
    expect(() => buscarDefinicion(DEFINICIONES, 'no-existe')).toThrow(
      /Definición desconocida: «no-existe»\. Ids válidos: .*saldo-presupuestario-total/,
    );
  });

  it.each(DEFINICIONES.map((d) => [d.id, d] as const))(
    '%s: sin dígitos, sin citas de artículos, con la voz de la web y sin valoraciones',
    (_id, d) => {
      for (const t of textos(d)) {
        expect(t, 'cifra escrita a mano').not.toMatch(/\d/);
        expect(citasDeTexto(t), t).toEqual([]);
        expect(t, 'abreviatura de norma').not.toMatch(/TRLGSS|\bDT\b|\bRDL?\b/);
        expect(vozEn(t), t).toEqual([]);
        expect(veredictosEn(t), t).toEqual([]);
        expect(valoracionesEn(t), t).toEqual([]);
      }
    },
  );

  it.each(DEFINICIONES.map((d) => [d.id, d] as const))(
    '%s: cada referencia existe en /data y tiene fuente',
    (_id, d) => {
      for (const ref of d.datos) {
        expect(ref).toMatch(PATRON_REF_DEFINICION);
        const [fichero = '', id] = ref.split('#');
        const json = leerJson(path.join(RAIZ, 'data', fichero));
        const { ids, tabla } = idsDe(json);
        if (id !== undefined) expect(ids.has(id), ref).toBe(true);
        else expect(tabla || ids.size > 0, ref).toBe(true);
        // El fichero lleva fuente con url (y cada dato o serie, la suya: lo exige validate:data).
        const fuente = Fuente.safeParse((json as { source?: unknown }).source);
        const conFuente =
          fuente.success ||
          (!tabla && [...ids].length > 0 && (json as { tipo?: string }).tipo === 'datos');
        expect(conFuente, ref).toBe(true);
      }
    },
  );

  it('las fórmulas son coherentes y no llevan ninguna cifra', () => {
    const conFormula = DEFINICIONES.filter((d) => d.formula !== undefined);
    expect(conFormula.map((d) => d.id).sort()).toEqual([
      'deuda-mas-transferencias-acumuladas',
      'fondo-en-meses-de-gasto',
      'fondo-en-meses-de-transferencias',
      'fondo-menos-deuda',
      'gasto-sobre-pib',
      'saldo-no-financiero-menos-transferencias',
      'saldo-presupuestario-no-financiero',
      'saldo-presupuestario-total',
    ]);
    for (const d of conFormula) {
      const f = d.formula!;
      expect(
        comprobarFormula(f, () => undefined),
        d.id,
      ).toEqual([]);
      expect(referenciasUsadas(f), d.id).toEqual([]);
    }
  });
});
