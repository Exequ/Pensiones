# Guía de voz de la web

Fase R1. Define cómo se escribe todo texto visible de la web. La protegen `src/app/voz-rutas.test.tsx` (todas las rutas) y
`scripts/voz-web.test.ts` (detector y cadenas de código), con la lista de `scripts/lib/voz.ts` (la lista de esta guía es la de ese módulo).

## Principios

1. **Voz objetiva de publicación.** Los textos informan de qué dice cada fuente y de qué se calcula
   a partir de ella. No narran cómo se hizo el trabajo.
2. **El lector no conoce el proyecto.** Un texto debe entenderse sin saber qué es un fichero de
   datos, un repositorio, una tanda de revisión o una fase.
3. **La web nombra la fuente oficial, no el fichero del proyecto.** Un dato procede de «el INE», «el
   BOE» o «la Seguridad Social», no de «data/…json». Lo que describe cómo se obtuvo y se comprueba el
   trabajo está solo en la página «Metodología».
4. **No se añaden afirmaciones al reescribir.** Quitar una expresión no puede perder un hecho: el
   hecho sigue con su fuente oficial. Si un texto solo describía trabajo interno, se quita.
5. **Neutralidad** (regla c de `CLAUDE.md`): sin valoraciones ni veredictos.

## Expresiones prohibidas fuera de la zona permitida

Con y sin tilde, en singular y en plural:

| Familia     | Expresiones                                                                                                    |
| ----------- | -------------------------------------------------------------------------------------------------------------- |
| Descarga    | «descargado/a(s)» referido a ficheros, textos, normas o datos; «la descarga está…»                             |
| Repositorio | «repositorio», «repo», «GitHub», «commit», «claims», «Claude», «fichero(s) de datos»                           |
| Rutas       | `data/…`, `data-raw/…`, `/data`, `docs/…`, `modelos/…`, `src/…`, `scripts/…`, `.json`, `.md`, `.ts`            |
| Revisión    | «revisor», «revisión actuarial», «revisión interna»                                                            |
| Literal     | «Literal de la fuente»                                                                                         |
| Registro    | «descargado el AAAA-MM-DD», «versión descargada», «confianza: alta», «fecha de descarga», «nivel de confianza» |

**Fecha de descarga y confianza** (fase R2): se registran en los datos (`fetchedAt`, `confidence`), pero
no se muestran en ningún texto visible, `aria-label`, `title` ni tooltip fuera de «Metodología». La línea
de fuente es el botón «Fuente» o «Fuentes», que abre un desplegable con el título (enlace), el organismo
y, si el dato los lleva, el identificador del documento, la naturaleza y la cita. Junto al botón consta
siempre la naturaleza del dato cuando la tiene. Ya no hay formas toleradas: la familia `registro` de
`scripts/lib/voz.ts` prohíbe «descargado el AAAA-MM-DD», «versión descargada», «confianza:
alta|media|baja», la confianza de un dato entre paréntesis o con «con confianza …», «fecha de
descarga» y «nivel de confianza». La confianza de una lectura de interpretación («con confianza baja o
media») es otra cosa y no está prohibida.

**Zona permitida** (`ZONA_PERMITIDA` en `scripts/lib/voz.ts`): la página «Metodología» completa, que
explica la revisión actuarial y los medios de verificación («Dónde consta») y, en «Cómo
reproducirlo», el repositorio, las rutas y los comandos. Ninguna otra.

## Expresiones estándar

| En lugar de…                                     | Escribir…                                                                        |
| ------------------------------------------------ | -------------------------------------------------------------------------------- |
| «no consta en los textos / ficheros descargados» | «no consta en las fuentes consultadas»                                           |
| «con los datos descargados no se puede…»         | «con los datos consultados no se puede…»                                         |
| «no está en /data», «no estructurado en /data»   | «no consta en los datos de la web», «no se ha incorporado a los datos de la web» |
| «el literal de la fuente es…»                    | la explicación con fuente; la cita del dato queda en el desplegable de fuentes   |
| «según el revisor…» (opinión sin comprobar)      | el hecho comprobado, o «no comprobado en las fuentes consultadas»                |
| «la revisión actuarial ha cerrado la lectura»    | «la duda de interpretación está cerrada»                                         |
| «el dato no está descargado»                     | «la fuente no precisa…», «no hay dato publicado para…»                           |
| nombre de un fichero del proyecto                | «según [organismo], …»                                                           |

## Nombres de la navegación (fase R3)

Los grupos del menú y su contenido están en `src/modules/navegacion.ts` (única fuente). Sus nombres
describen qué hay dentro, sin cifras ni valoraciones:

| Grupo                   | Contiene                                                                  |
| ----------------------- | ------------------------------------------------------------------------- |
| «Tu pensión»            | Enlace directo al simulador (sin desplegable)                             |
| «Cómo funciona»         | Tipos de pensión, Cómo se calcula, Reformas                               |
| «El sistema por dentro» | Financiación y déficit, La «hucha», Cotizantes/pensionistas, Proyecciones |
| «Comparar y contrastar» | Otros sistemas, Mitos y realidades                                        |
| «Sobre la web»          | Metodología, Fuentes, Registro de cambios                                 |

Los enlaces del menú usan el título corto de cada sección (`tituloNav`). El índice de cada página se
llama «En esta página» (en «Mitos y realidades», «Afirmaciones») y sus entradas repiten exactamente el
texto de cada encabezado.

## Cajas «Interpretación» (fase RI)

La guía de voz se aplica también dentro de las cajas «Interpretación», sin exenciones (ni la de «Metodología»). Lo único que cambia dentro de una caja es la lista de términos de valoración: se admiten, pero cada uno lleva su criterio definido debajo del texto (`docs/INTERPRETACIONES.md`). Fuera de las cajas, las pruebas de valoraciones y de veredictos no cambian.
