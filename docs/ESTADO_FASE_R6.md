# Estado de la fase R6 «Cómo se calcula»

Rama `feat/r6-como-se-calcula`, creada desde `origin/main` (`bc582ffe446517d4cf7ba49709e5da112ada28b1`, PR [Exequ/Pensiones#55](https://github.com/Exequ/Pensiones/pull/55), fase R5; «CI» y «Despliegue en GitHub Pages» de ese commit en verde). Inventario: `docs/INVENTARIO_R6_COMO.md`. Decisiones: `docs/DECISIONES.md` («Fase R6»). No toca «Reformas», `modelos/`, `docs/modelos/`, `data-raw/` ni `docs/DISCREPANCIAS.md`; en «Tipos de pensión» solo cambia el enlace de la ficha de jubilación; sin interpretaciones, sin cambios en el motor de cálculo de la pensión ni en las lecturas, y sin dependencias nuevas.

## Qué se hizo

- **Citas en «Fuentes»** (mecanismo de R5): las normas de cada paso del esquema (un desplegable por sección, con el paso como rótulo), de los requisitos y de los pasos de los catorce ejemplos, de los parámetros y de las lecturas ya no están en el cuerpo ni en las tablas; las columnas «Norma» y «Dónde está en la norma» desaparecen. La fuente de cada ubicación (con su fecha de descarga y confianza) se toma de los datos de `data/parametros`; `quitarCitas` se amplía (varias citas, «bis», rangos, nombre de la norma tras la cita…). La frase que remitía a «Tipos de pensión» para «qué exige cada modalidad» remite ahora al apartado de modalidades.
- **Apartado «Modalidades de la jubilación»** con ancla estable (`como-modalidades-titulo`), entrada en el índice y las seis modalidades (requisitos, cuantía, límites, «Fuentes»). El enlace de la ficha de jubilación de «Tipos de pensión» llega a él con `InternalLink` (modo `pagina`: el ancla viaja en el estado de la navegación; la dirección no cambia) y el hook `useAnclaPendiente`.
- **Fórmulas legibles** de la anticipada voluntaria, la anticipada involuntaria, la demorada (porcentaje adicional y pago único) y la parcial, con leyenda y cifras por referencia a `data/parametros` (lenguaje de fórmulas ampliado con unidad, resta, potencia y cifras auxiliares).
- **Tabla del efecto de adelantar o retrasar la jubilación** (`efectoMesesJubilacion`, función pura del motor que reutiliza las funciones del simulador): una fila por mes, columnas por modalidad y tramo, título, fuente, nota de definición, «Cómo leerlo», enlace a «Tu pensión» (que calcula la ordinaria) y enlace a la lectura de la salvaguarda de la DT 34.ª. Las cuatro figuras de coeficientes y demora se mantienen; una prueba comprueba que la tabla y las figuras coinciden.
- **Afirmaciones** (`docs/claims-web.json` y `docs/claims.json`, a mano): cinco nuevas (`web-como-modalidades-anticipada`, `-demora`, `-parcial`, `web-como-efecto-meses-anticipada`, `-demora`; la última, pendiente de revisión actuarial por depender de la lectura de la fracción de año y del criterio del máximo de la escala) y la ubicación de `web-como-jub-modalidades` actualizada. Las citas siguen en los claims y en los datos.
- **Pruebas**: `src/engine/jubilacion/efecto-meses.test.ts` (cobertura, límites, coincidencia con las funciones del motor y con el cálculo completo en siete casos de anticipación y cinco de demora), `src/modules/como-se-calcula/r6.test.tsx`, ampliaciones de `citas-normativas`, `formulas`, `Formula`, `scripts/formulas-datos` y `pagina.test.tsx`; `e2e/como-r6.spec.ts` (1360 y 390 px).

## Qué quedó fuera y por qué

- **Fórmula estructurada de la jubilación activa y de la flexible**: tienen fórmula cerrada en el texto, pero sus cifras (porcentaje de la escala y cinco puntos cada doce meses; 25 % y 15 %) no constan en `data/parametros`. No se inventa un dato; se mantiene el texto sin citas.
- **Pago único y opción mixta de la demora en la tabla**: la tabla solo recoge el porcentaje adicional (lo que pedía el encargo); el pago único tiene fórmula propia en el apartado.
- **Coeficientes sobre el límite de la pensión máxima (aplicación gradual) y salvaguarda de la DT 34.ª**: fuera de la tabla por encargo; la nota los nombra y enlaza la lectura. No se resuelve.
- **Citas de lecturas que no se pueden atribuir con seguridad a una norma con fuente** (p. ej. normas sin fuente en los datos): quedan solo en el registro del motor.

## Pendientes para Sergio

- **Actuariales**: (1) la pregunta de `web-como-efecto-meses-demora` (cambio de la pensión por la demora = puntos adicionales entre el máximo de la escala; ¿añadir columnas con otros porcentajes por años cotizados?); (2) confirmar que la leyenda de las fórmulas de las modalidades (símbolos, significados, el «factor de reducción» como «uno menos el coeficiente») es la que se quiere publicar; (3) si la tabla debe incluir el pago único de la demora.
- **Descargas manuales**: ninguna. Si se quiere estructurar la jubilación activa y la flexible, hacen falta sus parámetros en `data/parametros` (con la norma descargada de cada uno).
- **Modelos**: ninguno.
- **Otros**: si se vuelve a ejecutar `scripts/etl/prestaciones.py`, hay que reinsertar las `formulaEstructurada` (las de R5 y las de R6); el texto de los motivos de las lecturas sigue en el registro del motor con sus citas, y la página las quita al mostrarlas.

## Batería local

- `npm run lint` (ESLint, Prettier, estilos, contraste, `validate:data` con las fórmulas y `validate:interpretaciones`) en verde.
- `npx tsc -b --force` (sin caché incremental, con los ficheros de test) sin errores.
- `npm test`: 163 ficheros y 3.309 pruebas en verde (antes de la fase, 161 y 3.245).
- `npm run build` correcto. Trozo principal `index-*.js`: 280.691 bytes (88.522 comprimidos con `gzip -c`); en la fase R5 eran 280.403. Trozo de «Cómo se calcula»: 85.120 bytes (21.945 comprimidos); en la fase «Cómo se calcula» eran 71.294 (18.016): crece con el apartado de modalidades, la tabla y las normas en «Fuentes». `Formula` sigue en su trozo (`formulas-*.js`, 8.052 bytes).
- Playwright completo en local: 734 en verde y 8 en rojo, **los mismos ocho de `e2e/sitio.spec.ts`** (`INPUT border-radius 50%` de `SegmentedPills`, en `/diseno`, `/cotizantes-y-pensionistas`, `/financiacion-y-deficit` y `/hucha`, escritorio y móvil). `e2e/como-r6.spec.ts` (14 pruebas, 1360 y 390 px, con axe) en verde.
- Capturas a 1360 y 390 px del apartado de modalidades (jubilación demorada con fórmula y leyenda), de la tabla del efecto con su nota y de «Fuentes» de los pasos del esquema, revisadas: sin desbordes de página; la tabla se desplaza dentro de su caja.

## CI y despliegue

Constan en el informe final de la sesión (como en R3, R4, RA, RI y R5).
