# Estado de la fase R1 «Voz de la web»

Rama `feat/r1-voz-de-la-web`, creada desde `origin/main` (`0d3fd98242cc469367bc4f18b01f038ed0d45602`). Solo texto: no cambia componentes (`SourceLine`, menú, gráficos), estructura de páginas, cifras, fuentes, confianza ni fechas de descarga. No toca `modelos/`, `docs/modelos/` ni `data-raw/`. Decisiones y motivos: `docs/DECISIONES.md` («Fase R1»). Qué se renderizaba y qué se hizo con cada hallazgo: `docs/INVENTARIO_R1_VOZ.md`. Guía: `docs/GUIA_DE_VOZ.md`.

## Qué se cambió

- **Guía y lista**: `docs/GUIA_DE_VOZ.md` y `scripts/lib/voz.ts` (lista prohibida y zona permitida en un único módulo).
- **Pruebas nuevas**: `src/app/voz-rutas.test.tsx` (las 19 rutas, con `p=inc|viu|orf`; la zona permitida es la única exención y sigue renderizándose) y `scripts/voz-web.test.ts` (sensibilidad: una muestra por expresión; la lista; las cadenas de texto del código de motores y módulos).
- **Textos reescritos**: «descargado» → «consultado» o «no consta en las fuentes consultadas» (Financiación y déficit, «Hucha», «Otros sistemas», «Cotizantes y pensionistas», «Tipos de pensión», «Proyecciones», «Reformas», «Mitos y realidades», «Cómo se calcula»); rutas `/data`, `data/…`, `docs/…`, `.json`, `.md`, `.ts` quitadas con el hecho conservado; mensajes del motor de jubilación, incapacidad y supervivencia sin `/data`; textos de las lecturas sin «revisión actuarial» ni «visto bueno de Sergio» (porcentajes y fechas intactos); «Revisión actuarial de esta afirmación» y la línea «Datos: ruta.json#id» fuera de las tarjetas de «Mitos y realidades»; «Texto completo en el repositorio» de «Reformas» pasa a «Texto completo de la norma consultado»; procedencia de las sensibilidades sin referencia a Claude; banner de desarrollo sin «actuarial».
- **Datos (solo campos de texto mostrados)**: `data/normativa/cronologia.json` (`ubicacion` y un `antes`), `data/normativa/prestaciones.json` (dos fórmulas), `data/mitos/afirmaciones-circulantes.json`, `data/parametros/{mei-destino,prestamos-estado-seguridad-social}.json`, `data/sistema/gastos-impropios.json`, `data/proyecciones/m4-escenarios.json` y `src/engine/config/lecturas-por-defecto.json`. Ni `source`, ni `url`, ni `fetchedAt`, ni `confidence`, ni claves.
- **Generador de afirmaciones**: sin cambios. Los textos de `docs/claims-web.json` solo se renderizan en «Metodología» (zona permitida), así que no hubo que cambiar el generador ni regenerar.
- **Metodología**: un párrafo (existe una guía de voz) y dos entradas de «Dónde consta»; nada más.

## Qué se mantuvo y por qué

- **Página «Metodología» completa** (revisión actuarial, medios de verificación, repositorio, rutas y comandos): es la zona permitida (`ZONA_PERMITIDA`). Cada apartado termina con «Dónde consta», que lista ficheros y rutas por diseño.
- **Formas toleradas hasta R2**: la línea de fuente («· descargado el AAAA-MM-DD ·»), el título de fuente «versión descargada el AAAA-MM-DD» y el título de las salidas de los modelos («código del modelo en el repositorio y salidas de su ejecución»). Son campos de `source` y de `SourceLine`.
- **Frase sobre la línea de fuente** («cada ficha lleva su fuente, la fecha de descarga y un nivel de confianza»): describe lo que la línea hace hoy; la cambia R2 con la línea.
- **`src/engine/mei` y `src/engine/no-contributivas`**: no llegan a ninguna página; no se renderizan, no se tocan.
- **Textos de desarrollo** (`throw new Error(…)` con rutas, esquemas de datos): no se muestran.

## Literales quitados del cuerpo (para que R2 los muestre en el desplegable de fuentes)

| Dónde estaba                                                                                  | Literal                                                                                              | Sigue en                                                     |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Financiación y déficit, «Saldos»: definición del saldo presupuestario no financiero           | «Suma de operaciones no financieras»                                                                 | `data/sistema/deficit-definiciones.json` (`value` y `quote`) |
| Financiación y déficit, «Saldos»: saldo presupuestario total                                  | «Total ingresos / Total gastos»                                                                      | ídem                                                         |
| Financiación y déficit, «Saldos»: necesidad de financiación SEC (S.1314)                      | «The difference between total revenue and total expenditure equals net lending/net borrowing (B.9).» | ídem                                                         |
| Mitos y realidades, definición de la edad efectiva de salida (medida ELMEA de la OCDE)        | «Effective labour market exit age»                                                                   | `data/internacional/ocde-espana.json`                        |
| Mitos y realidades, definición de la pobreza de renta de los mayores (medida OAIP de la OCDE) | «Old age income poverty rate below 50% of median income»                                             | ídem                                                         |
| Mitos y realidades, comparación de pobreza: «(el literal de la fuente consta en los datos)»   | referencia sin texto propio                                                                          | los datos de la medida                                       |

