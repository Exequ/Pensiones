/**
 * npm run validate:data [directorio]
 *
 * Valida todos los JSON de /data (o del directorio indicado) y, si no se pasa
 * directorio, también docs/claims.json. Sale con código 1 si hay errores.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { validarAfirmaciones, validarDirectorio, validarReferenciasMitos } from './lib/validar-datos.ts';

const argumento = process.argv[2];
const directorio = path.resolve(argumento ?? 'data');

if (!existsSync(directorio)) {
  console.error(`No existe el directorio ${directorio}`);
  process.exit(1);
}

const { ficheros, errores } = await validarDirectorio(directorio);
const todos = [...errores, ...(await validarReferenciasMitos(directorio))];
if (argumento === undefined) {
  const claims = path.resolve('docs/claims.json');
  if (existsSync(claims))
    todos.push(...(await validarAfirmaciones(claims, process.cwd(), directorio)));
}

console.log(
  `Ficheros JSON revisados en ${path.relative(process.cwd(), directorio) || '.'}: ${ficheros.length}`,
);
if (todos.length > 0) {
  console.error(`\n${todos.length} error(es) de validación:`);
  for (const error of todos) {
    console.error(`  ✗ ${error.fichero} › ${error.ruta}: ${error.mensaje}`);
  }
  process.exit(1);
}
console.log('✓ Todos los datos cumplen el esquema y tienen fuente verificable.');
