/**
 * Imprime la tabla del contraste motor / M5 en Markdown (para docs/CONTRASTE_M5.md); la diferencia es relativa a la pensión de M5 v2.
 * Uso: npx tsx scripts/contraste-m5.ts
 */
import { casos, reproducir } from './lib/contraste-m5.ts';

const fe = (n: number) => n.toExponential(2).replace('.', ',');

const f = (n: number, d = 0) =>
  n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
console.log(
  '| Caso | M5 (€/año) | Motor (€/año) | Diferencia | Estado M5 / motor | Base reguladora M5 / motor (€/mes) |',
);
console.log(
  '| ---- | ---------: | ------------: | ---------: | ----------------- | ---------------------------------: |',
);
for (const c of casos) {
  const r = reproducir(c);
  console.log(
    `| ${c.nombre} | ${f(c.salida.pension_final)} | ${f(r.motor)} | ${Math.abs(r.diferenciaRelativa) < 1e-9 ? '0' : f(r.diferenciaRelativa * 100, 4) + ' %'} | ${c.salida.estado} / ${r.estadoMotor} | ${f(c.salida.base_reguladora_mensual)} / ${f(r.baseReguladora)} |`,
  );
}
const dif = casos.map((c) => Math.abs(reproducir(c).diferenciaRelativa));
console.log(
  `\nDiferencia relativa máxima: ${fe(Math.max(...dif))}; casos con diferencia ≤ 1e-6: ${dif.filter((d) => d <= 1e-6).length} de ${dif.length}.`,
);
