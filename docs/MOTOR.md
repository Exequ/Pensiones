# Motor de pensiones: visión global

Cierre de la Fase 2 (Fases 2-A, 2-B-1, 2-B-2 y 2-B-3). El motor es una librería pura en `src/engine/` (TypeScript estricto, sin React ni DOM) que calcula la pensión inicial de las prestaciones contributivas y no contributivas del Régimen General con el mismo patrón en todas: desglose por pasos con el parámetro de `/data` y el artículo que sostienen cada paso, normativa del año del hecho causante, y ninguna cifra legal escrita en el código. La Fase 3 (simulador) puede consumirlo entero a través de la fachada, sin tocar la lógica; la primera versión (Fase 3-A, jubilación ordinaria con carrera simple) está descrita en `docs/SIMULADOR.md`.

## Motores

| Motor | Carpeta | Documento | Qué calcula |
| -- | -- | -- | -- | -- |
| Jubilación | `src/engine/jubilacion/` | `docs/MOTOR_JUBILACION.md` | Ordinaria, anticipadas, demorada y parcial; mínimos, máxima, brecha y revalorización |
| Incapacidad permanente | `src/engine/incapacidad/` | `docs/MOTOR_INCAPACIDAD.md` | Parcial, total, absoluta y gran incapacidad por contingencias comunes (profesionales con base calculada fuera) |
| Muerte y supervivencia | `src/engine/supervivencia/` | `docs/MOTOR_SUPERVIVENCIA.md` | Viudedad (con prestación temporal), orfandad y favor de familiares, con el límite conjunto |
| Pensiones no contributivas | `src/engine/no-contributivas/` | `docs/MOTOR_NO_CONTRIBUTIVAS_MEI.md` | Jubilación e incapacidad no contributivas, con unidad económica y complementos |
| MEI y solidaridad | `src/engine/mei/` | `docs/MOTOR_NO_CONTRIBUTIVAS_MEI.md` | Tipo del MEI por año, reparto y cuota adicional de solidaridad (una función por año, sin proyecciones) |
| Común | `src/engine/comun/`, `src/engine/jubilacion/` | | Base reguladora (ventana y periodo elegido), contexto (IPC, bases, máxima, mínimas), tiempo y carrera |

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

Una lectura abierta es una duda de interpretación que el motor no decide: es una opción explícita con un valor por defecto (la lectura más sencilla, en `docs/DECISIONES.md`) y alternativas. El registro lista las 28 de todos los motores, cada una con identificador `motor.opcion`, descripción en lenguaje llano (sin cifras), valor por defecto **leído de las constantes de cada motor**, alternativas, efecto medido (sección y fila de `docs/INFORME_VERIFICACION.md`) e identificador de la pregunta de `docs/REVISION_ACTUARIAL.md`. Dos tests comprueban que el registro es completo (todas las opciones de cada motor y ninguna de más), que los enlaces existen y que las descripciones no llevan cifras. **Los valores por defecto los decide Sergio tras la revisión actuarial; el registro no cambia ninguno.** Excepciones: `jubilacion.interpolacionIPC` pasa a `mensual-ine` en la Fase 2-D (mejora de datos, no una lectura legal) y, en la Fase 2-E, las decisiones del chat actuarial cambian dos valores, ambos provisionales: `incapacidad.lagunasAccidenteNoLaboral = integrar` y `jubilacion.actualizacionFactorMinimo = suelo-1`.

**Estado de las lecturas y su exposición (Fase 2-E)**: cada lectura tiene un estado (`pendiente`; `provisional`: decidida con confianza actuarial baja o media, abierta a revisión; `decidida`: firme) y, si no está pendiente, un `motivo` corto con la confianza actuarial en palabras. `LecturaAbierta` expone `estado`, `fechaEstado` y `motivo` (`null` si está pendiente) para que la interfaz de la Fase 3 los muestre; la interfaz no se toca en esta fase. A 2026-11-13: 11 decididas (6 con confianza alta y 5 por evidencia con visto bueno), 7 provisionales y 10 pendientes (`docs/DECISIONES_ACTUARIALES.md`).

