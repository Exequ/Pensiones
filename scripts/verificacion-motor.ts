/**
 * Verificación independiente del motor de jubilación (30 combinaciones de año × perfil).
 * Uso: npx tsx scripts/verificacion-motor.ts [--completa]
 * Sale con código 1 si alguna invariante falla.
 */
import { ejecutarVerificacion } from './lib/verificacion-motor.ts';

const informe = ejecutarVerificacion(process.argv.includes('--completa'));
console.log(
  `Combinaciones: ${informe.combinaciones}; comprobaciones: ${informe.comprobaciones}; violaciones: ${informe.violaciones.length}`,
);
for (const f of informe.filas.slice(0, 40))
  console.log(`${f.anio} | ${f.perfil} | ${f.pensionAnual.toFixed(0)} €/año | ${f.estado}`);
for (const v of informe.violaciones) console.error('VIOLACIÓN:', v);
if (informe.violaciones.length > 0) process.exit(1);
