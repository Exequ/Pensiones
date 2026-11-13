# Revisión actuarial priorizada

Generada por `scripts/triage-actuarial.ts` (mediciones) y `scripts/triage-actuarial-md.ts` (este documento); no edites a mano. Fecha: 2026-11-13 (Fase 2-C). Describe, no recomienda: ningún valor por defecto del motor cambia con este documento (registro en `src/engine/config/lecturas-por-defecto.json` y `docs/DECISIONES_ACTUARIALES.md`). Actualización de la Fase 2-E: las decisiones del chat actuarial (decididas y provisionales, con dos cambios de valor por defecto) constan en `docs/DECISIONES_ACTUARIALES.md`; este documento mide el efecto de cada alternativa frente al valor por defecto vigente, y las lecturas «cerradas por evidencia» de las tablas siguientes quedaron decididas con el visto bueno de Sergio.

Criterios:

- **Cerrada por evidencia**: se resuelve con un documento oficial inequívoco o con una comprobación por código. Se cita la evidencia y queda como «propuesta cerrada, pendiente de visto bueno de Sergio»; el valor por defecto del motor no cambia.
- **A, decidir antes de la Fase 3**: efecto superior al 5 % en algún caso representativo, afecta a muchos perfiles o bloquea la Fase 3.
- **B, decidir antes de publicar**: efecto menor pero real (entre el 1 % y el 5 %, o decide el derecho en el límite, o no es medible por falta de datos).
- **C, bajo impacto**: efecto inferior al 1 %, o solo documental.

Resumen: de las 28 lecturas abiertas del registro, 6 se cierran por evidencia, 11 son del grupo A, 7 del B y 4 del C. De las 65 preguntas de `docs/REVISION_ACTUARIAL.md`: 9 cerradas por evidencia, 8 del grupo A, 10 del B y 38 del C.

## Grupo A: decidir antes de la Fase 3 (ordenadas por impacto)

| Orden | Pregunta                                        | Lecturas del grupo A                                                                                                | Efecto máximo medido |
| ----: | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------: |
|     1 | 28. `param-supervivencia-reglas`                | `supervivencia.carenciaOrfandad`, `supervivencia.carenciaFamiliaresAccidenteNoLaboral`                              |          todo o nada |
|     2 | 27. `param-mei-reglas`                          | `mei.baseMEI`                                                                                                       |             135,24 % |
|     3 | 26. `param-pnc-reglas`                          | `no-contributivas.rentasConTrabajoEnCuatroAnios`                                                                    |             100,00 % |
|     4 | 29. `param-supervivencia-reglas-cuantia`        | `supervivencia.reduccionViudedad70`, `supervivencia.comparacionCompensatoria`, `supervivencia.incrementoFamiliares` |              72,22 % |
|     5 | 23. `param-incapacidad-permanente-reglas`       | `incapacidad.lagunasAccidenteNoLaboral`                                                                             |              47,94 % |
|     6 | 21. `param-pension-maxima-incremento-2051-2065` | `jubilacion.maximaDesde2051`                                                                                        |              38,49 % |
|     7 | 30. `param-supervivencia-reglas-limites`        | `supervivencia.reduccionLimiteConjunto`                                                                             |              34,21 % |
|     8 | 4. `param-lagunas-integracion`                  | `jubilacion.lagunasAnterioresAlPrimerAlta`                                                                          |              14,69 % |

### Ficha 28: Causante y base reguladora de muerte y supervivencia (orden 1)

Pregunta: `param-supervivencia-reglas` (docs/REVISION_ACTUARIAL.md, punto 28).

**Texto de la norma** (cita literal de `/data`; la fuente y el artículo están en cada dato):

> «que el causante se encontrase en alta o situación asimilada a la de alta, o fuera pensionista en los términos del artículo 217.1.c)»
> — `supervivencia-reglas#orfandad-alta-o-pensionista` · art. 224.1 TRLGSS · <https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724>

> «Asimismo, cuando al fallecer el causante se encontrase en alta o en situación asimilada al alta, será exigible que hubiera completado un periodo de cotización de quinientos días dentro de los cinco años anteriores a la fecha del fallecimiento. Si la causa de éste fuese un accidente, sea o no de trabajo, o una enfermedad profesional, no se exigirá ningún periodo previo de cotización.»
> — `supervivencia-reglas#orfandad-carencia-rd-1647-1997-dias` · art. 9.1, párr. 2.º, RD 1647/1997 · <https://www.boe.es/buscar/act.php?id=BOE-A-1997-24163>

> «Será además preciso que el causante, que al fallecer se encontrase en activo o en situación asimilada al alta, hubiese cubierto un período de cotización de quinientos días dentro de los cinco años anteriores a la fecha del fallecimiento, salvo que la causa de éste sea un accidente de trabajo o enfermedad profesional, en cuyo caso no se exigirá este requisito.»
> — `supervivencia-reglas#familiares-carencia-alta-dias` · art. 22.1 Orden de 13/02/1967 · <https://www.boe.es/buscar/act.php?id=BOE-A-1967-2876>

> «Será de aplicación a las prestaciones en favor de familiares lo establecido en el párrafo segundo del artículo 219.1.»
> — `supervivencia-reglas#familiares-sin-alta-quince-anios` · art. 226.1, párr. 2.º, TRLGSS · <https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724>

> «si la causa de la muerte fuera un accidente, sea o no de trabajo, o una enfermedad profesional, no se exigirá ningún período previo de cotización»
> — `supervivencia-reglas#carencia-exenta-accidente-ep` · art. 219.1, párr. 1.º, TRLGSS · <https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724>

**Lectura `supervivencia.carenciaOrfandad`** — Si la pensión de orfandad exige un periodo previo de cotización al causante en alta: no lo exige la ley vigente, pero sí lo exigía un reglamento anterior.

- Valor por defecto actual: `sin-carencia`. Alternativas: `rd-1647-1997`.
- Por defecto («sin-carencia»): la orfandad con causante en alta no exige periodo previo (art. 224.1 TRLGSS). Alternativa («rd-1647-1997»): se exigen 500 días en los cinco años anteriores (art. 9.1 del RD 1647/1997, redacción de 2001).
- Qué cambia en el código: una línea. Para adoptar la alternativa, en `src/engine/config/lecturas-por-defecto.json` se pone el `valor` de la entrada `supervivencia.carenciaOrfandad` en una de las alternativas (con `estado` «decidida» y la fecha) y se anota en `docs/DECISIONES_ACTUARIALES.md`. La rama del motor que cambia está en `src/engine/supervivencia/calculo.ts:198`; no hay más cambios. Quien use el motor puede elegirla sin tocar el fichero con `lecturas['supervivencia.carenciaOrfandad']` en la configuración del motor.

| Caso                                               | Magnitud       | Por defecto | Alternativa | Variación |
| -------------------------------------------------- | -------------- | ----------: | ----------: | --------: |
| 6 meses cotizados (2025-09 a 2026-02), un huérfano | orfandad €/mes |       71,43 |        0,00 | -100,00 % |
| 12 meses cotizados, un huérfano                    | orfandad €/mes |      171,43 |        0,00 | -100,00 % |
| 15 meses cotizados, un huérfano                    | orfandad €/mes |      200,00 |        0,00 | -100,00 % |

**Lectura `supervivencia.carenciaFamiliaresAccidenteNoLaboral`** — Si el favor de familiares exige periodo previo cuando la muerte se debe a un accidente no laboral: lo exige la orden reglamentaria o queda exento como en la viudedad.

- Valor por defecto actual: `exigir`. Alternativas: `exenta`.
- Por defecto («exigir»): el favor de familiares tras un accidente no laboral exige los 500 días (Orden de 1967: solo exime el accidente de trabajo y la enfermedad profesional). Alternativa («exenta»): se exime también el accidente no laboral, como en la viudedad (art. 219.1).
- Qué cambia en el código: una línea. Para adoptar la alternativa, en `src/engine/config/lecturas-por-defecto.json` se pone el `valor` de la entrada `supervivencia.carenciaFamiliaresAccidenteNoLaboral` en una de las alternativas (con `estado` «decidida» y la fecha) y se anota en `docs/DECISIONES_ACTUARIALES.md`. La rama del motor que cambia está en `src/engine/supervivencia/calculo.ts:181`; no hay más cambios. Quien use el motor puede elegirla sin tocar el fichero con `lecturas['supervivencia.carenciaFamiliaresAccidenteNoLaboral']` en la configuración del motor.

