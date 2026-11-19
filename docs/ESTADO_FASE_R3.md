# Estado de la fase R3 «Navegación»

Rama `feat/r3-navegacion`, creada desde `origin/main` (`9bc997ec24f03a5dab9f6a9125db93eb01f7bcc5`, PR [Exequ/Pensiones#50](https://github.com/Exequ/Pensiones/pull/50); CI y despliegue de ese commit en verde: run 131 de cada flujo). Solo cambia cómo se navega: no cambia el contenido, los textos, los datos, las cifras, las fuentes, las rutas ni los slugs de ninguna página. No toca `modelos/`, `docs/modelos/`, `data-raw/` ni `/data` (sus últimos cambios son del 2026-11-17 y ya estaban reflejados: las pruebas pasan sin tocarlos), ni `docs/claims-web.json`, `docs/DISCREPANCIAS.md`, `SourceLine`, `Chart` o `DataTable`. Inventario: `docs/INVENTARIO_R3_NAVEGACION.md`. Decisiones y motivos: `docs/DECISIONES.md` («Fase R3»). Nombres de los grupos: `docs/GUIA_DE_VOZ.md`.

## Qué se hizo

- **Grupos en un único módulo**: `src/modules/navegacion.ts` (`GRUPOS_NAVEGACION`, `PAGINAS_SOBRE_LA_WEB`, `RUTAS_NAVEGACION`, `grupoDeRuta`, `grupoSobreLaWeb`). «Tu pensión» (enlace directo); «Cómo funciona» (tipos de pensión, cómo se calcula, reformas); «El sistema por dentro» (financiación y déficit, la hucha, cotizantes y pensionistas, proyecciones); «Comparar y contrastar» (otros sistemas, mitos y realidades); «Sobre la web» (metodología, fuentes, registro de cambios). Lo usan la cabecera, la portada (índice agrupado, mismos textos), el pie, las páginas auxiliares y las pruebas.
- **Menú agrupado** (`Header`): patrón de «disclosure» (botón con `aria-expanded` y `aria-controls`, lista de enlaces; sin `role="menu"`). Un grupo abierto a la vez; se cierra con Esc (foco a su botón), al elegir un enlace, al cambiar de ruta, al pulsar fuera y cuando el foco sale del menú. Grupo actual marcado (`aria-current="page"` en el enlace y marca en el botón del grupo). Escritorio: panel bajo el botón, con filete y fondo, sin sombra ni radio. Móvil: dentro de «Menú», acordeón con objetivos de 44 px.
- **Índice «En esta página»** (`OnThisPage`, con `anclas.ts` e `InternalLink`): desplazamiento y foco a mano, compatible con `HashRouter`, sin cambiar la ruta ni el query del hash (el `href` es la propia página con su query); respeta `prefers-reduced-motion`. En escritorio, fijo en la columna de notas (marco absoluto sobre el área de rejilla de esa columna y `position: sticky`) y con el apartado que se lee marcado (`aria-current="location"`, sin dependencias); en móvil, botón «En esta página» cerrado por defecto. Variante en línea para páginas con bloques a todo el ancho.
- **Entradas declaradas desde los encabezados**: `src/modules/<slug>/apartados.ts` en cada página con índice; el `<h2>` y su entrada pintan la misma constante, con `id` estable y `tabIndex={-1}`.
- **Páginas con índice** (tres o más `<h2>` de contenido): «Tipos de pensión», «Cómo se calcula» (migrado, con títulos y resúmenes), «Reformas» (en línea), «Financiación y déficit», «La hucha», «Cotizantes y pensionistas», «Proyecciones», «Otros sistemas» (en línea), «Mitos y realidades» (índice de afirmaciones con el componente común, nombre «Afirmaciones») y «Metodología» (migrado, con títulos y resúmenes). Se borran `metodologia/Indice.tsx`, `como-se-calcula/IndiceSecciones.tsx` y `mitos-y-realidades/IndiceAfirmaciones.tsx` con sus estilos; la línea del tiempo de «Reformas» y el enlace interno de «Metodología» usan `InternalLink`.
- **Detalle técnico plegable** (`TechnicalDetail`): encabezado con botón `aria-expanded`/`aria-controls` y región nombrada, plegado por defecto; el contenido se monta al desplegar (un gráfico dentro conserva tabla, nota y fuente). Ejemplo en `/diseno`; no se usa en páginas de contenido.
- **Arreglo**: el `<h2>` de cierre de todas las páginas tenía `id="contenido"`, duplicado con `<main>`; pasa a `contenido-pagina`.
- **Pruebas nuevas**: `src/modules/navegacion.test.ts` (grupos, toda sección en un grupo, sin cifras), `src/components/Header.test.tsx` (disclosure, trece rutas alcanzables, un grupo abierto, Esc y foco, Tab, pulsar fuera, elegir enlace, cambio de ruta, grupo actual), `src/components/OnThisPage.test.tsx` (entradas, foco y desplazamiento sin cambiar ruta ni query, `href`, plegado en móvil, marca del apartado visible, movimiento reducido), `src/components/TechnicalDetail.test.tsx`, `src/app/indices.test.tsx` (todas las rutas: cada entrada lleva a un `<h2>` con el mismo texto, `id` y `tabIndex`, en orden, sin `<h2>` de contenido fuera; rutas sin índice) y `e2e/navegacion.spec.ts` (a 1360 y 390 px: las trece rutas desde el menú con ratón y con teclado, Esc, pulsar fuera, índice en «Metodología», «Financiación y déficit» y «Cómo se calcula» con `v=1&p=inc` sin cambios en la dirección, índice fijo y plegado, detalle técnico, axe con un grupo abierto y con el índice abierto, sin desbordes, sin sombras ni radios).
- **Ayudante e2e común** (`e2e/utilidades.ts`): `irPorMenu`, `irPorMenuConTeclado`, `abrirMenuMovil`, `menu`, `abrirIndice`. Lo usan las pruebas que buscaban enlaces del menú o el índice por nombre (`sitio`, `proyecciones`, `metodologia`, `como-se-calcula`, `mitos`), sin quitar comprobaciones.

## Qué quedó fuera y por qué

- **Índice en «Tu pensión»**: sus `<h2>` son los pasos de un formulario y su resultado; un índice añadiría paradas de tabulación antes del simulador (decisión en `DECISIONES.md`).
- **Índice fijo en «Otros sistemas» y «Reformas»**: tienen bloques a todo el ancho que el índice fijo taparía; llevan el índice en línea.
- **Fichas de «Reformas» en el índice**: ya tienen su índice (la línea del tiempo).
- **Uso del detalle técnico en páginas de contenido**: es de R7 y R8.
- **Títulos largos en el menú**: se mantiene el `tituloNav` de cada sección.

## Pendientes para Sergio

- **Actuariales**: ninguno.
- **Descargas manuales**: ninguna.
- **Modelos**: ninguno.
- **Otros**: confirmar los nombres de los cinco grupos y que «Tu pensión» quede sin índice; decidir en R7/R8 dónde va el detalle técnico.

## Batería local

PENDIENTE

## CI y despliegue

PENDIENTE
