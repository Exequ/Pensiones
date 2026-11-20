/**
 * Valida los registros de las cajas «Interpretación» (`src/contenido/interpretaciones/*.json`): el
 * esquema (`src/engine/interpretaciones.ts`), que el id coincida con el nombre del fichero y las reglas
 * de `scripts/lib/interpretaciones.ts`. Forma parte de `npm run lint`.
 */
import { infraccionesDe } from './lib/interpretaciones.ts';
import {
  contextoDelDisco,
  Interpretacion,
  registrosDelDisco,
} from './lib/interpretaciones-contexto.ts';

const ctx = contextoDelDisco();
const errores: string[] = [];
const registros = registrosDelDisco();
for (const { fichero, json } of registros) {
  const r = Interpretacion.safeParse(json);
  if (!r.success) {
    errores.push(
      `${fichero}: ${r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
    );
    continue;
  }
  if (`${r.data.id}.json` !== fichero) errores.push(`${fichero}: el id no coincide con el nombre`);
  for (const f of infraccionesDe(r.data, ctx))
    errores.push(`${fichero}: [${f.regla}] ${f.detalle}`);
}
console.log(`Registros de interpretación revisados: ${String(registros.length)}`);
if (errores.length > 0) {
  for (const e of errores) console.error(`✗ ${e}`);
  process.exit(1);
}
console.log('✓ Todas las interpretaciones cumplen el esquema y las reglas.');
