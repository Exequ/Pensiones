# Cajas «Interpretación»

Fase RI (2026-11-20). Infraestructura sin contenido: componente, formato, reglas comprobadas por pruebas, apartado de «Metodología» y ejemplos en `/diseno`. Ninguna página de contenido muestra todavía una interpretación.

## Qué es una caja

Una lectura experta de unos datos, junto a ellos y separada de ellos: marco propio y rótulo «Interpretación». Va siempre **después**, en el orden del documento, del gráfico, la tabla o la cifra que interpreta (el elemento con el `id` del campo `ancla`), nunca antes ni sola. Puede ir en cualquier página, al lado o debajo de los datos.

Dos tipos:

- **Del autor** (`tipo: "autor"`): la lectura del autor de la web, actuario. No se firma caja a caja; la autoría consta en «Metodología».
- **Atribuida** (`tipo: "atribuida"`): resume lo que dice un estudio o informe publicado. Rótulo «Interpretación de [autores] ([año])», texto redactado como atribuido («Según…») y la publicación en la línea de fuente. Excepción de fuentes del autor (`docs/DECISIONES.md`): la cifra se publica citando la publicación, con su Dato (url o DOI, fecha en que el autor la aporta, confianza como máximo «media») y la fuente primaria que cita, como texto, sin descargarla. No se citan apuntes de clase: se cita la publicación que referencian.

## Reglas (las comprueban `npm run lint` y las pruebas)

1. **Valoraciones con criterio**: dentro de la caja, y solo ahí, se admiten términos de valoración (`scripts/lib/valoraciones.ts`), pero cada uno necesita en `criterios` su definición verificable con los datos o con la fuente atribuida; se muestra debajo del texto. Las pruebas de valoraciones y de veredictos de las páginas recorren el texto **fuera** de las cajas (`textoSinInterpretaciones`, que las identifica por el componente, no por su texto).
2. **Voz** (`scripts/lib/voz.ts`): se aplica sin exenciones.
3. **Cifras**: ninguna escrita a mano en el título, el texto, los criterios ni la hipótesis; entran por marcadores `{{nombre}}` resueltos desde /data o el motor, o desde el Dato de la atribución.
4. **Sin política**: sin partidos, programas electorales, peticiones de voto ni propuestas (`scripts/lib/politica.ts`, lista ampliable).
5. **Proyecciones**: con su hipótesis y, si hay sensibilidades, con su rango.
6. **Datos que la sostienen**: no vacíos y existentes; su fuente se abre como la de un gráfico.
7. **Atribución**: obligatoria en las atribuidas, con Dato y url; nunca apuntes, redes sociales ni fuentes sin Dato.
8. **Ejemplos**: los registros con `ejemplo: true` solo en `/diseno` y no se listan en ningún sitio.
9. **Grado y revisión**: grado de la escala provisional (`GRADOS_INTERPRETACION`: «respaldada por fuentes institucionales o literatura publicada», «juicio profesional», «juicio del autor»), pendiente de confirmación actuarial; estado de revisión que empieza en `pendiente-de-revision`, se guarda y se lista en «Metodología», no en la caja.

## Formato del registro

Un JSON por interpretación en `src/contenido/interpretaciones/<id>.json` (esquema `Interpretacion` en `src/engine/interpretaciones.ts`):

| Campo                                       | Qué es                                                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `id`                                        | Igual que el nombre del fichero.                                                               |
| `ejemplo`                                   | `true` solo en los ejemplos de `/diseno`.                                                      |
| `tipo`                                      | `autor` o `atribuida`.                                                                         |
| `titulo`                                    | Título de la caja (nombre accesible «Interpretación: título»).                                 |
| `pagina`, `ancla`                           | Ruta de la página y `id` del elemento interpretado.                                            |
| `texto`                                     | Texto con marcadores `{{nombre}}`. Las atribuidas empiezan por «Según».                        |
| `marcadores`                                | `nombre → { ref, periodo?, formato, decimales? }` o `{ atribucion: true, formato }`.           |
| `criterios`                                 | `[{ termino, definicion }]`: un criterio por término de valoración.                            |
| `datosQueLaSostienen`                       | `data/<carpeta>/<fichero>.json#<id>`, `motor:<nombre>` o, en los ejemplos, `muestra#<n>`.      |
| `atribucion`                                | Solo atribuidas: `autores`, `anio`, `titulo`, `publicacion`, `dato` (Dato), `fuentePrimaria?`. |
| `proyeccion`                                | Si es una proyección: `hipotesis`, `sensibilidades`, `rango?` (`desde`, `hasta`: marcadores).  |
| `grado`, `estadoRevision`, `fechaRedaccion` | Escala provisional, estado de revisión y fecha `AAAA-MM-DD`.                                   |

## Cómo se añade una interpretación

1. Redacta el registro en `src/contenido/interpretaciones/<id>.json` con `pagina` y `ancla` del elemento interpretado, el texto con marcadores y un criterio por cada término de valoración.
2. Si es **del autor**: `tipo: "autor"`, sin `atribucion`; cifras con `ref` a /data (o `motor:`).
3. Si es **atribuida**: `tipo: "atribuida"`, texto que empiece por «Según…» y `atribucion` con el Dato de la publicación (confianza «media» o «baja»); su cifra, con el marcador `{ "atribucion": true }`.
4. `npm run validate:interpretaciones` (dentro de `npm run lint`).
5. En la página: pon el `id` del `ancla` en el elemento interpretado y, después de él, `<InterpretationBox interpretacion={interpretacionPorId('<id>')} resolver={…} />`, con un `resolver` que dé el Dato de cada referencia (los que la página ya carga).
6. Si la caja afirma algo que conviene registrar, añade a `docs/claims-web.json` una afirmación con `categoria: "interpretacion"`, `interpretacion`, `datosQueLaSostienen`, `estadoRevisionInterpretacion` y, si procede, `atribucion`.
7. `npm test`: la prueba de rutas (`src/app/interpretaciones-rutas.test.tsx`) comprueba el orden y que la página muestra sus registros; «Metodología» la lista sola.

## Cómo se revisa

El revisor lee cada interpretación con sus datos y sus criterios. El resultado se anota en el registro (`estadoRevision`: `revisada` o `retirada`) y en `docs/DECISIONES.md`; «Metodología» lista el estado. La escala del grado de confianza también está pendiente de confirmación actuarial.
