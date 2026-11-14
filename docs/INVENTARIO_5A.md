# Inventario de datos para la Fase 5-A

Fecha: 2026-11-14. Alcance: `data/sistema`, `data/macro`, `data/demografia` y `data/internacional`, sin descargas nuevas.
Todos los ficheros tienen `source.url`, `fetchedAt` y `confidence` (lo comprueba `npm run validate:data`). Las fechas de descarga son de 2026-11-11.

## 1. Ficheros que alimentan las tres páginas

Convención: «S» = serie en un JSON de `series`; «T» = tabla (CSV + JSON hermano). Los periodos son años salvo que se indique. «Confianza» es la del fichero; «media» indica dato derivado (cociente o diferencia calculada en la fase de datos).

### Cotizantes y pensionistas

| Fichero (serie o columnas)                                                                                                                 | Qué mide                                                          | Unidad           | Periodo                | Frecuencia   | Confianza     | Página y gráfico                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | ---------------- | ---------------------- | ------------ | ------------- | ------------------------------------------------------------------------------------- |
| `sistema/afiliacion-anual` (S: `diciembre-total-sistema`, `diciembre-general`, `diciembre-autonomos`, `media-anual-total-sistema`)         | Afiliados medios en alta de diciembre y media anual               | afiliados        | 2001-2025              | anual        | alta / media¹ | C1 afiliados por régimen; C3 índice base 100                                          |
| `sistema/pensionistas-pensiones-historico` (S: `pensionistas`, `pensiones`)                                                                | Personas con pensión contributiva y número de pensiones           | personas; pens.  | 2006-2025              | anual (dic.) | alta          | C2 pensiones y pensionistas; C3 índice base 100                                       |
| `sistema/pensiones-vigor-numero` (S: `{clase}-{sexo}`)                                                                                     | Pensiones en vigor a 1 de diciembre por clase y sexo              | pensiones        | 2008-2025              | anual        | alta          | C2b pensiones por clase; tabla de sexo                                                |
| `sistema/pensiones-vigor-pension-media` (S: `{clase}-{sexo}`)                                                                              | Pensión media mensual en vigor por clase y sexo                   | euros/mes        | 2008-2025              | anual        | alta          | C4 pensión media por clase                                                            |
| `parametros/ipc-indice-medio-anual`                                                                                                        | IPC medio anual (para euros constantes)                           | índice           | ver fichero            | anual        | alta          | C4 pensión media en euros constantes                                                  |
| `sistema/relacion-afiliados-pensiones` (S: cuatro definiciones)                                                                            | Afiliados por pensionista o por pensión (dic. o media anual)      | razón            | 2006-2025              | anual        | media¹        | C5 relación afiliados/pensiones                                                       |
| `sistema/relacion-afiliados-pensiones-alternativa-1` (S: `afiliados-por-pension-alternativa-1`, `afiliados-por-pensionista-alternativa-1`) | Quinta definición: afiliados último día de dic. / stock a 1 enero | razón            | 2008-2025; 2025        | anual        | media¹        | C5; el cociente por pensionista solo existe para 2025                                 |
| `sistema/pensiones-vigor-edad-clase-sexo` (T)                                                                                              | Pensiones y pensión media por grupo de edad, clase y sexo         | pensiones; €/mes | octubre de 2026 (foto) | un único mes | alta          | C6 y C7 situación actual por edad                                                     |
| `sistema/afiliados-sexo-edad` (T)                                                                                                          | Afiliados de diciembre por sexo y tramo de edad                   | afiliados        | 2021-2025              | anual        | media         | C8 afiliados por edad (hay 36 a 194 afiliados sin sexo o sin tramo: no suma el total) |
| `sistema/altas-bajas-anual-clase-sexo` (T)                                                                                                 | Altas iniciales y bajas definitivas de pensiones, con media       | pensiones; €/mes | 2021-2025              | anual        | alta          | C9 altas y bajas                                                                      |
| `sistema/edad-media-altas-jubilacion` (S)                                                                                                  | Edad media de las altas iniciales de jubilación                   | años             | 2022-2025              | anual        | alta          | C9 (tabla)                                                                            |

¹ Derivados: `afiliacion-anual` (media anual = media de los doce meses) y los cocientes llevan confianza «media» y el cálculo en sus notas.

### Financiación y déficit

