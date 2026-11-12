# Motor de pensiones: visión global

Cierre de la Fase 2 (Fases 2-A, 2-B-1, 2-B-2 y 2-B-3). El motor es una librería pura en `src/engine/` (TypeScript estricto, sin React ni DOM) que calcula la pensión inicial de las prestaciones contributivas y no contributivas del Régimen General con el mismo patrón en todas: desglose por pasos con el parámetro de `/data` y el artículo que sostienen cada paso, normativa del año del hecho causante, y ninguna cifra legal escrita en el código. La Fase 3 (simulador) puede consumirlo entero a través de la fachada, sin tocar la lógica.

## Motores

| Motor                      | Carpeta                                       | Documento                            | Qué calcula                                                                                                    |
| -------------------------- | --------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Jubilación                 | `src/engine/jubilacion/`                      | `docs/MOTOR_JUBILACION.md`           | Ordinaria, anticipadas, demorada y parcial; mínimos, máxima, brecha y revalorización                           |
| Incapacidad permanente     | `src/engine/incapacidad/`                     | `docs/MOTOR_INCAPACIDAD.md`          | Parcial, total, absoluta y gran incapacidad por contingencias comunes (profesionales con base calculada fuera) |
| Muerte y supervivencia     | `src/engine/supervivencia/`                   | `docs/MOTOR_SUPERVIVENCIA.md`        | Viudedad (con prestación temporal), orfandad y favor de familiares, con el límite conjunto                     |
| Pensiones no contributivas | `src/engine/no-contributivas/`                | `docs/MOTOR_NO_CONTRIBUTIVAS_MEI.md` | Jubilación e incapacidad no contributivas, con unidad económica y complementos                                 |
| MEI y solidaridad          | `src/engine/mei/`                             | `docs/MOTOR_NO_CONTRIBUTIVAS_MEI.md` | Tipo del MEI por año, reparto y cuota adicional de solidaridad (una función por año, sin proyecciones)         |
| Común                      | `src/engine/comun/`, `src/engine/jubilacion/` |                                      | Base reguladora (ventana y periodo elegido), contexto (IPC, bases, máxima, mínimas), tiempo y carrera          |

Cada motor tiene sus tipos, sus parámetros (`parametros.ts`, leídos de `/data`), sus limitaciones (`limitaciones.ts`) y una versión `repositorio.ts` que lee `/data` con `import.meta.glob` (solo Vite o Vitest). En Node se usan las funciones `…ConParametros` con una lectura propia (`scripts/lib/motor-jubilacion.ts`).

## Fachada única (`src/engine/index.ts`)

```ts
import { crearMotor, desenvolver } from '../engine/index.ts'; // sin dependencias de Vite
import { motorDelRepositorio } from '../engine/repositorio.ts'; // lee /data del repositorio (Vite, Vitest)

const motor = motorDelRepositorio({
  lecturas: { 'supervivencia.incrementoFamiliares': 'sin-incremento' }, // sobrescribe lecturas abiertas
  escenario: { ipc: 0.02 }, // IPC para los años sin dato
});

const r = motor.jubilacion({
  carrera,
  nacimiento: '1958-01-15',
  fechaJubilacion: '2026-02-01',
  modalidad: 'ordinaria',
});
if (r.ok) {
  r.prestaciones[0]?.pensionMensual; // por paga
  r.prestaciones[0]?.pasos; // desglose: id, valor, unidad, parámetros de /data y artículo
  r.detalle; // resultado completo del motor concreto
} else {
  r.error.codigo; // 'NoImplementada' | 'DatoNoDisponible' | 'EntradaInvalida'
}
desenvolver(r); // devuelve el resultado o vuelve a lanzar el error original
```

