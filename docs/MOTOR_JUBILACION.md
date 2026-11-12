# Motor de la pensión de jubilación contributiva

Fase 2-A. Librería pura en `src/engine/jubilacion/` (TypeScript estricto, sin React ni DOM) que calcula la pensión de jubilación contributiva del Régimen General con sus reglas legales y un desglose paso a paso. **No contiene ninguna cifra legal**: todo sale de `data/parametros` (véase `MOTOR_INVENTARIO.md`). Es la base del simulador «Tu pensión» (Fase 3); en esta fase no se ha tocado la interfaz.

## Uso

```ts
import { calcularJubilacion } from '../engine/jubilacion/repositorio.ts'; // Vite / Vitest

const r = calcularJubilacion(
  [{ desde: '1987-01', hasta: '2029-12', baseMensual: 2500 }], // carrera
  '1965-01-01', // nacimiento
  '2030-01-01', // fecha de jubilación (hecho causante)
  'ordinaria', // modalidad
  { escenario: { ipc: 0.02 } }, // opciones
);
r.pensionMensual; // por paga (14 pagas), euros nominales de 2030
r.pensionAnual;
r.pasos; // desglose: id, valor, unidad, parametros de /data y artículo
```

Para scripts de Node, `calcularJubilacionConParametros(params, …)` recibe los parámetros construidos con `construirParametros(leer)` (véase `scripts/lib/motor-jubilacion.ts`). `repositorio.ts` usa `import.meta.glob` y solo funciona con Vite o Vitest.

## Funciones (archivos de `src/engine/jubilacion/`)

| Archivo              | Funciones                                                                                                                                                              | Regla                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `tiempo.ts`          | `parsearFecha`, `sumarMeses`, `mesesCumplidos`, `mesesHastaRedondeandoArriba`                                                                                          | Meses absolutos; «cada mes o fracción de mes»                                             |
| `parametros.ts`      | `construirParametros`, `valorEn`, `versionEn`                                                                                                                          | Lectura de `/data` con el esquema; «a partir de»: el último año de una serie se extiende  |
| `contexto.ts`        | `crearContexto` (IPC mensual, `baseMaxima`, `baseMinima`, `pensionMaxima`, `pensionMinimaAnual`, `limiteIngresosMinimos`, `importeBrechaPorHijo`, `revalorizacionPct`) | DT 38.ª y 39.ª, art. 58.2; proyecciones con el escenario                                  |
| `carrera.ts`         | `procesarCarrera`                                                                                                                                                      | Entrada por periodos con huecos; tope de la base máxima; pluriempleo                      |
| `calculo.ts`         | `calcularJubilacionConParametros`, `fechaEdadOrdinaria`                                                                                                                | Requisitos (edad, carencia, periodo previo) y pensión por modalidad                       |
| `base-reguladora.ts` | `reglaGeneral`, `reglaOpcion25`, `calcularBaseReguladora`                                                                                                              | Art. 209.1, DT 8.ª, 40.ª y 4.ª.7: ventana, mejores bases, divisor, actualización, lagunas |
| `porcentajes.ts`     | `porcentajeEscala`, `mesesPara100`, `tramoCotizacion`, `coeficienteReductor`, `coeficienteSobreLimite`                                                                 | Art. 210.1, DT 9.ª; arts. 207.2 y 208.2; DT 34.ª                                          |
| `demora.ts`          | `tiempoDemora`, `porcentajeAdicional`, `pagoUnicoPorAnio`, `repartoMixto`                                                                                              | Art. 210.2, Ley 21/2021, RD 371/2023                                                      |
| `revalorizacion.ts`  | `serieRevalorizada`, `revalorizarPension`, `aEurosConstantesMotor`                                                                                                     | Art. 58.2; euros constantes con `src/engine/euros-constantes.ts`                          |
| `errores.ts`         | `NoImplementada`, `DatoNoDisponible`, `LIMITACIONES`                                                                                                                   | Lo que no se calcula                                                                      |

### `calcularJubilacion(carrera, nacimiento, fechaJubilacion, modalidad, opciones)`

**Entradas.**

