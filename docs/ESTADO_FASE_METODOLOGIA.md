# Estado de la fase «Metodología»

Rama `feat/fase-metodologia`, creada desde `origin/main` (`1116de9c8d230f5403a03592bd16938e67e014b0`, con el CI y el despliegue en verde). Sustituye el marcador en construcción de la sección «Metodología» por una página que explica cómo se hace la web, y deja reproducible el generador de afirmaciones. No toca el motor, «Tu pensión», «Proyecciones», `data-raw/`, `modelos/` ni `docs/modelos/`. Decisiones y motivos: `docs/DECISIONES.md` («Fase “Metodología”»). Respaldo de cada apartado: `docs/INVENTARIO_METODOLOGIA.md`.

## Paso 1. Generador de afirmaciones

- **Causa de la diferencia**: el generador (`scripts/etl/fuentes_claims.py`) escribía con `json.dump` y tablas sin alinear, y los ficheros versionados pasan por Prettier (`npm run lint` lo exige). Eso explica las unas mil líneas ajenas. Versión de Python, fin de línea y orden no influyen. Las nueve afirmaciones de «Reformas» ya estaban en `docs/claims-web.json`, de donde el generador las copia.
- **Una diferencia de contenido**: seis afirmaciones `norma-*` salen del resumen de `data/normativa/cronologia.json`, que «Reformas» reescribió sin calificativos, y `docs/claims.json` conservaba el texto anterior. Se actualizan esos seis textos (única excepción a «no cambiar textos»; motivo en `DECISIONES.md`). Ningún estado ni identificador cambia, y no se pierde ninguna afirmación.
- **Resultado**: el generador da el formato con Prettier al terminar y admite `SALIDA_DOCS`; dos ejecuciones dan la misma salida y coincide byte a byte con `docs/`. `scripts/generador-claims.test.ts` lo comprueba; el procedimiento está en `data/README.md`.

## La página `/metodologia`

Ocho apartados con índice accesible (el enlace mueve el foco al encabezado): «De dónde salen los datos», «Cómo se comprueban», «Qué significa la confianza y la revisión actuarial», «Lecturas del motor», «Los modelos de proyección», «Neutralidad y verificación», «Qué no hace esta web» y «Cómo reproducirlo». Cada apartado termina con «Dónde consta» (ficheros del repositorio, cada uno con un fragmento literal que un test busca en él). Enlaces a «Tu pensión», «Cómo se calcula» y «Proyecciones».

- **Recuentos** (ninguno escrito a mano): `calcularRecuentos` (`src/engine/metodologia.ts`, función pura) los calcula desde los ficheros; `scripts/lib/entradas-metodologia.ts` los lee; `vite.config.ts` los entrega a la página al compilar (módulo virtual). Fuentes y ficheros de `/data`, elementos con confianza, afirmaciones por estado y por revisión actuarial, referencias de cada tanda y estado de la tercera, lecturas por estado y por motor, casos de oro, auditoría con segunda fuente, comprobación de direcciones, ficheros de pruebas y de ETL, salidas y confianza de cada modelo, términos de las listas de neutralidad, comandos y versión de Node.
- **Pendientes sin esconder**: todas las afirmaciones con revisión actuarial pendiente se listan una a una con su pregunta; las lecturas pendientes del motor constan en el recuento y en la lista de todas las lecturas.
- **Modelos**: cada uno con qué responde, hipótesis, fiabilidad indicada y límites, resumidos de `docs/modelos/` sin cifras de resultados y sin sus frases valorativas. Los dos modelos sin salidas en `/data` lo dicen y no reciben nivel de confianza.
- **Lo que no constaba** (en `docs/PENDIENTE_DATOS.md`): una definición general de los niveles de confianza; qué fueron la primera y la segunda tanda; el nivel de confianza de los modelos sin salidas; la confirmación del criterio de confianza de los modelos (afirmación pendiente nueva); una comprobación expresa de que la web no recoge datos personales.
- **Textos, claims y fuentes**: `secciones.ts` sin dígitos y sin marcador de construcción; tres afirmaciones `web-metodologia-*` en `docs/claims-web.json` (una pendiente con pregunta reducida); la fuente de los recuentos en `docs/FUENTES.md`; `idsDeArchivo` admite el `id` de los ficheros de salidas de modelos para poder citarlos.
- **No hecho**: el paso opcional (estructurar en `data/normativa/cronologia.json` el RDL 8/2010, el RDL 29/2012 y el RDL 3/2026) no se ha abordado: se corta el primero, como pedía el encargo. Sigue anotado en `docs/PENDIENTE_DATOS.md` («Fase “Reformas”»).
- `README.md`: el estado «Fase 0 · cimientos» estaba desfasado y se sustituye.

