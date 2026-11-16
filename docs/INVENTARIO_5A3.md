# Inventario de los PDF para la hucha (Fase 5-A3)

Fecha: 2026-11-16. Alcance: los siete PDF de las liquidaciones del presupuesto de la Seguridad Social de 2010 a 2016 (`data-raw/seg-social-fin/liquidacion/AAAA_SISTEMA.pdf`) y el extracto de la Declaración del Tribunal de Cuentas sobre la Cuenta General del Estado de 2023 (`data-raw/tribunal-cuentas/declaracion-cge-2023-extracto.pdf`). Este inventario se hizo **antes** de escribir el ETL, con `pdfinfo` y `pdftotext -layout`. No contiene cifras de datos.

## 0. Paso 0: comprobaciones

| Comprobación                                                      | Resultado                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `main` actualizado y `docs/ESTADO_FASE_5C.md` existe              | Sí (la 5-C está fusionada).                                                                                                                                                                                                                                                                                                                       |
| Los PDF existen                                                   | Sí, los ocho.                                                                                                                                                                                                                                                                                                                                     |
| SHA-256 de las liquidaciones frente a «los LEEME»                 | **No se puede comprobar:** no existe ningún LEEME en `data-raw/seg-social-fin/` (ni en el historial de git). Se calcula la huella hoy y se registra como la de referencia (en `data/sistema/liquidacion-ss-extraccion.json`). La URL exacta de cada fichero y su fecha de descarga tampoco constan; se usa la fecha del commit que los incorpora. |
| SHA-256 del extracto del Tribunal de Cuentas frente al LEEME      | **No coincide ni puede coincidir:** el LEEME da la huella del **original** de 572 páginas (que no está en el repositorio), no la del extracto de 42 páginas. Se registra la huella calculada del extracto y la del original que da el LEEME.                                                                                                      |
| Correspondencia página del extracto → página del original (LEEME) | La lista de páginas físicas del LEEME suma 42 páginas, como el extracto. El ETL comprueba que el desfase entre la numeración impresa de cada página y su página física es constante en cada bloque contiguo.                                                                                                                                      |

Consecuencia: la extracción sigue adelante, porque las cifras de los PDF se validan por dentro (sumas) y entre sí (comparativas), pero la procedencia (URL del fichero y fecha de descarga) de las liquidaciones queda como **pendiente para Sergio** (`docs/PENDIENTE_DATOS.md`).

## 1. Liquidaciones de 2010 a 2016 (siete PDF)

**Formato.** Los siete PDF tienen diez páginas, se generaron desde Excel (`Microsoft Excel 2007`, `Acrobat PDFMaker`, `PDF24`) y **tienen capa de texto**: `pdftotext -layout` devuelve las tablas con las columnas alineadas. **No hay páginas escaneadas**, por lo que no hace falta OCR ni se ha hecho.

**Unidad.** Todas las páginas rotulan «(Millones de euros)»; las cifras llevan dos decimales y punto de miles.

**Organización.** Cada PDF recoge cuatro tablas, cada una en dos tipos de página: la **liquidación del ejercicio** (presupuesto inicial, modificaciones, presupuesto total, obligaciones o derechos reconocidos y porcentaje de ejecución) y la **comparación con el ejercicio anterior** (dos columnas de ejercicios, incremento absoluto y relativo).

| Tabla                                             | Qué contiene                                                                                                                                                                                                                      | Páginas por PDF                             |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Presupuesto de gastos (clasificación económica)   | Capítulos 1 a 4 y 6 a 9 (gastos de personal, bienes y servicios, financieros, transferencias corrientes, inversiones, transferencias de capital, activos y pasivos financieros) y sumas; total del sistema                        | 2 (liquidación y comparación)               |
| Capítulo 4 del presupuesto de gastos              | Pensiones contributivas por clase, subsidios y otras prestaciones, prestaciones no contributivas y otras transferencias corrientes (a la Administración del Estado, a la Seguridad Social, a comunidades autónomas, al exterior…) | 4 (dos de liquidación y dos de comparación) |
| Presupuesto de ingresos (clasificación económica) | Capítulos 1, 3, 4, 5, 6, 7, 8 y 9 (cotizaciones, tasas, transferencias corrientes, ingresos patrimoniales, enajenación, transferencias de capital, activos y pasivos financieros) y sumas; total del sistema                      | 2                                           |
| Capítulos 1 y 4 del presupuesto de ingresos       | Cotizaciones por régimen; transferencias corrientes por origen (del Estado, de organismos autónomos, de la Seguridad Social, de comunidades autónomas, de empresas privadas, del exterior…)                                       | 2                                           |

