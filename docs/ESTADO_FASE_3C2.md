# Estado de la Fase 3-C2: viudedad y orfandad en «Tu pensión»

Rama `feat/fase-3c2-supervivencia`, creada desde `origin/main` (`565df58`, que contiene la revisión actuarial 3 del motor, `docs/ESTADO_MOTOR_REVISION_3.md`, y el estado de la 3-C1, `docs/ESTADO_FASE_3C1.md`). Hecho: pasos 0 a 8 (renombrado, inventario, selector y flujo de entrada, resultado y receta, enlace, casos de prueba, textos y claims, tests, documentación). Nada a medias. Decisiones: `docs/DECISIONES.md` («Fase 3-C2»); inventario: `docs/INVENTARIO_3C2.md`; arquitectura: `docs/SIMULADOR.md`.

## Qué admite el simulador ahora

- **Viudedad**: cónyuge, pareja de hecho, excónyuge y expareja de hecho con pensión compensatoria (o víctima de violencia de género) y sin nuevo vínculo; causante en alta, sin alta o pensionista (de jubilación o de incapacidad permanente); las cuatro causas de muerte (las profesionales, con la base reguladora escrita por la persona); rentas (trabajo, capital, totales y del ejercicio anterior), cargas familiares, otra pensión pública, discapacidad, complemento por hijos; prestación temporal; hijos con derecho a orfandad (lista opcional) que comparten el límite conjunto.
- **Orfandad**: huérfano con edad, incapacitación, discapacidad e ingresos; orfandad absoluta; otros huérfanos con derecho; cónyuge o pareja superviviente con derecho a viudedad (opcional, con sus datos).
- **Resultado**: pensión mensual (por paga) y anual, porcentaje aplicado, base reguladora y su origen, límites (pensión máxima, compensatoria, límite conjunto con o sin la excepción), complementos, duración de la prestación temporal, tabla de reparto entre los beneficiarios del mismo causante y receta de seis pasos con las referencias normativas del motor.
- **Lecturas**: viudedad, cinco; orfandad, cuatro (`supervivencia.*`); sección aparte con todas las lecturas que cambian el resultado (decididas, provisionales y pendientes) o la frase de que ninguna lo cambia; nota plegable con las tres lecturas de jubilación que rigen aquí (base máxima, pensión máxima y pensión máxima desde 2051).
- **Enlace**: `p=viu` y `p=orf`, ida y vuelta; `v=1` sin `p` sigue siendo jubilación y los enlaces de jubilación y de incapacidad se escriben exactamente igual que antes (test con textos de `origin/main`).

## Qué no admite, y por qué

- Hechos causantes anteriores al primer año que cubre el motor (incluida la pareja de hecho de 2016 a 2021): mensaje con la fecha indicada y el motivo (la redacción aplicable era otra); no se calcula ni se inventa el requisito.
- Separaciones y divorcios anteriores a la DT 13.ª: el motor devuelve `NoImplementada`; el formulario pregunta y muestra el mensaje.
- Causante en alta sin obligación de cotizar (el formulario no recoge la fecha de cese) y concurrencia de varios beneficiarios de viudedad (meses vividos): el motor los calcula, la interfaz no los ofrece todavía.
- Favor de familiares y no contributivas: 3-C3. Gráfico de bases: el motor no las expone.

## Casos de prueba por prestación (resultado a mano, con la operación en el propio test)

`src/modules/tu-pension/supervivencia.test.ts` (base reguladora 24 × 2.000 / 28 = 1.714,29):

| Prestación | Caso                                                              | Cuenta                                                          | Resultado (por paga)  |
| ---------- | ----------------------------------------------------------------- | --------------------------------------------------------------- | --------------------- |
| Viudedad   | Cónyuge de 49 años                                                | 52 % × 1.714,29                                                 | 891,43 €              |
| Viudedad   | Cónyuge de 70 años sin rentas                                     | 60 % × 1.714,29                                                 | 1.028,57 €            |
| Viudedad   | Cargas familiares                                                 | 70 % = 1.200,00; mínima con cargas 1.256,60 → complemento 56,60 | 1.256,60 €            |
| Viudedad   | Matrimonio de seis meses con enfermedad anterior                  | Prestación temporal, 24 meses, 52 %                             | 891,43 €              |
| Viudedad   | Excónyuge con compensatoria de 6.000 al año (anual y mensual)     | 6.000 / 14 y 6.000 / 12                                         | 428,57 € y 500,00 €   |
| Viudedad   | Causante pensionista (base 2.500, pensión de 2023)                | 2.500 × 1,038 × 1,028 × 1,027 = 2.739,69; × 60 %                | 1.643,81 €            |
| Viudedad   | Accidente de trabajo, base escrita 3.000                          | 52 % × 3.000                                                    | 1.560,00 €            |
| Viudedad   | 70 % con tres hijos con derecho a orfandad                        | Orfandades al 48 % en conjunto: 16 % cada una                   | 1.200,00 € y 274,29 € |
| Orfandad   | Huérfano de 10 años                                               | 20 % × 1.714,29                                                 | 342,86 €              |
| Orfandad   | Orfandad absoluta                                                 | (20 % + 52 %) × 1.714,29                                        | 1.234,29 €            |
| Orfandad   | Viuda con cargas y tres huérfanos (excepción del art. 229.3)      | 16 % × 1.714,29                                                 | 274,29 €              |
| Orfandad   | Viuda del 52 % y tres huérfanos; lectura proporcional             | Por defecto 822,86 / 3; proporcional: 342,86 × 1.714,29 / 1.920 | 274,29 € y 306,12 €   |
| Orfandad   | Huérfano incapacitado de 36 años (y sin incapacidad: sin derecho) | 20 % × 1.714,29                                                 | 342,86 €              |
| Orfandad   | Mismo caso con mínimos                                            | Mínima 4.011 / 14 = 286,50; complemento 12,21                   | 286,50 €              |

