# Estado de la Fase 5-B1

Rama `feat/fase-5b1-proyecciones`, creada desde `origin/main` (con Ajustes actuariales 2, #28). Hecho: la sección «Proyecciones» con las salidas de los modelos propios M1 (demografía), M2 (cotizantes y bases) y M3 (pensiones en vigor), y los dos retoques previos. Fuera de esta fase: M4, el Fondo de Reserva y el gasto sobre PIB (fase 5-B2). Decisiones en `docs/DECISIONES.md` («Fase 5-B1»); discrepancias en `docs/DISCREPANCIAS.md`; huecos en `docs/PENDIENTE_DATOS.md`.

## Paso 0

- «Cotizantes y pensionistas»: retirada la advertencia «incluye los complementos a mínimos» (la afirmación sigue pendiente de fuente, en `docs/claims-web.json` y en `docs/PENDIENTE_DATOS.md`); test actualizado.
- Test de axe de «Tu pensión»: la causa del fallo intermitente era `check({ force: true })` sobre el botón de opción «Hombre» del formulario (el clic llegaba antes de que la maquetación se estabilizase). Sin `force` pasa 120 de 120 veces (con `force` fallaba 2 de 50). La comprobación de axe no se tocó. El mismo `force: true` falló una vez en otra especificación durante la batería completa, así que se quitó de todos los botones de opción de `e2e/`.

## Qué se muestra y de qué ficheros

Datos: `data/proyecciones/` (siete JSON, uno por CSV de `data-raw/modelos-salidas/`; ver `data/proyecciones/README.md`), más lo observado y las proyecciones publicadas con las que se comparan (`demografia/poblacion-edad-sexo`, `demografia/proyecciones-poblacion`, `demografia/ageing-report-2024-espana`, `sistema/pensiones-vigor-numero`, `sistema/afiliacion-anual`, `sistema/relacion-afiliados-pensiones`, `macro/base-media-cotizacion-rg-mensual`, `parametros/ipc-indice-medio-anual`).

**Introducción**: qué es y qué no es una proyección, escenario de referencia leído de los metadatos (g, IPC, legislación congelada, fecha de ejecución y versión del código) y cómo se distingue lo observado de lo proyectado.

**Demografía (M1)**: población de mayores y relación de dependencia, observadas, del modelo y del INE (con el tramo posterior al horizonte rotulado «ilustrativo»); tabla de diferencias por año; prueba hacia atrás (errores del modelo frente a la población observada); selector de escenarios demográficos con los rótulos del CSV y gráficos de población de mayores y relación de dependencia; tabla con todos los escenarios y años.

**Pensiones en vigor (M3)**: total y por clase (histórico de 5-A y proyección en la misma figura); reparto por grupo de edad y sexo con selectores de clase y año; contraste con el Ageing Report en índice (año de inicio = cien) con tabla de diferencias.

**Cotizantes y bases (M2)**: afiliados y cotizantes del Régimen General (observado y proyección); base total corriente y real; afiliados por pensión con el histórico más próximo y tabla de definiciones (la diferencia de fechas del denominador); contraste con el Ageing Report en índice con tabla de diferencias.

Cada gráfico: título, descripción con unidad, tabla accesible (con la naturaleza del dato de cada año), línea de fuente (con «naturaleza: …»), nota de que es proyección y «Cómo leerlo». Cada bloque: apartado plegable «Cómo funciona este modelo» a partir de `docs/modelos/Mx_descripcion.md` (no modificados).

## Cómo se distingue lo observado de lo proyectado

- `naturaleza: "proyeccion-de-modelo"` en los ficheros (esquema y `validate:data` lo exigen); `SourceLine` la muestra («naturaleza: proyección de modelo propio»; «proyección publicada por la fuente» para el INE y el Ageing Report; «derivado de datos observados» para las agregaciones propias).
- En el gráfico: línea continua (observado), trazo discontinuo, regla vertical y rótulo «Proyección →» (proyección), trazo punteado sobre fondo sombreado y rótulo «ilustrativo» (M1 posterior a su horizonte de presentación). La leyenda de tipos de línea está en cada figura.
- En la tabla: columna «Naturaleza del dato» (Observado, Proyección, Proyección (ilustrativa)).
- El año de inicio pertenece a la proyección: nunca hay un mismo año en las dos listas de una serie (`unirObservadoProyeccion`).

## Cambios de esquema

`naturaleza` opcional en `Dato` y `Serie` (observado, derivado, proyeccion-publicada, proyeccion-de-modelo); nuevo tipo de fichero `proyeccion` (`ArchivoProyeccion`) con escenario, origen (SHA-256, commit de `modelos/`), columnas con tipo y filas; regla de carpeta en `validate:data`. Datos anteriores sin cambios.

## Pruebas

- Datos: `scripts/proyecciones-5b1.test.ts` (procedencia, huella de cada CSV, el JSON reproduce el CSV, escenario del LEEME, coherencias internas, esquema y carpeta exigidos por `validate:data`) y `scripts/proyecciones-modulo-5b1.test.ts` (ficheros declarados, importaciones, sin cifras escritas a mano).
- Motor: `src/engine/proyecciones.test.ts` (unión observado/proyección, ilustrativo, diferencias, índices base cien con casos calculados a mano).
- Página: `src/modules/proyecciones/series.test.ts` (series, maquetación, datos, y los contrastes reproducen las cifras de las descripciones) y `proyecciones.test.tsx` (cada bloque, selector de escenarios, selectores de M3, plegables, naturaleza en las fuentes, neutralidad).
- Neutralidad: `scripts/lib/valoraciones.ts` ampliado; `scripts/neutralidad-5a2.test.ts` y `neutralidad.test.tsx` recorren la página nueva.
- Playwright: `e2e/proyecciones.spec.ts` (consola, peticiones externas, navegación, rótulos, selectores, teclado, móvil, 44 px, axe) y la ruta nueva en `e2e/sitio.spec.ts` (se genera de `SECCIONES`).

## Qué quedó fuera

Ver `docs/PENDIENTE_DATOS.md`, sección «Fase 5-B1»: definición del Ageing Report de «contributors» y «pensioners», pensiones de octubre de años anteriores a 2026, cotizantes anteriores a 2018 y confirmación actuarial de la confianza asignada. Nada de M4, Fondo de Reserva ni gasto sobre PIB.