| Caso                               | Magnitud                  | Por defecto | Alternativa |     Variación |
| ---------------------------------- | ------------------------- | ----------: | ----------: | ------------: |
| nieto huérfano, 13 meses cotizados | favor de familiares €/mes |        0,00 |      617,14 | de 0 a 617,14 |
| nieto huérfano, 8 meses cotizados  | favor de familiares €/mes |        0,00 |      360,00 | de 0 a 360,00 |
| nieto huérfano, 15 meses cotizados | favor de familiares €/mes |        0,00 |      720,00 | de 0 a 720,00 |

Otras lecturas de la misma pregunta: `supervivencia.ventanaBaseReguladora` (grupo B, +1,23 %); `supervivencia.diasCotizados` (grupo B, −1,16 % de los días acreditados).

### Ficha 27: MEI y cotización adicional de solidaridad (orden 2)

Pregunta: `param-mei-reglas` (docs/REVISION_ACTUARIAL.md, punto 27).

**Texto de la norma** (cita literal de `/data`; la fuente y el artículo están en cada dato):

> «una cotización finalista aplicable en todos los regímenes y en todos los supuestos en los que se cotice por la contingencia de jubilación»
> — `mei-reglas#aplicable-contingencia-jubilacion` · art. 127 bis TRLGSS · <https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724>

> «Desde el año 2030 hasta 2050 se mantendrá el mismo porcentaje del 1,2, con igual distribución entre empresario y trabajador.»
> — `mei-reglas#tipo-total-2030-2050` · DT 43.ª TRLGSS · <https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724>

**Lectura `mei.baseMEI`** — Sobre qué base se aplica el tipo del MEI: la base de cotización por contingencias comunes o la retribución completa, incluido lo que supera la base máxima.

- Valor por defecto actual: `base-cotizacion`. Alternativas: `retribucion-completa`.
- Por defecto («base-cotizacion»): el tipo del MEI se aplica a la base de cotización por contingencias comunes (con tope). Alternativa («retribucion-completa»): se aplica a toda la retribución, también la que supera la base máxima.
- Qué cambia en el código: una línea. Para adoptar la alternativa, en `src/engine/config/lecturas-por-defecto.json` se pone el `valor` de la entrada `mei.baseMEI` en una de las alternativas (con `estado` «decidida» y la fecha) y se anota en `docs/DECISIONES_ACTUARIALES.md`. La rama del motor que cambia está en `src/engine/mei/calculo.ts:282`; no hay más cambios. Quien use el motor puede elegirla sin tocar el fichero con `lecturas['mei.baseMEI']` en la configuración del motor.

| Caso                              | Magnitud                  | Por defecto | Alternativa | Variación |
| --------------------------------- | ------------------------- | ----------: | ----------: | --------: |
| retribución de 6000 €/mes, 2026   | cuota total del MEI €/mes |       45,91 |       54,00 |   17,62 % |
| retribución de 8000 €/mes, 2026   | cuota total del MEI €/mes |       45,91 |       72,00 |   56,83 % |
| retribución de 12.000 €/mes, 2026 | cuota total del MEI €/mes |       45,91 |      108,00 |  135,24 % |

### Ficha 26: Pensiones no contributivas (orden 3)

Pregunta: `param-pnc-reglas` (docs/REVISION_ACTUARIAL.md, punto 26).

**Texto de la norma** (cita literal de `/data`; la fuente y el artículo están en cada dato):

> «durante los cuatro años siguientes al inicio de la actividad, la suma de la cuantía de la pensión de»
> — `pnc-reglas#compatibilidad-trabajo-anios-meses` · art. 366 TRLGSS · <https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724>

> «no podrá ser superior, en cómputo anual, al importe, también en cómputo anual, de la suma del indicador público de renta de efectos múltiples, excluidas las pagas extraordinarias y la pensión de»
> — `pnc-reglas#compatibilidad-trabajo-limite-iprem` · art. 366 TRLGSS · <https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724>

> «siempre que los mismos no excedan del 35 por ciento del importe, en cómputo anual, de la pensión no contributiva. En otro caso, se deducirá del importe de dicha pensión la cuantía de las rentas o ingresos que excedan de tal porcentaje»
> — `pnc-reglas#rentas-compatibles-pct` · art. 364 TRLGSS.2 · <https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724>

**Lectura `no-contributivas.rentasConTrabajoEnCuatroAnios`** — Si durante los primeros años de una actividad el límite especial de compatibilidad sustituye a la reducción general por rentas o se aplican las dos.

- Valor por defecto actual: `sustituye-364-2`. Alternativas: `se-suman`.
- Por defecto («sustituye-364-2»): durante los cuatro primeros años de actividad el límite del art. 366 sustituye a la reducción general por rentas. Alternativa («se-suman»): se aplican las dos reducciones.
- Qué cambia en el código: una línea. Para adoptar la alternativa, en `src/engine/config/lecturas-por-defecto.json` se pone el `valor` de la entrada `no-contributivas.rentasConTrabajoEnCuatroAnios` en una de las alternativas (con `estado` «decidida» y la fecha) y se anota en `docs/DECISIONES_ACTUARIALES.md`. La rama del motor que cambia está en `src/engine/no-contributivas/calculo.ts:228`; no hay más cambios. Quien use el motor puede elegirla sin tocar el fichero con `lecturas['no-contributivas.rentasConTrabajoEnCuatroAnios']` en la configuración del motor.

| Caso                                                                             | Magnitud      | Por defecto | Alternativa | Variación |
| -------------------------------------------------------------------------------- | ------------- | ----------: | ----------: | --------: |
| PNC de incapacidad, grado 70 %, rentas de 10.000 € (todas de la actividad), 2023 | pensión €/año |     3984,54 |        0,00 | -100,00 % |
| PNC de incapacidad, grado 70 %, rentas de 3.000 €, actividad de 6.000 €, 2026    | pensión €/año |     8803,20 |     8803,20 |    0,00 % |
| PNC de incapacidad, grado 70 %, rentas de 8.000 € (todas de la actividad), 2025  | pensión €/año |     7105,80 |        0,00 | -100,00 % |

Otras lecturas de la misma pregunta: `no-contributivas.baseRentasCompatibles` (cerrada por evidencia, −7,04 %); `no-contributivas.limiteTrabajo` (cerrada por evidencia, −40,79 %); `no-contributivas.limiteConTerceraPersona` (cerrada por evidencia, −100 % (sin derecho)).

### Ficha 29: Cuantía de la viudedad, la orfandad y el favor de familiares (orden 4)

Pregunta: `param-supervivencia-reglas-cuantia` (docs/REVISION_ACTUARIAL.md, punto 29).

**Texto de la norma** (cita literal de `/data`; la fuente y el artículo están en cada dato):

> «La aplicación del porcentaje del 70 por 100 sobre la respectiva base reguladora no podrá dar lugar a que la suma de la cuantía, en cómputo anual, de la pensión de viudedad, más los rendimientos anuales percibidos por el interesado, excedan del límite a que se refiere el párrafo segundo del apartado anterior. En caso contrario, se procederá a reducir la cuantía de la pensión de viudedad, a fin de no superar el límite señalado.»
> — `supervivencia-reglas#viudedad-cargas-reduccion-limite` · art. 31 Decreto 3158/1966 (redacción del RD 1795/2003), apartado 3 · <https://www.boe.es/buscar/act.php?id=BOE-A-1966-21116>

> «En el supuesto de que la cuantía de la pensión de viudedad fuera superior a la pensión compensatoria, aquella se disminuirá hasta alcanzar la cuantía de esta última.»
> — `supervivencia-reglas#divorcio-limite-compensatoria` · art. 220.1 TRLGSS · <https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724>