| Fichero                                                                                                                                              | Qué mide                                                           | Unidad            | Periodo                                  | Frecuencia           | Confianza  | Página y gráfico                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------- | ---------------------------------------- | -------------------- | ---------- | ----------------------------------------------------------- |
| `sistema/presupuesto-ss-ejecucion` (T; tablas `ingresos`, `gastos`, `gastos-cap4`, `gastos-cap4-no-contributivas`, `ingresos-cap1-cap4`)             | Ejecución acumulada de ingresos y gastos del Sistema por conceptos | millones de euros | 2018-T1 a 2026-T3 (+2017-T4 comparativa) | trimestral acumulada | alta       | F2 composición de ingresos; F3 gasto en pensiones por clase |
| `sistema/deficit-presupuestario-seguridad-social` (S: derechos y obligaciones no financieras y totales, saldos, pasivos financieros, transf. Estado) | Saldos del presupuesto a diciembre                                 | millones de euros | 2017-2025                                | anual                | alta/media | F1 ingresos y gastos; F4 saldos                             |
| `sistema/deficit-sec-fondos-seguridad-social` (S: `b9-mio-eur`, `b9-pc-gdp`)                                                                         | Capacidad/necesidad de financiación SEC 2010 de S.1314             | M€; % del PIB     | 2000-2025                                | anual                | alta       | F4 saldos (tercera definición)                              |
| `sistema/deficit-definiciones` (D)                                                                                                                   | Literal de cada definición y quién la usa                          | texto             | —                                        | —                    | media/alta | F4 explicación de definiciones                              |
| `sistema/gastos-impropios` (D)                                                                                                                       | Previsiones de 2020 citadas por la Revista de la Seguridad Social  | M€; %             | 2016, 2021, 2023                         | puntuales            | media/baja | F5 tabla con fuente y confianza                             |
| `macro/pib-ine` (S: `pib-corriente`)                                                                                                                 | PIB a precios corrientes                                           | millones de euros | 1995-2025                                | anual                | alta       | denominador de los gráficos en % del PIB                    |
| `internacional/contraste-espana` (S: `gasto-pensiones-contributivas-sobre-pib`)                                                                      | Gasto propio en pensiones contributivas / PIB (derivado)           | % del PIB         | 2017-2025                                | anual                | media      | F6 gasto/PIB según definiciones                             |
| `internacional/eurostat-espana` (S: `gasto-old-…-pc-gdp`, `gasto-srv-…-pc-gdp`)                                                                      | Gasto en prestaciones de vejez y supervivencia (ESSPROS)           | % del PIB         | 1995-2025                                | anual                | alta       | F6                                                          |
| `internacional/ocde-espana` (S: `pep-…`)                                                                                                             | Gasto público en pensiones (OCDE)                                  | % del PIB         | 1990-2021 (5 puntos)                     | quinquenal/anual     | alta       | F6                                                          |

### Hucha

| Fichero                                                                                                | Qué mide                                                    | Unidad            | Periodo                | Frecuencia | Confianza  | Página y gráfico                        |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | ----------------- | ---------------------- | ---------- | ---------- | --------------------------------------- |
| `sistema/fondo-reserva-series` (S: `valor-fin-ano`, `disposiciones-anuales`, `dotaciones-mei-anuales`) | Valor a 31 de dic. (precio de adquisición) y flujos         | millones de euros | 2009-2025              | anual      | alta/media | H1 valor; H2 dotaciones y disposiciones |
| `sistema/fondo-reserva-anual` (T)                                                                      | Dotaciones, rendimientos y disposiciones acumulados         | millones de euros | 2009-2025              | anual      | alta       | H2 (tabla), H3 meses de gasto           |
| `parametros/fondo-reserva-desembolso-maximo` (D)                                                       | Límite del desembolso anual (art. 121.2 TRLGSS)             | % del PIB         | 2033-2053              | anual      | alta       | H4 reglas de disposición                |
| `parametros/mei-destino`, `normativa/cronologia` (parámetro `fondo-reserva`)                           | Destino del MEI y evolución de las reglas legales           | texto             | 1997-2023              | —          | alta       | H4 texto de reglas (con cita)           |
| `sistema/presupuesto-ss-ejecucion` (`SUMA DE PENSIONES`)                                               | Gasto en pensiones contributivas (denominador de los meses) | millones de euros | 2017-2025              | anual      | alta       | H3 meses de gasto (definición A)        |
| `sistema/pensiones-vigor-numero` × `pensiones-vigor-pension-media` × 14                                | Gasto aproximado en pensiones (derivado)                    | millones de euros | 2009-2025 (desde 2008) | anual      | media      | H3 meses de gasto (definición B)        |