- `carrera`: lista de periodos `{ desde: 'AAAA-MM', hasta: 'AAAA-MM', baseMensual | basesPorAnio | basesPorMes }`, con huecos permitidos. Un mes sin periodo es un mes sin obligación de cotizar. Periodos solapados (pluriempleo): las bases se suman con el tope de la base máxima. Cada mes se supone cotización efectiva.
- `nacimiento`, `fechaJubilacion`: `AAAA-MM-DD`. La normativa aplicable es la del año de la fecha de jubilación (hecho causante). El «mes previo» al hecho causante no se computa.
- `modalidad`: `ordinaria`, `anticipada-voluntaria`, `anticipada-involuntaria`, `demorada` o `parcial`.
- `opciones` (todas opcionales): `sexo`, `escenario`, `lecturas`, `usarOpcion25Anos`, `topeBases`, `actualizarBases`, `aplicarPensionMaxima`, `aplicarMinimos`, `situacionFamiliar`, `rentasAnuales`, `hijos`, `hombreCumpleArt60`, `integracionReforzadaLagunas`, `huecoBaseMinima`, `demora`, `parcial`, `mesesDemandanteEmpleo`, `ceseCausaTasada`, `mesesSubsidioDesempleo`, `calcularAunqueNoCumpla`. Detalle en `tipos.ts`.

**Salidas** (`ResultadoJubilacion`): `cumpleRequisitos` y la lista de `requisitos` (valor acreditado, exigido, parámetros y artículo); `estado` (`contributiva`, `minima`, `maxima`, `no-causa-derecho`); `pensionMensual` (por paga: pensión más complemento de brecha) y `pensionAnual` (14 pagas más la cantidad anual de demora); `pagas`; `edadMeses`, `mesesCotizados`, `baseReguladora`, `porcentaje`; `pagoUnicoDemora` y `cantidadAnualDemora`; `pasos` (cada uno con `id`, `titulo`, `valor`, `unidad`, `parametros` —referencias `parametros/fichero.json#id`— y `articulo`) y `avisos` (todo lo que se aproximó o extendió).

**Importes**: euros nominales del año de la jubilación. `aEurosConstantesMotor` los convierte a euros de otro año con el IPC medio anual de `/data` (y el del escenario donde no hay dato).

### Pasos del desglose

`meses-cotizados` → `edad-legal` → `periodo-calculo` → `base-reguladora-general` → `base-reguladora-opcion-25` → `base-reguladora` → `porcentaje` → (según la modalidad) `coeficiente-reductor` / `coeficiente-sobre-limite` / `tope-trimestres` / `demora-*` / `parcial-reduccion` → `limite-maximo` → `pension-contributiva` → `complemento-minimos` → `complemento-brecha` → `pension-final`.

## Escenario económico y datos que faltan

El motor nunca inventa un dato de `/data`. Donde `/data` termina (IPC en 2025, bases y pensiones en 2026, calendario legal en 2027 y 2037) aplica la regla legal con el `escenario` que se le dé, y lo anota en `avisos`:

- **IPC**: media anual de `/data` (2002-2025). El índice mensual se obtiene interpolando en logaritmos entre medias anuales situadas a mitad de año (alternativa: escalón anual). Antes de mediados de 2002 se usa la variación de diciembre a diciembre del INE; después de 2025, la tasa del escenario. Sin escenario, un año sin dato lanza `DatoNoDisponible`.
- **Base máxima** (DT 38.ª): +revalorización +1,2 puntos hasta 2050; después, solo la revalorización.
- **Pensión máxima** (DT 39.ª): +revalorización +0,115 puntos hasta 2050; tabla de la DT 39.ª.4 de 2051 a 2065 (lectura abierta); después, solo la revalorización.
- **Base mínima**: con el IPC del escenario más allá de 2026. Si una laguna cae en 2020 o 2021 (sin dato en `/data`), el motor falla salvo `huecoBaseMinima: 'anterior'`.
- **Mínimas, límite de ingresos y complemento de brecha**: con la revalorización del escenario más allá de 2026.
- **Calendario legal** («a partir de 2027», «a partir de 2037», «desde 2044 sin opción de 25 años»): se extiende el último valor.

