# Estado: motor, cambios de la revisión actuarial 3

Rama `feat/motor-revision-3`, creada desde `origin/main` (`6b7452b`, que contiene `docs/ESTADO_AJUSTES_ACTUARIALES_3.md`). Aplica al motor los cambios de cálculo que la tercera revisión actuarial (16-11-2026) dejó para esta fase y corrige un rótulo de «Proyecciones». No se crean páginas ni prestaciones nuevas en el simulador. Las decisiones y sus motivos están en `docs/DECISIONES.md` («Motor: cambios de la revisión actuarial 3»).

Criterio: el revisor es una opinión experta y no una fuente. Cada cambio de cálculo se apoya en una frase de una norma descargada en el repo (se cita artículo y fichero) y lleva casos con el resultado calculado a mano en el propio test, con la operación escrita en un comentario.

## Resultado por paso

| Paso | Qué                                                                      | Resultado                                                                                                                                                                                    | Norma y fichero                                                                                                     |
| ---- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 0    | Existe `docs/ESTADO_AJUSTES_ACTUARIALES_3.md`                            | Comprobado en `origin/main`                                                                                                                                                                  | —                                                                                                                   |
| 1    | Rentas del 70 % de la viudedad (B-58 d)                                  | **Cambiado**: ejercicio anterior, sin lo dejado de percibir por el hecho causante; campo nuevo y campo renombrado; 3 casos nuevos                                                            | Decreto 3158/1966, art. 31.2 (`data-raw/boe/decreto-3158-1966.txt`)                                                 |
| 2    | Parejas de hecho por periodos y porcentaje no asignado (B-59 c y d)      | **Ya estaba bien** (2022-2026-10-20 y desde 2026-10-21; frontera probada); 2016-2021 fuera del dominio del motor (`NoImplementada`); orfandad absoluta bien, con test                        | TRLGSS art. 221.2 (tres redacciones, `trlgss-2015-versiones.txt`); Decreto 3158/1966, art. 38.1.2.º                 |
| 3    | Salvaguarda de la DT 34.ª.1 (A-41): lectura `jubilacion.salvaguardaDT34` | **Cambiado**: lectura nueva (A y B), pendiente, **A por defecto**; 5 datos nuevos con cita; tope de 2021 y coeficientes de 2021; textos; casos de A, B y coincidencia                        | TRLGSS DT 34.ª.1, art. 208.2 y art. 210.3 de 2016-2021 (`trlgss-2015-versiones.txt`, `trlgss-2015-consolidado.txt`) |
| 4a   | Factores de actualización de 2001 frente a los informes (A-30)           | **Medido**: 23 de 23 desde 2002 coinciden a siete decimales; los 13 de 2001 **no** (0,0009 % a 0,0377 %). No se cambia; no queda confirmado el enlace de 2001                                | Informes del autocálculo (en `ipc-informes.test.ts`); INE IPC290751 (`docs/PENDIENTE_DATOS.md`)                     |
| 4b   | Carencia de la incapacidad: fracciones de mes (B-38 a)                   | **Ya estaba bien** (`Math.floor`); test nuevo por debajo de 31 años                                                                                                                          | RD 1799/1985, art. 4.1, último párrafo (`rd-1799-1985.txt`); TRLGSS art. 195.3                                      |
| 4c   | Periodo corto por debajo de 31 años (B-37 c)                             | **Ya estaba bien** (umbral de 96 meses; caso de oro de 22 años); test nuevo con 53 bases                                                                                                     | TRLGSS art. 195.3.a y art. 197.2                                                                                    |
| 5    | Rótulo de `mujeres_convergen` en Proyecciones                            | **Cambiado**: se aplica a las tasas de afiliación y de cotización (`ra` y `rb` de `convergencia_mujeres`), no a las de empleo; `rotuloPalanca`; test y e2e                                   | `modelos/m2/m2_cotizantes.py` (sin tocar)                                                                           |
| 6    | Afirmaciones                                                             | Pendientes de `claims.json`: **16 antes, 16 después**; lecturas pendientes: 0 → 1 (la nueva). Actualizadas las filas n.º 30, 37, 38, 41, 58 y 59 y `web-fin-sensibilidades-empleo-parametro` | `docs/revision-actuarial/aplicacion-tanda3.json`, `docs/claims-web.json`                                            |

