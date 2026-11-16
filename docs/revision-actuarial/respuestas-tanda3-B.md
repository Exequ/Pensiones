# Revisión actuarial, tercera tanda, parte B: Motores y datos del sistema

Respuesta del chat de revisión actuarial (Claude Opus 5.5), recibida el 16-11-2026, a docs/revision-actuarial/preguntas-tanda3-B.md. Las cifras que cita el revisor son cálculos suyos: no se publican sin recalcularlas desde /data o comprobarlas en una fuente descargada.

Contrasto con los textos del repo y recalculo las cifras del sistema que se puedan reproducir.

Contrasté las 26 afirmaciones con el texto literal del repo: el TRLGSS, el Decreto 3158/1966, el Decreto 1646/1972, la Orden de 1967, la Orden de 1969, el RD 1799/1985 y el RDL 2/2023. Recalculé las cifras del sistema con `/data`. La certeza es un juicio mío, no una certeza legal.

## Catálogo de afirmaciones circulantes (18-29)

En las doce el marco me parece bien: el catálogo muestra los datos y no da veredicto. Lo que se revisa es el criterio que se propone en cada pregunta.

| nº | id | respuesta | confianza | fuente o cálculo | cambio de texto propuesto |
|---|---|---|---|---|---|
| 18 | `mito-hucha-vaciada` | confirmo | alta | Informe a las Cortes, a precio de adquisición. La identidad cuadra: 64.963 + 29.443 − 80.337 = 14.069 frente a 14.070 publicado | Formular «vaciado» con dos referencias: el máximo (66.815 M€ en 2011) y los meses de gasto. Calculado: 0,93 meses de pensiones contributivas en 2025 (0,88 con mínimos) y unos 0,2 meses entre 2018 y 2022. Antes de 2018 no se puede calcular porque `/data` no tiene la serie de gasto |
| 19 | `mito-pensiones-con-impuestos` | confirmo | media | El TRLGSS separa la financiación contributiva (cotizaciones) de la no contributiva (aportaciones del Estado) y clasifica los complementos a mínimos como no contributivos. Ejecución de 2024: 7.856 M€ de complementos a mínimos | Criterio: los complementos a mínimos van a la parte del Estado. Las reducciones de cuotas que compensa un tercero (SEPE o Estado) cuentan como cotización con su origen indicado; las que no se compensan, como menor ingreso. Proporción = cotizaciones ÷ gasto contributivo sin mínimos |
| 20 | `mito-menos-cotizantes-por-pensionista` | confirmo | media | Series de `/data`: afiliados medios anuales por pensión, de 1,90 en 2017 a 2,07 en 2025 | Precisar que un «afiliado» es una situación de alta, no una persona: la pluriactividad cuenta dos veces. Los perceptores de paro cotizan pero no son afiliados ocupados. El doble cómputo afecta al nivel, y a la tendencia solo si cambia el peso del pluriempleo. Para el modelo: afiliados medios anuales ÷ pensiones |
| 21 | `mito-jubilados-cobran-mas-de-lo-cotizado` | confirmo el marco; método sin datos | baja | No hay historiales en `/data` (haría falta la MCVL) | Cociente = valor actual de prestaciones ÷ valor actual de cotizaciones por cohorte, con mortalidad del INE por sexo. Tipo de descuento: crecimiento de la masa salarial (central) y bono a 10 años (sensibilidad). Decisión clave: solo la parte del tipo de contingencias comunes que financia la jubilación, no el 28,3 % entero (también paga IT, IP y supervivencia). La riqueza de pensiones de la OCDE es valor actual ÷ salario, no ÷ cotizaciones: no es comparable directamente |
| 22 | `mito-sistema-en-deficit` | confirmo | alta | 2025: saldo presupuestario no financiero −7.187,89; saldo total −1.797,69 (los préstamos del Estado entran como ingreso); SEC −5.612 | En el modelo, el SEC para comparar y valorar la sostenibilidad, y el presupuestario no financiero para los flujos de la Tesorería. El saldo ajustado de la AIReF, solo descrito. Diferencia de 2025 entre presupuestario y SEC: 1.576 M€ (devengo y perímetro del S.1314, sin conciliar) |
| 23 | `mito-edad-real-de-jubilacion-65` | confirmo | media | `edad-media-altas-jubilacion` y DT 7.ª | En el modelo, la edad media de las altas de jubilación para los flujos, la legal para las reglas y la de salida efectiva de la OCDE solo para comparar |
| 24 | `mito-pensiones-publicas-insostenibles` | corrijo | alta | DA 2.ª RDL 2/2023 | Añadir el criterio legal: cada tres años la AIReF comprueba que el gasto medio en pensiones de 2022 a 2050 no pasa del 15 % del PIB, ajustado por el impacto de las medidas de ingresos frente al 1,7 %. Si hay exceso y no entra en vigor una ley correctora, el MEI sube dos décimas del exceso cada año |
| 25 | `mito-mayores-en-pobreza` | confirmo | media | Definiciones de Eurostat y de la OCDE | Añadir: AROPE no es solo pobreza monetaria; Eurostat usa el umbral del 60 % de la mediana y la OCDE el del 50 %; ninguno imputa el alquiler de la vivienda propia, que en España pesa mucho entre los mayores. Mostrar las dos variantes del umbral |
| 26 | `mito-pensiones-sustituyen-casi-todo-el-salario` | confirmo | media | Cálculo con la fórmula vigente: carrera completa, base por debajo del tope, IPC del 2 % | Reproducido: la pensión anual es un 96 % del último salario anual con salario real constante, un 84 % con crecimiento real del 1 % y un 82 % con el 1,25 %. El divisor × 14/12 compensa las 14 pagas; lo que baja la tasa son los 24 meses sin actualizar y el crecimiento real. Distinguir base de cotización de salario, y bruto de neto |
| 27 | `mito-espana-gasta-mas-que-europa` | confirmo | media | ESSPROS y OCDE | ESSPROS vejez + supervivencia incluye prestaciones en especie y no es solo pensiones; usar el agregado de gasto en pensiones de Eurostat. Ajuste por estructura de edades: gasto/PIB ÷ peso de los mayores de 65 en la población |
| 28 | `mito-pensiones-siempre-con-el-ipc` | corrijo | alta | `revalorizacion-general` frente al IPC mensual de `/data` | La serie no tiene 2011 ni 2012. En 2001-2010 recoge solo la revalorización inicial con el IPC previsto, sin la paga y la consolidación por desviación. Con esos huecos, el acumulado (1,556 frente a 1,754-1,764 según la medida de IPC) es engañoso y no debe publicarse. Años con regla distinta: 2001-2010 (previsión + desviación), 2011 (congelación), 2012-2013, 2014-2018 (índice de revalorización, suelo 0,25), 2019-2021 (leyes anuales), desde 2022 (media de 12 meses hasta noviembre) |
| 29 | `mito-sin-nacimientos-no-hay-pensiones` | confirmo | media | Ageing Report, EUROPOP2025 | Añadir: la fecundidad apenas mueve la población activa antes de unos 20 años; hasta 2050 pesan más la migración y la tasa de empleo. La dependencia económica (pensiones ÷ afiliados) depende del empleo además de la demografía |