### `data/demografia` y `data/internacional` restantes

No alimentan gráficos de 5-A: la demografía (población, mortalidad, proyecciones INE, EUROPOP, Ageing Report) pertenece a las proyecciones de la fase 5-B y a «Otros sistemas»; el resto de `internacional/` (OCDE perfiles, tasas de reposición, paises-sistemas) pertenece a «Otros sistemas». No se muestran datos de modelos Python.

## 2. Lagunas, confianza baja y discrepancias a la vista

- **Confianza baja**: `gastos-impropios#transferencia-prevista-pge-2021` (cifra aproximada «cerca de 14.000 millones»). Confianza media: el resto de `gastos-impropios` (fuente secundaria, previsiones de 2020), `afiliados-sexo-edad` y todos los derivados.
- **Laguna: foto única por edades**: `pensiones-vigor-edad-clase-sexo` solo existe para octubre de 2026; no hay evolución por edades (PENDIENTE_DATOS).
- **Laguna: altas y bajas** solo 2021-2025; no hay cifras anteriores, y no se desglosa la causa de la baja.
- **Laguna: pensionistas por mes** solo para el año en curso; por ello la quinta definición por pensionista existe solo para 2025.
- **Laguna: ejecución del presupuesto** 2005-2017 solo en PDF (no descargada). El ejercicio 2018 figura como «no definitivo» en la fuente.
- **Ruptura de perímetro Eurostat S.1314 en 2002** (sanidad): 2000 y 2001 no son comparables con el resto.
- **Discrepancias ya documentadas (DISCREPANCIAS.md) que afectan a las páginas**:
  - Pensiones a 1 dic. 2021-2023: unas decenas de pensiones de diferencia entre el fichero REG y la serie histórica (`pensionistas-pensiones-historico` frente a `pensiones-vigor-numero`).
  - Gasto en pensiones de la ejecución frente a número × pensión media × 14: entre un 4,1 % y un 7,0 % de diferencia (la ejecución lleva el complemento a mínimos en otra tabla). Es la razón de mostrar los dos cálculos de «meses de gasto».
  - Gasto sobre PIB de 2021 según OCDE, Eurostat y propio: tres definiciones, sin reconciliar.
  - Pensión media total frente a ponderada de las cinco clases en 2008-2011 (hasta 2,24 euros/mes).
  - PIB INE frente a Eurostat: difieren solo 1995-1998 (no afecta a los años usados).
  - Afiliados por sexo y edad: la suma por sexo o tramo no coincide exactamente con el total.
  - IMSERSO: 462.568 pensiones frente a 471.309 pensionistas (no se usan en 5-A).

## 3. Definiciones alternativas que se muestran lado a lado

1. **Relación afiliados/pensiones** (cinco): numerador = afiliados de diciembre, media anual de afiliados o afiliados a último día de diciembre; denominador = pensiones o pensionistas, a 1 de diciembre o a 1 de enero siguiente. Ninguna se presenta como la correcta.
2. **Saldo/déficit** (tres publicadas + una de cálculo propio señalada): saldo presupuestario no financiero (derechos − obligaciones, caps. 1-7), saldo presupuestario total (incluye activos y pasivos financieros, entre ellos los préstamos del Estado), capacidad/necesidad de financiación SEC 2010 de S.1314 (Eurostat). Como lectura complementaria, el saldo no financiero **sin** las transferencias corrientes del Estado (cálculo propio, confianza media; no equivale a ninguna definición publicada: la de «saldo contributivo ajustado» de AIReF/Ministerio no se ha podido descargar).
3. **Gasto en pensiones sobre el PIB** (cuatro): propio (obligaciones de «suma de pensiones» contributivas), Eurostat vejez, Eurostat vejez + supervivencia (suma calculada), OCDE gasto público en pensiones.
4. **Meses de gasto del Fondo de Reserva** (dos denominadores): obligaciones de «suma de pensiones» (ejecución) y número × pensión media × 14 (derivado).
5. **Afiliados**: media anual (derivada) o diciembre.