**Configuración única (Fase 2-C)**: los valores por defecto están en `src/engine/config/lecturas-por-defecto.json` (id, valor, estado `pendiente`, `provisional` o `decidida`, fecha, motivo y pregunta de `docs/REVISION_ACTUARIAL.md`). Las constantes de cada motor (`LECTURAS_POR_DEFECTO`…) y el registro leen de ese fichero; un test comprueba que cubre exactamente las lecturas del registro y que `docs/DECISIONES_ACTUARIALES.md` lo refleja. Adoptar una decisión es cambiar una línea del JSON (y la fila del registro de decisiones). Clasificación de las lecturas por impacto y fichas del grupo A: `docs/REVISION_PRIORIZADA.md`.

| Identificador                                        | Por defecto                | Alternativas                   | Estado      | Pregunta actuarial                             |
| ---------------------------------------------------- | -------------------------- | ------------------------------ | ----------- | ---------------------------------------------- |
| `jubilacion.baseMaxima`                              | `compuesto`                | `sobre-cifra-inicial`          | decidida    | `param-base-maxima-incremento-futuro`          |
| `jubilacion.pensionMaxima`                           | `compuesto`                | `incremento-creciente`         | decidida    | `param-pension-maxima-incremento-futuro`       |
| `jubilacion.referenciaBaseMinimaLagunas`             | `mes-de-la-laguna`         | `hecho-causante`               | pendiente   | `param-lagunas-integracion`                    |
| `jubilacion.opcion25EnUltimoDia2040`                 | `incluida`                 | `excluida`                     | pendiente   | `param-opcion-25-anos-ventana`                 |
| `jubilacion.lagunasAnterioresAlPrimerAlta`           | `integrar`                 | `ignorar`                      | provisional | `param-lagunas-integracion`                    |
| `jubilacion.interpolacionIPC`                        | `mensual-ine`              | `interpolada`, `escalon-anual` | pendiente   | `param-actualizacion-bases`                    |
| `jubilacion.actualizacionFactorMinimo`               | `suelo-1`                  | `sin-suelo`                    | provisional | `param-actualizacion-bases`                    |
| `jubilacion.fraccionDemora`                          | `desde-segundo-anio`       | `desde-primer-anio`            | pendiente   | `param-jubilacion-demora-reglas`               |
| `jubilacion.maximaDesde2051`                         | `incremento-acumulado`     | `incremento-anual-literal`     | decidida    | `param-pension-maxima-incremento-2051-2065`    |
| `incapacidad.edadFiccion`                            | `carrera-proyectada`       | `edad-general`                 | decidida    | `param-incapacidad-permanente-reglas`          |
| `incapacidad.computoFiccion`                         | `meses`                    | `anios-completos`              | pendiente   | `param-incapacidad-permanente-reglas`          |
| `incapacidad.divisorPeriodoCorto`                    | `coeficiente-rd-1799-1985` | `catorce-doceavos`             | pendiente   | `param-incapacidad-permanente-reglas`          |
| `incapacidad.lagunasAccidenteNoLaboral`              | `integrar`                 | `sin-integrar`                 | provisional | `param-incapacidad-permanente-reglas`          |
| `incapacidad.redondeoEdadCarencia`                   | `sin-redondeo`             | `medio-anio`                   | pendiente   | `param-incapacidad-permanente-reglas-carencia` |
| `incapacidad.diasCotizadosParcial`                   | `naturales`                | `treinta-por-mes`              | pendiente   | `param-incapacidad-permanente-reglas-carencia` |
| `supervivencia.ventanaBaseReguladora`                | `anterior-al-mes-previo`   | `decreto-1646-1972`            | pendiente   | `param-supervivencia-reglas`                   |
| `supervivencia.diasCotizados`                        | `naturales`                | `treinta-por-mes`              | pendiente   | `param-supervivencia-reglas`                   |
| `supervivencia.carenciaOrfandad`                     | `sin-carencia`             | `rd-1647-1997`                 | decidida    | `param-supervivencia-reglas`                   |
| `supervivencia.carenciaFamiliaresAccidenteNoLaboral` | `exigir`                   | `exenta`                       | provisional | `param-supervivencia-reglas`                   |
| `supervivencia.reduccionViudedad70`                  | `no-inferior-52`           | `sin-suelo`                    | decidida    | `param-supervivencia-reglas-cuantia`           |
| `supervivencia.comparacionCompensatoria`             | `anual`                    | `mensual`                      | provisional | `param-supervivencia-reglas-cuantia`           |
| `supervivencia.incrementoFamiliares`                 | `porcentaje-viudedad`      | `sin-incremento`               | decidida    | `param-supervivencia-reglas-cuantia`           |
| `supervivencia.reduccionLimiteConjunto`              | `orfandad`                 | `proporcional`                 | provisional | `param-supervivencia-reglas-limites`           |
| `no-contributivas.baseRentasCompatibles`             | `cuantia-integra`          | `cuantia-por-beneficiario`     | decidida    | `param-pnc-reglas`                             |
| `no-contributivas.limiteTrabajo`                     | `cuantia-integra`          | `pension-reconocida`           | decidida    | `param-pnc-reglas`                             |
| `no-contributivas.rentasConTrabajoEnCuatroAnios`     | `sustituye-364-2`          | `se-suman`                     | decidida    | `param-pnc-reglas`                             |
| `no-contributivas.limiteConTerceraPersona`           | `con-complemento`          | `sin-complemento`              | provisional | `param-pnc-reglas`                             |
| `mei.baseMEI`                                        | `base-cotizacion`          | `retribucion-completa`         | decidida    | `param-mei-reglas`                             |

