# Estado de la Fase 5-A3

Rama `feat/fase-5a3-extraccion-pdf`, creada desde `origin/main`. Hecho: inventario, ETL reproducible de los siete PDF de las liquidaciones de 2010 a 2016 y del extracto del Tribunal de Cuentas de 2023, esquema nuevo `extraccion-pdf` en `validate:data`, y la página «Hucha» llevada hacia atrás con ruptura de serie rotulada. No se ha tocado el motor, «Tu pensión», «Proyecciones» ni otras secciones. Inventario en `docs/INVENTARIO_5A3.md`, decisiones en `docs/DECISIONES.md` («Fase 5-A3»), diferencias en `docs/DISCREPANCIAS.md`, huecos en `docs/PENDIENTE_DATOS.md`.

## Paso 0

Main actualizado y `docs/ESTADO_FASE_5C.md` existe. Los ocho PDF existen. **Las huellas no se pudieron comprobar contra los LEEME**: no hay LEEME de las liquidaciones, y el del Tribunal de Cuentas da la huella del original de 572 páginas, no la del extracto de 42. Se calcularon y se guardaron las huellas de hoy; la procedencia (URL exacta de cada PDF y fecha de descarga) queda pendiente para Sergio.

## Qué se extrajo y de qué página

**Liquidaciones 2010 a 2016** (`scripts/etl/ssf_liquidacion_pdf.py`; diez páginas por PDF, con capa de texto, sin OCR): cuatro tablas por PDF, cada una en página de liquidación y de comparación con el ejercicio anterior (el capítulo 4 de gastos ocupa dos páginas de cada tipo). Se extraen todas las cifras (3.574 valores con PDF, huella, página, fila y columna) en `data/sistema/liquidacion-ss-extraccion.csv/.json` y se publican 17 series anuales (millones de euros) en `liquidacion-ss-series.json`: ingresos por transferencias corrientes por origen y total, cotizaciones, transferencias de capital, activos y pasivos financieros, total de ingresos y de gastos, suma de pensiones, complemento a mínimos (desde el PDF de 2015), prestaciones no contributivas, total del capítulo 4 y la derivada «pensiones con complemento a mínimos». Cada punto cita en su nota el PDF, la página, la tabla y la fila.

**Declaración del Tribunal de Cuentas sobre la CGE de 2023** (`scripts/etl/tc_cge2023_seguridad_social.py`; 42 páginas del original, con capa de texto): 23 cifras y citas literales de los apartados 4.16, 4.17, 4.55 y 5.34 (originales, pp. 44-45, 60-61 y 74-75), el Anexo 10 línea a línea (pp. 128-129 del original: 20 préstamos, 4 subtotales y total) en `tribunal-cuentas-cge2023-prestamos.csv/.json`, y la serie derivada de préstamos por año de concesión (2017 a 2024; año inferido).

## Qué quedó fuera y por qué

- Transferencias del Estado **por finalidad por año**: no existen en ningún PDF (el Tribunal da totales de periodo y partes de ese total; las liquidaciones clasifican por origen).
- Liquidaciones de 2005 a 2009 y de 2017 en adelante en PDF: no están en el repositorio.
- Página 42 del extracto (cuadro de una mutua con errores de reconocimiento) y las páginas de estados financieros del Estado y alegaciones: no son de la Seguridad Social para la hucha.
- Año de concesión de los préstamos de 1992 a 1999: el anexo no lo da (no se asigna).
- No se hizo OCR ni se estimó ningún hueco.

## Validaciones y discrepancias

