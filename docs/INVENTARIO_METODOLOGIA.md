# Inventario de la fase «Metodología»

Qué documentos, datos y código del repositorio respaldan cada apartado de la página `/metodologia` (paso 2 del encargo). Lo que no consta en ningún fichero no se afirma en la página: queda en `docs/PENDIENTE_DATOS.md` («Fase “Metodología”»). Las comprobaciones del inventario las hace `scripts/metodologia-fase.test.ts` (cada fichero citado existe y cada afirmación de la tabla «Afirmaciones de la página» está en su fichero de respaldo).

Fecha de la lectura: 2026-11-17. Rama `feat/fase-metodologia`, creada desde `main` (`1116de9`, CI y despliegue en verde).

## 1. De dónde salen los datos

| Qué consta                                                                                                                                                 | Fichero de respaldo                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Cada dato lleva fuente con URL, fecha de descarga (`fetchedAt`) y confianza (alta, media o baja); el esquema rechaza los que no                            | `data/README.md` («Formato»), `src/engine/esquema-datos.ts`                                                       |
| Cada fuente consultada, con organismo, URL y fecha de descarga, y los ficheros de `/data` que la usan                                                      | `docs/FUENTES.md` (generado por `scripts/etl/fuentes_claims.py`)                                                  |
| Huella SHA-256 de cada fichero bruto de las tablas; los de hasta 5 MB están en `data-raw/` y los mayores no se versionan                                   | `docs/FUENTES.md` («Huellas de los ficheros brutos»)                                                              |
| Los datos salen de documentos descargados en una sesión de trabajo, nunca de la memoria del modelo; lo que no se pudo descargar se anota con su URL exacta | `CLAUDE.md` (regla b), `docs/PENDIENTE_DATOS.md`, `docs/DESCARGAS_MANUALES.md`                                    |
| Cada dato se genera con un script de `scripts/etl/` desde lo descargado                                                                                    | `scripts/etl/comun.py`, `data/README.md`                                                                          |
| Recuento de ficheros de `/data` y de elementos con procedencia por nivel de confianza                                                                      | Se calcula de `data/` (`src/engine/metodologia.ts`); la auditoría de 2026-11-11 está en `docs/AUDITORIA_DATOS.md` |

No consta: la lista de las descargas hechas a mano fuera de la sesión (solo las que constan en `docs/DESCARGAS_MANUALES.md`).

## 2. Cómo se comprueban

| Qué consta                                                                                                                               | Fichero de respaldo                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `npm run validate:data` valida el esquema de todos los ficheros de `/data` y de `docs/claims.json`                                       | `scripts/validate-data.ts`, `scripts/lib/validar-datos.ts`                                               |
| Pruebas de coherencia (sumas por clase, régimen y sexo, rangos, calendarios, citas presentes) sobre los datos reales                     | `scripts/coherencia-*.test.ts`                                                                           |
| Segunda fuente independiente para una muestra de series, con el resultado de cada contraste                                              | `docs/auditoria-independiente.json`, `docs/AUDITORIA_DATOS.md`                                           |
| Comprobación de que las URL responden (muestra)                                                                                          | `docs/comprobacion-urls.json`, `scripts/etl/comprobar_urls.py`                                           |
| Discrepancias entre fuentes y cómo se resolvió cada una                                                                                  | `docs/DISCREPANCIAS.md`                                                                                  |
| Informe de verificación de cada fase, con las limitaciones de la verificación                                                            | `docs/INFORME_VERIFICACION.md`                                                                           |
| Casos de oro de los motores: «independiente» (ejemplo resuelto publicado) o «derivado de la norma» (cuenta a mano); recuento actualizado | `docs/INVENTARIO_CASOS_ORO.md` (lo genera `scripts/inventario-casos-oro.ts`; un test lo mantiene al día) |
| Contraste del motor con el modelo simplificado M5 v2                                                                                     | `docs/CONTRASTE_M5.md`, `scripts/contraste-m5.test.ts`                                                   |

No consta: una cobertura de contraste con segunda fuente para todas las series (consta la muestra y las series «sin contraste» de `docs/auditoria-independiente.json`).

## 3. Confianza y revisión actuarial