> «Si al fallecimiento del causante no quedase cónyuge sobreviviente, o cuando el cónyuge sobreviviente con derecho a pensión de viudedad falleciese estando en el disfrute de la misma, la pensión correspondiente a los nietos o hermanos se incrementará en la forma prevista en el número 2 del artículo 17. Si en el indicado momento no quedase cónyuge sobreviviente, ni hijos, nietos o hermanos con derecho a pensión, el porcentaje para determinar la pensión de los ascendientes se incrementará, en igual forma que en el anterior supuesto, distribuyéndose el incremento por partes iguales entre todos los ascendientes, si hubiera más de uno con derecho a pensión.»
> — `supervivencia-reglas#familiares-incremento-sin-viudo` · art. 23.2 Orden de 13/02/1967 · <https://www.boe.es/buscar/act.php?id=BOE-A-1967-2876>

**Lectura `supervivencia.reduccionViudedad70`** — Si la reducción de la pensión de viudedad con cargas familiares por superar el límite de rentas puede dejarla por debajo del porcentaje general.

- Valor por defecto actual: `no-inferior-52`. Alternativas: `sin-suelo`.
- Por defecto («no-inferior-52»): la reducción del 70 % por el límite de rendimientos no baja la pensión del 52 %. Alternativa («sin-suelo»): la pensión puede quedar por debajo del 52 %.
- Qué cambia en el código: una línea. Para adoptar la alternativa, en `src/engine/config/lecturas-por-defecto.json` se pone el `valor` de la entrada `supervivencia.reduccionViudedad70` en una de las alternativas (con `estado` «decidida» y la fecha) y se anota en `docs/DECISIONES_ACTUARIALES.md`. La rama del motor que cambia está en `src/engine/supervivencia/calculo.ts:424`; no hay más cambios. Quien use el motor puede elegirla sin tocar el fichero con `lecturas['supervivencia.reduccionViudedad70']` en la configuración del motor.

| Caso                                                       | Magnitud       | Por defecto | Alternativa | Variación |
| ---------------------------------------------------------- | -------------- | ----------: | ----------: | --------: |
| cargas familiares, rentas propias 9.000 €, unidad 12.000 € | viudedad €/mes |      891,43 |      740,97 |  -16,88 % |
| rentas propias 7.000 €, unidad 12.000 €                    | viudedad €/mes |      891,43 |      883,83 |   -0,85 % |
| rentas propias 10.000 €, unidad 14.000 €                   | viudedad €/mes |      891,43 |      669,54 |  -24,89 % |

**Lectura `supervivencia.comparacionCompensatoria`** — Cómo se compara la pensión de viudedad de una persona divorciada con su pensión compensatoria: en importes anuales o mensuales.

- Valor por defecto actual: `anual`. Alternativas: `mensual`.
- Por defecto («anual»): la viudedad del excónyuge se compara con la compensatoria en cómputo anual (14 pagas). Alternativa («mensual»): se comparan importes mensuales (entre 12).
- Qué cambia en el código: una línea. Para adoptar la alternativa, en `src/engine/config/lecturas-por-defecto.json` se pone el `valor` de la entrada `supervivencia.comparacionCompensatoria` en una de las alternativas (con `estado` «decidida» y la fecha) y se anota en `docs/DECISIONES_ACTUARIALES.md`. La rama del motor que cambia está en `src/engine/supervivencia/calculo.ts:568`; no hay más cambios. Quien use el motor puede elegirla sin tocar el fichero con `lecturas['supervivencia.comparacionCompensatoria']` en la configuración del motor.

| Caso                                       | Magnitud       | Por defecto | Alternativa | Variación |
| ------------------------------------------ | -------------- | ----------: | ----------: | --------: |
| excónyuge con compensatoria de 6.000 €/año | viudedad €/mes |      428,57 |      500,00 |   16,67 % |
| compensatoria de 4.500 €/año               | viudedad €/mes |      321,43 |      375,00 |   16,67 % |
| compensatoria de 9.000 €/año               | viudedad €/mes |      642,86 |      750,00 |   16,67 % |

**Lectura `supervivencia.incrementoFamiliares`** — Si los familiares reciben el incremento del porcentaje de viudedad cuando no queda cónyuge superviviente.

- Valor por defecto actual: `porcentaje-viudedad`. Alternativas: `sin-incremento`.
- Por defecto («porcentaje-viudedad»): sin cónyuge superviviente, el incremento del favor de familiares es el porcentaje de la viudedad. Alternativa («sin-incremento»): no hay incremento.
- Qué cambia en el código: una línea. Para adoptar la alternativa, en `src/engine/config/lecturas-por-defecto.json` se pone el `valor` de la entrada `supervivencia.incrementoFamiliares` en una de las alternativas (con `estado` «decidida» y la fecha) y se anota en `docs/DECISIONES_ACTUARIALES.md`. La rama del motor que cambia está en `src/engine/supervivencia/calculo.ts:874`; no hay más cambios. Quien use el motor puede elegirla sin tocar el fichero con `lecturas['supervivencia.incrementoFamiliares']` en la configuración del motor.

| Caso                                         | Magnitud                                        | Por defecto | Alternativa | Variación |
| -------------------------------------------- | ----------------------------------------------- | ----------: | ----------: | --------: |
| un nieto huérfano, sin viudo ni huérfanos    | favor de familiares €/mes (primer beneficiario) |     1234,29 |      342,86 |  -72,22 % |
| dos nietos huérfanos, sin viudo ni huérfanos | favor de familiares €/mes (primer beneficiario) |      788,57 |      342,86 |  -56,52 % |
| un hermano huérfano, sin viudo ni huérfanos  | favor de familiares €/mes (primer beneficiario) |     1234,29 |      342,86 |  -72,22 % |

### Ficha 23: Base reguladora de la incapacidad permanente (orden 5)

Pregunta: `param-incapacidad-permanente-reglas` (docs/REVISION_ACTUARIAL.md, punto 23).

**Texto de la norma** (cita literal de `/data`; la fuente y el artículo están en cada dato):

> «La base reguladora de las pensiones de incapacidad permanente, derivadas de accidente no laboral, será el cociente que resulte de dividir por 28 la suma de las bases de cotización del interesado durante un período ininterrumpido de 24 meses, elegido por el beneficiario dentro de los siete años inmediatamente anteriores a la fecha del hecho causante de la pensión.»
> — `incapacidad-permanente-reglas#br-anl-meses` · art. 7.1 Decreto 1646/1972 (redacción del RD 1795/2003, vigente desde el 01/01/2004) · <https://www.boe.es/buscar/act.php?id=BOE-A-1972-944>

> «elegido por el beneficiario dentro de los siete años inmediatamente anteriores a la fecha del hecho causante de la pensión»
> — `incapacidad-permanente-reglas#br-anl-ventana-meses` · art. 7.1 Decreto 1646/1972 · <https://www.boe.es/buscar/act.php?id=BOE-A-1972-944>

**Lectura `incapacidad.lagunasAccidenteNoLaboral`** — En el accidente no laboral, qué se hace con los meses sin cotizar dentro del periodo elegido: contarlos como cero o rellenarlos con la base mínima.

- Valor por defecto actual: `integrar`. Alternativas: `sin-integrar`.
- Por defecto («integrar», provisional desde la Fase 2-E): los meses sin cotizar dentro del periodo de 24 meses elegido se rellenan con la base mínima. Alternativa («sin-integrar»): cuentan como cero.
- Qué cambia en el código: una línea. Para adoptar la alternativa, en `src/engine/config/lecturas-por-defecto.json` se pone el `valor` de la entrada `incapacidad.lagunasAccidenteNoLaboral` en una de las alternativas (con `estado` «decidida» y la fecha) y se anota en `docs/DECISIONES_ACTUARIALES.md`. La rama del motor que cambia está en `src/engine/incapacidad/calculo.ts:483`; no hay más cambios. Quien use el motor puede elegirla sin tocar el fichero con `lecturas['incapacidad.lagunasAccidenteNoLaboral']` en la configuración del motor.

| Caso                                                                                                        | Magnitud                                                        | Por defecto | Alternativa | Variación |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------: | ----------: | --------: |
| accidente no laboral, incapacidad total, base 1.500 €, 6 meses sin cotizar dentro de los 24 elegidos, 2026  | pensión de incapacidad total €/mes (sin complementos a mínimos) |      693,14 |      530,36 |  -23,49 % |
| accidente no laboral, incapacidad total, base 1.500 €, 3 meses sin cotizar dentro de los 24 elegidos, 2026  | pensión de incapacidad total €/mes (sin complementos a mínimos) |      700,14 |      618,75 |  -11,63 % |
| accidente no laboral, incapacidad total, base 1.500 €, 12 meses sin cotizar dentro de los 24 elegidos, 2026 | pensión de incapacidad total €/mes (sin complementos a mínimos) |      679,14 |      353,57 |  -47,94 % |

