# Estado de la fase RI «Interpretaciones»

Rama `feat/ri-interpretaciones`, creada desde `origin/main` (`30f3e7a33a0744de295426e219a9e42dcbe8eeec`, PR [Exequ/Pensiones#53](https://github.com/Exequ/Pensiones/pull/53); CI y despliegue de ese commit en verde). Infraestructura de las cajas «Interpretación» **sin contenido**: ninguna página de contenido muestra una interpretación. Guía: `docs/INTERPRETACIONES.md`. Decisiones: `docs/DECISIONES.md` («Fase RI»).

## Qué se hizo

- **Formato** (`src/engine/interpretaciones.ts`): esquema `Interpretacion` (id, tipo, página y ancla, texto con marcadores, criterios, datos que la sostienen, atribución, proyección, grado, estado de revisión y fecha), escala provisional del grado (`GRADOS_INTERPRETACION`), resolución de marcadores con `formato.ts` y rótulo. Registros en `src/contenido/interpretaciones/*.json`: dos ejemplos (`ejemplo-autor`, `ejemplo-atribuida`), solo para `/diseno`.
- **Reglas** (`scripts/lib/interpretaciones.ts`, `scripts/lib/politica.ts`): criterio por término de valoración, sin partidos ni programas, sin cifras escritas a mano, marcadores definidos y usados, datos existentes, atribución a una publicación (no apuntes, redes sociales ni fuentes sin Dato; confianza como máximo «media»), texto atribuido («Según…»), proyecciones con hipótesis y rango, voz y ejemplos solo en `/diseno`. Validación en `npm run lint` (`validate:interpretaciones`).
- **Componente** `InterpretationBox` (región «Interpretación: título», rótulo, texto en cursiva, hipótesis y rango, criterios, grado como etiqueta neutra, fuente con `SourceLine`). Ejemplos en `/diseno`, después de una tabla ficticia.
- **Pruebas**: componente y excepción acotada (`src/components/InterpretationBox.test.tsx`), reglas con una prueba de sensibilidad por regla y esquema de afirmaciones (`scripts/interpretaciones.test.ts`), recorrido de todas las rutas (orden, ejemplos solo en `/diseno`, nombre accesible: `src/app/interpretaciones-rutas.test.tsx`), e2e a 1360 y 390 px (`e2e/interpretaciones.spec.ts`). Las nueve pruebas de neutralidad de las páginas recorren `textoSinInterpretaciones`.
- **Afirmaciones**: el esquema `Afirmacion` admite `categoria: "interpretacion"` con sus campos; `docs/claims-web.json` solo cambia su descripción.
- **Metodología**: apartado «Las cajas «Interpretación»» con los dos tipos, las reglas, la escala provisional y la lista calculada de interpretaciones publicadas (hoy vacía), con su «Dónde consta».

## Qué quedó fuera y por qué

- Ninguna interpretación en páginas de contenido: el contenido lo aporta el autor en las fases de página.
- Funciones del motor como fuente de cifras: el registro `FUNCIONES_MOTOR_INTERPRETACION` existe pero está vacío (se probará con la primera que haga falta).
- Sin descargas nuevas (fase siguiente).

## Pendientes para Sergio

- **Actuariales**: confirmar la escala del grado de confianza (provisional) y el procedimiento de revisión de cada interpretación.
- **Descargas manuales**: ninguna en esta fase.
- **Modelos**: ninguno.
- **Otros**: aportar las primeras interpretaciones y publicaciones (fases de página); revisar la lista de términos políticos (`scripts/lib/politica.ts`).

## Batería local

- `npm run lint` (incluye `validate:data` y `validate:interpretaciones`) y `npx tsc -b --force` en verde.
- `npm test`: 157 ficheros y 3.200 pruebas en verde.
- `npm run build` correcto. Trozo principal `index-*.js`: 280.262 bytes (88.335 comprimidos con `gzip -c`); en `main`, 280.218: +44 bytes. Las cajas y los registros van en los trozos de `/diseno` y de «Metodología».
- Capturas a 1360 y 390 px de `/diseno` (bloque de las cajas) y del apartado de «Metodología» revisadas: sin desbordes ni errores de consola.
- Playwright completo en local: 710 en verde y 8 en rojo, **los mismos ocho de `e2e/sitio.spec.ts`** (con `INPUT border-radius 50%` como única causa, también en `/diseno`: la caja nueva no añade ninguna). Spec nuevo `e2e/interpretaciones.spec.ts` (4 pruebas, 1360 y 390 px, con axe) en verde.