## 4. Series derivadas que calcula la interfaz (reproducibles)

Todas se calculan en `src/engine/series-historicas.ts` y `src/modules/historico/` a partir de los ficheros citados, con tests de casos pequeños calculados a mano.

| Derivado                                      | Fórmula                                                                | Ficheros de origen                                     |
| --------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------ |
| Índice base 100                               | valor(t) / valor(año base) × 100                                       | afiliación, pensiones, pensionistas                    |
| Gasto o saldo en % del PIB                    | magnitud (M€) / PIB corriente (M€) × 100                               | presupuesto o deficit-presupuestario + pib-ine         |
| Euros constantes de 2025                      | pensión media × IPC medio(2025) / IPC medio(año)                       | pensión media + ipc-indice-medio-anual                 |
| Resto de ingresos no financieros              | no financieros − cotizaciones − transferencias corrientes del Estado   | deficit-presupuestario + presupuesto                   |
| Saldo no financiero sin transferencias Estado | derechos no financieros − transferencias Estado − obligaciones no fin. | deficit-presupuestario                                 |
| Eurostat vejez + supervivencia                | gasto-old + gasto-srv (% del PIB)                                      | eurostat-espana                                        |
| Gasto aproximado en pensiones (B)             | Σ clases (número × pensión media × 14) / 1.000.000                     | pensiones-vigor-numero y pensiones-vigor-pension-media |
| Meses de gasto del Fondo                      | valor del Fondo / (gasto anual / 12)                                   | fondo-reserva-series + gasto A o B                     |

## 5. Gráficos propuestos y justificación

**Cotizantes y pensionistas** (C1-C9): C1 afiliados por régimen (2001-2025); C2 pensiones y pensionistas (2006-2025) y C2b pensiones por clase (2008-2025); C3 evolución comparada en base 100 (2008); C4 pensión media por clase, en euros corrientes y constantes; C5 relación afiliados/pensiones, en dos gráficos (por pensión y por pensionista) más tabla de definiciones; C6 pensiones por edad y sexo (octubre de 2026, selector de clase); C7 pensión media por edad y sexo; C8 afiliados por edad y sexo (último año); C9 altas y bajas por año (selector de clase) y tabla de pensión media y edad media de las altas.

**Financiación y déficit** (F1-F6): F1 ingresos y gastos no financieros (M€ o % del PIB); F2 composición de los ingresos (cotizaciones, transferencias del Estado, resto); F3 gasto en pensiones contributivas por clase, con el complemento a mínimos aparte; F4 saldos según las definiciones disponibles (M€ o % del PIB); F5 gastos impropios: previsiones de 2020 con su fuente y saldo con y sin transferencias del Estado; F6 gasto en pensiones sobre el PIB según cuatro definiciones.

**Hucha** (H1-H4): H1 valor del Fondo (2009-2025); H2 dotaciones y disposiciones anuales; H3 meses de gasto con las dos definiciones de gasto; H4 límite de desembolso desde 2033 (% del PIB) y reglas con cita literal. Es la primera que se corta si falta tiempo.

## 6. Gráficos útiles que NO se pueden hacer por falta de datos

(Anotados en `docs/PENDIENTE_DATOS.md`, sección «Fase 5-A».)

- Evolución por edades y clase de las pensiones en vigor antes de 2026 (solo hay una foto).
- Altas y bajas antes de 2021 y causa de las bajas.
- Relación cotizantes/pensionistas «sin doble cómputo» (ocupados + desempleados con prestación, pensionistas sin doble cómputo): no hay datos de SEPE.
- Ejecución del presupuesto y Fondo de Reserva por año anterior a 2017 y 2009 respectivamente (liquidaciones en PDF).
- Saldo «contributivo ajustado» y gastos impropios observados (solo hay la previsión de 2020 de una fuente secundaria); capacidad/necesidad de financiación según IGAE.
- Desglose de las transferencias del Estado por finalidad (complementos a mínimos, otras partidas).
- Gasto en pensiones de Clases Pasivas y no contributivas en la misma serie que las contributivas (solo el último está en la ejecución, tabla `gastos-cap4-no-contributivas`; Clases Pasivas no está en `/data`).
- Proyecciones (fase 5-B).