Otras lecturas de la misma pregunta: `incapacidad.edadFiccion` (cerrada por evidencia, 0,00 % en todas las combinaciones probadas); `incapacidad.computoFiccion` (grupo B, −1,31 %); `incapacidad.divisorPeriodoCorto` (grupo C, −0,01 %).

### Ficha 21: Incrementos de la pensión máxima inicial de 2051 a 2065 (DT 39.ª.4 TRLGSS) (orden 6)

Pregunta: `param-pension-maxima-incremento-2051-2065` (docs/REVISION_ACTUARIAL.md, punto 21).

**Texto de la norma** (cita literal de `/data`; la fuente y el artículo están en cada dato):

> «las sucesivas leyes de presupuestos generales del Estado, comenzando con la correspondiente al año 2025 y finalizando con la del año 2050, aplicarán a la cuantía máxima establecida en el año anterior el porcentaje previsto en el artículo 58.2 más un incremento adicional de 0,115 puntos porcentuales acumulativos cada año hasta 2050»
> — `pension-maxima-incremento-futuro#2050` · DT 39.ª.1 TRLGSS (art. único.39 del RDL 2/2023); art. 57 TRLGSS (en vigor el 01/01/2025) · <https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724>

> «En 2065, se valorará en el marco del diálogo social la conveniencia de mantener el proceso de convergencia hasta alcanzar un incremento total de 30 puntos porcentuales»
> — `pension-maxima-incremento-2051-2065#2065-convergencia-total` · DT 39.ª.4 TRLGSS · <https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724>

**Lectura `jubilacion.maximaDesde2051`** — Cómo se lee la tabla de incrementos de la pensión máxima de los últimos años del calendario legal: como incremento acumulado total o como incremento anual literal.

- Valor por defecto actual: `incremento-acumulado`. Alternativas: `incremento-anual-literal`.
- Por defecto («incremento-acumulado»): la pensión máxima crece cada año la revalorización más la diferencia entre el incremento acumulado de ese año y el del anterior. Alternativa («incremento-anual-literal»): se suma a la revalorización el valor de la tabla de ese año.
- Qué cambia en el código: una línea. Para adoptar la alternativa, en `src/engine/config/lecturas-por-defecto.json` se pone el `valor` de la entrada `jubilacion.maximaDesde2051` en una de las alternativas (con `estado` «decidida» y la fecha) y se anota en `docs/DECISIONES_ACTUARIALES.md`. La rama del motor que cambia está en `src/engine/jubilacion/contexto.ts:261`; no hay más cambios. Quien use el motor puede elegirla sin tocar el fichero con `lecturas['jubilacion.maximaDesde2051']` en la configuración del motor.

| Caso                                             | Magnitud                                                          | Por defecto | Alternativa | Variación |
| ------------------------------------------------ | ----------------------------------------------------------------- | ----------: | ----------: | --------: |
| topado por la pensión máxima, jubilación en 2052 | pensión de jubilación €/mes por paga (sin complementos a mínimos) |     5810,34 |     6167,60 |    6,15 % |
| topado, 2055                                     | pensión de jubilación €/mes por paga (sin complementos a mínimos) |     6279,06 |     7512,96 |   19,65 % |
| topado, 2060                                     | pensión de jubilación €/mes por paga (sin complementos a mínimos) |     7307,15 |   10.119,53 |   38,49 % |

### Ficha 30: Límite conjunto de muerte y supervivencia (orden 7)

Pregunta: `param-supervivencia-reglas-limites` (docs/REVISION_ACTUARIAL.md, punto 30).

**Texto de la norma** (cita literal de `/data`; la fuente y el artículo están en cada dato):

> «En todo caso, la suma de las pensiones de viudedad y de orfandad no podrá exceder de la cuantía de la base reguladora sobre la que se hayan determinado dichas pensiones.»
> — `supervivencia-reglas#limite-viudedad-orfandad-orden-1967` · art. 18.1 Orden de 13/02/1967 · <https://www.boe.es/buscar/act.php?id=BOE-A-1967-2876>

> «La suma de las cuantías de las pensiones por muerte y supervivencia no podrá exceder del importe de la base reguladora que corresponda»
> — `supervivencia-reglas#limite-conjunto-pct-br` · art. 229 TRLGSS.1 · <https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724>

> «el límite establecido podrá ser rebasado en caso de concurrencia de varias pensiones de orfandad con una pensión de viudedad cuando el porcentaje a aplicar a la correspondiente base reguladora para el cálculo de esta última sea superior al 52 por ciento»
> — `supervivencia-reglas#limite-excepcion-viudedad-umbral-pct` · art. 229 TRLGSS.3 · <https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724>

**Lectura `supervivencia.reduccionLimiteConjunto`** — Qué pensiones se reducen cuando la suma de viudedad y orfandad supera la base reguladora: solo las de orfandad o todas en proporción.

- Valor por defecto actual: `orfandad`. Alternativas: `proporcional`.
- Por defecto («orfandad»): al superar el límite conjunto se reducen las orfandades y se mantiene la viudedad. Alternativa («proporcional»): se reducen todas las pensiones en proporción.
- Qué cambia en el código: una línea. Para adoptar la alternativa, en `src/engine/config/lecturas-por-defecto.json` se pone el `valor` de la entrada `supervivencia.reduccionLimiteConjunto` en una de las alternativas (con `estado` «decidida» y la fecha) y se anota en `docs/DECISIONES_ACTUARIALES.md`. La rama del motor que cambia está en `src/engine/supervivencia/calculo.ts:928`; no hay más cambios. Quien use el motor puede elegirla sin tocar el fichero con `lecturas['supervivencia.reduccionLimiteConjunto']` en la configuración del motor.

| Caso                                 | Magnitud       | Por defecto | Alternativa | Variación |
| ------------------------------------ | -------------- | ----------: | ----------: | --------: |
| viudedad del 52 % y tres huérfanos   | viudedad €/mes |      891,43 |      795,92 |  -10,71 % |
| viudedad del 52 % y cuatro huérfanos | viudedad €/mes |      891,43 |      675,32 |  -24,24 % |
| viudedad del 52 % y cinco huérfanos  | viudedad €/mes |      891,43 |      586,47 |  -34,21 % |

### Ficha 4: Integración de lagunas de cotización en el cálculo de la base reguladora de jubilación (por versión) (orden 8)

Pregunta: `param-lagunas-integracion` (docs/REVISION_ACTUARIAL.md, punto 4).

**Texto de la norma** (cita literal de `/data`; la fuente y el artículo están en cada dato):

> «las primeras cuarenta y ocho mensualidades se integrarán con la base mínima de cotización del Régimen General que corresponda al mes respectivo y el resto de las mensualidades con el 50 por ciento de dicha base mínima»
> — `lagunas-integracion#2026-tramo1-meses` · art. 209.1.b TRLGSS (art. único.23 RDL 2/2023), en vigor desde 01/01/2026 · <https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724>

**Lectura `jubilacion.lagunasAnterioresAlPrimerAlta`** — Qué se hace con los meses sin cotización anteriores al primer alta dentro del periodo de cálculo: rellenarlos o ignorarlos.

- Valor por defecto actual: `integrar`. Alternativas: `ignorar`.
- Por defecto («integrar»): los meses de la ventana anteriores al primer alta se cuentan como laguna y se rellenan con la base mínima (100 % las primeras 48 mensualidades y 50 % el resto). Alternativa («ignorar»): esos meses no se cuentan.
- Qué cambia en el código: una línea. Para adoptar la alternativa, en `src/engine/config/lecturas-por-defecto.json` se pone el `valor` de la entrada `jubilacion.lagunasAnterioresAlPrimerAlta` en una de las alternativas (con `estado` «decidida» y la fecha) y se anota en `docs/DECISIONES_ACTUARIALES.md`. La rama del motor que cambia está en `src/engine/comun/base-reguladora.ts:72`; no hay más cambios. Quien use el motor puede elegirla sin tocar el fichero con `lecturas['jubilacion.lagunasAnterioresAlPrimerAlta']` en la configuración del motor.