En «Otros sistemas» el literal por país («cita literal de la fuente» de la entrada de la sección) pasa a «cita de la fuente»; la estructura de cada sistema no se tocó.

## Decisiones (resumen; el detalle está en `docs/DECISIONES.md`)

«fichero» solo cuando es «de datos» o «de salida»; la zona permitida es toda «Metodología»; revisión interna fuera de «Metodología» (estado de las tarjetas de «Mitos y realidades», estados de las lecturas); «según el revisor» no se convierte en afirmación llana; procedencia de las sensibilidades sin Claude; aviso de desarrollo sin «actuarial».

## Pendientes

- **R2**: sustituir las formas toleradas (línea de fuente, título «versión descargada el…», título de las salidas de los modelos), mostrar los literales de arriba en el desplegable de fuentes y retirar de los textos la expresión «fecha de descarga».
- **R7** (no se hace aquí): qué mide el saldo y el patrón trimestral de las transferencias; los literales de «Financiación y déficit» no se sustituyen por explicación propia.
- **Declaración del uso de IA**: tras quitar «por Claude (un asistente de inteligencia artificial)» de la página «Proyecciones», no consta en la web que la ejecución de las sensibilidades la hizo un asistente. Decidir si se declara en «Metodología».
- **Documentos del repositorio**: `docs/DECISIONES_ACTUARIALES.md` conserva el registro de los motivos con la redacción anterior; solo la web cambió. `docs/claims-web.json` conserva también la redacción anterior de algunas afirmaciones (por ejemplo «fuentes descargadas»): solo se muestran en «Metodología» (las pendientes) y no se reescribieron a mano; se actualizarán al regenerar el catálogo.

## Paso 0: estado de partida

`origin/main` en `0d3fd98242cc469367bc4f18b01f038ed0d45602`: CI (run 123) y despliegue en GitHub Pages (run 123) en verde; existen `ESTADO_FASE_METODOLOGIA.md` (PR #48), `ESTADO_FASE_REFORMAS.md`, `ESTADO_FASE_MITOS.md` y los `INVENTARIO_*` de esas fases. No hay cambios recientes en `data-raw/` ni `modelos/` sin reflejar (no se tocan).

## Batería local

- `npm run lint` (ESLint, Prettier, estilos, contraste y `validate:data`: 163 ficheros) en verde.
- `npx tsc -b --force` (sin caché incremental, con los ficheros de test) sin errores.
- `npm test`: 138 ficheros y 3.012 pruebas en verde (antes de la fase, 136 y 2.986).
- `npm run build` correcto. Trozo principal `index-*.js`: 277.345 bytes (87.467 comprimidos con gzip; antes 277.401). El trozo de la página «Metodología» pasa a 64.300 bytes (antes 63.593) por el párrafo nuevo y las dos entradas de respaldo; los trozos de las demás páginas cambian solo por los textos.
- Playwright completo en local: 562 pruebas en verde y 8 en rojo, todas de `e2e/sitio.spec.ts` («sin sombras, degradados, radios > 2 px…» en `/diseno`, `/cotizantes-y-pensionistas`, `/financiacion-y-deficit` y `/hucha`, escritorio y móvil): `INPUT border-radius 50%` en los botones de radio de `SegmentedPills`. Se reproducen igual en un árbol de `origin/main` sin cambios (`0d3fd98`) en este entorno de ejecución (la versión local de Chromium pinta el radio por defecto con `border-radius` del 50 %), así que no los causa la fase; en el CI de `main` pasan. No se ha tocado la prueba ni el componente. Lo que decide es el CI del PR.

## CI y despliegue

- **CI del PR** ([Exequ/Pensiones#49](https://github.com/Exequ/Pensiones/pull/49)) sobre el commit de código `4a2e5ca370b753e58175754c2ebe4ba80c7745c0`: run 124 en verde, con lint, tipos, pruebas, validación de datos, compilación y Playwright completo (incluidas las ocho pruebas de `e2e/sitio.spec.ts` que fallan en este entorno local). El commit siguiente solo añade este fichero y su CI se comprueba antes de fusionar.
- **Despliegue de la compilación del PR** (run 124 de «Despliegue en GitHub Pages», evento `pull_request`): en verde.
- **Despliegue de `main` tras la fusión y comprobación de la URL publicada** (códigos HTTP y rutas a 1360 y 390 px): constan en el informe final de la sesión, porque solo existen después de fusionar y un cambio posterior en este fichero abriría un PR solo de documentación.