No hay tablas de **préstamos** ni de **Fondo de Reserva** como tales: los préstamos del Estado figuran, sin distinguir, dentro de los pasivos financieros de ingresos (capítulo de pasivos financieros) y el Fondo, dentro de los activos financieros de ingresos y gastos (que contienen también otras operaciones). No hay transferencias **por finalidad**: se clasifican por origen.

**Páginas por año.** Todos los PDF tienen el mismo contenido, pero el orden de las páginas **cambia**: en el de 2014 empieza por la comparación de ingresos (capítulos 1 y 4) y el resto se desplaza una página. Por eso el ETL clasifica cada página por su título y por la cabecera de sus columnas, y no por su posición. En el PDF de 2015, la última página lleva el título «ejercicio 2014» aunque sus columnas son 2014 y 2015 (error de rotulado del documento; manda la cabecera de columnas).

**Cambios de estructura entre años.**

- Hasta el PDF de 2014, las cinco clases de pensión contributiva (invalidez, jubilación, viudedad, orfandad, en favor de familiares) incluyen el complemento a mínimos. Desde el PDF de 2015, el complemento figura **aparte**, dentro de las prestaciones no contributivas, y en la comparativa de 2014 de ese PDF las clases bajan y las prestaciones no contributivas suben en el mismo importe. Es un cambio de clasificación, no de cuantía; el ETL lo comprueba.
- Cambian algunos rótulos entre años: «Prestaciones LISMI» (hasta el PDF de 2014) pasa a «Subsidios económicos para personas con discapacidad» (desde el de 2015), y en los PDF de 2015 y 2016 aparece una partida de prestaciones sociales y asistencia sanitaria a desplazados.
- Dentro de un mismo PDF, el rótulo de una partida difiere a veces entre la página de liquidación y la de comparación («A la Administración del Estado» frente a «Al Estado»; «Maternidad, patern., riesgo emb. y lact.» frente a «Maternidad y riesgos durante el embarazo»). El emparejamiento de partidas entre páginas se hace por rótulo normalizado y sección; las partidas sin equivalente por rótulo no se contrastan por esa vía (siguen validadas por las sumas de su tabla).
- Las cifras de un ejercicio **reaparecen** como «ejercicio anterior» en el PDF siguiente: sirven para contrastar y, donde difieren, para registrar la revisión. El PDF de 2010 aporta además la columna de 2009, solo como comparativa (no se publica como serie).

**Series que se pueden construir** (sin cifras; todas en millones de euros, anuales, ejercicios 2010 a 2016):

1. Ingresos por transferencias corrientes por origen (del Estado, de organismos autónomos administrativos, de la Seguridad Social, de comunidades autónomas, de empresas privadas, del exterior) y total.
2. Ingresos por transferencias de capital, activos financieros y pasivos financieros; cotizaciones sociales; total de ingresos.
3. Gastos: pensiones contributivas por clase y suma; complemento a mínimos (desde el PDF de 2015); prestaciones no contributivas; transferencias corrientes; activos y pasivos financieros; total de gastos.
4. Derivada: pensiones contributivas con el complemento a mínimos (misma definición que la «referencia» de «meses de gasto» de la ejecución).

**Series ya existentes en `data/` para contrastar.**

- `sistema/presupuesto-ss-ejecucion` (ejecución acumulada, 2017 a 2026): mismos conceptos, **sin ejercicio común** con las liquidaciones (el primer ejercicio de la ejecución es el siguiente al último de la liquidación).
- `sistema/deficit-presupuestario-seguridad-social` (2017 a 2025): derechos, obligaciones, pasivos financieros y transferencias del Estado.
- `sistema/fondo-reserva-anual` y `fondo-reserva-series` (2009 a 2025): valor, dotaciones y disposiciones del Fondo.
- `sistema/deuda-pde-seguridad-social` (Banco de España) y `sistema/prestamos-transferencias-tribunal-cuentas` (declaración de 2022).
- `macro/pib-ine`.