| Caso                                              | Magnitud                                                          | Por defecto | Alternativa | Variación |
| ------------------------------------------------- | ----------------------------------------------------------------- | ----------: | ----------: | --------: |
| 15 años cotizados (2015-2029), base 2.500 €, 2030 | pensión de jubilación €/mes por paga (sin complementos a mínimos) |      864,84 |      737,79 |  -14,69 % |
| 18 años cotizados, base 2.500 €, 2030             | pensión de jubilación €/mes por paga (sin complementos a mínimos) |     1148,46 |     1032,02 |  -10,14 % |
| 22 años cotizados, base 2.500 €, 2030             | pensión de jubilación €/mes por paga (sin complementos a mínimos) |     1600,82 |     1516,77 |   -5,25 % |

Otras lecturas de la misma pregunta: `jubilacion.referenciaBaseMinimaLagunas` (grupo C, +0,09 %).

## Grupo B: decidir antes de publicar (ordenadas por impacto)

| Pregunta                                              | Efecto                              | Motivo                                                                                                                                                                            | Lecturas                                                               |
| ----------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 9. `param-jubilacion-coeficientes-involuntaria`       | hasta 3,53 % (cota por los cuadros) | Un mes de redondeo: 0,67 %; cambiar de tramo: 1,16 % a 3,53 %.                                                                                                                    | —                                                                      |
| 6. `param-opcion-25-anos-ventana`                     | −1,63 %                             | Solo el 31/12/2040; el resto de la ventana coincide con la web (cerrado).                                                                                                         | `jubilacion.opcion25EnUltimoDia2040`                                   |
| 11. `param-jubilacion-coeficientes-voluntaria-limite` | no medible                          | La salvaguarda de la DT 34.ª.1 y 2022-2023 no están en `/data` (docs/PENDIENTE_DATOS.md).                                                                                         | —                                                                      |
| 12. `param-jubilacion-demora-reglas`                  | +1,92 %                             | Fracción de la demora; las otras tres lecturas no tienen opción en el motor y no se han medido.                                                                                   | `jubilacion.fraccionDemora`                                            |
| 13. `param-lagunas-integracion-brecha-genero`         | −0,7 % a −1,9 %                     | Integración reforzada de la DT 41.ª activada o no (opción del motor, 60 a 84 meses de laguna).                                                                                    | —                                                                      |
| 14. `param-carrera-jubilacion-65`                     | no medido                           | Las cifras coinciden con la web (cerrado); la lectura 2 (carrera proyectada en las anticipadas) no tiene opción en el motor.                                                      | —                                                                      |
| 15. `param-pension-minima-regla`                      | no medible                          | Falta el umbral de pobreza de la ECV (docs/PENDIENTE_DATOS.md): la DA 53.ª de 2027 no se aplica.                                                                                  | —                                                                      |
| 22. `param-base-minima-rg`                            | no medible                          | La base mínima de 2021 (enero-agosto) es un valor deducido y falta la regla posterior a 2026; la base de cada año de /data coincide con el SMI de Eurostat.                       | —                                                                      |
| 24. `param-incapacidad-permanente-reglas-carencia`    | −1,3 % / −1,45 %                    | Redondeo de la edad y días de la parcial; deciden el derecho en el límite.                                                                                                        | `incapacidad.redondeoEdadCarencia`, `incapacidad.diasCotizadosParcial` |
| 25. `param-incapacidad-permanente-reglas-cuantia`     | no medido                           | La lectura (a) (50 % desde los 67 años sin derecho a jubilación) consta en la web de la Seguridad Social (cerrada); (b)-(d) no tienen opción; (e) depende del Reglamento de 1956. | —                                                                      |

## Grupo C: bajo impacto (ordenadas por impacto)

| Pregunta                                                                                              | Efecto                              | Motivo                                                                                                 | Lecturas                                                              |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| 10. `param-jubilacion-coeficientes-voluntaria`                                                        | hasta 0,79 % (cota por los cuadros) | Un mes: 0,33 %; cambiar de tramo: 0,26 % a 0,79 %.                                                     | —                                                                     |
| 5. `param-actualizacion-bases`                                                                        | −0,95 %                             | Interpolación del IPC mensual.                                                                         | `jubilacion.interpolacionIPC`, `jubilacion.actualizacionFactorMinimo` |
| 20. `param-mei-destino`                                                                               | solo documental                     | Contraste de la recaudación con las dotaciones del Fondo de Reserva.                                   | —                                                                     |
| 31. `sistema-relacion-afiliados-pensiones-afiliados-diciembre-por-pensionista`                        | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 32. `sistema-relacion-afiliados-pensiones-alternativa-1-afiliados-por-pension-alternativa-1`          | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 33. `sistema-pensionistas-pensiones-historico-pensionistas`                                           | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 34. `sistema-deficit-presupuestario-seguridad-social-saldo-presupuestario-no-financiero`              | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 35. `sistema-deficit-sec-fondos-seguridad-social-b9-mio-eur`                                          | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 36. `sistema-fondo-reserva-series-valor-fin-ano`                                                      | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 37. `macro-salario-medio-definiciones-eaes-ambos`                                                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 38. `macro-salario-medio-definiciones-etcl-coste-salarial-total`                                      | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 39. `macro-salario-medio-definiciones-cn-remuneracion-por-asalariado-puesto`                          | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 40. `macro-salario-medio-definiciones-base-media-cotizacion-rg-ambos`                                 | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 41. `internacional-ocde-espana-gprr100-hombres-z-m-pt-earn-g-pre-ret-inc-2024`                        | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 42. `internacional-contraste-espana-pension-altas-sobre-salario-eaes`                                 | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 43. `internacional-contraste-espana-gasto-pensiones-contributivas-sobre-pib`                          | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 44. `internacional-sistema-esp-9`                                                                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 45. `mito-hucha-vaciada`                                                                              | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 46. `mito-pensiones-con-impuestos`                                                                    | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 47. `mito-menos-cotizantes-por-pensionista`                                                           | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 48. `mito-jubilados-cobran-mas-de-lo-cotizado`                                                        | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 49. `mito-sistema-en-deficit`                                                                         | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 50. `mito-edad-real-de-jubilacion-65`                                                                 | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 51. `mito-pensiones-publicas-insostenibles`                                                           | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 52. `mito-mayores-en-pobreza`                                                                         | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 53. `mito-pensiones-sustituyen-casi-todo-el-salario`                                                  | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 54. `mito-espana-gasta-mas-que-europa`                                                                | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 55. `mito-pensiones-siempre-con-el-ipc`                                                               | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 56. `mito-sin-nacimientos-no-hay-pensiones`                                                           | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 57. `demografia-triangulacion-mortalidad-supervivencia-publicada-sobre-qx-hombres-85-2010-2020`       | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 58. `demografia-triangulacion-mortalidad-supervivencia-publicada-sobre-qx-lexis-hombres-85-2010-2020` | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 59. `demografia-triangulacion-mortalidad-factor-real-sobre-qx-mujeres-85-2010-2019`                   | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 60. `demografia-triangulacion-mortalidad-muertes-implicitas-pensiones-jubilacion-lexis`               | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 61. `demografia-triangulacion-mortalidad-ine-tablas-recalculo-censo-2021`                             | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 62. `internacional-ocde-supuestos-reposicion-ocde-pag-entrada-mercado-laboral-22`                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 63. `internacional-ocde-supuestos-reposicion-ocde-pag-2025-crecimiento-real-salarios-base`            | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 64. `internacional-ocde-supuestos-reposicion-ocde-pag-2025-politica-fiscal-constante`                 | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |
| 65. `internacional-ocde-supuestos-reposicion-ocde-pag-2025-sensibilidad-espana-valorizacion-precios`  | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo. | —                                                                     |

## Cerradas por evidencia: propuesta cerrada, pendiente de visto bueno de Sergio

