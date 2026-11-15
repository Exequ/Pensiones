# data/proyecciones

Salidas de los modelos propios **M1** (demografía), **M2** (cotizantes y bases de cotización), **M3** (pensiones contributivas en vigor) y **M4** (modelo financiero del sistema: gasto, ingresos, saldos y Fondo de Reserva), ejecutados por Sergio en local (los escenarios de M4, `m4-escenarios`, los ejecutó Claude en su entorno de trabajo; véase más abajo). Son **proyecciones de modelo, no datos observados ni previsiones**: calculan qué ocurriría con la legislación actual congelada y supuestos explícitos. M4 se añadió en la fase 5-B2 y sus escenarios, en «Ajustes de M4».

Formato: `tipo: "proyeccion"` (esquema `ArchivoProyeccion` de [`src/engine/esquema-datos.ts`](../../src/engine/esquema-datos.ts)). Cada fichero lleva:

- `naturaleza: "proyeccion-de-modelo"` (obligatoria; `validate:data` la exige y exige que todo fichero de esta carpeta sea de este tipo).
- `modelo`: identificador (`m1` a `m4`), nombre y descripción del modelo en `docs/modelos/`; en M1, el `horizontePresentacion` (último año presentado como resultado; lo posterior es ilustrativo), y en M2, el `anioBaseReal` de los euros reales.
- `escenario`: `g` e IPC (fracciones), `legislacion: "congelada"`, la frase del LEEME que lo describe y `aplicacion` (qué parte influye en esa salida).
- `source`: el script del modelo en GitHub, en el commit indicado por el LEEME; `publisher`: «Elaboración propia: modelo de proyección». `fetchedAt`: fecha de ejecución de los modelos (del LEEME). `confidence`: `media` (M1, M3 y M4) o `baja` (M2, versión v0); criterio en `docs/DECISIONES.md`, «Fase 5-B1» y «Fase 5-B2».
- `origen`: ruta del CSV de `data-raw/modelos-salidas/`, su SHA-256, el hash completo del último commit que modifica `modelos/`, el LEEME y la fecha de ejecución.
- `columnas` (id, descripción, tipo, unidad) y `filas` (una lista de celdas por fila, en el orden de las columnas).

| Fichero                 | CSV de origen                  | Contenido                                                                                                | Periodo                |
| ----------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------- | ---------------------- |
| `m1-contraste-ine`      | `m1/m1_contraste_ine.csv`      | Población por grandes grupos de edad del modelo y de la proyección del INE, con los errores              | 2026-2076              |
| `m1-backtest`           | `m1/m1_backtest.csv`           | Prueba hacia atrás: población del modelo y observada, con los errores                                    | 2011-2025              |
| `m1-escenarios`         | `m1/m1_escenarios.csv`         | Seis escenarios demográficos (INE base, fecundidad, migración, mortalidad) en cuatro años                | 2026, 2035, 2050, 2076 |
| `m2-cotizantes`         | `m2/m2_cotizantes.csv`         | Afiliados de diciembre, cotizantes y base del Régimen General (corrientes y reales), recaudación         | 2026-2050              |
| `m2-relacion-pensiones` | `m2/m2_relacion_pensiones.csv` | Afiliados de diciembre entre pensiones de octubre (M3)                                                   | 2026-2050              |
| `m3-pensiones`          | `m3/m3_pensiones.csv`          | Pensiones por clase, sexo y grupo de edad de cinco años (octubre)                                        | 2026-2050              |
| `m3-resumen`            | `m3/m3_resumen.csv`            | Pensiones por clase, total y pensionistas aproximados (octubre)                                          | 2026-2050              |
| `m4-financiero`         | `m4/m4_financiero.csv`         | Gasto en pensiones, cotizaciones, MEI, saldos, Fondo de Reserva, financiación adicional y PIB aproximado | 2026-2050              |
| `m4-escenarios`         | `m4/m4_escenarios.csv`         | Las mismas columnas de M4 en cinco escenarios (g e IPC) y la fila observada de 2025                      | 2026-2050 (y 2025)     |

Las columnas «_ine» de M1 son las de la proyección del INE (`data/demografia/proyecciones-poblacion`); el escenario «INE (base)» de `m1-escenarios` es el modelo con las hipótesis base del INE, no la proyección publicada.

## `m4-escenarios`: cinco escenarios y la fila de 2025