## 2. Extracto de la Declaración del Tribunal de Cuentas sobre la Cuenta General del Estado de 2023

**Formato.** 42 páginas (de 572 del original; páginas físicas del original: 1-3, 15, 35-47, 59-62, 67, 73-76, 84, 94, 102, 120, 128-129, 135-137, 262, 467-470, 511 y 553). **Tiene capa de texto** (generado con `pypdf` a partir del original); no hay páginas escaneadas. La página 42 del extracto es un fragmento de alegaciones con una tabla (cuadro de una mutua) que `pdftotext` devuelve con errores de reconocimiento de caracteres: **no se usa**.

**Contenido útil para la hucha.**

| Dónde (extracto → original)           | Qué contiene                                                                                                                                                                                                                                                     | Se extrae                                                |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| p. 14-15 → 44-45 (apdos. 4.16 y 4.17) | Saldo de endeudamiento frente al Estado, préstamos de 1992 a 1999 y de 2017 a 2023, transferencias por finalidad (equilibrio presupuestario, covid, base normativa de 2021), aportaciones no contributivas, reserva patrimonial y tesorería del Fondo de Reserva | Sí (cifras con cita literal)                             |
| p. 19-20 → 60-61 (apdo. 4.55)         | Transferencias de la ley de presupuestos de 2023 «Para financiar otros conceptos» y su descripción                                                                                                                                                               | Sí (cifra de la ley, no de ejecución; cita)              |
| p. 24-25 → 74-75 (apdo. 5.34)         | Composición del endeudamiento: once préstamos de 1992 a 1999, préstamos de 2017 a 2023                                                                                                                                                                           | Sí (contraste con el anexo)                              |
| p. 31-32 → 128-129 (Anexo 10)         | **Tabla** de préstamos otorgados por el Estado a la Seguridad Social: 20 líneas con norma, importe y vencimiento, cuatro subtotales y total                                                                                                                      | Sí (línea a línea, con subtotales)                       |
| p. 28-30, 33-35                       | Estados financieros consolidados del Estado, anexo de operaciones de ejercicios anteriores, causas de gasto en incapacidad temporal y obligaciones pendientes de pago de la Administración General del Estado                                                    | No: no son de la Seguridad Social o no son para la hucha |
| p. 36-41                              | Índice de alegaciones y alegaciones de la Seguridad Social (medicina marítima, mutuas)                                                                                                                                                                           | No                                                       |

**Lo que NO contiene el extracto.** Una tabla anual de transferencias por finalidad: el Tribunal solo da totales de periodo y partes de ese total. Tampoco el detalle por préstamo de años anteriores a 1992 ni los saldos de los préstamos por vencimiento.

**Series que se pueden construir** (sin cifras): préstamos concedidos por año (2017 a 2024), derivados del Anexo 10 asignando cada línea al año anterior al de inicio de su plazo de cancelación (el Tribunal indica en la nota 61 que el plazo empieza el año siguiente al de la concesión); cifras de periodo por finalidad de las transferencias (dos declaraciones, 2022 y 2023); cifras del Fondo de Reserva de 2023 según el balance.

**Series ya existentes para contrastar.** `sistema/prestamos-transferencias-tribunal-cuentas` (declaración de 2022, BOE-A-2025-25090), `sistema/deuda-pde-seguridad-social`, `sistema/deficit-presupuestario-seguridad-social` (pasivos financieros), `sistema/fondo-reserva-series`, `macro/pib-ine`.

## 3. Qué se deja fuera y qué haría falta

- **Transferencias por finalidad por año:** no existen en ninguno de los PDF. Haría falta la liquidación del presupuesto por programas o el informe del Ministerio con el desglose (`docs/DESCARGAS_MANUALES.md`).
- **Liquidaciones de 2005 a 2009 y de 2017 a 2019:** no están (solo hay PDF de 2010 a 2016; los ejercicios posteriores están en la ejecución en Excel).
- **URL exacta y fecha de descarga de cada liquidación** y su huella de referencia: las tendría que aportar Sergio.
- **Página 42 del extracto del Tribunal:** reconocimiento de caracteres defectuoso; sin interés para la hucha. No se ha hecho OCR.