## Lecturas abiertas (opciones explícitas)

`LECTURAS_POR_DEFECTO` coincide con lo que ya reflejan los ficheros de `/data`. Cada una tiene un test que demuestra que cambiarla modifica el resultado en el sentido esperado (`lecturas-abiertas.test.ts`) y una fila en `docs/INFORME_VERIFICACION.md` con el efecto sobre un caso típico.

| Opción                          | Por defecto            | Alternativa                | Origen                                              |
| ------------------------------- | ---------------------- | -------------------------- | --------------------------------------------------- |
| `baseMaxima`                    | `compuesto`            | `sobre-cifra-inicial`      | (a) DT 38.ª, «acumulativos»                         |
| `pensionMaxima`                 | `compuesto`            | `incremento-creciente`     | (a) DT 39.ª, «acumulativos»                         |
| `referenciaBaseMinimaLagunas`   | `mes-de-la-laguna`     | `hecho-causante`           | (b) art. 209.1.b desde 2026                         |
| `opcion25EnUltimoDia2040`       | `incluida`             | `excluida`                 | (c) DT 4.ª.7                                        |
| `lagunasAnterioresAlPrimerAlta` | `integrar`             | `ignorar`                  | (d) lagunas de la ventana previas a la primera alta |
| `interpolacionIPC`              | `interpolada`          | `escalon-anual`            | (d) actualización de bases con IPC anual            |
| `fraccionDemora`                | `desde-segundo-anio`   | `desde-primer-anio`        | (d) «a partir del segundo año completo»             |
| `maximaDesde2051`               | `incremento-acumulado` | `incremento-anual-literal` | (d) tabla de la DT 39.ª.4                           |

## Decisiones de modelado

Recogidas en `docs/DECISIONES.md`. Las principales: los meses cotizados se cuentan completos y con cotización efectiva; en las anticipadas la edad legal es la que correspondería «de haber seguido cotizando» (proyección hasta los 65) con el calendario del año del hecho causante; la integración reforzada de la DT 41.ª se aplica a la regla general y no a la opción de 25 años; las mínimas de 2027 en adelante solo se revalorizan.

## Limitaciones

Véase `MOTOR_INVENTARIO.md` («Reglas no implementadas») y `LIMITACIONES` en `errores.ts`. Rango de fechas: hecho causante desde 2013 (ordinaria) y desde 2022 (anticipadas, demora y parcial). Datos pendientes: `docs/PENDIENTE_DATOS.md`.

## Pruebas

| Prueba                                        | Qué comprueba                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/engine/jubilacion/*.test.ts` (121 tests) | Funciones por separado y casos límite: carencia justo cumplida e incumplida, periodo previo, edad según carrera, transición entre años y mismo día del cambio de normativa, pensión topada y mínima, lagunas al inicio, en medio y al final, DT 41.ª, actualización con el IPC, anticipadas, demora, parcial, brecha de género, revalorización, euros constantes |
| `casos-oro-motor.test.ts`                     | Seis casos de oro con cuentas a mano (`CASOS_ORO_MOTOR.md`)                                                                                                                                                                                                                                                                                                      |
| `lecturas-abiertas.test.ts`                   | Las lecturas abiertas                                                                                                                                                                                                                                                                                                                                            |
| `scripts/contraste-m5.test.ts`                | 37 casos de M5 dentro del 1,5 % (todos dentro del 0,5 %; `CONTRASTE_M5.md`)                                                                                                                                                                                                                                                                                      |
| `scripts/verificacion-motor.test.ts`          | 30 combinaciones año 2026-2050 × perfil: sin NaN, entre mínimo y máximo, monótona en años cotizados y en la base (`npx tsx scripts/verificacion-motor.ts [--completa]`)                                                                                                                                                                                          |
| `scripts/casos-sergio.test.ts`                | Casos de Sergio: `it.todo` mientras no exista `data-raw/casos-oro/casos-sergio.md`                                                                                                                                                                                                                                                                               |
| `scripts/coherencia-datos.test.ts`            | Los nuevos ficheros de `/data` cumplen las reglas generales de series                                                                                                                                                                                                                                                                                            |