## Motores (37-39, 47, 55, 57-59)

| nº | id | respuesta | confianza | fuente | cambio de texto propuesto |
|---|---|---|---|---|---|
| 37 | `param-incapacidad-permanente-reglas` | corrijo | (a) media; (b) media-baja; (c) alta; (d) media-baja | Art. 197 TRLGSS; **RD 1799/1985 art. 5.2.3.ª** (coeficiente 1,1666) **y art. 5.4, párrafo 2.º** | (c) y su ámbito: el periodo corto se aplica a todo el que tiene menos de unos 52 años, no solo desde los 31. Por debajo de 31 el periodo exigido es un tercio desde los 16 (menos de 5 años), siempre menos de 96 meses. (d) **Cambio de criterio:** el RD 1799/1985 dice que la base de la incapacidad total, absoluta o gran incapacidad por accidente no laboral en alta «continuarán rigiéndose por las normas ya en vigor con anterioridad a la Ley 26/1985». Es decir, el art. 7.1 del Decreto 1646/1972, sin integración de lagunas, que llegó con esa ley. Propongo pasar a `sin-integrar` (provisional, ~60 %) |
| 38 | `param-incapacidad-permanente-reglas-carencia` | confirmo | (a) media-baja; (b) media; (c) media; (d) alta | Art. 195 TRLGSS; RD 1799/1985 art. 4 | (a) El redondeo a medios años del RD está escrito para sus propias reglas (mitad desde los 16, cuarto desde los 20, corte en 26), que el art. 195 sustituyó. Mantener `sin-redondeo`. El mismo artículo manda despreciar las fracciones de mes del periodo resultante: comprobar que el motor lo hace. (c) Que el motor use el hecho causante como fecha de extinción de la IT es una simplificación: dejarlo escrito |
| 39 | `param-incapacidad-permanente-reglas-cuantia` | confirmo | (a) alta; (b) alta; (c) media; (d) alta | Arts. 196.2, 196.4 y 196.5 TRLGSS; Orden de 1969 («la prestación… para el de incapacidad permanente absoluta») | (a) Además, la base es solo la del 197.1.a, sin la escala; el motor ya lo hace. Mantener el complemento de gran incapacidad es lectura nuestra (media). (b) El suelo es un mínimo de la pensión, no un complemento a mínimos: no tiene límite de rentas. (c) El incremento de la cualificada exige además no trabajar; la presunción por edad es una simplificación: indicarlo. (e) Opción «introduce tu base reguladora» |
| 47 | `param-mei-reglas` | corrijo | (a) media-alta; (b) alta; (c) alta; (d) media | Art. 127 bis; DT 42.ª y DT 43.ª; art. 19 bis; DA 2.ª RDL 2/2023 | (d) Después de 2050 la ley sí dice algo: la DT 43.ª da efectos «hasta el 31 de diciembre de 2050», así que el tipo sería 0 salvo ley nueva. Añadir que el MEI puede subir automáticamente por la DA 2.ª del RDL 2/2023, y que el motor no lo modela |
| 55 | `param-pnc-reglas` | confirmo | (a) media; (b) media; (c) alta; (d) baja | Arts. 363-366 TRLGSS; guía del IMSERSO | (a), (b) y (d) se apoyan en la guía, no en la ley: decirlo. Cuantía de 2023 comprobada: 5.899,60 × 1,15 = 6.784,54 (art. 77 del RDL 20/2022) |
| 57 | `param-supervivencia-reglas` | confirmo | (a) alta; (b) media; (c) alta; (d) media | Art. 228; art. 224.1; Orden de 1967; **Decreto 1646/1972 art. 7.3** | Causante pensionista: la norma revaloriza la pensión «mediante las mejoras o revalorizaciones que, para las prestaciones de igual naturaleza por muerte y supervivencia, hayan tenido lugar». Usar la revalorización general es correcto, salvo en años de revalorización diferenciada (por ejemplo, 2013) |
| 58 | `param-supervivencia-reglas-cuantia` | corrijo | (a) media; (b) baja; (c) media-alta; (d) alta; (e) media; (f) media-alta | Decreto 3158/1966 art. 31.2-3; Orden de 1967 arts. 23.2 y 17.2 (vigentes); art. 222; art. 60 | (d) **Error:** las rentas del 70 % se miden con lo «percibido en el ejercicio anterior», excluyendo lo que se deja de percibir por el hecho causante (art. 31.2), no en el hecho causante. (c) El apoyo no es el art. 39 del Decreto (remite a un apartado derogado), sino la Orden: el 23.2 remite al 17.2, que sigue vigente. Lo corrobora una fuente secundaria: sin cónyuge vivo ni hijos con derecho a pensión, la pensión en favor de familiares aumenta en un 52 % correspondiente a la viudedad, sin exceder el 100 % de la base. (b) Falta un criterio del INSS sobre los complementos a mínimos de la pensión limitada por la compensatoria |
| 59 | `param-supervivencia-reglas-limites` | corrijo | (a) baja; (b) media; (c) alta; (d) alta; (e) media | Arts. 229, 220.2 y 221.2 (versiones de 2016, 2022 y 2026); Decreto 3158 art. 38.1.2.º | (d) Completar: del 2-1-2016 al 31-12-2021, la pareja de hecho, con o sin hijos, necesitaba cinco años de convivencia más la inscripción con dos años de antelación. Del 1-1-2022 al 20-10-2026, con hijos comunes, solo la inscripción. Desde el 21-10-2026, con hijos comunes, dos años de convivencia. (c) El porcentaje no asignado incrementa solo la orfandad absoluta |