- **Una función de entrada por tipo de prestación**: `jubilacion`, `incapacidadPermanente`, `viudedad`, `orfandad`, `favorFamiliares`, `pncJubilacion` y `pncIncapacidad`; además `supervivencia` (todas las prestaciones de un causante con el límite conjunto) y `cotizacionAdicional` (MEI y solidaridad, que no es una pensión). `calcular(entrada)` despacha por `entrada.tipo`.
- **Salida unificada**: `{ ok: true, tipo, anioNormativa, prestaciones[], pensionMensualTotal, pensionAnualTotal, pasos, avisos, detalle }`. Cada prestación lleva `clase`, `indice` (posición del beneficiario), `cumpleRequisitos`, `estado`, `pensionMensual`, `pensionAnual`, `pagas`, `requisitos` y `pasos`. `detalle` es el resultado tipado del motor concreto (`ResultadoJubilacion`, `ResultadoIncapacidad`, `ResultadoSupervivencia`, `ResultadoPNC`).
- **Errores unificados**: las reglas del dominio no lanzan: devuelven `{ ok: false, error: { codigo, mensaje, regla?, original } }`. `NoImplementada` (la ley lo regula y el motor no: consta en las limitaciones), `DatoNoDisponible` (falta un dato de `/data` o del escenario; nunca se inventa) y `EntradaInvalida` (`RangeError` o `TypeError` de una entrada incoherente).
- **No cambia ningún resultado**: cada función llama a la del motor con las mismas opciones (un test comprueba que `detalle` es idéntico al de la llamada directa).
- **Prioridad de las lecturas abiertas**: valor por defecto < `configuracion.lecturas` < opciones de la entrada (`opciones.lecturas`, `opciones.lecturasIncapacidad`, etc.). Una configuración con un identificador desconocido o un valor que no es una alternativa lanza `RangeError` al crear el motor.

## Registro único de lecturas abiertas (`src/engine/lecturas.ts`)

Una lectura abierta es una duda de interpretación que el motor no decide: es una opción explícita con un valor por defecto (la lectura más sencilla, en `docs/DECISIONES.md`) y alternativas. El registro lista las 27 de todos los motores, cada una con identificador `motor.opcion`, descripción en lenguaje llano (sin cifras), valor por defecto **leído de las constantes de cada motor**, alternativas, efecto medido (sección y fila de `docs/INFORME_VERIFICACION.md`) e identificador de la pregunta de `docs/REVISION_ACTUARIAL.md`. Dos tests comprueban que el registro es completo (todas las opciones de cada motor y ninguna de más), que los enlaces existen y que las descripciones no llevan cifras. **Los valores por defecto los decide Sergio tras la revisión actuarial; el registro no cambia ninguno.**

| Identificador                                        | Por defecto                | Alternativas               | Pregunta actuarial                             |
| ---------------------------------------------------- | -------------------------- | -------------------------- | ---------------------------------------------- |
| `jubilacion.baseMaxima`                              | `compuesto`                | `sobre-cifra-inicial`      | `param-base-maxima-incremento-futuro`          |
| `jubilacion.pensionMaxima`                           | `compuesto`                | `incremento-creciente`     | `param-pension-maxima-incremento-futuro`       |
| `jubilacion.referenciaBaseMinimaLagunas`             | `mes-de-la-laguna`         | `hecho-causante`           | `param-lagunas-integracion`                    |
| `jubilacion.opcion25EnUltimoDia2040`                 | `incluida`                 | `excluida`                 | `param-opcion-25-anos-ventana`                 |
| `jubilacion.lagunasAnterioresAlPrimerAlta`           | `integrar`                 | `ignorar`                  | `param-lagunas-integracion`                    |
| `jubilacion.interpolacionIPC`                        | `interpolada`              | `escalon-anual`            | `param-actualizacion-bases`                    |
| `jubilacion.fraccionDemora`                          | `desde-segundo-anio`       | `desde-primer-anio`        | `param-jubilacion-demora-reglas`               |
| `jubilacion.maximaDesde2051`                         | `incremento-acumulado`     | `incremento-anual-literal` | `param-pension-maxima-incremento-2051-2065`    |
| `incapacidad.edadFiccion`                            | `carrera-proyectada`       | `edad-general`             | `param-incapacidad-permanente-reglas`          |
| `incapacidad.computoFiccion`                         | `meses`                    | `anios-completos`          | `param-incapacidad-permanente-reglas`          |
| `incapacidad.divisorPeriodoCorto`                    | `coeficiente-rd-1799-1985` | `catorce-doceavos`         | `param-incapacidad-permanente-reglas`          |
| `incapacidad.lagunasAccidenteNoLaboral`              | `sin-integrar`             | `integrar`                 | `param-incapacidad-permanente-reglas`          |
| `incapacidad.redondeoEdadCarencia`                   | `sin-redondeo`             | `medio-anio`               | `param-incapacidad-permanente-reglas-carencia` |
| `incapacidad.diasCotizadosParcial`                   | `naturales`                | `treinta-por-mes`          | `param-incapacidad-permanente-reglas-carencia` |
| `supervivencia.ventanaBaseReguladora`                | `anterior-al-mes-previo`   | `decreto-1646-1972`        | `param-supervivencia-reglas`                   |
| `supervivencia.diasCotizados`                        | `naturales`                | `treinta-por-mes`          | `param-supervivencia-reglas`                   |
| `supervivencia.carenciaOrfandad`                     | `sin-carencia`             | `rd-1647-1997`             | `param-supervivencia-reglas`                   |
| `supervivencia.carenciaFamiliaresAccidenteNoLaboral` | `exigir`                   | `exenta`                   | `param-supervivencia-reglas`                   |
| `supervivencia.reduccionViudedad70`                  | `no-inferior-52`           | `sin-suelo`                | `param-supervivencia-reglas-cuantia`           |
| `supervivencia.comparacionCompensatoria`             | `anual`                    | `mensual`                  | `param-supervivencia-reglas-cuantia`           |
| `supervivencia.incrementoFamiliares`                 | `porcentaje-viudedad`      | `sin-incremento`           | `param-supervivencia-reglas-cuantia`           |
| `supervivencia.reduccionLimiteConjunto`              | `orfandad`                 | `proporcional`             | `param-supervivencia-reglas-limites`           |
| `no-contributivas.baseRentasCompatibles`             | `cuantia-integra`          | `cuantia-por-beneficiario` | `param-pnc-reglas`                             |
| `no-contributivas.limiteTrabajo`                     | `cuantia-integra`          | `pension-reconocida`       | `param-pnc-reglas`                             |
| `no-contributivas.rentasConTrabajoEnCuatroAnios`     | `sustituye-364-2`          | `se-suman`                 | `param-pnc-reglas`                             |
| `no-contributivas.limiteConTerceraPersona`           | `con-complemento`          | `sin-complemento`          | `param-pnc-reglas`                             |
| `mei.baseMEI`                                        | `base-cotizacion`          | `retribucion-completa`     | `param-mei-reglas`                             |