Además, `scripts/tu-pension-supervivencia-equivalencia.test.ts`: siete casos que dan lo mismo por el formulario que por la llamada directa al motor (±0,01) y que la cuenta a mano de los casos de oro del motor (`viudedad-52`, `viudedad-60-mayor-65`, `pareja-hecho`, `excónyuge-compensatoria`, `orfandad-un-huerfano`, `orfandad-absoluta-dos`, `viudedad-cuatro-huerfanos`). Los casos de oro del motor y los de la incapacidad siguen pasando sin cambios.

## Fallos del motor encontrados (no corregidos)

Ninguno que cambie un resultado frente a la norma. Observaciones en `docs/DISCREPANCIAS.md` («Fase 3-C2»): la lectura `reduccionLimiteConjunto` no actúa cuando rige la excepción del art. 229.3; la fecha del fallecimiento llega con el día 1; lecturas de jubilación que el código lee pero no aplica.

## Ficheros nuevos

`docs/INVENTARIO_3C2.md`, `docs/ESTADO_FASE_3C2.md`; en `src/modules/tu-pension/`: `supervivencia-tipos.ts`, `supervivencia-mapeador.ts`, `supervivencia-ejecutor.ts`, `supervivencia-presentador.ts`, `enlace-supervivencia.ts`, `enlace-validadores.ts`, `Campos.tsx`, `FormularioSupervivencia.tsx`, `LecturasQueIntervienenSupervivencia.tsx`, `textos-supervivencia.ts` y sus tests (`supervivencia.test.ts`, `supervivencia-mapeador.test.ts`, `enlace-supervivencia.test.ts`, `Supervivencia.test.tsx`, `neutralidad.test.ts`); `scripts/tu-pension-supervivencia-equivalencia.test.ts`, `scripts/lecturas-jubilacion-supervivencia.test.ts`, `e2e/supervivencia.spec.ts`.

## Afirmaciones y pendientes

- Diez afirmaciones nuevas en `docs/claims-web.json` (`docs/claims.json` regenerado). **Pendientes de revisión actuarial: 16 antes, 16 después.** Sin fuentes nuevas (todas salen de `/data`).
- Neutralidad: `scripts/lib/valoraciones.ts` ampliado; se recorren los textos nuevos (`neutralidad.test.ts`).
- Cambio de aserciones previas: solo el test del selector de la 3-C1 (y su e2e), que decía «viudedad y orfandad próximamente».

## Tamaño del chunk del simulador (`npm run build`)

2.046,08 kB (201,25 kB comprimido) frente a 1.978,19 kB (187,22 kB) en `main`: +67,89 kB (+14,03 kB). El chunk de datos `supervivencia-reglas` (698,54 kB; 42,33 kB comprimido) ya era un chunk aparte. Paquete principal sin cambios apreciables.

## Batería local

Con `tsc -b --force` (sin caché incremental, con los ficheros de test): `npm run lint` (incluye `validate:data`), typecheck, `npm test` (2.429 pruebas en 118 ficheros) y `npm run build` pasan. Capturas revisadas a 1360 y 390 px (formulario y resultado de viudedad; resultado de orfandad con reparto): se corrigió un desborde horizontal a 390 px de la tabla de reparto (`.tp-subseccion` sin `minmax(0, 1fr)`) y se añadió el test e2e correspondiente.

## Pendientes para Sergio

- **Actuariales**: decidir si la lectura proporcional del límite conjunto debe actuar también en la excepción del art. 229.3 (DISCREPANCIAS.md); decidir si se ofrece la concurrencia de varios beneficiarios de viudedad y el causante en alta sin obligación de cotizar; las lecturas de supervivencia siguen con los estados del registro (esta fase no los cambia).
- **Descargas manuales**: ninguna nueva.
- **Modelos**: ninguno.
- **Otros**: la afirmación sobre la redacción anterior del art. 221 (2016-2021) se apoya en el texto consolidado con todas las versiones descargado en el repo, pero ningún dato de `/data` recoge ese requisito; si se quiere mostrar en pantalla el requisito concreto, habría que estructurarlo en `/data` con su cita antes.

## CI y despliegue

(Se completa al terminar el PR: CI, merge, despliegue y comprobación de la ruta publicada.)
