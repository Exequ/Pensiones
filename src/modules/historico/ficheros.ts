/**
 * Ficheros de /data que lee cada página histórica (Fase 5-A). Es la lista que comprueba el test de
 * procedencia (`scripts/historico-5a.test.ts`): cada fichero debe tener fuente, fecha de descarga y
 * confianza, y cada módulo `datos-*.ts` debe importar exactamente los suyos. Sin dependencias.
 * Las tablas se listan por su JSON; el CSV hermano tiene el mismo nombre.
 */

export const FICHEROS_COTIZANTES = [
  'data/sistema/afiliacion-anual.json',
  'data/sistema/afiliados-sexo-edad.json',
  'data/sistema/altas-bajas-anual-clase-sexo.json',
  'data/sistema/edad-media-altas-jubilacion.json',
  'data/parametros/ipc-indice-medio-anual.json',
  'data/sistema/pensiones-vigor-pension-media.json',
  'data/sistema/pensiones-vigor-edad-clase-sexo.json',
  'data/sistema/pensiones-vigor-numero.json',
  'data/sistema/pensionistas-pensiones-historico.json',
  'data/sistema/relacion-afiliados-pensiones-alternativa-1.json',
  'data/sistema/relacion-afiliados-pensiones.json',
] as const;

export const FICHEROS_FINANCIACION = [
  'data/internacional/eurostat-espana.json',
  'data/internacional/ocde-espana.json',
  'data/macro/pib-ine.json',
  'data/sistema/deficit-definiciones.json',
  'data/sistema/deficit-presupuestario-seguridad-social.json',
  'data/sistema/deficit-sec-fondos-seguridad-social.json',
  'data/sistema/gastos-impropios.json',
  'data/sistema/presupuesto-ss-ejecucion.json',
] as const;

export const FICHEROS_HUCHA = [
  'data/normativa/cronologia.json',
  'data/normativa/trlgss-financiacion.json',
  'data/macro/pib-ine.json',
  'data/parametros/fondo-reserva-desembolso-maximo.json',
  'data/parametros/mei-destino.json',
  'data/parametros/prestamos-estado-seguridad-social.json',
  'data/parametros/prestamos-plazo-ampliado-2026.json',
  'data/sistema/deuda-pde-seguridad-social.json',
  'data/sistema/prestamos-transferencias-tribunal-cuentas.json',
  'data/sistema/fondo-reserva-anual.json',
  'data/sistema/fondo-reserva-series.json',
  'data/sistema/pensiones-vigor-pension-media.json',
  'data/sistema/pensiones-vigor-numero.json',
] as const;
