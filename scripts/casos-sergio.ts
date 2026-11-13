/**
 * Valida y ejecuta los casos de oro de Sergio.
 * Uso: npx tsx scripts/casos-sergio.ts [ruta]   (por defecto, data-raw/casos-oro/casos-sergio.md)
 * Sin el fichero no hace nada. Con errores de formato muestra fila y columna; con casos que no
 * coinciden, la diferencia. Sale con código 1 si algo falla. Formato: docs/CASOS_SERGIO_PLANTILLA.md.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { ejecutarCaso, leerCasosSergio } from './lib/casos-sergio.ts';
import { RAIZ, leerParametroDeDisco } from './lib/motor-jubilacion.ts';

const ruta = process.argv[2] ?? path.join(RAIZ, 'data-raw/casos-oro/casos-sergio.md');
if (!existsSync(ruta)) {
  console.log(`No existe ${path.relative(RAIZ, ruta)}: no hay casos de Sergio que validar.`);
  process.exit(0);
}
const { casos, errores } = leerCasosSergio(readFileSync(ruta, 'utf8'));
if (errores.length > 0) {
  console.error(
    `Formato no válido en ${path.relative(RAIZ, ruta)} (docs/CASOS_SERGIO_PLANTILLA.md):`,
  );
  for (const e of errores) console.error(`  - ${e}`);
  process.exit(1);
}
let fallos = 0;
let conocidas = 0;
for (const c of casos) {
  let r;
  try {
    r = ejecutarCaso(c, leerParametroDeDisco);
  } catch (e) {
    r = { ok: false, mensajes: [(e as Error).message] };
  }
  const marca = r.estado === 'diferencia-conocida' ? '⚠' : r.ok ? '✓' : '✗';
  console.log(`${marca} ${c.id} (${c.tipo}, línea ${c.linea})`);
  for (const m of r.mensajes) console.log(`    ${m}`);
  for (const a of r.advertencias ?? []) console.log(`    ${a}`);
  if (r.estado === 'diferencia-conocida') conocidas++;
  if (!r.ok) fallos++;
}
console.log(
  `${casos.length - fallos - conocidas} de ${casos.length} casos coinciden; ${conocidas} con diferencia conocida (advertencia); ${fallos} fallan.`,
);
process.exit(fallos > 0 ? 1 : 0);