| Pregunta                                     | Lectura o dato             | Evidencia                                                                                                                                      |
| -------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. `param-escala-porcentajes-jubilacion`     | cifras del dato            | La escala de 2026 y 2027 coincide con la web de la Seguridad Social (contraste de docs/AUDITORIA_DATOS.md) y con `cotizacion-para-100` (test). |
| 2. `param-divisor-base-reguladora`           | cifras del dato            | Divisores de 2026 a 2037 coinciden con la web de la Seguridad Social; el test comprueba divisor = bases × 14/12.                               |
| 3. `param-periodo-calculo-base-reguladora`   | cifras del dato            | La web de la Seguridad Social usa las bases de mayor importe dentro de la ventana y coincide en los 12 años.                                   |
| 7. `param-opcion-25-anos-divisor`            | cifras del dato            | Divisores y ventanas de 2026 a 2043 coinciden con la web de la Seguridad Social.                                                               |
| 8. `param-escala-jubilacion-tramos`          | cifras del dato            | Porcentajes por mes de 2026 y 2027 coinciden con la web de la Seguridad Social.                                                                |
| 16. `param-revalorizacion-regla`             | cifras del dato            | El porcentaje de 2022 a 2026 coincide con la media de las variaciones del IPC del INE de diciembre a noviembre.                                |
| 17. `param-base-maxima-incremento-futuro`    | `jubilacion.baseMaxima`    | Lectura compuesta confirmada por la base máxima oficial de 2025 y 2026.                                                                        |
| 18. `param-pension-maxima-incremento-futuro` | `jubilacion.pensionMaxima` | Incremento constante confirmado por la pensión máxima oficial de 2026.                                                                         |
| 19. `param-mei-tipo-total`                   | cifras del dato            | Tipos y reparto de 2023 a 2026 coinciden con las órdenes de cotización y la web; empresa + trabajador = total (test).                          |

**Lecturas del registro cerradas** (con la evidencia medida por código o la fuente citada; el valor por defecto actual coincide con la propuesta en todas):

- `jubilacion.baseMaxima` (por defecto `compuesto`): Las bases máximas oficiales de 2025 y 2026 coinciden con la lectura compuesta y no con la alternativa (evidencia por código). 2025: oficial 4909,50; compuesto 4909,32 (diferencia 0,18); sobre la cifra de 2023 4906,62 (diferencia 2,88). 2026: oficial 5101,20; compuesto 5100,97 (diferencia 0,23); sobre la cifra de 2023 5096,00 (diferencia 5,20). Efecto de la alternativa en el informe: −0,47 % (solo con la base topada).
- `jubilacion.pensionMaxima` (por defecto `compuesto`): La pensión máxima oficial de 2026 coincide con el incremento constante y no con el creciente (evidencia por código). 2025: oficial 3267,60; incremento constante 3267,59 (diferencia 0,01); incremento creciente 3267,59 (diferencia 0,01). 2026: oficial 3359,60; incremento constante 3359,58 (diferencia 0,02); incremento creciente 3363,34 (diferencia 3,74). Efecto de la alternativa en el informe: +14,25 % (topado, 2040).
- `incapacidad.edadFiccion` (por defecto `carrera-proyectada`): Las dos lecturas dan el mismo resultado en todo el dominio soportado (comprobación por código). 675 combinaciones (hecho causante de 2022 a 2050 cada dos años, edades de 40 a 66, carreras de 10 a 38 años, incapacidad absoluta por enfermedad común): las dos lecturas dan un resultado distinto en 0. Efecto de la alternativa en el informe: 0,00 % en todas las combinaciones probadas.
- `no-contributivas.baseRentasCompatibles` (por defecto `cuantia-integra`): La guía del IMSERSO de 2026 aplica el 35 % sobre el importe anual de la pensión, también en unidad económica. Efecto de la alternativa en el informe: −7,04 %.
- `no-contributivas.limiteTrabajo` (por defecto `cuantia-integra`): La guía del IMSERSO suma el IPREM y la cuantía íntegra y cifra el límite. Efecto de la alternativa en el informe: −40,79 %.
- `no-contributivas.limiteConTerceraPersona` (por defecto `con-complemento`): La guía del IMSERSO de 2026 publica los límites con el complemento de tercera persona. Efecto de la alternativa en el informe: −100 % (sin derecho).

Todas las evidencias de «cerrada» son de los datos oficiales descargados en esta sesión (BOE, web de la Seguridad Social, INE, IMSERSO; `docs/AUDITORIA_DATOS.md`) o de una comprobación sobre el propio motor. Una guía del IMSERSO no es norma: si se prefiere el texto de la ley, las lecturas de PNC (a), (b) y (d) pasarían al grupo A con los efectos del informe.

## Lecturas del registro por grupo

| Lectura                                              | Por defecto                | Grupo                 | Efecto                                                          | Motivo                                                                                                                                                                  |
| ---------------------------------------------------- | -------------------------- | --------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `jubilacion.lagunasAnterioresAlPrimerAlta`           | `integrar`                 | A                     | -14,69 % / -10,14 % / -5,25 %                                   | Más del 5 % en carreras cortas.                                                                                                                                         |
| `jubilacion.maximaDesde2051`                         | `incremento-acumulado`     | A                     | 6,15 % / 19,65 % / 38,49 %                                      | Más del 5 % para todo quien se jubile topado desde 2051.                                                                                                                |
| `incapacidad.lagunasAccidenteNoLaboral`              | `integrar`                 | A                     | -23,49 % / -11,63 % / -47,94 %                                  | Más del 5 % con meses sin cotizar dentro del periodo elegido.                                                                                                           |
| `supervivencia.carenciaOrfandad`                     | `sin-carencia`             | A                     | -100,00 % / -100,00 % / -100,00 %                               | Todo o nada para la orfandad con causante en alta y menos de 500 días.                                                                                                  |
| `supervivencia.carenciaFamiliaresAccidenteNoLaboral` | `exigir`                   | A                     | de 0 a 617,14 / de 0 a 360,00 / de 0 a 720,00                   | Todo o nada para el favor de familiares tras accidente no laboral.                                                                                                      |
| `supervivencia.reduccionViudedad70`                  | `no-inferior-52`           | A                     | -16,88 % / -0,85 % / -24,89 %                                   | Más del 5 % en la viudedad del 70 % con rentas cercanas al límite.                                                                                                      |
| `supervivencia.comparacionCompensatoria`             | `anual`                    | A                     | 16,67 % / 16,67 % / 16,67 %                                     | +16,7 % en toda viudedad de excónyuge limitada por la compensatoria.                                                                                                    |
| `supervivencia.incrementoFamiliares`                 | `porcentaje-viudedad`      | A                     | -72,22 % / -56,52 % / -72,22 %                                  | Entre −56 % y −72 % en el favor de familiares sin viudo ni huérfanos.                                                                                                   |
| `supervivencia.reduccionLimiteConjunto`              | `orfandad`                 | A                     | -10,71 % / -24,24 % / -34,21 %                                  | Más del 10 % en la viudedad cuando se supera el límite conjunto.                                                                                                        |
| `no-contributivas.rentasConTrabajoEnCuatroAnios`     | `sustituye-364-2`          | A                     | -100,00 % / 0,00 % / -100,00 %                                  | Todo o nada en la pensión durante los cuatro primeros años de actividad.                                                                                                |
| `mei.baseMEI`                                        | `base-cotizacion`          | A                     | 17,62 % / 56,83 % / 135,24 %                                    | Más del 17 % de la cuota del MEI con retribución por encima de la base máxima.                                                                                          |
| `jubilacion.opcion25EnUltimoDia2040`                 | `incluida`                 | B                     | −1,63 % (solo el 31/12/2040)                                    | Efecto menor pero real; afecta a un único día de jubilación.                                                                                                            |
| `jubilacion.fraccionDemora`                          | `desde-segundo-anio`       | B                     | +1,92 %                                                         | Efecto menor pero real en la demora con fracción de año.                                                                                                                |
| `incapacidad.computoFiccion`                         | `meses`                    | B                     | −1,31 %                                                         | Efecto menor pero real (hasta 11 meses menos de escala).                                                                                                                |
| `incapacidad.redondeoEdadCarencia`                   | `sin-redondeo`             | B                     | −1,32 % de los meses exigidos                                   | Un mes de periodo exigido; puede decidir el derecho en el límite.                                                                                                       |
| `incapacidad.diasCotizadosParcial`                   | `naturales`                | B                     | −1,45 % de los días acreditados                                 | Solo decide el derecho cerca de los 1.800 días.                                                                                                                         |
| `supervivencia.ventanaBaseReguladora`                | `anterior-al-mes-previo`   | B                     | +1,23 %                                                         | Solo si el mes previo al hecho causante es de los mejores.                                                                                                              |
| `supervivencia.diasCotizados`                        | `naturales`                | B                     | −1,16 % de los días acreditados                                 | Solo decide el derecho cerca de los 500 días.                                                                                                                           |
| `jubilacion.referenciaBaseMinimaLagunas`             | `mes-de-la-laguna`         | C                     | +0,09 %                                                         | Diferencia inferior al 1 % con 40 meses de laguna.                                                                                                                      |
| `jubilacion.interpolacionIPC`                        | `mensual-ine`              | C                     | −0,86 % (escalón anual); +0,09 % (medias anuales interpoladas)  | Resuelta con datos en la Fase 2-D: el motor usa por defecto el índice mensual real del INE (mejora de datos, no una lectura legal).                                     |
| `jubilacion.actualizacionFactorMinimo`               | `suelo-1`                  | C                     | hasta −0,014 % en los casos de Sergio; 0,00 % en un caso típico | Inferior al 1 %; los nueve informes del autocálculo nunca muestran un factor menor que uno (Fase 2-D). Provisional desde la Fase 2-E (valor por defecto: suelo de uno). |
| `incapacidad.divisorPeriodoCorto`                    | `coeficiente-rd-1799-1985` | C                     | −0,01 %                                                         | Inferior al 1 %.                                                                                                                                                        |
| `jubilacion.baseMaxima`                              | `compuesto`                | cerrada por evidencia | −0,47 % (solo con la base topada)                               | Las bases máximas oficiales de 2025 y 2026 coinciden con la lectura compuesta y no con la alternativa (evidencia por código).                                           |
| `jubilacion.pensionMaxima`                           | `compuesto`                | cerrada por evidencia | +14,25 % (topado, 2040)                                         | La pensión máxima oficial de 2026 coincide con el incremento constante y no con el creciente (evidencia por código).                                                    |
| `incapacidad.edadFiccion`                            | `carrera-proyectada`       | cerrada por evidencia | 0,00 % en todas las combinaciones probadas                      | Las dos lecturas dan el mismo resultado en todo el dominio soportado (comprobación por código).                                                                         |
| `no-contributivas.baseRentasCompatibles`             | `cuantia-integra`          | cerrada por evidencia | −7,04 %                                                         | La guía del IMSERSO de 2026 aplica el 35 % sobre el importe anual de la pensión, también en unidad económica.                                                           |
| `no-contributivas.limiteTrabajo`                     | `cuantia-integra`          | cerrada por evidencia | −40,79 %                                                        | La guía del IMSERSO suma el IPREM y la cuantía íntegra y cifra el límite.                                                                                               |
| `no-contributivas.limiteConTerceraPersona`           | `con-complemento`          | cerrada por evidencia | −100 % (sin derecho)                                            | La guía del IMSERSO de 2026 publica los límites con el complemento de tercera persona.                                                                                  |