## Salvaguarda de la DT 34.ª.1

Frase de la norma que respalda el valor por defecto A: «de manera que la pensión reconocida no resulte en ningún caso inferior a la que habría correspondido con la aplicación de las normas vigentes en 2021» (DT 34.ª.1), precedida de «sólo resultará de aplicación en la medida en que la evolución de la pensión máxima del sistema absorba completamente el efecto del aumento de coeficientes». Con B esa frase no tendría efecto nunca. La norma no dice con qué pensión máxima se compara: lo de «actualizada solo con el IPC» es lectura nuestra y la revisión actuarial la deja con confianza baja, por eso la lectura queda **pendiente**.

Efecto medido (`scripts/lecturas-abiertas.ts`, fila de `docs/INFORME_VERIFICACION.md`): anticipada voluntaria con 12 meses de anticipo en 2030, pensión por encima del límite: 3.555,82 € con A frente a 3.503,20 € con B (−1,48 % con B). Si la pensión no llega al límite, A y B coinciden.

## Tests nuevos y cambiados

- `src/engine/supervivencia/reglas.test.ts`: rentas del 70 % (3 casos con la cuenta escrita), parejas de hecho por periodos (4), porcentaje no asignado solo en la orfandad absoluta (1).
- `src/engine/jubilacion/modalidades.test.ts`: la salvaguarda con A y con B en 2027 y 2030 (hecho a mano con los datos de `/data`), coincidencia sin pensión máxima y fuera de 2024-2033; el test de los coeficientes sobre el límite fija la lectura B.
- `src/engine/jubilacion/casos-oro-motor.test.ts`: caso de oro 7 (A y B); `src/engine/fachada.test.ts`: la lectura por la fachada.
- `src/engine/jubilacion/ipc-informes.test.ts`: los 23 factores desde 2002 a siete decimales.
- `src/engine/incapacidad/reglas.test.ts`: fracciones de mes por debajo de 31 años; periodo corto por debajo de 31 años.
- `src/modules/tu-pension/salvaguarda-dt34.test.ts`: la nota del panel («Afecta a tu resultado») con una anticipada voluntaria topada.
- `e2e/motor-revision-3.spec.ts`: la lectura en el panel de «Tu pensión» (axe, sin desbordes), el rótulo de las mujeres en «Proyecciones».
- Casos de oro existentes: los seis primeros no cambian. Enlace compartible: sin cambios (`v=1`).

## Limitaciones conocidas

- 2016-2021 en parejas de hecho (y en todo el motor de supervivencia): fuera del dominio; la redacción de 2016 también exige el requisito de ingresos del art. 221.1, que no está en el motor.
- La salvaguarda no se calcula para hechos causantes de 2022 y 2023 (rige la redacción original del art. 210.3) ni desde 2034.
- Los 13 factores de 2001 se desvían hasta 0,04 % de los informes.
- El formulario de «Tu pensión» solo ofrece la jubilación ordinaria: la salvaguarda no puede cambiar el resultado de ningún caso del simulador hoy.

## Pendientes para Sergio

- **Actuariales**: decidir la lectura A o B de la salvaguarda (pregunta `param-jubilacion-coeficientes-voluntaria-limite`); decidir si se sustituyen los meses de 2001 por los índices implícitos de los informes o se mantiene el enlace.
- **Descargas manuales**: ninguna nueva.
- **Modelos**: el LEEME de `m4_sensibilidades` sigue diciendo «tasas de empleo» en `mujeres_convergen` y en `empleo_55_64_mas_10` (consta en `docs/DISCREPANCIAS.md`).

## Batería y despliegue

(Se completa al final de la fase.)