## Pruebas

- `src/engine/metodologia.test.ts`: la función pura con entradas pequeñas contadas a mano.
- `scripts/metodologia-fase.test.ts`: recuentos recalculados con otro procedimiento (texto bruto, registro de lecturas del motor, `inventario()` de los casos de oro, `git ls-files`), respaldo de cada apartado, modelo y límite, sin cifras a mano, neutralidad con las listas de valoración y de veredicto, afirmaciones, tope de pendientes y documentación.
- `src/modules/metodologia/pagina.test.tsx`: estructura, índice y teclado, respaldo, recuentos mostrados, todas las lecturas y pendientes, tarjeta de cada modelo con fiabilidad y límites, tablas y neutralidad del texto.
- `scripts/generador-claims.test.ts`: reproducibilidad del generador.
- `e2e/metodologia.spec.ts`: sin errores de consola ni peticiones externas, teclado, enlaces, tablas, axe (página y cada apartado) y sin desbordes.
- `scripts/verificacion-ajustes-3.test.ts`: la lista esperada de afirmaciones pendientes incluye la nueva (`web-metodologia-confianza-modelos`); no se debilita ningún test.

## Tamaño del chunk de la página

`dist/assets/Pagina-BMTMDESq.js`: 63.593 bytes (18.840 comprimidos con gzip), propio de la página y cargado solo al visitarla (`lazy` en `src/modules/paginas.ts`; antes la página se importaba de forma estática). Arrastra trozos compartidos: `schemas-DEixrdbl.js` (94.256 bytes; 26.649 comprimidos), `supuestos-CB1O5__x.js` (39.794 bytes; 10.335 comprimidos; etiquetas de estado de las lecturas y registro del motor) y `Historico`/`Definition` (menos de 1 kB cada uno). Los recuentos van como datos ya calculados dentro del trozo (no se empaqueta `docs/claims.json` ni `docs/FUENTES.md`). El trozo principal (`index-*.js`) pasa de 275.991 a 277.401 bytes por los textos de la entrada de la sección. La CSS de la página ocupa 2.964 bytes.

## Revisión de capturas

A 1360 y 390 px se revisaron la cabecera con el índice, «Qué significa la confianza y la revisión actuarial» y «Los modelos de proyección»: sin desbordes ni errores de consola. En móvil la tabla de salidas de los modelos se desplaza dentro de su región.

## Batería local

- `npm run lint` (ESLint, Prettier, estilos, contraste y `validate:data`) en verde.
- `npx tsc -b --force` (sin caché incremental, con los ficheros de test) sin errores.
- `npm test`: 136 ficheros y 2.986 pruebas en verde (antes de la fase, 132 y 2.904).
- `npm run build` correcto.
- Playwright completo: 570 pruebas en verde (escritorio y móvil, 16,9 minutos), de ellas 32 de `e2e/metodologia.spec.ts`; las 538 anteriores siguen pasando.

## CI y despliegue

El resultado del CI del PR y del despliegue de `main`, y la comprobación de la ruta publicada a 1360 y 390 px, constan en el informe final de la sesión y no en este fichero, para no abrir un PR solo de documentación (misma práctica que las fases anteriores).
