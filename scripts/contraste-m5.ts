/**
 * Imprime la tabla del contraste motor / M5 en Markdown (para docs/CONTRASTE_M5.md).
 * Uso: npx tsx scripts/contraste-m5.ts
 */
import { casos, reproducir } from './lib/contraste-m5.ts';

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
    `| ${c.nombre} | ${f(c.salida.pension_final)} | ${f(r.motor)} | ${f(r.diferenciaRelativa * 100, 2)} % | ${c.salida.estado} / ${r.estadoMotor}${r.cumple ? '' : ' (no causa derecho a los 65)'} | ${f(c.salida.base_reguladora_mensual)} / ${f(r.baseReguladora)} |`,
  );
}
const dif = casos.map((c) => Math.abs(reproducir(c).diferenciaRelativa));
console.log(
  `\nDiferencia máxima: ${f(Math.max(...dif) * 100, 2)} %; casos con diferencia ≤ 0,5 %: ${dif.filter((d) => d <= 0.005).length} de ${dif.length}; ≤ 1,5 %: ${dif.filter((d) => d <= 0.015).length} de ${dif.length}.`,
);
