# Estado de la fase R4 «Gráficos ampliables»

Rama `feat/r4-graficos-ampliables`, creada desde `origin/main` (`7e3438907ef0c0553efbc7e1015078a7f0e6657e`, PR [Exequ/Pensiones#51](https://github.com/Exequ/Pensiones/pull/51); CI y despliegue de ese commit en verde: run 134 de cada flujo). No cambia ningún dato, cifra, texto de contenido, fuente, ruta ni slug, ni la estructura de las páginas. No toca `modelos/`, `docs/modelos/`, `data-raw/` ni `/data` (sus últimos cambios son de R2, del 2026-11-18, y ya estaban reflejados: las pruebas pasan sin tocarlos), ni `docs/claims-web.json` o `docs/DISCREPANCIAS.md`. Inventario: `docs/INVENTARIO_R4_GRAFICOS.md`. Decisiones y motivos: `docs/DECISIONES.md` («Fase R4»).

## Qué se hizo

- **Un solo mecanismo, en `Chart`**: comprobado que todos los gráficos de la web pasan por `Chart` (el encargo suponía que no); el botón «+» y el diálogo viven ahí, y ningún envoltorio los repite. Botón «+» en la esquina superior derecha de cada figura, de 44 px, siempre visible, con nombre «Ampliar gráfico: título», `aria-haspopup` y `aria-expanded`.
- **Diálogo**: `<dialog>` modal con el patrón de foco del desplegable de fuentes, ahora común (`src/components/dialogoModal.ts`, que usan `SourceLine` y `Chart`): foco a «Cerrar», Tab y Mayús+Tab no salen, Esc y «Cerrar» cierran, el foco vuelve al «+», un gráfico ampliado a la vez; la fuente se abre encima del gráfico ampliado y Esc cierra solo la de arriba. Dentro: título, descripción, el gráfico redibujado por Observable Plot al ancho del diálogo y con más alto (no un escalado), la tabla de datos a la vista, la nota, la fuente y el «Cómo leerlo», con el estado actual de los controles de la página. Escritorio: casi toda la ventana, desplazamiento interno y cabecera con «Cerrar» siempre a la vista; móvil: pantalla completa, sin desbordes, con el gráfico al ancho de la pantalla (desplazamiento horizontal dentro de su marco solo por debajo de 320 px). Sin sombras, radios ni transiciones. Ningún `id` duplicado.
- **«Cómo leerlo» en el sistema de diseño**: `HowToRead` (antes `ComoLeerlo`, que se reexporta), que `Chart` pinta después de la figura y en el diálogo; `GraficoPosicion` lo recibe como los demás envoltorios. El DOM de las páginas no cambia.
- **Fuentes con nombre único**: los 59 `SourceLine` sin título lo reciben (el de su tabla, encabezado o bloque); ninguna página tiene dos botones «Fuente(s)» que se anuncien igual. En «Reformas», la fuente de una tabla repetida en varias fichas lleva el nombre de la norma.
- **Índice**: el resumen de cada entrada del índice fijo «En esta página» ya no lleva el «·» delante cuando va en su propia línea (en la variante en línea y en móvil se mantiene).
- **Pruebas nuevas**: `src/components/ChartAmpliado.test.tsx` (nombre del botón, clic, Intro y Espacio, Esc y «Cerrar», foco de vuelta, Tab, contenido del diálogo, fuente anidada, uno a la vez, sin ids duplicados); `src/app/graficos-rutas.test.tsx` (todas las rutas: cada SVG de gráfico tiene su «+», cada gráfico se amplía con gráfico, tabla, fuente y «Cómo leerlo» sin ids repetidos, y ningún botón «Fuente(s)» repite nombre ni queda sin título); `e2e/graficos-ampliables.spec.ts` (a 1360 y 390 px, cinco envoltorios distintos: `GraficoSeries` en «Financiación y déficit», `GraficoPosicion` en «La hucha», `GraficoProyeccion` en «Proyecciones», `GraficoBarrasPaises` en «Otros sistemas» y `GraficoBases` en «Tu pensión»; ratón y teclado, más ancho que el normal, sin desbordes, foco de vuelta, sin sombras ni radios, axe con el diálogo abierto, fuente anidada y el «·» del índice); una prueba más en `OnThisPage.test.tsx`.

## Qué quedó fuera y por qué

- **Controles duplicados en el diálogo**: no se duplican; el diálogo muestra el estado actual (el encargo lo permitía y es lo más sencillo).
- **Gráfico ampliado con un ancho mínimo mayor en móvil**: se probó con 640 px y se descartó tras revisar la captura (había que desplazar para ver el gráfico entero).
- **Recorrido de todas las rutas en Playwright**: va en la prueba unitaria de rutas para no alargar el job de Playwright del CI.

## Pendientes para Sergio

- **Actuariales**: ninguno.
- **Descargas manuales**: ninguna.
- **Modelos**: ninguno.
- **Otros**: revisar los títulos que se han dado a las líneas de fuente que no acompañan a una tabla (inventario, apartado b, columna «De dónde sale»); confirmar el alto del gráfico ampliado (1,5 veces el normal).

## Batería local

- `npm run lint` (ESLint, Prettier, estilos, contraste y `validate:data`: 163 ficheros) en verde.
- `npx tsc -b --force` (sin caché incremental, con los ficheros de test) sin errores.
- `npm test`: 146 ficheros y 3.113 pruebas en verde (antes de la fase, 144 y 3.084).
- `npm run build` correcto. Trozo principal `index-*.js`: 279.990 bytes (88.234 comprimidos con `gzip -c`; en `main`, 279.950 y 88.214): +40 bytes. El mecanismo va en el trozo de `Chart` (que ya cargaban todas las páginas con gráficos, junto con Observable Plot): 275.673 bytes (91.407 comprimidos; en `main`, 274.127 y 90.993) y su CSS, 3.717 bytes.
- Playwright completo en local: 696 en verde y 8 en rojo, **los mismos ocho de `e2e/sitio.spec.ts`** («sin sombras, degradados, radios > 2 px…» en `/diseno`, `/cotizantes-y-pensionistas`, `/financiacion-y-deficit` y `/hucha`, escritorio y móvil), con `INPUT border-radius 50%` como única causa, propia del Chromium local. El botón «+» y el diálogo no infringen radios ni sombras (lo comprueba además `e2e/graficos-ampliables.spec.ts` con el diálogo abierto). Las 26 pruebas nuevas tardan como mucho 5,1 s (límite: 90 s).
- Ancho medido del gráfico ampliado (primer gráfico de «La hucha»): a 390 px, 358 px frente a 342 del normal; a 1360 px, 1.246 px frente a 760.
- Capturas a 1360 y 390 px revisadas: figura con el «+» y diálogo abierto en «Financiación y déficit» y «La hucha»; índice de «Metodología» sin «·». Sin desbordes ni solapes.

## CI y despliegue

PENDIENTE_CI
