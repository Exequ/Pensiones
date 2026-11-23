/**
 * Datos de la tabla del efecto de adelantar o retrasar la jubilación: la función del motor
 * (`efectoMesesJubilacion`) sobre los parámetros del repositorio, el año de los datos y las fuentes
 * de cada cuadro. No escribe ninguna cifra.
 */
import type { DatoRotulado } from '../../components/fuentes';
import { LECTURAS_ABIERTAS } from '../../engine/lecturas';
import { efectoMesesJubilacion, type EfectoMeses } from '../../engine/jubilacion/efecto-meses';
import { parametrosDelRepositorio } from '../../engine/jubilacion/parametros-datos';
import { rangoGradualDT34, versionEscala } from '../../engine/jubilacion/porcentajes';
import type { LecturasAbiertas } from '../../engine/jubilacion/tipos';
import { memorizar } from '../historico/cargar';
import { anioVigente, datoDeCuadro } from './datos-como';
import { ID_LECTURA_FRACCION } from './pasos-motor';

/** Valor por defecto de la lectura sobre la fracción de año de demora: la que usa el simulador. */
export function fraccionDemoraPorDefecto(): LecturasAbiertas['fraccionDemora'] {
  const v = LECTURAS_ABIERTAS.find((l) => l.id === ID_LECTURA_FRACCION)?.porDefecto;
  return v === 'desde-primer-anio' ? 'desde-primer-anio' : 'desde-segundo-anio';
}

export interface DatosEfecto {
  readonly efecto: EfectoMeses;
  /** Año desde el que rige cada cuadro de coeficientes. */
  readonly desdeVoluntaria: number;
  readonly desdeInvoluntaria: number;
  /** Años de la aplicación gradual de los coeficientes sobre el límite de pensión. */
  readonly gradual: { readonly primero: number; readonly ultimo: number };
  /** Año desde el que rige la versión de la escala usada para el cambio de la demora. */
  readonly escalaDesde: number;
  readonly fuentes: readonly DatoRotulado[];
}

/** Efecto de los meses con los parámetros vigentes en el año de los datos. */
export const datosEfecto = memorizar((): DatosEfecto => {
  const p = parametrosDelRepositorio();
  const anio = anioVigente();
  return {
    efecto: efectoMesesJubilacion(p, anio, fraccionDemoraPorDefecto()),
    desdeVoluntaria: p.coeficientesVoluntaria.desde,
    desdeInvoluntaria: p.coeficientesInvoluntaria.desde,
    gradual: rangoGradualDT34(p),
    escalaDesde: versionEscala(p, anio).desde,
    fuentes: [
      datoDeCuadro(
        'jubilacion-coeficientes-voluntaria',
        'Coeficientes de la anticipada voluntaria',
      ),
      datoDeCuadro(
        'jubilacion-coeficientes-involuntaria',
        'Coeficientes de la anticipada por causa no imputable',
      ),
      datoDeCuadro('jubilacion-demora-reglas', 'Porcentaje adicional de la demora'),
      datoDeCuadro('escala-jubilacion-tramos', 'Escala de porcentajes por años cotizados'),
    ],
  };
});
