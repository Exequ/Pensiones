/**
 * Inventario de los casos de oro de todos los motores, con su etiqueta («independiente» o «derivado
 * de la norma»). Genera docs/INVENTARIO_CASOS_ORO.md leyendo los ficheros de tests:
 *   npx tsx scripts/inventario-casos-oro.ts          (escribe el documento)
 *   npx tsx scripts/inventario-casos-oro.ts --texto  (solo lo muestra)
 * Un test (`inventario-casos-oro.test.ts`) comprueba que el documento está al día.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { RAIZ } from './lib/motor-jubilacion.ts';

interface Origen {
  readonly motor: string;
  readonly fichero: string;
  /** Etiqueta de todos los casos del fichero si no la lleva cada caso. */
  readonly etiquetaFija?: string;
  readonly fuente: string;
}

const ORIGENES: readonly Origen[] = [
  {
    motor: 'Incapacidad permanente',
    fichero: 'src/engine/incapacidad/casos-oro-incapacidad.test.ts',
    fuente: 'Cuenta a mano en cada caso (bases constantes, hecho causante en 2026).',
  },
  {
    motor: 'Muerte y supervivencia',
    fichero: 'src/engine/supervivencia/casos-oro-supervivencia.test.ts',
    fuente: 'Cuenta a mano en cada caso (bases constantes de 2.000 euros, fallecimiento en 2026).',
  },
  {
    motor: 'Pensiones no contributivas',
    fichero: 'src/engine/no-contributivas/casos-oro-pnc.test.ts',
    fuente: 'Cuenta a mano en cada caso (cuantías de 2026 y 2023).',
  },
  {
    motor: 'Pensiones no contributivas',
    fichero: 'src/engine/no-contributivas/casos-oro-pnc-imserso.test.ts',
    etiquetaFija: 'independiente',
    fuente:
      'Cifras publicadas en las guías del IMSERSO de 2022 a 2026 (URL de cada guía en el test; PDF en data-raw/imserso/).',
  },
  {
    motor: 'MEI y solidaridad',
    fichero: 'src/engine/mei/casos-oro-mei.test.ts',
    fuente: 'Cuenta a mano en cada caso (DT 42.ª y 43.ª, art. 19 bis).',
  },
];

function casos(o: Origen): { id: string; etiqueta: string }[] {
  const t = readFileSync(path.join(RAIZ, o.fichero), 'utf8');
  const ids = [...t.matchAll(/\bid: '([^']+)'/g)].map((m) => ({ id: m[1] ?? '', pos: m.index }));
  const etiquetas = [...t.matchAll(/etiqueta: '([^']+)'/g)].map((m) => ({
    e: m[1] ?? '',
    pos: m.index,
  }));
  return ids.map((x, k) => {
    const fin = ids[k + 1]?.pos ?? Infinity;
    const e = etiquetas.find((y) => y.pos > x.pos && y.pos < fin)?.e ?? o.etiquetaFija;
    if (e === undefined) throw new Error(`${o.fichero}: el caso ${x.id} no tiene etiqueta`);
    return { id: x.id, etiqueta: e };
  });
}

export function inventario(): string {
  const filas: string[] = [];
  const total: Record<string, number> = {};
  const sumar = (e: string, n: number) => (total[e] = (total[e] ?? 0) + n);
  filas.push(
    '| Motor | Casos | independiente | derivado de la norma | Fuente del resultado esperado | Fichero |',
  );
  filas.push(
    '| ----- | ----: | ------------: | -------------------: | ----------------------------- | ------- |',
  );
  filas.push(
    `| Jubilación | 6 | 0 | 6 | Cálculo a mano, recalculado aparte en Python con los JSON de /data (docs/CASOS_ORO_MOTOR.md) | \`src/engine/jubilacion/casos-oro-motor.test.ts\` |`,
  );
  sumar('derivado de la norma', 6);
  const detalle: string[] = [];
  for (const o of ORIGENES) {
    const lista = casos(o);
    const ind = lista.filter((c) => c.etiqueta === 'independiente').length;
    const der = lista.filter((c) => c.etiqueta === 'derivado de la norma').length;
    if (ind + der !== lista.length) throw new Error(`${o.fichero}: etiqueta desconocida`);
    sumar('independiente', ind);
    sumar('derivado de la norma', der);
    filas.push(
      `| ${o.motor} | ${lista.length} | ${ind} | ${der} | ${o.fuente} | \`${o.fichero}\` |`,
    );
    detalle.push(
      `### ${o.motor} (\`${path.basename(o.fichero)}\`)`,
      '',
      lista.map((c) => `\`${c.id}\` (${c.etiqueta})`).join(', '),
      '',
    );
  }
  const ind = total['independiente'] ?? 0;
  const der = total['derivado de la norma'] ?? 0;
  filas.push(`| **Total** | **${ind + der}** | **${ind}** | **${der}** | | |`);
  return [
    '# Inventario de casos de oro de los motores',
    '',
    'Generado por `scripts/inventario-casos-oro.ts` (un test comprueba que está al día). Cada caso lleva una etiqueta:',
    '',
    '- **independiente**: ejemplo resuelto publicado en una fuente oficial, con su URL. Contrasta el motor con algo que el motor no ha producido.',
    '- **derivado de la norma**: calculado a mano a partir del texto legal y de `/data`. Comprueba que el motor aplica nuestra lectura de la norma; **no** es una validación independiente.',
    '',
    'Los casos de oro de Sergio (`data-raw/casos-oro/casos-sergio.md`, formato en `docs/CASOS_SERGIO_PLANTILLA.md`) se ejecutarán además de estos cuando existan.',
    '',
    ...filas,
    '',
    'Además, el contraste con el modelo M5 (`docs/CONTRASTE_M5.md`, 37 casos) y la verificación por rejilla (`scripts/verificacion-motor.ts`) no son casos de oro.',
    '',
    '## Casos por motor',
    '',
    ...detalle,
  ].join('\n');
}

if (process.argv[1]?.endsWith('inventario-casos-oro.ts')) {
  const texto = inventario();
  if (process.argv.includes('--texto')) console.log(texto);
  else writeFileSync(path.join(RAIZ, 'docs/INVENTARIO_CASOS_ORO.md'), texto + '\n');
}