## Todas las preguntas de `docs/REVISION_ACTUARIAL.md`

|  Nº | Pregunta                                                                                          | Grupo                 | Efecto                              | Motivo                                                                                                                                                                            |
| --: | ------------------------------------------------------------------------------------------------- | --------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | `param-escala-porcentajes-jubilacion`                                                             | cerrada por evidencia | —                                   | La escala de 2026 y 2027 coincide con la web de la Seguridad Social (contraste de docs/AUDITORIA_DATOS.md) y con `cotizacion-para-100` (test).                                    |
|   2 | `param-divisor-base-reguladora`                                                                   | cerrada por evidencia | —                                   | Divisores de 2026 a 2037 coinciden con la web de la Seguridad Social; el test comprueba divisor = bases × 14/12.                                                                  |
|   3 | `param-periodo-calculo-base-reguladora`                                                           | cerrada por evidencia | —                                   | La web de la Seguridad Social usa las bases de mayor importe dentro de la ventana y coincide en los 12 años.                                                                      |
|   4 | `param-lagunas-integracion`                                                                       | A                     | ver ficha                           | Lectura «lagunas anteriores a la primera alta» (−14,7 % en el caso del informe); la base mínima de la laguna es C.                                                                |
|   5 | `param-actualizacion-bases`                                                                       | C                     | −0,95 %                             | Interpolación del IPC mensual.                                                                                                                                                    |
|   6 | `param-opcion-25-anos-ventana`                                                                    | B                     | −1,63 %                             | Solo el 31/12/2040; el resto de la ventana coincide con la web (cerrado).                                                                                                         |
|   7 | `param-opcion-25-anos-divisor`                                                                    | cerrada por evidencia | —                                   | Divisores y ventanas de 2026 a 2043 coinciden con la web de la Seguridad Social.                                                                                                  |
|   8 | `param-escala-jubilacion-tramos`                                                                  | cerrada por evidencia | —                                   | Porcentajes por mes de 2026 y 2027 coinciden con la web de la Seguridad Social.                                                                                                   |
|   9 | `param-jubilacion-coeficientes-involuntaria`                                                      | B                     | hasta 3,53 % (cota por los cuadros) | Un mes de redondeo: 0,67 %; cambiar de tramo: 1,16 % a 3,53 %.                                                                                                                    |
|  10 | `param-jubilacion-coeficientes-voluntaria`                                                        | C                     | hasta 0,79 % (cota por los cuadros) | Un mes: 0,33 %; cambiar de tramo: 0,26 % a 0,79 %.                                                                                                                                |
|  11 | `param-jubilacion-coeficientes-voluntaria-limite`                                                 | B                     | no medible                          | La salvaguarda de la DT 34.ª.1 y 2022-2023 no están en `/data` (docs/PENDIENTE_DATOS.md).                                                                                         |
|  12 | `param-jubilacion-demora-reglas`                                                                  | B                     | +1,92 %                             | Fracción de la demora; las otras tres lecturas no tienen opción en el motor y no se han medido.                                                                                   |
|  13 | `param-lagunas-integracion-brecha-genero`                                                         | B                     | −0,7 % a −1,9 %                     | Integración reforzada de la DT 41.ª activada o no (opción del motor, 60 a 84 meses de laguna).                                                                                    |
|  14 | `param-carrera-jubilacion-65`                                                                     | B                     | no medido                           | Las cifras coinciden con la web (cerrado); la lectura 2 (carrera proyectada en las anticipadas) no tiene opción en el motor.                                                      |
|  15 | `param-pension-minima-regla`                                                                      | B                     | no medible                          | Falta el umbral de pobreza de la ECV (docs/PENDIENTE_DATOS.md): la DA 53.ª de 2027 no se aplica.                                                                                  |
|  16 | `param-revalorizacion-regla`                                                                      | cerrada por evidencia | —                                   | El porcentaje de 2022 a 2026 coincide con la media de las variaciones del IPC del INE de diciembre a noviembre.                                                                   |
|  17 | `param-base-maxima-incremento-futuro`                                                             | cerrada por evidencia | −0,47 %                             | Lectura compuesta confirmada por la base máxima oficial de 2025 y 2026.                                                                                                           |
|  18 | `param-pension-maxima-incremento-futuro`                                                          | cerrada por evidencia | +14,25 %                            | Incremento constante confirmado por la pensión máxima oficial de 2026.                                                                                                            |
|  19 | `param-mei-tipo-total`                                                                            | cerrada por evidencia | —                                   | Tipos y reparto de 2023 a 2026 coinciden con las órdenes de cotización y la web; empresa + trabajador = total (test).                                                             |
|  20 | `param-mei-destino`                                                                               | C                     | solo documental                     | Contraste de la recaudación con las dotaciones del Fondo de Reserva.                                                                                                              |
|  21 | `param-pension-maxima-incremento-2051-2065`                                                       | A                     | ver ficha                           | Incremento acumulado frente a anual literal: +6 % a +38 % en la máxima.                                                                                                           |
|  22 | `param-base-minima-rg`                                                                            | B                     | no medible                          | La base mínima de 2021 (enero-agosto) es un valor deducido y falta la regla posterior a 2026; la base de cada año de /data coincide con el SMI de Eurostat.                       |
|  23 | `param-incapacidad-permanente-reglas`                                                             | A                     | ver ficha                           | Lagunas del accidente no laboral (−12 % a −48 % al no integrarlas, frente al valor por defecto actual); edad de la ficción cerrada; cómputo B; divisor C.                         |
|  24 | `param-incapacidad-permanente-reglas-carencia`                                                    | B                     | −1,3 % / −1,45 %                    | Redondeo de la edad y días de la parcial; deciden el derecho en el límite.                                                                                                        |
|  25 | `param-incapacidad-permanente-reglas-cuantia`                                                     | B                     | no medido                           | La lectura (a) (50 % desde los 67 años sin derecho a jubilación) consta en la web de la Seguridad Social (cerrada); (b)-(d) no tienen opción; (e) depende del Reglamento de 1956. |
|  26 | `param-pnc-reglas`                                                                                | A                     | ver ficha                           | Rentas del trabajo en los cuatro primeros años (todo o nada); (a), (b) y (d) cerradas con la guía del IMSERSO.                                                                    |
|  27 | `param-mei-reglas`                                                                                | A                     | ver ficha                           | Base del MEI (+17,6 % a +135 % de la cuota).                                                                                                                                      |
|  28 | `param-supervivencia-reglas`                                                                      | A                     | ver ficha                           | Carencia de la orfandad y del favor de familiares (todo o nada); ventana y días B.                                                                                                |
|  29 | `param-supervivencia-reglas-cuantia`                                                              | A                     | ver ficha                           | Reducción del 70 %, compensatoria e incremento de familiares.                                                                                                                     |
|  30 | `param-supervivencia-reglas-limites`                                                              | A                     | ver ficha                           | Reducción por el límite conjunto (−10,7 % a −34,2 %).                                                                                                                             |
|  31 | `sistema-relacion-afiliados-pensiones-afiliados-diciembre-por-pensionista`                        | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  32 | `sistema-relacion-afiliados-pensiones-alternativa-1-afiliados-por-pension-alternativa-1`          | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  33 | `sistema-pensionistas-pensiones-historico-pensionistas`                                           | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  34 | `sistema-deficit-presupuestario-seguridad-social-saldo-presupuestario-no-financiero`              | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  35 | `sistema-deficit-sec-fondos-seguridad-social-b9-mio-eur`                                          | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  36 | `sistema-fondo-reserva-series-valor-fin-ano`                                                      | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  37 | `macro-salario-medio-definiciones-eaes-ambos`                                                     | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  38 | `macro-salario-medio-definiciones-etcl-coste-salarial-total`                                      | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  39 | `macro-salario-medio-definiciones-cn-remuneracion-por-asalariado-puesto`                          | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  40 | `macro-salario-medio-definiciones-base-media-cotizacion-rg-ambos`                                 | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  41 | `internacional-ocde-espana-gprr100-hombres-z-m-pt-earn-g-pre-ret-inc-2024`                        | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  42 | `internacional-contraste-espana-pension-altas-sobre-salario-eaes`                                 | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  43 | `internacional-contraste-espana-gasto-pensiones-contributivas-sobre-pib`                          | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  44 | `internacional-sistema-esp-9`                                                                     | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  45 | `mito-hucha-vaciada`                                                                              | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  46 | `mito-pensiones-con-impuestos`                                                                    | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  47 | `mito-menos-cotizantes-por-pensionista`                                                           | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  48 | `mito-jubilados-cobran-mas-de-lo-cotizado`                                                        | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  49 | `mito-sistema-en-deficit`                                                                         | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  50 | `mito-edad-real-de-jubilacion-65`                                                                 | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  51 | `mito-pensiones-publicas-insostenibles`                                                           | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  52 | `mito-mayores-en-pobreza`                                                                         | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  53 | `mito-pensiones-sustituyen-casi-todo-el-salario`                                                  | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  54 | `mito-espana-gasta-mas-que-europa`                                                                | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  55 | `mito-pensiones-siempre-con-el-ipc`                                                               | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  56 | `mito-sin-nacimientos-no-hay-pensiones`                                                           | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  57 | `demografia-triangulacion-mortalidad-supervivencia-publicada-sobre-qx-hombres-85-2010-2020`       | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  58 | `demografia-triangulacion-mortalidad-supervivencia-publicada-sobre-qx-lexis-hombres-85-2010-2020` | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  59 | `demografia-triangulacion-mortalidad-factor-real-sobre-qx-mujeres-85-2010-2019`                   | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  60 | `demografia-triangulacion-mortalidad-muertes-implicitas-pensiones-jubilacion-lexis`               | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  61 | `demografia-triangulacion-mortalidad-ine-tablas-recalculo-censo-2021`                             | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  62 | `internacional-ocde-supuestos-reposicion-ocde-pag-entrada-mercado-laboral-22`                     | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  63 | `internacional-ocde-supuestos-reposicion-ocde-pag-2025-crecimiento-real-salarios-base`            | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  64 | `internacional-ocde-supuestos-reposicion-ocde-pag-2025-politica-fiscal-constante`                 | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |
|  65 | `internacional-ocde-supuestos-reposicion-ocde-pag-2025-sensibilidad-espana-valorizacion-precios`  | C                     | solo documental                     | Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.                                                                            |

