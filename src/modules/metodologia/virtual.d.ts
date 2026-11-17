/** Módulo virtual de `vite.config.ts`: recuentos de la página calculados desde los ficheros del repositorio. */
declare module 'virtual:recuentos-metodologia' {
  import type { RecuentosMetodologia } from '../../engine/metodologia';
  const recuentos: RecuentosMetodologia;
  export default recuentos;
}