## IPC mensual (Fase 2-D)

La actualización de las bases (art. 209.1) usa por defecto el **índice mensual real del INE** (`data/parametros/ipc-indice-mensual.json`, lectura `jubilacion.interpolacionIPC = mensual-ine`; mejora de datos, no una lectura legal): de 2002-01 en adelante, la serie IPC290751 sin transformar (confianza alta); 2001, enlazado con las variaciones anuales de 2002 que publica el INE, y 1992-2000, la serie de base 1992 enlazada con un coeficiente (confianza media; el INE no publica el índice anterior a 2002 en la base vigente). `ctx.ipc(mes)` devuelve el índice publicado; después del último mes publicado encadena con la tasa anual del escenario repartida en tasas mensuales iguales (sin escenario, `DatoNoDisponible`); antes de 1992-01 interpola las medias anuales con aviso. `interpolada` (medias anuales interpoladas en logaritmos) y `escalon-anual` siguen disponibles como alternativas. La serie de medias anuales (`ipc-indice-medio-anual`) se mantiene para la conversión a euros constantes. Decisiones, alternativas descartadas y límites: `docs/DECISIONES.md` (Fase 2-D). **Suelo del factor de actualización** (`jubilacion.actualizacionFactorMinimo`, por defecto `suelo-1` desde la Fase 2-E, lectura provisional): el factor de cada base no baja de uno, como en los informes del autocálculo de la Seguridad Social; la alternativa `sin-suelo` era el comportamiento anterior.

## Datos

Todas las cifras salen de `/data` con cita literal comprobada por código (la cita debe contener la cifra: `scripts/citas-cifras.test.ts`). Los ficheros por motor están en los documentos de cada motor y en `docs/MOTOR_INVENTARIO.md`; las fuentes, en `docs/FUENTES.md`; las afirmaciones, en `docs/claims.json`; los huecos, en `docs/PENDIENTE_DATOS.md` y `docs/DESCARGAS_MANUALES.md`.