Las 35 preguntas no listadas arriba con motivo propio (definiciones de ratio, déficit, salario medio, comparativa internacional, afirmaciones circulantes, mortalidad y supuestos de la OCDE) son del grupo C: no cambian ningún resultado del motor y se deciden al usarlas en el modelo.

## Fase 2-D: evidencia de los informes del autocálculo (casos de Sergio)

Los ocho casos de `data-raw/casos-oro/casos-sergio.md` se generaron con el autocálculo de jubilación ordinaria de la Seguridad Social (informes del 13/11/2026). Este apartado resume lo que esos informes aportan a las preguntas del registro; no cambia ningún grupo ni decide nada.

- **Suelo del factor de actualización** (`jubilacion.actualizacionFactorMinimo`, pregunta `param-actualizacion-bases`, grupo C): los nueve informes del autocálculo nunca muestran un factor de actualización menor que 1,0000000; cuando el índice del mes de referencia es menor que el del mes de la base, el factor sale 1. Con septiembre de 2024 como mes de referencia (hechos causantes de noviembre de 2026) hay meses anteriores de 2024 con índice mayor. Sin suelo, el motor calcula un factor menor que uno en esos meses. Con `suelo-1` (por defecto desde la Fase 2-E, lectura provisional), la base reguladora de los casos que lo necesitan coincide con el informe al céntimo (dos casos pasan de −0,27 € y −0,11 € a +0,01 € y 0,00 €). El artículo 209 TRLGSS habla de actualizar «de acuerdo con la evolución del IPC» y no menciona ese suelo: el valor se apoya en el criterio de gestión observado en los informes. El efecto es de unos céntimos o decenas de céntimos al mes.
- **IPC mensual** (`jubilacion.interpolacionIPC`): el desfase medio del motor con respecto al autocálculo pasa de 9,18 € (0,56 %) con las medias anuales interpoladas a 1,06 € (0,12 %) con el índice mensual del INE; el desfase restante era el de un caso cuyo relleno de entrada no coincidía con lo que recibió el autocálculo, corregido en la Fase 3-A (`docs/DISCREPANCIAS.md`), con lo que los ocho casos coinciden (el mayor residuo, +0,013 € en `jub-ord-2026-carrera-20a`, es redondeo del autocálculo). No es una lectura legal: es el dato que usa el autocálculo.
- **Meses de 2001**: el INE no publica el índice de 2001 en la base vigente; los informes del autocálculo muestran el factor de cada mes. Con las variaciones anuales de 2002 que publica el INE, los casos con meses de 2001 coinciden al céntimo; con un único coeficiente (tasa mensual de enero de 2002) se separaban hasta 0,38 € (`docs/DECISIONES.md`, Fase 2-D). Pregunta para Sergio: confirmar con el factor de 2001 de los informes (caso_1, caso_2, caso_4, caso_5 y caso_6), que no están en el repositorio.
- **Regla general frente a opción de 25 años** (sin pregunta nueva): en `jub-ord-2026-bases-minimas-sin-minimos` el autocálculo repetido muestra las dos bases reguladoras (opción de 25 años, 889,35; regla general, 888,45) y elige la menor de las dos; con el relleno de base 1000 hasta 2001-05, el motor coincide con las dos cifras (corregido en la Fase 3-A; `docs/DISCREPANCIAS.md`).
