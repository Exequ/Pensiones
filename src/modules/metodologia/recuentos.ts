/**
 * Recuentos de la página: se calculan al compilar, con `calcularRecuentos`, desde los ficheros del
 * repositorio (módulo virtual de `vite.config.ts`). Aquí solo se reexportan con el tipo.
 */
import recuentosCompilados from 'virtual:recuentos-metodologia';
import type { RecuentosMetodologia } from '../../engine/metodologia';

export const recuentos = recuentosCompilados as RecuentosMetodologia;
