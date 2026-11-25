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

## Citas de artículos y fórmulas (fase R5)

Los números de artículo, las abreviaturas de normas («TRLGSS», «DT»), las citas literales y las ubicaciones no se ven en el cuerpo ni en las tablas de «Tipos de pensión»: están en el desplegable «Fuentes» de cada bloque, que las muestra bajo «Se refiere a» (el fragmento al que corresponde) y «Ubicación en el documento». El nombre de una norma sí puede constar cuando es el hecho («el mínimo anual de la Ley de PGE»). Un texto que remite a otra parte lo hace con palabras («se explica en «Cómo se calcula»»), no con un artículo. En una fórmula, cada símbolo lleva nombre, significado en una frase y unidad en la leyenda, sin cifras escritas a mano: las cifras salen de los datos.

## Citas, fórmulas y tablas de «Cómo se calcula» (fase R6)

Lo dicho para «Tipos de pensión» rige también en «Cómo se calcula»: los números de artículo, las abreviaturas de normas, las citas literales y las ubicaciones están en el desplegable «Fuentes» de cada bloque (con «Se refiere a» para el paso, el requisito o el parámetro) y no en el cuerpo ni en las tablas. Los textos de las lecturas pasan por la misma regla: «la norma» sustituye al artículo que hacía de sujeto («la norma integra los «meses sin obligación de cotizar»…»). Para remitir a otra parte de la web se usa el título del apartado entre comillas angulares («Modalidades de la jubilación»), tomado de su constante.

Expresiones fijadas para la tabla del efecto de los meses: «jubilación anticipada voluntaria» y «por causa no imputable a la persona trabajadora» (en las columnas, «voluntaria» e «involuntaria», con esa definición en la nota); «cambio de la pensión» (con signo); «puntos de la base reguladora» para el porcentaje adicional de la demora; «la tabla es orientativa» y «el simulador calcula la jubilación ordinaria» (nunca que calcule la anticipada). La nota separa «Definición», «Qué no incluye» y «Vigencia», sin valoraciones y sin decir cuándo conviene jubilarse.

## Definiciones reutilizables (fase R7)

Las definiciones de «gasto en pensiones», «déficit» y «derechos reconocidos» están en un único módulo (`src/contenido/definiciones`) y cada página las pinta por su id; no se reescriben en cada página. Expresiones fijadas: «gasto en pensiones» (cuánto se paga) frente a «financiación» (de dónde sale el dinero); «derechos reconocidos netos» y «obligaciones reconocidas» frente a «recaudación» y «pagos realizados» («no cobros ni pagos», «no pagos de caja»); «cálculo de esta web» o «cálculo propio» para las diferencias y cocientes que no publica la fuente; «todo el subsector, no solo las pensiones» para el saldo de contabilidad nacional; «Sin detalle en las fuentes» para lo que los metadatos no delimitan. Los rótulos de la fuente (filas de la ejecución, nombres de los indicadores de la OCDE, notas de Eurostat) no se escriben en el cuerpo: son la cita del desplegable «Fuentes». Una definición no se refiere a otra por su posición («la medida anterior»), porque puede mostrarse sola en otra página.

## Definiciones de «La hucha» (fase R8)

Se añaden al módulo de definiciones las de «Fondo de Reserva», «disposición y límite anual del desembolso», «préstamos del Estado», «transferencias corrientes del Estado» y las cuatro lecturas propias («Fondo menos deuda», «deuda más transferencias acumuladas», «Fondo en meses de gasto en pensiones» y «Fondo en meses de transferencias»). Expresiones fijadas: «el Fondo de Reserva es uno solo» (el Mecanismo de Equidad Intergeneracional «aporta recursos al Fondo», no tiene un fondo propio; nunca «Fondo MEI»); «desembolso anual con límite» o «tope» (no «uso del Fondo a partir de…» ni agotamiento); «los componentes de la dotación» (excedentes de las entidades gestoras y servicios comunes, aportaciones de las mutuas y cotización finalista) y «no se producen todos los años» para las mutuas; «pasivo a devolver» (los préstamos) frente a «flujo que no se devuelve» (las transferencias); «a fin de {año}, fecha de la declaración» cuando se dice que un préstamo no había vencido. El anexo de préstamos se nombra por su contenido; «Anexo 10», los artículos y las disposiciones de cada norma son ubicación y van en «Fuentes». Un fragmento de ley o del Tribunal de Cuentas entre comillas angulares no se escribe en el cuerpo: se parafrasea y el literal queda en la cita.