| Qué consta                                                                                                                                                                               | Fichero de respaldo                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| La confianza (`alta`, `media`, `baja`) mide la fiabilidad de la fuente del dato; el motivo de cada nivel consta caso a caso                                                              | `docs/DECISIONES.md` (fase 5-B1), `data/README.md`                                                                                   |
| Estado de cada afirmación: `verificada` si la confianza de su fuente es alta, `pendiente` si no                                                                                          | `scripts/etl/fuentes_claims.py` (función `añade`)                                                                                    |
| Revisión actuarial de cada afirmación: `no-requiere`, `revisada` (con la referencia de su respuesta), `rechazada` o `pendiente` (con su pregunta)                                        | `docs/claims.json`, `src/engine/esquema-datos.ts`, `docs/REVISION_ACTUARIAL.md`                                                      |
| Tope de afirmaciones pendientes y obligación de la pregunta                                                                                                                              | `scripts/reformas-fase.test.ts` (test del tope), `docs/claims.json`                                                                  |
| Calendario: decisiones del 13-11-2026 (fase 2-E), revisión del 14-11-2026 (ajustes 1 y 2) y tercera tanda, con respuestas del 16-11-2026 (partes A, B y C; ajustes 3 y motor revisión 3) | `docs/DECISIONES_ACTUARIALES.md`, `docs/ESTADO_AJUSTES_ACTUARIALES_1.md` a `_3.md`, `docs/revision-actuarial/aplicacion-tanda3.json` |
| Principio «la verificación manda»: el revisor es una opinión experta y no una fuente; cada corrección se aplica solo si se comprueba en una fuente descargada                            | `docs/ESTADO_AJUSTES_ACTUARIALES_3.md`, `docs/DECISIONES.md` («Ajustes actuariales 3»)                                               |

No consta: (a) una definición escrita y general de lo que significan los tres niveles de confianza (los documentos dan el criterio aplicado a cada dato o modelo, no una definición única); (b) qué fueron la «primera» y la «segunda» tanda: los documentos numeran la tercera, pero no identifican las anteriores. Ambos huecos van a `docs/PENDIENTE_DATOS.md`.

## 4. Lecturas del motor

| Qué consta                                                                                                              | Fichero de respaldo                                                              |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Qué es una lectura abierta, sus alternativas, su valor por defecto y su estado (`decidida`, `provisional`, `pendiente`) | `src/engine/lecturas.ts`, `src/engine/config/lecturas-por-defecto.json`          |
| Registro de decisiones con motivo y fecha                                                                               | `docs/DECISIONES_ACTUARIALES.md`, `scripts/config-lecturas.test.ts`              |
| Efecto medido de cada lectura sobre el resultado                                                                        | `docs/INFORME_VERIFICACION.md`, `docs/REVISION_PRIORIZADA.md`                    |
| Dónde se ven en la web: «Tu pensión» (se pueden cambiar) y «Cómo se calcula» (las que influyen en cada prestación)      | `src/modules/tu-pension/`, `src/modules/como-se-calcula/LecturasQueInfluyen.tsx` |

## 5. Los modelos de proyección

| Qué consta                                                                                                                                     | Fichero de respaldo                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Pregunta, funcionamiento, datos de entrada, limitaciones y pruebas de M1 a M6                                                                  | `docs/modelos/M1_descripcion.md` a `M6_descripcion.md` (solo lectura)                      |
| Metadatos de las salidas de M1 a M4 (confianza, fecha de ejecución, escenario con legislación congelada, naturaleza «proyección de modelo»)    | `data/proyecciones/*.json`, `data/proyecciones/README.md`                                  |
| Criterio de la confianza de los modelos (`media` con contraste externo y pruebas; `baja` si es preliminar) y su carácter de decisión pendiente | `docs/DECISIONES.md` (fases 5-B1 y 5-B2), `docs/PENDIENTE_DATOS.md`                        |
| M5 y M6 no tienen salidas en `/data/proyecciones` ni se muestran en «Proyecciones»; M5 v2 se usa para contrastar el motor                      | `data/proyecciones/README.md`, `docs/CONTRASTE_M5.md`, `docs/modelos/M5_v2_descripcion.md` |

Las descripciones contienen cifras de resultados y frases valorativas («un error mío corregido», «acierta»…): la página no las copia; resume la pregunta, las hipótesis y los límites sin cifras.

No consta: un nivel de fiabilidad para M5 y M6 (no tienen metadatos en `/data`; sus descripciones solo dan advertencias de uso). La página lo dice.

## 6. Neutralidad y verificación