## Datos del sistema (60-65)

| nº | id | respuesta | confianza | cálculo | cambio de texto propuesto |
|---|---|---|---|---|---|
| 60 | saldo presupuestario no financiero | confirmo | alta | 232.882,47 − 240.070,36 = −7.187,89 | Añadir el contraste: saldo total −1.797,69, que cuenta los préstamos del Estado (pasivos financieros) como ingreso |
| 61 | saldo SEC (B.9) | confirmo | alta | 262.691 − 268.303 = −5.612 | Diferencia de 1.576 M€ con el presupuestario: devengo y perímetro, sin conciliar |
| 62 | valor del Fondo | confirmo | alta | 14.069 calculado frente a 14.070 publicado | El modelo usa el precio de adquisición, que es el publicado de forma continua; el valor de mercado, solo si aparece en el informe |
| 63 | pensionistas | confirmo | alta | 10.434.856 ÷ 9.438.579 = 1,106 | Gasto por persona: pensionistas. Gasto y ratio de flujos: pensiones. Tasa de reposición: pensión de jubilación, no la media por pensionista, que mezcla viudedad con jubilación |
| 64 | Alternativa 1 | confirmo | alta | 21.679.951 ÷ 10.452.674 = 2,074; con datos de diciembre, 2,093 (−0,9 %) | — |
| 65 | afiliados de diciembre por pensionista | confirmo | alta | 2,3144 | Para el modelo, afiliados medios anuales ÷ pensiones (2,073). «Afiliados» son situaciones de alta, no personas ni cotizantes |

## Lo que cambia algo de verdad

- **Lagunas en accidente no laboral (37 d).** El RD 1799/1985 apunta a `sin-integrar`. Cambiaría la lectura provisional que dimos.
- **Rentas del 70 % de la viudedad (58 d).** Hoy se miden en una fecha que no es la de la norma: deben ser las del ejercicio anterior.
- **Revalorización frente al IPC (28).** La serie de revalorizaciones está incompleta. El acumulado no debe publicarse hasta completarla.
- **Criterio legal de sostenibilidad (24 y 47).** Falta la cláusula de la DA 2.ª del RDL 2/2023, que puede subir el MEI automáticamente.

## Con confianza baja

- **21:** jubilados que cobran más de lo cotizado; faltan los historiales de cotización.
- **37 (d):** lagunas en accidente no laboral; la evidencia nueva apunta a `sin-integrar`.
- **55 (d):** límite de la PNC con complemento de tercera persona.
- **58 (b):** compensatoria y complementos a mínimos.
- **59 (a):** qué pensión se reduce con el límite conjunto.

En media-baja quedan **37 (b)** y **38 (a)**.

Quedo a la espera del tercer bloque.