## Auditoría de los datos

`docs/AUDITORIA_DATOS.md` (sección «Auditoría independiente de las series del motor») contrasta cada serie que leen los motores con una segunda fuente distinta de su cita (`scripts/etl/auditoria_independiente.py`; fuentes en `data-raw/auditoria/`). En la Fase 2-C se corrigió la gran invalidez de 2012 con cónyuge no a cargo con la corrección de errores del BOE (`docs/DISCREPANCIAS.md`); ningún motor ni caso de oro usa 2012.

## Casos de oro

`docs/INVENTARIO_CASOS_ORO.md` (generado y comprobado por un test) lista los casos de cada motor con su etiqueta: «independiente» (ejemplo oficial con URL) o «derivado de la norma». El inventario de las Fases 2-A a 2-C no cambia; la Fase 2-D añade los ocho casos independientes de pensiones contributivas de Sergio. Los casos de Sergio (`data-raw/casos-oro/casos-sergio.md`, tabla descrita en `docs/CASOS_SERGIO_PLANTILLA.md`) son ocho cálculos del autocálculo oficial de la Seguridad Social: los ocho coinciden con el motor dentro de ±0,01 € (uno, con una tolerancia de 0,02 € por redondeo del autocálculo; Fase 3-A); se ejecutan con `npx tsx scripts/casos-sergio.ts` o con `scripts/casos-sergio.test.ts`.

## Limitaciones consolidadas

`LIMITACIONES_MOTOR` (`src/engine/limitaciones.ts`) reúne las de todos los motores, con su motor. Resumen de lo que ningún motor calcula todavía (el detalle y el motivo están en cada documento):

- **Regímenes distintos del General**: RETA, Clases Pasivas, regímenes especiales y pluriactividad. Los motores modelan una base de cotización por mes.
- **Contingencias profesionales**: la base reguladora por accidente de trabajo y enfermedad profesional (Reglamento de 1956) no está descargada; los motores lanzan `NoImplementada` salvo base calculada fuera. Indemnizaciones a tanto alzado, lesiones permanentes no incapacitantes y recargo de prestaciones.
- **Normativa anterior**: jubilación anterior a 2013 (escala por años) y anticipadas, demora y parcial anteriores a 2022; incapacidad y supervivencia anteriores a 2022; PNC anteriores a 2022 (`NoImplementada`).
- **Hechos posteriores al reconocimiento**: extinción, suspensión, revisión del grado, recálculo de los límites, trabajo de pensionistas fuera de lo regulado y pensiones concurrentes entre causantes.
- **Datos que faltan**: base mínima de 2021 de septiembre a diciembre (el fichero guarda un valor por año), umbral de pobreza (mínimas de 2027), límite de ingresos con cónyuge a cargo, complemento de alquiler de 2024, IPREM de 2024 a 2026 (sin norma expresa), IPC mensual anterior a 1992 (hasta la Fase 2-D, los hechos causantes de 2022 a 2024 con carreras anteriores a 2000 lanzaban `DatoNoDisponible` sin escenario; ya no: la serie mensual cubre desde 1992), SMI y tipos de contingencias comunes posteriores a 2026. Sondeo año a año de las funciones de la fachada: `docs/PENDIENTE_DATOS.md` («años futuros») y `npx tsx scripts/anios-futuros.ts`.
- **Fuera de alcance por decisión**: complementos autonómicos y haciendas forales de las PNC, proyecciones del MEI y RETA.

## Pruebas

`npm test` ejecuta todos los motores (casos de oro, reglas, lecturas abiertas y propiedades), la fachada (`src/engine/fachada.test.ts`), el registro (`scripts/lecturas-registro.test.ts`), el inventario, el lector de casos de Sergio y la coherencia de los datos. Los motores de fases anteriores no se han modificado: sus tests pasan sin tocarlos.
