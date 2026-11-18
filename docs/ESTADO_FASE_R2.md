# Estado de la fase R2 «Fuentes desplegables»

Rama `feat/r2-fuentes-desplegables`, creada desde `origin/main` (`ce2536582df6aef0ccc97d9c776b47d1d85dd1f7`, CI y despliegue en verde: run 127). Decisiones y motivos: `docs/DECISIONES.md` («Fase R2»). Qué se renderizaba y qué se decidió con cada hallazgo: `docs/INVENTARIO_R2_FUENTES.md`. Guía de voz: `docs/GUIA_DE_VOZ.md` (nota nueva sobre fecha de descarga y confianza). No toca `modelos/`, `docs/modelos/`, `data-raw/`, `docs/claims-web.json`, `docs/DISCREPANCIAS.md`, la navegación ni los índices.

## Qué se hizo

- **Componente**: `SourceLine` es el botón «Fuente» (una) o «Fuentes» (varias) con `aria-haspopup="dialog"` y `aria-expanded`, que abre un `<dialog>` modal. Muestra por fuente el título (enlace), el organismo, el identificador del documento, la naturaleza y, solo si el dato las lleva, la cita (`quote`) y la ubicación (`location`). Junto al botón se ve siempre la naturaleza del dato cuando existe. Abre con clic, Intro y Espacio; cierra con Esc, «Cerrar» y clic fuera; el foco entra en «Cerrar» y vuelve al botón; Tab y Mayús+Tab no sacan el foco; solo hay un desplegable abierto; el contenido se desplaza dentro del diálogo; en 390 px cabe en pantalla. Sin sombras, radios ni transiciones; objetivos de 44 px. API intacta (`datos`), con `titulo` opcional (nombre accesible «Fuente: título») que reciben `Chart` y `TablaConFuente`.
- **Fecha de descarga y confianza**: no se ven ni se leen en ningún sitio de la interfaz (texto, `aria-label`, `title`, `<time>`); siguen en los datos y `validate:data` las exige. `fuentesUnicas` ya no las devuelve.
- **Datos (solo texto mostrado)**: 1.548 líneas de `source.title` en 34 ficheros sin «descargado el…», «versión descargada…» ni «en el repositorio»; siete `location` sin rutas del proyecto ni huella (la de los PDF de 2011 pasa a las `notes`). Mismos cambios en los scripts de extracción; `docs/FUENTES.md` y `docs/claims.json` regenerados.
- **Textos propios**: sin confianza en notas de gráficos, tabla de gastos impropios, modalidades de «Tipos de pensión», rasgos de «Otros sistemas» y mensajes del motor; las frases de apertura de las páginas ya no hablan de fecha de descarga ni de nivel de confianza.
- **Metodología**: se corrige lo que sugería que la web muestra fecha y confianza junto a cada fuente; aviso «Puede haber datos más recientes que los mostrados; se intenta mantener la web actualizada.»; frase sobre el asistente de inteligencia artificial (Claude Code, de Anthropic), que consta en `DECISIONES.md` para las sensibilidades del modelo financiero; dos entradas de «Dónde consta». Los recuentos calculados de la página no cambian.
- **Voz**: familia `registro` en `scripts/lib/voz.ts` (exenta solo en «Metodología»), sin `FORMA_TOLERADA_HASTA_R2`; `src/app/voz-rutas.test.tsx` abre cada «Fuente(s)» antes de leer el texto; prueba de sensibilidad mantenida.
- **Pruebas**: `src/components/SourceLine.test.tsx` (una y varias fuentes, con y sin naturaleza y cita, cerrado sin fecha ni confianza, abierto, Esc, foco, clic fuera, Intro y Espacio, Tab, un solo desplegable, nombre único); pruebas existentes actualizadas con `src/test/fuentes.ts` (abre con clic normal, sin quitar comprobaciones); `e2e/fuentes.spec.ts` (cuatro rutas, escritorio y móvil).

## Qué quedó fuera y por qué

- **Literales de la OCDE (ELMEA y OAIP)**: viven en `Serie.title`, no en el `Dato` de la `SourceLine` (`datoDeSerie` no lo copia). Mostrarlos exige reestructurar datos; **para R7**.
- **«Total ingresos / Total gastos»**: el par completo está en `value` (no se muestra); en el desplegable se ven la cita «TOTAL INGRESOS» y la ubicación «…y «TOTAL GASTOS» en ResumenPG». Los otros dos literales de Financiación y déficit se ven completos.
- **Título accesible**: solo `Chart` y `TablaConFuente` lo pasan; los demás botones se llaman «Fuente» o «Fuentes».
- **Confianza de las lecturas de interpretación** («adoptada con confianza baja o media»): no es la de la fuente de un dato y no se toca.
- **`docs/claims-web.json`**: conserva los títulos anteriores (instrucción de la fase).
- **Desplegables largos**: el de Hucha tiene cinco fuentes y unos 2.500 px de alto a 390 px; se desplaza dentro del diálogo.

## Pendientes para Sergio

- **Actuariales**: ninguno nuevo. La confianza que ya no se ve (datos derivados, OCR) sigue descrita en «Metodología».
- **Descargas manuales**: ninguna nueva.
- **Modelos**: ninguno.
- **Otros**: decidir en R7 cómo mostrar los literales de la OCDE; regenerar `docs/claims-web.json` cuando toque (conserva títulos con «descargado el…»); confirmar que la frase de «Metodología» sobre el asistente es la que se quiere publicar (se limitó a lo que consta en `DECISIONES.md`).

## Batería local

- `npm run lint` (ESLint, Prettier, estilos, contraste y `validate:data`: 163 ficheros) en verde.
- `npx tsc -b --force` (sin caché incremental, con los ficheros de test) sin errores.
- `npm test`: 139 ficheros y 3.030 pruebas en verde.
- `npm run build` correcto. Trozo principal `index-*.js`: 277.230 bytes (87.441 comprimidos con gzip; antes 277.345 y 87.467).
- Playwright completo en local: 600 en verde y 8 en rojo, **los mismos ocho de `e2e/sitio.spec.ts` que R1** («sin sombras, degradados, radios > 2 px…» en `/diseno`, `/cotizantes-y-pensionistas`, `/financiacion-y-deficit` y `/hucha`, escritorio y móvil): `INPUT border-radius 50%` en `SegmentedPills`, propio del Chromium local; no aparece ninguno más y el desplegable nuevo no infringe radios ni sombras (lo comprueba `e2e/fuentes.spec.ts` con el desplegable abierto).
- Capturas a 1360 y 390 px de «Financiación y déficit» con el desplegable cerrado y abierto revisadas.

## CI y despliegue

CI del PR en curso al escribir esta línea; el resultado se anota aquí antes de fusionar.