## Datos

Todas las cifras salen de `/data` con cita literal comprobada por código (la cita debe contener la cifra: `scripts/citas-cifras.test.ts`). Los ficheros por motor están en los documentos de cada motor y en `docs/MOTOR_INVENTARIO.md`; las fuentes, en `docs/FUENTES.md`; las afirmaciones, en `docs/claims.json`; los huecos, en `docs/PENDIENTE_DATOS.md` y `docs/DESCARGAS_MANUALES.md`.

## Casos de oro

`docs/INVENTARIO_CASOS_ORO.md` (generado y comprobado por un test) lista los casos de cada motor con su etiqueta: «independiente» (ejemplo oficial con URL) o «derivado de la norma». Los casos de Sergio se escribirán como una tabla (`docs/CASOS_SERGIO_PLANTILLA.md`) en `data-raw/casos-oro/casos-sergio.md` y se ejecutan con `npx tsx scripts/casos-sergio.ts` o con `scripts/casos-sergio.test.ts`; mientras el fichero no exista, nada falla.

## Limitaciones consolidadas

`LIMITACIONES_MOTOR` (`src/engine/limitaciones.ts`) reúne las de todos los motores, con su motor. Resumen de lo que ningún motor calcula todavía (el detalle y el motivo están en cada documento):

- **Regímenes distintos del General**: RETA, Clases Pasivas, regímenes especiales y pluriactividad. Los motores modelan una base de cotización por mes.
- **Contingencias profesionales**: la base reguladora por accidente de trabajo y enfermedad profesional (Reglamento de 1956) no está descargada; los motores lanzan `NoImplementada` salvo base calculada fuera. Indemnizaciones a tanto alzado, lesiones permanentes no incapacitantes y recargo de prestaciones.
- **Normativa anterior**: jubilación anterior a 2013 (escala por años) y anticipadas, demora y parcial anteriores a 2022; incapacidad y supervivencia anteriores a 2022; PNC anteriores a 2022 (`NoImplementada`).
- **Hechos posteriores al reconocimiento**: extinción, suspensión, revisión del grado, recálculo de los límites, trabajo de pensionistas fuera de lo regulado y pensiones concurrentes entre causantes.
- **Datos que faltan**: base mínima de 2020 y 2021, umbral de pobreza (mínimas de 2027), límite de ingresos con cónyuge a cargo, complemento de alquiler de 2024, SMI y tipos de contingencias comunes posteriores a 2026.
- **Fuera de alcance por decisión**: complementos autonómicos y haciendas forales de las PNC, proyecciones del MEI y RETA.

## Pruebas

`npm test` ejecuta todos los motores (casos de oro, reglas, lecturas abiertas y propiedades), la fachada (`src/engine/fachada.test.ts`), el registro (`scripts/lecturas-registro.test.ts`), el inventario, el lector de casos de Sergio y la coherencia de los datos. Los motores de fases anteriores no se han modificado: sus tests pasan sin tocarlos.