- **Escenarios** (`escenarios`, del LEEME `m4/LEEME_m4_escenarios.txt`): `base` (g = 1 %, IPC = 2 %), `g0`, `g2`, `ipc1` e `ipc3`. Cada uno cambia solo g o el IPC respecto al base; en `parametrosComunes` constan, tal cual los recoge el LEEME, las palancas que valen igual en los cinco (revalorización con el IPC, pensión de las altas con el enlace con M5, cotización adicional nula, Fondo con la misma rentabilidad nominal en todos, transferencias y resto de gastos constantes en porcentaje del PIB).
- **Filas**: una por escenario y año calculado (2026-2050), con la columna `escenario` delante; el resto de columnas son las de `m4-financiero`.
- **Fila de 2025** (`filaObservada`): **no la calcula el modelo**; son datos observados (ejecución del presupuesto, Fondo, PIB del INE, pensiones en vigor), iguales en los cinco escenarios, y se guardan una sola vez. Las columnas sin equivalente observado (`financiacion_adicional`) no constan: no se rellenan. Su coincidencia con los ficheros de `/data` la comprueba `scripts/proyecciones-m4-escenarios.test.ts`.
- **Procedencia**: la salida la ejecutó Claude el 2026-11-15 con `modelos/m4/m4_escenarios.py` (el commit que lo añade consta como `commitModelos` y en la URL de la fuente); las demás salidas las ejecutó Sergio el 2026-11-14. El escenario base de 2026 en adelante coincide con `m4-financiero` (el ETL y un test lo comprueban salvo el último bit de la coma flotante).
- La web (`#/proyecciones`) lee este fichero, no `m4-financiero`, que se conserva como salida de referencia del escenario base.

## Cómo regenerarlos

1. Colocar las salidas de los modelos en `data-raw/modelos-salidas/` (`m1/`, `m2/`, `m3/`, `m4/`) con su `LEEME.txt` (fecha de ejecución, commit de `modelos/` y escenario); los escenarios de M4 llevan su propio `m4/LEEME_m4_escenarios.txt` (fecha, tabla de escenarios, palancas comunes y descripción de la fila de 2025). No se modifican a mano.
2. Desde la raíz del repositorio: `python3 -I scripts/etl/modelos_salidas.py` (lee el LEEME, calcula las huellas y escribe estos JSON; después ejecuta Prettier).
3. `npm run validate:data` y `npx vitest run scripts/proyecciones-5b1.test.ts scripts/proyecciones-5b2.test.ts` (procedencia, huellas, coherencias internas y comprobación de que el JSON reproduce el CSV).

Si cambia el código de `modelos/`, hay que volver a ejecutar los modelos, actualizar el LEEME y regenerar; el test comprueba que el hash del commit y el SHA-256 de cada CSV coinciden con los del LEEME y los CSV.

## M4 (modelo financiero): cómo leer `m4-financiero`

- **Unidades**: importes en millones de euros **corrientes** (con la inflación del escenario), salvo las pensiones medias (euros al mes) y las columnas «pct_pib» (porcentaje del PIB aproximado de M4). `afiliados_por_pension` es el cociente de M2 entre M3.
- **PIB**: `pib_proxy` es un indicador aproximado (afiliados por salario nominal, según la descripción de M4), distinto del PIB del INE. Los porcentajes «pct_pib» se calculan con él.
- **Cotizaciones y MEI**: la columna `mei` está **incluida** en `cotizaciones` (las cotizaciones sin el MEI crecen como la base total de M2; se comprueba en `scripts/proyecciones-5b2.test.ts`). La descripción de M4 lo dice así: el MEI es una partida de las cotizaciones sociales y la columna `mei` es un desglose, no un ingreso adicional.
- **Saldos** (definiciones de la descripción y de la aritmética entre columnas): `saldo_cotizaciones_menos_pensiones` = cotizaciones − gasto en pensiones; `saldo_sin_transferencias` = cotizaciones − gasto en pensiones − resto de gastos (es el saldo sin las transferencias del Estado ni otros ingresos, como define la descripción); `saldo_no_financiero` = ingresos (con transferencias y otros ingresos) − gasto en pensiones − resto de gastos.
- **Fondo de Reserva**: `dotacion_fondo` es una proporción constante del MEI; `disposicion_fondo` respeta el límite legal de `data/parametros/fondo-reserva-desembolso-maximo`; `financiacion_adicional` es lo que el Fondo no cubre. El valor de partida es el de precio de adquisición del último año observado y crece con una rentabilidad nominal constante (la descripción da su valor; la implícita que se obtiene de la salida es la misma todos los años); no es valor de mercado.
- **Gasto**: la fórmula de la descripción (pensiones × pensión media × catorce pagas) no reproduce exactamente `gasto_pensiones`: el cociente es menor que uno y casi constante, porque la descripción incluye un factor de calibración (devengo) por clase, obtenido con el último año observado y constante. La descripción de M4 atribuye la diferencia a los complementos a mínimos, que el presupuesto contabiliza aparte; es una hipótesis de su autor, no verificada contra la metodología de la fuente (`docs/PENDIENTE_DATOS.md`, `docs/DISCREPANCIAS.md`). Lo verificado: el cociente existe y se reproduce con los datos, y los complementos son una partida aparte de la ejecución.
- **2025 y escenarios**: `m4-financiero` empieza en 2026 y tiene un solo escenario; la fila observada de 2025 y las variantes de g e IPC están en `m4-escenarios`. El empalme con lo observado tiene un año de inicio de proyección (2026) y un último año observado (2025).