| Qué consta                                                                                  | Fichero de respaldo                                                                                        |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Política de neutralidad: definiciones alternativas con sus datos, sin adjetivos valorativos | `CLAUDE.md` (regla c)                                                                                      |
| Listas de términos de valoración y de veredicto que aplican los tests a los textos          | `scripts/lib/valoraciones.ts`                                                                              |
| Tests que recorren las páginas con esas listas                                              | `scripts/neutralidad-5a2.test.ts`, `neutralidad-5c.test.ts`, `mitos-fase.test.ts`, `reformas-fase.test.ts` |
| «La verificación manda»                                                                     | `docs/ESTADO_AJUSTES_ACTUARIALES_3.md`, `docs/DECISIONES.md`                                               |

## 7. Qué no hace esta web

Cada punto de la página tiene su respaldo: «Tu pensión» es orientativo y lista lo que no tiene en cuenta (`docs/SIMULADOR.md`, `src/modules/tu-pension/`); las proyecciones congelan la legislación (`data/proyecciones/README.md`); las reformas no se valoran ni se les atribuyen efectos (`docs/ESTADO_FASE_REFORMAS.md`); la revalorización anual de las pensiones en curso no se explica en «Cómo se calcula» y las Clases Pasivas no tienen ficha (`src/modules/secciones.ts`, `docs/PENDIENTE_DATOS.md`). La web no pide ni guarda datos personales: **no consta** en ningún documento una comprobación expresa, por lo que la página no lo afirma.

## 8. Cómo reproducirlo

| Qué consta                                                                                 | Fichero de respaldo                                                                   |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Repositorio, requisitos (Node) y comandos de comprobación                                  | `README.md`, `package.json`, `CLAUDE.md` («Comandos»)                                 |
| ETL: cada script de `scripts/etl/` se ejecuta con Python desde la raíz y lee lo descargado | `scripts/etl/comun.py`, `data/README.md`                                              |
| Regenerar fuentes y afirmaciones (reproducible desde esta fase)                            | `data/README.md`, `scripts/etl/fuentes_claims.py`, `scripts/generador-claims.test.ts` |
| Regenerar las salidas de los modelos                                                       | `data/proyecciones/README.md`, `scripts/etl/modelos_salidas.py`                       |
| Ejecutar los modelos (Python, en local; no forman parte de la web ni de su CI)             | `modelos/README.md`                                                                   |

No consta: el estado real de `README.md` («Fase 0 · cimientos» estaba desfasado; se corrige en esta fase).

## Qué se calcula de los ficheros (recuentos de la página)

Función pura `calcularRecuentos` (`src/engine/metodologia.ts`) sobre las entradas que lee `scripts/lib/entradas-metodologia.ts`; la página recibe el resultado en tiempo de compilación (módulo virtual de `vite.config.ts`). El test `scripts/metodologia-fase.test.ts` los recalcula con otro procedimiento (expresiones sobre el texto bruto, el registro de lecturas del motor y `inventario()` de los casos de oro).

| Recuento                                                     | Origen                                           |
| ------------------------------------------------------------ | ------------------------------------------------ |
| Fuentes distintas                                            | filas de `docs/FUENTES.md`                       |
| Ficheros de `/data` por tipo (JSON, CSV) y por carpeta       | lista de `data/`                                 |
| Elementos con procedencia por nivel de confianza             | objetos con `confidence` en los JSON de `data/`  |
| Afirmaciones por estado y por revisión actuarial; pendientes | `docs/claims.json`                               |
| Revisadas por tanda (14-11-2026; tercera tanda A, B y C)     | `respuestaActuarial` de `docs/claims.json`       |
| Filas de la tercera tanda por estado                         | `docs/revision-actuarial/aplicacion-tanda3.json` |
| Lecturas por estado y por motor                              | `src/engine/config/lecturas-por-defecto.json`    |
| Casos de oro (total, independientes, derivados)              | fila «Total» de `docs/INVENTARIO_CASOS_ORO.md`   |
| Auditoría con segunda fuente (series, por resultado)         | `docs/auditoria-independiente.json`              |
| Ficheros de pruebas automáticas                              | ficheros `*.test.ts(x)` de `src/` y `scripts/`   |
| Ficheros de ETL                                              | `scripts/etl/*.py`                               |
| Modelos con salidas en `/data/proyecciones` y su confianza   | `data/proyecciones/*.json`                       |
| Términos de las listas de valoración y de veredicto          | `scripts/lib/valoraciones.ts`                    |