- **(a) Sumas de cada tabla**: 1.011 comprobaciones (partidas contra subtotales y totales, presupuesto inicial más modificaciones contra presupuesto total, capítulo 4 entre sus páginas), **todas dentro de la tolerancia** (0,005 millones por cifra, mínimo 0,01). Ninguna cifra quedó «no verificada».
- **(b) Continuidad**: siete ejercicios consecutivos, unidad «millones de euros» en las 70 páginas, cada tabla en el número de páginas esperado (el orden de páginas cambia en 2014 y el título de la última página de 2015 dice 2014: se clasifican por cabecera). 540 comprobaciones de la página de liquidación frente a la de comparación del mismo PDF, todas coinciden.
- **(c) Contraste con otras fuentes y años**: 461 cifras contrastadas con la comparativa del PDF siguiente; 451 coinciden y **diez difieren, todas de 2014**: una reclasificación del complemento a mínimos (7.482,04 M€ pasan de las clases de pensión a las prestaciones no contributivas, comprobado) y 95,57 M€ entre «De la Seguridad Social» y «De Comunidades Autónomas». Contrastes con el Banco de España, la ejecución, el Fondo de Reserva y la declaración de 2022 del Tribunal en `docs/DISCREPANCIAS.md`: los préstamos del anexo coinciden con los acumulados del Tribunal y con los pasivos financieros de la ejecución (salvo 2,57 M€ en 2017); el saldo del Tribunal y la deuda PDE difieren menos del 0,02 %; el PIB de 2023 del Tribunal difiere un 0,14 % del de la serie del INE; la reserva del Fondo del Tribunal (6.126,4) y la serie a precio de adquisición (5.578) difieren en 548,4 sin causa verificada.
- **(d) Idempotencia**: dos ejecuciones dan salida idéntica y es la versionada (test, necesita `pdftotext`).
- **No hay ejercicio común** entre la liquidación (hasta 2016) y la ejecución (desde 2017): el empalme no se puede contrastar y se rotula como ruptura de serie.

## Qué cambia en Hucha

- **Transferencias por año, acumuladas, meses de transferencias, meses de gasto en pensiones y las dos construcciones de apoyo financiero y suma conjunta** se extienden a 2010 con los dos tramos rotulados (liquidación y ejecución): colores y etiquetas directas con los años de cada tramo, columna por tramo en la tabla, regla vertical rotulada «Ruptura de serie» en el gráfico de líneas, columna con el documento de origen en las construcciones y nota de qué cálculos cruzan la ruptura. «Fondo menos deuda» no cambia.
- **Tabla por finalidad** ampliada con la declaración de 2023 (no se suma con la de 2022), con la definición «la ejecución clasifica por origen y el Tribunal por finalidad», «Cómo leerlo» y fuente. No se afirma la periodicidad de las transferencias.
- **Sección nueva «Préstamos del Estado y Fondo de Reserva según el Tribunal de Cuentas»**: préstamos por año frente a pasivos financieros de ingresos (dos tramos), Anexo 10 línea a línea y las cifras del Fondo del Tribunal frente a la serie.
- **Tabla de clasificaciones** con cuatro filas más (periodo de la declaración de 2023).
- **Medida secundaria** (cuarto trimestre): solo existe para la ejecución.

## Tamaño del trozo de «Hucha»

262,82 kB (51,91 kB comprimido), frente a 154,27 kB (36,45 kB) en `main`. El aumento (108,6 kB) es sobre todo de datos: las series de las liquidaciones, las cifras con cita del Tribunal y el Anexo 10. La extracción completa (1,2 MB de CSV) **no** va al trozo: solo se importan las series y el Anexo 10.

## Pruebas

- Unitarias: `src/engine/series-empalme.test.ts` (empalme con ruptura y partición por tramos) y `scripts/etl/test_etl_5a3.py` (validaciones del ETL con casos hechos a mano: sumas, tolerancia, rótulos, cabeceras, serie derivada), ejecutada desde `scripts/extraccion-pdf-5a3.test.ts`.
- Datos: `scripts/extraccion-pdf-5a3.test.ts` (huellas reales, sumas recalculadas desde el CSV sin pasar por el ETL, continuidad, diferencias entre PDF, citas del Tribunal, contraste con la declaración de 2022, el Banco de España, la ejecución, el INE y el Fondo, e idempotencia). El validador de `validate:data` tiene casos negativos (huella que no coincide, cifra de tabla fallida no marcada, página fuera del documento).
- Componentes: `src/modules/hucha/hucha.test.tsx` (ruptura rotulada en gráfico y tabla, columnas por tramo, medida secundaria solo de la ejecución, regla del gráfico de líneas, columna de origen de las construcciones, tabla por finalidad, sección de préstamos con tabla, fuente, nota y «Cómo leerlo», Anexo 10, tabla del Fondo).
- Neutralidad y cifras: los tests existentes recorren los textos nuevos (`scripts/neutralidad-5a2.test.ts`, `src/modules/historico/neutralidad.test.tsx`, `scripts/historico-5a.test.ts`: sin dígitos escritos a mano).
- Playwright: `e2e/hucha.spec.ts` (consola, peticiones externas, ruptura rotulada, año de inicio, móvil sin desbordes con las tablas abiertas, axe a 1360 y 390 px).
