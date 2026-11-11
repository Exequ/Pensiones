/**
 * npm run check:estilos
 *
 * Recorre src/ e index.html y falla si encuentra sombras, degradados,
 * desenfoques, animaciones, radios > 2 px, colores o fuentes fuera de los
 * tokens, recursos externos o variables CSS sin definir.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  auditarFichero,
  variablesDefinidas,
  variablesNoDefinidas,
  type Infraccion,
} from './lib/auditoria-estilos.ts';

const RAIZ = process.cwd();
const TOKENS = path.join('src', 'styles', 'tokens.css');

const entradas = await readdir(path.join(RAIZ, 'src'), { withFileTypes: true, recursive: true });
const ficheros = entradas
  .filter((e) => e.isFile() && /\.(css|tsx?)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name))
  .map((e) => path.relative(RAIZ, path.join(e.parentPath, e.name)))
  .concat('index.html')
  .sort();

const contenidos = new Map<string, string>();
for (const fichero of ficheros) contenidos.set(fichero, await readFile(fichero, 'utf8'));

const definidas = new Set<string>();
for (const [fichero, contenido] of contenidos) {
  if (fichero.endsWith('.css')) for (const v of variablesDefinidas(contenido)) definidas.add(v);
}

const infracciones: Infraccion[] = [];
for (const [fichero, contenido] of contenidos) {
  infracciones.push(...auditarFichero(fichero, contenido, { permitirColores: fichero === TOKENS }));
  infracciones.push(...variablesNoDefinidas(fichero, contenido, definidas));
}

console.log(`Ficheros auditados: ${ficheros.length}`);
if (infracciones.length > 0) {
  console.error(`\n${infracciones.length} infracción(es) del sistema de diseño:`);
  for (const i of infracciones)
    console.error(`  ✗ ${i.fichero}:${i.linea} [${i.regla}] ${i.detalle}`);
  process.exit(1);
}
console.log(
  '✓ Sin sombras, degradados, radios > 2 px, animaciones ni colores fuera de los tokens.',
);
