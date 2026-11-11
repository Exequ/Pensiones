/**
 * npm run check:contraste
 *
 * Verifica, con los valores reales de src/styles/tokens.css:
 *  - contraste WCAG AA de todos los pares de color que usa la interfaz;
 *  - que los colores categóricos se distingan por luminosidad y con daltonismo simulado;
 *  - que la escala secuencial sea monótona.
 */
import { readFile } from 'node:fs/promises';
import {
  evaluarPares,
  evaluarSecuencial,
  evaluarSeparacion,
  leerTokensColor,
  UMBRAL,
} from './lib/paleta.ts';

const tokens = leerTokensColor(await readFile('src/styles/tokens.css', 'utf8'));
const formato = (n: number): string => n.toFixed(2).replace('.', ',');
let fallos = 0;

console.log('Contraste WCAG 2.x (AA: texto ≥ 4,5:1; gráficos y controles ≥ 3:1)\n');
for (const r of evaluarPares(tokens)) {
  if (!r.cumple) fallos++;
  console.log(
    `${r.cumple ? '✓' : '✗'} ${formato(r.ratio).padStart(6)}:1  ${r.uso.padEnd(7)} ≥ ${formato(UMBRAL[r.uso])}  ${r.primerPlano} sobre ${r.fondo} — ${r.donde}`,
  );
}

console.log('\nSeparación de la paleta categórica\n');
for (const r of evaluarSeparacion(tokens)) {
  if (!r.cumple) fallos++;
  console.log(
    `${r.cumple ? '✓' : '✗'} ${r.vision.padEnd(22)} peor par ${r.a} / ${r.b}: ${formato(r.valor)} (mínimo ${r.minimo})`,
  );
}

const secuencialOk = evaluarSecuencial(tokens);
if (!secuencialOk) fallos++;
console.log(`\n${secuencialOk ? '✓' : '✗'} Escala secuencial monótona de papel a granate`);

if (fallos > 0) {
  console.error(`\n${fallos} comprobación(es) de color no superadas.`);
  process.exit(1);
}
console.log('\n✓ Todos los pares de color cumplen AA y la paleta es distinguible.');
